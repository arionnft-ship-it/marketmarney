'use strict';
// One shared publisher-feed poll per website process, broadcast over SSE.
// Heartbeats each second; source polls are deliberately rate-limited, never
// presented as a claim that a publisher releases news every second.
const crypto=require('node:crypto');
const ENDPOINT='/api/terminal/live';
const SESSION=crypto.randomUUID();
const MAX_CLIENTS=120;
function articlePreview(a){
 if(!a||!a.id||String(a.status)!=='published')return null;
 const s=(v,max)=>String(v==null?'':v).trim().slice(0,max);
 if(!s(a.title,240))return null;
 return {id:s(a.id,145),title:s(a.title,240),cat:s(a.cat||a.category,30),
  desc:s(a.desc||a.summary,450),status:'published',
  sourceName:s(a.sourceName,100),date:s(a.date||a.createdAt,50),updatedAt:s(a.updatedAt,50)};
}
function tickerPreview(h){
 if(!h||!h.title||!h.url)return null;
 const s=(v,max)=>String(v==null?'':v).trim().slice(0,max);
 let safe;
 try{
  const u=new URL(h.url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!['actionforex.com','marketpulse.com','federalreserve.gov'].some(x=>u.hostname===x||u.hostname.endsWith('.'+x)))return null;
  safe=u.href;
 }catch{return null}
 return {id:s(h.id,80),title:s(h.title,230),url:safe,source:s(h.source,50),published:s(h.published,50)};
}
function createTerminalLive({fetchImpl=globalThis.fetch,now=Date.now,
 origin='https://marketmarney.com',articleMs=15000,tickerMs=60000,tickMs=1000,
 setIntervalFn=setInterval,clearIntervalFn=clearInterval,maxClients=MAX_CLIENTS}={}){
 const watchers=new Set();
 let timer=null,pending=null,articles=[],headlines=[],checkedArticles=0,checkedTicker=0,lastArticleSuccess=0,lastTickerSuccess=0;
 let lastSignature='',revision=0;
 function sourceHealth(){
  const t=now();
  const one=(success,attempt,ttl,interval)=>({
   status:success?(t-success<=ttl?'fresh':'stale'):(attempt?'unavailable':'checking'),
   lastSuccess:success?new Date(success).toISOString():null,
   ageSeconds:success?Math.max(0,Math.floor((t-success)/1000)):null,
   retrySeconds:attempt?Math.max(0,Math.ceil((attempt+interval-t)/1000)):0
  });
  return {marney:one(lastArticleSuccess,checkedArticles,articleMs*3,articleMs),external:one(lastTickerSuccess,checkedTicker,tickerMs*3,tickerMs)};
 }
 function owns(req){return String(req?.url||'').split('?')[0]===ENDPOINT}
 function payload(){
  return {session:SESSION,revision,articles,headlines,checkedAt:new Date(now()).toISOString(),
   sources:sourceHealth(),
   lastSuccess:{marney:lastArticleSuccess?new Date(lastArticleSuccess).toISOString():null,
    external:lastTickerSuccess?new Date(lastTickerSuccess).toISOString():null}};
 }
 function broadcast(event,value){
  const str='event: '+event+'\ndata: '+JSON.stringify(value)+'\n\n';
  for(const res of [...watchers]){
   try{
    if(res.destroyed||res.writableEnded){watchers.delete(res);continue}
    if(res.writableLength>262144){watchers.delete(res);res.end();continue}
    res.write(str);
   }catch{watchers.delete(res);try{res.end()}catch{}}
  }
 }
 async function getJson(route){
  const url=new URL(route,origin);
  if(url.origin!==new URL(origin).origin||!['/api/content','/api/marketmarney/news-ticker'].includes(url.pathname))throw Error('endpoint_not_allowed');
  const response=await fetchImpl(url.href,{method:'GET',redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('status_'+response.status);
  return response.json();
 }
 async function refresh(){
  if(pending)return pending;
  const t=now();
  const dueA=!checkedArticles||t-checkedArticles>=articleMs;
  const dueT=!checkedTicker||t-checkedTicker>=tickerMs;
  if(!dueA&&!dueT)return false;
  pending=(async()=>{
   const tasks=[];
   if(dueA){checkedArticles=t;tasks.push((async()=>{
    try{
     const result=await getJson('/api/content');
     if(!Array.isArray(result?.articles))throw Error('articles_missing');
     articles=result.articles.map(articlePreview).filter(Boolean).slice(-150);
     lastArticleSuccess=now();
    }catch(e){console.warn('MM_TERMINAL_ARTICLE_POLL',String(e.message).slice(0,80))}
   })())}
   if(dueT){checkedTicker=t;tasks.push((async()=>{
    try{
     const result=await getJson('/api/marketmarney/news-ticker');
     if(!Array.isArray(result?.headlines))throw Error('headlines_missing');
     headlines=result.headlines.map(tickerPreview).filter(Boolean).slice(0,32);
     lastTickerSuccess=now();
    }catch(e){console.warn('MM_TERMINAL_TICKER_POLL',String(e.message).slice(0,80))}
   })())}
   await Promise.all(tasks);
   const signature=crypto.createHash('sha256').update(JSON.stringify([articles,headlines])).digest('hex');
   if(signature!==lastSignature){lastSignature=signature;revision++;broadcast('news',payload());return true}
   return false;
  })().finally(()=>{pending=null});
  return pending;
 }
 function tick(){
  if(!watchers.size)return;
  const t=now();
  broadcast('heartbeat',{at:t,revision,sourceHealth:sourceHealth(),articleAge:lastArticleSuccess?t-lastArticleSuccess:null,tickerAge:lastTickerSuccess?t-lastTickerSuccess:null});
  void refresh();
 }
 function stop(){
  if(timer!=null){clearIntervalFn(timer);timer=null}
 }
 function start(){
  if(timer!=null)return;
  timer=setIntervalFn(tick,tickMs);
  if(typeof timer.unref==='function')timer.unref();
  void refresh();
 }
 function handle(req,res){
  if(!owns(req))return false;
  if(req.method!=='GET'){
   res.writeHead(405,{'Allow':'GET','Cache-Control':'no-store','Content-Length':'0'});res.end();return true;
  }
  if(watchers.size>=maxClients){
   res.writeHead(503,{'content-type':'text/plain; charset=utf-8','retry-after':'10'});res.end('Live feed is busy');return true;
  }
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8',
   'Cache-Control':'no-cache, no-transform','Connection':'keep-alive',
   'X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'https://marketmarney.com'});
  if(typeof res.flushHeaders==='function')res.flushHeaders();
  watchers.add(res);
  res.write('retry: 4000\n\n');
  res.write('event: news\ndata: '+JSON.stringify(payload())+'\n\n');
  function end(){
   watchers.delete(res);
   if(!watchers.size)stop();
  }
  req.on('aborted',end);res.on('close',end);
  start();
  return true;
 }
 return {owns,handle,refresh,tick,stop,payload,subscribers:()=>watchers.size};
}
module.exports={ENDPOINT,MAX_CLIENTS,articlePreview,tickerPreview,createTerminalLive};
