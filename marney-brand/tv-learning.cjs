'use strict';
// MarketMarney TV: guided beginner-to-understanding video lessons and compact albums.
// Enhances published TV cards only; does not edit video data, routes, livestream or admin UI.
const VERSION='mm-tv-learning-20261111-v1';
const JS_PATH='/assets/mm-tv-learning-v1.js';
const CSS_PATH='/assets/mm-tv-learning-v1.css';
const LEVELS=Object.freeze([
 {id:'mulai',number:'01',title:'Baru Mulai',subtitle:'Kenali trading dan langkah pertama'},
 {id:'dasar',number:'02',title:'Pahami Dasar',subtitle:'Pahami pergerakan harga dan pivot'},
 {id:'praktik',number:'03',title:'Mulai Analisis',subtitle:'Belajar membaca area pada chart'},
 {id:'paham',number:'04',title:'Lebih Paham',subtitle:'Kenali liquidity sweep dan breakout'}
]);
function stageOf(v){
 const explicit=String(v?.learningStage||v?.learningLevel||v?.level||'').toLowerCase().trim();
 const alias={new:'mulai',newbie:'mulai',beginner:'mulai',pemula:'mulai',mulai:'mulai',
  dasar:'dasar',basic:'dasar',intermediate:'praktik',menengah:'praktik',praktik:'praktik',
  advance:'paham',advanced:'paham',mahir:'paham',paham:'paham'};
 if(Object.prototype.hasOwnProperty.call(alias,explicit))return alias[explicit];
 const title=String(v?.title||'').toLowerCase();
 if(/liquidity|sweep|breakout|smart money/.test(title))return 'paham';
 if(/support|resistance|supply|demand|timeframe|analisis teknikal/.test(title))return 'praktik';
 if(/pivot|naik turun market|harga naik|harga turun|cara kerja (?:harga|market)/.test(title))return 'dasar';
 if(/academy|pemula|mulai dari nol|konsep trading|apa itu market|dasar trading/.test(title))return 'mulai';
 return null; // New unrelated news videos remain in "Semua Video" and their own album.
}
function albumOf(v){
 const name=typeof v?.album==='string'?v.album.trim():typeof v?.series==='string'?v.series.trim():'';
 if(name&&name.length<=64&&!/[\x00-\x1f<>]/.test(name))return name;
 const title=String(v?.title||'');
 if(/pivot|support|resistance|supply|demand|timeframe|liquidity|sweep|breakout/i.test(title))return 'Teknikal Trading';
 const stage=stageOf(v);
 if(stage==='mulai'||stage==='dasar')return 'MarketMarney Academy';
 return 'Video Lainnya';
}
function learningCatalog(list){
 const used=new Set(),videos=[];
 for(const v of Array.isArray(list)?list:[]){
  if(!v||v.id==null||String(v.status||'published')!=='published')continue;
  const id=String(v.id);
  if(used.has(id))continue;
  used.add(id);videos.push(v);
 }
 const stages=LEVELS.map(level=>({
  ...level,ids:videos.filter(v=>stageOf(v)===level.id).map(v=>String(v.id))
 }));
 const group=new Map();
 for(const v of videos){
  const name=albumOf(v);
  if(!group.has(name))group.set(name,{name,ids:[]});
  group.get(name).ids.push(String(v.id));
 }
 const order=['MarketMarney Academy','Teknikal Trading','Video Lainnya'];
 const albums=[...group.values()].sort((a,b)=>{
  const ai=order.indexOf(a.name),bi=order.indexOf(b.name);
  if(ai!==bi)return (ai<0?99:ai)-(bi<0?99:bi);
  return a.name.localeCompare(b.name,'id');
 });
 return {videos,stages,albums};
}
function learningClient(stageOf,albumOf,learningCatalog,LEVELS){
 'use strict';
 const VERSION='mm-tv-learning-20261111-v1';
 let mode={type:'all',value:''},cached=null,cacheTime=0,pendingFetch=null,queued=false;
 function node(tag,cls,content){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(content!==undefined)n.textContent=String(content);
  return n;
 }
 async function videos(){
  if(cached&&Date.now()-cacheTime<60000)return cached;
  if(pendingFetch)return pendingFetch;
  pendingFetch=(async()=>{
   const resp=await fetch('/api/content',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
   if(!resp.ok)throw Error('public catalog unavailable');
   const data=await resp.json();
   if(!Array.isArray(data?.videos))throw Error('invalid video catalog');
   cached=data.videos.filter(v=>v&&v.id!=null&&v.status==='published');
   cacheTime=Date.now();
   return cached;
  })().finally(()=>{pendingFetch=null;});
  return pendingFetch;
 }
 function grid(){
  const el=document.querySelector('.mm-tv-grid');
  // Only actual MarketMarney TV listing. Do not touch featured videos or the player.
  if(!el||document.querySelector('#tvMount')||!document.querySelector('.mm-tv-filters'))return null;
  return el;
 }
 function build(host,items){
  const cards=[...host.querySelectorAll('.mm-tv-card[data-tv-id]')];
  if(!cards.length)return;
  const cardById=new Map(cards.map(card=>[String(card.getAttribute('data-tv-id')),card]));
  const eligible=items.filter(v=>cardById.has(String(v.id)));
  if(!eligible.length)return;
  const model=learningCatalog(eligible);
  if(!model.videos.length)return;
  const section=node('section','mm-tv-learning');
  section.setAttribute('data-mm-tv-learning',VERSION);
  const top=node('div','mm-tv-learning-top');
  const intro=node('div','mm-tv-learning-intro');
  intro.append(node('span','mm-tv-learning-eyebrow','MARKETMARNEY ACADEMY / JALUR BELAJAR'));
  intro.append(node('h2','','Dari Baru Mulai Sampai Paham'));
  intro.append(node('p','','Pilih tahapan yang sesuai kemampuanmu. Belajar berurutan, dari dasar market sampai memahami area pada grafik.'));
  top.append(intro);
  const showAll=node('button','mm-tv-learning-all','Lihat Semua Video');
  showAll.type='button';top.append(showAll);section.append(top);
  const choices=node('div','mm-tv-learning-steps');
  choices.setAttribute('role','group');
  choices.setAttribute('aria-label','Pilih tahapan belajar MarketMarney');
  const stageButtons=[];
  for(const level of model.stages){
   const btn=node('button','mm-tv-learning-step');
   btn.type='button';btn.dataset.stage=level.id;
   btn.disabled=!level.ids.length;
   const head=node('span','mm-tv-learning-step-head');
   head.append(node('span','mm-tv-learning-step-number',level.number));
   head.append(node('span','mm-tv-learning-step-count',level.ids.length+' video'));
   btn.append(head,node('strong','mm-tv-learning-step-title',level.title),node('span','mm-tv-learning-step-desc',level.subtitle));
   choices.append(btn);stageButtons.push(btn);
  }
  section.append(choices);
  const albumWrap=node('div','mm-tv-learning-albums');
  albumWrap.append(node('span','mm-tv-learning-albums-title','Album Video'));
  const albums=node('div','mm-tv-learning-album-choices');
  const albumButtons=[];
  for(const a of model.albums){
   const btn=node('button','mm-tv-learning-album');
   btn.type='button';btn.dataset.album=a.name;
   const first=cardById.get(a.ids[0]);
   const src=first?.querySelector('.mm-tv-thumb img')?.getAttribute('src');
   if(src){
    const cover=node('span','mm-tv-learning-album-thumb');
    const image=node('img');
    image.src=src;image.loading='lazy';image.alt='Sampul album '+a.name;
    cover.append(image);btn.append(cover);
   }
   const body=node('span','mm-tv-learning-album-label');
   body.append(node('strong','',a.name),node('small','',a.ids.length+' video'));
   btn.append(body);albums.append(btn);albumButtons.push(btn);
  }
  albumWrap.append(albums);section.append(albumWrap);
  const status=node('div','mm-tv-learning-selection');
  const statusTitle=node('strong','','Semua Video');
  const statusCount=node('span','',model.videos.length+' video tersedia');
  status.setAttribute('aria-live','polite');
  status.append(statusTitle,statusCount);section.append(status);
  const allIds=new Set(model.videos.map(v=>String(v.id)));
  function update(){
   const level=mode.type==='stage'?model.stages.find(item=>item.id===mode.value):null;
   const album=mode.type==='album'?model.albums.find(item=>item.name===mode.value):null;
   const chosen=level||album;
   const ids=new Set(chosen?chosen.ids:[...allIds]);
   for(const card of cards)card.hidden=!ids.has(String(card.getAttribute('data-tv-id')));
   for(const btn of stageButtons)btn.setAttribute('aria-pressed',String(mode.type==='stage'&&btn.dataset.stage===mode.value));
   for(const btn of albumButtons)btn.setAttribute('aria-pressed',String(mode.type==='album'&&btn.dataset.album===mode.value));
   showAll.setAttribute('aria-pressed',String(mode.type==='all'));
   statusTitle.textContent=level?level.title:album?album.name:'Semua Video';
   statusCount.textContent=(chosen?chosen.ids.length:model.videos.length)+' video';
   host.setAttribute('aria-label',chosen?'Video '+(level?'tahapan ':'album ')+(level?level.title:album.name):'Semua video MarketMarney TV');
  }
  showAll.addEventListener('click',()=>{
   mode={type:'all',value:''};update();
  });
  stageButtons.forEach(btn=>btn.addEventListener('click',()=>{
   mode={type:'stage',value:btn.dataset.stage};update();
  }));
  albumButtons.forEach(btn=>btn.addEventListener('click',()=>{
   mode={type:'album',value:btn.dataset.album};update();
  }));
  if(mode.type==='stage'&&!model.stages.some(s=>s.id===mode.value&&s.ids.length))mode={type:'all',value:''};
  if(mode.type==='album'&&!model.albums.some(a=>a.name===mode.value))mode={type:'all',value:''};
  host.parentNode.insertBefore(section,host);
  host.dataset.mmTvLearning=VERSION;
  update();
 }
 async function mount(){
  const host=grid();
  if(!host||host.dataset.mmTvLearning===VERSION)return;
  try{
   const items=await videos();
   if(!host.isConnected||grid()!==host||host.dataset.mmTvLearning===VERSION)return;
   build(host,items);
  }catch{
   // Fail open: if catalog is temporarily unavailable, all original cards stay visible.
   console.warn('MarketMarney TV: panduan belajar belum dapat dimuat.');
  }
 }
 function queue(){
  if(queued)return;
  queued=true;requestAnimationFrame(()=>{queued=false;void mount();});
 }
 const root=document.getElementById('app')||document.body;
 new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(el=>
    el.nodeType===1&&(el.matches?.('.mm-tv-grid')||el.querySelector?.('.mm-tv-grid')))))queue();
 }).observe(root,{childList:true,subtree:true});
 document.addEventListener('click',ev=>{
  if(ev.target.closest?.('[data-page="MarketMarney TV"],#tvBack'))setTimeout(queue,100);
 },true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
 else queue();
}
const CLIENT=stageOf.toString()+'\n'+albumOf.toString()+'\n'+learningCatalog.toString()+'\nconst LEVELS='+JSON.stringify(LEVELS)+';\n('+learningClient.toString()+')(stageOf,albumOf,learningCatalog,LEVELS);';
const CSS="\n/* MarketMarney TV learning path. No global menu, header or article selectors. */\n.mm-tv-learning{max-width:1220px;margin:4px auto 24px;padding:clamp(16px,2.2vw,26px);border:1px solid #e2e7ef;border-radius:20px;background:#fff;box-shadow:0 8px 28px rgba(16,38,61,.055)}\n.mm-tv-learning-top{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:22px}\n.mm-tv-learning-intro{min-width:0;max-width:720px}\n.mm-tv-learning-eyebrow{display:block;color:#b36a19;font-size:10px;font-weight:800;letter-spacing:.115em;margin:0 0 9px}\n.mm-tv-learning-intro h2{font-size:clamp(23px,2.55vw,32px)!important;line-height:1.2!important;letter-spacing:-.035em!important;color:#17293d!important;font-weight:800!important;margin:0 0 9px!important}\n.mm-tv-learning-intro p{font-size:13px!important;color:#67788b!important;line-height:1.7!important;margin:0!important}\n.mm-tv-learning-all{min-height:40px;flex:0 0 auto;border:1px solid #ebc391!important;border-radius:12px!important;background:#fff7eb!important;color:#9d5e1b!important;padding:9px 16px!important;font-size:12px!important;font-weight:800!important;cursor:pointer}\n.mm-tv-learning-all[aria-pressed=\"true\"]{background:#ffedcf!important;border-color:#eaad61!important}\n.mm-tv-learning-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 21px}\n.mm-tv-learning-step{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:9px!important;text-align:left!important;min-width:0!important;padding:17px 15px 18px!important;cursor:pointer!important;border:1px solid #e3e8ee!important;border-radius:15px!important;background:#f8fafc!important;min-height:150px!important;color:#27394f!important;box-shadow:none!important}\n.mm-tv-learning-step:hover:not(:disabled){border-color:#e8b67c!important;background:#fff9f1!important}\n.mm-tv-learning-step[aria-pressed=\"true\"]{border-color:#eba13e!important;background:linear-gradient(135deg,#fff6e8,#fffdf9)!important;box-shadow:inset 0 0 0 1px #f0bb73!important}\n.mm-tv-learning-step:disabled{opacity:.5!important;cursor:not-allowed!important}\n.mm-tv-learning-step-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.mm-tv-learning-step-number{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #e9d0b0;border-radius:11px;background:#fff;color:#a46a23;font-size:12px;font-weight:850}\n.mm-tv-learning-step[aria-pressed=\"true\"] .mm-tv-learning-step-number{background:#eea444;color:#1b2839;border-color:#eea444}\n.mm-tv-learning-step-count{font-size:11px;color:#9c7b55;font-weight:700;white-space:nowrap}\n.mm-tv-learning-step-title{font-size:15px!important;line-height:1.35!important;color:#172b41!important;font-weight:850!important;letter-spacing:-.01em}\n.mm-tv-learning-step-desc{font-size:11.5px!important;line-height:1.5!important;color:#68798b!important}\n.mm-tv-learning-albums{padding:17px 0 18px;border-top:1px solid #e9edf2}\n.mm-tv-learning-albums-title{display:block;color:#33465a;font-size:13px;font-weight:850;margin-bottom:12px}\n.mm-tv-learning-album-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n.mm-tv-learning-album{display:flex!important;align-items:center!important;text-align:left!important;gap:12px!important;min-width:0!important;min-height:68px!important;padding:9px 12px!important;background:#fff!important;color:#172b40!important;border:1px solid #e5ebf2!important;border-radius:13px!important;cursor:pointer!important}\n.mm-tv-learning-album:hover{background:#fafcff!important;border-color:#e7b577!important}\n.mm-tv-learning-album[aria-pressed=\"true\"]{background:#fff7ed!important;border-color:#e69c3c!important}\n.mm-tv-learning-album-thumb{display:block;position:relative;flex:0 0 72px;width:72px;height:46px;border-radius:7px;background:#152337;overflow:hidden}\n.mm-tv-learning-album-thumb img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important}\n.mm-tv-learning-album-label{display:flex;flex-direction:column;gap:3px;min-width:0}\n.mm-tv-learning-album-label strong{font-size:13px;color:#203348;line-height:1.3;overflow-wrap:anywhere}\n.mm-tv-learning-album-label small{font-size:11px;color:#708195}\n.mm-tv-learning-selection{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e9edf2;padding-top:15px}\n.mm-tv-learning-selection strong{font-size:16px;font-weight:800;color:#1a3148}\n.mm-tv-learning-selection span{font-size:12px;font-weight:650;color:#738399;white-space:nowrap}\n.mm-tv-grid .mm-tv-card[hidden]{display:none!important}\n.mm-tv-learning button:focus-visible{outline:3px solid #e39326!important;outline-offset:3px!important}\n@media(max-width:1070px){.mm-tv-learning-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-tv-learning-step{min-height:138px!important}}\n@media(max-width:620px){.mm-tv-learning{padding:17px 15px;border-radius:16px}.mm-tv-learning-top{align-items:flex-start;flex-direction:column;gap:13px;margin-bottom:18px}.mm-tv-learning-steps{gap:8px}.mm-tv-learning-step{padding:13px 11px 14px!important;min-height:150px!important}.mm-tv-learning-step-title{font-size:14px!important}.mm-tv-learning-album-choices{grid-template-columns:1fr}.mm-tv-learning-selection{align-items:flex-start;flex-direction:column;gap:4px}.mm-tv-learning-all{width:100%!important}}\n@media(max-width:380px){.mm-tv-learning-steps{grid-template-columns:1fr}.mm-tv-learning-step{min-height:110px!important}}\n@media(prefers-reduced-motion:reduce){.mm-tv-learning-step,.mm-tv-learning-album{transition:none!important}}\n";
function assets(){
 return new Map([
  [JS_PATH,{body:Buffer.from(CLIENT,'utf8'),mime:'text/javascript; charset=utf-8'}],
  [CSS_PATH,{body:Buffer.from(CSS,'utf8'),mime:'text/css; charset=utf-8'}]
 ]);
}
function injectHtml(html,pathname){
 if(pathname!=='/'&&pathname!=='/index.html')return html;
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-mm-tv-learning="'+VERSION+'"'))return html;
 const tags='<link rel="stylesheet" href="'+CSS_PATH+'?v='+VERSION+'" data-mm-tv-learning="'+VERSION+'">'+
  '<script defer src="'+JS_PATH+'?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,tags+'</head>');
}
module.exports={VERSION,JS_PATH,CSS_PATH,LEVELS,stageOf,albumOf,learningCatalog,CLIENT,CSS,assets,injectHtml};
