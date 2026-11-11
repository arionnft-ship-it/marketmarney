'use strict';
process.env.MM_SOCIAL_ROUTING_DISABLE_AUTO='1';
const test=require('node:test');
const assert=require('node:assert/strict');
const routing=require('./social-routing-fix.cjs');

test('reels route opens the existing reels panel',()=>{
 assert.equal(routing.redirectFor('/reels.html'),'/beranda-trader.html#shReelsPanel');
 assert.equal(routing.redirectFor('/unknown.html'),null);
});

test('live guard is injected only into live start pages',()=>{
 const html='<!doctype html><html><head></head><body></body></html>';
 for(const page of ['/live.html','/start-stream']){
  const once=routing.injectHtml(html,page);assert.match(once,/mm-social-routing\.js/);assert.equal(routing.injectHtml(once,page),once);
 }
 assert.equal(routing.injectHtml(html,'/beranda-trader.html'),html);
});

test('client catches route and exact camera start label before device permission',()=>{
 for(const token of ['/start-stream','Aktifkan kamera','location.replace','statusPromise','mmLiveRoutingBypass'])assert.ok(routing.CLIENT.includes(token),token);
 assert.doesNotMatch(routing.CLIENT,/getUserMedia|MediaRecorder/);
});

test('health metadata is versioned and contains no credentials',()=>{
 assert.equal(routing.HEALTH_PATH,'/api/social/routing');
 assert.ok(routing.INJECT_PAGES.has('/start-stream'));
 assert.doesNotMatch(routing.CLIENT,/(?:client_secret|api_key|bearer\s+[a-z0-9])/i);
});
