'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const VERSION = '20261111-social-refinement-v1';
const JS_PATH = '/assets/mm-social-refinement.js';
const CSS_PATH = '/assets/mm-social-refinement.css';
const HEALTH_PATH = '/api/social/refinement';
const INJECT_PAGES = new Set([
  '/', '/index.html',
  '/beranda-trader.html', '/grup-trader.html', '/community.html',
  '/profil.html', '/akun.html', '/live.html', '/reels.html',
  '/notifikasi.html', '/journal.html'
]);
const ALIASES = new Map([
  ['/pesan.html', '/beranda-trader.html#shMessagePanel'],
  ['/messages.html', '/beranda-trader.html#shMessagePanel']
]);

const CSS = String.raw`
:root{--mm-refine-accent:#f47a1f;--mm-refine-surface:#fff;--mm-refine-text:#181818;--mm-refine-muted:#6f7378;--mm-refine-line:rgba(25,25,25,.12)}
.mm-social-empty-icon{display:grid;place-items:center;width:52px;height:52px;margin:.65rem auto;border:1px dashed var(--mm-refine-line);border-radius:18px;background:color-mix(in srgb,var(--mm-refine-accent) 9%,var(--mm-refine-surface));font-size:24px}
.mm-social-guest-guide{margin:1rem 0;padding:1rem;border:1px solid var(--mm-refine-line);border-radius:20px;background:var(--mm-refine-surface);box-shadow:0 8px 28px rgba(15,20,25,.07)}
.mm-social-guest-guide h2{margin:.15rem 0 .35rem;font:800 clamp(18px,3vw,24px)/1.15 system-ui,sans-serif;color:var(--mm-refine-text)}
.mm-social-guest-guide>p{margin:.2rem 0 .85rem;color:var(--mm-refine-muted);font:500 14px/1.55 system-ui,sans-serif}
.mm-social-guest-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
.mm-social-guest-card{padding:.8rem;border:1px solid var(--mm-refine-line);border-radius:15px;background:color-mix(in srgb,var(--mm-refine-accent) 4%,var(--mm-refine-surface));color:var(--mm-refine-text)}
.mm-social-guest-card strong{display:block;margin-bottom:.2rem;font:800 13px/1.25 system-ui,sans-serif}.mm-social-guest-card span{font:500 12px/1.45 system-ui,sans-serif;color:var(--mm-refine-muted)}
.mm-social-guest-cta{display:inline-flex;align-items:center;justify-content:center;margin-top:.85rem;min-height:44px;padding:.65rem 1rem;border-radius:999px;background:var(--mm-refine-accent);color:#17110d!important;font:800 13px/1 system-ui,sans-serif;text-decoration:none!important}
[data-mm-social-home-link="true"]{cursor:pointer}
@media(max-width:768px){.mm-social-guest-grid{grid-template-columns:1fr}}
@media(prefers-color-scheme:dark){:root{--mm-refine-surface:#17191d;--mm-refine-text:#f4f5f6;--mm-refine-muted:#a9adb3;--mm-refine-line:rgba(255,255,255,.14)}}
`;

