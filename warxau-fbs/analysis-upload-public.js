(function publicClient(){
'use strict';
const ID='mm-analysis-public-v1',isAnalysis=a=>a&&/^mm-analysis-[0-9a-f-]{32,36}$/i.test(String(a.id||'')),safeImg=s=>/^\/media\/[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/i.test(String(s||''));
let last=0,ongoing=false;
function line(s,cls){const n=document.createElement('span');n.className=cls;n.textContent=String(s||'');return n;}
function show(panel,articles){
 const root=panel.querySelector('.mm-analysis-cards');root.replaceChildren();
 const published=(articles||[]).filter(a=>isAnalysis(a)&&(a.status||'published')==='published').sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,12);
 const counter=panel.querySelector('.mm-analysis-public-count');counter.textContent=published.length+' analisa';
 if(!published.length){const msg=document.createElement('p');msg.className='mm-analysis-empty';msg.textContent='Belum ada analisa yang diterbitkan. Pantau halaman ini untuk publikasi selanjutnya.';root.append(msg);return;}
 for(const a of published){
 const card=document.createElement('a');card.className='mm-analysis-card';card.href='/berita/'+encodeURIComponent(a.id);
 if(safeImg(a.img)){const img=document.createElement('img');const original=a.img;const thumbnail='/assets/news-thumb-v1/640/'+original.slice('/media/'.length);img.src=thumbnail;img.loading='lazy';img.decoding='async';img.fetchPriority='low';img.width=640;img.height=360;img.alt='Ilustrasi '+String(a.title||'analisa').slice(0,100);img.addEventListener('error',()=>{if(img.src.endsWith(thumbnail))img.src=original;else img.hidden=true;},{passive:true});card.append(img);}
 const b=document.createElement('div');b.className='mm-analysis-card-content';
 b.append(line(String(a.cat||'MARKET')+' · '+new Date(a.date||Date.now()).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),'mm-analysis-card-kicker'));
 const h=document.createElement('strong');h.textContent=String(a.title||'Analisa Market');b.append(h);
 const p=document.createElement('p');p.textContent=String(a.desc||'').slice(0,220);b.append(p);
 b.append(line('Baca analisa lengkap ↗','mm-analysis-card-link'));card.append(b);root.append(card);
 }
}
async function refresh(panel){
 if(ongoing)return;ongoing=true;
 try{const feed=window.MMAnalysisPublicFeed;let items;if(feed&&Number.isFinite(feed.at)&&Date.now()-feed.at<25000&&Array.isArray(feed.articles))items=feed.articles;else{const r=await fetch('/api/content',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Layanan analisa belum tersedia.');const doc=await r.json();if(!Array.isArray(doc.articles))throw Error('Format daftar analisa tidak dikenali.');items=doc.articles;}show(panel,items);last=Date.now();}
 catch(e){panel.querySelector('.mm-analysis-cards').textContent='Daftar analisa belum bisa dimuat. Coba muat ulang halaman.';}finally{ongoing=false;}
}
function mount(){
 const shell=document.querySelector('.mm87-shell.mm1815-anal-shell');if(!shell)return;
 // Both existing cards are children of the analysis shell. Keep the published
 // analysis section BETWEEN the indicator guide and the Pivot Points card.
 const guide=shell.querySelector(':scope > .mm87-info');
 const pivot=shell.querySelector(':scope > .mm1816-pivot-public');
 if(!guide||!pivot)return;
 const children=Array.from(shell.children);
 if(children.indexOf(guide)<0||children.indexOf(pivot)<=children.indexOf(guide))return;
 let panel=document.getElementById(ID);
 if(!panel){panel=document.createElement('section');panel.id=ID;panel.className='mm-analysis-public';panel.innerHTML='<div class="mm-analysis-public-head"><div><span class="mm-analysis-eyebrow">MARKETMARNEY / TECHNICAL DESK</span><h2>Publikasi Analisa Market</h2><p>Analisa teknikal dari redaksi MarketMarney. Level bukan harga real-time atau rekomendasi trading.</p></div><span class="mm-analysis-public-count">Memuat...</span></div><div class="mm-analysis-cards" aria-live="polite"></div>';}
 if(panel.parentNode!==shell||panel.nextElementSibling!==pivot)shell.insertBefore(panel,pivot);
 if(Date.now()-last>30000)refresh(panel);
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
const root=document.getElementById('app')||document.body;
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.mm87-shell,.mm87-info,.mm1816-pivot-public')||n.querySelector?.('.mm87-shell,.mm87-info,.mm1816-pivot-public')))))schedule();}).observe(root,{subtree:true,childList:true});
document.addEventListener('click',e=>{const b=e.target.closest?.('.navbtn,.feature-card');if(b&&/analisa/i.test(b.textContent||b.dataset?.page||''))setTimeout(schedule,180);},true);
})();
