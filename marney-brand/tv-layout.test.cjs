'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {VERSION,ASSET,CSS,injectHtml,assets}=require('./tv-layout.cjs');
const HTML='<!doctype html><html lang="id"><head><title>MarketMarney</title></head><body><div id="app"></div></body></html>';

test('TV-only stylesheet loads on public SPA and is idempotent',()=>{
 for(const path of ['/','/index.html']){
  const out=injectHtml(HTML,path);
  assert.ok(out.includes('data-mm-tv-layout="'+VERSION+'"'));
  assert.ok(out.includes(ASSET+'?v='+VERSION));
  assert.equal(injectHtml(out,path),out);
  assert.ok(out.includes('<div id="app"></div>'));
 }
 for(const path of ['/about.html','/admin.html','/akun.html','/berita/abc','/api/content','/sw.js']){
  assert.equal(injectHtml(HTML,path),HTML,path);
 }
 assert.equal(injectHtml('', '/'), '');
});

test('layout covers full TV flow without altering homepage featured or other pages',()=>{
 assert.ok(CSS.includes('.mm-tv-filters'));
 assert.ok(CSS.includes('.mm-tv-grid'));
 assert.ok(CSS.includes('.mm-tv-grid .mm-tv-card'));
 assert.ok(CSS.includes('.mm-tv-grid .mm-tv-thumb'));
 assert.ok(CSS.includes('.mm-tv-grid .mm-tv-play'));
 assert.ok(CSS.includes('.mm-tv-chip'));
 assert.ok(CSS.includes('#tvMount.mm-tv-player'));
 assert.ok(CSS.includes('#tvBack'));
 assert.ok(CSS.includes('aspect-ratio:16/9'));
 assert.ok(CSS.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(CSS.includes('@media(max-width:1080px)'));
 assert.ok(CSS.includes('@media(max-width:650px)'));
 assert.ok(CSS.includes('@media(prefers-reduced-motion:reduce)'));
 assert.doesNotMatch(CSS,/\.mm-tv-feature|\.navbtn|\.news-list|\.articletext|\.social-home|header\s*\{|body\s*\{/);
});

test('TV category buttons are hidden without hiding the video grid',()=>{
 assert.equal(VERSION,'mm-tv-layout-20261111-v2');
 assert.match(CSS,/\.mm-tv-filters\s*\{display:none!important\}/);
 assert.ok(CSS.lastIndexOf('.mm-tv-filters{display:none!important}')>CSS.indexOf('.mm-tv-filters{'));
 assert.doesNotMatch(CSS,/\.mm-tv-grid\s*\{display:none|\.mm-tv-card\s*\{display:none/);
 const out=injectHtml(HTML,'/index.html');
 assert.ok(out.includes('?v=mm-tv-layout-20261111-v2'));
 assert.equal(injectHtml(HTML,'/about.html'),HTML);
});

test('style asset is valid text/CSS and cannot rewrite videos or accounts',()=>{
 const map=assets(),item=map.get(ASSET);
 assert.equal(map.size,1);
 assert.equal(item.mime,'text/css; charset=utf-8');
 assert.equal(item.body.toString('utf8'),CSS);
 assert.ok(item.body.length>1000);
 assert.doesNotMatch(CSS,/javascript:|url\(\s*https?:|@import|fetch\(|localStorage|MM_ARTICLE_BEARER/);
});
