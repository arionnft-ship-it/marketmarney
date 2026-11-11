'use strict';
// Temporary, read-only route probe for integrating Live Marney with existing accounts.
// Logs route names and asset filenames only; never logs cookies, tokens, user data, or file contents.
const fs=require('node:fs'),path=require('node:path');
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const nativeWrite=fs.writeFileSync;
function routesFrom(text){
 const found=new Set();
 const source=String(text||'');
 const re=/["'`](\/(?:api|auth)\/[A-Za-z0-9_./:?=&${}-]{1,180})["'`]/g;
 let m;while((m=re.exec(source))){
  let route=m[1].replace(/\$\{[^}]+\}/g,':param').replace(/[?&](?:token|key|secret|code)=[^&"'`]+/gi,'');
  if(!/(?:token|secret|password|authorization)/i.test(route))found.add(route);
 }
 return [...found].sort();
}
fs.writeFileSync=function(target,data,...rest){
 if(String(target)==='/tmp/marketmarney-public.cjs'){
  try{const routes=routesFrom(Buffer.isBuffer(data)?data.toString('utf8'):String(data));console.log('MM_LIVE_PROBE_GATEWAY '+JSON.stringify({routeCount:routes.length,routes:routes.slice(0,160)}));}catch{}
 }
 return nativeWrite.call(this,target,data,...rest);
};
function walk(dir,depth=0,out=[]){
 if(depth>3)return out;
 let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return out;}
 for(const e of entries){
  const p=path.join(dir,e.name);
  if(e.isDirectory())walk(p,depth+1,out);
  else if(/\.(?:html|js|cjs)$/i.test(e.name)&&/(?:social|trader|profile|profil|group|grup|account|akun|auth|message|chat|community)/i.test(e.name))out.push(p);
 }
 return out;
}
function probe(){
 const files=walk(APP).slice(0,120),summary=[];
 for(const file of files){
  try{
   const stat=fs.statSync(file);if(stat.size>6*1024*1024)continue;
   const text=fs.readFileSync(file,'utf8'),routes=routesFrom(text);
   const markers=[];
   for(const marker of ['getUserMedia','MediaRecorder','WebSocket','EventSource','session','currentUser','profile','message','chat'])if(text.includes(marker))markers.push(marker);
   if(routes.length||markers.length)summary.push({file:path.relative(APP,file),bytes:stat.size,routes:routes.slice(0,80),markers});
  }catch{}
 }
 console.log('MM_LIVE_PROBE_ASSETS '+JSON.stringify({files:summary.slice(0,60)}));
}
setTimeout(probe,8000).unref?.();
console.log('MM_LIVE_PROBE_READY');
