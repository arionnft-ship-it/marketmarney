'use strict';
// Public MarketMarney TV albums: non-destructive grouping of published videos.
const VERSION='mm-tv-albums-20261111-v1';
const SCRIPT='/assets/mm-tv-albums-v1.js', STYLE='/assets/mm-tv-albums-v1.css';
function albumForVideo(video){
 const v=video&&typeof video==='object'?video:{};
 const label=typeof v.album==='string'&&v.album.trim()?v.album.trim():
   typeof v.series==='string'&&v.series.trim()?v.series.trim():'';
 if(label&&label.length<=64&&!/[\x00-\x1f<>]/.test(label))return label;
 const title=String(v.title||'')+' '+String(v.desc||'');
 if(/academy|pemula|mulai dari nol|konsep trading|cara kerja naik turun|apa itu market|dasar trading/i.test(title))return 'MarketMarney Academy';
 if(/support|resistance|supply|demand|liquidity|pivot|breakout|timeframe|analisis teknikal/i.test(title))return 'Teknikal Trading';
 return 'Koleksi MarketMarney';
}
function groupPublishedVideos(videos){
 const groups=new Map();
 for(const v of (Array.isArray(videos)?videos:[])){
  if(!v||v.id==null||String(v.status||'published')!=='published')continue;
  const name=albumForVideo(v);
  if(!groups.has(name))groups.set(name,{name,ids:[],videos:[]});
  const album=groups.get(name);
  if(album.ids.includes(String(v.id)))continue;
  album.ids.push(String(v.id));album.videos.push(v);
 }
 const priority=['MarketMarney Academy','Teknikal Trading','Koleksi MarketMarney'];
 return [...groups.values()].sort((a,b)=>{
  const ai=priority.indexOf(a.name),bi=priority.indexOf(b.name);
  if(ai>=0||bi>=0)return (ai<0?99:ai)-(bi<0?99:bi);
  return a.name.localeCompare(b.name,'id');
 });
}
function browserClient(albumForVideo,groupPublishedVideos){
 'use strict';
 const VERSION='mm-tv-albums-20261111-v1';
 let selected='',catalog=null,requested=null,requestAt=0,scheduled=false;
 function node(tag,cls,txt){
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(txt!==undefined)x.textContent=String(txt);
  return x;
 }
 async function published(){
  if(catalog&&Date.now()-requestAt<60000)return catalog;
  if(requested)return requested;
  requested=(async()=>{
   const r=await fetch('/api/content',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('published catalog not available');
   const d=await r.json();
   if(!d||!Array.isArray(d.videos))throw Error('invalid published catalog');
   catalog=d.videos.filter(v=>v&&v.id!=null&&v.status==='published');
   requestAt=Date.now();return catalog;
  })().finally(()=>requested=null);
  return requested;
 }
 function listing(){
  const grid=document.querySelector('.mm-tv-grid');
  if(!grid||document.querySelector('#tvMount')||!document.querySelector('.mm-tv-filters'))return null;
  return grid;
 }
 function renderAlbums(grid,videos){
  const cards=[...grid.querySelectorAll('.mm-tv-card[data-tv-id]')];
  const cardsById=new Map(cards.map(c=>[String(c.getAttribute('data-tv-id')),c]));
  const visible=videos.filter(v=>cardsById.has(String(v.id)));
  const groups=groupPublishedVideos(visible);
  if(!visible.length||!groups.length)return;
  if(selected&&!groups.some(g=>g.name===selected))selected='';
  const section=node('section','mm-tv-albums');
  section.setAttribute('data-mm-tv-albums',VERSION);
  const bar=node('div','mm-tv-albums-top');
  const heading=node('div','mm-tv-albums-heading');
  heading.append(node('span','mm-tv-albums-label','MARKETMARNEY TV / KOLEKSI'));
  heading.append(node('h2','','Album Video'));
  heading.append(node('p','','Kumpulan video berdasarkan seri pembelajaran.'));
  bar.append(heading);
  const allBtn=node('button','mm-tv-albums-all','Semua video');
  allBtn.type='button';
  bar.append(allBtn);section.append(bar);
  const gallery=node('div','mm-tv-albums-gallery'),buttons=[];
  const allIds=new Set(visible.map(v=>String(v.id)));
  for(const group of groups){
   const btn=node('button','mm-tv-album-tile');
   btn.type='button';btn.dataset.albumName=group.name;
   const cover=node('div','mm-tv-album-cover');
   const imageSrc=cardsById.get(group.ids[0])?.querySelector('.mm-tv-thumb img')?.getAttribute('src');
   if(imageSrc){
    const image=node('img');image.src=imageSrc;
    image.alt='Sampul '+group.name;image.loading='lazy';cover.append(image);
   }
   cover.append(node('span','mm-tv-album-play','▶'));
   const copy=node('div','mm-tv-album-copy');
   copy.append(node('strong','',group.name));
   copy.append(node('span','',group.ids.length+' video'));
   btn.append(cover,copy);
   gallery.append(btn);buttons.push(btn);
   btn.addEventListener('click',()=>{selected=selected===group.name?'':group.name;update();});
  }
  section.append(gallery);
  const status=node('div','mm-tv-albums-status');
  const statusTitle=node('h3','','Semua video');
  const statusCount=node('span','',visible.length+' video tersedia');
  status.append(statusTitle,statusCount);section.append(status);
  function update(){
   const group=groups.find(g=>g.name===selected);
   const ids=group?new Set(group.ids):allIds;
   for(const card of cards)card.hidden=!ids.has(String(card.getAttribute('data-tv-id')));
   for(const btn of buttons)btn.setAttribute('aria-pressed',String(btn.dataset.albumName===selected));
   allBtn.setAttribute('aria-pressed',String(!selected));
   statusTitle.textContent=group?group.name:'Semua video';
   statusCount.textContent=group?group.ids.length+' video dalam album':visible.length+' video tersedia';
   grid.setAttribute('aria-label',group?'Video album '+group.name:'Semua video MarketMarney TV');
  }
  allBtn.addEventListener('click',()=>{selected='';update();});
  grid.parentNode.insertBefore(section,grid);
  grid.dataset.mmTvAlbumVersion=VERSION;
  update();
 }
 async function mount(){
  const grid=listing();
  if(!grid||grid.dataset.mmTvAlbumVersion===VERSION)return;
  try{
   const videos=await published();
   // Never mount into a stale grid after SPA navigation.
   if(!grid.isConnected||listing()!==grid||grid.dataset.mmTvAlbumVersion===VERSION)return;
   renderAlbums(grid,videos);
  }catch{console.warn('MarketMarney TV: album belum tersedia; semua video tetap bisa dibuka.');}
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;void mount();});
 }
 const root=document.getElementById('app')||document.body;
 const observer=new MutationObserver(records=>{
  if(records.some(rec=>[...rec.addedNodes].some(n=>
    n.nodeType===1&&(n.matches?.('.mm-tv-grid,.mm-tv-card')||n.querySelector?.('.mm-tv-grid,.mm-tv-card')))))schedule();
 });
 observer.observe(root,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('[data-page="MarketMarney TV"],#tvBack'))setTimeout(schedule,120);
 },true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
 else schedule();
}
const CLIENT=albumForVideo.toString()+'\n'+groupPublishedVideos.toString()+
 '\n('+browserClient.toString()+')(albumForVideo,groupPublishedVideos);';
