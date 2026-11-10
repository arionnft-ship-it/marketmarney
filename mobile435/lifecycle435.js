/* MarketMarney 4.35 — app-only lifecycle, memory and media optimization. */
(function installMMPerformance435(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(window.MMPerformance435)return;
var H=document.documentElement,observer=null,disposed=false,pressure=0,scanQueued=false;
var social=/^\/(beranda-trader|profil|grup-trader)\.html$/.test(location.pathname);

function reelActive(video){
 var card=video&&video.closest?video.closest('.sh-reel-card'):null;
 return !!(card&&card.hasAttribute('data-mm46-active'));
}
function pauseBackgroundMedia(){
 document.querySelectorAll('video,audio').forEach(function(media){
  if(document.hidden||window.__mm45Suspended||!reelActive(media)){
   try{media.pause();}catch(ignore){}
  }
 });
}
function releaseInactiveReels(level){
 if(level<10)return;
 document.querySelectorAll('.sh-reel-card:not([data-mm46-active]) video.sh-reel-video').forEach(function(video){
  try{video.pause();}catch(ignore){}
  if(level>=40&&video.hasAttribute('src')){
   video.dataset.mm435Source=video.getAttribute('src')||'';
   video.removeAttribute('src');
   delete video.dataset.mm46Attached;
   try{video.load();}catch(ignore){}
  }
 });
}
function markFrame(video){
 if(!video||video.dataset.mm435FrameWatch==='1')return;
 video.dataset.mm435FrameWatch='1';
 function ready(){
  var card=video.closest?video.closest('.sh-reel-card'):null;
  if(card)card.dataset.mm435Frame='1';
 }
 video.addEventListener('playing',function(){
  if(typeof video.requestVideoFrameCallback==='function')video.requestVideoFrameCallback(ready);else ready();
 },{passive:true});
}
function tuneImage(image,index){
 if(!image||image.dataset.mm435Image==='1')return;
 image.dataset.mm435Image='1';
 image.decoding='async';
 var protectedImage=image.closest&&image.closest('header,nav,.mm46-toolbar,.mm44-social-header,.sh-story,.sh-avatar,.avatar,.brand,.logo');
 if(!protectedImage&&index>5){image.loading='lazy';image.dataset.mm435Lazy='1';}
 else if(!image.hasAttribute('fetchpriority'))image.setAttribute('fetchpriority','auto');
}
function scan(root){
 if(!root||disposed)return;
 var images=[];
 if(root.matches&&root.matches('img'))images=[root];
 else if(root.querySelectorAll)images=Array.from(root.querySelectorAll('img:not([data-mm435-image])'));
 images.forEach(tuneImage);
 if(root.matches&&root.matches('video.sh-reel-video'))markFrame(root);
 if(root.querySelectorAll)root.querySelectorAll('video.sh-reel-video:not([data-mm435-frame-watch])').forEach(markFrame);
}
function queueScan(root){
 if(scanQueued||disposed)return;
 scanQueued=true;
 var run=function(){scanQueued=false;scan(root||document);};
 if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:500});else setTimeout(run,60);
}
function memory(event){
 var value=event&&event.detail&&Number(event.detail.level);
 pressure=Number.isFinite(value)?value:0;
 if(pressure>=40)H.dataset.mm435Pressure='high';
 else if(pressure>=10)H.dataset.mm435Pressure='low';
 else H.removeAttribute('data-mm435-pressure');
 releaseInactiveReels(pressure);
 if(pressure>=20)pauseBackgroundMedia();
}
function background(){pauseBackgroundMedia();releaseInactiveReels(20);}
function foreground(){
 H.removeAttribute('data-mm435-pressure');pressure=0;queueScan(document);
}
function online(){H.removeAttribute('data-mm435-offline');window.dispatchEvent(new Event('mm435:network'));}
function offline(){H.dataset.mm435Offline='1';pauseBackgroundMedia();window.dispatchEvent(new Event('mm435:network'));}
function visibility(){if(document.hidden)background();else foreground();}
function start(){
 if(disposed||!document.body)return;
 scan(document);
 var root=social?(document.getElementById('shReelFeed')||document.querySelector('main')||document.body):document.querySelector('main');
 if(root&&typeof MutationObserver==='function'){
  observer=new MutationObserver(function(records){
   records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1)queueScan(node);});});
  });
  observer.observe(root,{childList:true,subtree:true});
 }
 if(navigator.onLine===false)H.dataset.mm435Offline='1';
}
function destroy(){
 disposed=true;if(observer)observer.disconnect();
 window.removeEventListener('mmapp:memory',memory);
 window.removeEventListener('mmapp:background',background);
 window.removeEventListener('mmapp:foreground',foreground);
 window.removeEventListener('online',online);
 window.removeEventListener('offline',offline);
 document.removeEventListener('visibilitychange',visibility);
}
window.addEventListener('mmapp:memory',memory);
window.addEventListener('mmapp:background',background);
window.addEventListener('mmapp:foreground',foreground);
window.addEventListener('online',online);
window.addEventListener('offline',offline);
document.addEventListener('visibilitychange',visibility);
window.addEventListener('pagehide',destroy,{once:true});
window.MMPerformance435={version:'4.35',trim:function(level){memory({detail:{level:Number(level)||0}});},scan:function(){queueScan(document);}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
