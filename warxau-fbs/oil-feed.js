/* OIL WAR: read-only xyz:CL trade stream, not broker oil/spot or a trading client.
 * Public API: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions
 * Keep original trade timestamps. Never use candle close, mark, or oracle as a fabricated tick.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MMOil=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const URL='wss://api.hyperliquid.xyz/ws',INFO='https://api.hyperliquid.xyz/info',COIN='xyz:CL',SYMBOL='WTI-PERP',PROVIDER='trade[XYZ]/Hyperliquid · WTI perp',DAY=86400000,MAX_AGE=30000,DISPLAY_MS=250;
let diag={state:'idle',provider:PROVIDER,symbol:SYMBOL,coin:COIN,transport:'WebSocket',receivedTrades:0,displaySamples:0,reconnects:0,lastPrice:null,lastTimestamp:null};
function validTrade(raw,now){
 if(!raw||raw.coin!==COIN||typeof raw.px!=='string'||!/^\d+(?:\.\d+)?$/.test(raw.px)||!Number.isSafeInteger(raw.time)||!Number.isSafeInteger(raw.tid)||raw.tid<0)return null;
 const price=Number(raw.px);if(!Number.isFinite(price)||price<=0||price>1000000||raw.time>now+5000||now-raw.time>MAX_AGE)return null;
 return {symbol:SYMBOL,price,timestamp:raw.time,tradeId:raw.tid,mode:'live',provider:PROVIDER};
}
function candle(raw){
 if(raw?.s!==COIN||raw.i!=='1d'||!Number.isSafeInteger(raw.t)||!Number.isSafeInteger(raw.T)||raw.t<=0||raw.t%DAY!==0||raw.T!==raw.t+DAY-1)return null;
 return {opensAt:raw.t,closesAt:raw.T+1};
}
function sessionFor(q,bar,now){if(!bar||q.timestamp<bar.opensAt||q.timestamp>=bar.closesAt||now<bar.opensAt||now>=bar.closesAt)return null;
 return {id:'hl-wti-d1-'+new Date(bar.opensAt).toISOString().slice(0,10),symbol:SYMBOL,timeframe:'1day',mode:'live',provider:PROVIDER,timezone:'UTC',opensAt:bar.opensAt,closesAt:bar.closesAt,serverTime:Math.floor(now),confirmedClosed:false};}
function create({onQuote,onStatus,fetcher=globalThis.fetch?.bind(globalThis),Socket=globalThis.WebSocket,wall=()=>Date.now(),mono=()=>performance.now(),timer=setTimeout,cancel=clearTimeout}={}){
 if(typeof onQuote!=='function'||!Socket||!fetcher)throw Error('Oil feed prerequisites missing');
 let closed=false,revision=0,socket=null,retry=null,watch=null,flushTask=null,resync=null,attempt=0,anchorServer=0,anchorMono=0,lastMessage=0,lastPing=0,lastFresh=0,lastSent=-1,pending=null,bar=null,stale=false;
 const seen=new Set(),controllers=new Set();
 diag={state:'waiting',provider:PROVIDER,symbol:SYMBOL,coin:COIN,transport:'WebSocket',receivedTrades:0,displaySamples:0,reconnects:0,lastPrice:null,lastTimestamp:null};
 const now=()=>anchorServer+Math.max(0,mono()-anchorMono);
 const emit=(state,message)=>{diag.state=state;onStatus?.({state,message});};
 async function json(url,options={}){const a=new AbortController();controllers.add(a);const t=timer(()=>a.abort(),8000);try{const r=await fetcher(url,{credentials:'omit',redirect:'error',signal:a.signal,...options});if(!r.ok)throw Error('HTTP '+r.status);const text=await r.text();if(text.length>262144)throw Error('Response too large');return JSON.parse(text);}finally{cancel(t);controllers.delete(a);}}
 const info=body=>json(INFO,{method:'POST',mode:'cors',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 function clear(){revision++;cancel(watch);cancel(flushTask);cancel(resync);flushTask=null;pending=null;bar=null;lastSent=-1;seen.clear();for(const a of controllers)a.abort();controllers.clear();const s=socket;socket=null;if(s){s.onopen=s.onmessage=s.onerror=s.onclose=null;try{s.close();}catch{}}}
 function reconnect(message){if(closed)return;clear();cancel(retry);attempt++;diag.reconnects++;emit('error',message||'Feed minyak terputus. Arena dijeda; tidak beralih ke DEMO.');retry=timer(connect,Math.min(30000,1000*2**Math.min(attempt,5)));}
 async function sync(rev){const t=mono(),d=await json('/api/oil-war/clock',{cache:'no-store'}),end=mono();if(closed||rev!==revision)return false;if(!Number.isSafeInteger(d.now)||end-t>8000)throw Error('Jam server tidak valid');anchorServer=d.now+(end-t)/2;anchorMono=end;if(Math.abs(wall()-now())>5000)throw Error('Aktifkan sinkronisasi jam perangkat');return true;}
 function takeBar(raw){const b=candle(raw);if(b&&b.opensAt<=now()&&now()<b.closesAt&&(!bar||b.opensAt>=bar.opensAt)){bar=b;diag.dailyOpen=b.opensAt;}}
 function flush(){flushTask=null;if(closed||!pending||!bar)return;const q=pending,meta=sessionFor(q,bar,now());if(!meta)return;pending=null;if(now()-q.timestamp>MAX_AGE||q.timestamp<=lastSent)return;lastSent=q.timestamp;attempt=0;stale=false;diag.state='live';diag.lastPrice=q.price;diag.lastTimestamp=q.timestamp;diag.displaySamples++;onQuote({...q,sessionId:meta.id},meta);}
 function schedule(){if(flushTask===null)flushTask=timer(flush,DISPLAY_MS);}
 function watchdog(){if(closed)return;const t=mono();if(t-lastMessage>35000){reconnect('Stream minyak tidak merespons. Mencoba menyambung kembali.');return;}if(socket?.readyState===1&&t-lastPing>=10000){lastPing=t;try{socket.send(JSON.stringify({method:'ping'}));}catch{reconnect();return;}}
 if(t-lastFresh>MAX_AGE&&!stale){stale=true;emit('stale','Belum ada transaksi minyak segar selama 30 detik. Perang dijeda; harga lama tidak dianggap baru.');}watch=timer(watchdog,1000);}
 async function connect(){if(closed)return;clear();const rev=revision;emit('waiting','Menghubungkan WTI perpetual…');try{
 if(!await sync(rev))return;
 const meta=await info({type:'meta',dex:'xyz'});if(closed||rev!==revision)return;
 const markets=meta?.universe?.filter(x=>x.name===COIN&&!x.isDelisted);if(!markets||markets.length!==1)throw Error('Kontrak WTI tidak tersedia pada sumber');
 const bars=await info({type:'candleSnapshot',req:{coin:COIN,interval:'1d',startTime:Math.floor(now())-2*DAY,endTime:Math.floor(now())}});if(closed||rev!==revision)return;
 if(!Array.isArray(bars)||bars.length>10)throw Error('Data candle daily tidak valid');for(const x of bars)takeBar(x);
 socket=new Socket(URL);
 }catch(e){if(!closed&&rev===revision)reconnect('Sumber WTI belum siap: '+String(e.message).slice(0,90));return;}
 const ws=socket;lastMessage=lastFresh=lastPing=mono();stale=false;
 ws.onopen=()=>{if(closed||rev!==revision)return;for(const subscription of [{type:'trades',coin:COIN},{type:'candle',coin:COIN,interval:'1d'}])ws.send(JSON.stringify({method:'subscribe',subscription}));};
 ws.onmessage=e=>{if(closed||rev!==revision||typeof e.data!=='string'||e.data.length>262144)return;let d;try{d=JSON.parse(e.data);}catch{return;}lastMessage=mono();
 if(d.channel==='error'||d.error){reconnect('Langganan WTI ditolak sumber. Tidak menggunakan harga simulasi.');return;}
 if(d.channel==='candle'){for(const x of Array.isArray(d.data)?d.data:[d.data])takeBar(x);schedule();return;}
 if(d.channel!=='trades'||!Array.isArray(d.data)||d.data.length>2000)return;
 let latest=null;for(const raw of d.data){const q=validTrade(raw,now());if(!q)continue;const key=q.timestamp+':'+q.tradeId;if(seen.has(key))continue;seen.add(key);while(seen.size>1024)seen.delete(seen.values().next().value);diag.receivedTrades++;if(q.timestamp>lastSent&&(!latest||q.timestamp>=latest.timestamp))latest=q;}
 if(latest){lastFresh=mono();if(!pending||latest.timestamp>=pending.timestamp)pending=latest;schedule();}
 };
 ws.onclose=()=>{if(!closed&&rev===revision)reconnect();};ws.onerror=()=>{if(!closed&&rev===revision)reconnect();};watch=timer(watchdog,1000);
 const again=()=>{resync=timer(async()=>{if(closed||rev!==revision)return;try{if(!await sync(rev))return;}catch{if(!closed&&rev===revision)reconnect('Sinkronisasi waktu gagal. Arena dijeda.');return;}if(!closed&&rev===revision)again();},300000);};again();
 }
 void connect();return {close(){closed=true;cancel(retry);clear();diag.state='closed';},diagnostics:()=>({...diag})};
}
return {URL,INFO,COIN,SYMBOL,PROVIDER,MAX_AGE,DISPLAY_MS,validTrade,candle,sessionFor,create,diagnostics:()=>({...diag})};
});
