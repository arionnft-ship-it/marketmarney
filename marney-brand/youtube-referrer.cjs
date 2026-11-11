'use strict';
// MarketMarney TV: give embedded YouTube players a valid referring website.
// Response-only adjustment; never changes stored videos, accounts, or media.
const VERSION='mm-youtube-referrer-20261111-v1';
const POLICY='strict-origin-when-cross-origin';
const ASSET='/assets/mm-youtube-referrer-v1.js';

function isVideoHostPage(pathname){
 return pathname==='/' || pathname==='/index.html';
}
function browserClient(){
 'use strict';
 if(location.hostname!=='marketmarney.com'&&location.hostname!=='www.marketmarney.com')return;
 const policy='strict-origin-when-cross-origin';
 const allowed=new Set(['www.youtube.com','youtube.com','www.youtube-nocookie.com','youtube-nocookie.com']);
 const touched=new WeakMap();
 function youtubeUrl(value){
  let u;try{u=new URL(value,location.href);}catch{return null;}
  if(u.protocol!=='https:'||!allowed.has(u.hostname))return null;
  if(!/^\/(?:embed|shorts|watch)(?:\/|$)/.test(u.pathname))return null;
  const parts=u.pathname.split('/').filter(Boolean);
  const id=parts[0]==='watch'?u.searchParams.get('v'):parts[1];
  if(!/^[a-zA-Z0-9_-]{11}$/.test(id||''))return null;
  if(parts[0]!=='embed'){
   u.pathname='/embed/'+id;
   u.searchParams.delete('v');
  }
  // origin is used by IFrame Player API, but the Referer header remains required.
  if(u.searchParams.get('enablejsapi')==='1'&&!u.searchParams.has('origin')){
   u.searchParams.set('origin',location.origin);
  }
  return u.toString();
 }
 function repair(frame){
  if(!frame||frame.tagName!=='IFRAME')return;
  const raw=frame.getAttribute('src');if(!raw)return;
  const next=youtubeUrl(raw);if(!next)return;
  const existing=String(frame.getAttribute('referrerpolicy')||'').toLowerCase();
  if(existing===policy&&touched.get(frame)===next)return;
  frame.setAttribute('referrerpolicy',policy);
  touched.set(frame,next);
  // Re-load once if the old request may already have been sent without Referer.
  if(existing!==policy||raw!==next)frame.setAttribute('src',next);
 }
 function inspect(node){
  if(node.nodeType!==1)return;
  if(node.tagName==='IFRAME')repair(node);
  if(typeof node.querySelectorAll==='function')node.querySelectorAll('iframe[src]').forEach(repair);
 }
 function start(){
  document.querySelectorAll('iframe[src]').forEach(repair);
  new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='attributes')repair(record.target);
    else for(const node of record.addedNodes)inspect(node);
   }
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
const CLIENT='('+browserClient.toString()+')();';
function injectHtml(html,pathname){
 if(!isVideoHostPage(pathname)||typeof html!=='string'||!/<\/head\s*>/i.test(html))return html;
 if(html.includes('data-mm-youtube-referrer="'+VERSION+'"'))return html;
 const script='<script defer src="'+ASSET+'?v='+VERSION+'" data-mm-youtube-referrer="'+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,script+'</head>');
}
function assets(){
 return new Map([[ASSET,{body:Buffer.from(CLIENT,'utf8'),mime:'text/javascript; charset=utf-8'}]]);
}
module.exports={VERSION,POLICY,ASSET,CLIENT,isVideoHostPage,injectHtml,assets};
