'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite'),{createArticlePublisher}=require('./article-publisher.cjs');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marney-delete-'));let server;
 try{
  const file=path.join(dir,'marketmarney.sqlite'),db=new DatabaseSync(file);
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const target={
   id:'mm-editorial-86f9d6caf733f22b0f87b88a',
   title:'Emas Tertekan! Goldman Ungkap Aksi Jual Besar-Besaran hingga US$19,5 Miliar',
   sourceUrl:'https://id.investing.com/news/commodities-news/mengapa-emas-kehilangan-kilauannya-goldman-uraikan-aksi-jual-terkini-3121651',
   status:'published',img:'',cat:'EMAS'
  };
  const other={id:'another-article',title:'MarketMarney Other News',sourceUrl:'https://example.com/other',status:'published',body:'Leave me alone'};
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('articles',JSON.stringify([other,target]));
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('editorial_audit','[]');
  db.close();
  const token='v'.repeat(60),tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const publisher=createArticlePublisher({dataDirectory:dir,allowTestDirectory:true,tokenHash});
  server=http.createServer((req,res)=>publisher.owns(req)?publisher.handle(req,res):res.writeHead(404).end());
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/integrations/articles/delete';
  const payload={article_id:target.id,title:target.title,source_url:target.sourceUrl,confirm_delete:true};
  const send=async(b,tokenHeader='Bearer '+token)=>{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Authorization:tokenHeader},body:JSON.stringify(b)});return {status:r.status,body:await r.json()};};
  assert.equal((await send(payload,'')).status,401);
  assert.equal((await send({...payload,confirm_delete:false})).status,422);
  assert.equal((await send({...payload,title:'Different article title'})).status,409);
  assert.equal((await send({...payload,source_url:'https://example.org/wrong'})).status,409);
  assert.equal((await send({...payload,article_id:'another-article'})).status,422);
  assert.ok(!fs.existsSync(path.join(dir,'integration-backups')),'no backup for denied requests');
  const deleted=await send(payload);assert.equal(deleted.status,200);assert.equal(deleted.body.deleted,true);assert.equal(deleted.body.id,target.id);
  const db2=new DatabaseSync(file,{readOnly:true});
  const rows=JSON.parse(db2.prepare("SELECT value FROM settings WHERE key='articles'").get().value);
  assert.deepEqual(rows,[other],'other article must stay untouched');
  const audit=JSON.parse(db2.prepare("SELECT value FROM settings WHERE key='editorial_audit'").get().value);
  assert.equal(audit.length,1);assert.equal(audit[0].action,'deleted');assert.equal(audit[0].id,target.id);
  db2.close();
  const backups=fs.readdirSync(path.join(dir,'integration-backups'));assert.equal(backups.length,1);
  const db3=new DatabaseSync(path.join(dir,'integration-backups',backups[0]),{readOnly:true});
  const before=JSON.parse(db3.prepare("SELECT value FROM settings WHERE key='articles'").get().value);
  assert.equal(before.length,2,'backup contains deleted article');
  db3.close();
  assert.equal((await send(payload)).status,404,'repeated deletion is idempotently rejected');
  console.log('PASS: unauthorized/unsafe delete denied, exact ID+title+source matching, backup, audit, other articles unaffected');
 }finally{if(server)await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
