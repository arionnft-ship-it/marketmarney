'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const VERSION = '20261109-auto-pivot-v1';
const ASSET_PATH = '/assets/mm-automatic-pivot.js';
const API_PATH = '/api/pivot-auto';
const PAGE_PATHS = new Set(['/', '/index.html']);
const PERIODS = new Set(['Daily', 'Weekly', 'Monthly']);
const CANONICAL_SYMBOLS = new Set([
  'OANDA:XAUUSD',
  'OANDA:EURUSD',
  'OANDA:GBPUSD',
  'OANDA:USDJPY',
  'BITSTAMP:BTCUSD',
  'BITSTAMP:ETHUSD',
  'SP:SPX',
  'NASDAQ:NDX'
]);
const ALIASES = Object.freeze({
  'FX:EURUSD': 'OANDA:EURUSD',
  'FX:GBPUSD': 'OANDA:GBPUSD',
  'FX:USDJPY': 'OANDA:USDJPY',
  'FOREXCOM:NSXUSD': 'NASDAQ:NDX'
});
const resultCache = new Map();
const CACHE_MS = 60 * 1000;
const MAX_LOCAL_RESPONSE = 512 * 1024;

function pathnameOf(req) {
  try { return new URL(String(req.url || '/'), 'http://marketmarney.local').pathname; }
  catch { return String(req.url || '/').split('?')[0]; }
}

function canonicalSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase();
  const canonical = ALIASES[symbol] || symbol;
  if (!CANONICAL_SYMBOLS.has(canonical)) throw Error('Simbol belum didukung untuk Pivot otomatis');
  return { requested: symbol, canonical };
}

function computeMethods(row) {
  const h = Number(row && row.high), l = Number(row && row.low), c = Number(row && row.close);
  if (![h,l,c].every(Number.isFinite) || l <= 0 || h < l || c < l || c > h) {
    throw Error('High, Low, Close tidak valid');
  }
  const p = (h + l + c) / 3, d = h - l, half = (h + l + 2 * c) / 4;
  const classic = {s3:l-2*(h-p),s2:p-d,s1:2*p-h,pivot:p,r1:2*p-l,r2:p+d,r3:h+2*(p-l)};
  const fibonacci = {s3:p-d,s2:p-.618*d,s1:p-.382*d,pivot:p,r1:p+.382*d,r2:p+.618*d,r3:p+d};
  const cam = {s3:c-1.1*d/4,s2:c-1.1*d/6,s1:c-1.1*d/12,pivot:p,r1:c+1.1*d/12,r2:c+1.1*d/6,r3:c+1.1*d/4};
  const wood = {s3:l-2*(h-half),s2:half-d,s1:2*half-h,pivot:half,r1:2*half-l,r2:half+d,r3:h+2*(half-l)};
  const demark = {s3:null,s2:null,s1:null,pivot:null,r1:null,r2:null,r3:null};
  const open = row && row.open;
  if (open !== undefined && open !== null && open !== '' && Number.isFinite(Number(open)) && Number(open) >= l && Number(open) <= h) {
    const o = Number(open), x = c < o ? h + 2*l + c : c > o ? 2*h + l + c : h + l + 2*c;
    demark.s1 = x/2-h; demark.pivot = x/4; demark.r1 = x/2-l;
  }
  return {classic,fibonacci,cam,wood,demark};
}

function freshness(period, candleDate) {
  const days = {Daily:3,Weekly:10,Monthly:40}[period] || 3;
  const start = Date.parse(String(candleDate || '') + 'T00:00:00Z');
  if (!Number.isFinite(start)) return {status:'unknown',message:'Tanggal candle tidak diketahui'};
  const ageDays = Math.floor((Date.now() - start) / 86400000);
  if (ageDays < 0) return {status:'future',ageDays,message:'Tanggal candle berada di masa depan; periksa sumber'};
  if (ageDays > days) return {status:'review',ageDays,message:'Data candle lama — verifikasi sebelum digunakan'};
  return {status:'current',ageDays,message:'Dihitung dari candle selesai sebelumnya'};
}

function cleanText(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0,max);
}

