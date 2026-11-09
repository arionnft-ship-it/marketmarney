/* Marney 4.30 — app-only return-to-home control for Social Marney. */
(function install430Home(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(location.pathname!=='/beranda-trader.html')return;
if(window.__mm430HomeButton)return;
var H=document.documentElement,attempt=0;
function homeMarkup(){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg><span class="mm430-home-label">Beranda</span>';}
function mount(){
 var row=document.querySelector('#mm44-social-header .mm44-headrow');
 if(!row){if(++attempt<50)setTimeout(mount,100);return;}
 var existing=row.querySelector('.mm430-home-button');
 if(existing){existing.setAttribute('aria-label','Kembali ke Beranda');existing.title='Kembali ke Beranda';H.dataset.mm430Home='ready';window.__mm430HomeButton=true;return;}
 var original=Array.prototype.find.call(row.children,function(node){return node.classList&&node.classList.contains('mm44-icon')&&/Buat postingan/i.test(node.getAttribute('aria-label')||'');});
 if(!original){if(++attempt<50)setTimeout(mount,100);return;}
 var home=original.cloneNode(false); // clone removes the old create-menu click listener.
 home.type='button';home.className=(original.className+' mm430-home-button').trim();
 home.innerHTML=homeMarkup();home.setAttribute('aria-label','Kembali ke Beranda');home.title='Kembali ke Beranda';
 home.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();location.assign('/index.html#mm-app-home');});
 original.replaceWith(home);H.dataset.mm430Home='ready';window.__mm430HomeButton=true;
}
mount();
})();
