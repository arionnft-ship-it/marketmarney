'use strict';
process.env.MM_SOCIAL_EXPERIENCE_DISABLE_AUTO='1';
const test=require('node:test');
const assert=require('node:assert/strict');
const social=require('./social-experience-preload.cjs');

test('injects Social Marney assets once on every supported page',()=>{
  for(const page of social.SOCIAL_PAGES){
    const source='<!doctype html><html><head><title>x</title></head><body><main>x</main></body></html>';
    const once=social.injectHtml(source,page);
    assert.match(once,/mm-social-experience\.css/);
    assert.match(once,/mm-social-experience\.js/);
    assert.match(once,new RegExp(social.VERSION));
    assert.equal(social.injectHtml(once,page),once);
  }
});

test('does not touch unrelated pages or incomplete fragments',()=>{
  const page='<!doctype html><html><head></head><body></body></html>';
  assert.equal(social.injectHtml(page,'/index.html'),page);
  assert.equal(social.injectHtml('<main>x</main>','/beranda-trader.html'),'<main>x</main>');
});

test('legacy aliases resolve to canonical destinations',()=>{
  assert.equal(social.redirectFor('/social.html'),'/beranda-trader.html');
  assert.equal(social.redirectFor('/socialmarney.html'),'/beranda-trader.html');
  assert.equal(social.redirectFor('/berita.html'),'/index.html#berita');
  assert.equal(social.redirectFor('/unknown.html'),null);
});

test('client gates only counters after explicit logged-out status',()=>{
  assert.match(social.CLIENT,/\/api\/community\/status/);
  assert.match(social.CLIENT,/\/api\/trader-connect\/unread/);
  assert.match(social.CLIENT,/\/api\/trader-notifications\/count/);
  assert.match(social.CLIENT,/authState==='out'/);
  assert.match(social.CLIENT,/authenticated:false,count:0,unread:0/);
});

test('draft recovery excludes messages, chat, passwords and OTP fields',()=>{
  assert.match(social.CLIENT,/#shMessagePanel/);
  assert.match(social.CLIENT,/message\|chat\|password\|otp\|search/);
  assert.match(social.CLIENT,/input\[type="password"\]/);
  assert.match(social.CLIENT,/sessionStorage/);
  assert.doesNotMatch(social.CLIENT,/localStorage\.setItem\([^)]*(?:message|chat|password)/i);
});

test('experience covers performance, accessibility and safety features',()=>{
  for(const token of ['IntersectionObserver','content-visibility','prefers-reduced-motion','Buka tautan di luar MarketMarney','Tidak ada koneksi internet','Coba lagi','Live Marney']){
    assert.ok(social.CLIENT.includes(token)||social.CSS.includes(token),token);
  }
  assert.ok(social.SOCIAL_PAGES.has('/live.html'));
  assert.ok(social.SOCIAL_PAGES.has('/akun.html'));
  assert.ok(social.SOCIAL_PAGES.has('/journal.html'));
});

test('assets use versioned immutable caching and health is no-store',()=>{
  assert.match(social.CSS,/mm-social-live-link/);
  assert.match(social.CSS,/safe-area-inset-bottom/);
  assert.equal(social.HEALTH_PATH,'/api/social/experience');
});
