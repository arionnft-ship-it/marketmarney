'use strict';

// Isolated localhost smoke test. The quote and chat fixtures below are test-only;
// no production price service, database, account or existing browser is used.
// WARXAU_SMOKE_APP_ROOT must contain the approved page and the site's discussion assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {createTopChat} = require('./topchat.cjs');
const {PREFIX} = require('./performance-warxau.cjs');

async function smoke() {
  const appRoot = process.env.WARXAU_SMOKE_APP_ROOT;
  if (!appRoot) throw Error('Set WARXAU_SMOKE_APP_ROOT to the isolated app fixture directory');
  const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  const {chromium} = require(runtime ? path.join(runtime, 'playwright') : 'playwright');
  const addon = createTopChat({appRoot});
  const requests = [];
  const delayedTextures = [];
  let releaseTextures = false;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push({method: req.method, pathname: url.pathname, search: url.search});
    if (url.pathname.startsWith(PREFIX) && url.pathname.endsWith('.webp') && !releaseTextures) {
      delayedTextures.push(() => addon.handle(req, res)); return;
    }
    if (addon.handle(req, res)) return;
    if (req.method === 'GET' && ['/_railway/health', '/api/discussions', '/api/community/status'].includes(url.pathname)) {
      const data = url.pathname === '/api/discussions' ? {items: [], user: null, total: 0, hasMore: false, nextBefore: null, nextBeforeId: null} : {ok: true, registrationEnabled: false};
      res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
      res.end(JSON.stringify(data)); return;
    }
    res.writeHead(404); res.end('Isolated smoke fixture: route not provided');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const errors = [];
  const failedRequests = [];
  const quote = {symbol: 'XAU', currency: 'USD', price: 4567.89, updatedAt: new Date().toISOString()};
  try {
    browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, deviceScaleFactor: 1});
    await context.route('https://api.gold-api.com/price/XAU', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(quote), headers: {'Access-Control-Allow-Origin': '*'}}));
    // All non-local traffic except the exact, intercepted quote fixture is denied.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === base || url.href === 'https://api.gold-api.com/price/XAU') return route.fallback();
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failedRequests.push({url: request.url(), error: request.failure()?.errorText}));
    await page.goto(base + '/assets/xau-war-3d.html?v=7.7', {waitUntil: 'domcontentloaded', timeout: 30000});
    await page.waitForFunction(() => window.MM_WAR?.ready && window.MM_WAR.getSnapshot().drawCalls > 0, null, {timeout: 30000});
    await page.locator('#warxau-social-root .mm1831-chat').waitFor({state: 'visible'});
    const first = await page.evaluate(() => ({snapshot: window.MM_WAR.getSnapshot(), canvas: {width: document.getElementById('battle').width, height: document.getElementById('battle').height}}));
    assert.equal(first.snapshot.graphicsError, false);
    assert.equal(first.snapshot.renderer, 'webgl2');
    assert.equal(first.snapshot.quality, 'hd');
    assert.equal(first.snapshot.assetsReady, false);
    assert.ok(first.snapshot.drawCalls > 0 && first.canvas.width > 0 && first.canvas.height > 0);
    assert.ok(delayedTextures.length >= 2);
    releaseTextures = true;
    for (const send of delayedTextures.splice(0)) send();
    await page.waitForFunction(() => window.MM_WAR?.getSnapshot().assetsReady, null, {timeout: 30000});
    await page.waitForFunction(value => window.MM_WAR?.getSnapshot().price === value, quote.price, {timeout: 15000});
    const final = await page.evaluate(() => ({snapshot: window.MM_WAR.getSnapshot(), chat: document.querySelector('.mm1831-chat').dataset, premium: window.MM_PREMIUM.info()}));
    assert.equal(final.snapshot.mode, 'live');
    assert.equal(final.snapshot.price, quote.price);
    assert.equal(final.snapshot.timestamp, Date.parse(quote.updatedAt));
    assert.equal(final.snapshot.liveFeed.received, 1);
    assert.equal(final.snapshot.points, 1);
    assert.equal(final.chat.target, 'MARKET:OANDA:XAUUSD');
    assert.ok(requests.some(request => request.pathname === '/api/discussions' && request.search.includes('MARKET%3AOANDA%3AXAUUSD')));
    assert.ok(requests.every(request => request.method === 'GET'));
    assert.deepEqual(errors, []);
    assert.deepEqual(failedRequests, []);
    const screenshot = process.env.WARXAU_SMOKE_SCREENSHOT;
    if (screenshot) {
      fs.mkdirSync(path.dirname(screenshot), {recursive: true});
      await page.locator('.battle-panel').screenshot({path: screenshot});
    }
    console.log(JSON.stringify({ok: true, fixture: 'isolated localhost only; quote is explicitly mocked for this test',
      checks: {webgl2: true, firstFrameBeforeTextures: true, texturesCompleted: true, chatMountedInCorrectRoom: true, noScriptErrors: true, sourceQuoteAndTimestampPreserved: true, noWriteRequests: true},
      firstFrame: {drawCalls: first.snapshot.drawCalls, assetsReady: first.snapshot.assetsReady, canvas: first.canvas},
      final: {graphicsError: final.snapshot.graphicsError, assetsReady: final.snapshot.assetsReady, price: final.snapshot.price, timestamp: final.snapshot.timestamp, receivedQuotes: final.snapshot.liveFeed.received, quality: final.snapshot.quality},
      screenshot: screenshot || null
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({errors, failedRequests}, null, 2));
    throw error;
  } finally {
    releaseTextures = true;
    for (const send of delayedTextures.splice(0)) send();
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

smoke().catch(error => { console.error(error); process.exitCode = 1; });
