(function(){
'use strict';
if(window.MMInstant439)return;
var H=document.documentElement,warmed=new Set(),observer=null,warmTimer=0,pressed=null,pressTimer=0,destroyed=false;
function originOf(value){try{var url=new URL(value,location.href);return /^https?:$/.test(url.protocol)?url.origin:'';}catch(ignore){return '';}}
function addHint(origin){
  if(!origin||origin===location.origin||warmed.has(origin)||warmed.size>=3)return;
  warmed.add(origin);
  var pre=document.createElement('link');pre.rel='preconnect';pre.href=origin;pre.crossOrigin='anonymous';pre.dataset.mm439Hint='1';
  var dns=document.createElement('link');dns.rel='dns-prefetch';dns.href=origin;dns.dataset.mm439Hint='1';
  (document.head||document.documentElement).append(pre,dns);
}
function warmOrigins(){
  warmTimer=0;if(destroyed||document.hidden)return;
  var videos=Array.prototype.slice.call(document.querySelectorAll('.sh-reel-card[data-mm46-active] video,.sh-reel-card[data-mm46-active]+.sh-reel-card video,#shReelFeed video')).slice(0,5);
  videos.forEach(function(video){
    addHint(originOf(video.currentSrc||video.getAttribute('src')||''));
    var source=video.querySelector('source[src]');if(source)addHint(originOf(source.getAttribute('src')));
    video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
    video.setAttribute('disablepictureinpicture','');video.setAttribute('controlslist','nodownload noplaybackrate');
  });
}
function scheduleWarm(){
  if(destroyed||warmTimer)return;
  var run=function(){warmTimer=0;warmOrigins();};
  if('requestIdleCallback' in window)warmTimer=requestIdleCallback(run,{timeout:900});
  else warmTimer=setTimeout(run,180);
}
function cancelWarm(){
  if(!warmTimer)return;
  if('cancelIdleCallback' in window)try{cancelIdleCallback(warmTimer);}catch(ignore){clearTimeout(warmTimer);}else clearTimeout(warmTimer);
  warmTimer=0;
}
function clearPress(){
  clearTimeout(pressTimer);pressTimer=0;
  if(pressed){pressed.removeAttribute('data-mm439-pressed');pressed=null;}
}
function onPointerDown(event){
  var target=event.target&&event.target.closest?event.target.closest('button,a,[role="button"],.mm44-nav,.sh-reel-rail-btn'):null;
  if(!target)return;clearPress();pressed=target;target.dataset.mm439Pressed='1';pressTimer=setTimeout(clearPress,180);
}
function onVisibility(){if(document.hidden)cancelWarm();else scheduleWarm();}
function start(){
  if(destroyed)return;H.dataset.mm439Instant='1';
  document.addEventListener('pointerdown',onPointerDown,{passive:true});
  document.addEventListener('pointerup',clearPress,{passive:true});
  document.addEventListener('pointercancel',clearPress,{passive:true});
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('hashchange',scheduleWarm,{passive:true});
  window.addEventListener('pageshow',scheduleWarm,{passive:true});
  var root=document.getElementById('shReelFeed')||document.body;
  if(root&&'MutationObserver' in window){observer=new MutationObserver(scheduleWarm);observer.observe(root,{childList:true,subtree:true});}
  scheduleWarm();
}
function destroy(){
  destroyed=true;cancelWarm();clearPress();if(observer)observer.disconnect();observer=null;
  document.removeEventListener('pointerdown',onPointerDown);document.removeEventListener('pointerup',clearPress);document.removeEventListener('pointercancel',clearPress);document.removeEventListener('visibilitychange',onVisibility);
  window.removeEventListener('hashchange',scheduleWarm);window.removeEventListener('pageshow',scheduleWarm);
  document.querySelectorAll('link[data-mm439-hint]').forEach(function(link){link.remove();});
  H.removeAttribute('data-mm439-instant');H.removeAttribute('data-mm439-buffer-starved');
}
window.MMInstant439={warm:scheduleWarm,destroy:destroy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
