'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const VERSION = '20261111-social-refinement-v2';
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
  ['/messages.html', '/beranda-trader.html#shMessagePanel'],
  ['/notifications.html', '/beranda-trader.html#shNotificationPanel']
]);

const CSS = String.raw`
:root{
  --mm-refine-accent:#f47a1f;
  --mm-refine-accent-strong:#d95f0b;
  --mm-refine-surface:#fff;
  --mm-refine-elevated:#fff;
  --mm-refine-text:#181818;
  --mm-refine-muted:#6f7378;
  --mm-refine-line:rgba(25,25,25,.12);
  --mm-refine-shadow:0 18px 54px rgba(15,20,25,.18)
}
html.mm-social-refined{scroll-padding-top:84px}
html.mm-social-refined :target{scroll-margin-top:92px}
.mm-social-empty-icon{display:grid;place-items:center;width:52px;height:52px;margin:.65rem auto;border:1px dashed var(--mm-refine-line);border-radius:18px;background:color-mix(in srgb,var(--mm-refine-accent) 9%,var(--mm-refine-surface));font-size:24px}
.mm-social-guest-guide{margin:1rem 0;padding:1rem;border:1px solid var(--mm-refine-line);border-radius:20px;background:var(--mm-refine-surface);box-shadow:0 8px 28px rgba(15,20,25,.07)}
.mm-social-guest-guide h2{margin:.15rem 0 .35rem;font:800 clamp(18px,3vw,24px)/1.15 system-ui,sans-serif;color:var(--mm-refine-text)}
.mm-social-guest-guide>p{margin:.2rem 0 .85rem;color:var(--mm-refine-muted);font:500 14px/1.55 system-ui,sans-serif}
.mm-social-guest-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
.mm-social-guest-card{padding:.8rem;border:1px solid var(--mm-refine-line);border-radius:15px;background:color-mix(in srgb,var(--mm-refine-accent) 4%,var(--mm-refine-surface));color:var(--mm-refine-text)}
.mm-social-guest-card strong{display:block;margin-bottom:.2rem;font:800 13px/1.25 system-ui,sans-serif}.mm-social-guest-card span{font:500 12px/1.45 system-ui,sans-serif;color:var(--mm-refine-muted)}
.mm-social-guest-cta{display:inline-flex;align-items:center;justify-content:center;margin-top:.85rem;min-height:44px;padding:.65rem 1rem;border-radius:999px;background:var(--mm-refine-accent);color:#17110d!important;font:800 13px/1 system-ui,sans-serif;text-decoration:none!important}
.mm-social-guest-repair{display:block!important;padding:.7rem .85rem!important;border:1px solid var(--mm-refine-line)!important;border-radius:14px!important;background:color-mix(in srgb,var(--mm-refine-accent) 5%,var(--mm-refine-surface))!important;color:var(--mm-refine-muted)!important;font:600 13px/1.45 system-ui,sans-serif!important}
.mm-social-guest-repair a{display:inline-flex;margin-left:.35rem;color:var(--mm-refine-accent-strong)!important;font-weight:800;text-decoration:none}
[data-mm-social-home-link="true"]{cursor:pointer}
.mm-social-auth-gate[hidden]{display:none!important}
.mm-social-auth-gate{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.mm-social-auth-backdrop{position:absolute;inset:0;background:rgba(9,11,14,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.mm-social-auth-dialog{position:relative;width:min(430px,100%);padding:1.2rem;border:1px solid var(--mm-refine-line);border-radius:24px;background:var(--mm-refine-elevated);color:var(--mm-refine-text);box-shadow:var(--mm-refine-shadow)}
.mm-social-auth-close{position:absolute;top:.75rem;right:.75rem;width:42px;height:42px;border:1px solid var(--mm-refine-line);border-radius:50%;background:var(--mm-refine-surface);color:var(--mm-refine-text);font:700 22px/1 system-ui;cursor:pointer}
.mm-social-auth-icon{display:grid;place-items:center;width:54px;height:54px;margin:0 0 .8rem;border-radius:18px;background:color-mix(in srgb,var(--mm-refine-accent) 16%,var(--mm-refine-surface));color:var(--mm-refine-accent-strong);font:900 22px/1 system-ui}
.mm-social-auth-dialog h2{margin:0 3rem .45rem 0;font:850 clamp(21px,4vw,28px)/1.12 system-ui;color:var(--mm-refine-text)}
.mm-social-auth-dialog p{margin:0;color:var(--mm-refine-muted);font:500 14px/1.55 system-ui}
.mm-social-auth-actions{display:grid;grid-template-columns:1fr auto;gap:.65rem;margin-top:1rem}
.mm-social-auth-primary,.mm-social-auth-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:.7rem 1rem;border-radius:999px;font:800 13px/1 system-ui;text-decoration:none!important;cursor:pointer}
.mm-social-auth-primary{border:1px solid var(--mm-refine-accent);background:var(--mm-refine-accent);color:#17110d!important}
.mm-social-auth-secondary{border:1px solid var(--mm-refine-line);background:var(--mm-refine-surface);color:var(--mm-refine-text)!important}
body.mm-social-dialog-open{overflow:hidden!important}
.mm-social-mobile-nav{display:none}
@media(max-width:900px){
  .mm-social-guest-grid{grid-template-columns:1fr}
  body.mm-social-has-mobile-nav{padding-bottom:max(86px,calc(env(safe-area-inset-bottom) + 76px))!important}
  body.mm-social-has-mobile-nav .mm-social-float-live{display:none!important}
  .mm-social-mobile-nav{position:fixed;left:10px;right:10px;bottom:max(8px,env(safe-area-inset-bottom));z-index:2147482500;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:7px;border:1px solid var(--mm-refine-line);border-radius:22px;background:color-mix(in srgb,var(--mm-refine-elevated) 94%,transparent);box-shadow:0 16px 46px rgba(10,14,18,.24);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
  .mm-social-mobile-nav a{display:flex;min-width:0;min-height:54px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:16px;color:var(--mm-refine-muted)!important;font:750 10px/1 system-ui;text-decoration:none!important}
  .mm-social-mobile-nav a span[aria-hidden="true"]{font-size:20px;line-height:1}
  .mm-social-mobile-nav a[aria-current="page"]{background:color-mix(in srgb,var(--mm-refine-accent) 14%,var(--mm-refine-surface));color:var(--mm-refine-accent-strong)!important}
  .mm-social-mobile-nav a[data-kind="live"]{background:var(--mm-refine-accent);color:#17110d!important}
  .mm-social-mobile-nav a[data-kind="live"][aria-current="page"]{box-shadow:0 8px 24px rgba(244,122,31,.3)}
}
@media(max-width:520px){
  .mm-social-auth-actions{grid-template-columns:1fr}
  .mm-social-auth-secondary{order:2}
}
html[data-theme="dark"],html[data-mm-theme="dark"],html.dark{
  --mm-refine-surface:#17191d;--mm-refine-elevated:#1d2025;--mm-refine-text:#f4f5f6;--mm-refine-muted:#a9adb3;--mm-refine-line:rgba(255,255,255,.14);--mm-refine-shadow:0 18px 58px rgba(0,0,0,.48)
}
@media(prefers-color-scheme:dark){
  :root{--mm-refine-surface:#17191d;--mm-refine-elevated:#1d2025;--mm-refine-text:#f4f5f6;--mm-refine-muted:#a9adb3;--mm-refine-line:rgba(255,255,255,.14);--mm-refine-shadow:0 18px 58px rgba(0,0,0,.48)}
}
@media(prefers-reduced-motion:reduce){.mm-social-auth-gate,.mm-social-mobile-nav{scroll-behavior:auto!important}}
`;

