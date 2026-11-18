'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {VERSION,HOME,FILES,assets,injectHtml}=require('./terminal-edition.cjs');
const PAGE='<html lang="id"><head><title>MarketMarney</title></head><body><div id="app"></div></body></html>';
test('Terminal Edition serves a separate published page without mutating original SPA routes',()=>{
 assert.equal(HOME,'/terminal');
 const map=assets();
 assert.equal(map.size,6);
 assert.equal(map.get('/terminal').mime,'text/html; charset=utf-8');
 assert.equal(map.get('/terminal').body.toString(),map.get('/terminal/').body.toString());
 assert.equal(map.get('/assets/mm-terminal-v1.js').mime,'text/javascript; charset=utf-8');
 assert.ok(map.get('/assets/mm-terminal-v1.js').body.length>3500);
 assert.equal(injectHtml(PAGE,'/admin.html'),PAGE);
 assert.equal(injectHtml(PAGE,'/api/content'),PAGE);
 assert.equal(injectHtml(PAGE,'/berita/id'),PAGE);
 for(const pathname of ['/','/index.html']){
  const text=injectHtml(PAGE,pathname);
  assert.equal(injectHtml(text,pathname),text);
  assert.match(text,/data-marney-terminal-entry/);
  assert.match(text,/mm-terminal-entry-v1\.js/);
  assert.match(text,/id="app"/);
 }
});
test('Marketing design uses MARNEY branding, not source-product logos, and accessibility basics',()=>{
 const doc=assets().get('/terminal').body.toString();
 assert.match(doc,/<html lang="id">/);
 assert.match(doc,/<title>MarketMarney Terminal/);
 assert.match(doc,/<link rel="canonical" href="https:\/\/marketmarney\.com\/terminal"/);
 assert.match(doc,/\/assets\/brand-wordmark-dark\.webp/);
 assert.match(doc,/News Terminal/);
 assert.match(doc,/Kalender Ekonomi/);
 assert.match(doc,/Likuidasi Kripto/);
 assert.match(doc,/Pilih kategori/);
 assert.match(doc,/id="feed-dialog"/);
 assert.match(doc,/id="news-search"/);
 assert.match(doc,/id="importance"/);
 assert.match(doc,/data-category="Emas"/);
 assert.match(doc,/data-category="Kripto"/);
 assert.match(doc,/id="news-list"/);
 assert.match(doc,/id="calendar-widget"/);
 assert.match(doc,/id="saved-feeds"/);
 assert.match(doc,/href="#berita"/);
 assert.doesNotMatch(doc,/Watcher Guru|watcherguru\.com|https:\/\/source\.watcherguru/i);
 assert.doesNotMatch(doc,/liquidated \$|US\$[0-9]+,?[0-9]* liquidated/i);
});
test('Client compiles, fetches only existing read-only public market endpoints, safe text rendering',()=>{
 const map=assets();
 const client=map.get('/assets/mm-terminal-v1.js').body.toString();
 const entry=map.get('/assets/mm-terminal-entry-v1.js').body.toString();
 new vm.Script(client,{filename:'terminal.js'});
 new vm.Script(entry,{filename:'terminal-entry.js'});
 assert.match(client,/\/api\/content/);
 assert.match(client,/\/api\/marketmarney\/news-ticker/);
 assert.match(client,/createTextNode|textContent/);
 assert.match(client,/credentials:'omit'/);
 assert.match(client,/localStorage\.setItem/);
 assert.match(client,/status.*published/);
 assert.match(client,/https:\/\/s3\.tradingview\.com\/external-embedding\/embed-widget-events\.js/);
 assert.match(client,/source/);
 assert.doesNotMatch(client,/\/api\/admin|\/auth\/|Authorization|Bearer |fetch\([^)]*method:\s*['"]POST/);
 assert.match(client,/u\.password/,'URL credentials must be disallowed');
 assert.doesNotMatch(client,/watcherguru/i);
 assert.doesNotMatch(entry,/\/api\//);
});
test('CSS is responsive, light weight, respects reduced motion, and keeps old SPA untouched',()=>{
 const map=assets(),css=map.get('/assets/mm-terminal-v1.css').body.toString();
 const entryCss=map.get('/assets/mm-terminal-entry-v1.css').body.toString();
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.news-panel/);
 assert.match(css,/\.right-rail/);
 assert.match(css,/\.feed-form/);
 assert.match(entryCss,/aside\.sidebar/);
 assert.doesNotMatch(entryCss,/body\s*\{|\.news-panel/);
 const current=fs.readFileSync(path.join(__dirname,'branding.cjs'),'utf8');
 assert.match(current,/TERMINAL\.injectHtml\(learningHtml,p\)/);
 assert.match(current,/TERMINAL\.assets\(\)/);
});


test('Terminal client uses one-second live push while retaining source-safe fallback',()=>{
 const client=assets().get('/assets/mm-terminal-v1.js').body.toString();
 const html=assets().get('/terminal').body.toString();
 assert.match(client,/new EventSource\('\/api\/terminal\/live'\)/);
 assert.match(client,/stream\.addEventListener\('heartbeat'/);
 assert.match(client,/stream\.addEventListener\('news'/);
 assert.match(client,/setInterval\(\(\)=>\{[\s\S]*refreshVisibleAges[\s\S]*\},1000\)/);
 assert.match(client,/setInterval\(\(\)=>\{if\(!document\.hidden&&!state\.streamConnected\)/);
 assert.match(client,/document\.hidden\)closeLive\(\)/);
 assert.match(client,/state\.session=packet\.session/);
 assert.match(html,/id="live-cadence"/);
 assert.match(html,/id="last-sync"/);
 assert.match(html,/sumber 15–60 dtk/);
 assert.doesNotMatch(client,/setInterval\([^)]*fetch\(/);
});


test('Terminal refinement lets readers filter sources/recent headlines and see arrivals and true feed health',()=>{
 const map=assets(),html=map.get('/terminal').body.toString();
 const client=map.get('/assets/mm-terminal-v1.js').body.toString();
 const css=map.get('/assets/mm-terminal-v1.css').body.toString();
 new vm.Script(client,{filename:'terminal-refined.js'});
 for(const id of ['source-choices','recent-only','news-alert','news-alert-label','stat-new',
  'health-marney-dot','health-marney-text','health-external-dot','health-external-text','news-update-foot']){
  assert.ok(html.includes('id="'+id+'"'),'missing accessible refinement control '+id);
 }
 for(const token of ['data-source="Semua"','data-source="Marney"','data-source="Eksternal"']){
  assert.ok(html.includes(token),'missing source selection '+token);
 }
 for(const token of ['updateSourceChoice','updateHealth','showArrivalAlert',
  'item.kind','state.recentOnly','recentlyPublished','sourceHealth','state.knownIds']){
  assert.ok(client.includes(token),'missing functional refinement '+token);
 }
 assert.match(client,/addEventListener\('click',\(\)=>\{[\s\S]*state\.recentOnly/);
 assert.match(client,/updateHealth\(packet\.sourceHealth\)/);
 assert.match(client,/recentlyPublished\?'?TERBARU/);
 for(const token of ['.source-toolbar','.source-choice','.recent-choice',
  '.source-health','.health-dot.stale','.health-dot.unavailable','.news-new','.news-alert']){
  assert.ok(css.includes(token),'missing CSS '+token);
 }
 assert.match(css,/@media\(max-width:390px\)/);
 assert.doesNotMatch(client,/\/api\/admin|\/auth\/|Authorization:|Bearer /);
});
