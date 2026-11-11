'use strict';
/* Reels / Live Marney integration — composes with the existing verified
   live-stream-preload, without replacing live WebRTC signaling or user auth. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const VERSION='20261111-reels-live-v1';
const JS_PATH='/assets/live-reels.js';
const CSS_PATH='/assets/live-reels.css';
const REELS_PAGE='/beranda-trader.html';
const VIEW_PAGE='/live.html';
const SOURCE_DIR=__dirname;
const VALID_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathOf(req){
  try{return new URL(String(req.url||'/'),'https://marketmarney.com').pathname}
  catch{return String(req.url||'/').split('?')[0]}
}
function paramsOf(req){
  try{return new URL(String(req.url||'/'),'https://marketmarney.com').searchParams}
  catch{return new URLSearchParams()}
}
function asset(name){
  return fs.readFileSync(path.join(SOURCE_DIR,name));
}
function answerAsset(req,res,name,type){
  if(req.method!=='GET')return false;
  const bytes=asset(name);
  res.writeHead(200,{
    'Content-Type':type,
    'Content-Length':bytes.length,
    'Cache-Control':'public, max-age=60, must-revalidate',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  });
  res.end(bytes);return true;
}
function injectReels(html){
  if(typeof html!=='string'||!/<\/body\s*>/i.test(html))return html;
  if(!html.includes('id="shReelsPanel"')||!html.includes('id="shReelFeed"'))return html;
  if(html.includes('data-mm-live-reels="'+VERSION+'"'))return html;
  const tag='<link rel="stylesheet" href="'+CSS_PATH+'?v='+VERSION+'">'
    +'<script defer src="'+JS_PATH+'?v='+VERSION+'" data-mm-live-reels="'+VERSION+'"></script>';
  return html.replace(/<\/body\s*>/i,tag+'</body>');
}
function injectEmbeddedViewer(html){
  if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!html.includes('id="viewerStage"'))return html;
  if(html.includes('data-mm-live-reels-embed="'+VERSION+'"'))return html;
  const link='<link rel="stylesheet" href="'+CSS_PATH+'?v='+VERSION+'" data-mm-live-reels-embed="'+VERSION+'">';
  return html.replace(/<\/head\s*>/i,link+'</head>').replace(/<body\b([^>]*)>/i,(whole,attrs)=>{
    if(/\bclass\s*=/.test(attrs))return whole.replace(/\bclass\s*=\s*"/,'class="mm-live-reels-embed ');
    return '<body class="mm-live-reels-embed"'+attrs+'>';
  });
}
/* Streaming response transformation. The outer plugin is called before the
   existing Live Marney preload. Both wrappers compose in creation order. */
function bufferTransform(req,res,{maxBytes,accepts,transform}){
  req.headers['accept-encoding']='identity';
  const original={writeHead:res.writeHead,write:res.write,end:res.end};
  const chunks=[];
  let bufferedHead=false,passthrough=false,size=0;
  const restore=()=>{res.writeHead=original.writeHead;res.write=original.write;res.end=original.end;};
  const ok=()=>{
    const type=String(res.getHeader('content-type')||'');
    return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&accepts(type);
  };
  const head=()=>{
    if(bufferedHead&&!res.headersSent){bufferedHead=false;original.writeHead.call(res,res.statusCode);}
  };
  const flush=()=>{head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0;};
  res.writeHead=function(status,message,values){
    if(passthrough||status!==200){passthrough=true;flush();restore();return original.writeHead.apply(this,arguments);}
    const supplied=typeof message==='string'?values:message;
    if(Array.isArray(supplied)){for(let i=0;i<supplied.length;i+=2)this.setHeader(supplied[i],supplied[i+1]);}
    else if(supplied&&typeof supplied==='object'){for(const [key,value] of Object.entries(supplied))this.setHeader(key,value);}
    this.statusCode=status;
    if(typeof message==='string')this.statusMessage=message;
    bufferedHead=true;return this;
  };
  res.write=function(chunk,encoding,callback){
    if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    const buf=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
    if(passthrough||!ok()||size+buf.length>maxBytes){
      passthrough=true;flush();restore();return original.write.call(this,buf,callback);
    }
    chunks.push(buf);size+=buf.length;
    if(typeof callback==='function')process.nextTick(callback);
    return true;
  };
  res.end=function(chunk,encoding,callback){
    if(typeof chunk==='function'){callback=chunk;chunk=undefined;}
    else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
    if(passthrough){restore();return original.end.call(this,chunk,encoding,callback);}
    if(chunk!=null){const buf=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buf);size+=buf.length;}
    if(!ok()||size>maxBytes){flush();restore();return original.end.call(this,callback);}
    const data=Buffer.concat(chunks,size),raw=data.toString('utf8');
    let output;try{output=String(transform(raw));}catch{output=raw;}
    const next=output===raw?data:Buffer.from(output,'utf8');
    if(next!==data){
      this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');
      this.setHeader('content-length',next.length);
      this.setHeader('Cache-Control','no-store, max-age=0');
      this.setHeader('X-MarketMarney-Reels-Live',VERSION);
    }
    chunks.length=0;head();restore();return original.end.call(this,next,callback);
  };
}
function install(){
  const originalCreateServer=http.createServer;
  http.createServer=function(...args){
    const server=originalCreateServer.apply(this,args);
    const priorEmit=server.emit;
    server.emit=function(event,...eventArgs){
      if(event==='request'){
        const [req,res]=eventArgs,route=pathOf(req);
        if(req.method==='GET'&&route===JS_PATH)return answerAsset(req,res,'live-reels.js','text/javascript; charset=utf-8');
        if(req.method==='GET'&&route===CSS_PATH)return answerAsset(req,res,'live-reels.css','text/css; charset=utf-8');
        if(req.method==='GET'&&route===REELS_PAGE){
          bufferTransform(req,res,{maxBytes:8*1024*1024,
            accepts:t=>!t||/^text\/html\b/i.test(t),
            transform:injectReels});
        }else if(req.method==='GET'&&route===VIEW_PAGE){
          const p=paramsOf(req);
          if(p.get('embed')==='reels'&&VALID_ID.test(p.get('watch')||'')){
            bufferTransform(req,res,{maxBytes:512*1024,
              accepts:t=>!t||/^text\/html\b/i.test(t),
              transform:injectEmbeddedViewer});
          }
        }
      }
      return priorEmit.call(this,event,...eventArgs);
    };
    return server;
  };
}
if(process.env.MM_LIVE_REELS_UNIT_TEST!=='1')install();
console.log('MM_LIVE_REELS_MODULE_READY '+JSON.stringify({version:VERSION,scope:'viewer-only',existingSignaling:'unchanged',liveRoute:'/api/live/streams'}));
module.exports={VERSION,injectReels,injectEmbeddedViewer,bufferTransform,install,pathOf,paramsOf};
