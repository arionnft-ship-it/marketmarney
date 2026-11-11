'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const VERSION = '20261111-social-routing-v1';
const JS_PATH = '/assets/mm-social-routing.js';
const HEALTH_PATH = '/api/social/routing';
const INJECT_PAGES = new Set(['/live.html', '/start-stream']);
const ALIASES = new Map([
  ['/reels.html', '/beranda-trader.html#shReelsPanel']
]);

const CLIENT = String.raw`(function(){
'use strict';
if(window.__MM_SOCIAL_ROUTING__===${JSON.stringify(VERSION)})return;
window.__MM_SOCIAL_ROUTING__=${JSON.stringify(VERSION)};
const STATUS='/api/community/status';
const loginUrl='/akun.html?next='+encodeURIComponent('/live.html');
let authState=document.documentElement.dataset.mmAuth||'unknown';
function detectAuth(data){
 if(!data||typeof data!=='object')return 'unknown';
 if(data.authenticated===true||data.loggedIn===true||data.logged_in===true||data.signedIn===true||data.user||data.account||data.profile)return 'in';
 if(data.authenticated===false||data.loggedIn===false||data.logged_in===false||data.signedIn===false||data.user===null||data.account===null||data.profile===null||data.username===null)return 'out';
 return 'unknown';
}
const statusPromise=fetch(STATUS,{credentials:'same-origin',headers:{Accept:'application/json','X-MarketMarney-Client':${JSON.stringify(VERSION)}}}).then(async response=>{
 const data=await response.clone().json().catch(()=>null);authState=detectAuth(data);document.documentElement.dataset.mmAuth=authState;return authState;
}).catch(()=>authState);
function isLiveStart(control){
 if(!control)return false;
 const label=(control.textContent||'').replace(/\s+/g,' ').trim();
 let path='';try{const href=control.getAttribute&&control.getAttribute('href');if(href)path=new URL(href,location.href).pathname}catch{}
 return path==='/start-stream'||/^(?:Mulai Live(?: Marney)?|Buat Live(?: Marney)?|Mulai siaran|Aktifkan kamera\s*&\s*mulai)/i.test(label);
}
function goToLogin(){location.assign(loginUrl)}
function install(){
 if(document.documentElement.dataset.mmSocialRoutingReady)return;document.documentElement.dataset.mmSocialRoutingReady='1';
 if(location.pathname==='/start-stream')Promise.resolve(statusPromise).finally(()=>{if(authState!=='in')location.replace(loginUrl)});
 document.addEventListener('click',event=>{
  const control=event.target&&event.target.closest?event.target.closest('button,a,[role="button"]'):null;
  if(!isLiveStart(control)||control.dataset.mmLiveRoutingBypass==='1'||authState==='in')return;
  event.preventDefault();event.stopImmediatePropagation();
  Promise.resolve(statusPromise).finally(()=>{
   if(authState==='in'){
    control.dataset.mmLiveRoutingBypass='1';control.click();delete control.dataset.mmLiveRoutingBypass;
   }else goToLogin();
  });
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();`;

