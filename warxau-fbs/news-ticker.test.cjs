'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {API_PATH,STYLE_ID,CLIENT_ID,injectTickerHtml,normalArticle,createNewsTicker}=require('./news-ticker.cjs');

function fixture(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'marketmarney-ticker-'));
 const sqlite=path.join(folder,'marketmarney.sqlite');
 const db=new DatabaseSync(sqlite);
 db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const articles=[
  {id:'old-news',title:'Artikel lama MarketMarney tetap tersedia',status:'published',category:'EMAS',createdAt:'2026-11-07T05:00:00Z'},
  {id:'latest-news',title:'The Fed bersiap mengumumkan keputusan suku bunga selanjutnya',status:'published',category:'EKONOMI',createdAt:'2026-11-11T11:00:00Z'},
  {id:'draft-story',title:'Berita ini masih dalam antrean redaksi',status:'draft',createdAt:'2026-11-11T12:00:00Z'},
  {id:'mm-analysis-123',title:'Konten analisa yang tidak ditampilkan',status:'published',createdAt:'2026-11-11T13:00:00Z'},
  {id:'unsafe/path',title:'Judul dengan identitas tidak valid untuk tautan',status:'published',createdAt:'2026-11-11T14:00:00Z'},
  {id:'malicious',title:'<img src=x onerror=alert(1)> Berita palsu',status:'review',createdAt:'2026-11-11T15:00:00Z'}
 ];
 db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('articles',JSON.stringify(articles));
 db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('editorial_audit','[]');
 db.close();
 return {folder,sqlite};
}

test('only published ordinary articles are selected and URLs stay local',()=>{
 assert.equal(normalArticle({id:'a1',title:'Draft rahasia',status:'draft'}),null);
 assert.equal(normalArticle({id:'../private',title:'Publikasi tidak aman',status:'published'}),null);
 assert.equal(normalArticle({id:'mm-analysis-111',title:'Analisa H4 hari ini',status:'published'}),null);
 assert.equal(normalArticle({id:'foo',title:'Tinjauan lengkap',status:'published'}).url,'/berita/foo');
});
test('response-only ticker injection is idempotent and keeps existing HTML',()=>{
 const raw='<!doctype html><html><head><meta charset="utf-8"></head><body><main id="app">Artikel asli</main></body></html>';
 const result=injectTickerHtml(raw);
 assert.match(result,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(result,new RegExp('id="'+CLIENT_ID+'"'));
 assert.match(result,/document\.body\.prepend\(bar\)/);
 assert.match(result,/speechSynthesis/);
 assert.match(result,/prefers-reduced-motion/);
 assert.match(result,/Artikel asli/);
 assert.equal(result.split('id="'+STYLE_ID+'"').length,2);
 assert.equal(injectTickerHtml(result),result,'must not duplicate ticker markup');
 assert.equal(injectTickerHtml('<html><body>Incomplete</body></html>'),'<html><body>Incomplete</body></html>');
});
test('public endpoint is read-only, filters drafts and supports etag, HEAD, 404',async t=>{
 const f=fixture();t.after(()=>fs.rmSync(f.folder,{recursive:true,force:true}));
 let now=Date.parse('2026-11-11T11:30:00Z');
 const ticker=createNewsTicker({dataDirectory:f.folder,allowTestDirectory:true,clock:()=>now,cacheMs:5000});
 const server=http.createServer((req,res)=>{
  if(ticker.owns(req)){ticker.handle(req,res);return;}
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port;
 let response=await fetch(origin+API_PATH);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const etag=response.headers.get('etag');
 const body=await response.json();
 assert.equal(body.ok,true);
 assert.deepEqual(body.headlines.map(x=>x.id),['latest-news','old-news']);
 assert.equal(body.headlines[0].url,'/berita/latest-news');
 assert.equal(body.headlines[0].category,'EKONOMI');
 assert.ok(!JSON.stringify(body).includes('editorial_audit'));
 response=await fetch(origin+API_PATH,{headers:{'If-None-Match':etag}});
 assert.equal(response.status,304);
 response=await fetch(origin+API_PATH,{method:'HEAD'});
 assert.equal(response.status,200);
 assert.equal(await response.text(),'');
 response=await fetch(origin+'/api/integrations/articles');
 assert.equal(response.status,404);
 response=await fetch(origin+'/admin.html');
 assert.equal(response.status,404);
 // New published article appears without redeployment after cache expiry.
 const db=new DatabaseSync(f.sqlite);
 const a=JSON.parse(db.prepare('SELECT value FROM settings WHERE key=?').get('articles').value);
 a.push({id:'newly-published',title:'Artikel terbaru dipublikasikan di MarketMarney',status:'published',createdAt:'2026-11-11T11:40:00Z'});
 db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(a),'articles');db.close();
 now+=6000;
 response=await fetch(origin+API_PATH);
 assert.equal(response.status,200);
 const latest=await response.json();
 assert.equal(latest.headlines[0].id,'newly-published');
 assert.notEqual(response.headers.get('etag'),etag);
});
test('unconfigured or unsafe SQLite paths fail closed, never exposing filesystem details',async()=>{
 const ticker=createNewsTicker({dataDirectory:'/tmp/not-approved'});
 const request={method:'GET',url:API_PATH,headers:{}};
 assert.equal(ticker.owns(request),true);
 let status=null,body='';
 const response={writeHead(n){status=n;},end(value){body=String(value||'');}};
 const saved=console.error;console.error=()=>{};
 try{ticker.handle(request,response);}finally{console.error=saved;}
 assert.equal(status,503);
 assert.deepEqual(JSON.parse(body),{ok:false,error:'headlines_temporarily_unavailable'});
 assert.ok(!body.includes('/tmp'));
});
