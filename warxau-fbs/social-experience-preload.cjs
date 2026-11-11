'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const VERSION = '20261111-social-experience-v1';
const JS_PATH = '/assets/mm-social-experience.js';
const CSS_PATH = '/assets/mm-social-experience.css';
const HEALTH_PATH = '/api/social/experience';
const SOCIAL_PAGES = new Set([
  '/beranda-trader.html',
  '/grup-trader.html',
  '/community.html',
  '/profil.html',
  '/akun.html',
  '/live.html',
  '/journal.html'
]);
const ALIASES = new Map([
  ['/social.html', '/beranda-trader.html'],
  ['/social-marney.html', '/beranda-trader.html'],
  ['/socialmarney.html', '/beranda-trader.html'],
  ['/komunitas.html', '/beranda-trader.html'],
  ['/berita.html', '/index.html#berita']
]);

const CSS = String.raw`
:root{
  --mm-social-accent:#f47a1f;
  --mm-social-accent-strong:#d95f0b;
  --mm-social-surface:#fff;
  --mm-social-text:#181818;
  --mm-social-muted:#6f7378;
  --mm-social-line:rgba(25,25,25,.12);
  --mm-social-shadow:0 12px 36px rgba(15,20,25,.14);
}
html.mm-social-experience{scroll-padding-top:76px}
html.mm-social-experience body{overscroll-behavior-y:contain;-webkit-tap-highlight-color:transparent}
html.mm-social-experience main :is(button,[role="button"],input[type="button"],input[type="submit"]),
html.mm-social-experience nav a{min-height:42px}
html.mm-social-experience :is(button,a,input,textarea,select,[role="button"]):focus-visible{
  outline:3px solid color-mix(in srgb,var(--mm-social-accent) 72%,white);
  outline-offset:2px
}
html.mm-social-experience :is(img,video){max-width:100%}
html.mm-social-experience video{background:#0d0f12;object-fit:contain}
html.mm-social-experience .mm-social-virtual-item{
  content-visibility:auto;
  contain-intrinsic-size:auto 460px
}
.mm-social-live-link,.mm-social-float-live{
  display:inline-flex!important;align-items:center;justify-content:center;gap:.45rem;
  border:1px solid color-mix(in srgb,var(--mm-social-accent) 65%,transparent)!important;
  border-radius:999px!important;background:var(--mm-social-accent)!important;color:#15110e!important;
  font-weight:800!important;text-decoration:none!important;box-shadow:0 8px 24px rgba(244,122,31,.24)
}
.mm-social-live-dot{width:.55rem;height:.55rem;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.25)}
.mm-social-float-live{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px));z-index:2147482000;padding:.72rem 1rem}
.mm-social-network{
  position:fixed;left:50%;bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px));z-index:2147483000;
  transform:translate(-50%,120%);opacity:0;pointer-events:none;transition:transform .2s ease,opacity .2s ease;
  padding:.68rem .9rem;border-radius:999px;background:#17191d;color:#fff;font:700 13px/1.2 system-ui,sans-serif;
  box-shadow:var(--mm-social-shadow)
}
.mm-social-network[data-show="true"]{transform:translate(-50%,0);opacity:1}
.mm-social-network[data-state="offline"]{background:#8f1f1f}
.mm-social-draft-status{display:block;margin:.32rem 0 0;color:var(--mm-social-muted);font:600 11px/1.3 system-ui,sans-serif}
.mm-social-retry{
  display:inline-flex;align-items:center;justify-content:center;margin:.75rem auto 0;padding:.62rem .9rem;
  border:1px solid var(--mm-social-line);border-radius:999px;background:var(--mm-social-surface);color:var(--mm-social-text);
  font:750 13px/1 system-ui,sans-serif;cursor:pointer
}
.mm-social-top{
  position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 76px));
  z-index:2147481900;width:44px;height:44px;border:1px solid var(--mm-social-line);border-radius:50%;
  background:var(--mm-social-surface);color:var(--mm-social-text);box-shadow:var(--mm-social-shadow);opacity:0;
  pointer-events:none;transform:translateY(8px);transition:.2s ease
}
.mm-social-top[data-show="true"]{opacity:1;pointer-events:auto;transform:none}
html.mm-social-experience.mm-save-data video{background-image:linear-gradient(135deg,#15171a,#25282e)}
@media (max-width:768px){
  html.mm-social-experience :is(input,textarea,select){font-size:16px}
  html.mm-social-experience main{max-width:100%;overflow-x:clip}
  html.mm-social-experience main :is(button,[role="button"],input[type="button"],input[type="submit"]){min-height:44px}
  .mm-social-float-live{bottom:max(82px,calc(env(safe-area-inset-bottom) + 82px))}
  .mm-social-network{bottom:max(82px,calc(env(safe-area-inset-bottom) + 82px))}
  .mm-social-top{bottom:max(140px,calc(env(safe-area-inset-bottom) + 140px))}
}
@media (prefers-color-scheme:dark){
  :root{--mm-social-surface:#17191d;--mm-social-text:#f4f5f6;--mm-social-muted:#a9adb3;--mm-social-line:rgba(255,255,255,.14);--mm-social-shadow:0 14px 40px rgba(0,0,0,.42)}
}
@media (prefers-reduced-motion:reduce){
  .mm-social-network,.mm-social-top{transition:none!important}
}
`;

