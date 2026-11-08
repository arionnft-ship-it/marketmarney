'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {attachToServer}=require('./bootstrap.cjs');
const {isCanonicalArticlePath,injectReadingWidthStyle,STYLE_ID}=require('./article-reading-width.cjs');

test('desktop reading style is scoped, responsive and idempotent',()=>{
 assert.equal(isCanonicalArticlePath('/berita/mm-editorial-123/slug'),true);
 assert.equal(isCanonicalArticlePath('/berita/abc'),true);
 assert.equal(isCanonicalArticlePath('/api/content'),false);
 assert.equal(isCanonicalArticlePath('/admin.html'),false);
 assert.equal(isCanonicalArticlePath('/berita/../../admin'),false);
 const original='<html><head><title>Berita</title></head><body><main id="app"><div class="article"><div class="articletext">Halo</div></div></main></body></html>';
 const injected=injectReadingWidthStyle(original);
 assert.match(injected,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(injected,/@media screen and \(min-width:1024px\)/);
 assert.match(injected,/max-width:650px/);
 assert.match(injected,/main:not\(#app\)/);
 assert.equal(injectReadingWidthStyle(injected),injected);
 assert.equal(injectReadingWidthStyle('<html><body>no head</body></html>'),'<html><body>no head</body></html>');
});
test('gateway adjusts only HTML article and SPA responses, without touching API, auth or mobile styles',async()=>{
 const html='<!doctype html><html><head><meta charset="utf-8"></head><body><main id="app"><div class="article"><div class="articletext">Artikel uji</div></div></main></body></html>';
 const canonical='<!doctype html><html><head><title>Artikel langsung</title></head><body><main><h1>Judul</h1><p>Artikel asli tetap.</p></main></body></html>';
 const api='{"articles":[]}';
 const server=http.createServer((req,res)=>{
   if(req.url==='/api/content'){res.writeHead(200,{'content-type':'application/json'});res.end(api);return;}
   if(req.url==='/admin.html'){res.writeHead(302,{location:'/login.html'});res.end();return;}
   if(req.url==='/berita/old/old'){res.writeHead(404,{'content-type':'text/html'});res.end('<html><head></head><body>Not found</body></html>');return;}
   const response=req.url?.startsWith('/berita/')?canonical:html;
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','etag':'"unchanged-v1"'});
   res.end(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 attachToServer(server,{owns:()=>false},server.address().port);
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  let r=await fetch(origin+'/index.html');
  const spa=await r.text();
  assert.equal(r.status,200);
  assert.match(spa,new RegExp('id="'+STYLE_ID+'"'));
  assert.match(spa,/@media screen and \(min-width:1024px\)/);
  assert.match(spa,/Artikel uji/);
  assert.equal(r.headers.get('etag'),null,'ETag must be dropped when HTML changes');
  assert.equal(Number(r.headers.get('content-length')),Buffer.byteLength(spa));
  r=await fetch(origin+'/berita/123/sample');
  const direct=await r.text();
  assert.equal(r.status,200);
  assert.match(direct,new RegExp('id="'+STYLE_ID+'"'));
  assert.match(direct,/Artikel asli tetap/);
  assert.equal(Number(r.headers.get('content-length')),Buffer.byteLength(direct));
  r=await fetch(origin+'/api/content');
  assert.equal(await r.text(),api);
  assert.equal(r.headers.get('content-type'),'application/json');
  r=await fetch(origin+'/berita/old/old');
  assert.equal(r.status,404);
  assert.doesNotMatch(await r.text(),new RegExp(STYLE_ID));
  r=await fetch(origin+'/admin.html',{redirect:'manual'});
  assert.equal(r.status,302);
  assert.equal(r.headers.get('location'),'/login.html');
 }finally{await new Promise(resolve=>server.close(resolve))}
});
