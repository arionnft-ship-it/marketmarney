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
test('installer compatibility anchors remain unchanged',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const sourcePath=fs.existsSync(path.join(__dirname,'../marney-brand/branding.cjs'))?path.join(__dirname,'../marney-brand/branding.cjs'):path.join(__dirname,'branding.cjs');
 const s=fs.readFileSync(sourcePath,'utf8');
 assert.ok(s.includes('changed=enhance(raw),out=changed===raw?data:Buffer.from(changed)')||
  s.includes("changed=enhance(require('./signup/account-page.cjs').enhanceAccount(raw,p)),out=changed===raw?data:Buffer.from(changed)"));
 assert.ok(s.includes('function enhance(html){'));
 assert.ok(s.includes('const withAnalysis=ANALYSIS.injectHtml('));
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

test('published analysis appears between indicator guide and pivot card',()=>{
 const source=assets().get('/assets/mm-analysis-public-v1.js').body.toString();
 const guide={nodeType:1,textContent:'Panduan interpretasi indikator'};
 const pivot={nodeType:1,textContent:'Pivot Points'};
 let panel=null;
 const shell={
  children:[guide,pivot],parentNode:{},
  querySelector(selector){
   if(selector===':scope > .mm87-info')return guide;
   if(selector===':scope > .mm1816-pivot-public')return pivot;
   return null;
  },
  insertBefore(node,before){
   if(node.parentNode&&node.parentNode.children){
    const previous=node.parentNode.children.indexOf(node);
    if(previous!==-1)node.parentNode.children.splice(previous,1);
   }
   const position=this.children.indexOf(before);
   assert.ok(position>=0,'pivot anchor must be present');
   this.children.splice(position,0,node);
   node.parentNode=this;
  }
 };
 const root={},document={
  readyState:'complete',
  querySelector(selector){return selector==='.mm87-shell.mm1815-anal-shell'?shell:null;},
  getElementById(id){return id==='app'?root:id==='mm-analysis-public-v1'?panel:null;},
  createElement(tag){
   const node={tagName:tag,nodeType:1,parentNode:null,id:'',innerHTML:'',className:''};
   Object.defineProperty(node,'nextElementSibling',{get(){const i=node.parentNode?.children?.indexOf(node);return i>=0?node.parentNode.children[i+1]||null:null;}});
   panel=node;return node;
  },
  addEventListener(){},
  body:root
 };
 const context={
  document,MutationObserver:class{observe(){}},requestAnimationFrame:callback=>callback(),
  setTimeout(){},fetch:()=>new Promise(()=>{}),AbortSignal:{timeout(){return null;}},
 };
 vm.runInNewContext(source,context);
 assert.ok(panel,'analysis panel created');
 assert.equal(shell.children.length,3,'existing cards preserved');
 assert.equal(shell.children[0],guide,'indicator guide remains first');
 assert.equal(shell.children[1],panel,'analysis section placed after guide');
 assert.equal(shell.children[2],pivot,'pivot card stays after analysis');
 assert.equal(panel.parentNode,shell);
 assert.equal(panel.nextElementSibling,pivot);
});
test('analysis integration cache version changes to refresh previously loaded homepages',()=>{
 assert.equal(VERSION,'20261110-v2');
 assert.match(injectHtml(html,'/'),/mm-analysis-public-v1\.js\?v=20261110-v2/);
});

test('news listings exclude analysis while dedicated analysis cards keep their source',()=>{
 const {isNewsListingArticle,NEWS_LISTING_FILTER}=require('./performance-news.cjs');
 const fixtures=[
  {id:'mm-analysis-2dee2e8ece2d47278fa10c8a01dac0ac',status:'published',tipe:'analysis',cat:'FOREX',title:'GBP/USD — Skenario H4'},
  {id:'mm-analysis-d97166abe11b446cbb75844dd82078e3',status:'published',cat:'EMAS',title:'XAU/USD H1'},
  {id:'other-analysis-entry',status:'published',tipe:'analysis',cat:'SAHAM'},
  {id:'ordinary-forex-news',status:'published',tipe:'news',cat:'FOREX'},
  {id:'ordinary-gold-news',status:'published',tipe:'news',cat:'EMAS'},
  {id:'marketmarney-editorial',status:'published',tipe:'editorial',cat:'EKONOMI'},
  {id:'draft-news',status:'draft',tipe:'news',cat:'SAHAM'}
 ];
 assert.deepEqual(fixtures.filter(isNewsListingArticle).map(a=>a.id),[
  'ordinary-forex-news','ordinary-gold-news','marketmarney-editorial'
 ]);
 const sandbox={};
 vm.runInNewContext(NEWS_LISTING_FILTER+'; globalThis.check=mmPerfIsNewsListingArticle;',sandbox,{timeout:300});
 assert.deepEqual(fixtures.map(x=>Boolean(sandbox.check(x))),fixtures.map(x=>Boolean(isNewsListingArticle(x))));
 const fs=require('node:fs'),path=require('node:path');
 const homepage=fs.readFileSync(path.join(__dirname,'performance-news.cjs'),'utf8');
 assert.match(homepage,/data\\.articles\\.filter\\(mmPerfIsNewsListingArticle\\)/);
 const marketAnalysis=fs.readFileSync(path.join(__dirname,'analysis-upload-public.js'),'utf8');
 assert.match(marketAnalysis,/show\\(panel,doc\\.articles\\)/);
});
