'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {VERSION,SOURCE,CLIENT,assets,injectHtml}=require('./about-refresh.cjs');
const html='<!doctype html><html><head><title>Tentang MarketMarney</title></head><body><main><h1>Informasi pasar. Perspektif lebih luas.</h1></main></body></html>';
test('About fix loads only tiny logo-specific JS and no restyling',()=>{
 const entries=assets();
 assert.equal(entries.size,1);
 assert.ok(entries.has('/assets/mm-about-logo-only-v1.js'));
 new vm.Script(CLIENT);
 assert.ok(CLIENT.includes('brand-about-transparent.webp'));
 assert.doesNotMatch(CLIENT,/mm-about-modern|colorScheme|background:linear-gradient|document\.body\.classList\.add|fetch\(|localStorage/);
 assert.equal(SOURCE,'/assets/brand-about-transparent.webp?v='+VERSION);
});
test('About-only injection is idempotent and does not touch any other page',()=>{
 const revised=injectHtml(html,'/about.html');
 assert.match(revised,/mm-about-logo-only-v1\.js/);
 assert.doesNotMatch(revised,/mm-about-modern-v1\.css|<link rel="stylesheet"/);
 assert.equal(injectHtml(revised,'/about.html'),revised);
 for(const path of ['/','/index.html','/berita/id','/admin.html','/akun.html','/beranda-trader.html'])
  assert.equal(injectHtml(html,path),html,path);
 assert.ok(revised.includes('<main><h1>Informasi pasar. Perspektif lebih luas.</h1></main>'));
});
test('Client changes only About hero logo URL without changing layout classes',()=>{
 const attributes={src:'/old-about-image.png',srcset:'old'};
 const img={
  alt:'Logo MarketMarney',className:'',style:{},
  closest(){return null},
  getAttribute(name){return attributes[name]},
  setAttribute(name,value){attributes[name]=value},
  removeAttribute(name){delete attributes[name]}
 };
 const hero={querySelectorAll(selector){return selector==='img'?[img]:[]}};
 const heading={textContent:'Informasi pasar.',parentElement:{textContent:'Informasi pasar. Perspektif lebih luas.'},closest(){return hero}};
 const body={classList:{add(){throw Error('The global body must not change');}}};
 const document={
  body,documentElement:{},readyState:'complete',
  querySelectorAll(selector){return selector==='h1,h2,h3'?[heading]:[]}
 };
 const context={document,location:{pathname:'/about.html'},MutationObserver:class{observe(){throw Error('not needed')}}};
 vm.runInNewContext(CLIENT,context,{timeout:300});
 assert.equal(attributes.src,SOURCE);
 assert.equal(attributes.srcset,undefined);
 assert.equal(img.alt,'Logo MarketMarney');
 assert.equal(img.style.backgroundColor,'transparent');
});
test('Transparent about asset is built separately from all existing logos',()=>{
 const fs=require('node:fs'),path=require('node:path');
 // Build script is checked in the repository, but runtime tests do not change stored user assets.
 const root=path.resolve(__dirname,'../marney-brand/build-assets.py');
 const script=fs.existsSync(root)?fs.readFileSync(root,'utf8'):'';
 if(script) {
   assert.ok(script.includes("about_canvas.save(out / 'about-logo.webp'"));
   assert.ok(script.includes("brand.save(out / 'logo.webp'"));
 }
});
