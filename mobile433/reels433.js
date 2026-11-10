/* MarketMarney 4.33 — repair Reels navigation, toolbar visibility and slow-loading recovery. */
/* Legacy regression marker: the previous recovery limit was 8000 ms; 4.34 patches the executable limit to 5000 ms. */
(function install433Reels(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443')||location.pathname!=='/beranda-trader.html')return;
if(window.__mm433ReelsFix)return;
window.__mm433ReelsFix=true;
var H=document.documentElement,attempt=0,videoTimers=new WeakMap(),bodyObserver=null,modeObserver=null;

function isReels(){return H.hasAttribute('data-mm46-reels')||H.dataset.mm44View==='reels';}
function replaceControl(old,label,handler){
 if(!old)return null;
 var fresh=old.cloneNode(true);
 fresh.setAttribute('aria-label',label);
 fresh.title=label;
 fresh.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();handler(event);});
 old.replaceWith(fresh);
 return fresh;
}
function openMedia(){
 var media=document.querySelector('.mm44-nav-button[aria-label="Media"],.mm44-nav-button[aria-label="Linimasa"]');
 if(media){media.click();return;}
 location.hash='mm44-feed';
 H.dataset.mm44View='feed';
}
function openGallery(){
 var input=document.getElementById('shReelVideo');
 if(input){
  H.dataset.mm44ReelCompose='1';
  input.setAttribute('accept','video/*');
  input.click();
  return;
 }
 var menu=document.getElementById('mm44-create-menu');
 if(menu&&typeof menu.showModal==='function'&&!menu.open)menu.showModal();
}
function installToolbar(){
 var toolbar=document.getElementById('mm46-toolbar');
 if(!toolbar){if(++attempt<60)setTimeout(installToolbar,100);return;}
 if(toolbar.dataset.mm433Ready==='1')return;
 var back=toolbar.querySelector('[aria-label="Kembali ke linimasa"],[aria-label="Kembali ke Media"]');
 var add=toolbar.querySelector('[aria-label="Buat Reel"],[aria-label="Unggah Reel"]');
 replaceControl(back,'Kembali ke Media',openMedia);
 replaceControl(add,'Unggah Reel',openGallery);
 var brand=toolbar.querySelector('.mm46-brand');
 if(brand)brand.setAttribute('aria-label','MarketMarney Reels');
 var image=toolbar.querySelector('.mm417-brand-image');
 if(image){image.alt='MarketMarney';image.setAttribute('aria-label','Logo MarketMarney');}
 toolbar.dataset.mm433Ready='1';
 H.dataset.mm433Reels='433';
 scan(document);
 syncMode();
}
function clearVideoTimer(video){
 var timer=videoTimers.get(video);
 if(timer){clearTimeout(timer);videoTimers.delete(video);}
}
function watchVideo(video){
 if(!video||video.dataset.mm433Watched==='1')return;
 video.dataset.mm433Watched='1';
 function clear(){clearVideoTimer(video);var card=video.closest('.sh-reel-card');if(card)card.removeAttribute('data-mm433-slow');}
 function waiting(){
  clearVideoTimer(video);
  var timer=setTimeout(function(){
   videoTimers.delete(video);
   var card=video.closest('.sh-reel-card');
   if(!card||!isReels()||video.paused||video.readyState>=3)return;
   card.dataset.mm433Slow='1';
   card.dataset.mm46Error='1';
   card.removeAttribute('data-mm46-loading');
  },8000);
  videoTimers.set(video,timer);
 }
 video.addEventListener('waiting',waiting,{passive:true});
 video.addEventListener('stalled',waiting,{passive:true});
 ['playing','canplay','loadeddata','pause','error','emptied'].forEach(function(name){video.addEventListener(name,clear,{passive:true});});
}
function scan(root){
 if(!root)return;
 if(root.matches&&root.matches('video.sh-reel-video'))watchVideo(root);
 if(root.querySelectorAll)root.querySelectorAll('video.sh-reel-video').forEach(watchVideo);
}
function syncMode(){
 var on=isReels(),header=document.getElementById('mm44-social-header');
 H.toggleAttribute('data-mm433-reels',on);
 if(header){
  header.setAttribute('aria-hidden',on?'true':'false');
  if(on)header.setAttribute('inert','');else header.removeAttribute('inert');
 }
 if(on){
  var toolbar=document.getElementById('mm46-toolbar');
  if(toolbar)toolbar.removeAttribute('aria-hidden');
  scan(document);
  requestAnimationFrame(function(){window.dispatchEvent(new Event('resize'));});
 }
}
function start(){
 installToolbar();
 syncMode();
 modeObserver=new MutationObserver(syncMode);
 modeObserver.observe(H,{attributes:true,attributeFilter:['data-mm44-view','data-mm46-reels']});
 bodyObserver=new MutationObserver(function(records){
  records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1)scan(node);});});
 });
 if(document.body)bodyObserver.observe(document.body,{childList:true,subtree:true});
}
function cleanup(){
 if(modeObserver)modeObserver.disconnect();
 if(bodyObserver)bodyObserver.disconnect();
 document.querySelectorAll('video.sh-reel-video').forEach(clearVideoTimer);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pagehide',cleanup,{once:true});
})();
