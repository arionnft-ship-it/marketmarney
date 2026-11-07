'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createPublicPerformance}=require('./performance-runtime.cjs');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png';

async function listen(runtime,t){
 const server=http.createServer((req,res)=>{if(!runtime.handle(req,res)){res.writeHead(418,{'Cache-Control':'private, no-store'});res.end('original-handler');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return 'http://127.0.0.1:'+server.address().port;
}

test('Only allowlisted public files get content-addressed URLs, with directory preserved',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'marney-public-assets-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'assets'));
 const content='body{background:url(./hero-reference.png)}';
 fs.writeFileSync(path.join(root,'assets','css-bundle-01.css'),content);
 const runtime=createPublicPerformance({appRoot:root});
 const input='<link href="./assets/css-bundle-01.css"><script src="/assets/admin.js?v=1"></script><img src="/media/'+A+'">';
 const changed=runtime.rewriteHomeAssets(input);
 assert.match(changed,/href="\/assets\/mm-perf-v1-[a-f0-9]{64}\.css"/);
 assert.ok(changed.includes('/assets/admin.js?v=1'));assert.ok(changed.includes('/media/'+A));
 assert.equal(runtime.rewriteHomeAssets(changed),changed);
 const url=changed.match(/href="([^"]+)"/)[1],base=await listen(runtime,t);
 const r=await fetch(base+url);assert.equal(r.status,200);assert.equal(await r.text(),content);
 assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');
 assert.equal(r.headers.get('vary'),'Accept-Encoding');
 const cached=await fetch(base+url,{headers:{'if-none-match':r.headers.get('etag')}});
 assert.equal(cached.status,304);assert.equal(await cached.text(),'');
 const head=await fetch(base+url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 const plain=await new Promise((resolve,reject)=>{
   http.get(base+url,{headers:{'Accept-Encoding':'gzip;q=0, identity;q=1'}},response=>{
     const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({headers:response.headers,body:Buffer.concat(chunks).toString()}));
   }).on('error',reject);
 });
 assert.equal(plain.headers['content-encoding'],undefined);assert.equal(plain.body,content);
 for(const original of ['/api/private','/auth/me','/assets/admin.js?v=1','/assets/css-bundle-01.css','/sw.js','/manifest.webmanifest']){
   const x=await fetch(base+original);assert.equal(x.status,418);assert.equal(x.headers.get('cache-control'),'private, no-store');
 }
});

test('Thumbnails only derive published, same-origin images without forwarding user credentials',async t=>{
 let imageReads=0,resizeCalls=0;const requested=[];
 const runtime=createPublicPerformance({fetchImpl:async(url,options)=>{
   requested.push({url:String(url),options});
   if(url.pathname==='/api/content')return Response.json({articles:[{img:'/media/'+A,status:'published'},{img:'/media/'+B,status:'draft'},{img:'https://other.example/media/'+B,status:'published'}]});
   assert.equal(url.pathname,'/media/'+A);imageReads++;
   return new Response(Buffer.from('test-image'),{headers:{'content-type':'image/png'}});
 },resizeImage:async(body,width)=>{resizeCalls++;assert.equal(width,640);assert.equal(body.toString(),'test-image');await new Promise(resolve=>setTimeout(resolve,15));return Buffer.from('webp-thumbnail');}});
 const base=await listen(runtime,t),url='/assets/news-thumb-v1/640/'+A;
 const responses=await Promise.all(Array.from({length:5},()=>fetch(base+url,{headers:{cookie:'private-session=example',authorization:'Bearer example'}})));
 for(const r of responses){assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/webp');assert.equal(await r.text(),'webp-thumbnail');}
 assert.equal(imageReads,1);assert.equal(resizeCalls,1);
 for(const r of requested){assert.equal(new URL(r.url).origin,'https://marketmarney.com');assert.equal(r.options.redirect,'error');assert.equal(r.options.headers.cookie,undefined);assert.equal(r.options.headers.authorization,undefined);}
 const disallowed=await fetch(base+'/assets/news-thumb-v1/640/'+B);assert.equal(disallowed.status,404);
 assert.equal(imageReads,1);assert.equal(resizeCalls,1);
 const malformed=await fetch(base+'/assets/news-thumb-v1/999/'+A);assert.equal(malformed.status,404);
 const post=await fetch(base+url,{method:'POST'});assert.equal(post.status,405);
 const head=await fetch(base+url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 const conditional=await fetch(base+url,{headers:{'if-none-match':head.headers.get('etag')}});assert.equal(conditional.status,304);
});

test('Unavailable public catalog fails closed; invalid image response falls back through original public route',async t=>{
 let imageReads=0;
 const closed=createPublicPerformance({fetchImpl:async()=>new Response('login',{status:401})});
 const baseClosed=await listen(closed,t);
 assert.equal((await fetch(baseClosed+'/assets/news-thumb-v1/640/'+A)).status,404);
 const runtime=createPublicPerformance({fetchImpl:async url=>{
   if(url.pathname==='/api/content')return Response.json({articles:[{img:'/media/'+A,status:'published'}]});
   imageReads++;return new Response('<html>denied</html>',{headers:{'content-type':'text/html'}});
 },resizeImage:()=>{throw Error('Must not resize HTML');}});
 const base=await listen(runtime,t),r=await fetch(base+'/assets/news-thumb-v1/640/'+A,{redirect:'manual'});
 assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/media/'+A);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(imageReads,1);
});

test('Sharp produces an actual smaller WebP at the requested width',async t=>{
 const sharp=require('sharp');
 const source=await sharp({create:{width:1672,height:941,channels:3,background:'#443011'}}).png().toBuffer();
 const runtime=createPublicPerformance({fetchImpl:async url=>url.pathname==='/api/content'?Response.json({articles:[{img:'/media/'+A,status:'published'}]}):new Response(source,{headers:{'content-type':'image/png'}})});
 const base=await listen(runtime,t),r=await fetch(base+'/assets/news-thumb-v1/640/'+A);
 assert.equal(r.status,200);const output=Buffer.from(await r.arrayBuffer()),meta=await sharp(output).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,640);assert.equal(meta.height,360);assert.ok(output.length<source.length);
});
