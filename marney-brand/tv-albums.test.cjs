'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {VERSION,SCRIPT,STYLE,CLIENT,CSS,albumForVideo,groupPublishedVideos,injectHtml,assets}=require('./tv-albums.cjs');

const fixtures=[
 {id:'academy-1',status:'published',title:'Memahami Konsep Trading Secara Mendalam | MarketMarney Academy',desc:'Edukasi'},
 {id:'academy-2',status:'published',title:'Panduan Trading untuk Pemula — Mulai dari Nol | MarketMarney Academy'},
 {id:'tech-1',status:'published',title:'Cara Menentukan Support, Resistance, Supply dan Demand di Berbagai Timeframe'},
 {id:'academy-3',status:'published',title:'Cara kerja naik turun market'},
 {id:'tech-2',status:'published',title:'Cara menghitung pivot point'},
 {id:'tech-3',status:'published',title:'Cara Mengenali Area Liquidity di Chart | Liquidity Sweep vs Breakout'}
];
test('six existing MarketMarney TV videos are placed into two usable albums',()=>{
 const groups=groupPublishedVideos(fixtures);
 assert.deepEqual(groups.map(x=>x.name),['MarketMarney Academy','Teknikal Trading']);
 assert.deepEqual(groups.map(x=>x.ids.length),[3,3]);
 assert.deepEqual(groups.flatMap(g=>g.ids).sort(),fixtures.map(v=>v.id).sort());
});
test('published-only grouping honors future explicit album metadata without removing videos',()=>{
 const extra=[
 {id:'news',status:'published',title:'Laporan Pasar',album:'Analisis Mingguan'},
 {id:'draft',status:'draft',title:'Rahasia',album:'Analisis Mingguan'},
 {id:'bad',status:'published',title:'Berita',album:'<script>bad</script>'},
 {id:'dup',status:'published',title:'D',series:'Seri Baru'},
 {id:'dup',status:'published',title:'D',series:'Seri Baru'}
 ];
 assert.equal(albumForVideo(extra[0]),'Analisis Mingguan');
 assert.equal(albumForVideo(extra[2]),'Koleksi MarketMarney');
 const groups=groupPublishedVideos(extra);
 assert.deepEqual(groups.map(g=>g.name),['Koleksi MarketMarney','Analisis Mingguan','Seri Baru']);
 assert.equal(groups.flatMap(g=>g.ids).includes('draft'),false);
 assert.equal(groups.flatMap(g=>g.ids).filter(id=>id==='dup').length,1);
});
test('SPA album resources are scoped to homepage and do not reintroduce category filters',()=>{
 const html='<html><head><title>MarketMarney</title></head><body><div id="app">Keep video data</div></body></html>';
 for(const p of ['/','/index.html']){
  const result=injectHtml(html,p);
  assert.ok(result.includes(STYLE+'?v='+VERSION));
  assert.ok(result.includes(SCRIPT+'?v='+VERSION));
  assert.equal(injectHtml(result,p),result);
  assert.ok(result.includes('Keep video data'));
 }
 for(const p of ['/about.html','/admin.html','/akun.html','/berita/news','/api/content']){
  assert.equal(injectHtml(html,p),html,p);
 }
 assert.equal(injectHtml('', '/'), '');
 assert.doesNotMatch(CSS,/\.mm-tv-filters\s*\{\s*display\s*:\s*(flex|block|grid)/);
 assert.match(CSS,/\.mm-tv-grid \.mm-tv-card\[hidden\]\{display:none!important\}/);
});
test('client compiles; only accesses public catalog and does not modify existing video records',()=>{
 new vm.Script(CLIENT);
 assert.match(CLIENT,/\/api\/content/);
 assert.match(CLIENT,/mm-tv-albums/);
 assert.match(CLIENT,/data-tv-id/);
 assert.match(CLIENT,/MutationObserver/);
 assert.match(CLIENT,/status==='published'/);
 assert.doesNotMatch(CLIENT,/\/api\/admin|localStorage|PUT|POST|indexedDB\.deleteDatabase/);
 const a=assets();
 assert.equal(a.size,2);
 assert.equal(a.get(SCRIPT).mime,'text/javascript; charset=utf-8');
 assert.equal(a.get(STYLE).mime,'text/css; charset=utf-8');
 assert.ok(a.get(STYLE).body.byteLength>1000);
});