function buildAutomaticRecord(ohlc, requestedSymbol, canonical, period) {
  const high = Number(ohlc && ohlc.high), low = Number(ohlc && ohlc.low), close = Number(ohlc && ohlc.close);
  const open = Number.isFinite(Number(ohlc && ohlc.openPrevious)) ? Number(ohlc.openPrevious) : null;
  const candleDate = cleanText(ohlc && (ohlc.barStart || ohlc.datetime || ohlc.retrievedAt), 40).slice(0,10);
  const row = {high,low,close,open,period,candleDate};
  const methods = computeMethods(row);
  const updatedAt = /^\d{4}-\d{2}-\d{2}T/.test(String(ohlc && ohlc.retrievedAt || '')) ? String(ohlc.retrievedAt) : new Date().toISOString();
  return {
    symbol: requestedSymbol || canonical,
    canonicalSymbol: canonical,
    period,
    candleDate,
    source: cleanText(ohlc && (ohlc.source || ohlc.providerSymbol) || 'Sumber pasar otomatis MarketMarney', 240),
    updatedAt,
    levels: methods.classic,
    methods,
    freshness: freshness(period,candleDate),
    automatic: true,
    mode: 'automatic',
    ohlc: {
      high, low, close, open,
      providerSymbol: cleanText(ohlc && ohlc.providerSymbol,80),
      barStart: cleanText(ohlc && ohlc.barStart,80),
      timezone: cleanText(ohlc && ohlc.timezone,40)
    },
    note: cleanText(ohlc && ohlc.note,500)
  };
}

function jsonResponse(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-MarketMarney-Automatic-Pivot': VERSION,
    'Content-Length': body.length
  });
  res.end(body);
}

function localJson(port, originalReq, route) {
  return new Promise((resolve,reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'GET',
      headers: {
        Host: String(originalReq.headers.host || 'marketmarney.com'),
        Accept: 'application/json',
        'User-Agent': 'MarketMarney-Automatic-Pivot/' + VERSION,
        Connection: 'close'
      },
      timeout: 18000
    }, response => {
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_LOCAL_RESPONSE) {
          response.destroy(Error('Respons sumber OHLC terlalu besar'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let body = null;
        try { body = JSON.parse(text); }
        catch { return reject(Error('Respons sumber OHLC tidak valid')); }
        resolve({status:response.statusCode || 500,body});
      });
    });
    request.on('timeout', () => request.destroy(Error('Sumber OHLC timeout')));
    request.on('error', reject);
    request.end();
  });
}

async function manualFallback(port, req, requested, canonical, period, reason) {
  try {
    const response = await localJson(port,req,'/api/pivot-public');
    const rows = response.body && response.body.pivots;
    const found = rows && (rows[requested+'|'+period] || rows[canonical+'|'+period]);
    if (!found || !found.methods) return null;
    return {
      ...found,
      symbol: requested,
      canonicalSymbol: canonical,
      automatic: false,
      mode: 'manual-fallback',
      fallbackReason: cleanText(reason,200)
    };
  } catch { return null; }
}

