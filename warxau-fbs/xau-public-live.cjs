'use strict';

// Public, price-only XAU stream. It exposes only sanitized bid/ask values and
// relay receipt timestamps. Broker/server/account metadata stays private.
const VERSION='20261109-xau-sse-v1';
const BASE='/api/xau-war/live';
const ASSET='/assets/warxau-live-stream.js';
const PAGE='/assets/xau-war-3d.html';
const PROVIDER='MarketMarney XAU Live · BID';
const FRESH_MS=5000;
const WATCH_MS=80;
const STATUS_MS=2000;
const MAX_CLIENTS=250;

function cleanNumber(value){return typeof value==='number'&&Number.isFinite(value)?value:null;}
function sanitizeSession(session,serverTime){
 if(!session||typeof session!=='object')return null;
 const opensAt=Number(session.opensAt),closesAt=Number(session.closesAt);
 if(!Number.isSafeInteger(opensAt)||!Number.isSafeInteger(closesAt)||closesAt<=opensAt)return null;
 return {id:String(session.id||'').slice(0,96),symbol:'XAU/USD',timeframe:'1day',mode:'live',provider:PROVIDER,timezone:'UTC',opensAt,closesAt,serverTime,confirmedClosed:false};
}
function sanitizeRelayStatus(input,now=Date.now()){
 const state=input&&['live','stale','waiting'].includes(input.state)?input.state:'waiting';
 const age=Number.isFinite(Number(input&&input.ageMs))?Math.max(0,Number(input.ageMs)):null;
 const privateQuote=input&&input.quote;
 const session=sanitizeSession(input&&input.dailySession,now);
 const bid=cleanNumber(privateQuote&&privateQuote.bid),ask=cleanNumber(privateQuote&&privateQuote.ask);
 const timestamp=Number(privateQuote&&privateQuote.timestamp);
 const live=state==='live'&&age!==null&&age<=FRESH_MS&&bid!==null&&bid>0&&ask!==null&&ask>=bid&&Number.isSafeInteger(timestamp)&&session;
 const quote=live?{symbol:'XAU/USD',price:bid,bid,ask,timestamp,mode:'live',provider:PROVIDER,sessionId:session.id,timestampBasis:'relay-receipt'}:null;
 return {state:live?'live':state==='stale'?'stale':'waiting',ageMs:age,serverTime:now,provider:PROVIDER,transport:'sse',publicDisplay:true,quote,session:live?session:null};
}
function pathnameOf(req){try{return new URL(String(req.url||'/'),'http://marketmarney.local').pathname;}catch{return String(req.url||'/').split('?')[0];}}
function publicOriginAllowed(req){const origin=String(req.headers&&req.headers.origin||'');return !origin||origin==='https://marketmarney.com';}
function headers(res){res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cross-Origin-Resource-Policy','same-origin');}
function json(res,status,payload){const body=Buffer.from(JSON.stringify(payload));headers(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'X-MarketMarney-XAU-Live':VERSION});res.end(body);}
function emit(res,event,data){
 if(res.destroyed||res.writableEnded)return false;
 if(res.writableLength>262144){res.end();return false;}
 res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');return true;
}

