(function(){'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||location.pathname!=='/beranda-trader.html')return;
if(document.getElementById('mm43-social-header'))return;
var tries=0;
function start(){
 var app=document.getElementById('shApp');
 if(!app){if(++tries<30)setTimeout(start,100);return;}
 if(document.getElementById('mm43-social-header'))return;
 var html=document.documentElement;html.dataset.mm43Social='1';html.dataset.mm43View='feed';
 var $=function(id){return document.getElementById(id);};
 var make=function(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 var icons={plus:'<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
 function tool(label,icon,fn){var b=make('button','mm43-tool');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[icon]+'</svg>';b.onclick=fn;return b;}
 function logged(){return $('shLogged')&&!$('shLogged').hidden;}
 function login(){location.href='/akun.html';}
 var header=make('header','mm43-social-header');header.id='mm43-social-header';
 var row=make('div','mm43-headrow');var word=make('div','mm43-wordmark');word.append(document.createTextNode('Social '),make('span','','Marney'));row.append(word);
 var tabs=make('nav','mm43-tabs');tabs.setAttribute('aria-label','Bagian Social Marney');
 function setView(view){html.dataset.mm43View=view;feedTab.setAttribute('aria-pressed',String(view==='feed'));reelsTab.setAttribute('aria-pressed',String(view==='reels'));
  if(view==='reels'&&$('shReelsPanel')){$('shReelsPanel').open=true;}
  if(view==='feed')document.querySelectorAll('.sh-reel-video').forEach(function(v){v.pause();});
  window.scrollTo({top:0,behavior:'auto'});
 }
 var feedTab=make('button','','Linimasa');feedTab.type='button';feedTab.setAttribute('aria-pressed','true');feedTab.onclick=function(){setView('feed');};
 var reelsTab=make('button','','Reels');reelsTab.type='button';reelsTab.setAttribute('aria-pressed','false');reelsTab.onclick=function(){if(!logged()){login();return;}setView('reels');};
 var groups=make('a','','Grup');groups.href='/grup-trader.html';tabs.append(feedTab,reelsTab,groups);
 var searchHolder=make('div','mm43-searchholder');searchHolder.hidden=true;
 var oldSearch=document.querySelector('.sh-top-search');if(oldSearch)searchHolder.append(oldSearch);
 var searchButton=tool('Cari trader, grup, atau postingan','search',function(){searchHolder.hidden=!searchHolder.hidden;searchButton.setAttribute('aria-expanded',String(!searchHolder.hidden));if(!searchHolder.hidden&&$('shSearch'))$('shSearch').focus();});searchButton.setAttribute('aria-expanded','false');searchButton.style.marginLeft='auto';
 var newMenu=make('dialog','sh-story-dialog');newMenu.id='mm43-create-menu';var menuBox=make('div','sh-modal-box');
 var menuHead=make('div','sh-modal-head');menuHead.append(make('h2','','Buat & kelola'),tool('Tutup menu','close',function(){newMenu.close();}));menuBox.append(menuHead);
 function menuAction(text,fn){var b=make('button','sh-primary',text);b.type='button';b.onclick=function(){newMenu.close();fn();};menuBox.append(b);}
 function createPost(){if(!logged()){login();return;}setView('feed');var form=$('shComposer');if(form)form.hidden=false;var box=document.querySelector('.sh-compose');if(box)box.scrollIntoView({block:'start',behavior:'smooth'});if($('shBody'))$('shBody').focus();}
 menuAction('Postingan • foto / video',createPost);
 menuAction('Story • aktif 24 jam',function(){if(!logged()){login();return;}setView('feed');if($('shStoryCreate'))$('shStoryCreate').showModal();});
 menuAction('Reels • video vertikal',function(){if(!logged()){login();return;}setView('reels');if($('shReelCaption'))$('shReelCaption').focus();});
 menuAction('Ganti tema terang / gelap',function(){var mode=html.dataset.traderTheme==='dark'?'light':'dark';var btn=document.querySelector('[data-sh-theme="'+mode+'"]');if(btn)btn.click();});
 var privacy=make('p','','Posting hanya diterbitkan setelah Anda menekan tombol Posting atau Terbitkan.');menuBox.append(privacy);newMenu.append(menuBox);document.body.append(newMenu);
 row.append(tool('Buat postingan, Story atau Reels','plus',function(){newMenu.showModal();}));
 var messenger=$('shMessengerWrap');if(messenger)row.append(messenger);
 var profile=make('a','mm43-tool');profile.href='/akun.html?pengaturan=1';profile.setAttribute('aria-label','Profil dan pengaturan akun');profile.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons.profile+'</svg>';row.append(profile);
 tabs.append(searchButton);var notices=$('shNotificationWrap');if(notices)tabs.append(notices);
 header.append(row,tabs,searchHolder);document.body.insertBefore(header,app);
 var guest=$('shGuest');if(guest){var title=guest.querySelector('h1');if(title)title.textContent='Temukan komunitas Anda.';var desc=guest.querySelector('p');if(desc)desc.textContent='Ikuti trader, lihat Story dan Reels, lalu bagikan pandangan pasar. Masuk untuk melihat linimasa akun Anda.';
  var email=guest.querySelector('a');if(email){email.classList.add('mm43-login','secondary');email.textContent='Masuk dengan email / daftar';}
  var google=make('a','sh-primary-link mm43-login','Lanjutkan dengan Google');google.href='/api/auth/google/start';if(email)guest.insertBefore(google,email);else guest.append(google);
 }
 // Move the existing media nodes rather than rebuilding posts. This preserves
 // server-bound like/comment/report handlers and all original permission checks.
 function decorate(){document.querySelectorAll('.sh-post:not([data-mm43-card])').forEach(function(card){card.dataset.mm43Card='1';var head=card.querySelector('.sh-post-header'),body=card.querySelector('.sh-post-body');var media=card.querySelector('.sh-post-photo,.sh-post-video');if(head&&media&&body){head.after(media);media.after(body);card.classList.add('mm43-has-media');}Array.from(card.children).forEach(function(n){if(n.querySelector&&n.querySelector('[class*="reaction"]'))n.setAttribute('data-mm43-reactions','1');});});}
 var pending=false;var observer=new MutationObserver(function(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate();});});
 var feed=$('shFeed');if(feed)observer.observe(feed,{childList:true,subtree:true});decorate();
 var quick=$('shQuickReel');if(quick)quick.addEventListener('click',function(){setView('reels');});
 window.addEventListener('pagehide',function(){observer.disconnect();},{once:true});
 // A deep-linked reel opens the correct section without changing its ID.
 if(new URL(location.href).searchParams.has('reel')){setView('reels');}
}
start();
})();
