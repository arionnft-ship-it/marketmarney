(function(){
'use strict';
// XAUWAR beta status label only. No effect on data, rendering, animations, or controls.
const MARK='mm-xauwar-beta-tag',TEXT='BETA';
function append(target,scope){
 if(!target||target.querySelector('.'+MARK))return;
 const badge=document.createElement('span');
 badge.className=MARK+' mm-xauwar-beta-'+scope;
 badge.textContent=TEXT;
 badge.title='XAUWAR masih dalam tahap pengujian';
 target.append(badge);
}
function nav(){
 const btn=document.getElementById('mm-xau-war-link');
 if(!btn)return;
 append(btn,'nav');
}
function arena(){
 if(location.pathname!=='/assets/xau-war-3d.html')return;
 const heading=[...document.querySelectorAll('h1')].find(el=>/^WarXAU(?:\s|$)/i.test(el.textContent.trim()));
 if(heading)append(heading,'title');
}
function start(){
 nav();arena();
 const container=document.getElementById('nav');
 if(container){
  let pending=false;
  new MutationObserver(records=>{
   if(pending||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='mm-xau-war-link'||n.querySelector?.('#mm-xau-war-link')))))return;
   pending=true;requestAnimationFrame(()=>{pending=false;nav();});
  }).observe(container,{childList:true,subtree:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
