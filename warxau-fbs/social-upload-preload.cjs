'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VERSION = '20261109-100mb-v1';
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_REQUEST_BYTES = 110 * 1024 * 1024;
const ASSET_PATH = '/assets/mm-social-upload-100mb.js';
const APP_ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const SOCIAL_PAGES = new Set([
  '/beranda-trader.html',
  '/grup-trader.html',
  '/community.html',
  '/profil.html'
]);
const SOCIAL_UPLOAD_PATH = /(?:story|reel|post|feed|media|upload|community|social)/i;

const CLIENT = String.raw`(function(){
'use strict';
const MAX=104857600;
const LABEL='100 MB';
const MARK='mm-social-upload-100mb';
window.MarketMarneyUploadPolicy=Object.freeze({maxFileBytes:MAX,maxFileMB:100,version:'${VERSION}'});
function format(bytes){return (bytes/1048576).toFixed(bytes>=10485760?0:1)+' MB'}
function toast(message){
 let box=document.getElementById(MARK+'-toast');
 if(!box){box=document.createElement('div');box.id=MARK+'-toast';box.setAttribute('role','alert');box.style.cssText='position:fixed;z-index:2147483647;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(90vw,520px);padding:12px 16px;border-radius:12px;background:#24170b;color:#fff;border:1px solid #f6a623;box-shadow:0 12px 36px rgba(0,0,0,.35);font:600 14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;opacity:0;transition:opacity .18s ease';document.body.appendChild(box)}
 box.textContent=message;box.style.opacity='1';clearTimeout(box._mmTimer);box._mmTimer=setTimeout(function(){box.style.opacity='0'},4500);
}
function tooLarge(file){return file&&typeof file.size==='number'&&file.size>MAX}
function validate(files,reset){
 const list=Array.from(files||[]);const bad=list.find(tooLarge);if(!bad)return true;
 if(typeof reset==='function')reset();
 toast('File “'+(bad.name||'media')+'” berukuran '+format(bad.size)+'. Maksimal '+LABEL+' per file.');
 return false;
}
function inspectFormData(body){
 if(!(body instanceof FormData))return true;
 const files=[];for(const value of body.values())if(value instanceof File)files.push(value);
 return validate(files);
}
function updateCopy(root){
 const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const old=node.nodeValue||'';let next=old;
  next=next.replace(/Foto\s*maks\.?\s*2\s*MB\s*[•|·-]\s*Video\s*MP4\s*maks\.?\s*12\s*MB/gi,'Maksimal 100 MB per file');
  next=next.replace(/maks\.?\s*(?:2|12)\s*MB/gi,'maks. 100 MB');
  if(next!==old)node.nodeValue=next;
 }
}
function enhance(root){
 const scope=root&&root.querySelectorAll?root:document;
 for(const input of scope.querySelectorAll('input[type="file"]')){
  input.dataset.mmMaxFileBytes=String(MAX);
  if(!input.getAttribute('aria-description'))input.setAttribute('aria-description','Maksimal 100 MB per file');
 }
 updateCopy(root&&root.nodeType===1?root:document.body);
 const story=document.getElementById('mm81-story-upload-file');
 if(story)story.setAttribute('accept','image/jpeg,image/png,image/gif,image/webp,video/mp4,.jpg,.jpeg,.png,.gif,.webp,.mp4');
}
document.addEventListener('change',function(event){
 const input=event.target&&event.target.closest?event.target.closest('input[type="file"]'):null;
 if(!input)return;
 if(!validate(input.files,function(){input.value=''})){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
document.addEventListener('submit',function(event){
 const form=event.target;if(!(form instanceof HTMLFormElement))return;
 const files=[];for(const input of form.querySelectorAll('input[type="file"]'))files.push(...Array.from(input.files||[]));
 if(!validate(files)){event.preventDefault();event.stopImmediatePropagation()}
},true);
const nativeFetch=window.fetch;
if(nativeFetch)window.fetch=function(input,init){
 if(init&&init.body instanceof FormData&&!inspectFormData(init.body))return Promise.reject(new Error('MEDIA_FILE_TOO_LARGE_100MB'));
 return nativeFetch.apply(this,arguments);
};
const nativeSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send=function(body){
 if(body instanceof FormData&&!inspectFormData(body)){try{this.abort()}catch(e){};return}
 return nativeSend.apply(this,arguments);
};
function start(){
 enhance(document);
 let queued=false;
 new MutationObserver(function(records){
  if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)enhance(node);updateCopy(document.body)})
 }).observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

function pathnameOf(req) {
  try { return new URL(String(req.url || '/'), 'http://marketmarney.local').pathname; }
  catch { return String(req.url || '/').split('?')[0]; }
}

function isSocialPage(req, pathname) {
  return req && req.method === 'GET' && SOCIAL_PAGES.has(pathname);
}

function isLikelyUpload(req, pathname) {
  if (!req || !['POST', 'PUT', 'PATCH'].includes(req.method)) return false;
  const type = String(req.headers && req.headers['content-type'] || '');
  return /multipart\/form-data|application\/octet-stream/i.test(type) &&
    (/^\/api\//i.test(pathname) || SOCIAL_UPLOAD_PATH.test(pathname));
}

function sendAsset(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end();
    return true;
  }
  const body = Buffer.from(CLIENT, 'utf8');
  const etag = '"' + crypto.createHash('sha256').update(body).digest('hex') + '"';
  const headers = {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'X-MarketMarney-Upload-Limit': String(MAX_FILE_BYTES),
    ETag: etag
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers); res.end(); return true;
  }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

function rejectOversizeRequest(req, res) {
  const pathname = pathnameOf(req);
  if (!isLikelyUpload(req, pathname)) return false;
  const length = Number(req.headers['content-length'] || 0);
  if (!Number.isFinite(length) || length <= MAX_REQUEST_BYTES) return false;
  const body = Buffer.from(JSON.stringify({
    error: 'MEDIA_TOO_LARGE',
    message: 'Ukuran media maksimal 100 MB per file.',
    maxFileBytes: MAX_FILE_BYTES
  }));
  res.writeHead(413, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    Connection: 'close'
  });
  res.end(body);
  return true;
}

function wrapSocialHtml(req, res) {
  const pathname = pathnameOf(req);
  if (!isSocialPage(req, pathname)) return;
  req.headers['accept-encoding'] = 'identity';
  const original = { writeHead: res.writeHead, write: res.write, end: res.end };
  let pendingHead = false, pass = false, size = 0;
  const chunks = [], MAX_HTML = 8 * 1024 * 1024;
  function restore(){ Object.assign(res, original); }
  function headerOk(){
    const type = String(res.getHeader('content-type') || '');
    return !res.headersSent && res.statusCode === 200 && !res.getHeader('content-encoding') && (!type || /^text\/html\b/i.test(type));
  }
  function sendHead(){ if (pendingHead && !res.headersSent){ pendingHead=false; original.writeHead.call(res,res.statusCode); } }
  function flush(){ sendHead(); for (const chunk of chunks) original.write.call(res,chunk); chunks.length=0; }
  res.writeHead=function(status,message,headers){
    if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments)}
    const values=typeof message==='string'?headers:message;
    if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1]);}
    else if(values&&typeof values==='object'){for(const [k,v] of Object.entries(values))this.setHeader(k,v);}
    this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pendingHead=true;return this;
  };
  res.write=function(chunk,encoding,callback){
    if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
    if(pass||!headerOk()||size+buffer.length>MAX_HTML){pass=true;flush();restore();return original.write.call(this,buffer,callback)}
    chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;
  };
  res.end=function(chunk,encoding,callback){
    if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    if(pass){restore();return original.end.call(this,chunk,encoding,callback)}
    if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length;}
    if(!headerOk()||size>MAX_HTML){flush();restore();return original.end.call(this,callback)}
    const data=Buffer.concat(chunks,size),raw=data.toString('utf8');
    if(!/<\/html\s*>/i.test(raw)){flush();restore();return original.end.call(this,callback)}
    let html=raw.replace(/Foto\s*maks\.?\s*2\s*MB\s*[•|·-]\s*Video\s*MP4\s*maks\.?\s*12\s*MB/gi,'Maksimal 100 MB per file');
    if(!html.includes(ASSET_PATH))html=html.replace(/<\/body\s*>/i,'<script defer src="'+ASSET_PATH+'?v='+VERSION+'"></script></body>');
    const out=Buffer.from(html,'utf8');
    if(!out.equals(data)){
      this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');
      this.setHeader('content-length',out.length);this.setHeader('X-MarketMarney-Upload-Limit',String(MAX_FILE_BYTES));
    }
    chunks.length=0;sendHead();restore();return original.end.call(this,out,callback);
  };
}

function sanitizeSnippet(value){
  return String(value).replace(/[A-Za-z0-9_\-+/=]{56,}/g,'[redacted-long-token]').replace(/\s+/g,' ').slice(0,520);
}
function collectMatches(label,text){
  const terms=[/file\.size/gi,/content-length/gi,/multipart/gi,/formdata/gi,/\b413\b/g,/upload/gi,/story/gi,/reel/gi,/media/gi,/2097152/g,/12582912/g,/104857600/g,/\b(?:2|12|100)\s*MB\b/gi];
  const output=[];const seen=new Set();
  for(const re of terms){let match;let count=0;while((match=re.exec(text))&&count<12&&output.length<90){count++;const start=Math.max(0,match.index-180),end=Math.min(text.length,match.index+match[0].length+260);const snippet=sanitizeSnippet(text.slice(start,end));const key=label+'|'+snippet;if(!seen.has(key)){seen.add(key);output.push({source:label,term:match[0],snippet});}if(match[0].length===0)re.lastIndex++;}}
  return output;
}
function scanStaticFiles(root){
  const results=[];
  function walk(dir,depth){
    if(depth>5||results.length>=40)return;
    let names;try{names=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const entry of names){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){if(!/node_modules|uploads|media|cache/i.test(entry.name))walk(full,depth+1);continue;}
      if(!/\.(?:js|cjs|html)$/i.test(entry.name)||!/story|reel|community|beranda|social|home|common|app/i.test(full))continue;
      let stat;try{stat=fs.statSync(full);}catch{continue;}if(stat.size>6*1024*1024)continue;
      let text;try{text=fs.readFileSync(full,'utf8');}catch{continue;}
      const matches=collectMatches(path.relative(root,full),text);
      if(matches.length)results.push({path:path.relative(root,full),bytes:stat.size,matches:matches.slice(0,24)});
      if(results.length>=40)return;
    }
  }
  walk(root,0);return results;
}
function probe(gatewayText){
  if(process.env.MM_SOCIAL_UPLOAD_PROBE!=='1')return;
  const report={version:VERSION,maxFileBytes:MAX_FILE_BYTES,gatewayMatches:collectMatches('public-gateway',gatewayText).slice(0,70),staticFiles:scanStaticFiles(APP_ROOT)};
  console.log('MM_SOCIAL_UPLOAD_PROBE '+JSON.stringify(report));
}

const nativeWriteFileSync=fs.writeFileSync;
fs.writeFileSync=function(target,data,...rest){
  if(String(target)==='/tmp/marketmarney-public.cjs'){
    const text=Buffer.isBuffer(data)?data.toString('utf8'):String(data);
    probe(text);
  }
  return nativeWriteFileSync.call(this,target,data,...rest);
};

const nativeCreateServer=http.createServer;
http.createServer=function(...args){
  const server=nativeCreateServer.apply(this,args);
  const nativeEmit=server.emit;
  server.emit=function(event,...eventArgs){
    if(event==='request'){
      const [req,res]=eventArgs;const pathname=pathnameOf(req);
      if(pathname===ASSET_PATH){sendAsset(req,res);return true;}
      if(rejectOversizeRequest(req,res))return true;
      wrapSocialHtml(req,res);
    }
    return nativeEmit.call(this,event,...eventArgs);
  };
  return server;
};

console.log('MM_SOCIAL_UPLOAD_POLICY_READY '+JSON.stringify({version:VERSION,maxFileBytes:MAX_FILE_BYTES,maxRequestBytes:MAX_REQUEST_BYTES,pages:[...SOCIAL_PAGES]}));

module.exports={VERSION,MAX_FILE_BYTES,MAX_REQUEST_BYTES,ASSET_PATH,CLIENT,isSocialPage,isLikelyUpload,sendAsset,rejectOversizeRequest,wrapSocialHtml,collectMatches,scanStaticFiles};