const CLIENT = String.raw`(function(){
'use strict';
if(window.__MM_SOCIAL_REFINEMENT__===${JSON.stringify(VERSION)})return;
window.__MM_SOCIAL_REFINEMENT__=${JSON.stringify(VERSION)};
const VERSION=${JSON.stringify(VERSION)};
const STATUS='/api/community/status';
const SOCIAL_PATHS=new Set(['/beranda-trader.html','/grup-trader.html','/community.html','/profil.html','/live.html','/journal.html']);
const PROTECTED_HASHES=new Map([
 ['#shMessagePanel','pesan'],['#shMessagesPanel','pesan'],['#shNotificationPanel','notifikasi'],['#shNotificationsPanel','notifikasi'],['#shNotifPanel','notifikasi']
]);
let authState=document.documentElement.dataset.mmAuth||'unknown';
let lastFocused=null;
function detectAuth(data){if(!data||typeof data!=='object')return 'unknown';if(data.authenticated===true||data.loggedIn===true||data.logged_in===true||data.signedIn===true||data.user||data.account||data.profile)return 'in';if(data.authenticated===false||data.loggedIn===false||data.logged_in===false||data.signedIn===false||data.user===null||data.account===null||data.profile===null||data.username===null)return 'out';return 'unknown'}
const statusPromise=fetch(STATUS,{credentials:'same-origin',headers:{Accept:'application/json','X-MarketMarney-Client':VERSION}}).then(async response=>{const data=await response.clone().json().catch(()=>null);authState=detectAuth(data);document.documentElement.dataset.mmAuth=authState;return authState}).catch(()=>authState);
function safeTarget(value){try{const url=new URL(value||location.pathname+location.hash,location.href);if(url.origin!==location.origin)return '/beranda-trader.html';return url.pathname+url.search+url.hash}catch{return '/beranda-trader.html'}}
function loginHref(target){return '/akun.html?next='+encodeURIComponent(safeTarget(target))}
function featureCopy(feature){
 const map={pesan:['Pesan hanya untuk anggota','Masuk untuk membaca dan mengirim pesan kepada trader yang saling terhubung.'],notifikasi:['Notifikasi pribadi','Masuk untuk melihat reaksi, balasan, undangan grup, dan aktivitas akun Anda.'],live:['Mulai Live Marney','Masuk agar identitas host, keamanan siaran, dan kontrol live dapat diterapkan.'],follow:['Bangun jaringan trader','Masuk untuk mengikuti trader dan melihat pembaruan mereka di linimasa.'],group:['Kelola grup trader','Masuk untuk membuat grup, mengatur anggota, dan mengirim pesan.'],upload:['Bagikan ke Social Marney','Masuk untuk mengunggah postingan, story, reels, foto, atau dokumen.']};return map[feature]||['Masuk ke Social Marney','Masuk atau daftar agar fitur komunitas dapat digunakan dengan aman.'];
}
function ensureAuthGate(){
 let gate=document.getElementById('mmSocialAuthGate');if(gate)return gate;
 gate=document.createElement('div');gate.id='mmSocialAuthGate';gate.className='mm-social-auth-gate';gate.hidden=true;
 gate.innerHTML='<div class="mm-social-auth-backdrop" data-close="1"></div><section class="mm-social-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="mmSocialAuthTitle" aria-describedby="mmSocialAuthText"><button class="mm-social-auth-close" type="button" aria-label="Tutup" data-close="1">×</button><div class="mm-social-auth-icon" aria-hidden="true">M</div><h2 id="mmSocialAuthTitle">Masuk ke Social Marney</h2><p id="mmSocialAuthText"></p><div class="mm-social-auth-actions"><a class="mm-social-auth-primary">Masuk / Daftar</a><button class="mm-social-auth-secondary" type="button" data-close="1">Nanti</button></div></section>';
 document.body.appendChild(gate);
 const close=()=>{gate.hidden=true;document.body.classList.remove('mm-social-dialog-open');if(lastFocused&&lastFocused.isConnected)lastFocused.focus({preventScroll:true});lastFocused=null};
 gate.addEventListener('click',event=>{if(event.target.closest('[data-close="1"]'))close()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!gate.hidden){event.preventDefault();close()}});
 gate._mmClose=close;return gate;
}
function showAuthGate(feature,target){
 const gate=ensureAuthGate(),copy=featureCopy(feature);lastFocused=document.activeElement;
 gate.querySelector('#mmSocialAuthTitle').textContent=copy[0];gate.querySelector('#mmSocialAuthText').textContent=copy[1];
 const link=gate.querySelector('.mm-social-auth-primary');link.href=loginHref(target);link.dataset.mmTrusted='1';
 gate.hidden=false;document.body.classList.add('mm-social-dialog-open');requestAnimationFrame(()=>gate.querySelector('.mm-social-auth-primary').focus({preventScroll:true}));
}
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
 const cta=guide.querySelector('a');cta.href=loginHref(location.pathname+location.hash);
 const loginHeading=[...document.querySelectorAll('h1,h2')].find(node=>/Masuk|Daftar/i.test(node.textContent||''));const host=loginHeading?.closest('section,article')||document.querySelector('main')||document.body;host.insertAdjacentElement('afterend',guide);
}
function repairLegacyLinks(root=document){root.querySelectorAll('a[href]').forEach(link=>{const href=link.getAttribute('href')||'';if(/^\/?(?:pesan|messages)\.html(?:$|[?#])/i.test(href))link.setAttribute('href','/beranda-trader.html#shMessagePanel');if(/^\/?notifications?\.html(?:$|[?#])/i.test(href))link.setAttribute('href','/beranda-trader.html#shNotificationPanel');if(/^\/?social(?:-marney|marney)?\.html(?:$|[?#])/i.test(href))link.setAttribute('href','/beranda-trader.html')})}
function installSearchHints(root=document){
 root.querySelectorAll('input[type="search"],input[placeholder*="Cari" i]').forEach(input=>{if(input.dataset.mmSearchHint)return;const context=(input.closest('header,nav,aside,main')?.textContent||'')+' '+(input.id||'')+' '+(input.className||'');if(!/trader|social|postingan|grup|teman|friend|search/i.test(context))return;input.dataset.mmSearchHint='1';input.placeholder='Cari postingan, trader, atau grup';input.setAttribute('aria-label','Cari postingan, trader, atau grup');input.title='Cari postingan, trader, atau grup di Social Marney'});
}
function repairGuestErrors(root=document){
 if(authState!=='out')return;
 root.querySelectorAll('p,span,div,small').forEach(node=>{if(node.children.length||node.dataset.mmGuestRepair)return;const text=(node.textContent||'').replace(/\s+/g,' ').trim();if(!/(?:notifikasi|pesan).*(?:belum bisa dimuat|gagal dimuat|coba buka kembali)/i.test(text))return;node.dataset.mmGuestRepair='1';node.classList.add('mm-social-guest-repair');node.textContent='Masuk untuk melihat pesan dan notifikasi.';const link=document.createElement('a');link.href=loginHref('/beranda-trader.html');link.textContent='Masuk';link.dataset.mmTrusted='1';node.appendChild(link)});
}
function intentFor(control){
 if(!control||control.closest('#mmSocialAuthGate')||control.dataset.mmSocialGateBypass==='1')return null;
 let href='',url=null;try{href=control.getAttribute?.('href')||'';if(href)url=new URL(href,location.href)}catch{}
 const hash=url?.hash||((href||'').startsWith('#')?href:'');
 if(PROTECTED_HASHES.has(hash))return {feature:PROTECTED_HASHES.get(hash),target:'/beranda-trader.html'+hash};
 const signature=[control.id,typeof control.className==='string'?control.className:'',control.getAttribute?.('aria-label'),control.getAttribute?.('title'),control.textContent].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
 if(/(?:notifikasi|notification|bell|notif)/i.test(signature))return {feature:'notifikasi',target:'/beranda-trader.html#shNotificationPanel'};
 if(/(?:kirim pesan|pesan trader|message|envelope|inbox)/i.test(signature))return {feature:'pesan',target:'/beranda-trader.html#shMessagePanel'};
 if(/^(?:mulai live|buat live|mulai siaran|aktifkan kamera)/i.test(signature)||url?.pathname==='/start-stream')return {feature:'live',target:'/live.html'};
 if(/^(?:follow|ikuti|masuk untuk follow)/i.test(signature))return {feature:'follow',target:location.pathname+location.search+location.hash};
 if(/^(?:buat grup|tambah grup|kelola grup|gabung grup)/i.test(signature))return {feature:'group',target:'/grup-trader.html'};
 if(/^(?:unggah|upload|buat postingan|tambah story|buat story|bagikan postingan|posting)/i.test(signature))return {feature:'upload',target:location.pathname+location.search+location.hash};
 return null;
}
function replay(control){if(!control||!control.isConnected)return;control.dataset.mmSocialGateBypass='1';control.click();queueMicrotask(()=>delete control.dataset.mmSocialGateBypass)}
function installGuestFeatureGate(){
 if(document.documentElement.dataset.mmGuestFeatureGate)return;document.documentElement.dataset.mmGuestFeatureGate='1';
 document.addEventListener('click',event=>{const control=event.target&&event.target.closest?event.target.closest('a,button,[role="button"],input[type="button"],input[type="submit"]'):null,intent=intentFor(control);if(!intent||authState==='in')return;event.preventDefault();event.stopImmediatePropagation();Promise.resolve(statusPromise).finally(()=>authState==='in'?replay(control):showAuthGate(intent.feature,intent.target))},true);
}
function matchingControl(hash){return [...document.querySelectorAll('a[href],button[data-target],[role="button"][data-target]')].find(control=>{try{const href=control.getAttribute('href')||control.dataset.target||'';return new URL(href,location.href).hash===hash}catch{return false}})}
function activateHashPanel(){
 const hash=location.hash;if(!hash)return;const protectedFeature=PROTECTED_HASHES.get(hash);
 Promise.resolve(statusPromise).finally(()=>{
  if(protectedFeature&&authState!=='in'){const target=location.pathname+location.search+hash;history.replaceState(history.state,'',location.pathname+location.search);showAuthGate(protectedFeature,target);return}
  const control=matchingControl(hash);if(control)replay(control);
  const target=document.getElementById(hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
 });
}
function navItems(){return [
 {kind:'home',href:'/beranda-trader.html#shFeed',icon:'⌂',label:'Beranda'},
 {kind:'reels',href:'/beranda-trader.html#shReelsPanel',icon:'▷',label:'Reels'},
 {kind:'live',href:'/live.html',icon:'●',label:'Live'},
 {kind:'groups',href:'/grup-trader.html',icon:'◉',label:'Grup'},
 {kind:'profile',href:'/profil.html',icon:'◎',label:'Profil'}
]}
function activeNavKind(){if(location.pathname==='/live.html')return'live';if(location.pathname==='/grup-trader.html'||location.pathname==='/community.html')return'groups';if(location.pathname==='/profil.html'||location.pathname==='/journal.html')return'profile';if(location.pathname==='/beranda-trader.html'&&location.hash==='#shReelsPanel')return'reels';return'home'}
function updateMobileNav(){const nav=document.getElementById('mmSocialMobileNav');if(!nav)return;const active=activeNavKind();nav.querySelectorAll('a[data-kind]').forEach(link=>{if(link.dataset.kind===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
function installMobileNav(){
 if(!SOCIAL_PATHS.has(location.pathname)||document.getElementById('mmSocialMobileNav'))return;const nav=document.createElement('nav');nav.id='mmSocialMobileNav';nav.className='mm-social-mobile-nav';nav.setAttribute('aria-label','Navigasi Social Marney');for(const item of navItems()){const link=document.createElement('a');link.href=item.href;link.dataset.kind=item.kind;link.innerHTML='<span aria-hidden="true"></span><span></span>';link.children[0].textContent=item.icon;link.children[1].textContent=item.label;link.setAttribute('aria-label',item.label);nav.appendChild(link)}document.body.appendChild(nav);document.body.classList.add('mm-social-has-mobile-nav');updateMobileNav();
}
function enhance(root=document){normalizeEmptyStates(root);repairLegacyLinks(root);installSearchHints(root);repairGuestErrors(root)}
function start(){
 const home=location.pathname==='/'||location.pathname==='/index.html';if(home){fixHomeSocialEntry();return}
 document.documentElement.classList.add('mm-social-refined');installMobileNav();installGuestFeatureGate();enhance(document);
 statusPromise.finally(()=>{normalizeEmptyStates(document);repairGuestErrors(document);installGuestGuide();activateHashPanel()});
 addEventListener('hashchange',()=>{updateMobileNav();activateHashPanel()});
 let queued=false;new MutationObserver(records=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)enhance(node)})}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

function pathnameOf(req){try{return new URL(String(req.url||'/'),'http://marketmarney.local').pathname}catch{return String(req.url||'/').split('?')[0]}}
function redirectFor(pathname){return ALIASES.get(pathname)||null}
function injectHtml(html,pathname){const source=String(html||'');if(!INJECT_PAGES.has(pathname)||!/<\/html\s*>/i.test(source))return source;if(source.includes('data-mm-social-refinement="'+VERSION+'"'))return source;const query='?v='+encodeURIComponent(VERSION),head='<link rel="stylesheet" href="'+CSS_PATH+query+'" data-mm-social-refinement="'+VERSION+'"><script src="'+JS_PATH+query+'" data-mm-social-refinement="'+VERSION+'"></script>';return /<head\b[^>]*>/i.test(source)?source.replace(/<head\b[^>]*>/i,match=>match+head):head+source}
function sendAsset(req,res,body,type){const buffer=Buffer.isBuffer(body)?body:Buffer.from(body),etag='"'+crypto.createHash('sha256').update(buffer).digest('hex')+'"',headers={'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','ETag':etag,'Content-Length':buffer.length,'X-MarketMarney-Social-Refinement':VERSION};if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return}res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:buffer)}
function handle(req,res){const pathname=pathnameOf(req),method=String(req.method||'GET').toUpperCase();if(!['GET','HEAD'].includes(method))return false;const redirect=redirectFor(pathname);if(redirect){res.writeHead(302,{Location:redirect,'Cache-Control':'no-store','X-MarketMarney-Social-Refinement':VERSION});res.end();return true}if(pathname===JS_PATH){sendAsset(req,res,CLIENT,'text/javascript; charset=utf-8');return true}if(pathname===CSS_PATH){sendAsset(req,res,CSS,'text/css; charset=utf-8');return true}if(pathname===HEALTH_PATH){const payload=Buffer.from(JSON.stringify({ok:true,version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES),features:['message-route','notification-route','home-social-route','zero-counts','guest-guides','guest-auth-gate','protected-hash-routing','mobile-social-nav','search-hints','guest-error-repair','legacy-links']}));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':payload.length,'X-MarketMarney-Social-Refinement':VERSION});res.end(req.method==='HEAD'?undefined:payload);return true}return false}
function wrapHtml(req,res){const pathname=pathnameOf(req);if(String(req.method||'GET').toUpperCase()!=='GET'||!INJECT_PAGES.has(pathname))return;req.headers['accept-encoding']='identity';const original={writeHead:res.writeHead,write:res.write,end:res.end},chunks=[];let pending=false,pass=false,size=0;const MAX=6*1024*1024;function restore(){Object.assign(res,original)}function ok(){const type=String(res.getHeader('content-type')||'');return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/^text\/html\b/i.test(type))}function head(){if(pending&&!res.headersSent){pending=false;original.writeHead.call(res,res.statusCode)}}function flush(){head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0}res.writeHead=function(status,message,headers){if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments)}const values=typeof message==='string'?headers:message;if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1])}else if(values&&typeof values==='object'){for(const [key,value]of Object.entries(values))this.setHeader(key,value)}this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pending=true;return this};res.write=function(chunk,encoding,callback){if(typeof encoding==='function'){callback=encoding;encoding=undefined}const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback)}chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true};res.end=function(chunk,encoding,callback){if(typeof chunk==='function'){callback=chunk;chunk=undefined}else if(typeof encoding==='function'){callback=encoding;encoding=undefined}if(pass){restore();return original.end.call(this,chunk,encoding,callback)}if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length}if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback)}const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=injectHtml(raw,pathname),out=patched===raw?data:Buffer.from(patched);if(out!==data){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);this.setHeader('X-MarketMarney-Social-Refinement',VERSION);this.setHeader('Vary','Accept-Encoding');if(!wrapHtml.logged){wrapHtml.logged=true;console.log('MM_SOCIAL_REFINEMENT_HTML '+JSON.stringify({version:VERSION,page:pathname}))}}chunks.length=0;head();restore();return original.end.call(this,out,callback)}}
function installHttp(){if(http.createServer.__mmSocialRefinement===VERSION)return;const currentCreateServer=http.createServer;function createServer(...args){const server=currentCreateServer.apply(this,args),currentEmit=server.emit;server.emit=function(event,...eventArgs){if(event==='request'){const req=eventArgs[0],res=eventArgs[1];if(handle(req,res))return true;wrapHtml(req,res)}return currentEmit.call(this,event,...eventArgs)};return server}createServer.__mmSocialRefinement=VERSION;http.createServer=createServer;console.log('MM_SOCIAL_REFINEMENT_READY '+JSON.stringify({version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES)}))}
if(process.env.MM_SOCIAL_REFINEMENT_DISABLE_AUTO!=='1')installHttp();
module.exports={VERSION,JS_PATH,CSS_PATH,HEALTH_PATH,INJECT_PAGES,ALIASES,CSS,CLIENT,pathnameOf,redirectFor,injectHtml,sendAsset,handle,wrapHtml,installHttp};
