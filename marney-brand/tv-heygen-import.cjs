'use strict';
// Explicit, operator-approved video imported from HeyGen into the public
// MarketMarney TV catalog. Read-only public routes; no unauthenticated write API.
const https=require('node:https');
const crypto=require('node:crypto');
const VERSION='mm-broker-audio-clear-20261111-v2';
const VIDEO_ID='85440075-e5d4-4637-b034-6f8b3051b287';
const RECORD=Object.freeze({
 id:VIDEO_ID,
 title:'Cara Memilih Broker Trading yang Aman untuk Pemula | MarketMarney Academy',
 cat:'Edukasi',
 desc:'Panduan memilih broker trading secara hati-hati untuk pemula. Pelajari cara memverifikasi izin dan identitas perusahaan, memeriksa biaya dan risiko leverage, memahami syarat deposit serta penarikan, menggunakan akun demo, dan mengenali tanda penipuan. Perbandingan broker dalam video bersifat fiktif. Materi edukasi, bukan rekomendasi broker atau nasihat investasi; trading berisiko kehilangan modal.',
 type:'mp4',
 url:'/media/'+VIDEO_ID+'.mp4',
 thumb:'/media/'+VIDEO_ID+'.jpg',
 status:'published',
 date:'2026-11-11T12:47:01.857Z',
 localFile:false,
 album:'MarketMarney Academy',
 learningStage:'mulai'
});
const ROUTES=new Map([
 [RECORD.url,{url:'https://raw.githubusercontent.com/arionnft-ship-it/marketmarney/854eb3558f397630b9d61f8ebace6a07a06e3fbf/assets/broker-audio/marketmarney-broker-suara-jelas-20261111.mp4',mime:'video/mp4',maxBytes:25000000}],
 [RECORD.thumb,{url:'https://dynamic.heygen.ai/image/e5e32e8ae4a44f3cba5b29371c11f835/original.jpg',mime:'image/jpeg',maxBytes:3000000}]
]);
function injectCatalog(src){
 const doc=typeof src==='string'?JSON.parse(src):src;
 if(!doc||typeof doc!=='object'||!Array.isArray(doc.videos))return src;
 if(doc.videos.some(v=>String(v?.id||'')===VIDEO_ID||
   String(v?.title||'').trim().toLowerCase()===RECORD.title.toLowerCase()))return src;
 return JSON.stringify({...doc,videos:[RECORD,...doc.videos]});
}
function wrapCatalog(req,res){
 if(req.method!=='GET'||String(req.url||'').split('?')[0]!=='/api/content')return false;
 req.headers['accept-encoding']='identity';
 const original={writeHead:res.writeHead,write:res.write,end:res.end};
 const chunks=[];const MAX=8*1024*1024;
 let size=0,queued=false,pass=false;
 function restore(){res.writeHead=original.writeHead;res.write=original.write;res.end=original.end;}
 function flush(){
  if(queued&&!res.headersSent){queued=false;original.writeHead.call(res,res.statusCode);}
  for(const b of chunks)original.write.call(res,b);
  chunks.length=0;
 }
 res.writeHead=function(status,message,headers){
  if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
  const h=typeof message==='string'?headers:message;
  if(Array.isArray(h)){for(let i=0;i<h.length;i+=2)this.setHeader(h[i],h[i+1]);}
  else if(h&&typeof h==='object'){for(const [k,v]of Object.entries(h))this.setHeader(k,v);}
  this.statusCode=status;if(typeof message==='string')this.statusMessage=message;
  queued=true;return this;
 };
 res.write=function(chunk,encoding,cb){
  if(typeof encoding==='function'){cb=encoding;encoding=undefined;}
  if(pass)return original.write.call(this,chunk,encoding,cb);
  const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
  if(size+b.length>MAX||res.headersSent||res.statusCode!==200||res.getHeader('content-encoding')){
   pass=true;flush();restore();return original.write.call(this,b,cb);
  }
  chunks.push(b);size+=b.length;if(typeof cb==='function')process.nextTick(cb);
  return true;
 };
 res.end=function(chunk,encoding,cb){
  if(typeof chunk==='function'){cb=chunk;chunk=undefined;}
  else if(typeof encoding==='function'){cb=encoding;encoding=undefined;}
  if(pass){restore();return original.end.call(this,chunk,encoding,cb);}
  if(chunk!==undefined&&chunk!==null){
   const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
   chunks.push(b);size+=b.length;
  }
  if(size>MAX||res.statusCode!==200||res.headersSent||res.getHeader('content-encoding')){
   flush();restore();return original.end.call(this,cb);
  }
  const source=Buffer.concat(chunks,size);
  let payload=source;
  try{
   const result=injectCatalog(source.toString('utf8'));
   if(typeof result==='string'&&result!==source.toString('utf8')){
    payload=Buffer.from(result,'utf8');
    res.removeHeader('etag');res.removeHeader('content-md5');
    res.removeHeader('transfer-encoding');
    res.setHeader('content-type','application/json; charset=utf-8');
    res.setHeader('content-length',payload.length);
    res.setHeader('cache-control','no-store');
    res.setHeader('X-MarketMarney-TV-Import',VERSION);
   }
  }catch(error){console.warn('MM_TV_IMPORT_CATALOG_UNMODIFIED',String(error.message).slice(0,120));}
  chunks.length=0;
  if(queued&&!res.headersSent){queued=false;original.writeHead.call(res,res.statusCode);}
  restore();return original.end.call(this,payload,cb);
 };
 return true;
}
function isAllowedTarget(u){
 return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
  (/^(?:[a-z0-9-]+\.)*heygen\.ai$/i.test(u.hostname)||
   /^(?:[a-z0-9-]+\.)*cloudfront\.net$/i.test(u.hostname)||
   /^(?:[a-z0-9-]+\.)*amazonaws\.com$/i.test(u.hostname)||
   u.hostname==='storage.googleapis.com'||
   ['raw.githubusercontent.com','media.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname));
}
function handleMedia(req,res){
 const path=String(req.url||'').split('?')[0];
 const cfg=ROUTES.get(path);if(!cfg)return false;
 if(!['GET','HEAD'].includes(req.method)){
  res.writeHead(405,{'Allow':'GET, HEAD','Content-Length':'0'});res.end();return true;
 }
 const reqHeaders={};
 if(typeof req.headers.range==='string'&&/^bytes=\d*-\d*$/.test(req.headers.range))
  reqHeaders.Range=req.headers.range;
 if(typeof req.headers['if-range']==='string')reqHeaders['If-Range']=req.headers['if-range'];
 let cancelled=false,live=null;
 req.on('aborted',()=>{cancelled=true;live?.destroy();});
 function fail(message){
  console.error('MM_TV_IMPORT_MEDIA_ERROR',JSON.stringify({path,error:message}));
  if(!res.headersSent){res.writeHead(502,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end('Video temporarily unavailable');}
  else res.destroy();
 }
 function start(uri,depth){
  if(cancelled)return;
  const u=new URL(uri);
  if(!isAllowedTarget(u)||depth>4){fail('url_not_allowlisted');return;}
  const upstream=https.request(u,{method:req.method,headers:reqHeaders,timeout:25000},response=>{
   const status=response.statusCode||0;
   if([301,302,303,307,308].includes(status)){
    const location=response.headers.location;response.resume();
    if(!location){fail('redirect_missing_location');return;}
    let next;try{next=new URL(location,u);}catch{fail('invalid_redirect');return;}
    start(next.href,depth+1);return;
   }
   if(![200,206,416].includes(status)){response.resume();fail('upstream_status_'+status);return;}
   const headers={
    'Content-Type':cfg.mime,
    'Cache-Control':'public, max-age=600, must-revalidate',
    'X-Content-Type-Options':'nosniff',
    'Accept-Ranges':'bytes'
   };
   for(const key of ['content-length','content-range','etag','last-modified'])
    if(response.headers[key]&&/^[\x20-\x7e]+$/.test(String(response.headers[key])))
     headers[key]=response.headers[key];
   if(status!==416&&Number(headers['content-length']||0)>cfg.maxBytes){
    response.destroy();fail('media_too_large');return;
   }
   res.writeHead(status,headers);
   if(req.method==='HEAD'||status===416){response.resume();res.end();return;}
   let count=0;
   response.on('data',chunk=>{count+=chunk.length;if(count>cfg.maxBytes)response.destroy(Error('stream_limit'));});
   response.on('error',e=>{if(!cancelled)fail(String(e.message).slice(0,80));});
   response.pipe(res);
  });
  live=upstream;
  upstream.on('timeout',()=>upstream.destroy(Error('upstream_timeout')));
  upstream.on('error',e=>{if(!cancelled)fail(String(e.message).slice(0,80));});
  upstream.end();
 }
 start(cfg.url,0);
 return true;
}
module.exports={VERSION,VIDEO_ID,RECORD,ROUTES,injectCatalog,wrapCatalog,handleMedia,isAllowedTarget};
