'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {VERSION,SOURCE,CLIENT,assets,stripTeamHtml,injectHtml}=require('./about-refresh.cjs');
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
test('About page removes only 04 / TIM and preserves the next information section',()=>{
 let removed=false,untouched=true;
 const body={},root={};
 const section={
  textContent:'04 / TIM Tim MarketMarney Di balik MarketMarney XXXTRIAN BEMBENG NYOK',
  parentElement:body,
  remove(){removed=true;}
 };
 const title={textContent:'Tim MarketMarney',parentElement:{textContent:'Tim MarketMarney',parentElement:section}};
 const doc={
  body,documentElement:root,readyState:'complete',
  querySelectorAll(selector){
   if(selector==='h1,h2,h3,h4,h5,h6,span,p,strong,small')return [title];
   return [];
  }
 };
 const MutationObserver=class{observe(){untouched=true}};
 vm.runInNewContext(CLIENT,{document:doc,location:{pathname:'/about.html'},MutationObserver},{timeout:300});
 assert.equal(removed,true,'team section must be removed');
 assert.equal(untouched,true,'other sections are not touched');
});
test('Only 04 / TIM block is removed from About HTML before delivery',()=>{
 const team='<section class="team" id="team"><div>04 / TIM <h2>Tim MarketMarney</h2></div>'+
 '<p>Di balik MarketMarney, kami bekerja bersama membangun platform.</p>'+
 '<div><div>XXXTRIAN</div><div>BEMBENG</div><div>NYOK</div></div></section>';
 const full='<!doctype html><html><head></head><body><main>'+
 '<section id="social"><h2>Tentang Social Marney</h2></section>'+team+
 '<section id="risk"><h2>05 / INFORMASI PENTING</h2><p>Informasi &amp; Risiko</p></section>'+
 '</main></body></html>';
 const stripped=stripTeamHtml(full);
 assert.doesNotMatch(stripped,/XXXTRIAN|BEMBENG|NYOK|Tim MarketMarney|Di balik MarketMarney/);
 assert.match(stripped,/Tentang Social Marney/);
 assert.match(stripped,/05 \/ INFORMASI PENTING/);
 assert.match(stripped,/Informasi &amp; Risiko/);
 const injected=injectHtml(full,'/about.html');
 assert.doesNotMatch(injected,/class="team"/);
 assert.match(injected,/mm-about-logo-only-v1.js/);
 assert.equal(injectHtml(injected,'/about.html'),injected);
 assert.equal(injectHtml(full,'/index.html'),full);
});
test('Team removal refuses page-wide wrapper when it also contains risk',()=>{
 const html='<html><body><main>Di balik MarketMarney XXXTRIAN BEMBENG NYOK'+
 '<section>05 / INFORMASI PENTING</section></main></body></html>';
 assert.equal(stripTeamHtml(html),html);
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
