/* Marney 4.7: persistent Social header on Reels, messages and group rooms.
 * Layout/routes only. No credentials, account writes or access checks changed. */
(function install(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(!['/beranda-trader.html','/grup-trader.html'].includes(location.pathname)||window.__mm47Nav)return;
var H=document.documentElement,group=location.pathname==='/grup-trader.html';
if(!document.body||(!group&&!document.getElementById('mm44-social-header'))){window.__mm47Attempts=(window.__mm47Attempts||0)+1;if(window.__mm47Attempts<30)setTimeout(install,100);return;}
window.__mm47Nav=true;
var paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',reels:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 9h18M7 3l4 6m3-6 4 6m-8 3 5 3-5 3z"/>',messages:'<path d="M6 4h12l3 3v9l-3 3h-6l-5 3v-3H6l-3-3V7z"/><path d="M7.5 13V9l4.5 3 4.5-3v4"/><path d="M8 16h8" class="mm45-accent"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',profile:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>'};
function node(tag,cls,text){var n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
var header=document.getElementById('mm44-social-header');
if(group){
 H.dataset.mm44Social='1';H.dataset.mm47Group='1';
 header=node('header','mm44-social-header mm47-group-header');header.id='mm44-social-header';
 var row=node('div','mm44-headrow'),brand=node('a','mm44-wordmark');brand.href='/beranda-trader.html';brand.append(node('strong','','Social'),node('span','','Marney'));row.append(brand);
 var nav=node('nav','mm44-nav');nav.setAttribute('aria-label','Bagian Social Marney');
 [['Linimasa','home','/beranda-trader.html'],['Reels','reels','/beranda-trader.html#mm44-reels'],['Pesan','messages','/beranda-trader.html#mm44-messages'],['Jelajah','search','/beranda-trader.html#mm44-explore'],['Profil','profile','/akun.html?pengaturan=1']].forEach(function(a){
  var link=node('a','mm44-nav-button');link.href=a[2];link.setAttribute('aria-label',a[0]);link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[a[1]]+'</svg>';link.append(node('span','',a[0]));if(a[0]==='Pesan'){link.setAttribute('aria-current','page');link.setAttribute('aria-pressed','true');}nav.append(link);
 });
 header.append(row,nav);document.body.prepend(header);
}
if(!header)return;
H.dataset.mm47Nav='1';
var frame=0,stopped=false,lastHeight=-1,lastViewport=-1,ro=null;
function measure(){
 frame=0;if(stopped)return;
 var top=Math.ceil(header.getBoundingClientRect().height),vh=Math.round(window.visualViewport?window.visualViewport.height:innerHeight);
 if(top!==lastHeight){lastHeight=top;H.style.setProperty('--mm47-top',top+'px');}
 if(vh!==lastViewport){lastViewport=vh;H.style.setProperty('--mm47-vh',vh+'px');}
 H.style.setProperty('--mm46-height',Math.max(1,vh-top)+'px');
}
function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(measure);}
if(typeof ResizeObserver==='function'){ro=new ResizeObserver(schedule);ro.observe(header);}
window.addEventListener('resize',schedule);if(window.visualViewport)window.visualViewport.addEventListener('resize',schedule);
window.addEventListener('mm45:resume',schedule);
measure();
window.addEventListener('pagehide',function(){stopped=true;if(ro)ro.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);if(window.visualViewport)window.visualViewport.removeEventListener('resize',schedule);window.removeEventListener('mm45:resume',schedule);},{once:true});
})();
