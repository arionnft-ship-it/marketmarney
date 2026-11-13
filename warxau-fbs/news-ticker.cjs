'use strict';
// Live attributed RSS headline ticker. Does not scrape or re-label TradingView news.
const crypto=require('node:crypto');
const STYLE_ID='mm-tv-news-style-v1',CLIENT_ID='mm-tv-news-client-v1',ROOT_ID='mm-tv-news-v1';
const API_PATH='/api/marketmarney/news-ticker';
const PROVIDER_URL='https://www.actionforex.com/';
const PROVIDERS=Object.freeze([
 {name:'ActionForex',domain:'actionforex.com',url:'https://www.actionforex.com/feed/'},
 {name:'MarketPulse',domain:'marketpulse.com',url:'https://www.marketpulse.com/feed/'},
 {name:'Federal Reserve',domain:'federalreserve.gov',url:'https://www.federalreserve.gov/feeds/press_all.xml'}
]);
function decodeXml(value){
 const dict={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 return String(value||'').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
  const e=entity.toLowerCase();
  if(Object.prototype.hasOwnProperty.call(dict,e))return dict[e];
  const v=e.startsWith('#x')?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
  return v>0&&v<=0x10ffff&&!(v>=0xd800&&v<=0xdfff)?String.fromCodePoint(v):'';
 });
}
function textOf(xml,tag){
 const re=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i');
 const m=re.exec(xml);
 return m?decodeXml(m[1]).replace(/<[^>]+>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim():'';
}
function allowedUrl(url,domain){
 try{
  const u=new URL(String(url||''));
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(u.hostname===domain||u.hostname.endsWith('.'+domain))?u.href:null;
 }catch{return null}
}
function parseRss(xml,provider,nowMs=Date.now()){
 const input=String(xml||'');
 if(input.length>950000||!/<(?:rss\b|rdf:RDF\b)/i.test(input))throw Error('unsupported_rss_feed');
 const rows=[],seen=new Set();
 for(const match of input.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  const node=match[1],title=textOf(node,'title'),url=allowedUrl(textOf(node,'link'),provider.domain);
  const stamp=Date.parse(textOf(node,'pubDate'));
  if(!url||title.length<15||title.length>240||!Number.isFinite(stamp)||stamp>nowMs+3600000||nowMs-stamp>10*86400000)continue;
  if(seen.has(url))continue;seen.add(url);
  rows.push({id:crypto.createHash('sha256').update(url).digest('hex').slice(0,16),title:title.slice(0,200),url,
   source:provider.name,published:new Date(stamp).toISOString(),stamp});
  if(rows.length===12)break;
 }
 return rows;
}
function createMarketTicker({fetchImpl=globalThis.fetch,now=Date.now,cacheMs=300000,providers=PROVIDERS}={}){
 let cache=null,pending=null;
 async function download(provider){
  if(!allowedUrl(provider.url,provider.domain))throw Error('unapproved_feed');
  const response=await fetchImpl(provider.url,{method:'GET',redirect:'error',
   headers:{accept:'application/rss+xml, application/xml, text/xml','user-agent':'MarketMarney-RSSReader/1.0 (+https://marketmarney.com)'},
   signal:AbortSignal.timeout(9500)});
  if(!response.ok)throw Error('rss_http_'+response.status);
  if(Number(response.headers?.get?.('content-length')||0)>950000)throw Error('rss_size_limit');
  return parseRss(await response.text(),provider,now());
 }
 async function snapshot(){
  if(cache&&now()-cache.at<cacheMs)return cache;
  if(pending)return pending;
  pending=(async()=>{
   const settled=await Promise.allSettled(providers.map(download));
   const rows=[],seen=new Set(),sources=[];
   for(let i=0;i<settled.length;i++){
    const v=settled[i];
    if(v.status!=='fulfilled'){console.warn('MM_TICKER_FEED_UNAVAILABLE',providers[i].name,String(v.reason?.message||'error').slice(0,110));continue;}
    if(v.value.length)sources.push(providers[i].name);
    for(const item of v.value){if(!seen.has(item.url)){seen.add(item.url);rows.push(item)}}
   }
   rows.sort((a,b)=>b.stamp-a.stamp);
   const selected=[],counts=new Map();
   for(const item of rows){
    const n=counts.get(item.source)||0;if(n>=6)continue;
    counts.set(item.source,n+1);selected.push(item);if(selected.length>=16)break;
   }
   const headlines=selected.map(({stamp,...item})=>item);
   const stale=!headlines.length&&!!cache?.payload?.headlines?.length&&now()-cache.at<6*3600000;
   const payload=stale?{...cache.payload,status:'stale',stale:true}:{
    ok:!!headlines.length,status:headlines.length?'connected':'unavailable',stale:false,
    updatedAt:new Date(now()).toISOString(),sources,headlines
   };
   const body=JSON.stringify(payload);
   const result={at:now(),payload,body,etag:'"'+crypto.createHash('sha256').update(body).digest('hex').slice(0,22)+'"'};
   if(headlines.length||stale)cache=result;
   return result;
  })().finally(()=>{pending=null});
  return pending;
 }
 function owns(req){return ['GET','HEAD'].includes(req?.method)&&String(req?.url||'').split('?')[0]===API_PATH}
 async function handle(req,res){
  if(!owns(req))return false;
  let value;
  try{value=await snapshot()}catch(e){
   console.warn('MM_MARKET_TICKER_ERROR',String(e?.message||'unknown').slice(0,100));
   value={body:JSON.stringify({ok:false,status:'unavailable',stale:false,sources:[],headlines:[]})};
  }
  const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=30, must-revalidate','X-Content-Type-Options':'nosniff'};
  if(value.etag)h.ETag=value.etag;
  if(value.etag&&req.headers?.['if-none-match']===value.etag){res.writeHead(304,h);res.end();return true}
  res.writeHead(200,h);res.end(req.method==='HEAD'?'':value.body);return true;
 }
 return {owns,handle,snapshot};
}
function browserClient(){
 'use strict';
 if(document.getElementById('mm-tv-news-v1'))return;
 const api='/api/marketmarney/news-ticker';
 function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
 const root=el('section');root.id='mm-tv-news-v1';
 root.setAttribute('aria-label','Berita pasar bergerak dari sumber eksternal');
 const label=el('div','mm-tv-news-label');
 const dot=el('span','mm-tv-news-dot');dot.setAttribute('aria-hidden','true');
 label.append(dot,el('strong','','MARKET NEWS'));
 const viewport=el('div','mm-tv-news-viewport');viewport.setAttribute('aria-label','Ticker judul berita keuangan');
 const track=el('div','mm-tv-news-track');viewport.append(track);
 const placeholder=el('span','mm-tv-news-placeholder','Memuat headline pasar…');viewport.append(placeholder);
 const source=el('a','mm-tv-news-source','Sumber');
 source.href='https://www.actionforex.com/';source.target='_blank';source.rel='noopener noreferrer';
 root.append(label,viewport,source);document.body.prepend(root);
 let current='';
 function clear(){while(track.firstChild)track.removeChild(track.firstChild);track.classList.remove('mm-tv-news-playing')}
 function segment(rows,repeat){
  const group=el('div','mm-tv-news-group');
  if(repeat)group.setAttribute('aria-hidden','true');
  for(const item of rows){
   const a=el('a','mm-tv-news-headline');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
   if(repeat)a.tabIndex=-1;
   a.append(el('span','mm-tv-news-publisher',item.source),el('span','mm-tv-news-title',item.title));
   group.append(a);
  }
  return group;
 }
 function render(rows){
  if(!Array.isArray(rows)||!rows.length){clear();placeholder.hidden=false;placeholder.textContent='Berita terbaru belum tersedia · lihat sumber';current='';return}
  const clean=rows.filter(item=>{
   if(!item||typeof item.title!=='string'||typeof item.source!=='string'||typeof item.url!=='string')return false;
   try{
    const u=new URL(item.url);
    return u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*(?:actionforex\.com|marketpulse\.com|federalreserve\.gov)$/.test(u.hostname);
   }catch{return false}
  });
  if(!clean.length){clear();placeholder.hidden=false;placeholder.textContent='Headline belum tersedia · lihat sumber';current='';return}
  const next=clean.map(x=>x.id).join(',');
  if(current===next)return;current=next;
  clear();placeholder.hidden=true;
  track.append(segment(clean,false),segment(clean,true));
  const letters=clean.reduce((n,item)=>n+item.title.length,0);
  track.style.setProperty('--mm-news-duration',Math.max(110,Math.min(260,Math.round(letters*.14)))+'s');
  track.classList.add('mm-tv-news-playing');
 }
 async function refresh(){
  try{
   const resp=await fetch(api,{cache:'no-store',credentials:'omit'});
   if(!resp.ok)throw Error('ticker_http_'+resp.status);
   const data=await resp.json();render(data.headlines);
  }catch{if(!current){placeholder.hidden=false;placeholder.textContent='Sumber berita sedang tidak tersedia.';}}
 }
 refresh();
 setInterval(()=>{if(!document.hidden)refresh();},300000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 viewport.addEventListener('touchstart',()=>root.classList.add('mm-tv-news-touch-paused'),{passive:true});
 viewport.addEventListener('touchend',()=>root.classList.remove('mm-tv-news-touch-paused'),{passive:true});
}
const CSS="\n#mm-tv-news-v1{position:relative;z-index:9998;display:flex;align-items:center;height:49px;width:100%;background:#0c1623;color:#f6f8fb;border-bottom:1px solid rgba(229,155,68,.35);font-family:system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif;overflow:hidden}\n#mm-tv-news-v1 *{box-sizing:border-box}\n#mm-tv-news-v1 .mm-tv-news-label{flex:0 0 auto;height:100%;padding:0 17px;display:flex;gap:10px;align-items:center;white-space:nowrap;border-right:1px solid rgba(255,255,255,.11);background:#0c1623;position:relative;z-index:2}\n#mm-tv-news-v1 .mm-tv-news-label strong{font-size:11px;font-weight:850;letter-spacing:.07em;color:#fff}\n#mm-tv-news-v1 .mm-tv-news-dot{width:8px;height:8px;border-radius:50%;background:#eea34e;box-shadow:0 0 0 3px rgba(239,160,69,.14)}\n#mm-tv-news-v1 .mm-tv-news-viewport{position:relative;flex:1 1 auto;min-width:0;height:100%;overflow:hidden;display:flex;align-items:center;mask-image:linear-gradient(to right,transparent,#000 20px,#000 calc(100% - 20px),transparent)}\n#mm-tv-news-v1 .mm-tv-news-track{display:flex;align-items:center;flex:0 0 auto;width:max-content;white-space:nowrap;height:100%;will-change:transform}\n#mm-tv-news-v1 .mm-tv-news-group{display:flex;align-items:center;flex:0 0 auto;height:100%;padding-right:50px;gap:46px}\n#mm-tv-news-v1 .mm-tv-news-headline{display:inline-flex;align-items:center;gap:10px;max-width:none;white-space:nowrap;flex:none;text-decoration:none;color:#f1f5f9;font-size:12px;font-weight:650;line-height:1.4}\n#mm-tv-news-v1 .mm-tv-news-headline:focus-visible{outline:2px solid #ffb65c;outline-offset:2px;border-radius:4px}\n#mm-tv-news-v1 .mm-tv-news-headline:hover .mm-tv-news-title{text-decoration:underline;text-underline-offset:3px}\n#mm-tv-news-v1 .mm-tv-news-publisher{font-size:9px;font-weight:850;letter-spacing:.035em;color:#efaf61;text-transform:uppercase}\n#mm-tv-news-v1 .mm-tv-news-title{color:#e5ecf5}\n#mm-tv-news-v1 .mm-tv-news-source{flex:0 0 auto;padding:0 17px;height:100%;display:flex;align-items:center;position:relative;z-index:2;background:#0c1623;color:#efbc7d;font-size:11px;font-weight:750;text-decoration:none;border-left:1px solid rgba(255,255,255,.11)}\n#mm-tv-news-v1 .mm-tv-news-source:hover{text-decoration:underline}\n#mm-tv-news-v1 .mm-tv-news-placeholder{padding:0 18px;font-size:11.5px;color:#cbd5e1}\n#mm-tv-news-v1 .mm-tv-news-track.mm-tv-news-playing{animation:mm-market-news-scroll var(--mm-news-duration,170s) linear infinite}\n#mm-tv-news-v1:hover .mm-tv-news-track,#mm-tv-news-v1:focus-within .mm-tv-news-track,#mm-tv-news-v1.mm-tv-news-touch-paused .mm-tv-news-track{animation-play-state:paused}\n@keyframes mm-market-news-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}\n@media(max-width:650px){#mm-tv-news-v1{height:44px}#mm-tv-news-v1 .mm-tv-news-label{padding:0 10px;gap:7px}#mm-tv-news-v1 .mm-tv-news-label strong{font-size:10px}#mm-tv-news-v1 .mm-tv-news-source{padding:0 10px;font-size:10px}#mm-tv-news-v1 .mm-tv-news-headline{font-size:11px}#mm-tv-news-v1 .mm-tv-news-group{gap:30px;padding-right:30px}}\n@media(prefers-reduced-motion:reduce){#mm-tv-news-v1 .mm-tv-news-viewport{overflow-x:auto;mask-image:none}#mm-tv-news-v1 .mm-tv-news-track.mm-tv-news-playing{animation:none}#mm-tv-news-v1 .mm-tv-news-group[aria-hidden=true]{display:none}}\n";
const CLIENT='('+browserClient.toString()+')();';
const STYLE='<style id="'+STYLE_ID+'">'+CSS+'</style>';
const SCRIPT='<script id="'+CLIENT_ID+'">'+CLIENT+'</script>';
function injectTickerHtml(html){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/body\s*>/i.test(html))return html;
 if(!html.includes('id="'+STYLE_ID+'"'))html=html.replace(/<\/head\s*>/i,STYLE+'</head>');
 if(!html.includes('id="'+CLIENT_ID+'"'))html=html.replace(/<\/body\s*>/i,SCRIPT+'</body>');
 return html;
}
module.exports={STYLE_ID,CLIENT_ID,ROOT_ID,API_PATH,PROVIDER_URL,PROVIDERS,CLIENT,CSS,
 decodeXml,textOf,parseRss,allowedUrl,createMarketTicker,injectTickerHtml};
