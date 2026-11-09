(function adminClient(){
'use strict';
const ID='mm-analysis-admin-v1', PREFIX='mm-analysis-',API='/api/admin/content';
const $=(root,name)=>root.querySelector('[name="'+name+'"]');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const goodImg=v=>/^\/media\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/i.test(String(v||''))||/^https:\/\//i.test(String(v||''));
const isAnalysis=a=>a&&typeof a.id==='string'&&/^mm-analysis-[0-9a-f-]{32,36}$/i.test(a.id);
const disclaimer='Disclaimer: Analisis ini bersifat edukatif dan bukan rekomendasi investasi. Harga dapat berubah sewaktu-waktu.';
let section,form,list,status,editId='',imageUrl='',previewUrl='';
function message(s,error=false){status.textContent=s;status.dataset.error=String(error);}
function toHtml(s){return String(s).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>'<p>'+esc(x).replace(/\n/g,'<br>')+'</p>').join('');}
function unwrap(s){return String(s||'').replace(/^ANALISA MARKET[^\n]*\n\n/,'').replace(/\n\nDisclaimer: Analisis ini bersifat edukatif dan bukan rekomendasi investasi\. Harga dapat berubah sewaktu-waktu\.\s*$/,'').trim();}
async function readContent(){const r=await fetch(API,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(r.status===401?'Sesi admin berakhir. Silakan masuk kembali.':'Gagal memuat artikel (HTTP '+r.status+').');const j=await r.json();if(!Array.isArray(j.articles)||!Array.isArray(j.forums)||typeof j.revision!=='string'||!j.revision)throw Error('Format data admin tidak sesuai.');return j;}
function asText(a){return String(a||'').replace(/\s+/g,' ').trim();}
function draw(articles){
 list.replaceChildren();
 const subset=articles.filter(isAnalysis).sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,35);
 if(!subset.length){const p=document.createElement('p');p.className='mm-analysis-muted';p.textContent='Belum ada analisa dari panel ini.';list.append(p);return;}
 for(const a of subset){
 const row=document.createElement('div');row.className='mm-analysis-list-row';
 const title=document.createElement('span');title.className='mm-analysis-list-title';title.textContent=String(a.title||'Tanpa judul');
 const badge=document.createElement('small');badge.textContent=a.status==='published'?'Terbit':'Draf';
 const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.dataset.edit=a.id;
 row.append(title,badge,edit);
 if(a.status==='published'){const link=document.createElement('a');link.href='/berita/'+encodeURIComponent(a.id);link.target='_blank';link.rel='noopener';link.textContent='Lihat';row.append(link);}
 list.append(row);
 }
}
async function reload(){message('Memuat analisa...');try{const d=await readContent();draw(d.articles);message('Daftar analisa sudah diperbarui.');}catch(e){message(e.message,true);}}
function reset(){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
 form.reset();editId='';imageUrl='';const preview=section.querySelector('.mm-analysis-preview');preview.hidden=true;preview.removeAttribute('src');
 section.querySelector('.mm-analysis-current').textContent='Analisa baru';
 message('Isi analisa, lalu pilih Simpan Draf atau Terbitkan.');
}
async function edit(id){
 try{const d=await readContent(),a=d.articles.find(x=>x.id===id&&isAnalysis(x));if(!a)throw Error('Analisa tidak ditemukan di server.');
 editId=a.id;imageUrl=goodImg(a.img)?a.img:'';
 $(form,'title').value=a.title||'';$(form,'category').value=a.cat||'EMAS';$(form,'pair').value=a.analysisPair||((a.desc||'').match(/^([^·]+) ·/)||[])[1]?.trim()||'XAU/USD';
 $(form,'timeframe').value=a.analysisTimeframe||((a.desc||'').match(/ · (M5|M15|H1|H4|D1|W1) ·/)||[])[1]||'H1';
 $(form,'bias').value=a.analysisBias||'netral';
 $(form,'summary').value=a.analysisSummary||String(a.desc||'').replace(/^[^·]{2,35} · (?:M5|M15|H1|H4|D1|W1) · [^—]{1,28} — /,'');
 $(form,'analysis').value=a.analysisText||unwrap(a.body);
 $(form,'image').value='';
 section.querySelector('.mm-analysis-current').textContent='Mengedit analisa tersimpan';
 const p=section.querySelector('.mm-analysis-preview');p.hidden=!imageUrl;if(imageUrl)p.src=imageUrl;
 section.scrollIntoView({behavior:'smooth',block:'start'});message('Analisa dimuat. Simpan untuk menerapkan perubahan.');
 }catch(e){message(e.message,true);}
}
async function uploadImage(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Gambar harus JPG, PNG, atau WebP maksimal 5 MB.');
 const r=await fetch('/api/admin/upload',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type,'X-File-Kind':'image','X-MarketMarney-Request':'1'},body:file,signal:AbortSignal.timeout(45000)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!goodImg(j.url))throw Error(j.error||'Gagal mengunggah gambar.');return j.url;
}
async function save(mode){
 const title=asText($(form,'title').value),category=$(form,'category').value,pair=asText($(form,'pair').value).toUpperCase(),timeframe=$(form,'timeframe').value,bias=$(form,'bias').value;
 const summary=$(form,'summary').value.trim(),body=$(form,'analysis').value.trim(),image=$(form,'image').files[0];
 if(title.length<20||title.length>220)throw Error('Judul harus 20–220 karakter.');
 if(!/^[A-Z0-9:/._ -]{2,32}$/.test(pair))throw Error('Pair/simbol harus 2–32 karakter (misalnya XAU/USD).');
 if(!['EMAS','FOREX','CRYPTO','SAHAM','EKONOMI'].includes(category))throw Error('Kategori tidak dikenal.');
 if(!['M5','M15','H1','H4','D1','W1'].includes(timeframe))throw Error('Timeframe tidak dikenal.');
 if(!['bullish','bearish','netral'].includes(bias))throw Error('Arah analisa tidak dikenal.');
 if(summary.length<55||summary.length>1000)throw Error('Ringkasan harus 55–1000 karakter.');
 if(body.length<160||body.length>20000)throw Error('Isi analisa harus 160–20.000 karakter.');
 const submitButtons=[...form.querySelectorAll('button[type=submit]')];submitButtons.forEach(b=>b.disabled=true);
 try{
  message('Menyiapkan data dan menyimpan ke server...');
  const d=await readContent(),existing=editId?d.articles.find(x=>x.id===editId):null;
  if(editId&&!existing)throw Error('Analisa tidak ditemukan; muat ulang daftar.');
  const uploaded=image?await uploadImage(image):null;
  const id=existing?.id||PREFIX+crypto.randomUUID().replace(/-/g,'');
  const header='ANALISA MARKET | '+pair+' | '+timeframe+' | '+bias.toUpperCase();
  const fullBody=header+'\n\n'+body+'\n\n'+disclaimer;
  const a={...(existing||{}),id,title,cat:category,category,desc:pair+' · '+timeframe+' · '+bias.toUpperCase()+' — '+summary,img:uploaded||imageUrl||existing?.img||'stocks',body:fullBody,bodyHtml:toHtml(fullBody),date:existing?.date||new Date().toISOString(),status:mode,analysisPair:pair,analysisTimeframe:timeframe,analysisBias:bias,analysisSummary:summary,analysisText:body};
  const next=existing?d.articles.map(x=>x.id===id?a:x):[a,...d.articles];
  const r=await fetch(API,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-MarketMarney-Request':'1','If-Match':d.revision},body:JSON.stringify({articles:next,forums:d.forums}),signal:AbortSignal.timeout(25000)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(r.status===409||r.status===412?'Data admin berubah saat kamu menyimpan. Muat ulang lalu coba lagi.':r.status===401?'Sesi admin habis. Masuk kembali.':j.error||'Gagal menyimpan (HTTP '+r.status+').');
  reset();draw(next);
  message(mode==='published'?'Analisa berhasil diterbitkan. Lihat pada halaman Analisa Market.':'Draf analisa berhasil disimpan.');
  window.dispatchEvent(new Event('mm:analysis-published'));
 }finally{submitButtons.forEach(b=>b.disabled=false);}
}
function mount(){
 if(document.getElementById(ID))return;
 const articleEditor=document.getElementById('admin-article-editor')||document.getElementById('admin-article-list');
 if(!articleEditor||!articleEditor.parentNode)return;
 section=document.createElement('section');section.id=ID;section.className='mm-analysis-admin';
 section.innerHTML=`<div class="mm-analysis-heading"><div><span class="mm-analysis-eyebrow">MARKETMARNEY / ADMIN</span><h2>Unggah Analisa Market</h2><p>Buat analisa untuk halaman Analisa Market. Simpan sebagai draf atau terbitkan secara manual.</p></div><a href="/#analisa" target="_blank" rel="noopener">Lihat halaman publik ↗</a></div>
<form class="mm-analysis-form" novalidate><div class="mm-analysis-current">Analisa baru</div><div class="mm-analysis-grid">
<label>Judul analisa <input name="title" maxlength="220" required placeholder="Contoh: Emas Uji Supply US$4.165, Breakout atau Rejection?"></label>
<label>Kategori <select name="category"><option value="EMAS">Emas</option><option value="FOREX">Forex</option><option value="CRYPTO">Kripto</option><option value="SAHAM">Saham / Indeks</option><option value="EKONOMI">Ekonomi</option></select></label>
<label>Pair / Simbol <input name="pair" maxlength="32" list="mm-analysis-pairs" value="XAU/USD" required placeholder="XAU/USD"></label>
<label>Timeframe <select name="timeframe"><option>M5</option><option>M15</option><option selected>H1</option><option>H4</option><option>D1</option><option>W1</option></select></label>
<label>Arah analisis <select name="bias"><option value="netral">Netral / menunggu konfirmasi</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option></select></label>
<label>Gambar analisa <input name="image" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG, atau WebP maksimal 5 MB</small></label></div>
<datalist id="mm-analysis-pairs"><option value="XAU/USD"><option value="EUR/USD"><option value="GBP/USD"><option value="USD/JPY"><option value="BTC/USD"><option value="ETH/USD"><option value="S&P 500"><option value="NASDAQ 100"></datalist>
<img class="mm-analysis-preview" alt="Pratinjau gambar analisa" hidden>
<label>Ringkasan singkat <textarea name="summary" rows="3" maxlength="1000" placeholder="Ringkasan untuk kartu analisa. Minimal 55 karakter." required></textarea></label>
<label>Isi analisa / Skenario <textarea name="analysis" rows="9" maxlength="20000" placeholder="Uraikan kondisi pasar, supply, demand, dan skenario bullish/bearish. Minimal 160 karakter." required></textarea></label>
<div class="mm-analysis-actions"><button type="submit" name="mode" value="draft">Simpan Draf</button><button class="mm-analysis-primary" type="submit" name="mode" value="published">Terbitkan Analisa</button><button type="button" data-reset>Analisa Baru</button></div>
<p class="mm-analysis-status" role="status" aria-live="polite">Siap digunakan.</p></form>
<div class="mm-analysis-list-head"><h3>Analisa tersimpan</h3><button type="button" data-reload>Muat Ulang</button></div><div class="mm-analysis-admin-list" aria-live="polite"></div>
<p class="mm-analysis-muted">Analisa menggunakan sistem artikel Admin yang sama sehingga bisa diedit melalui daftar berita juga. Tidak ada publikasi otomatis.</p>`;
 articleEditor.parentNode.insertBefore(section,articleEditor);
 form=section.querySelector('form');list=section.querySelector('.mm-analysis-admin-list');status=section.querySelector('.mm-analysis-status');
 const nav=document.querySelector('aside nav')||document.querySelector('nav');if(nav&&!nav.querySelector('[data-mm-analysis-nav]')){const a=document.createElement('a');a.href='#'+ID;a.dataset.mmAnalysisNav='1';a.className='mm-analysis-nav';a.textContent='✎ Unggah Analisa';nav.append(a);}
 form.addEventListener('submit',async e=>{e.preventDefault();const mode=e.submitter?.value==='published'?'published':'draft';try{await save(mode);}catch(err){message(err.message||'Gagal menyimpan.',true);}});
 section.querySelector('[data-reset]').addEventListener('click',reset);
 section.querySelector('[data-reload]').addEventListener('click',reload);
 section.querySelector('[name=image]').addEventListener('change',e=>{const img=section.querySelector('.mm-analysis-preview');if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}const f=e.target.files[0];if(f){previewUrl=URL.createObjectURL(f);img.src=previewUrl;img.hidden=false;}else{img.hidden=!imageUrl;if(imageUrl)img.src=imageUrl;}});
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-edit]');if(b)edit(b.dataset.edit);});
 reload();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
