'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const http=require('node:http');
const {VIDEO_ID,RECORD,ROUTES,injectCatalog,wrapCatalog,handleMedia,isAllowedTarget}=require('./tv-heygen-import.cjs');

test('approved broker video has stable metadata and allowlisted HeyGen sources',()=>{
 assert.match(VIDEO_ID,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
 assert.equal(RECORD.type,'mp4');
 assert.equal(RECORD.cat,'Edukasi');
 assert.equal(RECORD.status,'published');
 assert.equal(RECORD.album,'MarketMarney Academy');
 assert.equal(RECORD.learningStage,'mulai');
 for(const route of [RECORD.url,RECORD.thumb]){
  const target=ROUTES.get(route);
  assert.ok(target);
  assert.equal(isAllowedTarget(new URL(target.url)),true);
 }
 assert.equal(isAllowedTarget(new URL('http://localhost:8080/private')),false);
 assert.equal(isAllowedTarget(new URL('https://127.0.0.1/private')),false);
});
test('public catalog injection preserves old videos, is idempotent and ignores invalid catalog',()=>{
 const existing={id:'old-id',title:'Existing published video',status:'published'};
 const doc={articles:[{id:'article'}],videos:[existing],updatedAt:'preserve'};
 const first=JSON.parse(injectCatalog(JSON.stringify(doc)));
 assert.equal(first.videos.length,2);
 assert.equal(first.videos[0].id,VIDEO_ID);
 assert.deepEqual(first.videos[1],existing);
 assert.deepEqual(first.articles,doc.articles);
 assert.equal(first.updatedAt,'preserve');
 assert.deepEqual(JSON.parse(injectCatalog(JSON.stringify(first))),first);
 assert.equal(injectCatalog(JSON.stringify({articles:[]})),JSON.stringify({articles:[]}));
});
test('HTTP catalog response includes published video without leaking stale ETag or breaking other endpoints',async()=>{
 const server=http.createServer((req,res)=>{
  if(handleMedia(req,res))return;
  const captured=wrapCatalog(req,res);
  res.writeHead(200,captured?{'content-type':'application/json','etag':'"old-etag"','content-length':'999'}:{'content-type':'application/json'});
  const body=JSON.stringify({videos:[],articles:[{id:'original'}]});
  assert.equal(captured,req.url==='/api/content');
  res.end(body);
 });
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/api/content');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-marketmarney-tv-import')!==null,true);
  assert.equal(response.headers.get('etag'),null);
  const data=await response.json();
  assert.equal(data.videos.length,1);
  assert.equal(data.videos[0].id,VIDEO_ID);
  assert.deepEqual(data.articles,[{id:'original'}]);
  const other=await fetch(base+'/api/other');
  assert.equal(other.status,200);
  assert.equal(other.headers.get('x-marketmarney-tv-import'),null);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('media endpoint allows only explicit video and thumbnail and rejects writes',async()=>{
 const server=http.createServer((req,res)=>{
  if(handleMedia(req,res))return;
  res.writeHead(404);res.end();
 });
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const denied=await fetch(base+RECORD.url,{method:'POST'});
  assert.equal(denied.status,405);
  assert.equal(denied.headers.get('allow'),'GET, HEAD');
  const absent=await fetch(base+'/media/unknown.mp4');
  assert.equal(absent.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
