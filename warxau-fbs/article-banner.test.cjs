'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const sharp=require('sharp');
const {DatabaseSync}=require('node:sqlite');
const {createArticlePublisher}=require('./article-publisher.cjs');
const {prepareBanner}=require('./article-banner.cjs');

async function test(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marketmarney-banner-'));
 let server;
 try{
  const database=path.join(dir,'marketmarney.sqlite');
  const db=new DatabaseSync(database);
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const existing={id:'original-article',title:'Artikel awal tanpa gambar',cat:'SAHAM',status:'published',img:'',body:'<p>Asli</p>'};
  const put=(key,value)=>db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
  put('articles',[existing]);put('editorial_audit',[]);db.close();
  const token='x'.repeat(60),tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const publisher=createArticlePublisher({tokenHash,dataDirectory:dir,allowTestDirectory:true});
  server=http.createServer((req,res)=>publisher.owns(req)?publisher.handle(req,res):(res.writeHead(404),res.end()));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/api/integrations/articles';
  const auth={Authorization:'Bearer '+token};
  async function post(url,article,headers=auth) {
   const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(article)});
   let data=null;try{data=await response.json()}catch{}
   return {status:response.status,data};
  }
  const png=await sharp({create:{width:1280,height:720,channels:4,background:'#ea9e2c'}}).png().toBuffer();
  const banner={mime_type:'image/png',base64:png.toString('base64')};
  const clean=await prepareBanner(banner);
  assert.equal(clean.mime,'image/webp');
  assert.ok(clean.buffer.toString('ascii',0,4)==='RIFF'&&clean.buffer.toString('ascii',8,12)==='WEBP');
  const article={title:'Pasar Emas dan Goldman Sachs: Tekanan Jual Spekulatif Kembali Menjadi Sorotan',
   summary:'Pelaku pasar mencermati tekanan jual emas dan dampaknya terhadap transaksi XAUUSD dalam periode volatil.',
   content:'Harga emas dunia menghadapi tekanan setelah aksi jual spekulatif dalam beberapa pekan. Pergerakan dolar AS menjadi salah satu faktor yang diamati trader.\n\nTrader memperhatikan sentimen pasar dan pengelolaan risiko untuk menghadapi volatilitas. Berita ini bersifat informatif, bukan saran investasi.',
   category:'EMAS',status:'published',confirm_publish:true,source_name:'MarketMarney',
   source_url:'https://example.com/komoditas/emas-goldman',banner};
  let result=await post(base,article,{});
  assert.equal(result.status,401);
  result=await post(base,{...article,banner:{...banner,mime_type:'image/jpeg'}});
  assert.equal(result.status,422);
  result=await post(base,{...article,banner:{mime_type:'image/png',base64:'!!!'}});
  assert.equal(result.status,422);
  result=await post(base,{...article,banner:{mime_type:'image/svg+xml',base64:banner.base64}});
  assert.equal(result.status,422);
  assert.ok(!fs.existsSync(path.join(dir,'uploads')),'invalid images must not create media files');
  result=await post(base,article);
  assert.equal(result.status,201,JSON.stringify(result.data));
  assert.match(result.data.img,/^\/media\/[0-9a-f-]{36}\.webp$/);
  const firstPath=path.join(dir,'uploads',result.data.img.slice(7));
  assert.ok(fs.statSync(firstPath).isFile());
  assert.ok(fs.readFileSync(firstPath).toString('ascii',8,12)==='WEBP');
  const db2=new DatabaseSync(database);
  const articles=JSON.parse(db2.prepare("SELECT value FROM settings WHERE key='articles'").get().value);
  assert.equal(articles.length,2);
  assert.deepEqual(articles[0],existing);
  assert.equal(articles[1].img,result.data.img);
  assert.equal(articles[1].status,'published');
  const audit=JSON.parse(db2.prepare("SELECT value FROM settings WHERE key='editorial_audit'").get().value);
  assert.equal(audit[0].actor,'article-api');
  db2.close();
  assert.ok(fs.readdirSync(path.join(dir,'integration-backups')).length>=1);
  result=await post(base,article);
  assert.equal(result.status,409);
  assert.equal(fs.readdirSync(path.join(dir,'uploads')).length,1,'duplicate should not save another image');
  result=await post(base+'/banner',{article_id:'original-article',banner,confirm_attach:true});
  assert.equal(result.status,200);
  assert.match(result.data.img,/\.webp$/);
  result=await post(base+'/banner',{article_id:'original-article',banner,confirm_attach:true});
  assert.equal(result.status,409,'must protect existing banner against unconfirmed overwrite');
  result=await post(base+'/banner',{article_id:'original-article',banner,confirm_attach:true,replace_banner:true});
  assert.equal(result.status,200,'explicit replacement allowed');
  result=await post(base+'/banner',{article_id:'not-real',banner,confirm_attach:true});
  assert.equal(result.status,404);
  result=await post(base+'/banner',{article_id:'original-article',banner,confirm_attach:false});
  assert.equal(result.status,422);
  // A late audit failure must roll back both database changes and newly created media.
  const corrupt=new DatabaseSync(database);
  corrupt.prepare("UPDATE settings SET value=? WHERE key='editorial_audit'").run('{"not":"array"}');
  corrupt.close();
  const beforeCount=fs.readdirSync(path.join(dir,'uploads')).length;
  const changed={...article,title:'Berita Analisis Tambahan Emas dengan Banner Khusus Baru',
   source_url:'https://example.com/komoditas/emas-goldman-2'};
  result=await post(base,changed);
  assert.equal(result.status,503);
  assert.equal(fs.readdirSync(path.join(dir,'uploads')).length,beforeCount,'orphan media must be removed on rollback');
  const db3=new DatabaseSync(database,{readOnly:true});
  const last=JSON.parse(db3.prepare("SELECT value FROM settings WHERE key='articles'").get().value);
  assert.equal(last.length,2,'failed transaction must preserve article list');
  db3.close();
  console.log('PASS: banner types, WebP encoding, atomic media+article, backups, duplicate checks, attachment, replacement confirmation and rollback');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
test().catch(err=>{console.error(err);process.exitCode=1});
