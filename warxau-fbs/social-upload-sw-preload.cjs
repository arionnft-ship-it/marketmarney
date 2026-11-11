'use strict';

const http = require('node:http');

const VERSION = 'marketmarney-runtime-20261111-v8';
const HELPER = '/assets/mm-social-upload-100mb.js?v=20261109-100mb-v3';
const HELPERS = Object.freeze([
  HELPER,
  '/assets/mm-social-experience.js?v=20261111-social-experience-v1',
  '/assets/mm-social-experience.css?v=20261111-social-experience-v1',
  '/assets/mm-social-refinement.js?v=20261111-social-refinement-v1',
  '/assets/mm-social-refinement.css?v=20261111-social-refinement-v1',
  '/assets/mm-social-routing.js?v=20261111-social-routing-v1',
  '/assets/mm-automatic-pivot.js?v=20261109-auto-pivot-v1',
  '/assets/warxau-live-stream.js?v=20261109-xau-sse-v1'
]);

function pathnameOf(req) {
  try { return new URL(String(req.url || '/'), 'http://marketmarney.local').pathname; }
  catch { return String(req.url || '/').split('?')[0]; }
}

function patchServiceWorker(source) {
  let text = String(source);
  let replacements = 0;
  text = text.replace(/\bconst\s+CACHE\s*=\s*(['"])[^'"]+\1\s*;/, () => {
    replacements++;
    return "const CACHE='" + VERSION + "';";
  });
  text = text.replace(/\bconst\s+CORE\s*=\s*\[([^\]]*)\]/, (whole, list) => {
    const missing = HELPERS.filter(helper => !list.includes(helper));
    if (!missing.length) return whole;
    replacements++;
    return 'const CORE=[' + list + missing.map(helper=>','+JSON.stringify(helper)).join('') + ']';
  });
  if (!text.includes('MM_RUNTIME_SW_V8')) {
    replacements++;
    text += "\n/* MM_RUNTIME_SW_V8 */\n" +
      "self.addEventListener('install',()=>{self.skipWaiting();});\n" +
      "self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>/^marketmarney-(?:offline|social-upload|runtime|auto-pivot)-/i.test(key)&&key!==" + JSON.stringify(VERSION) + ").map(key=>caches.delete(key)));for(const key of await caches.keys()){const cache=await caches.open(key);for(const request of await cache.keys()){const url=new URL(request.url);if(url.pathname==='/assets/xau-war-3d.html'||url.pathname==='/assets/warxau-live-stream.js')await cache.delete(request);}}await self.clients.claim();})());});\n";
  }
  return { output: text, replacements };
}

function wrapServiceWorker(req, res) {
  if (req.method !== 'GET' || pathnameOf(req) !== '/sw.js') return;
  req.headers['accept-encoding'] = 'identity';
  const original = { writeHead: res.writeHead, write: res.write, end: res.end };
  const chunks = [];
  let pendingHead = false, pass = false, size = 0;
  const MAX = 1024 * 1024;
  function restore(){ Object.assign(res, original); }
  function ok(){
    const type = String(res.getHeader('content-type') || '');
    return !res.headersSent && res.statusCode === 200 && !res.getHeader('content-encoding') && (!type || /javascript|text\/plain/i.test(type));
  }
  function head(){ if (pendingHead && !res.headersSent){pendingHead=false;original.writeHead.call(res,res.statusCode);} }
  function flush(){head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0;}
  res.writeHead=function(status,message,headers){
    if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
    const values=typeof message==='string'?headers:message;
    if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1]);}
    else if(values&&typeof values==='object'){for(const [k,v] of Object.entries(values))this.setHeader(k,v);}
    this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pendingHead=true;return this;
  };
  res.write=function(chunk,encoding,callback){
    if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
    if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback);}
    chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;
  };
  res.end=function(chunk,encoding,callback){
    if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    if(pass){restore();return original.end.call(this,chunk,encoding,callback);}
    if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length;}
    if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback);}
    const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=patchServiceWorker(raw);
    const out=patched.replacements?Buffer.from(patched.output,'utf8'):data;
    if(patched.replacements){
      this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');
      this.setHeader('content-length',out.length);
      this.setHeader('cache-control','no-cache, no-store, must-revalidate');
      this.setHeader('pragma','no-cache');
      this.setHeader('service-worker-allowed','/');
      this.setHeader('x-marketmarney-service-worker',VERSION);
      if(!wrapServiceWorker.logged){wrapServiceWorker.logged=true;console.log('MM_RUNTIME_SW_PATCH '+JSON.stringify({version:VERSION,replacements:patched.replacements,helpers:HELPERS}));}
    }
    chunks.length=0;head();restore();return original.end.call(this,out,callback);
  };
}

const currentCreateServer = http.createServer;
http.createServer = function(...args) {
  const server = currentCreateServer.apply(this,args);
  const currentEmit = server.emit;
  server.emit = function(event,...eventArgs) {
    if(event==='request')wrapServiceWorker(eventArgs[0],eventArgs[1]);
    return currentEmit.call(this,event,...eventArgs);
  };
  return server;
};

console.log('MM_RUNTIME_SW_PATCH_READY '+JSON.stringify({version:VERSION,helpers:HELPERS}));

module.exports={VERSION,HELPER,HELPERS,patchServiceWorker,wrapServiceWorker};
