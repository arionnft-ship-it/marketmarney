'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {VERSION,LEVELS,stageOf,albumOf,isEducational,learningCatalog,CLIENT,CSS,JS_PATH,CSS_PATH,assets,injectHtml}=require('./tv-learning.cjs');
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


test('Edukasi and Video Marney preserve published videos without an empty second collection',()=>{
 const collection=[
  ...examples,
  {id:'v7',status:'published',cat:'Edukasi',title:'Psikologi Trading di Market'},
  {id:'v8',status:'published',cat:'Forex',title:'Analisis Harian Emas'},
  {id:'v9',status:'published',cat:'Berita',title:'MarketMarney Update Global'},
  {id:'v10',status:'draft',cat:'Berita',title:'Video Belum Terbit'}
 ];
 const all=learningCatalog(collection);
 const edu=learningCatalog(all.videos.filter(isEducational));
 assert.equal(all.videos.length,9);
 assert.equal(edu.videos.length,7);
 assert.equal(isEducational({title:'Fundamental',cat:'Edukasi'}),true);
 assert.equal(isEducational({title:'Cara Mengenali Area Liquidity',cat:'Forex'}),true);
 assert.equal(isEducational({title:'MarketMarney Update Global',cat:'Berita'}),false);
 assert.equal(isEducational({title:'Marney Promo',category:'News',album:'MarketMarney Academy'}),true);
 assert.ok(edu.videos.every(x=>all.videos.some(y=>y.id===x.id)),'Edukasi subset; Video Marney is complete catalogue');
 assert.ok(!all.videos.some(x=>x.status==='draft'));
});
test('Two TV collection controls, learning path and video player remain accessible',()=>{
 assert.equal(VERSION,'mm-tv-learning-20261115-v2');
 for(const token of ['data.collection','Pilih Edukasi atau Video Marney','Video Marney','Belajar Bersama MarketMarney','aria-pressed','mm-tv-learning-course','host.dataset.mmTvLearning','#tvMount']){
  assert.ok(CLIENT.includes(token),'missing client feature '+token);
 }
 for(const token of ['.mm-tv-collection-choices','.mm-tv-learning-course[hidden]{display:none!important}','@media(max-width:440px)']){
  assert.ok(CSS.includes(token),'missing CSS rule '+token);
 }
 for(const token of ['/api/admin','localStorage','sessionStorage','.remove(','fetch("http','fetch(\'http']){
  assert.ok(!CLIENT.includes(token),'unexpected mutation or remote request '+token);
 }
});