const CLIENT=String.raw`(function(root){
'use strict';
const VERSION='${VERSION}',BASE='${BASE}',PROVIDER='${PROVIDER}',FRESH_MS=${FRESH_MS};
let fallback=null,globalDiag={version:VERSION,state:'idle',transport:'sse',provider:PROVIDER,received:0,fallbackReceived:0};
function sourceLabel(text){const el=document.getElementById('source');if(el)el.textContent=text;}
function validQuote(payload){
 const q=payload&&payload.quote,s=payload&&payload.session;
 if(!q||!s||q.symbol!=='XAU/USD'||q.mode!=='live'||q.provider!==PROVIDER||q.timestampBasis!=='relay-receipt')return null;
 if(!Number.isFinite(q.price)||q.price<=0||!Number.isFinite(q.bid)||!Number.isFinite(q.ask)||q.ask<q.bid||!Number.isSafeInteger(q.timestamp))return null;
 if(s.id!==q.sessionId||s.symbol!=='XAU/USD'||s.provider!==PROVIDER||s.timezone!=='UTC')return null;
 const age=Date.now()-q.timestamp;if(age>15000||age< -5000)return null;
 return {q,s,age};
}
function create({onQuote,onStatus}={}){
 if(typeof onQuote!=='function')throw Error('Feed callbacks required');
 let closed=false,stream=null,fallbackFeed=null,fallbackTimer=null,lastLiveAt=0,lastLiveKey='',fallbackPending=false;
 const diag=state=>{globalDiag={...globalDiag,...state};};
 const reportWaiting=message=>onStatus?.({state:'waiting',code:null,message:message||''});
 function stopFallback(){if(fallbackFeed){try{fallbackFeed.close();}catch{}fallbackFeed=null;}fallbackPending=false;}
 function startFallback(reason){
  if(closed||fallbackFeed||fallbackPending)return;
  if(!fallback||typeof fallback.create!=='function'){
   fallbackPending=true;
   fallbackTimer=setTimeout(()=>{fallbackPending=false;startFallback(reason);},120);
   return;
  }
  fallbackPending=true;
  try{
   fallbackFeed=fallback.create({
    onQuote(q,session){
     if(closed||Date.now()-lastLiveAt<=FRESH_MS)return;
     sourceLabel(String(q&&q.provider||fallback.PROVIDER||'Sumber cadangan XAU/USD'));
     diag({state:'fallback',fallbackReason:reason||'stream-unavailable',lastPrice:q&&q.price,lastTimestamp:q&&q.timestamp,fallbackReceived:(globalDiag.fallbackReceived||0)+1});
     onQuote(q,session);
    },
    onStatus(status){
     if(closed||Date.now()-lastLiveAt<=FRESH_MS)return;
     diag({state:status&&status.state||'fallback',fallbackReason:reason||'stream-unavailable'});
     onStatus?.(status);
    }
   });
  }catch(error){
   diag({state:'error',error:String(error&&error.message||error).slice(0,160)});
   onStatus?.({state:'error',code:'fallback',message:'Stream dan sumber cadangan belum tersedia.'});
  }finally{fallbackPending=false;}
 }
 function acceptLive(payload){
  const parsed=validQuote(payload);if(!parsed)return;
  const {q,s,age}=parsed,key=q.timestamp+':'+q.bid+':'+q.ask;if(key===lastLiveKey)return;
  lastLiveKey=key;lastLiveAt=Date.now();stopFallback();sourceLabel(PROVIDER);
  diag({state:'live',received:(globalDiag.received||0)+1,lastPrice:q.price,lastTimestamp:q.timestamp,ageMs:age,transport:'sse',fallbackReason:null,error:null});
  onQuote(q,s);
 }
 reportWaiting('Menghubungkan stream XAU/USD…');sourceLabel('Menghubungkan stream XAU/USD…');
 if(typeof EventSource!=='function'){
  diag({state:'fallback',error:'eventsource-unavailable'});startFallback('eventsource-unavailable');
 }else{
  stream=new EventSource(BASE+'/stream');
  stream.addEventListener('quote',event=>{if(closed||event.data.length>8192)return;try{acceptLive(JSON.parse(event.data));}catch{}});
  stream.addEventListener('status',event=>{
   if(closed||event.data.length>4096)return;
   try{const status=JSON.parse(event.data);diag({serverState:status.state,ageMs:status.ageMs});if(status.state!=='live')startFallback(status.state||'waiting');}catch{startFallback('invalid-status');}
  });
  stream.onerror=()=>{if(!closed){diag({serverState:'disconnected'});startFallback('stream-disconnected');}};
  fallbackTimer=setTimeout(()=>{if(!closed&&Date.now()-lastLiveAt>FRESH_MS)startFallback('startup-timeout');},1800);
 }
 return {close(){closed=true;clearTimeout(fallbackTimer);stopFallback();try{stream?.close();}catch{}},diagnostics(){return {...globalDiag};}};
}
const liveApi={VERSION,BASE,PROVIDER,create,diagnostics:()=>({...globalDiag})};
try{
 Object.defineProperty(root,'MMGold',{configurable:true,enumerable:true,get(){return liveApi;},set(value){if(value&&value!==liveApi&&typeof value.create==='function')fallback=value;}});
}catch{root.MMGold=liveApi;}
})(window);`;

function enhancePublicPage(html){
 if(typeof html!=='string')throw Error('WarXAU HTML required');
 if(html.includes('data-warxau-public-live="'+VERSION+'"'))return html;
 if(!/<\/head\s*>/i.test(html))throw Error('WarXAU head boundary missing');
 const tag='<script defer data-warxau-public-live="'+VERSION+'" src="'+ASSET+'?v='+VERSION+'"></script>\n';
 let output=html.replace(/<\/head\s*>/i,tag+'</head>');
 output=output.split('LIVE · 30 DETIK').join('LIVE · STREAM');
 output=output.split('GOLD API · SPOT').join('LIVE STREAM · BID');
 output=output.split('Gold API · pembaruan sekitar 30 detik. Tidak ada harga simulasi dalam mode LIVE.')
  .join('Stream tick digunakan saat tersedia. Snapshot sumber cadangan aktif hanya ketika stream terputus. Tidak ada harga simulasi.');
 output=output.split('Mode LIVE memakai harga spot Gold API setiap sekitar 30 detik.')
  .join('Mode LIVE memakai tick XAU/USD yang diterima server. Saat stream tidak tersedia, sumber snapshot cadangan digunakan.');
 return output;
}

