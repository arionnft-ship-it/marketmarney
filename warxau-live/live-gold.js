/* WarXAU 7.7 — real public XAU/USD snapshots; no keys, synthetic ticks or broker claims.
 * Source docs: https://gold-api.com/llms.txt and https://gold-api.com/faqs
 * Prices are fetched at most once per 30 seconds in this page. UTC daily boundaries
 * belong to MarketMarney's observed-snapshot session, not a broker/exchange calendar.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MMGold=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const URL='https://api.gold-api.com/price/XAU', PROVIDER='Gold API · XAU/USD spot', INTERVAL=30000, MAX_AGE=150000, DAY=86400000;
const MESSAGES={stale:'Harga sumber sudah lebih dari 150 detik. Arena dijeda; tidak ada harga simulasi.',future:'Waktu data sumber tidak valid. Arena dijeda.',symbol:'Sumber tidak mengembalikan XAU dalam USD.',price:'Harga sumber tidak valid.',timestamp:'Timestamp sumber tidak valid.',clock:'Jam perangkat berbeda dari server. Aktifkan sinkronisasi waktu perangkat lalu hubungkan ulang.',sync:'Waktu server belum dapat diverifikasi. Arena tidak dimulai.',network:'Feed harga terputus. Arena dijeda; mencoba ulang tanpa beralih ke DEMO.',order:'Timestamp sumber bergerak mundur. Arena dijeda.',payload:'Respons sumber tidak valid.'};
function fail(code){const e=new Error(MESSAGES[code]||MESSAGES.network);e.code=code;throw e;}
function normalize(raw,now=Date.now()){
 if(!raw||raw.symbol!=='XAU'||raw.currency!=='USD')fail('symbol');
 if(typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0||raw.price>1000000)fail('price');
 if(typeof raw.updatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(raw.updatedAt))fail('timestamp');
 const timestamp=Date.parse(raw.updatedAt);if(!Number.isSafeInteger(timestamp))fail('timestamp');
 if(timestamp>now+5000)fail('future');if(now-timestamp>MAX_AGE)fail('stale');
 // Preserve the upstream value: no interpolation, random movement, or manufactured timestamp.
 return {symbol:'XAU/USD',price:raw.price,timestamp,mode:'live',provider:PROVIDER};
}
function sessionFor(q,now){
 const opensAt=Math.floor(q.timestamp/DAY)*DAY;
 return {id:'mm-gold-utc-'+new Date(opensAt).toISOString().slice(0,10),symbol:'XAU/USD',timeframe:'1day',mode:'live',provider:PROVIDER,timezone:'UTC',opensAt,closesAt:opensAt+DAY,serverTime:Math.floor(now),confirmedClosed:false};
}
let sharedNext=0, diagnostic={state:'idle',source:URL,provider:PROVIDER,intervalMs:INTERVAL,calendar:'MarketMarney D1 UTC — bukan kalender broker',requests:0,received:0};
function diagnostics(){return {...diagnostic};}
function create({onQuote,onStatus,fetcher=globalThis.fetch?.bind(globalThis),wall=()=>Date.now(),mono=()=>performance.now(),timer=setTimeout,cancel=clearTimeout}={}){
 if(typeof fetcher!=='function'||typeof onQuote!=='function')throw Error('Feed callbacks required');
 let closed=false,task=null,controller=null,timeout=null,failures=0,lastStamp=null,lastPrice=null,syncAt=-Infinity,anchorServer=0,anchorMono=0;
 const emit=(state,code)=>{diagnostic={...diagnostic,state,error:code||null};onStatus?.({state,code,message:MESSAGES[code]||''});};
 const now=()=>anchorServer+Math.max(0,mono()-anchorMono);
 async function request(url,options={},readBody=false){controller=new AbortController();timeout=timer(()=>controller?.abort(),8000);try{const r=await fetcher(url,{credentials:'omit',redirect:'error',signal:controller.signal,...options});if(!r.ok)fail('network');if(readBody){const txt=await r.text();if(txt.length>16384)fail('payload');return txt;}return r;}finally{cancel(timeout);timeout=null;}}
 async function sync(){
  const t=mono(),r=await request('/_railway/health',{cache:'no-store',credentials:'same-origin'}),end=mono();
  const server=Date.parse(r.headers.get('date')||'');
  if(!Number.isFinite(server)||end-t>8000)fail('sync');
  anchorServer=server+(end-t)/2;anchorMono=end;syncAt=end;
  // Original engines also use wall time for freshness. Fail closed on skew instead of
  // rewriting a visitor's clock or silently misclassifying old quotes as fresh.
  if(Math.abs(wall()-now())>5000)fail('clock');
 }
 async function poll(){
  if(closed)return;
  try{
   if(mono()-syncAt>300000)await sync();if(closed)return;
   if(Math.abs(wall()-now())>5000)fail('clock');
   const wait=sharedNext-wall();if(wait>0){task=timer(poll,Math.max(100,wait));return;}
   sharedNext=wall()+INTERVAL;diagnostic.requests++;
   const txt=await request(URL,{cache:'default',mode:'cors',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}},true);
   if(closed)return;
   let raw;try{raw=JSON.parse(txt);}catch{fail('payload');}
   const q=normalize(raw,now());
   if(lastStamp!==null&&q.timestamp<lastStamp)fail('order');
   if(q.timestamp===lastStamp){if(q.price!==lastPrice)fail('order');}
   else{
    const meta=sessionFor(q,now());
    lastStamp=q.timestamp;lastPrice=q.price;diagnostic.received++;
    diagnostic={...diagnostic,state:'live',error:null,lastPrice:q.price,lastTimestamp:q.timestamp,receivedAt:Math.floor(now()),sessionId:meta.id};
    onQuote({...q,sessionId:meta.id},meta);
   }
   failures=0;
  }catch(e){if(closed)return;failures++;syncAt=-Infinity;const code=Object.hasOwn(MESSAGES,e?.code)?e.code:'network';emit(code==='stale'?'stale':'error',code);}
  if(!closed)task=timer(poll,failures?Math.min(180000,INTERVAL*2**Math.min(failures,3)):INTERVAL);
 }
 emit('waiting');task=timer(poll,0);
 return {close(){closed=true;cancel(task);cancel(timeout);controller?.abort();},diagnostics};
}
return {URL,PROVIDER,INTERVAL,MAX_AGE,normalize,sessionFor,create,diagnostics};
});
