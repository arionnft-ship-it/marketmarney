'use strict';
/* Safely composes with existing Live Marney and Reels preload; no original
   WebRTC source or account endpoints are overwritten. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {live}=require('./live-stream-preload.cjs');
const {bufferTransform}=require('./live-reels-preload.cjs');
const {createEngagementService}=require('./live-engagement.cjs');

const VERSION='20261111-live-engagement-v1';
const service=createEngagementService(live);
const PATH_JS='/assets/live-engagement.js',PATH_CSS='/assets/live-engagement.css';
function pathOf(req){
  try{return new URL(String(req.url||'/'),'https://marketmarney.com').pathname;}
  catch{return String(req.url||'/').split('?')[0];}
}
function resource(res,name,mime){
  const body=fs.readFileSync(path.join(__dirname,name));
  res.writeHead(200,{'Content-Type':mime,'Content-Length':body.length,'Cache-Control':'public, max-age=60, must-revalidate','X-Content-Type-Options':'nosniff'});
  res.end(body);
}
function once(src,before,after,label){
  const parts=src.split(before);
  if(parts.length!==2)throw new Error('Live JS source has changed: '+label);
  return parts.join(after);
}
function injectClient(source){
  if(typeof source!=='string'||!source.startsWith('(function()'))return source;
  if(source.includes('mm-live-session'))return source;
  let text=source;
  text=once(text,
    'host=data.stream;config=',
    "host=data.stream;window.dispatchEvent(new CustomEvent('mm-live-session',{detail:{streamId:host.id,token:host.token,role:'host'}}));config=",
    'host token event');
  text=once(text,
    'viewer={id:streamId,viewerId:data.viewerId,token:data.token};config=',
    "viewer={id:streamId,viewerId:data.viewerId,token:data.token};window.dispatchEvent(new CustomEvent('mm-live-session',{detail:{streamId:viewer.id,token:viewer.token,viewerId:viewer.viewerId,role:'viewer'}}));config=",
    'viewer token event');
  text=once(text,
    'host=null;history.replaceState',
    "host=null;window.dispatchEvent(new Event('mm-live-end'));history.replaceState",
    'host ended event');
  text=once(text,
    'const v=viewer;viewer=null;',
    "const v=viewer;viewer=null;window.dispatchEvent(new Event('mm-live-end'));",
    'viewer leave event');
  return text;
}
function injectHtml(html){
  if(typeof html!=='string'||!/<\/html\s*>/i.test(html)||!html.includes('id="viewerStage"'))return html;
  if(html.includes('data-mm-live-engagement="'+VERSION+'"'))return html;
  const head='<link rel="stylesheet" href="'+PATH_CSS+'?v='+VERSION+'" data-mm-live-engagement="'+VERSION+'">';
  const script='<script src="'+PATH_JS+'?v='+VERSION+'" data-mm-live-engagement="'+VERSION+'"></script>';
  if(html.includes('<script src="/assets/live-marney.js?')){
    return html.replace(/<\/head\s*>/i,head+'</head>')
      .replace('<script src="/assets/live-marney.js?',script+'<script src="/assets/live-marney.js?');
  }
  throw new Error('Unexpected Live Marney player script');
}
function install(){
  const make=http.createServer;
  http.createServer=function(...args){
    const server=make.apply(this,args);
    const priorEmit=server.emit;
    server.emit=function(event,...eventArgs){
      if(event==='request'){
        const [req,res]=eventArgs,pathname=pathOf(req);
        if(pathname==='/api/live-interactions'||pathname.startsWith('/api/live-interactions/')){
          if(service.handle(req,res))return true;
        }
        if(req.method==='GET'&&pathname===PATH_JS){resource(res,'live-engagement.js','text/javascript; charset=utf-8');return true;}
        if(req.method==='GET'&&pathname===PATH_CSS){resource(res,'live-engagement.css','text/css; charset=utf-8');return true;}
        if(req.method==='GET'&&pathname==='/live.html'){
          bufferTransform(req,res,{maxBytes:512*1024,
            accepts:type=>!type||/^text\/html\b/i.test(type),
            transform:injectHtml});
        }else if(req.method==='GET'&&pathname==='/assets/live-marney.js'){
          bufferTransform(req,res,{maxBytes:512*1024,
            accepts:type=>!type||/javascript/i.test(type),
            transform:injectClient});
        }
      }
      return priorEmit.call(this,event,...eventArgs);
    };
    return server;
  };
}
if(process.env.MM_LIVE_ENGAGEMENT_UNIT_TEST!=='1')install();
console.log('MM_LIVE_ENGAGEMENT_MODULE_READY '+JSON.stringify({
  version:VERSION,comments:'live-only',gifts:'free virtual',monetary:false,viewerAuth:'existing Live Marney bearer token'
}));
module.exports={VERSION,service,install,injectClient,injectHtml,pathOf};