async function handleAutoPivot(server, req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405,{Allow:'GET','Cache-Control':'no-store'}); res.end(); return;
  }
  let url;
  try { url = new URL(String(req.url || API_PATH),'http://marketmarney.local'); }
  catch { return jsonResponse(res,400,{error:'Permintaan Pivot tidak valid'}); }
  let symbolInfo;
  try { symbolInfo = canonicalSymbol(url.searchParams.get('symbol')); }
  catch (error) { return jsonResponse(res,400,{error:cleanText(error.message,160)}); }
  const period = cleanText(url.searchParams.get('period'),20);
  if (!PERIODS.has(period)) return jsonResponse(res,400,{error:'Periode harus Daily, Weekly, atau Monthly'});
  const force = url.searchParams.get('refresh') === '1';
  const key = symbolInfo.requested + '|' + period;
  const cached = resultCache.get(key);
  if (!force && cached && cached.expires > Date.now()) {
    return jsonResponse(res,200,{status:cached.status,pivot:cached.pivot,checkedAt:new Date().toISOString(),cached:true});
  }
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : null;
  if (!Number.isInteger(port)) return jsonResponse(res,503,{error:'Layanan Pivot otomatis belum siap'});
  try {
    const route = '/api/market/ohlc?symbol=' + encodeURIComponent(symbolInfo.canonical) + '&period=' + encodeURIComponent(period);
    const response = await localJson(port,req,route);
    if (response.status !== 200) throw Error(cleanText(response.body && response.body.error || 'Sumber OHLC tidak tersedia',180));
    const pivot = buildAutomaticRecord(response.body,symbolInfo.requested,symbolInfo.canonical,period);
    resultCache.set(key,{status:'automatic',pivot,expires:Date.now()+CACHE_MS});
    return jsonResponse(res,200,{status:'automatic',pivot,checkedAt:new Date().toISOString(),cached:false});
  } catch (error) {
    const reason = cleanText(error && error.message || error,180);
    const fallback = await manualFallback(port,req,symbolInfo.requested,symbolInfo.canonical,period,reason);
    if (fallback) {
      resultCache.set(key,{status:'manual-fallback',pivot:fallback,expires:Date.now()+15000});
      return jsonResponse(res,200,{status:'manual-fallback',pivot:fallback,warning:'OHLC otomatis belum tersedia; menampilkan publikasi admin.',checkedAt:new Date().toISOString()});
    }
    return jsonResponse(res,503,{error:'Pivot otomatis belum tersedia untuk pilihan ini.',detail:reason,checkedAt:new Date().toISOString()});
  }
}