const CSS=String.raw`
/* Album feature, restricted to the TV listing DOM; no category bar is reintroduced. */
.mm-tv-albums{max-width:1220px;margin:8px auto 22px;padding:21px;border:1px solid #e0e7f0;border-radius:19px;background:#fff;box-shadow:0 8px 25px rgba(17,36,58,.04)}
.mm-tv-albums-top{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:17px}
.mm-tv-albums-heading{min-width:0}
.mm-tv-albums-label{display:block;color:#b26b1b;font-size:10px;letter-spacing:.1em;font-weight:800;margin-bottom:7px}
.mm-tv-albums-heading h2{font-size:clamp(20px,2vw,25px)!important;color:#152a3c!important;line-height:1.25!important;margin:0 0 6px!important}
.mm-tv-albums-heading p{font-size:13px!important;color:#67798b!important;line-height:1.6!important;margin:0!important}
.mm-tv-albums-all{flex:0 0 auto;min-height:39px;border:1px solid #e6caa8!important;border-radius:11px!important;background:#fffaf3!important;color:#915c1e!important;font-size:12px!important;font-weight:750!important;padding:9px 14px!important;cursor:pointer}
.mm-tv-albums-all[aria-pressed="true"]{background:#fff0db!important;border-color:#eead5b!important}
.mm-tv-albums-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.mm-tv-album-tile{min-width:0;overflow:hidden;text-align:left!important;border:1px solid #e2e7ef!important;border-radius:14px!important;background:#fff!important;cursor:pointer!important;display:flex!important;flex-direction:column!important;padding:0!important;box-shadow:0 4px 15px rgba(18,38,60,.035)!important}
.mm-tv-album-tile:hover{border-color:#eeaf67!important;box-shadow:0 8px 20px rgba(18,38,60,.09)!important}
.mm-tv-album-tile[aria-pressed="true"]{border-color:#e99229!important;box-shadow:0 0 0 2px #f6d2a5!important}
.mm-tv-album-cover{position:relative;display:block;width:100%;aspect-ratio:16/8;background:linear-gradient(135deg,#0d2031,#2f425b);overflow:hidden}
.mm-tv-album-cover img{display:block!important;width:100%!important;height:100%!important;position:absolute;inset:0;object-fit:cover!important;opacity:.82}
.mm-tv-album-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:41px;height:41px;background:#111d2ddc;border:1px solid #ffffff75;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-size:15px}
.mm-tv-album-copy{padding:12px 13px 14px;display:flex;flex-direction:column;gap:3px;min-width:0}
.mm-tv-album-copy strong{font-size:14px;color:#182b41;line-height:1.5;overflow-wrap:anywhere}
.mm-tv-album-copy span{font-size:12px;color:#77859a}
.mm-tv-albums-status{margin-top:18px;padding:12px 2px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e7ebf1}
.mm-tv-albums-status h3{margin:0!important;font-size:17px!important;line-height:1.4!important;color:#193046!important}
.mm-tv-albums-status span{white-space:nowrap;font-size:12px;color:#7b899a}
.mm-tv-grid .mm-tv-card[hidden]{display:none!important}
.mm-tv-album-tile:focus-visible,.mm-tv-albums-all:focus-visible{outline:3px solid #e58c25!important;outline-offset:3px}
@media(max-width:760px){.mm-tv-albums-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.mm-tv-albums{padding:16px;border-radius:16px}.mm-tv-albums-top{align-items:flex-start;flex-direction:column;gap:12px}.mm-tv-albums-gallery{grid-template-columns:1fr}.mm-tv-album-tile{flex-direction:row}.mm-tv-album-cover{aspect-ratio:4/3;width:42%;max-width:150px;flex:0 0 42%}.mm-tv-album-copy{justify-content:center;flex:1}.mm-tv-albums-status{align-items:flex-start;flex-direction:column;gap:3px}}
`;
function injectHtml(html,pathname){
 if(pathname!=='/'&&pathname!=='/index.html')return html;
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-mm-tv-albums="'+VERSION+'"'))return html;
 const tags='<link rel="stylesheet" href="'+STYLE+'?v='+VERSION+'" data-mm-tv-albums="'+VERSION+'">'+
  '<script defer src="'+SCRIPT+'?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,tags+'</head>');
}
function assets(){return new Map([
 [SCRIPT,{body:Buffer.from(CLIENT,'utf8'),mime:'text/javascript; charset=utf-8'}],
 [STYLE,{body:Buffer.from(CSS,'utf8'),mime:'text/css; charset=utf-8'}]
]);}
module.exports={VERSION,SCRIPT,STYLE,CLIENT,CSS,albumForVideo,groupPublishedVideos,injectHtml,assets};
