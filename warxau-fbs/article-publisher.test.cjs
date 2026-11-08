'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {DatabaseSync}=require('node:sqlite');
const {createArticlePublisher,validate}=require('./article-publisher.cjs');
const sample={
 title:'Emas Tertekan! Goldman Ungkap Aksi Jual Spekulatif Senilai US$19,5 Miliar',
 summary:'Aksi jual spekulatif emas mencapai sekitar US$19,5 miliar sejak 22 September berdasarkan pembahasan data CFTC.',
 content:'Harga emas dunia menghadapi tekanan setelah aksi jual spekulatif besar selama akhir Oktober 2026.\n\nPosisi beli yang ditutup mencapai miliaran dolar. Penguatan dolar AS juga dapat memengaruhi harga emas dan keputusan investor.\n\nTrader XAU/USD harus memantau volatilitas, pergerakan dolar, serta support dan resistance sebelum mengambil keputusan.',
 category:'EMAS',status:'published',confirm_publish:true,source_url:'https://id.investing.com/news/commodities-news/mengapa-emas-kehilangan-kilauannya-goldman-uraikan-aksi-jual-terkini-3121651',source_name:'Investing.com'};
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marney-api-'));let server;
 try{
  const filename=path.join(dir,'marketmarney.sqlite'),db=new DatabaseSync(filename);
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const old=[{id:'existing',title:'Existing article',cat:'SAHAM',body:'original',status:'published'}];
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('articles',JSON.stringify(old));
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('editorial_audit','[]');db.close();
  const token='x'.repeat(60),hash=crypto.createHash('sha256').update(token).digest('hex');
  assert.equal(createArticlePublisher({dataDirectory:dir,allowTestDirectory:true}),null);
  const publisher=createArticlePublisher({tokenHash:hash,dataDirectory:dir,allowTestDirectory:true});
  server=http.createServer((req,res)=>publisher.owns(req)?publisher.handle(req,res):res.end());
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const url='http://127.0.0.1:'+server.address().port+'/api/integrations/articles';
  const post=(b,h={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify(b)});
  assert.equal((await post(sample)).status,401);
  assert.equal((await post(sample,{Authorization:'Bearer '+('z'.repeat(60))})).status,401);
  const auth={Authorization:'Bearer '+token};
  assert.equal((await post({...sample,content:'too short'},auth)).status,422);
  assert.equal((await post({...sample,confirm_publish:false},auth)).status,422);
  assert.equal((await post(sample,{...auth,Origin:'https://other.example'})).status,403);
  const first=await post(sample,auth);assert.equal(first.status,201);
  const created=await first.json();assert.equal(created.status,'published');assert.match(created.canonicalPath,/^\/berita\/mm-editorial-/);
  assert.equal((await post(sample,auth)).status,409);
  const rdb=new DatabaseSync(filename,{readOnly:true});
  const articles=JSON.parse(rdb.prepare("SELECT value FROM settings WHERE key='articles'").get().value);
  const history=JSON.parse(rdb.prepare("SELECT value FROM settings WHERE key='editorial_audit'").get().value);
  assert.equal(articles.length,2);assert.deepEqual(articles[0],old[0]);
  assert.equal(history.length,1);assert.equal(history[0].actor,'article-api');
  assert.equal(fs.readdirSync(path.join(dir,'integration-backups')).length,1);
  rdb.close();
  assert.equal((await post({...sample,source_url:'http://unsafe.test/article'},auth)).status,422);
  const clean=validate({...sample,content:('<script>alert(1)</script> '+'normal text ').repeat(50)});
  assert.ok(!clean.body.includes('<script>')&&clean.body.includes('&lt;script&gt;'));
  assert.equal((await fetch(url,{method:'GET',headers:auth})).status,405);
  console.log('PASS: auth, quality gate, backups, duplicates, audit, XSS encoding, record preservation');
 }finally{if(server)await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
