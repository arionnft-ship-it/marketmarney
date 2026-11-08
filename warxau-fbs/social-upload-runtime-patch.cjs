'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const VERSION = '20261109-100mb-v2';
const MAX_MB = 100;
const MAX_FILE_BYTES = MAX_MB * 1024 * 1024;
const MAX_GATEWAY_BYTES = 110 * 1024 * 1024;
const JS_PATH = /^\/assets\/(?:social-home-\d+|trader-profiles-\d+)\.js$/i;

function patchGatewaySource(source) {
  let count = 0;
  let output = String(source).replace(/\bconst\s+MAX\s*=\s*40\s*\*\s*1024\s*\*\s*1024\s*;/g, () => {
    count++;
    return 'const MAX=110*1024*1024;';
  });
  return { output, count };
}

function patchTraderProfilesSource(source) {
  let count = 0;
  let output = String(source);
  const replace = (pattern, replacement) => {
    output = output.replace(pattern, (...args) => {
      count++;
      return typeof replacement === 'function' ? replacement(...args) : replacement;
    });
  };
  replace(/\bconst\s+max\s*=\s*kind\s*===\s*['"]avatar['"]\s*\?\s*1024\s*\*\s*1024\s*:\s*2\s*\*\s*1024\s*\*\s*1024\s*;/g,
    "const max=kind==='avatar'?1024*1024:100*1024*1024;");
  replace(/\bconst\s+max\s*=\s*kind\s*===\s*['"]story['"]\s*\?\s*12\s*:\s*kind\s*===\s*['"]reel['"]\s*\?\s*30\s*:\s*20\s*;/g,
    'const max=100;');
  replace(/\bconst\s+max\s*=\s*kind\s*===\s*['"]story['"]\s*\?\s*12\s*:\s*20\s*;/g,
    'const max=100;');
  replace(/Foto postingan maksimal 2 MB/g, 'Foto postingan maksimal 100 MB');
  replace(/Foto terlalu besar/g, 'Foto terlalu besar. Maksimal 100 MB');
  replace(/Video MP4 maksimal ['"]?\s*\+\s*max\s*\+\s*['"]? MB/g, "Video MP4 maksimal '+max+' MB");
  return { output, count };
}

function patchSocialClientSource(source) {
  let count = 0;
  let output = String(source);
  const replace = (pattern, replacement) => {
    output = output.replace(pattern, (...args) => {
      count++;
      return typeof replacement === 'function' ? replacement(...args) : replacement;
    });
  };
  replace(/\bconst\s+max\s*=\s*kind\s*===\s*['"]story['"]\s*\?\s*12\s*:\s*kind\s*===\s*['"]reel['"]\s*\?\s*30\s*:\s*20\s*;/g, 'const max=100;');
  replace(/file\.size\s*>\s*\(\s*kind\s*===\s*['"]story['"]\s*\?\s*12\s*:\s*20\s*\)\s*\*\s*1024\s*\*\s*1024/g, 'file.size>100*1024*1024');
  replace(/file\.size\s*>\s*max\s*\*\s*1024\s*\*\s*1024/g, 'file.size>100*1024*1024');
  replace(/f\.size\s*>\s*2\s*\*\s*1024\s*\*\s*1024/g, 'f.size>100*1024*1024');
  replace(/Foto hanya JPG\/PNG\/WebP maksimal 2 MB/g, 'Foto hanya JPG/PNG/WebP maksimal 100 MB');
  replace(/Foto postingan maksimal 2 MB/g, 'Foto postingan maksimal 100 MB');
  replace(/Foto maks\.? 2 MB\s*[•|·-]\s*Video MP4 maks\.? 12 MB/g, 'Maksimal 100 MB per file');
  replace(/Video MP4 maksimal ['"]?\s*\+\s*\(kind===['"]story['"]\?12:20\)\s*\+\s*['"]? MB/g, "Video MP4 maksimal 100 MB");
  return { output, count };
}

const nativeReadFileSync = fs.readFileSync;
fs.readFileSync = function(target, options, ...rest) {
  const value = nativeReadFileSync.call(this, target, options, ...rest);
  if (path.basename(String(target)) !== 'trader-profiles1836.js') return value;
  const encoding = typeof options === 'string' ? options : options && options.encoding;
  const text = Buffer.isBuffer(value) ? value.toString(encoding || 'utf8') : String(value);
  const patched = patchTraderProfilesSource(text);
  if (patched.count && !fs.readFileSync._mmUploadLogged) {
    fs.readFileSync._mmUploadLogged = true;
    console.log('MM_SOCIAL_UPLOAD_SERVER_PATCH ' + JSON.stringify({version:VERSION,file:path.basename(String(target)),replacements:patched.count,maxFileBytes:MAX_FILE_BYTES}));
  }
  return Buffer.isBuffer(value) && !encoding ? Buffer.from(patched.output, 'utf8') : patched.output;
};

const nativeWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(target, data, ...rest) {
  if (String(target) === '/tmp/marketmarney-public.cjs') {
    const isBuffer = Buffer.isBuffer(data);
    const patched = patchGatewaySource(isBuffer ? data.toString('utf8') : String(data));
    if (patched.count) {
      data = isBuffer ? Buffer.from(patched.output, 'utf8') : patched.output;
      console.log('MM_SOCIAL_UPLOAD_GATEWAY_PATCH ' + JSON.stringify({version:VERSION,replacements:patched.count,maxRequestBytes:MAX_GATEWAY_BYTES}));
    }
  }
  return nativeWriteFileSync.call(this, target, data, ...rest);
};

function pathnameOf(req) {
  try { return new URL(String(req.url || '/'), 'http://marketmarney.local').pathname; }
  catch { return String(req.url || '/').split('?')[0]; }
}

function wrapJavaScript(req, res) {
  const pathname = pathnameOf(req);
  if (req.method !== 'GET' || !JS_PATH.test(pathname)) return;
  req.headers['accept-encoding'] = 'identity';
  const original = { writeHead: res.writeHead, write: res.write, end: res.end };
  let pendingHead = false, pass = false, size = 0;
  const chunks = [], MAX_SOURCE = 2 * 1024 * 1024;
  function restore(){ Object.assign(res, original); }
  function headerOk(){
    const type=String(res.getHeader('content-type')||'');
    return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/(?:java|ecma)script|text\/plain/i.test(type));
  }
  function head(){ if(pendingHead&&!res.headersSent){pendingHead=false;original.writeHead.call(res,res.statusCode);} }
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
    if(pass||!headerOk()||size+buffer.length>MAX_SOURCE){pass=true;flush();restore();return original.write.call(this,buffer,callback);}
    chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;
  };
  res.end=function(chunk,encoding,callback){
    if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    if(pass){restore();return original.end.call(this,chunk,encoding,callback);}
    if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length;}
    if(!headerOk()||size>MAX_SOURCE){flush();restore();return original.end.call(this,callback);}
    const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),patched=patchSocialClientSource(raw);
    const out=patched.count?Buffer.from(patched.output,'utf8'):data;
    if(patched.count){
      this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);
      this.setHeader('X-MarketMarney-Upload-Limit',String(MAX_FILE_BYTES));
      if(!wrapJavaScript.logged){wrapJavaScript.logged=true;console.log('MM_SOCIAL_UPLOAD_CLIENT_PATCH '+JSON.stringify({version:VERSION,path:pathname,replacements:patched.count,maxFileBytes:MAX_FILE_BYTES}));}
    }
    chunks.length=0;head();restore();return original.end.call(this,out,callback);
  };
}

const currentCreateServer = http.createServer;
http.createServer = function(...args) {
  const server = currentCreateServer.apply(this,args);
  const currentEmit = server.emit;
  server.emit = function(event,...eventArgs) {
    if(event==='request')wrapJavaScript(eventArgs[0],eventArgs[1]);
    return currentEmit.call(this,event,...eventArgs);
  };
  return server;
};

console.log('MM_SOCIAL_UPLOAD_RUNTIME_PATCH_READY '+JSON.stringify({version:VERSION,maxFileBytes:MAX_FILE_BYTES,maxGatewayBytes:MAX_GATEWAY_BYTES,assets:String(JS_PATH)}));

module.exports={VERSION,MAX_MB,MAX_FILE_BYTES,MAX_GATEWAY_BYTES,JS_PATH,patchGatewaySource,patchTraderProfilesSource,patchSocialClientSource,wrapJavaScript};
