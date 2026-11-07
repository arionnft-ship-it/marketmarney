'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {enhance,versionURL,createBranding,VERSION,CLIENT}=require('./branding.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'marney-brand-test-'));
fs.writeFileSync(path.join(root,'manifest.webmanifest'),JSON.stringify({id:'./index.html',name:'MarketMarney',start_url:'./index.html',icons:[{src:'./icons/icon-512.png?v=old',sizes:'512x512'}]}));
fs.writeFileSync(path.join(root,'sw.js'),"const CACHE='marketmarney-old'; const x='/api/';");
const brand=createBranding({assetRoot:path.join(__dirname,'dist'),appRoot:root});
const html='<!doctype html><html><head><title>MarketMarney</title><link rel="icon" href="/favicon.png?v=old"></head><body><img src="/assets/brand-logo.webp?v=old"><img id="user" src="/uploads/user.png"><div>Berita pengguna</div></body></html>';
test('updates brand URLs without changing user media or title',()=>{const x=enhance(html);assert.match(x,/marney-20261107-r2/);assert.ok(x.includes('/uploads/user.png'));assert.ok(x.includes('<title>MarketMarney</title>'));assert.equal(enhance(x),x);new Function(CLIENT);});
test('replaces only embedded brand image and favicon',()=>{const x=enhance(html.replace('<body>','<body><a class="brand" href="/"><img src="data:image/webp;base64,AAAA"><b>MarketMarney</b></a><img src="data:image/png;base64,BBBB">').replace('/favicon.png?v=old','data:image/png;base64,CCCC'));assert.ok(!x.includes('base64,AAAA'));assert.ok(!x.includes('base64,CCCC'));assert.ok(x.includes('base64,BBBB'));});
test('version URLs are idempotent',()=>{const v=versionURL('./assets/brand-logo.webp?v=old');assert.equal(versionURL(v),v);});
const server=http.createServer((req,res)=>{if(brand.handle(req,res))return;brand.wrap(req,res);if(req.url==='/api/test'){res.writeHead(401,{'Content-Type':'application/json','Set-Cookie':'a=b; HttpOnly'});res.end('{"error":"auth"}');return;}if(req.url==='/redirect.html'){res.writeHead(302,{'Location':'/akun.html'});res.end();return;}if(req.url==='/plain.html'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('unchanged');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':Buffer.byteLength(html),'Set-Cookie':['a=b; HttpOnly','c=d; Secure']});if(req.url==='/stream.html'){res.write(html.slice(0,80));res.write(html.slice(80,170));res.end(html.slice(170));}else res.end(html);});
test('HTTP wrapper, icons, manifest, cookies and untouched auth',async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{
 for(const p of ['/','/stream.html']){const r=await fetch(base+p),b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);assert.equal(+r.headers.get('content-length'),b.length);assert.equal(r.headers.get('x-marney-brand'),VERSION);assert.match(b.toString(),/data-marney-brand-release/);assert.ok(r.headers.get('set-cookie').includes('a=b'));}
 for(const p of ['/assets/brand-logo.png','/assets/brand-logo.webp','/favicon.png','/favicon.ico','/assets/apple-touch-icon.png','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-192.png','/icons/icon-maskable-512.png']){const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(r.headers.get('x-marney-brand'),VERSION);const tag=r.headers.get('etag');assert.ok((await r.arrayBuffer()).byteLength>0);const h=await fetch(base+p,{method:'HEAD'});assert.equal(h.status,200);assert.equal((await h.arrayBuffer()).byteLength,0);const c=await fetch(base+p,{headers:{'If-None-Match':tag}});assert.equal(c.status,304);}
 const m=await(await fetch(base+'/manifest.webmanifest')).json();assert.equal(m.id,'./index.html');assert.equal(m.start_url,'./index.html');assert.equal(m.name,'MarketMarney');assert.ok(m.icons[0].src.includes(VERSION));
 const sw=await(await fetch(base+'/sw.js')).text();assert.ok(sw.includes(VERSION));assert.ok(sw.includes("'/api/'"));
 const a=await fetch(base+'/api/test');assert.equal(a.status,401);assert.equal(await a.text(),'{"error":"auth"}');
 const d=await fetch(base+'/redirect.html',{redirect:'manual'});assert.equal(d.status,302);assert.equal(d.headers.get('location'),'/akun.html');
 assert.equal(await(await fetch(base+'/plain.html')).text(),'unchanged');
}finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}});
test('integrates with the existing streamed homepage wrapper',async()=>{
 const {attachToServer}=require('../warxau-fbs/bootstrap.cjs');
 const s=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html','Content-Length':Buffer.byteLength(html)});res.write(html.slice(0,80));res.end(html.slice(80));});
 await new Promise(r=>s.listen(0,'127.0.0.1',r));attachToServer(s,{owns:()=>false},s.address().port);
 try{const r=await fetch('http://127.0.0.1:'+s.address().port+'/');const text=await r.text();assert.equal(r.status,200);assert.equal(+r.headers.get('content-length'),Buffer.byteLength(text));assert.ok(text.includes('data-marney-brand-release'));assert.ok(text.includes('mm-social-direct-v1'));assert.ok(text.includes('mm-static-news-v1'));assert.ok(text.includes('/uploads/user.png'));}finally{await new Promise(r=>s.close(r));}
});