function wrapPublicPage(req,res){
 const path=pathnameOf(req);if(req.method!=='GET'||path!==PAGE)return false;
 req.headers['accept-encoding']='identity';
 const original={writeHead:res.writeHead,write:res.write,end:res.end};
 const chunks=[];let pending=false,pass=false,size=0;const MAX=2*1024*1024;
 function restore(){Object.assign(res,original);}
 function okay(){const type=String(res.getHeader('content-type')||'');return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/^text\/html\b/i.test(type));}
 function sendHead(){if(pending&&!res.headersSent){pending=false;original.writeHead.call(res,res.statusCode);}}
 function flush(){sendHead();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0;}
 res.writeHead=function(status,message,values){
  if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
  const responseHeaders=typeof message==='string'?values:message;
  if(Array.isArray(responseHeaders)){for(let i=0;i<responseHeaders.length;i+=2)this.setHeader(responseHeaders[i],responseHeaders[i+1]);}
  else if(responseHeaders&&typeof responseHeaders==='object'){for(const [key,value] of Object.entries(responseHeaders))this.setHeader(key,value);}
  this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pending=true;return this;
 };
 res.write=function(chunk,encoding,callback){
  if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
  const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
  if(pass||!okay()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback);}
  chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;
 };
 res.end=function(chunk,encoding,callback){
  if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
  if(pass){restore();return original.end.call(this,chunk,encoding,callback);}
  if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length;}
  if(!okay()||size>MAX){flush();restore();return original.end.call(this,callback);}
  const data=Buffer.concat(chunks,size),raw=data.toString('utf8');let output=raw;
  try{output=enhancePublicPage(raw);}catch{output=raw;}
  const body=Buffer.from(output,'utf8');
  if(output!==raw){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',body.length);this.setHeader('x-marketmarney-xau-live',VERSION);this.setHeader('cache-control','private, no-store');}
  chunks.length=0;sendHead();restore();return original.end.call(this,body,callback);
 };
 return true;
}

function createPublicXauLive({relay,clock=Date.now,watchMs=WATCH_MS,statusMs=STATUS_MS,maxClients=MAX_CLIENTS}={}){
 if(!relay||typeof relay.status!=='function')throw Error('Private relay status is required');
 const clients=new Set();let timer=null,lastKey='',lastState='',lastStatusAt=0;
 function current(){return sanitizeRelayStatus(relay.status(),clock());}
 function broadcast(event,data){for(const res of clients)if(!emit(res,event,data))clients.delete(res);}
 function stopWatcher(){if(timer){clearTimeout(timer);timer=null;}}
 function scan(){
  timer=null;if(!clients.size)return;
  const status=current(),now=clock(),key=status.quote?status.quote.timestamp+':'+status.quote.bid+':'+status.quote.ask:'';
  if(status.state!==lastState||now-lastStatusAt>=statusMs){lastState=status.state;lastStatusAt=now;broadcast('status',{state:status.state,ageMs:status.ageMs,serverTime:status.serverTime,provider:PROVIDER,transport:'sse'});}
  if(status.quote&&key!==lastKey){lastKey=key;broadcast('quote',{quote:status.quote,session:status.session});}
  timer=setTimeout(scan,watchMs);timer.unref?.();
 }
 function startWatcher(){if(!timer&&clients.size){timer=setTimeout(scan,0);timer.unref?.();}}
 function owns(req){const path=pathnameOf(req);return path===ASSET||path===BASE+'/status'||path===BASE+'/stream';}
 function handle(req,res){
  const path=pathnameOf(req);if(!owns(req))return false;
  if(!publicOriginAllowed(req)){json(res,403,{error:'origin_denied'});return true;}
  if(path===ASSET){
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
   const body=Buffer.from(CLIENT);headers(res);res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Content-Length':body.length,'Cache-Control':'public, max-age=300','X-MarketMarney-XAU-Live':VERSION});res.end(req.method==='HEAD'?undefined:body);return true;
  }
  if(req.method!=='GET'){res.writeHead(405,{Allow:'GET','Cache-Control':'no-store'});res.end();return true;}
  if(path===BASE+'/status'){const status=current();json(res,200,{state:status.state,ageMs:status.ageMs,serverTime:status.serverTime,provider:PROVIDER,transport:'sse',quote:status.quote,session:status.session});return true;}
  if(clients.size>=maxClients){json(res,503,{error:'stream_capacity'});return true;}
  headers(res);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no','Connection':'keep-alive','X-MarketMarney-XAU-Live':VERSION});res.flushHeaders?.();clients.add(res);
  const status=current();emit(res,'status',{state:status.state,ageMs:status.ageMs,serverTime:status.serverTime,provider:PROVIDER,transport:'sse'});if(status.quote)emit(res,'quote',{quote:status.quote,session:status.session});
  startWatcher();res.on('close',()=>{clients.delete(res);if(!clients.size){stopWatcher();lastKey='';lastState='';}});return true;
 }
 return {owns,handle,current,wrapPage:wrapPublicPage,close(){stopWatcher();for(const res of clients)res.end();clients.clear();},metadata(){return {version:VERSION,base:BASE,asset:ASSET,transport:'sse',watchMs,statusMs,maxClients,provider:PROVIDER};}};
}

module.exports={VERSION,BASE,ASSET,PAGE,PROVIDER,FRESH_MS,WATCH_MS,STATUS_MS,MAX_CLIENTS,CLIENT,sanitizeRelayStatus,enhancePublicPage,wrapPublicPage,createPublicXauLive};
