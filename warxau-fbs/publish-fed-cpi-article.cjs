'use strict';

// Guarded, duplicate-safe one-time editorial migration requested by the site owner.
if(process.env.MM_PUBLISH_FED_CPI_20261110==='1'){
 const fs=require('node:fs');
 const path=require('node:path');
 const crypto=require('node:crypto');
 const {DatabaseSync}=require('node:sqlite');
 const {validate}=require('./article-publisher.cjs');
 const strip=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
 const payload={
  title:'Peluang Kenaikan Suku Bunga Fed 50 Bps Muncul Usai CPI AS Lebih Panas',
  summary:'Inflasi konsumen Amerika Serikat pada Oktober 2026 naik lebih tinggi dari perkiraan. Pasar kemudian mulai memperhitungkan peluang kenaikan suku bunga Federal Reserve sebesar 50 basis poin pada pertemuan Desember, meski kenaikan 25 basis poin masih menjadi skenario utama.',
  content:`MarketMarney — Taruhan terhadap kenaikan suku bunga Federal Reserve yang lebih agresif mulai bertambah setelah Amerika Serikat merilis data inflasi konsumen Oktober 2026 yang lebih panas dari perkiraan.

CPI AS NAIK 0,4 PERSEN

Biro Statistik Tenaga Kerja Amerika Serikat melaporkan Indeks Harga Konsumen atau CPI naik 0,4% secara bulanan pada Oktober 2026. Angka tersebut melambat dari kenaikan 0,6% pada September, tetapi lebih tinggi dari perkiraan ekonom sebesar 0,3%.

CPI inti, yang tidak memasukkan harga makanan dan energi, meningkat 0,3% pada Oktober. Hasil tersebut juga melampaui perkiraan pasar sebesar 0,2%.

Kenaikan harga tempat tinggal, makanan, dan energi ikut mendorong inflasi bulanan. Indeks tempat tinggal naik 0,3%, makanan meningkat 0,5%, dan energi bertambah 0,7%.

BLS tidak menerbitkan perbandingan inflasi tahunan untuk Oktober 2026 pada sejumlah seri karena data Oktober 2025 tidak tersedia akibat penghentian sementara kegiatan pemerintah pada tahun lalu.

PELUANG KENAIKAN 50 BPS MULAI MUNCUL

Setelah laporan CPI diterbitkan, pasar kontrak Fed Funds mulai memperhitungkan kemungkinan Federal Reserve menaikkan suku bunga sebesar 50 basis poin atau 0,50 poin persentase pada pertemuan Desember.

Data CME FedWatch yang dikutip sejumlah media menunjukkan peluang kenaikan 50 basis poin berada di kisaran sekitar 10% hingga 15% setelah sebelumnya hampir tidak diperhitungkan.

Kenaikan 25 basis poin tetap menjadi skenario utama, dengan probabilitas sekitar 85% hingga 90% pada saat laporan ini disusun.

Probabilitas FedWatch bergerak mengikuti harga kontrak berjangka Fed Funds dan dapat berubah cepat sepanjang sesi. Angka tersebut menggambarkan ekspektasi pasar, bukan keputusan resmi Federal Reserve.

PERTEMUAN FED DIJADWALKAN 8–9 DESEMBER

Federal Open Market Committee dijadwalkan menggelar pertemuan kebijakan berikutnya pada 8–9 Desember 2026. Pertemuan tersebut juga akan disertai pembaruan proyeksi ekonomi Federal Reserve.

Pada pertemuan Oktober, The Fed mempertahankan target suku bunga federal funds pada kisaran 3,75%–4,00%. Data inflasi yang lebih tinggi dari perkiraan membuat pasar menilai bank sentral memiliki alasan lebih kuat untuk kembali mengetatkan kebijakan.

Namun, keputusan Desember belum ditentukan. The Fed masih akan mempertimbangkan data tenaga kerja, inflasi produsen, konsumsi, kondisi kredit, dan perkembangan pasar keuangan sebelum mengambil keputusan.

DAMPAK TERHADAP DOLAR, EMAS, SAHAM, DAN OBLIGASI

Ekspektasi suku bunga yang lebih tinggi cenderung mendukung dolar AS dan mendorong kenaikan imbal hasil obligasi pemerintah.

Emas dapat menghadapi tekanan ketika dolar dan yield Treasury menguat karena logam mulia tidak memberikan bunga. Meski demikian, pergerakan XAU/USD juga tetap dipengaruhi permintaan aset aman, risiko geopolitik, dan posisi investor.

Pasar saham, terutama saham teknologi dan perusahaan dengan valuasi tinggi, dapat menjadi lebih sensitif karena kenaikan suku bunga meningkatkan biaya modal dan menekan valuasi keuntungan masa depan.

REAKSI PASAR

Setelah data CPI dirilis, yield Treasury AS naik, dolar menguat, dan indeks saham melemah. Harga emas juga sempat turun karena pelaku pasar menyesuaikan kembali ekspektasi jalur suku bunga The Fed.

KESIMPULAN

Data CPI Oktober yang lebih panas dari perkiraan telah mengubah ekspektasi pasar menjelang pertemuan Federal Reserve pada Desember.

Kenaikan 25 basis poin masih menjadi skenario dominan. Namun, kemunculan peluang kenaikan 50 basis poin menunjukkan bahwa investor mulai mempertimbangkan risiko pengetatan yang lebih agresif apabila tekanan inflasi tetap kuat.

MarketMarney — Informasi pasar. Perspektif lebih luas.

Disclaimer: Probabilitas CME FedWatch dapat berubah setiap saat mengikuti harga kontrak Fed Funds. Artikel ini bersifat informatif dan edukatif, bukan rekomendasi investasi atau ajakan untuk membeli maupun menjual instrumen keuangan.`,
  category:'EKONOMI',
  source_url:'https://www.reuters.com/world/us/us-consumer-prices-rise-above-expectations-october-2026-11-10/',
  source_name:'BLS, CME FedWatch, Federal Reserve, Reuters',
  status:'published',
  confirm_publish:true
 };
 const article=validate(payload);
 const root=path.resolve(String(process.env.MM_DATA_DIR||''));
 if(!(root==='/persist'||root.startsWith('/persist/')))throw Error('unsafe_data_directory');
 const real=fs.realpathSync(root);
 if(!(real==='/persist'||real.startsWith('/persist/')))throw Error('unsafe_data_directory');
 const file=path.join(real,'marketmarney.sqlite');
 if(!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('sqlite_missing');
 const db=new DatabaseSync(file,{timeout:5000});
 try{
  const check=db.prepare('PRAGMA quick_check').all();
  if(check.length!==1||Object.values(check[0])[0]!=='ok')throw Error('sqlite_integrity_failed');
  const get=key=>{const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(row.value):null;};
  const current=get('articles');
  if(!Array.isArray(current)||current.length>=1000)throw Error('articles_unavailable');
  const duplicate=current.find(item=>item&&(item.id===article.id||String(item.sourceUrl||'')===article.sourceUrl||strip(item.title)===strip(article.title)));
  if(duplicate){
   console.log('MM_FED_CPI_ARTICLE_PUBLISH_OK '+JSON.stringify({status:'duplicate',id:duplicate.id,canonicalPath:'/berita/'+encodeURIComponent(duplicate.id)}));
  }else{
   const backupDir=path.join(real,'integration-backups');
   if(fs.existsSync(backupDir)&&fs.lstatSync(backupDir).isSymbolicLink())throw Error('unsafe_backup_dir');
   fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
   const backup=path.join(backupDir,'before-fed-cpi-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sqlite');
   db.exec("VACUUM INTO '"+backup.replace(/'/g,"''")+"'");
   const audit=get('editorial_audit')||[];
   if(!Array.isArray(audit))throw Error('audit_schema_changed');
   db.exec('BEGIN IMMEDIATE');
   try{
    current.push(article);
    const entry={at:new Date().toISOString(),action:'created',id:article.id,title:article.title,actor:'owner-requested-migration',fromStatus:null,toStatus:'published'};
    const put=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    put.run('articles',JSON.stringify(current));
    put.run('editorial_audit',JSON.stringify([entry,...audit].slice(0,500)));
    db.exec('COMMIT');
   }catch(error){try{db.exec('ROLLBACK')}catch{}throw error;}
   console.log('MM_FED_CPI_ARTICLE_PUBLISH_OK '+JSON.stringify({status:'created',id:article.id,canonicalPath:'/berita/'+encodeURIComponent(article.id)}));
  }
 }finally{db.close();}
}
