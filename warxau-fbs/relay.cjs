'use strict';
// Price-only private receiver. No broker login, orders, balances or account IDs.
const crypto=require('node:crypto');
const BASE='/api/xau-war/mt4';
const COOKIE='__Secure-warxau_fbs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fields=new Set(['schema','instrument','brokerSymbol','brokerServer','streamId','sequence','bid','ask','digits','tickServerTime','receivedUtc','sentUtc','localAgeMs','dailyOpenServer','previousDailyOpenServer','previousDailyClose']);
function fault(status,code){return Object.assign(new Error(code),{status,code});}
function normalize(p,now,expectedServer){
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!fields.has(k)))throw fault(400,'invalid_fields');
 if(p.schema!=='warxau.mt4.price.v1'||p.instrument!=='XAU/USD')throw fault(400,'invalid_schema');
 if(typeof p.brokerSymbol!=='string'||!/^XAUUSD[._A-Za-z0-9-]{0,12}$/.test(p.brokerSymbol)||p.brokerServer!==expectedServer)throw fault(400,'wrong_source');
 if(typeof p.streamId!=='string'||!/^\d{9,12}-\d{1,12}$/.test(p.streamId))throw fault(400,'invalid_stream');
 for(const k of ['sequence','digits','tickServerTime','receivedUtc','sentUtc','localAgeMs','dailyOpenServer','previousDailyOpenServer'])if(!Number.isSafeInteger(p[k]))throw fault(400,'invalid_integer');
 if(p.sequence<1||p.digits<0||p.digits>8||p.tickServerTime<=0||p.localAgeMs<0||p.localAgeMs>5000)throw fault(422,'invalid_tick');
 if(Math.abs(now-p.sentUtc*1000)>30000||now-p.receivedUtc*1000>30000||p.receivedUtc>p.sentUtc+2||p.receivedUtc*1000>now+5000)throw fault(422,'stale_or_skewed');
 if(typeof p.bid!=='number'||typeof p.ask!=='number'||!Number.isFinite(p.bid)||!Number.isFinite(p.ask)||p.bid<=0||p.ask<p.bid||p.ask>=1000000)throw fault(400,'invalid_price');
 if(p.dailyOpenServer<0||p.dailyOpenServer>p.tickServerTime||p.previousDailyOpenServer<0||p.previousDailyOpenServer>p.dailyOpenServer)throw fault(400,'invalid_bar');
 if(typeof p.previousDailyClose!=='number'||!Number.isFinite(p.previousDailyClose)||p.previousDailyClose<0||p.previousDailyClose>=1000000)throw fault(400,'invalid_close');
 const opened=Math.floor(now/86400000)*86400000,provider='FBS MT4 · BID — privat';
 // timestamp is RELAY RECEIPT time, explicitly not broker/exchange execution time.
 const session={id:'mm-fbs-observed-utc-'+new Date(opened).toISOString().slice(0,10),symbol:'XAU/USD',timeframe:'1day',mode:'live',provider,timezone:'UTC',opensAt:opened,closesAt:opened+86400000,serverTime:now,confirmedClosed:false};
 return {quote:{symbol:'XAU/USD',price:p.bid,bid:p.bid,ask:p.ask,timestamp:now,mode:'live',provider,sessionId:session.id,timestampBasis:'relay-receipt',brokerSymbol:p.brokerSymbol,brokerServer:p.brokerServer,brokerServerTime:p.tickServerTime,terminalObservedUtc:p.receivedUtc*1000,localAgeMs:p.localAgeMs},session,sequence:p.sequence,streamId:p.streamId,fingerprint:sha(JSON.stringify(p))};
}
function createRelay({writeHash,readHash,expiresAt,expectedServer='FBS-Real-5',clock=Date.now,privatePage=()=>null}={}){
 if(!/^[a-f0-9]{64}$/.test(writeHash||'')||!/^[a-f0-9]{64}$/.test(readHash||'')||writeHash===readHash||!Number.isFinite(expiresAt))throw Error('Invalid private relay configuration');
 let latest=null,accepted=0,currentStream=null;const sequences=new Map(),clients=new Set(),limits=new Map();
 function authorized(value,expected){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&clock()<expiresAt&&crypto.timingSafeEqual(Buffer.from(sha(value),'hex'),Buffer.from(expected,'hex'));}
 function bearer(req){const a=req.headers.authorization;return typeof a==='string'&&a.startsWith('Bearer ')?a.slice(7):null;}
 function reader(req){const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));return authorized(bearer(req)||(cookie?cookie.slice(COOKIE.length+1):null),readHash);}
 function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cross-Origin-Resource-Policy','same-origin');}
 function json(res,status,data){headers(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
 function status(){const age=latest?Math.max(0,clock()-latest.quote.timestamp):null;const fresh=age!==null&&age<=5000;return {configured:true,scope:'private',version:'1.0',state:fresh?'live':latest?'stale':'waiting',accepted,ageMs:age,serverTime:clock(),source:'FBS MT4 · BID',publicDisplay:false,quote:fresh?latest.quote:null,dailySession:latest?.session||null};}
 function emit(res,event,data){if(res.destroyed)return false;if(res.writableLength>131072){res.end();return false;}res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');return true;}
 function broadcast(event,data){for(const res of clients)emit(res,event,data);}
 function rate(req){const key=req.socket.remoteAddress||'unknown',now=clock();let x=limits.get(key);if(!x||now-x.since>=1000){if(limits.size>=1024)limits.delete(limits.keys().next().value);x={since:now,n:0};limits.set(key,x);}return ++x.n<=12;}
 async function body(req){if(req.headers['content-encoding'])throw fault(415,'encoding_not_allowed');if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw fault(415,'json_required');if(Number(req.headers['content-length'])>4096)throw fault(413,'body_too_large');return await new Promise((resolve,reject)=>{let raw='',n=0,done=false;const t=setTimeout(()=>end(fault(408,'body_timeout')),3000);t.unref();function end(e,v){if(done)return;done=true;clearTimeout(t);e?reject(e):resolve(v);}req.on('data',b=>{n+=b.length;if(n>4096){end(fault(413,'body_too_large'));return;}raw+=b.toString('utf8');});req.on('end',()=>{try{end(null,JSON.parse(raw));}catch{end(fault(400,'invalid_json'));}});req.on('error',()=>end(fault(400,'request_error')));req.on('aborted',()=>end(fault(400,'request_aborted')));});}
 function owns(req){const path=String(req.url||'').split('?')[0];return path===BASE||path.startsWith(BASE+'/');}
 async function handle(req,res){
  try{
   const path=String(req.url||'').split('?')[0];
   if(!owns(req))return false;
   headers(res);
   // There is no public CORS access. MT4 has no Origin header.
   if(req.headers.origin&&req.headers.origin!=='https://marketmarney.com')throw fault(403,'origin_denied');
   if(path===BASE+'/health'&&req.method==='GET'){json(res,200,{ok:true,receiver:'ready',version:'1.0',authentication:'required',publicDisplay:false});return true;}
   if(!rate(req))throw fault(429,'rate_limited');
   if(path===BASE+'/pair'&&req.method==='POST'){
    const p=await body(req);if(!authorized(p?.key,readHash))throw fault(401,'invalid_read_key');
    res.setHeader('Set-Cookie',COOKIE+'='+p.key+'; Path='+BASE+'; Secure; HttpOnly; SameSite=Strict; Max-Age=7200');json(res,200,{ok:true});return true;
   }
   if(path===BASE+'/monitor'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(monitor());return true;}
   if(path===BASE+'/ingest'&&req.method==='POST'){
    if(!authorized(bearer(req),writeHash))throw fault(401,'unauthorized');const p=await body(req);
    if(p?.schema==='warxau.mt4.probe.v1'&&Object.keys(p).length===1){json(res,200,{ready:true,accepted:false,private:true});return true;}
    const now=clock(),q=normalize(p,now,expectedServer),previous=sequences.get(q.streamId);
    if(previous&&q.sequence<=previous.sequence){if(q.sequence===previous.sequence&&q.fingerprint===previous.fingerprint){json(res,200,{accepted:true,duplicate:true,private:true,sequence:q.sequence});return true;}throw fault(409,'sequence_conflict');}
    if(currentStream&&q.streamId!==currentStream&&latest&&now-latest.quote.timestamp<15000)throw fault(409,'another_producer_active');
    if(latest&&q.streamId===currentStream&&q.quote.brokerServerTime<latest.quote.brokerServerTime)throw fault(409,'broker_time_reversed');
    if(sequences.size>=32&&!sequences.has(q.streamId))sequences.delete(sequences.keys().next().value);
    sequences.set(q.streamId,{sequence:q.sequence,fingerprint:q.fingerprint});currentStream=q.streamId;latest=q;accepted++;
    broadcast('quote',{quote:q.quote,session:q.session});json(res,200,{accepted:true,sequence:q.sequence,private:true,serverReceivedAt:now});return true;
   }
   if(!reader(req))throw fault(401,'private_reader_required');
   if(path===BASE+'/status'&&req.method==='GET'){json(res,200,status());return true;}
   if(path===BASE+'/arena'&&req.method==='GET'){const page=privatePage();if(!page)throw fault(503,'private_arena_unavailable');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(page);return true;}
   if(path===BASE+'/stream'&&req.method==='GET'){
    if(clients.size>=5)throw fault(503,'reader_limit');res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no','Connection':'keep-alive'});res.flushHeaders();clients.add(res);emit(res,'status',status());if(status().state==='live')emit(res,'quote',{quote:latest.quote,session:latest.session});
    let t;function heartbeat(){if(res.destroyed)return;if(clock()>=expiresAt){res.end();return;}emit(res,'status',status());t=setTimeout(heartbeat,2000);t.unref();}t=setTimeout(heartbeat,2000);t.unref();res.on('close',()=>{clearTimeout(t);clients.delete(res);});return true;
   }
   throw fault(404,'not_found');
  }catch(e){if(!res.headersSent)json(res,e.status||500,{accepted:false,error:e.code||'internal_error'});else res.end();return true;}
 }
 return {owns,handle,status,close(){for(const r of clients)r.end();clients.clear();}};
}
function monitor(){return `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WarXAU · Sambungan FBS privat</title><style>body{font:16px system-ui;background:#111820;color:#e8edf0;max-width:760px;margin:8vh auto;padding:24px}h1{color:#e3b869}section{background:#202b36;padding:22px;border-radius:14px;margin:18px 0}a,button{background:#e3b869;color:#111820;padding:12px 18px;border:0;border-radius:8px;display:inline-block;text-decoration:none;font:inherit}pre{white-space:pre-wrap}small{color:#b8c4cf}</style><h1>WarXAU · FBS privat</h1><p>Halaman pemeriksaan milikmu. Harga FBS tidak dibagikan ke pengunjung umum.</p><section><strong id="s">Memeriksa sambungan…</strong><pre id="q"></pre></section><a href="${BASE}/arena">Buka arena FBS privat</a><p><small>BID menjadi patokan arena. Timestamp adalah waktu server menerima data; waktu tick broker ditampilkan terpisah. Ronde tetap memakai D1 UTC WarXAU, bukan kalender daily FBS yang sudah diverifikasi.</small></p><script>(async()=>{const s=document.getElementById('s'),q=document.getElementById('q'),key=new URLSearchParams(location.hash.slice(1)).get('key');history.replaceState(null,'',location.pathname);if(key){try{const r=await fetch('${BASE}/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});if(!r.ok)throw Error();}catch{s.textContent='Kunci privat tidak cocok atau kedaluwarsa.';return;}}async function poll(){try{const r=await fetch('${BASE}/status',{cache:'no-store'});if(!r.ok){s.textContent='Akses privat diperlukan. Buka melalui pintasan pribadi yang diberikan.';return;}const d=await r.json();s.textContent=d.state==='live'?'HARGA FBS DITERIMA':d.state==='stale'?'TIDAK ADA TICK BARU — ARENA DIJEDA':'SERVER SIAP — MENUNGGU MT4';q.textContent=d.quote?'BID: '+d.quote.bid+'\\nASK: '+d.quote.ask+'\\nUsia penerimaan: '+d.ageMs+' ms\\nSampel diterima: '+d.accepted:'Sampel diterima: '+d.accepted+'\\nPasar tutup atau pengiriman belum aktif. Tidak menggunakan harga buatan.';}catch{s.textContent='Koneksi server terputus.';}setTimeout(poll,2000);}poll();})();</script></html>`;}
module.exports={BASE,COOKIE,sha,normalize,createRelay};
