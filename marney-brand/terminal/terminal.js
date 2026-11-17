(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const CATEGORIES=['Emas','Forex','Kripto','Saham','Ekonomi','Geopolitik'];
 const STORAGE_KEY='mm_terminal_saved_feeds_v1';
 const publisherHosts=['actionforex.com','marketpulse.com','federalreserve.gov'];
 const state={all:[],category:'Semua',search:'',sort:'latest',threshold:0,limit:13,feeds:[],selectedFeed:'',loading:false,updated:null,stream:null,streamConnected:false,lastHeartbeat:0,revision:0,knownIds:new Set(),newUntil:new Map()};
 const fmtClock={jakarta:'Asia/Jakarta',london:'Europe/London',ny:'America/New_York',tokyo:'Asia/Tokyo'};
 function elem(tag,className,contents){
  const n=document.createElement(tag);
  if(className)n.className=className;
  if(contents!==undefined)n.textContent=String(contents);
  return n;
 }
 function plain(value,max=300){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max)}
 function validExternal(href){
  try{
   const u=new URL(String(href||''));
   if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
   if(!publisherHosts.some(domain=>u.hostname===domain||u.hostname.endsWith('.'+domain)))return null;
   return u.href;
  }catch{return null}
 }
 function categoryFor(title,original){
  const c=plain(original,40).toUpperCase();
  const lower=String(title||'').toLowerCase();
  if(/iran|ukrain|russia|rusia|selat hormuz|hormuz|taiwan|geopolit|israel|konflik|houthi|perang/.test(lower))return 'Geopolitik';
  if(c==='EMAS'||/\bgold\b|xau\/?usd|emas|bullion/.test(lower))return 'Emas';
  if(c==='CRYPTO'||c==='KRIPTO'||/bitcoin|ethereum|\bbtc\b|\beth\b|crypto|kripto|solana|ripple|xrp|blockchain|stablecoin/.test(lower))return 'Kripto';
  if(c==='FOREX'||/currency|exchange rate|usd\/|eur\/|usd(jpy|idr)|eurusd|gbpusd|dxy|dollar index|dolar/.test(lower))return 'Forex';
  if(c==='SAHAM'||/stock market|stocks|saham|nasdaq|dow jones|nvidia|ihsg|s&p 500|apple inc|equity/.test(lower))return 'Saham';
  return 'Ekonomi';
 }
 function scoreOf(title,category,owned){
  const text=String(title||'').toLowerCase();
  let score=owned?48:37;
  if(/federal reserve|\bfed\b|\bfomc\b|cpi|inflasi|inflation|\bnfp\b|interest rate|suku bunga|central bank|bank sentral/.test(text))score+=24;
  if(/breaking|just in|darurat|crash|jatuh|serangan|attack|war|geopolitik|record|all-time|terendah/.test(text))score+=13;
  if(/\bbitcoin\b|\bbtc\b|\bgold\b|\bxau\b|emas|ihsg|nasdaq|oil|minyak|dolar/.test(text))score+=12;
  if(category==='Geopolitik')score+=10;
  return Math.min(99,score);
 }
 function mapArticle(a){
  if(!a||a.id==null||plain(a.status,30).toLowerCase()!=='published')return null;
  const title=plain(a.title,220),id=plain(a.id,140);
  if(!title||!id)return null;
  const when=Date.parse(a.updatedAt||a.date||a.createdAt||'');
  const category=categoryFor(title,a.cat||a.category||'');
  const href='/berita/'+encodeURIComponent(id);
  return {id:'marney:'+id,href,title,source:'MarketMarney',category,
   time:Number.isFinite(when)?when:0,excerpt:plain(a.desc||'',220),
   importance:scoreOf(title,category,true),kind:'marney'};
 }
 function mapHeadline(h){
  const href=validExternal(h?.url);
  const title=plain(h?.title,220);
  if(!href||!title)return null;
  const source=plain(h.source,42)||'Sumber eksternal';
  const when=Date.parse(h.published||'');
  const category=categoryFor(title,'');
  return {id:'external:'+href,href,title,source,category,
   time:Number.isFinite(when)?when:0,excerpt:'',
   importance:scoreOf(title,category,false),kind:'external'};
 }
 function parseContent(payload){
  return Array.isArray(payload?.articles)?payload.articles.map(mapArticle).filter(Boolean):[];
 }
 function parseTicker(payload){
  return Array.isArray(payload?.headlines)?payload.headlines.map(mapHeadline).filter(Boolean):[];
 }
 function mergeResults(articles,headlines){
  const unique=new Map();
  for(const entry of [...articles,...headlines]){
   if(!entry||unique.has(entry.id))continue;
   unique.set(entry.id,entry);
  }
  return [...unique.values()];
 }
 function timeText(value){
  if(!value)return 'Waktu tidak tersedia';
  const ms=Date.now()-value;
  if(ms<0)return 'Terjadwal';
  const minutes=Math.floor(ms/60000);
  if(minutes<1)return Math.max(0,Math.floor(ms/1000))+' detik lalu';
  if(minutes<2)return '1 menit lalu';
  if(minutes<60)return minutes+' menit lalu';
  if(minutes<1440)return Math.floor(minutes/60)+' jam lalu';
  const days=Math.floor(minutes/1440);
  if(days<31)return days+' hari lalu';
  try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}
  catch{return 'Waktu tidak tersedia'}
 }
 function loadFeeds(){
  try{
   const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
   return Array.isArray(raw)?raw.slice(0,8).filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string'&&f.name.length<=36&&Array.isArray(f.categories)&&typeof f.keywords==='string')
    .map(f=>({id:f.id,name:f.name,keywords:plain(f.keywords,100),categories:f.categories.filter(x=>CATEGORIES.includes(x))})): [];
  }catch{return []}
 }
 function persistFeeds(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.feeds))}catch{}}
 function selectedFeed(){return state.feeds.find(f=>f.id===state.selectedFeed)||null}
 function filterList(){
  const feed=selectedFeed();
  const needle=state.search.toLocaleLowerCase('id-ID');
  const keywords=feed?feed.keywords.toLocaleLowerCase('id-ID').split(/[,\s]+/).map(x=>x.trim()).filter(Boolean):[];
  const filtered=state.all.filter(item=>{
   const hay=(item.title+' '+item.excerpt+' '+item.source).toLocaleLowerCase('id-ID');
   if(state.category!=='Semua'&&item.category!==state.category)return false;
   if(state.threshold>0&&item.importance<state.threshold)return false;
   if(needle&&!hay.includes(needle))return false;
   if(feed&&feed.categories.length&&!feed.categories.includes(item.category))return false;
   if(keywords.length&&!keywords.some(word=>hay.includes(word)))return false;
   return true;
  });
  filtered.sort((a,b)=>state.sort==='important'?b.importance-a.importance||b.time-a.time:b.time-a.time||b.importance-a.importance);
  return filtered;
 }
 function renderFeedPills(){
  const host=$('saved-feeds');if(!host)return;
  host.replaceChildren();
  if(!state.feeds.length){host.append(elem('span','feed-empty','Belum ada feed pribadi'));return}
  for(const feed of state.feeds){
   const wrap=elem('div','feed-pill'+(state.selectedFeed===feed.id?' selected':''));
   const select=elem('button','feed-select',feed.name);select.type='button';select.setAttribute('aria-pressed',String(state.selectedFeed===feed.id));
   select.addEventListener('click',()=>{
    state.selectedFeed=state.selectedFeed===feed.id?'':feed.id;state.limit=13;renderFeedPills();renderNews()
   });
   const del=elem('button','feed-remove','×');del.type='button';del.setAttribute('aria-label','Hapus feed '+feed.name);
   del.addEventListener('click',()=>{state.feeds=state.feeds.filter(x=>x.id!==feed.id);if(state.selectedFeed===feed.id)state.selectedFeed='';persistFeeds();renderFeedPills();renderNews()});
   wrap.append(select,del);host.append(wrap);
  }
 }
 function itemNode(item){
  const article=elem('article','news-item'+(state.newUntil.get(item.id)>Date.now()?' newly-added':''));
  const meta=elem('div','news-meta');
  meta.append(elem('span','news-publisher',item.source));
  const age=elem('time','news-age',timeText(item.time));
  if(item.time){age.dataset.ts=String(item.time);age.dateTime=new Date(item.time).toISOString();}
  meta.append(age);
  if(state.newUntil.get(item.id)>Date.now())meta.append(elem('span','news-new','BARU'));
  meta.append(elem('span','news-label',item.category));
  if(item.importance>=80)meta.append(elem('span','news-priority','● Prioritas'));
  const h=elem('h3');const link=elem('a','',item.title);link.href=item.href;
  if(item.kind==='external'){link.target='_blank';link.rel='noopener noreferrer'}
  h.append(link);article.append(meta,h);
  if(item.excerpt)article.append(elem('p','news-excerpt',item.excerpt));
  return article;
 }
 function renderNews(){
  const host=$('news-list'),counter=$('news-count'),more=$('more-news');
  if(!host||!counter)return;
  const list=filterList();
  counter.textContent=list.length+' headline';
  host.replaceChildren();
  if(!list.length)host.append(elem('p','no-results',state.all.length?'Tidak ada berita yang cocok. Ubah kategori, kata kunci, atau prioritas.':'Belum ada data berita dari sumber publik. Coba perbarui lagi.'));
  else for(const item of list.slice(0,state.limit))host.append(itemNode(item));
  host.setAttribute('aria-busy','false');
  if(more)more.hidden=list.length<=state.limit;
  $('stat-total').textContent=String(state.all.length);
  $('stat-important').textContent=String(state.all.filter(x=>x.importance>=75).length);
  $('stat-sources').textContent=String(new Set(state.all.map(x=>x.source)).size);
 }
 async function loadNews(){
  if(state.loading)return;
  const revisionAtStart=state.revision;
  state.loading=true;const button=$('refresh');button.disabled=true;
  const endpoints=['/api/marketmarney/news-ticker','/api/content'];
  const reads=await Promise.allSettled(endpoints.map(async url=>{
   const resp=await fetch(url,{cache:'no-store',credentials:'omit'});
   if(!resp.ok)throw Error('API '+url+' HTTP '+resp.status);
   return resp.json();
  }));
  const ok=reads.filter(x=>x.status==='fulfilled').length;
  const headlines=reads[0].status==='fulfilled'?parseTicker(reads[0].value):[];
  const articles=reads[1].status==='fulfilled'?parseContent(reads[1].value):[];
  if(ok&&(!state.streamConnected||state.revision===revisionAtStart)){
   state.all=mergeResults(articles,headlines);
   state.updated=new Date();
  }
  if(!state.streamConnected){
   const status=$('server-status'),led=document.querySelector('.status-led');
   if(ok===2){status.textContent='Mode cadangan · dua feed aktif';led?.classList.remove('off')}
   else if(ok===1){status.textContent='Mode cadangan · satu feed aktif';led?.classList.remove('off')}
   else {status.textContent='Sumber berita belum tersedia';led?.classList.add('off')}
   if(state.updated){
    const time=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(state.updated);
    $('last-sync').textContent='Terakhir diperbarui '+time+' WIB';
   }else $('last-sync').textContent='Menunggu koneksi';
  }
  $('news-list')?.setAttribute('aria-busy','false');
  state.loading=false;button.disabled=false;
  renderNews();
 }
 function refreshVisibleAges(){
  for(const el of document.querySelectorAll('.news-age[data-ts]')){
   const ts=Number(el.dataset.ts);
   if(Number.isFinite(ts))el.textContent=timeText(ts);
  }
  for(const [id,until]of state.newUntil)if(until<Date.now())state.newUntil.delete(id);
 }
 function liveConnectionState(connected){
  state.streamConnected=connected;
  const dot=document.querySelector('.live-dot');
  dot?.classList.toggle('off',!connected);
  const status=$('server-status');
  if(connected){status.textContent='LIVE · terhubung';}
  else if(!document.hidden){status.textContent='Menyambungkan ulang…'}
 }
 function liveClock(at){
  const node=$('last-sync');
  if(!node)return;
  const date=new Date(Number(at)||Date.now());
  if(!Number.isFinite(date.getTime()))return;
  const hhmmss=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date);
  node.textContent='LIVE · '+hhmmss+' WIB';
 }
 function setLiveNews(packet){
  if(!packet||!Array.isArray(packet.articles)||!Array.isArray(packet.headlines)||!Number.isSafeInteger(packet.revision))return;
  if(packet.revision===0&&!packet.articles.length&&!packet.headlines.length)return;
  if(packet.revision<=state.revision&&state.all.length)return;
  const next=mergeResults(parseContent({articles:packet.articles}),parseTicker({headlines:packet.headlines}));
  if(!next.length&&state.all.length)return;
  if(state.revision>0){
   for(const item of next)if(!state.knownIds.has(item.id))state.newUntil.set(item.id,Date.now()+45000);
  }
  state.knownIds=new Set(next.map(x=>x.id));
  state.all=next;
  state.revision=packet.revision;
  state.updated=new Date();
  renderNews();
 }
 function openLive(){
  if(state.stream||document.hidden||typeof EventSource!=='function')return;
  const stream=new EventSource('/api/terminal/live');
  state.stream=stream;
  stream.onopen=()=>{if(state.stream!==stream)return;liveConnectionState(true);};
  stream.addEventListener('heartbeat',event=>{
   if(state.stream!==stream)return;
   try{
    const packet=JSON.parse(event.data);
    state.lastHeartbeat=Date.now();
    liveConnectionState(true);
    liveClock(packet.at);
    refreshVisibleAges();
   }catch{}
  });
  stream.addEventListener('news',event=>{
   if(state.stream!==stream)return;
   try{setLiveNews(JSON.parse(event.data));}catch{}
  });
  stream.onerror=()=>{
   if(state.stream!==stream)return;
   liveConnectionState(false);
   $('last-sync').textContent='Menghubungkan feed live…';
  };
 }
 function closeLive(){
  if(state.stream){state.stream.close();state.stream=null}
  state.streamConnected=false;
  state.lastHeartbeat=0;
 }
 function saveNewFeed(event){
  event.preventDefault();
  const name=plain($('feed-name').value,36),keywords=plain($('feed-keywords').value,100);
  const categories=[...document.querySelectorAll('#feed-form input[name="categories"]:checked')].map(x=>x.value).filter(x=>CATEGORIES.includes(x));
  const error=$('feed-error');error.textContent='';
  if(name.length<2){error.textContent='Nama feed minimal 2 karakter.';return}
  if(!keywords.trim()&&!categories.length){error.textContent='Pilih kategori atau masukkan kata kunci.';return}
  if(state.feeds.length>=8){error.textContent='Maksimal delapan feed di browser ini.';return}
  const feed={id:'f'+Date.now().toString(36),name,keywords,categories};
  state.feeds.push(feed);state.selectedFeed=feed.id;
  state.category='Semua';setCategory('Semua');state.limit=13;
  persistFeeds();renderFeedPills();renderNews();
  $('feed-dialog').close();$('feed-form').reset();
 }
 function setCategory(cat){
  state.category=cat;
  for(const el of document.querySelectorAll('.topic')){
   const active=el.dataset.category===cat;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
  }
 }
 function currentClocks(){
  for(const [key,zone] of Object.entries(fmtClock)){
   const target=$('clock-'+key);
   if(!target)continue;
   try{target.textContent=new Intl.DateTimeFormat('id-ID',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
   catch{target.textContent='--:--'}
  }
 }
 function activateCalendar(){
  const host=$('calendar-widget'),button=$('load-calendar');if(!host||!button)return;
  button.disabled=true;button.textContent='Membuka kalender…';
  host.hidden=false;$('calendar-preview').hidden=true;
  const container=elem('div','tradingview-widget-container');
  const widget=elem('div','tradingview-widget-container__widget');
  const script=document.createElement('script');script.async=true;script.type='text/javascript';
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-events.js';
  script.textContent=JSON.stringify({width:'100%',height:'490',colorTheme:'dark',isTransparent:false,locale:'id',importanceFilter:'0,1',countryFilter:'us,eu,gb,jp,cn'});
  script.onerror=()=>{host.replaceChildren(elem('p','no-results','Widget belum dapat dimuat. Gunakan tautan TradingView di bawah.'));button.textContent='Coba lagi';button.disabled=false;button.hidden=false};
  script.onload=()=>{button.textContent='Kalender aktif';button.hidden=true};
  container.append(widget,script);host.replaceChildren(container);
 }
 function start(){
  state.feeds=loadFeeds();renderFeedPills();currentClocks();
  setInterval(currentClocks,60000);
  $('refresh').addEventListener('click',loadNews);
  $('news-search').addEventListener('input',ev=>{state.search=ev.target.value.trim();state.limit=13;renderNews()});
  $('news-sort').addEventListener('change',ev=>{state.sort=ev.target.value;renderNews()});
  $('importance').addEventListener('input',ev=>{
   state.threshold=Number(ev.target.value)||0;
   $('importance-value').textContent=state.threshold?state.threshold+'+':'Semua';
   renderNews();
  });
  $('topics').addEventListener('click',ev=>{
   const btn=ev.target.closest('button[data-category]');if(!btn)return;
   if(btn.dataset.category!=='Semua'&&!CATEGORIES.includes(btn.dataset.category))return;
   setCategory(btn.dataset.category);state.limit=13;renderNews();
  });
  $('more-news').addEventListener('click',()=>{state.limit+=13;renderNews()});
  const dialog=$('feed-dialog');
  $('create-feed').addEventListener('click',()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')});
  $('close-feed').addEventListener('click',()=>dialog.close());
  $('cancel-feed').addEventListener('click',()=>dialog.close());
  $('feed-form').addEventListener('submit',saveNewFeed);
  $('load-calendar').addEventListener('click',activateCalendar);
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden)closeLive();
   else {openLive();if(!state.updated||Date.now()-state.updated.getTime()>30000)void loadNews()}
  });
  setInterval(()=>{
   if(document.hidden)return;
   refreshVisibleAges();
   if(state.streamConnected&&Date.now()-state.lastHeartbeat>5500)liveConnectionState(false);
  },1000);
  // Fallback on browsers that block SSE. Avoid per-second HTTP requests.
  setInterval(()=>{if(!document.hidden&&!state.streamConnected)void loadNews()},30000);
  openLive();
  void loadNews();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
