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
function dimensions(){var vv=window.visualViewport;H.style.setProperty('--mm46-height',Math.round(vv?vv.height:innerHeight)+'px');}
var toolbar=el('header','mm46-toolbar');toolbar.id='mm46-toolbar';
var back=button('Kembali ke linimasa','back',function(){var b=document.querySelector('.mm44-nav-button[aria-label="Linimasa"]');if(b)b.click();});
var brand=el('div','mm46-brand');brand.append(el('span','mm46-brand-mark','M'),el('strong','','Reels'),el('small','','KOMUNITAS'));
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
