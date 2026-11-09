'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {assets,injectHtml,VERSION}=require('./analysis-upload.cjs');
const html='<!doctype html><html><head><title>MarketMarney</title></head><body><main>Unchanged</main></body></html>';
test('admin injection only on actual admin HTML and idempotent',()=>{
 const out=injectHtml(html,'/admin.html');
 assert.match(out,/mm-analysis-admin-v1\.js/);
 assert.match(out,/mm-analysis-v1\.css/);
 assert.ok(out.includes('data-mm-analysis-admin="'+VERSION+'"'));
 assert.equal(injectHtml(out,'/admin.html'),out);
 assert.equal(injectHtml(html,'/login.html'),html);
 assert.equal(injectHtml(html,'/akun.html'),html);
 assert.equal(injectHtml(html,'/berita/id'),html);
});
test('public analysis script only on homepage, no protected pages',()=>{
 const out=injectHtml(html,'/');
 assert.match(out,/mm-analysis-public-v1\.js/);
 assert.ok(!out.includes('mm-analysis-admin-v1.js'));
 assert.equal(injectHtml(html,'/index.html').includes('mm-analysis-public-v1.js'),true);
});
test('all static assets compile and carry no credentials',()=>{
 for(const [path,a] of assets()){
  assert.ok(a.body.length>80);
  assert.ok(a.mime.startsWith(path.endsWith('.css')?'text/css':'text/javascript'));
  if(path.endsWith('.js'))new vm.Script(a.body.toString());
  assert.doesNotMatch(a.body.toString(),/MM_ARTICLE_BEARER|MM_GOOGLE_CLIENT_SECRET|MM_MT4_READ_SHA256/);
 }
});
test('admin client uses existing admin auth and optimistic revision only',()=>{
 const s=assets().get('/assets/mm-analysis-admin-v1.js').body.toString();
 assert.match(s,/\/api\/admin\/content/);
 assert.match(s,/\/api\/admin\/upload/);
 assert.match(s,/If-Match/);
 assert.match(s,/credentials:'same-origin'/);
 assert.match(s,/mm-analysis-/);
 assert.match(s,/Terbitkan Analisa/);
 assert.match(s,/Simpan Draf/);
});
test('public script filters published analysis only',()=>{
 const s=assets().get('/assets/mm-analysis-public-v1.js').body.toString();
 assert.match(s,/mm-analysis-/);
 assert.match(s,/published/);
 assert.match(s,/\/api\/content/);
 assert.doesNotMatch(s,/PUT|POST/);
});
