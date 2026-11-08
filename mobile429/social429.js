/* Marney 4.29 — app-only Social shell. */
(function install429(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(!['/beranda-trader.html','/grup-trader.html','/profil.html'].includes(location.pathname))return;
if(window.__mm429SocialShell)return;
var H=document.documentElement,attempt=0;
function svg(key){var p={media:'<path d="M4 5h16v14H4z"/><path d="m6 16 4-4 3 3 2-2 3 3"/><circle cx="9" cy="9" r="1.5"/>',reels:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 9h18M7 3l4 6m3-6 4 6m-8 3 5 3-5 3z"/>',messages:'<path d="M5 4h14l3 4v8l-3 4h-7l-6 3v-3H5l-3-4V8z"/><path d="M7 10h10M7 14h7"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',profile:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>',group:'<path d="M4 5h16v14H4z"/><path d="M8 5v14M12 10h5M12 14h4"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p[key]+'</svg>';}
function item(label,key,href,active){var a=document.createElement('a');a.className='mm44-nav-button';a.href=href;a.setAttribute('aria-label',label);a.setAttribute('aria-pressed',String(!!active));if(active)a.setAttribute('aria-current','page');a.innerHTML=svg(key)+'<span>'+label+'</span>';return a;}
function profileDock(){
 if(document.querySelector('.mm44-nav'))return;
 var nav=document.createElement('nav');nav.className='mm44-nav mm429-profile-nav';nav.setAttribute('aria-label','Bagian Media Marney');
 nav.append(item('Media','media','/beranda-trader.html#mm44-feed',false),item('Reels','reels','/beranda-trader.html#mm44-reels',false),item('Pesan','messages','/beranda-trader.html#mm44-messages',false),item('Jelajah','search','/beranda-trader.html#mm44-explore',false),item('Profil','profile',location.pathname+location.search,true));
 document.body.append(nav);
}
function tune(){
 var header=document.getElementById('mm44-social-header');
 if(!document.body||(!header&&location.pathname!=='/profil.html')){if(++attempt<40)setTimeout(tune,100);return;}
 window.__mm429SocialShell=true;H.dataset.mm429Social='429';H.dataset.traderTheme='light';
 var section=document.querySelector('.mm417-brand-section');if(section)section.textContent='Media Marney';
 var wordmark=document.querySelector('.mm44-wordmark');if(wordmark){wordmark.href='/beranda-trader.html#mm44-feed';wordmark.setAttribute('aria-label','Media Marney');}
 var media=document.querySelector('.mm44-nav-button[aria-label="Linimasa"]');if(media){media.setAttribute('aria-label','Media');var span=media.querySelector('span');if(span)span.textContent='Media';if(media.tagName==='A')media.href='/beranda-trader.html#mm44-feed';}
 if(location.pathname==='/grup-trader.html'){
   var group=document.querySelector('.mm44-nav-button[aria-label="Pesan"]');if(group){group.setAttribute('aria-label','Grup');group.setAttribute('aria-current','page');group.setAttribute('aria-pressed','true');group.href='/grup-trader.html';var gs=group.querySelector('span');if(gs)gs.textContent='Grup';}
 }
 if(location.pathname==='/profil.html')profileDock();
 if(location.pathname==='/beranda-trader.html'&&!location.hash)history.replaceState(history.state,'','/beranda-trader.html#mm44-feed');
 var title=document.querySelector('#shGuest h1');if(title&&/Beranda Trader/i.test(title.textContent))title.textContent='Masuk ke Media Marney';
 var feedTitle=document.querySelector('.sh-feedbar h2');if(feedTitle)feedTitle.textContent='Media Marney';
 document.title=location.pathname==='/beranda-trader.html'?'Media Marney | MarketMarney':document.title;
}
tune();
})();
