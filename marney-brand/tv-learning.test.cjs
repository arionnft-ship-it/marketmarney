'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {VERSION,LEVELS,stageOf,albumOf,learningCatalog,CLIENT,CSS,JS_PATH,CSS_PATH,assets,injectHtml}=require('./tv-learning.cjs');
const examples=[
 {id:'v1',status:'published',title:'Memahami Konsep Trading Secara Mendalam | MarketMarney Academy'},
 {id:'v2',status:'published',title:'Panduan Trading untuk Pemula — Mulai dari Nol | MarketMarney Academy'},
 {id:'v3',status:'published',title:'Cara Menentukan Support, Resistance, Supply dan Demand di Berbagai Timeframe'},
 {id:'v4',status:'published',title:'Cara kerja naik turun market'},
 {id:'v5',status:'published',title:'Cara menghitung pivot point'},
 {id:'v6',status:'published',title:'Cara Mengenali Area Liquidity di Chart | Liquidity Sweep vs Breakout'}
];
test('MarketMarney TV offers four ordered learning steps from new to understanding',()=>{
 assert.deepEqual(LEVELS.map(l=>l.title),['Baru Mulai','Pahami Dasar','Mulai Analisis','Lebih Paham']);
 const o=learningCatalog(examples);
 assert.deepEqual(o.stages.map(x=>x.ids),[['v1','v2'],['v4','v5'],['v3'],['v6']]);
 assert.deepEqual(o.stages.map(x=>x.ids.length),[2,2,1,1]);
 assert.equal(o.videos.length,6);
});
test('Existing Academy and Teknikal Trading albums remain with all videos',()=>{
 const result=learningCatalog(examples);
 assert.deepEqual(result.albums.map(a=>a.name),['MarketMarney Academy','Teknikal Trading']);
 assert.deepEqual(result.albums.map(a=>a.ids.length),[3,3]);
 assert.deepEqual(result.albums.flatMap(a=>a.ids).sort(),examples.map(x=>x.id).sort());
});
test('Explicit optional learning stages and albums can be used for future videos',()=>{
 assert.equal(stageOf({title:'NFP',level:'beginner'}),'mulai');
 assert.equal(stageOf({title:'NFP',learningStage:'advanced'}),'paham');
 assert.equal(stageOf({title:'NFP'}),null);
 assert.equal(albumOf({title:'NFP'}),'Video Lainnya');
 assert.equal(albumOf({title:'NFP',album:'Berita Mingguan'}),'Berita Mingguan');
 const data=learningCatalog([
  ...examples,{id:'future',status:'published',title:'Berita NFP'},
  {id:'future',status:'published',title:'Duplikat'},
  {id:'secret',status:'draft',title:'Belum terbit'}
 ]);
 assert.equal(data.videos.length,7);
 assert.ok(data.albums.some(a=>a.name==='Video Lainnya'&&a.ids.includes('future')));
 assert.ok(!data.albums.some(a=>a.ids.includes('secret')));
});
test('New feature injects only into public SPA and does not restore deleted category controls',()=>{
 const sample='<!doctype html><html><head><title>MarketMarney</title></head><body><div id="app">Keep video</div></body></html>';
 for(const p of ['/','/index.html']){
  const out=injectHtml(sample,p);
  assert.ok(out.includes(JS_PATH+'?v='+VERSION));
  assert.ok(out.includes(CSS_PATH+'?v='+VERSION));
  assert.equal(injectHtml(out,p),out);
  assert.ok(out.includes('Keep video'));
 }
 for(const p of ['/admin.html','/about.html','/sw.js','/akun.html','/berita/video','/api/content']){
  assert.equal(injectHtml(sample,p),sample);
 }
 assert.doesNotMatch(CSS,/\.mm-tv-filters\s*\{\s*display\s*:\s*(flex|grid|block)/);
 assert.match(CSS,/\.mm-tv-grid \.mm-tv-card\[hidden\]\{display:none!important\}/);
});
test('Learning assets are safe, responsive, and do not modify stored video records',()=>{
 const map=assets();
 assert.equal(map.size,2);
 assert.equal(map.get(JS_PATH).mime,'text/javascript; charset=utf-8');
 assert.equal(map.get(CSS_PATH).mime,'text/css; charset=utf-8');
 new vm.Script(CLIENT);
 assert.match(CLIENT,/\/api\/content/);
 assert.match(CLIENT,/mm-tv-learning/);
 assert.match(CLIENT,/aria-pressed/);
 assert.match(CLIENT,/\.mm-tv-grid/);
 assert.match(CLIENT,/\.mm-tv-filters/);
 assert.match(CSS,/@media\(max-width:620px\)/);
 assert.match(CSS,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(CLIENT,/\/api\/admin|localStorage|sessionStorage|PUT|POST|\.remove\(/);
 assert.doesNotMatch(CSS,/\.navbtn|\.mm-tv-feature|\.social-home|header\s*\{|body\s*\{/);
});
