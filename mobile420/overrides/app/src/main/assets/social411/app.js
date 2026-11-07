/* Resolve the current account only on an explicit Profile click. Never cache credentials. */
(function(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(!['/beranda-trader.html','/grup-trader.html'].includes(location.pathname)||window.MarneyProfile49)return;
var pending=null,controller=null,dead=false;
function validLink(raw){try{var u=new URL(raw,location.origin);var user=u.searchParams.get('user');return u.protocol==='https:'&&u.hostname==='marketmarney.com'&&(!u.port||u.port==='443')&&!u.username&&!u.password&&u.pathname==='/profil.html'&&user&&user.trim().length>0&&user.length<=100?u.pathname+u.search:null;}catch(e){return null;}}
function status(message){var n=document.getElementById('mm49-profile-status');if(!n){n=document.createElement('p');n.id='mm49-profile-status';n.setAttribute('role','status');n.style.cssText='position:fixed;left:16px;right:16px;bottom:20px;z-index:120;padding:12px 16px;background:#152332;color:#fff;border-radius:12px;font:13px/1.5 sans-serif';document.body.append(n);}n.textContent=message;n.hidden=!message;}
async function open(trigger){
 if(pending)return pending;
 var original=location.pathname+location.search+location.hash,view=document.documentElement.dataset.mm44View;
 function current(){return !dead&&location.pathname+location.search+location.hash===original&&document.documentElement.dataset.mm44View===view;}
 var a=document.getElementById('shPublicProfile'),link=a&&validLink(a.getAttribute('href'));
 if(link){location.assign(link);return;}
 if(trigger){trigger.setAttribute('aria-busy','true');if(trigger.tagName==='BUTTON')trigger.disabled=true;}
 status('Memuat profil akun…');controller=new AbortController();var timer=setTimeout(function(){controller.abort();},12000);
 pending=(async function(){try{
  var r=await fetch('/api/community/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  var d=await r.json();if(!current())return;
  if(r.status===401||r.ok&&!d.user){location.assign('/akun.html');return;}
  if(!r.ok)throw Error('Profil belum dapat dimuat. Coba lagi.');
  var username=String(d.user.username||'').trim();
  if(!username||username.length>100)throw Error('Identitas profil belum tersedia. Coba lagi.');
  location.assign('/profil.html?user='+encodeURIComponent(username));
 }catch(e){if(current())status(e.name==='AbortError'?'Koneksi terputus atau terlalu lama. Ketuk Profil untuk mencoba lagi.':'Profil belum dapat dimuat. Ketuk Profil untuk mencoba lagi.');}
 finally{clearTimeout(timer);if(trigger){trigger.removeAttribute('aria-busy');if(trigger.tagName==='BUTTON')trigger.disabled=false;}pending=null;controller=null;}})();
 return pending;
}
window.MarneyProfile49={open:open,validLink:validLink};
window.addEventListener('pagehide',function(){dead=true;if(controller)controller.abort();},{once:true});
})();

/* Social Marney 4.4: reference-video layout, app-only. No new auth or write APIs. */
(function () {
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||location.port&&location.port!=='443')return;
if(!['/beranda-trader.html','/profil.html'].includes(location.pathname))return;
var H=document.documentElement, $=function(id){return document.getElementById(id);};
var node=function(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
var paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',reels:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 9h18M7 3l4 6m3-6 4 6m-8 3 5 3-5 3z"/>',messages:'<path d="M6 4h12l3 3v9l-3 3h-6l-5 3v-3H6l-3-3V7z"/><path d="M7.5 13V9l4.5 3 4.5-3v4"/><path d="M8 16h8" class="mm45-accent"/>',notice:'<path d="M7 10c0-3 2-5 5-5s5 2 5 5v4l2 3H5l2-3zM10 20h4M12 2v2"/><path d="M9 12h2l1-2 1 4 1-2h1" class="mm45-accent"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',profile:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>',plus:'<path d="M12 4v16M4 12h16"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',grid:'<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',back:'<path d="m14 5-7 7 7 7"/>',comment:'<path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',list:'<path d="M4 4h16v6H4zM4 14h16v6H4z"/>'};
function icon(k){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[k]||paths.menu)+'</svg>';}
function controlIcon(el,key){
 if(!el)return;var svg=el.querySelector('svg');
 if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');el.prepend(svg);}
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.innerHTML=paths[key];
 Array.from(el.childNodes).forEach(function(n){if(n.nodeType===3&&/^[\s♡♥❤✉🔔✈➤➜]+$/u.test(n.textContent))n.remove();});
}
function button(label,k,fn,cls){var b=node('button',cls||'mm44-icon');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=icon(k);if(fn)b.addEventListener('click',fn);return b;}
function safeLink(raw){try{var u=new URL(raw,location.origin);return u.protocol==='https:'&&u.hostname==='marketmarney.com'&&!u.port&&!u.username&&!u.password?u.href:null;}catch(e){return null;}}
function forceLight(){H.dataset.mm44Social='1';H.dataset.traderTheme='light';}
function brandImage(){var image=node('img','mm417-brand-image');image.src='/__android417/brand/logo.png';image.alt='MARNEY';image.width=36;image.height=36;image.decoding='async';image.loading='eager';return image;}
function wordmark(){var x=node('a','mm44-wordmark mm417-wordmark');x.href='/beranda-trader.html';x.setAttribute('aria-label','Social Marney — beranda komunitas');x.append(brandImage(),node('span','mm417-brand-section','Social Marney'));return x;}
function showMessage(s){var t=$('mm44-toast');if(!t){t=node('p','mm44-toast');t.id='mm44-toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=s;t.hidden=false;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(function(){t.hidden=true;},3200);}

function installMediaPolicy(){
 if(window.__mm45Media)return;window.__mm45Media=true;
 var watched=new WeakSet(),queue=[],scheduled=false;
 var observer=typeof IntersectionObserver==='function'?new IntersectionObserver(function(entries){entries.forEach(function(e){if(!e.isIntersecting&&!e.target.paused)e.target.pause();});},{threshold:0.01}):null;
 function scan(root){
  if(!root||root.nodeType!==1)return;
  var media=[];if(root.matches('img,video'))media.push(root);
  root.querySelectorAll('img,video').forEach(function(m){media.push(m);});
  media.forEach(function(m){if(m.matches('.sh-reel-video'))return;if(watched.has(m))return;watched.add(m);
   if(m.tagName==='IMG'){if(!m.hasAttribute('loading'))m.loading='lazy';m.decoding='async';}
   else{m.preload='none';m.setAttribute('loading','lazy');m.playsInline=true;if(observer)observer.observe(m);}
  });
 }
 function flush(){scheduled=false;var items=queue.splice(0,24);items.forEach(scan);if(queue.length)schedule();}
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(flush,32);}
 var obs=new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1)queue.push(n);});});if(queue.length)schedule();});
 function pause(){document.querySelectorAll('video,audio').forEach(function(v){v.pause();});}
 scan(document.body);obs.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('mm45:suspend',pause);
 document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
 window.addEventListener('pagehide',function(){obs.disconnect();if(observer)observer.disconnect();queue=[];window.removeEventListener('mm45:suspend',pause);},{once:true});
}