const CLIENT = String.raw`(function(){
'use strict';
if(window.__MM_SOCIAL_REFINEMENT__===${JSON.stringify(VERSION)})return;
window.__MM_SOCIAL_REFINEMENT__=${JSON.stringify(VERSION)};
const STATUS='/api/community/status';
let authState=document.documentElement.dataset.mmAuth||'unknown';
function detectAuth(data){if(!data||typeof data!=='object')return 'unknown';if(data.authenticated===true||data.loggedIn===true||data.logged_in===true||data.signedIn===true||data.user||data.account||data.profile)return 'in';if(data.authenticated===false||data.loggedIn===false||data.logged_in===false||data.signedIn===false||data.user===null||data.account===null||data.profile===null||data.username===null)return 'out';return 'unknown'}
const statusPromise=fetch(STATUS,{credentials:'same-origin',headers:{Accept:'application/json','X-MarketMarney-Client':${JSON.stringify(VERSION)}}}).then(async response=>{const data=await response.clone().json().catch(()=>null);authState=detectAuth(data);document.documentElement.dataset.mmAuth=authState;return authState}).catch(()=>authState);
function fixHomeSocialEntry(){
 const route=()=>location.assign('/beranda-trader.html');
 const matches=element=>{const text=(element.textContent||'').replace(/\s+/g,' ').trim();return /^SOCIAL MARNEY$/i.test(text)||element.dataset?.page==='Social Marney'};
 document.querySelectorAll('[data-page],a,button,[role="button"]').forEach(element=>{if(!matches(element))return;element.dataset.mmSocialHomeLink='true';if(element.tagName==='A')element.setAttribute('href','/beranda-trader.html');else{element.setAttribute('role','link');element.setAttribute('tabindex',element.getAttribute('tabindex')||'0')}});
 document.addEventListener('click',event=>{const element=event.target&&event.target.closest?event.target.closest('[data-mm-social-home-link="true"]'):null;if(!element)return;event.preventDefault();event.stopImmediatePropagation();route()},true);
 document.addEventListener('keydown',event=>{const element=event.target;if(!element?.matches?.('[data-mm-social-home-link="true"]')||!['Enter',' '].includes(event.key))return;event.preventDefault();route()},true);
}
function normalizeEmptyStates(root=document){
 if(location.pathname==='/profil.html')root.querySelectorAll('span,strong,b,p,div').forEach(node=>{if(node.children.length||node.textContent.trim()!=='—')return;const context=node.parentElement?.textContent||'';if(/Pengikut|Mengikuti|Postingan/i.test(context))node.textContent='0'});
 root.querySelectorAll('span,p,div').forEach(node=>{if(node.children.length)return;const text=(node.textContent||'').trim();if(/^—\s+postingan dimuat$/i.test(text))node.textContent='0 postingan dimuat'});
 root.querySelectorAll('p,div,span').forEach(node=>{if(node.dataset.mmEmptyReady||!/Ikuti trader lain untuk memperluas jaringan/i.test(node.textContent||''))return;node.dataset.mmEmptyReady='1';const icon=document.createElement('div');icon.className='mm-social-empty-icon';icon.setAttribute('aria-hidden','true');icon.textContent='◎';node.insertAdjacentElement('beforebegin',icon)});
}
function guestGuideData(){
 if(location.pathname==='/grup-trader.html')return {title:'Ruang diskusi yang lebih teratur',text:'Masuk untuk menemukan atau membuat grup sesuai topik market.',cards:[['Grup publik','Bisa ditemukan dan diikuti komunitas.'],['Grup privat','Akses dapat diatur oleh owner dan admin.'],['Admin & moderasi','Kelola anggota, peran, pin, dan percakapan.'],['File & media','Bagikan gambar, dokumen, PDF, dan tautan.']]};
 if(location.pathname==='/reels.html'||location.hash==='#shReelsPanel')return {title:'Reels trader dalam satu layar',text:'Tonton video market vertikal, beri reaksi, dan lanjut ke video berikutnya.',cards:[['Video vertikal','Tampilan layar penuh yang nyaman di ponsel.'],['Reaksi & komentar','Berinteraksi tanpa meninggalkan reels.'],['Kontrol hemat data','Video di luar layar otomatis dijeda.'],['Unggah hingga 100 MB','Bagikan reels langsung dari perangkat.']]};
 if(location.pathname==='/beranda-trader.html')return {title:'Semua aktivitas trader dalam satu tempat',text:'Masuk untuk mulai berbagi dan berinteraksi di Social Marney.',cards:[['Postingan & analisis','Bagikan pandangan, chart, dan pembaruan market.'],['Story & reels','Unggah momen dan video vertikal hingga 100 MB.'],['Pesan & grup','Diskusi langsung atau bangun komunitas sendiri.'],['Live Marney','Siaran analisis dan edukasi dengan kamera serta mikrofon.']]};
 return null;
}
function installGuestGuide(){
 if(authState!=='out'||document.getElementById('mmSocialGuestGuide'))return;const data=guestGuideData();if(!data)return;
 const guide=document.createElement('section');guide.id='mmSocialGuestGuide';guide.className='mm-social-guest-guide';guide.innerHTML='<h2></h2><p></p><div class="mm-social-guest-grid"></div><a class="mm-social-guest-cta" data-mm-trusted="1">Masuk / Daftar</a>';guide.querySelector('h2').textContent=data.title;guide.querySelector('p').textContent=data.text;
 const grid=guide.querySelector('.mm-social-guest-grid');for(const card of data.cards){const item=document.createElement('div');item.className='mm-social-guest-card';const strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=card[0];span.textContent=card[1];item.append(strong,span);grid.appendChild(item)}
 const cta=guide.querySelector('a');cta.href='/akun.html?next='+encodeURIComponent(location.pathname+location.hash);
 const loginHeading=[...document.querySelectorAll('h1,h2')].find(node=>/Masuk|Daftar/i.test(node.textContent||''));const host=loginHeading?.closest('section,article')||document.querySelector('main')||document.body;host.insertAdjacentElement('afterend',guide);
}
function installLiveGuard(){
 if(location.pathname!=='/live.html'||document.documentElement.dataset.mmLiveGuard)return;document.documentElement.dataset.mmLiveGuard='1';
 document.addEventListener('click',event=>{const button=event.target&&event.target.closest?event.target.closest('button,a,[role="button"]'):null;if(!button||button.dataset.mmLiveBypass==='1'||!/^(?:Mulai Live|Buat Live Marney|Mulai siaran)/i.test((button.textContent||'').trim()))return;if(authState==='in')return;event.preventDefault();event.stopImmediatePropagation();Promise.resolve(statusPromise).finally(()=>{if(authState==='in'){button.dataset.mmLiveBypass='1';button.click();delete button.dataset.mmLiveBypass}else location.assign('/akun.html?next='+encodeURIComponent('/live.html'))})},true);
}
function repairLegacyLinks(root=document){root.querySelectorAll('a[href]').forEach(link=>{const href=link.getAttribute('href')||'';if(/^\/?pesan\.html(?:$|[?#])/i.test(href))link.setAttribute('href','/beranda-trader.html#shMessagePanel');if(/^\/?social(?:-marney|marney)?\.html(?:$|[?#])/i.test(href))link.setAttribute('href','/beranda-trader.html')})}
function enhance(root=document){normalizeEmptyStates(root);repairLegacyLinks(root)}
function start(){
 const home=location.pathname==='/'||location.pathname==='/index.html';if(home){fixHomeSocialEntry();return}
 installLiveGuard();enhance(document);statusPromise.finally(()=>{normalizeEmptyStates(document);installGuestGuide()});
 let queued=false;new MutationObserver(records=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)enhance(node)})}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

function pathnameOf(req){try{return new URL(String(req.url||'/'),'http://marketmarney.local').pathname}catch{return String(req.url||'/').split('?')[0]}}
function redirectFor(pathname){return ALIASES.get(pathname)||null}
function injectHtml(html,pathname){const source=String(html||'');if(!INJECT_PAGES.has(pathname)||!/<\/html\s*>/i.test(source))return source;if(source.includes('data-mm-social-refinement="'+VERSION+'"'))return source;const query='?v='+encodeURIComponent(VERSION),head='<link rel="stylesheet" href="'+CSS_PATH+query+'" data-mm-social-refinement="'+VERSION+'"><script src="'+JS_PATH+query+'" data-mm-social-refinement="'+VERSION+'"></script>';return /<head\b[^>]*>/i.test(source)?source.replace(/<head\b[^>]*>/i,match=>match+head):head+source}
function sendAsset(req,res,body,type){const buffer=Buffer.isBuffer(body)?body:Buffer.from(body),etag='"'+crypto.createHash('sha256').update(buffer).digest('hex')+'"',headers={'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','ETag':etag,'Content-Length':buffer.length,'X-MarketMarney-Social-Refinement':VERSION};if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return}res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:buffer)}
function handle(req,res){const pathname=pathnameOf(req),method=String(req.method||'GET').toUpperCase();if(!['GET','HEAD'].includes(method))return false;const redirect=redirectFor(pathname);if(redirect){res.writeHead(302,{Location:redirect,'Cache-Control':'no-store','X-MarketMarney-Social-Refinement':VERSION});res.end();return true}if(pathname===JS_PATH){sendAsset(req,res,CLIENT,'text/javascript; charset=utf-8');return true}if(pathname===CSS_PATH){sendAsset(req,res,CSS,'text/css; charset=utf-8');return true}if(pathname===HEALTH_PATH){const payload=Buffer.from(JSON.stringify({ok:true,version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES),features:['message-route','home-social-route','zero-counts','guest-guides','live-login-guard','legacy-links']}));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':payload.length,'X-MarketMarney-Social-Refinement':VERSION});res.end(req.method==='HEAD'?undefined:payload);return true}return false}
function wrapHtml(req,res){const pathname=pathnameOf(req);if(String(req.method||'GET').toUpperCase()!=='GET'||!INJECT_PAGES.has(pathname))return;req.headers['accept-encoding']='identity';const original={writeHead:res.writeHead,write:res.write,end:res.end},chunks=[];let pending=false,pass=false,size=0;const MAX=6*1024*1024;function restore(){Object.assign(res,original)}function ok(){const type=String(res.getHeader('content-type')||'');return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/^text\/html\b/i.test(type))}function head(){if(pending&&!res.headersSent){pending=false;original.writeHead.call(res,res.statusCode)}}function flush(){head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0}res.writeHead=function(status,message,headers){if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments)}const values=typeof message==='string'?headers:message;if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1])}else if(values&&typeof values==='object'){for(const [key,value]of Object.entries(values))this.setHeader(key,value)}this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pending=true;return this};res.write=function(chunk,encoding,callback){if(typeof encoding==='function'){callback=encoding;encoding=undefined}const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback)}chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true};res.end=function(chunk,encoding,callback){if(typeof chunk==='function'){callback=chunk;chunk=undefined}else if(typeof encoding==='function'){callback=encoding;encoding=undefined}if(pass){restore();return original.end.call(this,chunk,encoding,callback)}if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length}if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback)}const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=injectHtml(raw,pathname),out=patched===raw?data:Buffer.from(patched);if(out!==data){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);this.setHeader('X-MarketMarney-Social-Refinement',VERSION);this.setHeader('Vary','Accept-Encoding');if(!wrapHtml.logged){wrapHtml.logged=true;console.log('MM_SOCIAL_REFINEMENT_HTML '+JSON.stringify({version:VERSION,page:pathname}))}}chunks.length=0;head();restore();return original.end.call(this,out,callback)}}
function installHttp(){if(http.createServer.__mmSocialRefinement===VERSION)return;const currentCreateServer=http.createServer;function createServer(...args){const server=currentCreateServer.apply(this,args),currentEmit=server.emit;server.emit=function(event,...eventArgs){if(event==='request'){const req=eventArgs[0],res=eventArgs[1];if(handle(req,res))return true;wrapHtml(req,res)}return currentEmit.call(this,event,...eventArgs)};return server}createServer.__mmSocialRefinement=VERSION;http.createServer=createServer;console.log('MM_SOCIAL_REFINEMENT_READY '+JSON.stringify({version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES)}))}
if(process.env.MM_SOCIAL_REFINEMENT_DISABLE_AUTO!=='1')installHttp();
module.exports={VERSION,JS_PATH,CSS_PATH,HEALTH_PATH,INJECT_PAGES,ALIASES,CSS,CLIENT,pathnameOf,redirectFor,injectHtml,sendAsset,handle,wrapHtml,installHttp};