function pathnameOf(req){
 try{return new URL(String(req.url||'/'),'http://marketmarney.local').pathname}
 catch{return String(req.url||'/').split('?')[0]}
}
function redirectFor(pathname){return ALIASES.get(pathname)||null}
function injectHtml(html,pathname){
 const source=String(html||'');
 if(!INJECT_PAGES.has(pathname)||!/<\/html\s*>/i.test(source))return source;
 if(source.includes('data-mm-social-routing="'+VERSION+'"'))return source;
 const query='?v='+encodeURIComponent(VERSION);
 const tag='<script src="'+JS_PATH+query+'" data-mm-social-routing="'+VERSION+'"></script>';
 return /<head\b[^>]*>/i.test(source)?source.replace(/<head\b[^>]*>/i,match=>match+tag):tag+source;
}
function sendAsset(req,res,body,type){
 const buffer=Buffer.isBuffer(body)?body:Buffer.from(body);
 const etag='"'+crypto.createHash('sha256').update(buffer).digest('hex')+'"';
 const headers={'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','ETag':etag,'Content-Length':buffer.length,'X-MarketMarney-Social-Routing':VERSION};
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return}
 res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:buffer);
}
function handle(req,res){
 const pathname=pathnameOf(req),method=String(req.method||'GET').toUpperCase();
 if(!['GET','HEAD'].includes(method))return false;
 const redirect=redirectFor(pathname);
 if(redirect){res.writeHead(302,{Location:redirect,'Cache-Control':'no-store','X-MarketMarney-Social-Routing':VERSION});res.end();return true}
 if(pathname===JS_PATH){sendAsset(req,res,CLIENT,'text/javascript; charset=utf-8');return true}
 if(pathname===HEALTH_PATH){const payload=Buffer.from(JSON.stringify({ok:true,version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES),features:['reels-route','live-start-login','start-stream-login']}));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':payload.length,'X-MarketMarney-Social-Routing':VERSION});res.end(req.method==='HEAD'?undefined:payload);return true}
 return false;
}
function wrapHtml(req,res){
 const pathname=pathnameOf(req);
 if(String(req.method||'GET').toUpperCase()!=='GET'||!INJECT_PAGES.has(pathname))return;
 req.headers['accept-encoding']='identity';
 const original={writeHead:res.writeHead,write:res.write,end:res.end},chunks=[];let pending=false,pass=false,size=0;const MAX=4*1024*1024;
 function restore(){Object.assign(res,original)}
 function ok(){const type=String(res.getHeader('content-type')||'');return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/^text\/html\b/i.test(type))}
 function head(){if(pending&&!res.headersSent){pending=false;original.writeHead.call(res,res.statusCode)}}
 function flush(){head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0}
 res.writeHead=function(status,message,headers){if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments)}const values=typeof message==='string'?headers:message;if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1])}else if(values&&typeof values==='object'){for(const [key,value]of Object.entries(values))this.setHeader(key,value)}this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pending=true;return this};
 res.write=function(chunk,encoding,callback){if(typeof encoding==='function'){callback=encoding;encoding=undefined}const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback)}chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true};
 res.end=function(chunk,encoding,callback){if(typeof chunk==='function'){callback=chunk;chunk=undefined}else if(typeof encoding==='function'){callback=encoding;encoding=undefined}if(pass){restore();return original.end.call(this,chunk,encoding,callback)}if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length}if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback)}const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=injectHtml(raw,pathname),out=patched===raw?data:Buffer.from(patched);if(out!==data){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);this.setHeader('X-MarketMarney-Social-Routing',VERSION);this.setHeader('Vary','Accept-Encoding')}chunks.length=0;head();restore();return original.end.call(this,out,callback)};
}
function installHttp(){
 if(http.createServer.__mmSocialRouting===VERSION)return;
 const currentCreateServer=http.createServer;
 function createServer(...args){const server=currentCreateServer.apply(this,args),currentEmit=server.emit;server.emit=function(event,...eventArgs){if(event==='request'){const req=eventArgs[0],res=eventArgs[1];if(handle(req,res))return true;wrapHtml(req,res)}return currentEmit.call(this,event,...eventArgs)};return server}
 createServer.__mmSocialRouting=VERSION;http.createServer=createServer;
 console.log('MM_SOCIAL_ROUTING_READY '+JSON.stringify({version:VERSION,pages:[...INJECT_PAGES],aliases:Object.fromEntries(ALIASES)}));
}
if(process.env.MM_SOCIAL_ROUTING_DISABLE_AUTO!=='1')installHttp();
module.exports={VERSION,JS_PATH,HEALTH_PATH,INJECT_PAGES,ALIASES,CLIENT,pathnameOf,redirectFor,injectHtml,sendAsset,handle,wrapHtml,installHttp};