function mountProfile(){
 if($('mm44-profile-header'))return;
 var zone=document.querySelector('[data-mm36="public"]');if(!zone)return;
 forceLight();installMediaPolicy();H.dataset.mm44Page='profile';
 var header=node('header','mm44-profile-header');header.id='mm44-profile-header';
 header.append(button('Kembali ke Social Marney','back',function(){location.href='/beranda-trader.html';}));
 var profileBrand=brandImage();profileBrand.classList.add('mm417-profile-logo');profileBrand.width=30;profileBrand.height=30;header.append(profileBrand);
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
 forceLight();installMediaPolicy();H.dataset.mm44Page='social';H.dataset.mm44View='feed';
 function logged(){return $('shLogged')&&!$('shLogged').hidden;}
 function login(){location.href='/akun.html';}
 var pendingAction=null;
 function authState(){return H.dataset.mmAuthState||(logged()?'authenticated':'loading');}
 function requireSession(action){
  if(logged())return true;
  if(authState()==='guest')login();
  else{pendingAction=action;showMessage(authState()==='error'?'Sesi belum dapat dimuat. Tekan Coba lagi.':'Sesi sedang dimuat…');}
  return false;
 }
 function authChanged(){
  var state=authState();if(state!=='authenticated'&&state!=='guest')return;
  var action=pendingAction;pendingAction=null;if(action)action();
 }
 window.addEventListener('mm:auth-state',authChanged);
 var header=node('header','mm44-social-header');header.id='mm44-social-header';
 var row=node('div','mm44-headrow'),nav=node('nav','mm44-nav');nav.setAttribute('aria-label','Bagian Social Marney');
 var create=button('Buat postingan, Story atau Reels','plus',function(){menu.showModal();});row.append(create,wordmark());
 var notice=$('shNotificationWrap');if(notice){row.append(notice);var bell=notice.querySelector('#shNotificationBell');if(bell){controlIcon(bell,'notice');bell.setAttribute('aria-label','Notifikasi');}}
 var originalMessenger=$('shMessengerButton');if(originalMessenger){controlIcon(originalMessenger,'messages');}
 row.append(button('Menu Social Marney','menu',function(){menu.showModal();}));
 var messenger=$('shMessengerWrap');if(messenger)header.append(messenger);
 var tabs={};var current='feed';var pane=messenger?messenger.querySelector('#shMessengerPane'):null;var searchHolder=node('section','mm44-searchholder');searchHolder.id='mm44-searchholder';
 var oldSearch=document.querySelector('.sh-top-search');if(oldSearch){searchHolder.append(oldSearch);var input=searchHolder.querySelector('#shSearch');if(input){input.placeholder='Cari trader, postingan, atau grup';input.setAttribute('aria-label','Cari di Social Marney');}}
 var explore=node('section','mm44-explore');explore.id='mm44-explore';explore.append(searchHolder);
 var grid=node('div','mm44-explore-grid');grid.id='mm44-explore-grid';explore.append(grid);
 var hint=node('p','mm44-explore-note','Media dari linimasa yang sudah dimuat. Gunakan pencarian untuk menemukan trader atau grup.');explore.append(hint);app.parentNode.insertBefore(explore,app);
 function setView(view,historyChange){
  if(view==='feed')pendingAction=null;
  else if(!requireSession(function(){setView(view,historyChange);}))return;
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
 function openProfile(b){if(!requireSession(function(){openProfile(b);}))return;if(window.MarneyProfile49){window.MarneyProfile49.open(b);return;}var a=$('shPublicProfile');location.href=a&&safeLink(a.href)?a.href:'/akun.html?pengaturan=1';}
 [['feed','Linimasa','home'],['reels','Reels','reels'],['messages','Pesan','messages'],['explore','Jelajah','search'],['profile','Profil','profile']].forEach(function(t){
  var b=button(t[1],t[2],function(){if(t[0]==='profile')openProfile(b);else setView(t[0]);},'mm44-nav-button');
  b.append(node('span','',t[1]));b.setAttribute('aria-pressed',String(t[0]==='feed'));tabs[t[0]]=b;nav.append(b);
 });
 header.append(row,nav);document.body.insertBefore(header,explore);
 // Existing messenger owns sending, visibility, permissions and polling.
 if($('shMsgClose'))$('shMsgClose').addEventListener('click',function(){if(current==='messages'){current='feed';H.dataset.mm44View='feed';Object.keys(tabs).forEach(function(k){tabs[k].setAttribute('aria-pressed',String(k==='feed'));});}});
 if($('shMsgNewChat'))$('shMsgNewChat').addEventListener('click',function(e){e.preventDefault();setView('explore');});
 var menu=node('dialog','mm44-menu');menu.id='mm44-create-menu';menu.setAttribute('aria-label','Buat konten atau buka pengaturan');
 var mh=node('div','mm44-menu-head');mh.append(node('h2','','Social Marney'),button('Tutup menu','close',function(){menu.close();}));menu.append(mh);
 function action(label,k,fn){var b=button(label,k,function(){menu.close();fn();},'mm44-menu-action');b.append(node('span','',label));menu.append(b);return b;}
 action('Postingan foto / video','grid',function compose(){if(!requireSession(compose))return;setView('feed');H.dataset.mm44Compose='1';var form=$('shComposer');if(form)form.hidden=false;var box=document.querySelector('.sh-compose');if(box)box.scrollIntoView({block:'start',behavior:'smooth'});if($('shBody'))$('shBody').focus();});
 action('Buat Story','plus',function story(){if(!requireSession(story))return;setView('feed');if($('shStoryCreate')){$('shStoryCreate').showModal();if($('shStoryFile'))$('shStoryFile').click();}});
 action('Unggah Reel','reels',function reel(){if(!requireSession(reel))return;setView('reels');H.dataset.mm44ReelCompose='1';if($('shReelVideo'))$('shReelVideo').click();});
 action('Pengikut dan jaringan trader','profile',function account(){if(!requireSession(account))return;var trigger=$('shMobileAccountButton');if(trigger)trigger.click();}).dataset.mm420Account='1';
 action('Grup publik & privat','messages',function(){location.href='/grup-trader.html';});
 action('Jurnal Trading pribadi','list',function journal(){if(!requireSession(journal))return;location.href='/journal.html';}).dataset.mm420Journal='1';
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
 var pending=false,obs=new MutationObserver(function(records){
  var addedPost=records.some(function(r){return Array.from(r.addedNodes).some(function(n){return n.nodeType===1&&(n.matches('.sh-post:not([data-mm44-card])')||n.querySelector('.sh-post:not([data-mm44-card])'));});});
  if(!addedPost||pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate();});
 });if($('shFeed'))obs.observe($('shFeed'),{childList:true,subtree:true});decorate();
 if($('shQuickReel'))$('shQuickReel').addEventListener('click',function(){setView('reels');H.dataset.mm44ReelCompose='1';});
 function hashView(){var h=location.hash.replace('#mm44-','');if(['feed','reels','messages','explore'].includes(h))setView(h,false);else if(!location.hash)setView('feed',false);}
 window.addEventListener('popstate',hashView);
 window.addEventListener('pagehide',function(){obs.disconnect();pendingAction=null;window.removeEventListener('popstate',hashView);window.removeEventListener('mm:auth-state',authChanged);},{once:true});
 var routeObserver=null;
 function applyInitialRoute(){
  if(!logged())return false;
  if(new URL(location.href).searchParams.has('reel'))setView('reels',false);
  else if(location.hash.indexOf('#mm44-')===0)hashView();
  return true;
 }
 if((new URL(location.href).searchParams.has('reel')||location.hash.indexOf('#mm44-')===0)&&!applyInitialRoute()){
  routeObserver=new MutationObserver(function(){if(applyInitialRoute()){routeObserver.disconnect();routeObserver=null;}});
  if($('shLogged'))routeObserver.observe($('shLogged'),{attributes:true,attributeFilter:['hidden']});
 }
 window.addEventListener('pagehide',function(){if(routeObserver)routeObserver.disconnect();},{once:true});
}
var attempts=0;
function boot(){if(location.pathname==='/profil.html'){if(document.querySelector('[data-mm36="public"]'))mountProfile();else if(++attempts<30)setTimeout(boot,100);}else{if($('shApp'))mountSocial();else if(++attempts<30)setTimeout(boot,100);}}
boot();
})();

