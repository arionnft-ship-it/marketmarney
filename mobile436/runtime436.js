/* MarketMarney 4.36 — Android runtime state bridge and non-destructive media recovery. */
(function installMMRuntime436(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(window.MMRuntime436)return;
var H=document.documentElement,disposed=false,observer=null,scanQueued=false,bannerTimer=0;
var state={online:navigator.onLine!==false,validated:true,metered:false,downKbps:0,powerSave:false};
var previousUsable=state.online&&state.validated;

function banner(){
 var node=document.getElementById('mm436-runtime');
 if(node||!document.body)return node;
 node=document.createElement('div');node.id='mm436-runtime';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.hidden=true;
 document.body.appendChild(node);return node;
}
function hideBanner(delay){
 clearTimeout(bannerTimer);bannerTimer=setTimeout(function(){var node=banner();if(node)node.hidden=true;},delay||0);
}
function showBanner(message,kind,hold){
 var node=banner();if(!node)return;clearTimeout(bannerTimer);node.textContent=message;node.dataset.kind=kind||'info';node.hidden=false;
 if(hold>0)hideBanner(hold);
}
function setFlag(name,value){if(value)H.setAttribute(name,'');else H.removeAttribute(name);}
function apply(detail){
 detail=detail||{};
 var wasUsable=state.online&&state.validated;
 if(Object.prototype.hasOwnProperty.call(detail,'online'))state.online=!!detail.online;
 if(Object.prototype.hasOwnProperty.call(detail,'validated'))state.validated=!!detail.validated;
 if(Object.prototype.hasOwnProperty.call(detail,'metered'))state.metered=!!detail.metered;
 if(Object.prototype.hasOwnProperty.call(detail,'downKbps'))state.downKbps=Math.max(0,Number(detail.downKbps)||0);
 if(Object.prototype.hasOwnProperty.call(detail,'powerSave'))state.powerSave=!!detail.powerSave;
 setFlag('data-mm436-offline',!state.online);
 setFlag('data-mm436-unvalidated',state.online&&!state.validated);
 setFlag('data-mm436-metered',state.metered);
 setFlag('data-mm436-power',state.powerSave);
 var usable=state.online&&state.validated;
 if(!state.online)showBanner('Tidak ada koneksi. Konten akan dilanjutkan saat internet kembali.','offline',0);
 else if(!state.validated)showBanner('Jaringan tersambung, tetapi internet belum siap.','warning',0);
 else if(!wasUsable||!previousUsable)showBanner('Koneksi kembali.','online',1400);
 else hideBanner(0);
 previousUsable=usable;
}
function runtime(event){window.__mm436NativeNetwork=true;apply(event&&event.detail||{});}
function browserNetwork(){var online=navigator.onLine!==false;if(window.__mm436NativeNetwork)apply({online:online});else apply({online:online,validated:online});}
function power(event){var detail=event&&event.detail||{};apply({powerSave:!!detail.saving});}
function pauseBackground(){
 document.querySelectorAll('video,audio').forEach(function(media){
  var card=media.closest&&media.closest('.sh-reel-card');
  if(document.hidden||window.__mm45Suspended||!card||!card.hasAttribute('data-mm46-active'))try{media.pause();}catch(ignore){}
 });
}
function watchVideo(video){
 if(!video||video.dataset.mm436Watch==='1')return;
 video.dataset.mm436Watch='1';var timer=0,card=video.closest?video.closest('.sh-reel-card'):null;
 function clear(){clearTimeout(timer);timer=0;if(card){card.removeAttribute('data-mm436-stalled');card.removeAttribute('data-mm436-media-error');}}
 function waiting(){
  clearTimeout(timer);timer=setTimeout(function(){if(card&&card.hasAttribute('data-mm46-active')&&!video.paused)card.dataset.mm436Stalled='1';},1200);
 }
 video.addEventListener('waiting',waiting,{passive:true});
 video.addEventListener('stalled',waiting,{passive:true});
 video.addEventListener('playing',clear,{passive:true});
 video.addEventListener('canplay',clear,{passive:true});
 video.addEventListener('timeupdate',clear,{passive:true});
 video.addEventListener('error',function(){clearTimeout(timer);if(card)card.dataset.mm436MediaError='1';},{passive:true});
}
function scan(root){
 if(disposed||!root)return;
 if(root.matches&&root.matches('video.sh-reel-video'))watchVideo(root);
 if(root.querySelectorAll)root.querySelectorAll('video.sh-reel-video:not([data-mm436-watch])').forEach(watchVideo);
}
function queueScan(root){
 if(scanQueued||disposed)return;scanQueued=true;
 var run=function(){scanQueued=false;scan(root||document);};
 if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:350});else setTimeout(run,40);
}
function start(){
 if(disposed||!document.body)return;banner();scan(document);apply(state);
 var root=document.getElementById('shReelFeed')||document.querySelector('main')||document.body;
 if(typeof MutationObserver==='function'){
  observer=new MutationObserver(function(records){records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1)queueScan(node);});});});
  observer.observe(root,{childList:true,subtree:true});
 }
}
function destroy(){
 disposed=true;clearTimeout(bannerTimer);if(observer)observer.disconnect();
 window.removeEventListener('mmapp:runtime',runtime);window.removeEventListener('mmapp:network',runtime);window.removeEventListener('mmapp:power',power);
 window.removeEventListener('online',browserNetwork);window.removeEventListener('offline',browserNetwork);
 window.removeEventListener('mmapp:background',pauseBackground);document.removeEventListener('visibilitychange',pauseBackground);
}
window.addEventListener('mmapp:runtime',runtime);window.addEventListener('mmapp:network',runtime);window.addEventListener('mmapp:power',power);
window.addEventListener('online',browserNetwork);window.addEventListener('offline',browserNetwork);
window.addEventListener('mmapp:background',pauseBackground);document.addEventListener('visibilitychange',pauseBackground);
window.addEventListener('pagehide',destroy,{once:true});
window.MMRuntime436={version:'4.36',state:function(){return Object.assign({},state);},apply:apply,scan:function(){queueScan(document);}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
