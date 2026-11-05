/* Social Marney 4.4: reference-video layout, app-only. No new auth or write APIs. */
(function () {
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||location.port&&location.port!=='443')return;
if(!['/beranda-trader.html','/profil.html'].includes(location.pathname))return;
var H=document.documentElement, $=function(id){return document.getElementById(id);};
var node=function(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
var paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',reels:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 9h18M7 3l4 6m3-6 4 6m-8 3 5 3-5 3z"/>',messages:'<path d="m21 3-6 18-4-8-8-4zM11 13 21 3"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',profile:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>',plus:'<path d="M12 4v16M4 12h16"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',grid:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',back:'<path d="m14 5-7 7 7 7"/>',comment:'<path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',list:'<path d="M4 4h16v6H4zM4 14h16v6H4z"/>'};
function icon(k){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[k]||paths.menu)+'</svg>';}
function button(label,k,fn,cls){var b=node('button',cls||'mm44-icon');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=icon(k);if(fn)b.addEventListener('click',fn);return b;}
function safeLink(raw){try{var u=new URL(raw,location.origin);return u.protocol==='https:'&&u.hostname==='marketmarney.com'&&!u.port&&!u.username&&!u.password?u.href:null;}catch(e){return null;}}
function forceLight(){H.dataset.mm44Social='1';H.dataset.traderTheme='light';}
function wordmark(){var x=node('a','mm44-wordmark');x.href='/beranda-trader.html';x.append(node('strong','','Social'),node('span','','Marney'));return x;}
function showMessage(s){var t=$('mm44-toast');if(!t){t=node('p','mm44-toast');t.id='mm44-toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=s;t.hidden=false;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(function(){t.hidden=true;},3200);}
function mountProfile(){
 if($('mm44-profile-header'))return;
 var zone=document.querySelector('[data-mm36="public"]');if(!zone)return;
 forceLight();H.dataset.mm44Page='profile';
 var header=node('header','mm44-profile-header');header.id='mm44-profile-header';
 header.append(button('Kembali ke Social Marney','back',function(){location.href='/beranda-trader.html';}));
 var title=node('strong','mm44-profile-title','Profil');header.append(title);
 header.append(button('Pengaturan akun','menu',function(){location.href='/akun.html?pengaturan=1';}));document.body.prepend(header);
 var posts=$('mm36PublicPosts'),count=$('mm36PublicCount'),row=document.querySelector('.mm46-stat-row'),identity=document.querySelector('.mm46-identity');
 if(row&&count){var counter=node('div','mm46-stat mm44-post-stat');counter.append(count,node('span','','postingan'));row.prepend(counter);}
 var profileRow=document.querySelector('.mm46-profile-row');if(profileRow&&row)profileRow.append(row);
 var actions=document.querySelector('.mm46-actions');if(actions){var share=button('Bagikan profil','messages',function(){var data={title:document.title,url:location.href};if(navigator.share)navigator.share(data).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(function(){showMessage('Tautan profil disalin.');}).catch(function(){showMessage('Gunakan alamat halaman untuk berbagi.');});},'mm44-profile-share');share.append(node('span','','Bagikan profil'));actions.append(share);}
 var switcher=node('nav','mm44-profile-tabs');switcher.setAttribute('aria-label','Tampilan postingan profil');
 var grid=button('Grid postingan','grid',function(){H.dataset.mm44ProfileMode='grid';grid.setAttribute('aria-pressed','true');list.setAttribute('aria-pressed','false');});
 var list=button('Daftar postingan','list',function(){H.dataset.mm44ProfileMode='list';grid.setAttribute('aria-pressed','false');list.setAttribute('aria-pressed','true');});
 grid.setAttribute('aria-pressed','true');list.setAttribute('aria-pressed','false');switcher.append(grid,list);if(posts)posts.before(switcher);H.dataset.mm44ProfileMode='grid';
 function decorate(){
  var handle=$('mm36PublicHandle'),name=$('mm36PublicName');title.textContent=(handle&&handle.textContent.trim())||(name&&name.textContent.trim())||'Profil';
  if(count&&count.textContent.indexOf(' postingan')>=0){var original=count.textContent;count.setAttribute('title',original);count.textContent=original.split(' postingan')[0];}
  if(!posts)return;
  posts.querySelectorAll('.mm36-post:not([data-mm44-grid])').forEach(function(card){
   card.dataset.mm44Grid='1';var media=card.querySelector('img,video');var id=card.id.replace(/^trader-post-/,'');if(!id)return;
   var a=node('a','mm44-grid-open');a.href='/beranda-trader.html?post='+encodeURIComponent(id);a.setAttribute('aria-label','Buka postingan dan diskusi');
   if(media){card.classList.add('mm44-profile-media');var cover=node('img');cover.src=media.tagName==='VIDEO'?(media.poster||'/assets/video-placeholder1880.svg'):media.src;cover.alt=media.alt||'Postingan video';cover.loading='lazy';a.append(cover);if(media.tagName==='VIDEO'){var badge=node('span','mm44-grid-video');badge.innerHTML=icon('reels');a.append(badge);}}
   else{var body=card.querySelector('.mm-public-post-body');a.append(node('p','mm44-grid-text',body?body.textContent:'Postingan'));}
   card.prepend(a);
  });
 }
 var queued=false;var obs=new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate();});});obs.observe(zone,{childList:true,subtree:true});decorate();window.addEventListener('pagehide',function(){obs.disconnect();},{once:true});
}
function mountSocial(){
 if($('mm44-social-header'))return;
 var app=$('shApp');if(!app)return;
 forceLight();H.dataset.mm44Page='social';H.dataset.mm44View='feed';
 function logged(){return $('shLogged')&&!$('shLogged').hidden;}
 function login(){location.href='/akun.html';}
 var header=node('header','mm44-social-header');header.id='mm44-social-header';
 var row=node('div','mm44-headrow'),nav=node('nav','mm44-nav');nav.setAttribute('aria-label','Bagian Social Marney');
 var create=button('Buat postingan, Story atau Reels','plus',function(){menu.showModal();});row.append(create,wordmark());
 var notice=$('shNotificationWrap');if(notice){row.append(notice);var bell=notice.querySelector('#shNotificationBell');if(bell){var svg=bell.querySelector('svg');if(svg)svg.innerHTML=paths.heart;bell.setAttribute('aria-label','Notifikasi');}}
 row.append(button('Menu Social Marney','menu',function(){menu.showModal();}));
 var messenger=$('shMessengerWrap');if(messenger)header.append(messenger);
 var tabs={};var current='feed';var pane=messenger?messenger.querySelector('#shMessengerPane'):null;var searchHolder=node('section','mm44-searchholder');searchHolder.id='mm44-searchholder';
 var oldSearch=document.querySelector('.sh-top-search');if(oldSearch){searchHolder.append(oldSearch);var input=searchHolder.querySelector('#shSearch');if(input){input.placeholder='Cari trader, postingan, atau grup';input.setAttribute('aria-label','Cari di Social Marney');}}
 var explore=node('section','mm44-explore');explore.id='mm44-explore';explore.append(searchHolder);
 var grid=node('div','mm44-explore-grid');grid.id='mm44-explore-grid';explore.append(grid);
 var hint=node('p','mm44-explore-note','Media dari linimasa yang sudah dimuat. Gunakan pencarian untuk menemukan trader atau grup.');explore.append(hint);app.parentNode.insertBefore(explore,app);
 function setView(view,historyChange){
  if(!logged()&&view!=='feed'){login();return;}
  if(view!=='messages'&&pane&&!pane.hidden&&$('shMsgClose'))$('shMsgClose').click();
  current=view;H.dataset.mm44View=view;
  Object.keys(tabs).forEach(function(k){tabs[k].setAttribute('aria-pressed',String(k===view));});
  if(view==='reels'&&$('shReelsPanel'))$('shReelsPanel').open=true;
  if(view==='messages'&&pane&&pane.hidden&&$('shMessengerButton'))$('shMessengerButton').click();
  if(view!=='reels')document.querySelectorAll('.sh-reel-video').forEach(function(v){v.pause();});
  if(view==='explore'){updateGrid();if($('shSearch'))$('shSearch').focus({preventScroll:true});}
  if(view==='feed'&&$('shSearch')&&$('shSearch').value){$('shSearch').value='';$('shSearch').dispatchEvent(new Event('input',{bubbles:true}));}
  if(historyChange!==false){var u=new URL(location.href);u.hash=view==='feed'?'':'mm44-'+view;history.pushState({mm44:view},'',u.pathname+u.search+u.hash);}
  window.scrollTo({top:0,behavior:'auto'});
 }
 [['feed','Linimasa','home'],['reels','Reels','reels'],['messages','Pesan','messages'],['explore','Jelajah','search'],['profile','Profil','profile']].forEach(function(t){
  var b=button(t[1],t[2],function(){if(t[0]==='profile'){if(!logged()){login();return;}var a=$('shPublicProfile');location.href=a&&safeLink(a.href)?a.href:'/akun.html?pengaturan=1';}else setView(t[0]);},'mm44-nav-button');
  b.append(node('span','',t[1]));b.setAttribute('aria-pressed',String(t[0]==='feed'));tabs[t[0]]=b;nav.append(b);
 });
 header.append(row,nav);document.body.insertBefore(header,explore);
 // Existing messenger owns sending, visibility, permissions and polling.
 if($('shMsgClose'))$('shMsgClose').addEventListener('click',function(){if(current==='messages'){current='feed';H.dataset.mm44View='feed';Object.keys(tabs).forEach(function(k){tabs[k].setAttribute('aria-pressed',String(k==='feed'));});}});
 if($('shMsgNewChat'))$('shMsgNewChat').addEventListener('click',function(e){e.preventDefault();setView('explore');});
 var menu=node('dialog','mm44-menu');menu.id='mm44-create-menu';menu.setAttribute('aria-label','Buat konten atau buka pengaturan');
 var mh=node('div','mm44-menu-head');mh.append(node('h2','','Social Marney'),button('Tutup menu','close',function(){menu.close();}));menu.append(mh);
 function action(label,k,fn){var b=button(label,k,function(){menu.close();fn();},'mm44-menu-action');b.append(node('span','',label));menu.append(b);}
 action('Postingan foto / video','grid',function(){if(!logged()){login();return;}setView('feed');H.dataset.mm44Compose='1';var form=$('shComposer');if(form)form.hidden=false;var box=document.querySelector('.sh-compose');if(box)box.scrollIntoView({block:'start',behavior:'smooth'});if($('shBody'))$('shBody').focus();});
 action('Buat Story','plus',function(){if(!logged()){login();return;}setView('feed');if($('shStoryCreate'))$('shStoryCreate').showModal();});
 action('Unggah Reel','reels',function(){if(!logged()){login();return;}setView('reels');H.dataset.mm44ReelCompose='1';if($('shReelCaption'))$('shReelCaption').focus();});
 action('Grup publik & privat','messages',function(){location.href='/grup-trader.html';});
 action('Profil dan pengaturan akun','profile',function(){location.href='/akun.html?pengaturan=1';});
 menu.append(node('p','mm44-menu-note','Konten baru hanya dikirim setelah Anda menekan tombol terbitkan.'));document.body.append(menu);
 var guest=$('shGuest');if(guest){var title=guest.querySelector('h1'),desc=guest.querySelector('p');if(title)title.textContent='Cerita pasar. Koneksi nyata.';if(desc)desc.textContent='Masuk ke Social Marney untuk melihat Story, Reels, pesan, dan postingan komunitas Anda.';var email=guest.querySelector('a');if(email)email.textContent='Masuk dengan email / daftar';var g=node('a','mm44-google','Lanjutkan dengan Google');g.href='/api/auth/google/start';guest.append(g);var note=node('small','mm44-guest-note','Akun dan pengaturan privasi tetap menggunakan Social Marney.');guest.append(note);}
 var gridSignature='';
 function updateGrid(){
  var cards=Array.from(document.querySelectorAll('#shFeed .sh-post[data-post-id]'));var mediaCards=cards.filter(function(c){return c.querySelector('.sh-post-photo,.sh-post-video');});
  var sig=mediaCards.map(function(c){var m=c.querySelector('.sh-post-photo,.sh-post-video');return c.dataset.postId+':'+m.getAttribute('src');}).join('|');if(sig===gridSignature&&grid.childNodes.length)return;gridSignature=sig;grid.replaceChildren();
  mediaCards.forEach(function(c){var m=c.querySelector('.sh-post-photo,.sh-post-video'),a=node('a','mm44-explore-item');a.href='/beranda-trader.html?post='+encodeURIComponent(c.dataset.postId);a.setAttribute('aria-label','Buka postingan');var img=node('img');img.src=m.tagName==='VIDEO'?(m.poster||'/assets/video-placeholder1880.svg'):m.src;img.alt=m.alt||'Video komunitas';img.loading='lazy';a.append(img);if(m.tagName==='VIDEO'){var i=node('span','mm44-grid-video');i.innerHTML=icon('reels');a.append(i);}grid.append(a);});
  if(!mediaCards.length)grid.append(node('p','mm44-grid-empty','Belum ada media yang dimuat. Cari akun atau lihat linimasa untuk menjelajah.'));
 }
 function decorate(){
  document.querySelectorAll('.sh-post:not([data-mm44-card])').forEach(function(card){
   card.dataset.mm44Card='1';var head=card.querySelector('.sh-post-header'),body=card.querySelector('.sh-post-body'),media=card.querySelector('.sh-post-photo,.sh-post-video'),actions=card.querySelector('.sh-post-actions'),counts=card.querySelector('.sh-countrow');
   if(head&&media){head.after(media);card.classList.add('mm44-has-media');}
   if(actions&&media)media.after(actions);if(counts&&actions)actions.after(counts);if(body&&counts&&media)counts.after(body);
   if(actions){Array.from(actions.querySelectorAll('button')).forEach(function(b){var text=b.textContent;if(/komentar/i.test(text)){b.classList.add('mm44-action-comment');b.setAttribute('aria-label','Komentar');}else if(/bagikan|salin/i.test(text)){b.classList.add('mm44-action-share');b.setAttribute('aria-label','Bagikan postingan');}});}
   var trigger=card.querySelector('.mm-reaction-trigger');if(trigger&&actions){var proxy=button('Beri atau ubah reaksi','heart',function(){trigger.click();},'mm44-action-heart');actions.prepend(proxy);card.classList.add('mm44-reaction-proxied');}
  });
  if(current==='explore')updateGrid();
 }
 var pending=false,obs=new MutationObserver(function(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate();});});if($('shFeed'))obs.observe($('shFeed'),{childList:true,subtree:true});decorate();
 if($('shQuickReel'))$('shQuickReel').addEventListener('click',function(){setView('reels');H.dataset.mm44ReelCompose='1';});
 function hashView(){var h=location.hash.replace('#mm44-','');if(['feed','reels','messages','explore'].includes(h))setView(h,false);else if(!location.hash)setView('feed',false);}
 window.addEventListener('popstate',hashView);
 window.addEventListener('pagehide',function(){obs.disconnect();window.removeEventListener('popstate',hashView);},{once:true});
 if(new URL(location.href).searchParams.has('reel'))setView('reels',false);
 else if(location.hash.indexOf('#mm44-')===0)hashView();
}
var attempts=0;
function boot(){if(location.pathname==='/profil.html'){if(document.querySelector('[data-mm36="public"]'))mountProfile();else if(++attempts<30)setTimeout(boot,100);}else{if($('shApp'))mountSocial();else if(++attempts<30)setTimeout(boot,100);}}
boot();
})();