/* Marney Reels 4.6: app-only playback/UI enhancement. Existing server handlers remain owners of likes, comments, sharing and views. */
(function () {
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443')||location.pathname!=='/beranda-trader.html')return;
if(window.__mm46Reels)return;
var H=document.documentElement, feed=document.getElementById('shReelFeed'), panel=document.getElementById('shReelsPanel'), logged=document.getElementById('shLogged');
if(!feed||!panel||!logged)return;
window.__mm46Reels=true;
var reduce=matchMedia('(prefers-reduced-motion: reduce)'), conn=navigator.connection||{}, cards=[], states=new WeakMap(), active=null, suspended=!!window.__mm45Suspended, disposed=false, scheduled=false, muted=true;
var conservative=!!(conn.saveData||/^(slow-)?2g$/.test(conn.effectiveType||''));
try{conservative=conservative||localStorage.getItem('mm46-data-saver')==='1';}catch(ignore){}
var icons={back:'<path d="m14 5-7 7 7 7"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',plus:'<path d="M12 5v14M5 12h14"/>',play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M11 4 6 8H3v8h3l5 4zM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14"/>',mute:'<path d="M11 4 6 8H3v8h3l5 4zM16 9l6 6m0-6-6 6"/>',like:'<path d="M12 21 3.8 13a5.5 5.5 0 0 1 7.8-7.8l.4.5.4-.5a5.5 5.5 0 0 1 7.8 7.8z"/>',comment:'<path d="M5 3h14l3 4v9l-3 3h-7l-6 3v-3H5l-3-3V7zM7 8h10M7 12h6"/>',share:'<path d="M13 4 21 11 13 18v-4c-5 0-8 2-10 6 0-9 3-13 10-13z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',retry:'<path d="M20 7v5h-5M4 17v-5h5M19 11a7 7 0 0 0-12-5M5 13a7 7 0 0 0 12 5"/>'};
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function svg(key){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[key]+'</svg>';}
function button(name,key,fn,cls){var b=el('button',cls||'mm46-icon');b.type='button';b.setAttribute('aria-label',name);b.title=name;b.innerHTML=svg(key);b.addEventListener('click',fn);return b;}
function isReels(){return !disposed&&!logged.hidden&&H.dataset.mm44View==='reels';}
function blocked(){return suspended||document.hidden||!isReels()||!!document.querySelector('dialog[open]')||H.hasAttribute('data-mm44-reel-compose');}
function mayPlay(){return !blocked();}
function dimensions(){var vv=window.visualViewport,vh=Math.round(vv?vv.height:innerHeight),head=document.getElementById('mm44-social-header'),top=head?Math.ceil(head.getBoundingClientRect().height):0;H.style.setProperty('--mm47-vh',vh+'px');H.style.setProperty('--mm47-top',top+'px');H.style.setProperty('--mm46-height',Math.max(1,vh-top)+'px');}
var toolbar=el('header','mm46-toolbar');toolbar.id='mm46-toolbar';
var back=button('Kembali ke linimasa','back',function(){var b=document.querySelector('.mm44-nav-button[aria-label="Linimasa"]');if(b)b.click();});
var brand=el('div','mm46-brand'),brandMark=el('span','mm46-brand-mark mm417-brand-container'),brandImage=el('img','mm417-brand-image');brandImage.src='/__android417/brand/logo.png';brandImage.alt='MARNEY';brandImage.width=28;brandImage.height=28;brandImage.decoding='async';brandImage.loading='eager';brandMark.append(brandImage);brand.append(brandMark,el('strong','','Reels'),el('small','','KOMUNITAS'));
var add=button('Buat Reel','plus',function(){var b=document.querySelector('.mm44-headrow>button');if(b)b.click();});
var options=el('dialog','mm46-options');options.id='mm46-options';options.setAttribute('aria-label','Pengaturan Reels');
var heading=el('div','mm46-options-head');heading.append(el('h2','','Pengaturan Reels'),button('Tutup pengaturan','close',function(){options.close();}));options.append(heading);
var saverLabel=el('label','mm46-option');var saver=el('input');saver.type='checkbox';saver.checked=conservative;var saverCopy=el('span');saverCopy.append(el('strong','','Hemat data'),el('small','','Putar setelah diketuk; tanpa memuat video berikutnya.'));saverLabel.append(saverCopy,saver);options.append(saverLabel);
var fitLabel=el('label','mm46-option'),fit=el('select');fit.setAttribute('aria-label','Tampilan video');[['contain','Video utuh'],['cover','Isi layar']].forEach(function(a){var op=el('option','',a[1]);op.value=a[0];fit.append(op);});fitLabel.append(el('span','','Tampilan video'),fit);options.append(fitLabel,el('p','mm46-note','Video, komentar, dan angka penonton berasal dari Social Marney. Kualitas pemutaran juga bergantung pada file dan jaringan.'));
fit.addEventListener('change',function(){H.style.setProperty('--mm46-fit',fit.value==='cover'?'cover':'contain');});
saver.addEventListener('change',function(){conservative=saver.checked;try{localStorage.setItem('mm46-data-saver',conservative?'1':'0');}catch(ignore){}budget();});
var more=button('Pengaturan Reels','more',function(){pauseAll();options.showModal();});toolbar.append(back,brand,add,more);panel.prepend(toolbar);document.body.append(options);
var composerClose=button('Tutup unggah Reel','close',function(){delete H.dataset.mm44ReelCompose;refreshMode();},'mm46-composer-close');var form=document.getElementById('shReelForm');if(form)form.prepend(composerClose);
var originalStatus=document.getElementById('shReelStatus');
function attach(st,preload){if(!st)return;st.v.preload=preload;if(!st.v.hasAttribute('src')&&st.source){st.v.src=st.source;st.v.load();}st.v.dataset.mm46Attached='1';}
function release(st){if(!st)return;st.v.pause();clearTimeout(st.waitTimer);st.card.removeAttribute('data-mm46-loading');if(st.v.hasAttribute('src')){st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.v.removeAttribute('src');st.v.load();}delete st.v.dataset.mm46Attached;}
function pauseAll(){cards.forEach(function(c){var st=states.get(c);if(st&&!st.v.paused)st.v.pause();});}
function budget(){var i=cards.indexOf(active);cards.forEach(function(c,n){var st=states.get(c);if(!st)return;if(!isReels()||suspended||document.hidden){if(c===active)st.v.pause();else release(st);return;}if(n===i)attach(st,conservative?'none':'metadata');else if(!conservative&&!reduce.matches&&n===i+1)attach(st,'metadata');else release(st);});}
function start(st,user){if(!st||!mayPlay())return;if(!user&&(conservative||reduce.matches||st.userPaused))return;cards.forEach(function(c){var x=states.get(c);if(x&&x!==st)x.v.pause();});attach(st,'metadata');st.v.muted=muted;st.card.removeAttribute('data-mm46-error');st.v.play().then(function(){if(active!==st.card||!mayPlay())st.v.pause();else{st.userPaused=false;st.card.removeAttribute('data-mm46-blocked');}}).catch(function(){st.card.dataset.mm46Blocked='1';st.v.pause();});}
function activate(card){if(!card||!states.has(card)||!isReels())return;if(active===card){budget();return;}pauseAll();if(active)active.removeAttribute('data-mm46-active');active=card;card.dataset.mm46Active='1';var st=states.get(card);budget();start(st,false);}
function toggle(st){if(active!==st.card)activate(st.card);if(st.v.paused){st.userPaused=false;start(st,true);}else{st.userPaused=true;st.v.pause();}}
function sound(st){muted=!muted;cards.forEach(function(c){var s=states.get(c);if(s)s.v.muted=muted;});if(st.v.paused)start(st,true);}
function decorate(card){if(states.has(card))return;var v=card.querySelector('video.sh-reel-video');if(!v)return;
 var source=v.getAttribute('src')||'';if(!source)return;
 // HTTPS media only; no credentials or arbitrary executable URLs are accepted.
 try{var u=new URL(source,location.origin);if(u.protocol!=='https:'||u.username||u.password)return;}catch(e){return;}
 var st={card:card,v:v,source:source,position:0,userPaused:false,waitTimer:0};states.set(card,st);card.dataset.mm46Card='1';
 v.autoplay=false;v.controls=false;v.loop=true;v.playsInline=true;v.muted=muted;v.preload='none';v.setAttribute('playsinline','');
 var overlay=card.querySelector('.sh-reel-overlay'),stage=card.querySelector('.sh-reel-stage'),rail=card.querySelector('.sh-reel-rail');
 var center=el('span','mm46-play-state');center.innerHTML=svg('play');center.setAttribute('aria-hidden','true');if(stage)stage.append(center);
 var loading=el('span','mm46-loading','Memuat video…');loading.setAttribute('role','status');if(stage)stage.append(loading);
 var retry=button('Coba putar ulang video','retry',function(e){e.stopPropagation();st.userPaused=false;v.load();start(st,true);},'mm46-retry');retry.append(el('span','','Video belum tersedia. Coba lagi'));if(stage)stage.append(retry);
 var seeker=el('input','mm46-seek');seeker.type='range';seeker.min='0';seeker.max='1000';seeker.step='1';seeker.value='0';seeker.disabled=true;seeker.setAttribute('aria-label','Posisi video');seeker.addEventListener('input',function(){if(Number.isFinite(v.duration)&&v.duration>0)v.currentTime=Number(seeker.value)*v.duration/1000;});card.append(seeker);
 if(overlay){overlay.setAttribute('aria-label','Putar atau jeda Reel');overlay.addEventListener('click',function(e){if(e.target.closest('button,a,input'))return;e.preventDefault();e.stopImmediatePropagation();toggle(st);},true);overlay.addEventListener('keydown',function(e){if(e.target!==overlay)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();toggle(st);}},true);}
 v.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();toggle(st);},true);
 var cap=card.querySelector('.sh-reel-caption');if(cap&&cap.textContent.length>90){var expand=el('button','mm46-caption-toggle','Selengkapnya');expand.type='button';expand.setAttribute('aria-expanded','false');expand.addEventListener('click',function(e){e.stopPropagation();var open=expand.getAttribute('aria-expanded')!=='true';expand.setAttribute('aria-expanded',String(open));cap.classList.toggle('mm46-expanded',open);expand.textContent=open?'Ringkas':'Selengkapnya';});cap.after(expand);}
 if(rail){Array.from(rail.querySelectorAll('button')).forEach(function(b){var small=b.querySelector('small'),label=small?small.textContent.trim():'';var key={'Suka':'like','Komentar':'comment','Bagikan':'share','Suara':'sound'}[label];if(!key)return;b.dataset.mm46Action=key;b.setAttribute('aria-label',label==='Suara'?'Aktifkan suara':label+' Reel');var span=b.querySelector('.sh-reel-rail-icon');if(span){span.style.setProperty('--mm46-mask','url("data:image/svg+xml,'+encodeURIComponent(svg(key))+'")');}
 if(key==='sound'){b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();sound(st);},true);st.soundButton=b;}
 });}
 var count=card.querySelector('.sh-reel-views'),bottom=card.querySelector('.sh-reel-bottom');if(count&&bottom)bottom.append(count);
 function soundUI(){if(!st.soundButton)return;st.soundButton.setAttribute('aria-label',v.muted?'Aktifkan suara':'Matikan suara');st.soundButton.setAttribute('aria-pressed',String(!v.muted));var span=st.soundButton.querySelector('.sh-reel-rail-icon');if(span)span.style.setProperty('--mm46-mask','url("data:image/svg+xml,'+encodeURIComponent(svg(v.muted?'mute':'sound'))+'")');var strong=st.soundButton.querySelector('strong');if(strong)strong.textContent=v.muted?'Off':'On';}
 v.addEventListener('volumechange',soundUI);soundUI();
 v.addEventListener('play',function(){if(active!==card||!mayPlay()){v.pause();return;}card.dataset.mm46Playing='1';card.removeAttribute('data-mm46-blocked');});
 v.addEventListener('playing',function(){clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');card.dataset.mm46Playing='1';});
 v.addEventListener('pause',function(){card.removeAttribute('data-mm46-playing');clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');});
 v.addEventListener('waiting',function(){clearTimeout(st.waitTimer);st.waitTimer=setTimeout(function(){if(active===card&&!v.paused&&!blocked())card.dataset.mm46Loading='1';},240);});
 v.addEventListener('loadedmetadata',function(){if(st.position>0&&Number.isFinite(v.duration)){v.currentTime=Math.min(st.position,Math.max(0,v.duration-.1));st.position=0;}seeker.disabled=!(v.duration>0&&Number.isFinite(v.duration));});
 v.addEventListener('timeupdate',function(){if(active!==card||!Number.isFinite(v.duration)||v.duration<=0)return;seeker.value=String(Math.round(1000*v.currentTime/v.duration));seeker.setAttribute('aria-valuetext',Math.floor(v.currentTime)+' dari '+Math.floor(v.duration)+' detik');});
 v.addEventListener('error',function(){if(v.hasAttribute('src')){card.dataset.mm46Error='1';clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');}});
 release(st);if(intersection)intersection.observe(card);
}
var intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(function(entries){if(!isReels()||suspended)return;var best=null;entries.forEach(function(e){if(e.isIntersecting&&e.intersectionRatio>.65&&(!best||e.intersectionRatio>best.intersectionRatio))best=e;});if(best)activate(best.target);},{root:feed,threshold:[0,.2,.65,.85,1]}):null;
function refreshCards(){scheduled=false;var next=Array.from(feed.querySelectorAll('.sh-reel-card'));cards.forEach(function(c){if(!next.includes(c)){release(states.get(c));if(intersection)intersection.unobserve(c);if(active===c)active=null;}});cards=next;cards.forEach(decorate);if(!cards.length)active=null;if(isReels()&&!active&&cards.length)activate(cards[Math.min(cards.length-1,Math.max(0,Math.round(feed.scrollTop/(feed.clientHeight||1))))]);budget();}
var feedObserver=new MutationObserver(function(records){if(scheduled)return;if(records.some(function(r){return Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(function(n){return n.nodeType===1&&(n.matches('.sh-reel-card')||n.querySelector('.sh-reel-card'));});})){scheduled=true;requestAnimationFrame(refreshCards);}});feedObserver.observe(feed,{childList:true,subtree:true});
function refreshMode(){var on=isReels();H.toggleAttribute('data-mm46-reels',on);dimensions();if(on){panel.open=true;refreshCards();if(active&&!blocked())start(states.get(active),false);}else{pauseAll();cards.forEach(function(c){release(states.get(c));});} }
var modeObserver=new MutationObserver(refreshMode);modeObserver.observe(H,{attributes:true,attributeFilter:['data-mm44-view','data-mm44-reel-compose']});modeObserver.observe(logged,{attributes:true,attributeFilter:['hidden']});
var dialogObserver=new MutationObserver(function(){if(blocked())pauseAll();else if(active)start(states.get(active),false);});document.querySelectorAll('dialog').forEach(function(d){dialogObserver.observe(d,{attributes:true,attributeFilter:['open']});});
function onSuspend(){suspended=true;pauseAll();budget();}
function onResume(){suspended=false;refreshMode();}
function visibility(){if(document.hidden)onSuspend();else if(!window.__mm45Suspended)onResume();}
function keys(e){if(!isReels()||blocked()||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var step=e.key==='ArrowDown'?1:-1;feed.scrollBy({top:step*feed.clientHeight,behavior:reduce.matches?'auto':'smooth'});}}
var scrollTimer=0;function scrollFallback(){if(intersection)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){if(cards.length)activate(cards[Math.max(0,Math.min(cards.length-1,Math.round(feed.scrollTop/feed.clientHeight)))]);},80);}
feed.addEventListener('scroll',scrollFallback,{passive:true});window.addEventListener('mm45:suspend',onSuspend);window.addEventListener('mm45:resume',onResume);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keys);window.addEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.addEventListener('resize',dimensions);
function destroy(){disposed=true;pauseAll();cards.forEach(function(c){release(states.get(c));});feedObserver.disconnect();modeObserver.disconnect();dialogObserver.disconnect();if(intersection)intersection.disconnect();clearTimeout(scrollTimer);window.removeEventListener('mm45:suspend',onSuspend);window.removeEventListener('mm45:resume',onResume);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);window.removeEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.removeEventListener('resize',dimensions);}
window.addEventListener('pagehide',destroy,{once:true});refreshCards();refreshMode();
})();

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
 var row=node('div','mm44-headrow'),brand=node('a','mm44-wordmark mm417-wordmark');brand.href='/beranda-trader.html';brand.setAttribute('aria-label','Social Marney — beranda komunitas');var brandImage=node('img','mm417-brand-image');brandImage.src='/__android417/brand/logo.png';brandImage.alt='MARNEY';brandImage.width=36;brandImage.height=36;brandImage.decoding='async';brandImage.loading='eager';brand.append(brandImage,node('span','mm417-brand-section','Social Marney'));row.append(brand);
 var nav=node('nav','mm44-nav');nav.setAttribute('aria-label','Bagian Social Marney');
 [['Linimasa','home','/beranda-trader.html'],['Reels','reels','/beranda-trader.html#mm44-reels'],['Pesan','messages','/beranda-trader.html#mm44-messages'],['Jelajah','search','/beranda-trader.html#mm44-explore'],['Profil','profile','/akun.html?pengaturan=1']].forEach(function(a){
  var link=node('a','mm44-nav-button');link.href=a[2];link.setAttribute('aria-label',a[0]);link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[a[1]]+'</svg>';link.append(node('span','',a[0]));if(a[0]==='Pesan'){link.setAttribute('aria-current','page');link.setAttribute('aria-pressed','true');}if(a[0]==='Profil')link.addEventListener('click',function(e){if(window.MarneyProfile49){e.preventDefault();window.MarneyProfile49.open(link);}});nav.append(link);
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

window.__mm411BundledReady=true;
