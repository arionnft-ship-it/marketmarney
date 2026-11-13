'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {render,HTML,ID}=require('./editorial-article-clean.cjs');
function invoke(method,url){let o={status:null,headers:null,body:null};let res={writeHead(c,h){o.status=c;o.headers=h},end(b){o.body=b}};o.handled=render({method,url},res);return o}
test('canonical article serves a standalone HTML document with separate headings',()=>{const r=invoke('GET','/berita/'+ID+'/pasar-global-jadi-sorotan-smic-ktt-apec-2026-dan-pernyataan-the-fed');assert.equal(r.handled,true);assert.equal(r.status,200);assert.match(r.body,/<h2>SMIC: Permintaan Chip AI Masih Kuat<\/h2>/);assert.match(r.body,/<h2>Xi Jinping Akan Memimpin KTT APEC 2026<\/h2>/);assert.match(r.body,/<h2>The Fed: Ekonomi AS Menunjukkan Pola Berbentuk K<\/h2>/);assert.match(r.body,/<img src="\/media\/50df812a-9055-4f06-b9e0-b22af609873c.png"/);assert.equal(r.headers['Cache-Control'],'no-store, max-age=0, must-revalidate')});
test('does not intercept different article or admin routes',()=>{assert.equal(invoke('GET','/berita/another-article').handled,false);assert.equal(invoke('GET','/admin').handled,false)});
test('HEAD contains no body, POST is delegated to existing gateway',()=>{assert.equal(invoke('HEAD','/berita/'+ID).body,'');assert.equal(invoke('POST','/berita/'+ID).handled,false)});
test('article text does not expose literal paragraph markup',()=>{assert.ok(!HTML.includes('&lt;p&gt;'));assert.ok(!HTML.includes('\\u003cp\\u003e'));assert.ok(HTML.includes('<div class="article-body">'));assert.ok(HTML.includes('</article>'))});
