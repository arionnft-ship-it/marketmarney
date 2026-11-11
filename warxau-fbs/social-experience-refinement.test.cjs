'use strict';
process.env.MM_SOCIAL_REFINEMENT_DISABLE_AUTO='1';
const test=require('node:test');
const assert=require('node:assert/strict');
const refine=require('./social-experience-refinement.cjs');

test('injects refinement on Social Marney and homepage only',()=>{
 const html='<!doctype html><html><head></head><body></body></html>';
 for(const page of ['/','/index.html','/beranda-trader.html','/grup-trader.html','/profil.html','/live.html','/reels.html']){
  const once=refine.injectHtml(html,page);assert.match(once,/mm-social-refinement\.js/);assert.match(once,/mm-social-refinement\.css/);assert.equal(refine.injectHtml(once,page),once);
 }
 assert.equal(refine.injectHtml(html,'/berita/example'),html);
});

test('repairs direct messages and notifications legacy routes',()=>{
 assert.equal(refine.redirectFor('/pesan.html'),'/beranda-trader.html#shMessagePanel');
 assert.equal(refine.redirectFor('/messages.html'),'/beranda-trader.html#shMessagePanel');
 assert.equal(refine.redirectFor('/notifications.html'),'/beranda-trader.html#shNotificationPanel');
 assert.equal(refine.redirectFor('/unknown.html'),null);
});

test('client includes audited Social Marney UX repairs',()=>{
 for(const token of [
  '0 postingan dimuat','Ruang diskusi yang lebih teratur','Unggah hingga 100 MB',
  'showAuthGate','installGuestFeatureGate','activateHashPanel','installMobileNav',
  'Cari postingan, trader, atau grup','shMessagePanel','shNotificationPanel',
  'Masuk untuk melihat pesan dan notifikasi.'
 ]) assert.match(refine.CLIENT,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(refine.CSS,/mm-social-auth-gate/);
 assert.match(refine.CSS,/mm-social-mobile-nav/);
 assert.match(refine.CSS,/mm-social-guest-repair/);
});

test('health metadata is versioned and covers Social pages',()=>{
 assert.equal(refine.VERSION,'20261111-social-refinement-v2');
 assert.equal(refine.HEALTH_PATH,'/api/social/refinement');
 assert.ok(refine.INJECT_PAGES.has('/notifikasi.html'));
 assert.ok(refine.INJECT_PAGES.has('/journal.html'));
});
