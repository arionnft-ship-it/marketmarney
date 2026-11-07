'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const vm = require('node:vm');
const zlib = require('node:zlib');
const {enhancePage, APPROVED} = require('./topchat.cjs');
const {enhance: brand} = require('../marney-brand/branding.cjs');
const {createWarXauPerformance, PREFIX} = require('./performance-warxau.cjs');
const {NAV: deployedNavigation} = require('./ihsg-addon.cjs');

const raw = fs.readFileSync(path.join(__dirname, '../warxau-live/dist/WEB-LIVE.html'), 'utf8');
const original = [...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(match => match[2]);
const layoutSource = fs.readFileSync(path.join(__dirname, 'topchat-layout.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'topchat.css'), 'utf8');
const chatSource = '/* Public chat fixture; real integration is exercised against the app assets. */\nwindow.chatFixture=true;';
const performance = createWarXauPerformance({layoutSource, cssSource, chatSource});
const enhanced = enhancePage(raw);
const html = performance.transform(enhanced);
const meta = performance.metadata();
const checks = [];
function check(name, condition) { assert.ok(condition, name); checks.push(name); }

function request(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {method, headers}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function tests() {
  check('approved persistent source hash unchanged', crypto.createHash('sha256').update(raw).digest('hex') === APPROVED);
  check('branding still removes the embedded legacy logo', !brand(html).includes('<a class="brand"><img src="data:'));
  check('branded HTML falls from 2.78 MB to less than 120 KB', Buffer.byteLength(brand(html)) < 120000);
  check('only assets, rendering and renderer labels changed', meta.scriptCount === 24 && meta.unchangedScriptCount === 19);
  check('delayed startup has no parser-only event dependency', original.every(source => !/DOMContentLoaded|document\.write\s*\(|document\.currentScript/.test(source)));
  assert.throws(() => performance.transform(enhanced.replace('window.MM_DEMO_ONLY=false;', 'window.MM_DEMO_ONLY=false;document.addEventListener("DOMContentLoaded",function(){});')), /parser events/);
  check('material base64 is absent from the HTML', !html.includes('window.MMAshfallAssets=') && !html.includes('"surface-atlas":"data:'));
  check('topchat legacy parser-blocking scripts removed', !html.includes('<script data-warxau-topchat=') && !html.includes('src="/assets/warxau-topchat-chat.js'));
  const external = [...html.matchAll(/<script\b([^>]*)src="([^"]+)"([^>]*)><\/script>/gi)];
  check('ordered deferred layout, startup and chat scripts', external.length === 3 && external.every(match => /\bdefer\b/.test(match[1] + match[3])) && external[0][2] === '/assets/warxau-topchat-layout.js?v=7.8' && external[1][2] === meta.bundlePath);
  check('bundle preload occurs before the body', html.indexOf('rel="preload" as="script"') < html.indexOf('<body'));
  check('transform is idempotent', performance.transform(html) === html);
  const privateInput = enhanced.replace('7.7-gold-api', '7.8-fbs-private');
  assert.throws(() => performance.transform(privateInput), /only accepts the public/);
  check('private FBS page rejected by public packager', true);
  assert.throws(() => performance.transform(enhanced.replace('window.MMAshfallAssets=', 'window.MMRenamedAssets=')), /atlas missing/);
  check('unexpected material source fails without replacing existing assets', performance.metadata().bundlePath === meta.bundlePath);

  const server = http.createServer((req, res) => {
    // The current deployment overrides this legacy route with the complete
    // five-market navigation. Progressive packaging must still request it.
    if (req.url === '/assets/warxau-topchat-layout.js?v=7.8') {
      res.writeHead(200, {'Content-Type': 'text/javascript'});
      res.end(layoutSource + '\n' + deployedNavigation); return;
    }
    if (performance.handle(req, res)) return;
    res.writeHead(404); res.end('not owned');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const bundleResponse = await request(base + meta.bundlePath);
    assert.equal(bundleResponse.status, 200);
    const bundle = bundleResponse.body.toString('utf8');
    new vm.Script(bundle);
    check('complete bundled JavaScript parses', true);
    check('layout is applied before delayed arena initialization', !bundle.includes(layoutSource) && html.indexOf(external[0][0]) < html.indexOf(external[1][0]) && bundle.includes('requestAnimationFrame(()=>setTimeout(start,0))'));
    const layoutResponse = await request(base + external[0][2]);
    const elements = new Map();
    class Element {
      constructor(tag) { this.tagName=tag; this.children=[]; this.dataset={}; this.attributes={}; this.style={setProperty(){}}; this.classList={contains:()=>false,remove(){},add(){}}; }
      set id(value) { this._id=value; elements.set(value,this); }
      get id() { return this._id; }
      setAttribute(name,value) { this.attributes[name]=value; }
      append(...nodes) { for(const node of nodes){node.parentElement=this;this.children.push(node);} }
      prepend(...nodes) { for(const node of nodes)node.parentElement=this;this.children.unshift(...nodes); }
      querySelector(selector) { return selector === '.intro' ? intro : null; }
      getBoundingClientRect() { return {height:0}; }
    }
    const main=new Element('main');main.id='main';
    const panel=new Element('section'),intro=new Element('div'),old=new Element('div');old.append(panel);
    const layoutContext={document:{getElementById:id=>elements.get(id),querySelector:selector=>selector==='.battle-panel'?panel:null,querySelectorAll:()=>[],createElement:tag=>new Element(tag),documentElement:{dataset:{}}},location:{pathname:'/assets/xau-war-3d.html'},addEventListener(){}};
    layoutContext.window=layoutContext;
    vm.runInNewContext(layoutResponse.body.toString(),layoutContext);
    const nav=elements.get('war-market-selector');
    assert.deepEqual(nav.children.map(node=>node.textContent),['XAUUSD WAR','BTCUSD WAR','OIL WAR · WTI','NASDAQ WAR','IHSG WAR']);
    assert.equal(nav.children[0].attributes['aria-current'],'page');
    check('deployed layout override retains all five arena links and selected XAU state',true);
    let previous = -1;
    for (let i = 0; i < original.length; i++) {
      if ([7, 10, 13, 15, 21].includes(i)) continue;
      const position = bundle.indexOf(original[i]);
      assert.ok(position > previous, 'original script order and bytes: ' + i);
      previous = position;
    }
    check('all 19 other scripts retain exact source bytes and order', true);
    check('live feed, freshness validation, ledger and session code preserved verbatim', [1, 2, 3, 19, 20].every(i => bundle.includes(original[i])));

    // Exercise real definitions without a DOM/WebGL startup: the public modules
    // must still publish their globals when executed from the deferred closure.
    const definitions = bundle.slice(bundle.indexOf('function start(){') + 'function start(){'.length, bundle.indexOf(original[20]));
    const context = {Date, Intl, performance: globalThis.performance, console};
    context.window = context; context.globalThis = context;
    vm.runInNewContext('(function(){' + definitions + '})();', context);
    check('bundled scope preserves public engine, ledger and data provider globals', typeof context.MMWarEngine === 'function' && typeof context.MMDestruction.Ledger === 'function' && typeof context.MMGold.diagnostics === 'function');

    const rendererStart = bundle.indexOf(original[15].slice(0, 100));
    const rendererEnd = bundle.indexOf('\n;\n' + original[16], rendererStart);
    assert.ok(rendererStart > 0 && rendererEnd > rendererStart);
    const renderer = bundle.slice(rendererStart, rendererEnd);
    let fastCompiles = 0;
    const gl = {getExtension: () => null};
    for (const method of ['viewport', 'bindFramebuffer', 'clearColor', 'clear', 'activeTexture', 'bindTexture', 'disable', 'bindVertexArray', 'useProgram', 'uniformMatrix3fv', 'uniformMatrix4fv', 'uniform1f', 'uniform1i', 'uniform3fv', 'uniform4fv', 'drawArrays', 'enable', 'getUniformLocation']) gl[method] = () => {};
    class Base {
      constructor(canvas) { Object.assign(this, {canvas, gl, quality: 'hd', shadowOK: false, groups: {}, view: new Float32Array(16), program: {}, time: 0}); }
      makeProgram(fast) { if (fast) fastCompiles++; return {}; }
    }
    const rendererContext = {window: {MMWarEngine: Base}};
    vm.runInNewContext(renderer, rendererContext);
    const engine = new rendererContext.window.MMWarEngine({getBoundingClientRect: () => ({width: 0, height: 0})});
    engine.renderGPU();
    check('HD startup and rendering skip the unused fast shader compilation', fastCompiles === 0);
    engine.quality = 'eco'; engine.renderGPU(); engine.renderGPU();
    check('future fast tier still compiles once on demand', fastCompiles === 1);

    const inlineAssets = JSON.parse(original[7].match(/window\.MMAshfallAssets=(\{[\s\S]*\});\s*$/)[1]);
    for (const [name, assetPath] of Object.entries(meta.materialPaths)) {
      const response = await request(base + assetPath);
      assert.equal(response.status, 200);
      assert.equal(response.headers['content-type'], 'image/webp');
      assert.deepEqual(response.body, Buffer.from(inlineAssets[name].split(',')[1], 'base64'));
      assert.ok(assetPath.includes(crypto.createHash('sha256').update(response.body).digest('hex')));
      assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
    }
    check('all four extracted WebP assets retain exact original bytes and content hashes', true);

    const gzip = await request(base + meta.bundlePath, 'GET', {'Accept-Encoding': 'gzip'});
    assert.equal(gzip.headers['content-encoding'], 'gzip');
    assert.deepEqual(zlib.gunzipSync(gzip.body), bundleResponse.body);
    const br = await request(base + meta.bundlePath, 'GET', {'Accept-Encoding': 'gzip, br'});
    assert.equal(br.headers['content-encoding'], 'br');
    assert.deepEqual(zlib.brotliDecompressSync(br.body), bundleResponse.body);
    check('precompressed Brotli and gzip responses decode to the exact bundle', true);
    const identity = await request(base + meta.bundlePath, 'GET', {'Accept-Encoding': 'gzip;q=0, br;q=0'});
    assert.equal(identity.headers['content-encoding'], undefined);
    assert.deepEqual(identity.body, bundleResponse.body);
    check('explicit q=0 refuses compressed encodings', true);
    const cached = await request(base + meta.bundlePath, 'GET', {'Accept-Encoding': 'br', 'If-None-Match': 'W/' + br.headers.etag});
    check('matching representation ETag returns bodyless 304', cached.status === 304 && cached.body.length === 0);
    const otherEncoding = await request(base + meta.bundlePath, 'GET', {'If-None-Match': br.headers.etag});
    check('different encoding has a distinct strong ETag', otherEncoding.status === 200 && otherEncoding.headers.etag !== br.headers.etag);
    const head = await request(base + meta.bundlePath, 'HEAD', {'Accept-Encoding': 'br'});
    check('HEAD has representation length without body', head.status === 200 && head.body.length === 0 && Number(head.headers['content-length']) === br.body.length);
    const post = await request(base + meta.bundlePath, 'POST');
    check('immutable assets remain read-only', post.status === 405 && post.headers.allow === 'GET, HEAD');
    for (const assetPath of [PREFIX + 'missing.js', '/api/discussions', '/api/community/status', '/warxau-fbs-private', '/assets/xau-war-3d.html']) {
      assert.equal((await request(base + assetPath)).status, 404);
    }
    check('unrelated routes and private access remain outside the public packager', true);
    console.log(JSON.stringify({ok: true, checks, metrics: {
      brandedHtmlBefore: Buffer.byteLength(brand(enhanced)), brandedHtmlAfter: Buffer.byteLength(brand(html)),
      gzipHtmlBefore: zlib.gzipSync(brand(enhanced)).length, gzipHtmlAfter: zlib.gzipSync(brand(html)).length,
      bundleBytes: bundleResponse.body.length, bundleGzipBytes: gzip.body.length, bundleBrotliBytes: br.body.length,
      exactWebPBytes: meta.textureBytes
    }}, null, 2));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

tests().catch(error => { console.error(error); process.exitCode = 1; });