const CLIENT = String.raw`(function(){
'use strict';
if(window.__MM_SOCIAL_EXPERIENCE__===${JSON.stringify(VERSION)})return;
window.__MM_SOCIAL_EXPERIENCE__=${JSON.stringify(VERSION)};
const VERSION=${JSON.stringify(VERSION)};
const STATUS='/api/community/status';
const COUNTERS=new Set(['/api/trader-connect/unread','/api/trader-notifications/count']);
const nativeFetch=typeof window.fetch==='function'?window.fetch.bind(window):null;
let authState='unknown';
function requestPath(input){try{return new URL(typeof input==='string'?input:input.url,location.href).pathname}catch{return ''}}
function requestMethod(input,init){return String((init&&init.method)||(input&&input.method)||'GET').toUpperCase()}
function detectAuth(data){
 if(!data||typeof data!=='object')return 'unknown';
 if(data.authenticated===true||data.loggedIn===true||data.logged_in===true||data.signedIn===true||data.user||data.account||data.profile)return 'in';
 if(data.authenticated===false||data.loggedIn===false||data.logged_in===false||data.signedIn===false||data.user===null||data.account===null||data.profile===null||data.username===null)return 'out';
 return 'unknown';
}
function zeroCounter(){return new Response(JSON.stringify({ok:true,authenticated:false,count:0,unread:0}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-MarketMarney-Social-Gate':VERSION}})}
let statusResponsePromise=null;
if(nativeFetch){
 statusResponsePromise=nativeFetch(STATUS,{credentials:'same-origin',headers:{Accept:'application/json','X-MarketMarney-Client':VERSION}}).then(async response=>{
  const data=await response.clone().json().catch(()=>null);authState=detectAuth(data);document.documentElement.dataset.mmAuth=authState;
  return response;
 }).catch(()=>null);
 window.fetch=function(input,init){
  const path=requestPath(input),method=requestMethod(input,init);
  if(method==='GET'&&path===STATUS&&statusResponsePromise)return statusResponsePromise.then(response=>response?response.clone():nativeFetch(input,init));
  if(method==='GET'&&COUNTERS.has(path)&&statusResponsePromise){
   return statusResponsePromise.then(response=>{
    if(response&&authState==='out')return zeroCounter();
    return nativeFetch(input,init);
   });
  }
  return nativeFetch(input,init);
 };
}
const idle=window.requestIdleCallback||function(fn){return setTimeout(fn,40)};
const pageKey='mm-social-scroll:'+location.pathname+location.search;
function safeSession(){try{return sessionStorage}catch{return null}}
function restoreScroll(){
 if(location.hash)return;
 const store=safeSession();if(!store)return;
 const y=Number(store.getItem(pageKey)||0);if(!Number.isFinite(y)||y<120)return;
 history.scrollRestoration='manual';requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo({top:y,left:0,behavior:'auto'})));
}
addEventListener('pagehide',()=>{const store=safeSession();if(store)try{store.setItem(pageKey,String(Math.max(0,scrollY||0)))}catch{}},{capture:true});
function isSensitiveComposer(el){
 if(!el||el.matches('input[type="password"],[autocomplete="current-password"],[autocomplete="new-password"]'))return true;
 if(el.closest('#shMessagePanel,[data-message],[data-chat],.message,.messages,.chat,.dm,form[action*="message"],form[action*="chat"]'))return true;
 return /(?:message|chat|password|otp|search)/i.test((el.id||'')+' '+(el.name||''));
}
function draftKey(el,index){return 'mm-social-draft:'+location.pathname+':'+(el.id||el.name||index)}
function installDrafts(root=document){
 const selector=['#shComposer textarea','#shPostText','textarea[data-kind="post"]','textarea[data-composer="post"]','form[data-social-composer] textarea','textarea[placeholder*="Bagikan"]','textarea[placeholder*="Apa yang"]','[contenteditable="true"][data-composer]'].join(',');
 [...root.querySelectorAll(selector)].forEach((el,index)=>{
  if(el.dataset.mmDraftReady||isSensitiveComposer(el))return;el.dataset.mmDraftReady='1';
  const store=safeSession(),key=draftKey(el,index);if(!store)return;
  const read=()=>el.isContentEditable?el.textContent:el.value;
  const write=value=>{if(el.isContentEditable)el.textContent=value;else el.value=value};
  try{const saved=store.getItem(key);if(saved&&!read())write(saved)}catch{}
  const status=document.createElement('small');status.className='mm-social-draft-status';status.textContent='Draft tersimpan di perangkat ini';status.hidden=true;el.insertAdjacentElement('afterend',status);
  let timer=0;el.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{const value=String(read()||'').slice(0,20000);try{if(value.trim())store.setItem(key,value);else store.removeItem(key);status.hidden=!value.trim()}catch{}},280)},{passive:true});
  const form=el.closest('form');if(form)form.addEventListener('submit',()=>{try{store.removeItem(key)}catch{};status.hidden=true});
 });
}
let videoObserver=null;
function mediaObserver(){
 if(videoObserver||!('IntersectionObserver'in window))return videoObserver;
 videoObserver=new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;if(!entry.isIntersecting||entry.intersectionRatio<.12){if(!video.paused&&!video.dataset.mmKeepPlaying)video.pause()}}},{threshold:[0,.12,.55]});
 return videoObserver;
}
function enhanceMedia(root=document){
 const saveData=!!(navigator.connection&&(navigator.connection.saveData||/2g/.test(navigator.connection.effectiveType||'')));
 if(saveData)document.documentElement.classList.add('mm-save-data');
 root.querySelectorAll('img').forEach((img,index)=>{
  if(img.dataset.mmMediaReady)return;img.dataset.mmMediaReady='1';img.decoding='async';
  const protectedImage=img.closest('header,nav')||/avatar|profile|logo/i.test((img.className||'')+' '+(img.alt||''));
  if(!protectedImage&&index>1&&!img.loading)img.loading='lazy';
  if(!protectedImage&&'fetchPriority'in img&&index>1)img.fetchPriority='low';
 });
 root.querySelectorAll('video').forEach(video=>{
  if(video.dataset.mmMediaReady)return;video.dataset.mmMediaReady='1';video.playsInline=true;video.setAttribute('playsinline','');
  if(saveData){video.autoplay=false;video.preload='none'}else if(!video.preload||video.preload==='auto')video.preload='metadata';
  const observer=mediaObserver();if(observer)observer.observe(video);
 });
}
function virtualize(root=document){
 const containers=root.querySelectorAll('#shFeed,[data-feed],.feed-list,.post-list,.reel-list,.story-list');
 containers.forEach(container=>[...container.children].forEach((child,index)=>{if(index>1)child.classList.add('mm-social-virtual-item')}));
}
function enhanceA11y(root=document){
 root.querySelectorAll('button,[role="button"]').forEach(control=>{
  if(control.hasAttribute('aria-label'))return;
  const label=(control.textContent||control.title||'').replace(/\s+/g,' ').trim();if(label)control.setAttribute('aria-label',label.slice(0,120));
 });
 root.querySelectorAll('input,textarea,select').forEach(input=>{if(!input.getAttribute('aria-label')&&!input.labels?.length&&input.placeholder)input.setAttribute('aria-label',input.placeholder)});
 root.querySelectorAll('a[href]').forEach(link=>{
  let url;try{url=new URL(link.href,location.href)}catch{return}
  if(url.origin!==location.origin){link.rel='noopener noreferrer';if(!link.target)link.target='_blank'}
 });
}
function installExternalLinkConsent(){
 if(document.documentElement.dataset.mmExternalConsent)return;document.documentElement.dataset.mmExternalConsent='1';
 document.addEventListener('click',event=>{
  const link=event.target&&event.target.closest?event.target.closest('a[href]'):null;if(!link||link.dataset.mmTrusted==='1'||link.closest('header,nav,footer'))return;
  let url;try{url=new URL(link.href,location.href)}catch{return}if(url.origin===location.origin||!/^https?:$/.test(url.protocol))return;
  if(!confirm('Buka tautan di luar MarketMarney?')){event.preventDefault();event.stopImmediatePropagation()}
 },true);
}
function liveAnchor(){
 const a=document.createElement('a');a.href='/live.html';a.className='mm-social-live-link';a.dataset.mmTrusted='1';a.innerHTML='<span class="mm-social-live-dot" aria-hidden="true"></span><span>Live</span>';a.setAttribute('aria-label','Buka Live Marney');return a;
}
function installLiveLink(){
 if(location.pathname==='/live.html'||document.querySelector('a[href^="/live.html"],a[href$="live.html"],a[href*="marketmarney.com/live.html"]'))return;
 const candidates=[...document.querySelectorAll('nav,[role="navigation"],header .actions,.social-nav,.sh-nav,.bottom-nav')];
 const target=candidates.find(node=>{const hrefs=[...node.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'');return hrefs.some(h=>/beranda-trader/.test(h))&&(hrefs.some(h=>/profil/.test(h))||hrefs.some(h=>/grup-trader/.test(h)))});
 const link=liveAnchor();if(target){target.appendChild(link);return}
 link.classList.add('mm-social-float-live');link.id='mmSocialFloatLive';document.body.appendChild(link);
}
function installNetworkStatus(){
 if(document.getElementById('mmSocialNetwork'))return;const pill=document.createElement('div');pill.id='mmSocialNetwork';pill.className='mm-social-network';pill.setAttribute('role','status');pill.setAttribute('aria-live','polite');document.body.appendChild(pill);let hide=0;
 function show(online){clearTimeout(hide);pill.dataset.state=online?'online':'offline';pill.textContent=online?'Koneksi kembali normal':'Tidak ada koneksi internet';pill.dataset.show='true';if(online)hide=setTimeout(()=>pill.dataset.show='false',2200)}
 addEventListener('offline',()=>show(false));addEventListener('online',()=>show(true));if(!navigator.onLine)show(false);
}
function installLoadingRecovery(){
 if(authState!=='in')return;
 const pattern=/^(?:memuat|menyiapkan|menghubungkan)(?:\s+(?:story|reel|postingan|pesan|notifikasi|grup|siaran))?\s*[.…]*$/i;
 document.querySelectorAll('p,div,span').forEach(node=>{
  if(node.dataset.mmLoadingWatch||!pattern.test((node.textContent||'').trim()))return;node.dataset.mmLoadingWatch='1';
  const original=(node.textContent||'').trim();setTimeout(()=>{if(!node.isConnected||(node.textContent||'').trim()!==original||node.parentElement?.querySelector('.mm-social-retry'))return;const button=document.createElement('button');button.type='button';button.className='mm-social-retry';button.textContent='Coba lagi';button.addEventListener('click',()=>location.reload());node.insertAdjacentElement('afterend',button)},12000);
 });
}
function installTopButton(){
 if(document.getElementById('mmSocialTop'))return;const button=document.createElement('button');button.type='button';button.id='mmSocialTop';button.className='mm-social-top';button.textContent='↑';button.setAttribute('aria-label','Kembali ke atas');button.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));document.body.appendChild(button);
 let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{button.dataset.show=scrollY>900?'true':'false';ticking=false})},{passive:true});
}
function enhance(root=document){enhanceMedia(root);virtualize(root);enhanceA11y(root);installDrafts(root)}
function start(){
 document.documentElement.classList.add('mm-social-experience');restoreScroll();installExternalLinkConsent();installNetworkStatus();installLiveLink();installTopButton();enhance(document);statusResponsePromise?.finally(()=>installLoadingRecovery());
 let queued=false;new MutationObserver(records=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)enhance(node)})}).observe(document.body,{childList:true,subtree:true});
 idle(()=>enhance(document));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(video=>{if(!video.paused&&!video.dataset.mmKeepPlaying)video.pause()})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

function pathnameOf(req) {
  try { return new URL(String(req.url || '/'), 'http://marketmarney.local').pathname; }
  catch { return String(req.url || '/').split('?')[0]; }
}

function redirectFor(pathname) {
  return ALIASES.get(pathname) || null;
}

function injectHtml(html, pathname) {
  const source = String(html || '');
  if (!SOCIAL_PAGES.has(pathname) || !/<\/html\s*>/i.test(source)) return source;
  if (source.includes('data-mm-social-experience="' + VERSION + '"')) return source;
  const query = '?v=' + encodeURIComponent(VERSION);
  const head = '<link rel="stylesheet" href="' + CSS_PATH + query + '" data-mm-social-experience="' + VERSION + '">' +
    '<script src="' + JS_PATH + query + '" data-mm-social-experience="' + VERSION + '"></script>';
  if (/<head\b[^>]*>/i.test(source)) return source.replace(/<head\b[^>]*>/i, match => match + head);
  return head + source;
}

function sendAsset(req, res, body, type) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const etag = '"' + crypto.createHash('sha256').update(buffer).digest('hex') + '"';
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'ETag': etag,
    'Content-Length': buffer.length,
    'X-MarketMarney-Social-Experience': VERSION
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
  res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : buffer);
}

function handle(req, res) {
  const pathname = pathnameOf(req);
  const method = String(req.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) return false;
  const redirect = redirectFor(pathname);
  if (redirect) {
    res.writeHead(302, { Location: redirect, 'Cache-Control': 'no-store', 'X-MarketMarney-Social-Experience': VERSION });
    res.end();
    return true;
  }
  if (pathname === JS_PATH) { sendAsset(req, res, CLIENT, 'text/javascript; charset=utf-8'); return true; }
  if (pathname === CSS_PATH) { sendAsset(req, res, CSS, 'text/css; charset=utf-8'); return true; }
  if (pathname === HEALTH_PATH) {
    const payload = Buffer.from(JSON.stringify({
      ok: true,
      version: VERSION,
      pages: [...SOCIAL_PAGES],
      aliases: Object.fromEntries(ALIASES),
      features: ['auth-aware-counters','media-pause','lazy-media','draft-recovery','scroll-restore','external-link-consent','live-entry','offline-status','loading-retry','accessibility']
    }));
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':payload.length,'X-MarketMarney-Social-Experience':VERSION});
    res.end(req.method === 'HEAD' ? undefined : payload);
    return true;
  }
  return false;
}

function wrapHtml(req, res) {
  const pathname = pathnameOf(req);
  if (String(req.method || 'GET').toUpperCase() !== 'GET' || !SOCIAL_PAGES.has(pathname)) return;
  req.headers['accept-encoding'] = 'identity';
  const original = { writeHead: res.writeHead, write: res.write, end: res.end };
  const chunks = [];
  let pendingHead = false, pass = false, size = 0;
  const MAX = 5 * 1024 * 1024;
  function restore(){ Object.assign(res, original); }
  function ok(){
    const type = String(res.getHeader('content-type') || '');
    return !res.headersSent && res.statusCode === 200 && !res.getHeader('content-encoding') && (!type || /^text\/html\b/i.test(type));
  }
  function head(){ if(pendingHead && !res.headersSent){ pendingHead=false; original.writeHead.call(res,res.statusCode); } }
  function flush(){ head(); for(const chunk of chunks) original.write.call(res,chunk); chunks.length=0; }
  res.writeHead=function(status,message,headers){
    if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
    const values=typeof message==='string'?headers:message;
    if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1]);}
    else if(values&&typeof values==='object'){for(const [key,value] of Object.entries(values))this.setHeader(key,value);}
    this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pendingHead=true;return this;
  };
  res.write=function(chunk,encoding,callback){
    if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
    if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback);}
    chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;
  };
  res.end=function(chunk,encoding,callback){
    if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    if(pass){restore();return original.end.call(this,chunk,encoding,callback);}
    if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length;}
    if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback);}
    const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=injectHtml(raw,pathname),out=patched===raw?data:Buffer.from(patched);
    if(out!==data){
      this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);
      this.setHeader('X-MarketMarney-Social-Experience',VERSION);
      this.setHeader('Vary','Accept-Encoding');
      if(!wrapHtml.logged){wrapHtml.logged=true;console.log('MM_SOCIAL_EXPERIENCE_HTML '+JSON.stringify({version:VERSION,page:pathname}));}
    }
    chunks.length=0;head();restore();return original.end.call(this,out,callback);
  };
}

function installHttp() {
  if (http.createServer.__mmSocialExperience === VERSION) return;
  const currentCreateServer = http.createServer;
  function createServer(...args) {
    const server = currentCreateServer.apply(this,args);
    const currentEmit = server.emit;
    server.emit = function(event,...eventArgs) {
      if(event==='request'){
        const req=eventArgs[0],res=eventArgs[1];
        if(handle(req,res))return true;
        wrapHtml(req,res);
      }
      return currentEmit.call(this,event,...eventArgs);
    };
    return server;
  }
  createServer.__mmSocialExperience = VERSION;
  http.createServer = createServer;
  console.log('MM_SOCIAL_EXPERIENCE_READY '+JSON.stringify({version:VERSION,pages:[...SOCIAL_PAGES],aliases:Object.fromEntries(ALIASES)}));
}

if (process.env.MM_SOCIAL_EXPERIENCE_DISABLE_AUTO !== '1') installHttp();

module.exports={VERSION,JS_PATH,CSS_PATH,HEALTH_PATH,SOCIAL_PAGES,ALIASES,CSS,CLIENT,pathnameOf,redirectFor,injectHtml,sendAsset,handle,wrapHtml,installHttp};
