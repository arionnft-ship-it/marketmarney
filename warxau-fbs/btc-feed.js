/* BTCUSD War — public Kraken BTC/USD trades + D1 candles. No orders or account access.
 * Docs: https://docs.kraken.com/api/docs/websocket-v2/trade/
 * Display samples coalesced to <=4/second; never interpolated. Snapshot history is not replayed.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MMBTC=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const URL='wss://ws.kraken.com/v2',PROVIDER='Kraken · BTC/USD spot',DAY=86400000,MAX_AGE=30000,DISPLAY_MS=250;
const diag={state:'idle',provider:PROVIDER,symbol:'BTC/USD',transport:'WebSocket',receivedTrades:0,displaySamples:0,reconnects:0,lastPrice:null,lastTimestamp:null,dailyOpen:null};
function validTrade(raw,now){if(!raw||raw.symbol!=='BTC/USD'||typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0||raw.price>1e9||!Number.isSafeInteger(raw.trade_id)||raw.trade_id<0)return null;
 if(typeof raw.timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(raw.timestamp))return null;
 const timestamp=Date.parse(raw.timestamp);if(!Number.isSafeInteger(timestamp)||timestamp>now+5000||now-timestamp>MAX_AGE)return null;
 return {symbol:'BTC/USD',price:raw.price,timestamp,mode:'live',provider:PROVIDER,tradeId:raw.trade_id};}
function candleBegin(raw){if(raw?.symbol!=='BTC/USD'||raw.interval!==1440||typeof raw.interval_begin!=='string'||!raw.interval_begin.endsWith('Z'))return null;const b=Date.parse(raw.interval_begin);return Number.isSafeInteger(b)&&b>0&&b%DAY===0?b:null;}
function sessionFor(quote,begin,now){if(!Number.isSafeInteger(begin)||quote.timestamp<begin||quote.timestamp>=begin+DAY||now<begin||now>=begin+DAY)return null;return {id:'kraken-btc-d1-'+new Date(begin).toISOString().slice(0,10),symbol:'BTC/USD',timeframe:'1day',mode:'live',provider:PROVIDER,timezone:'UTC',opensAt:begin,closesAt:begin+DAY,serverTime:Math.floor(now),confirmedClosed:false};}
function create({onQuote,onStatus,fetcher=globalThis.fetch?.bind(globalThis),Socket=globalThis.WebSocket,wall=()=>Date.now(),mono=()=>performance.now(),timer=setTimeout,cancel=clearTimeout}={}){
 if(typeof onQuote!=='function'||!Socket||!fetcher)throw Error('BTC feed prerequisites missing');
 let closed=false,socket=null,retry=null,tick=null,flushTask=null,abort=null,deadline=null,syncTask=null,generation=0,attempt=0;
 let anchorServer=0,anchorMono=0,lastTransport=0,lastTradeAt=0,lastId=-1,lastSent=-1,pending=null,begin=null,stale=false;
 const now=()=>anchorServer+Math.max(0,mono()-anchorMono);
 const emit=(state,message)=>{diag.state=state;onStatus?.({state,message});};
 function clearSocket(){generation++;cancel(tick);cancel(flushTask);cancel(syncTask);cancel(deadline);abort?.abort();abort=null;flushTask=null;pending=null;lastId=-1;lastSent=-1;begin=null;const s=socket;socket=null;if(s){s.onopen=s.onmessage=s.onclose=s.onerror=null;try{s.close();}catch{}}}
 function later(message){if(closed)return;clearSocket();cancel(retry);attempt++;diag.reconnects++;emit('error',message||'Stream Bitcoin terputus. Arena dijeda; mencoba tersambung kembali.');retry=timer(connect,Math.min(30000,1000*2**Math.min(attempt,5))+Math.floor(Math.random()*300));}
 async function sync(){const t=mono(),controller=new AbortController();abort=controller;const limit=timer(()=>controller.abort(),8000);deadline=limit;try{const r=await fetcher('/api/btc-war/clock',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok)throw Error('clock');const d=await r.json();if(!Number.isSafeInteger(d.now)||mono()-t>8000)throw Error('clock');anchorServer=d.now+(mono()-t)/2;anchorMono=mono();if(Math.abs(wall()-now())>5000)throw Error('Aktifkan sinkronisasi jam perangkat.');}finally{cancel(limit);if(abort===controller){deadline=null;abort=null;}}}
 function flush(){flushTask=null;if(closed||!pending||begin===null)return;const q=pending,meta=sessionFor(q,begin,now());if(!meta)return;if(now()-q.timestamp>MAX_AGE){pending=null;return;}if(q.timestamp<=lastSent){pending=null;return;}pending=null;lastSent=q.timestamp;attempt=0;stale=false;diag.state='live';diag.lastPrice=q.price;diag.lastTimestamp=q.timestamp;diag.dailyOpen=begin;diag.displaySamples++;onQuote({...q,sessionId:meta.id},meta);}
 function schedule(){if(!flushTask)flushTask=timer(flush,DISPLAY_MS);}
 function watchdog(){if(closed)return;const n=mono();if(n-lastTransport>15000){later('Koneksi Bitcoin tidak merespons. Arena dijeda.');return;}if(n-lastTradeAt>MAX_AGE&&!stale){stale=true;emit('stale','Belum ada transaksi BTC/USD segar selama 30 detik. Harga terakhir tidak dianggap baru.');}tick=timer(watchdog,1000);}
 async function connect(){if(closed)return;clearSocket();const rev=generation;emit('waiting','Menghubungkan stream BTC/USD Kraken…');try{await sync();}catch(e){if(!closed&&rev===generation)later(e.message==='Aktifkan sinkronisasi jam perangkat.'?e.message:'Waktu server belum terverifikasi. Mencoba kembali tanpa membuat harga.');return;}if(closed||rev!==generation)return;
 try{socket=new Socket(URL);}catch{later();return;}const ws=socket;lastTransport=lastTradeAt=mono();
 ws.onopen=()=>{if(closed||rev!==generation)return;ws.send(JSON.stringify({method:'subscribe',params:{channel:'trade',symbol:['BTC/USD'],snapshot:true},req_id:1}));ws.send(JSON.stringify({method:'subscribe',params:{channel:'ohlc',symbol:['BTC/USD'],interval:1440,snapshot:true},req_id:2}));};
 ws.onmessage=e=>{if(closed||rev!==generation||typeof e.data!=='string'||e.data.length>262144)return;let d;try{d=JSON.parse(e.data);}catch{return;}lastTransport=mono();
 if(d.success===false){later('Langganan data Bitcoin ditolak sumber. Tidak mengganti harga dengan simulasi.');return;}
 if(d.channel==='status'&&d.data?.[0]?.system&&d.data[0].system!=='online'){later('Kraken sedang tidak online. Arena Bitcoin dijeda.');return;}
 if(d.channel==='ohlc'&&Array.isArray(d.data)){for(const bar of d.data){const b=candleBegin(bar);if(b!==null&&b<=now()&&now()<b+DAY&&(begin===null||b>=begin))begin=b;}schedule();return;}
 if(d.channel!=='trade'||!['snapshot','update'].includes(d.type)||!Array.isArray(d.data))return;
 let latest=null;for(const raw of d.data){const q=validTrade(raw,now());if(q&&q.tradeId>lastId){lastId=q.tradeId;diag.receivedTrades++;if(!latest||q.timestamp>=latest.timestamp)latest=q;}}
 if(latest){lastTradeAt=mono();pending=latest;schedule();}
 };
 ws.onclose=()=>{if(!closed&&rev===generation)later();};ws.onerror=()=>{if(!closed&&rev===generation)later();};tick=timer(watchdog,1000);
 function resync(){syncTask=timer(async()=>{if(closed||rev!==generation)return;try{await sync();}catch{if(!closed&&rev===generation)later('Sinkronisasi waktu terputus. Arena dijeda.');return;}if(!closed&&rev===generation)resync();},300000);}resync();
 }
 connect();return {close(){closed=true;cancel(retry);cancel(syncTask);cancel(deadline);abort?.abort();clearSocket();diag.state='closed';},diagnostics:()=>({...diag})};
}
return {URL,PROVIDER,MAX_AGE,DISPLAY_MS,validTrade,candleBegin,sessionFor,create,diagnostics:()=>({...diag})};
});
