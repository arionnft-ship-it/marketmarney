'use strict';
// Normal image entry point. Original app/data/auth files remain untouched.
// Existing verified public gateway is loaded exactly as before; only new private routes are added.
const http=require('node:http'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {createRelay}=require('./relay.cjs');const {privatePage}=require('./page.cjs');
const {transformHomeHtml}=require('./performance-news.cjs');
const PORT=Number(process.env.PORT||8080);
const SITE='/persist/site-r1/MarketMarney-Railway-Staging/app/assets/xau-war-3d.html';
const APPROVED='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// Restrict homepage label updates to GET / and GET /index.html.
// Capture HTML responses without changing the stored website, auth, APIs or MT4 relay.
function patchHomeCard(req, res) {
  const path = String(req.url || '').split('?')[0];
  if (req.method !== 'GET' || (path !== '/' && path !== '/index.html')) return;
  req.headers['accept-encoding'] = 'identity';
  const writeHead = res.writeHead, write = res.write, end = res.end;
  let pendingHead = false, pass = false, len = 0;
  function restore() { res.writeHead = writeHead; res.write = write; res.end = end; }
  const buffered = [], MAX = 2 * 1024 * 1024;
  function headerOk() {
    const type = String(res.getHeader('content-type') || '');
    return !res.headersSent && res.statusCode === 200 && !res.getHeader('content-encoding') &&
      (!type || /^text\/html\b/i.test(type));
  }
  function sendHead() {
    if (pendingHead && !res.headersSent) {
      pendingHead = false;
      writeHead.call(res, res.statusCode);
    }
  }
  function flushChunks() {
    sendHead();
    for (const b of buffered) write.call(res, b);
    buffered.length = 0;
  }
  res.writeHead = function (status, message, headers) {
    if (pass || status !== 200) {
      pass = true;
      flushChunks();
      restore();
      return writeHead.apply(this, arguments);
    }
    const values = typeof message === 'string' ? headers : message;
    if (Array.isArray(values)) {
      for (let i = 0; i < values.length; i += 2) this.setHeader(values[i], values[i + 1]);
    } else if (values && typeof values === 'object') {
      for (const [k, v] of Object.entries(values)) this.setHeader(k, v);
    }
    this.statusCode = status;
    if (typeof message === 'string') this.statusMessage = message;
    pendingHead = true;
    return this;
  };
  res.write = function (chunk, encoding, callback) {
    if (pass) return write.apply(this, arguments);
    if (!headerOk()) {
      pass = true;
      flushChunks();
      restore();
      return write.apply(this, arguments);
    }
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined; }
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || 'utf8');
    if (len + b.length > MAX) {
      pass = true;
      flushChunks();
      restore();
      return write.call(this, b, callback);
    }
    buffered.push(b); len += b.length;
    if (typeof callback === 'function') process.nextTick(callback);
    return true;
  };
  res.end = function (chunk, encoding, callback) {
    if (pass) { restore(); return end.apply(this, arguments); }
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined; }
    if (chunk != null && chunk !== '') {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || 'utf8');
      buffered.push(b); len += b.length;
    }
    const raw = len <= MAX ? Buffer.concat(buffered, len).toString('utf8') : '';
    if (!headerOk() || len > MAX || !/<\/html\s*>/i.test(raw)) {
      flushChunks();
      restore();
      return end.call(this, callback);
    }
    let html = raw.replace(/KOMUNITAS MARKETMARNEY/gi, 'SOCIAL MARNEY');
    // Keep both the homepage Social Marney card and the sidebar destination consistent.
    html = html.replace(/(class="feature-card feature-forum"\s+data-page=")Komunitas(")/g, '$1Social Marney$2');
    html = html.replace("if(p==='Social Marney'){location.assign('/akun.html');return}", "if(p==='Social Marney'){location.assign('/beranda-trader.html');return}");
    html = html.replace('Bergabung di Telegram atau Discord','Linimasa, diskusi, dan ide trader');
    html = html.replace('LIHAT KOMUNITAS','BUKA SOCIAL MARNEY');
    const newCss = "<style id=\"mm-static-news-v1\">\n/* Only Berita Terbaru: stop continuous motion, retain manual horizontal scrolling. */\n.news-carousel{overflow-x:auto!important;overflow-y:hidden!important;mask-image:none!important;-webkit-mask-image:none!important;scroll-behavior:auto;scroll-snap-type:x proximity;scrollbar-width:thin}\n.news-carousel .news-track{animation:none!important;transform:none!important;will-change:auto!important}\n.news-carousel .news-set[aria-hidden=\"true\"]{display:none!important}\n.news-carousel .news-set .card{scroll-snap-align:start}\n</style>";
    const newScript = "<script id=\"mm-social-direct-v1\">\n(function(){\n 'use strict';\n const destination='/beranda-trader.html';\n const selector='.feature-card.feature-forum';\n function enhance(){\n  for(const card of document.querySelectorAll(selector)){\n   if(card.dataset.page!=='Social Marney')card.dataset.page='Social Marney';\n   if(card.getAttribute('aria-label')!=='Buka Social Marney')card.setAttribute('aria-label','Buka Social Marney');\n   const title=card.querySelector('.feature-copy strong');\n   if(title&&title.textContent.trim()!=='SOCIAL MARNEY')title.textContent='SOCIAL MARNEY';\n   const small=card.querySelector('.feature-copy small');\n   if(small&&small.textContent.includes('Telegram atau Discord'))small.textContent='Linimasa, diskusi, dan ide trader';\n   const cta=card.querySelector('.feature-cta');\n   if(cta&&cta.textContent.includes('LIHAT KOMUNITAS'))cta.innerHTML='BUKA SOCIAL MARNEY <span aria-hidden=\"true\">↗</span>';\n  }\n }\n document.addEventListener('click',function(event){\n  const target=event.target;\n  const card=target&&target.closest?target.closest(selector+',.navbtn[data-page=\"Social Marney\"]'):null;\n  if(!card)return;\n  event.preventDefault();\n  event.stopImmediatePropagation();\n  window.location.assign(destination);\n },true);\n function start(){\n  enhance();\n  const root=document.getElementById('app');\n  if(!root)return;\n  let queued=false;\n  new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;enhance();});})\n   .observe(root,{childList:true,subtree:true});\n }\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});\n else start();\n})();\n</script>";
    if (/<\/head\s*>/i.test(html) && !html.includes('mm-static-news-v1')) html = html.replace(/<\/head\s*>/i, newCss + '</head>');
    if (/<\/body\s*>/i.test(html) && !html.includes('mm-social-direct-v1')) html = html.replace(/<\/body\s*>/i, newScript + '</body>');
    html = transformHomeHtml(html);
    if(typeof branding!=='undefined'&&branding.optimizeHome)html=branding.optimizeHome(html);
    if (html !== raw) {
      res.removeHeader('etag'); res.removeHeader('content-md5'); res.removeHeader('transfer-encoding');
      res.setHeader('content-length', Buffer.byteLength(html));
      if (!patchHomeCard.logged) { console.log('MM_SOCIAL_CARD_REWRITE_READY'); patchHomeCard.logged = true; }
    }
    buffered.length = 0;
    sendHead();
    restore();
    return end.call(this, Buffer.from(html, 'utf8'), callback);
  };
}
function attachToServer(server,relay,port){const emit=server.emit;server.emit=function(event,...args){if(event==='request'&&server.address()?.port===port){if(relay.owns(args[0])){void relay.handle(args[0],args[1]);return true;}patchHomeCard(args[0],args[1]);}return emit.call(this,event,...args);};return server;}
function boot(){
 if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid external port');
 const enc=[1,2,3,4].map(i=>process.env['MM_PUBLIC_GATEWAY_PART'+i]||'').join('');
 const gateway=zlib.gunzipSync(Buffer.from(enc,'base64'),{maxOutputLength:1048576});
 if(!/^[a-f0-9]{64}$/.test(process.env.MM_PUBLIC_GATEWAY_SHA256||'')||hash(gateway)!==process.env.MM_PUBLIC_GATEWAY_SHA256)throw Error('Existing gateway integrity mismatch');
 let page=null;
 const relay=createRelay({writeHash:process.env.MM_MT4_WRITE_SHA256,readHash:process.env.MM_MT4_READ_SHA256,expiresAt:Number(process.env.MM_MT4_KEY_EXPIRES_AT),expectedServer:'FBS-Real-5',privatePage(){if(page)return page;const raw=fs.readFileSync(SITE);if(hash(raw)!==APPROVED)return null;page=privatePage(raw.toString(),fs.readFileSync(__dirname+'/client.js','utf8'));return page;}});
 const create=http.createServer;http.createServer=function(...args){return attachToServer(create.apply(this,args),relay,PORT);};
 const file='/tmp/marketmarney-public.cjs';try{if(fs.lstatSync(file).isSymbolicLink())throw Error('Gateway temp path is a symlink');}catch(e){if(e.code!=='ENOENT')throw e;}
 fs.writeFileSync(file,gateway,{mode:0o600});require(file);
 console.log('MM_FBS_PRIVATE_RECEIVER_READY '+JSON.stringify({version:'1.0',scope:'private',publicPageUnchanged:true}));
}
if(require.main===module){try{boot();}catch(e){console.error('MM_FBS_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={attachToServer,boot};
