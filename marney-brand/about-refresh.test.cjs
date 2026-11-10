'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {VERSION,CLIENT,CSS,injectHtml,assets}=require('./about-refresh.cjs');
const html='<!doctype html><html lang="id"><head><title>Tentang MarketMarney</title></head><body><h1>Informasi pasar. <span>Perspektif lebih luas.</span></h1></body></html>';
test('About-only theme assets compile and do not depend on secrets',()=>{
 const entries=assets();assert.equal(entries.size,2);
 assert.ok(entries.has('/assets/mm-about-modern-v1.css'));
 assert.ok(entries.has('/assets/mm-about-modern-v1.js'));
 new vm.Script(CLIENT);
 assert.match(CSS,/mm-about-modern/);
 assert.match(CSS,/@media\(max-width:640px\)/);
 assert.doesNotMatch(CLIENT,/MM_ARTICLE_BEARER|SECRET|localStorage\.setItem|fetch\(/);
});
test('About injection is scoped, idempotent and preserves existing HTML',()=>{
 const revised=injectHtml(html,'/about.html');
 assert.match(revised,/mm-about-modern-v1\.css/);
 assert.match(revised,/mm-about-modern-v1\.js/);
 assert.ok(revised.includes('data-mm-about-modern="'+VERSION+'"'));
 assert.equal(injectHtml(revised,'/about.html'),revised);
 for(const url of ['/','/index.html','/berita/abc','/admin.html','/akun.html']){
  assert.equal(injectHtml(html,url),html,url);
 }
 assert.ok(revised.includes('Informasi pasar.'));
});
test('About refresh has no private account, API or publication changes',()=>{
 assert.ok(CLIENT.includes("location.pathname!=='/about.html'"));
 assert.ok(CLIENT.includes("document.body.classList.add('mm-about-modern')"));
 assert.ok(CLIENT.includes("'/assets/brand-logo.webp?v=marney-20261109-new-logo-r1'"));
});
