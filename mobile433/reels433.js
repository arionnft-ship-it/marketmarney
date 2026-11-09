/* MarketMarney 4.33 — small Reels layout/stability patch. */
(function install433Reels(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443')||location.pathname!=='/beranda-trader.html')return;
if(window.__mm433Reels)return;
window.__mm433Reels=true;
var H=document.documentElement,disposed=false,frame=0,feedObserver=null,modeObserver=null,bound=new WeakSet();
function active(){return H.hasAttribute('data-mm46-reels')&&H.dataset.mm44View==='reels';}
function visibleIcons(){
 var toolbar=document.getElementById('mm46-toolbar');
 if(!toolbar)return;
 toolbar.querySelectorAll('.mm46-icon svg').forEach(function(svg){
  svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.style.opacity='1';svg.style.display='block';
 });
 var logo=toolbar.querySelector('.mm417-brand-image');if(logo){logo.alt='MarketMarney';logo.decoding='async';}
}
function clearLoading(card){if(card)card.removeAttribute('data-mm46-loading');}
function bindCard(card){
 if(!card||bound.has(card))return;
 var video=card.querySelector('video.sh-reel-video');if(!video)return;
 bound.add(card);
 ['loadeddata','canplay','canplaythrough','playing','timeupdate','pause','ended'].forEach(function(type){
  video.addEventListener(type,function(){clearLoading(card);},{passive:true});
 });
 video.addEventListener('error',function(){clearLoading(card);},{passive:true});
}
function bindCards(){document.querySelectorAll('#shReelFeed .sh-reel-card').forEach(bindCard);}
function sync(){
 frame=0;if(disposed)return;
 var on=active();
 if(on){
  H.dataset.mm433Reels='clean';
  visibleIcons();bindCards();
  requestAnimationFrame(function(){if(!disposed)window.dispatchEvent(new Event('resize'));});
 }else{
  delete H.dataset.mm433Reels;
 }
}
function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(sync);}
modeObserver=new MutationObserver(schedule);
modeObserver.observe(H,{attributes:true,attributeFilter:['data-mm44-view','data-mm46-reels']});
var feed=document.getElementById('shReelFeed');
if(feed){feedObserver=new MutationObserver(function(records){
 if(records.some(function(record){return record.addedNodes.length>0;}))requestAnimationFrame(bindCards);
});feedObserver.observe(feed,{childList:true,subtree:true});}
window.addEventListener('mm45:resume',schedule);
window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('pagehide',function(){disposed=true;if(frame)cancelAnimationFrame(frame);if(modeObserver)modeObserver.disconnect();if(feedObserver)feedObserver.disconnect();window.removeEventListener('mm45:resume',schedule);window.removeEventListener('resize',schedule);},{once:true});
sync();
})();