const CLIENT = String.raw`(function(){
'use strict';
const VERSION='${VERSION}',API='${API_PATH}',MARK='mm-automatic-pivot';
let controller=null,sequence=0,timer=0,bound=false,lastKey='';
const app=()=>document.getElementById('app');
function controls(){const root=app();return root?{root,symbol:root.querySelector('#mm87-symbol'),period:root.querySelector('#mm1816PivotPeriod'),refresh:root.querySelector('#mm1817RefreshPivot'),section:root.querySelector('.mm1816-pivot-public'),display:root.querySelector('#mm1816PivotDisplay')}:{};}
function statusNode(){const c=controls();if(!c.section)return null;let node=c.section.querySelector('#'+MARK+'-status');if(!node){node=document.createElement('p');node.id=MARK+'-status';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.style.cssText='margin:10px 0 0;padding:10px 12px;border:1px solid rgba(201,129,34,.28);border-radius:12px;background:rgba(201,129,34,.08);font:600 12px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:inherit';const panel=c.section.querySelector('.mm1816-pivot-select')||c.section.firstElementChild;c.section.insertBefore(node,panel?panel.nextSibling:null);}return node;}
function setStatus(text,state){const node=statusNode();if(!node)return;node.textContent=text;node.dataset.state=state||'';node.style.borderColor=state==='error'?'rgba(190,45,45,.42)':state==='fallback'?'rgba(176,119,28,.42)':'rgba(43,145,93,.34)';}
function replaceText(root,mode){if(!root)return;const auto=mode!=='manual-fallback';const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const old=node.nodeValue||'';let next=old;next=next.replace(/PIVOT POINT\s*\/\s*ADMIN PUBLISHED/gi,'PIVOT POINT / OTOMATIS');next=next.replace(/Dikelola admin/gi,'OHLC otomatis');next=next.replace(/Level disediakan admin/gi,'Dihitung dari candle selesai sebelumnya');next=next.replace(/Data dari admin\s*·/gi,auto?'Data otomatis ·':'Cadangan admin ·');next=next.replace(/level pivot yang diterbitkan admin/gi,'level Pivot yang sedang ditampilkan');next=next.replace(/Belum ada pivot terbit untuk pilihan ini\.?/gi,'Pivot otomatis belum tersedia untuk pilihan ini.');if(next!==old)node.nodeValue=next;}}
function decimals(symbol){return /(?:XAU|BTC|ETH|SPX|NDX)/i.test(symbol)?2:5;}
function fmt(value,d){return typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';}
function describe(record,status){if(status==='manual-fallback')return 'Cadangan admin aktif • sumber OHLC otomatis sedang tidak tersedia.';const d=decimals(record.symbol),o=record.ohlc||{};return 'Pivot otomatis aktif • H '+fmt(o.high,d)+' • L '+fmt(o.low,d)+' • C '+fmt(o.close,d)+' • candle selesai '+(record.candleDate||'—')+' • '+(record.source||'sumber pasar');}
function decorate(record,status){const c=controls();replaceText(c.section,status);replaceText(c.display,status);if(c.refresh){c.refresh.textContent='↻ Perbarui Pivot otomatis';c.refresh.title='Ambil ulang OHLC candle selesai sebelumnya';}if(record){const node=statusNode();if(node)node.textContent=describe(record,status);const meta=c.section&&c.section.querySelector('.mm18110-updated strong');if(meta)meta.textContent=status==='manual-fallback'?'Cadangan admin · ':'Data otomatis · ';}}
function markedChange(el){const event=new Event('change',{bubbles:true});event.mmAutomaticPivotRender=true;el.dispatchEvent(event);}
async function load(force){const c=controls();if(!c.symbol||!c.period)return;const symbol=c.symbol.value,period=c.period.value;if(!symbol||!period)return;const key=symbol+'|'+period;lastKey=key;const mine=++sequence;if(controller)controller.abort();controller=new AbortController();setStatus('Mengambil High, Low, dan Close candle selesai sebelumnya…','loading');try{const url=new URL(API,location.origin);url.searchParams.set('symbol',symbol);url.searchParams.set('period',period);if(force)url.searchParams.set('refresh','1');const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});const data=await response.json().catch(()=>({}));if(mine!==sequence)return;if(!response.ok||!data.pivot)throw Error(data.detail||data.error||'Pivot otomatis tidak tersedia');const record=data.pivot;window.mm1816PivotLevels=window.mm1816PivotLevels||{};window.mm1816PivotLevels[key]=record;decorate(record,data.status);markedChange(c.period);window.dispatchEvent(new CustomEvent('mm1818:pivots-updated',{detail:{automaticPivot:true,key,status:data.status,version:VERSION}}));setTimeout(()=>decorate(record,data.status),0);setTimeout(()=>decorate(record,data.status),160);}catch(error){if(error&&error.name==='AbortError')return;if(mine!==sequence)return;const existing=window.mm1816PivotLevels&&window.mm1816PivotLevels[key];setStatus('Pivot otomatis belum tersedia: '+String(error&&error.message||error).slice(0,180)+(existing?' • Data sebelumnya tetap ditampilkan.':''),'error');decorate(existing,existing&&existing.mode==='manual-fallback'?'manual-fallback':'error');}}
function schedule(force){clearTimeout(timer);timer=setTimeout(()=>load(!!force),80);}
function bind(){const c=controls();if(!c.root||!c.symbol||!c.period)return false;if(c.root.dataset.mmAutomaticPivotBound===VERSION)return true;c.root.dataset.mmAutomaticPivotBound=VERSION;c.symbol.addEventListener('change',event=>{if(!event.mmAutomaticPivotRender)schedule(false)});c.period.addEventListener('change',event=>{if(!event.mmAutomaticPivotRender)schedule(false)});if(!bound){bound=true;document.addEventListener('click',event=>{const button=event.target&&event.target.closest?event.target.closest('#mm1817RefreshPivot'):null;if(!button)return;event.preventDefault();event.stopImmediatePropagation();schedule(true);},true);window.addEventListener('mm1818:pivots-updated',event=>{if(event.detail&&event.detail.automaticPivot)return;const now=controls(),key=now.symbol&&now.period?now.symbol.value+'|'+now.period.value:'';if(key&&key===lastKey)schedule(false);});}replaceText(c.section,'automatic');schedule(false);return true;}
function start(){if(bind())return;const root=app()||document.documentElement;let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;bind();replaceText(controls().section,'automatic');})}).observe(root,{childList:true,subtree:true});bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;

function sendAsset(req,res) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405,{Allow:'GET, HEAD','Cache-Control':'no-store'}); res.end(); return true;
  }
  const body = Buffer.from(CLIENT,'utf8');
  const etag = '"'+crypto.createHash('sha256').update(body).digest('hex')+'"';
  const headers = {
    'Content-Type':'text/javascript; charset=utf-8',
    'Cache-Control':'public, max-age=300',
    'X-Content-Type-Options':'nosniff',
    'X-MarketMarney-Automatic-Pivot':VERSION,
    ETag:etag
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304,headers);res.end();return true; }
  headers['Content-Length']=body.length;res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);return true;
}

function wrapIndexHtml(req,res) {
  const pathname = pathnameOf(req);
  if (req.method !== 'GET' || !PAGE_PATHS.has(pathname)) return;
  req.headers['accept-encoding']='identity';
  const original={writeHead:res.writeHead,write:res.write,end:res.end};
  let pending=false,pass=false,size=0;const chunks=[],MAX=8*1024*1024;
  function restore(){Object.assign(res,original)}
  function ok(){const type=String(res.getHeader('content-type')||'');return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!type||/^text\/html\b/i.test(type));}
  function head(){if(pending&&!res.headersSent){pending=false;original.writeHead.call(res,res.statusCode)}}
  function flush(){head();for(const chunk of chunks)original.write.call(res,chunk);chunks.length=0;}
  res.writeHead=function(status,message,headers){if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments)}const values=typeof message==='string'?headers:message;if(Array.isArray(values)){for(let i=0;i<values.length;i+=2)this.setHeader(values[i],values[i+1]);}else if(values&&typeof values==='object'){for(const [k,v]of Object.entries(values))this.setHeader(k,v)}this.statusCode=status;if(typeof message==='string')this.statusMessage=message;pending=true;return this;};
  res.write=function(chunk,encoding,callback){if(typeof encoding==='function'){callback=encoding;encoding=undefined}const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');if(pass||!ok()||size+buffer.length>MAX){pass=true;flush();restore();return original.write.call(this,buffer,callback)}chunks.push(buffer);size+=buffer.length;if(typeof callback==='function')process.nextTick(callback);return true;};
  res.end=function(chunk,encoding,callback){if(typeof chunk==='function'){callback=chunk;chunk=undefined}else if(typeof encoding==='function'){callback=encoding;encoding=undefined}if(pass){restore();return original.end.call(this,chunk,encoding,callback)}if(chunk!=null){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(buffer);size+=buffer.length}if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback)}const data=Buffer.concat(chunks,size),raw=data.toString('utf8');if(!/<\/html\s*>/i.test(raw)){flush();restore();return original.end.call(this,callback)}let html=raw.replace(/PIVOT POINT\s*\/\s*ADMIN PUBLISHED/gi,'PIVOT POINT / OTOMATIS').replace(/Dikelola admin/gi,'OHLC otomatis').replace(/Level disediakan admin/gi,'Dihitung dari candle selesai sebelumnya');if(!html.includes(ASSET_PATH))html=html.replace(/<\/body\s*>/i,'<script defer src="'+ASSET_PATH+'?v='+VERSION+'"></script></body>');const out=Buffer.from(html,'utf8');if(!out.equals(data)){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);this.setHeader('x-marketmarney-automatic-pivot',VERSION)}chunks.length=0;head();restore();return original.end.call(this,out,callback);};
}

const currentCreateServer = http.createServer;
http.createServer = function(...args) {
  const server = currentCreateServer.apply(this,args);
  const currentEmit = server.emit;
  server.emit = function(event,...eventArgs) {
    if (event === 'request') {
      const [req,res] = eventArgs;
      const pathname = pathnameOf(req);
      if (pathname === ASSET_PATH) { sendAsset(req,res); return true; }
      if (pathname === API_PATH) { void handleAutoPivot(server,req,res); return true; }
      wrapIndexHtml(req,res);
    }
    return currentEmit.call(this,event,...eventArgs);
  };
  return server;
};

console.log('MM_AUTOMATIC_PIVOT_READY '+JSON.stringify({version:VERSION,api:API_PATH,asset:ASSET_PATH,symbols:[...CANONICAL_SYMBOLS],periods:[...PERIODS]}));

module.exports={VERSION,ASSET_PATH,API_PATH,PERIODS,CANONICAL_SYMBOLS,ALIASES,CLIENT,canonicalSymbol,computeMethods,freshness,buildAutomaticRecord,pathnameOf,sendAsset,wrapIndexHtml,handleAutoPivot};
