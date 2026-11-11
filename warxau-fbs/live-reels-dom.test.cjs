'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const { JSDOM }=require('jsdom');

const source=fs.readFileSync(require('node:path').join(__dirname,'live-reels.js'),'utf8');
const ID='72ed2db5-71d9-41d2-9a14-236d589cd836';
const live=[{
  id:ID,title:'Analisis XAU/USD secara LIVE',category:'Analisis Market',
  hostName:'Trader Marney',startedAt:new Date().toISOString(),viewerCount:3
}];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture({streams=live,hash='#mm44-reels',opened=false,fail=false}={}){
  const html='<!doctype html><html><head></head><body>'+
   '<details id="shReelsPanel" '+(opened?'open':'')+'><summary>Reel Trader</summary>'+
   '<div id="shReelFeed"><video id="reel1"></video></div></details>'+
   '</body></html>';
  const dom=new JSDOM(html,{
    url:'https://marketmarney.com/beranda-trader.html'+hash,
    runScripts:'outside-only',pretendToBeVisual:true
  });
  const {window}=dom;
  let requests=[];
  window.fetch=async(url,options={})=>{
    requests.push({url,method:options.method||'GET',credentials:options.credentials});
    if(fail)throw new Error('503 unavailable');
    return {ok:true,status:200,json:async()=>({streams})};
  };
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  return {dom,window,document:window.document,requests};
}
test('Reels shows only genuine live sessions and opens/closes WebRTC viewer iframe',async()=>{
  const env=fixture();
  try{
    await pause(150);
    assert.equal(env.requests.length,1);
    assert.equal(env.requests[0].url,'/api/live/streams');
    assert.equal(env.requests[0].method,'GET');
    assert.equal(env.document.querySelectorAll('.mm-reels-live-card').length,1);
    const reel=env.document.getElementById('shReelFeed');
    assert.equal(env.document.getElementById('mmReelsLiveList').nextSibling,reel);
    assert.match(env.document.getElementById('mmReelsLiveList').textContent,/LIVE Sekarang/);
    assert.match(env.document.getElementById('mmReelsLiveList').textContent,/3 menonton/);
    const fab=env.document.getElementById('mmReelsLiveFab');
    assert.ok(fab&&!fab.hidden);
    env.document.querySelector('.mm-reels-live-card').click();
    const frame=env.document.querySelector('.mm-reels-live-dialog iframe');
    assert.ok(frame);
    assert.equal(frame.getAttribute('src'),'/live.html?watch='+ID+'&embed=reels');
    assert.ok(!frame.getAttribute('allow').includes('camera'));
    assert.ok(!frame.getAttribute('allow').includes('microphone'));
    env.document.querySelector('.mm-reels-live-close').click();
    await pause(30);
    assert.equal(env.document.querySelector('.mm-reels-live-dialog'),null);
  }finally{env.dom.window.close();}
});
test('no active stream never shows a fake LIVE badge or viewer',async()=>{
  const env=fixture({streams:[],hash:'',opened:true});
  try{
    await pause(120);
    assert.equal(env.document.querySelectorAll('.mm-reels-live-card').length,0);
    assert.match(env.document.getElementById('mmReelsLiveStatus').textContent,/Belum ada streamer/);
    const fab=env.document.getElementById('mmReelsLiveFab');
    assert.ok(!fab||fab.hidden);
  }finally{env.dom.window.close();}
});
test('network failure shows a transparent error without stale streamer buttons',async()=>{
  const env=fixture({fail:true});
  try{
    await pause(120);
    assert.equal(env.document.querySelectorAll('.mm-reels-live-card').length,0);
    assert.match(env.document.getElementById('mmReelsLiveStatus').textContent,/Siaran belum bisa diperiksa/);
  }finally{env.dom.window.close();}
});
test('fullscreen Reels has a LIVE pill that lists streamers in place',async()=>{
  const env=fixture({opened:false});
  try{
    await pause(130);
    const fab=env.document.getElementById('mmReelsLiveFab');
    assert.ok(fab&&!fab.hidden);
    fab.click();
    const dialog=env.document.querySelector('.mm-reels-live-dialog');
    assert.ok(dialog);
    assert.equal(dialog.querySelectorAll('.mm-reels-live-card').length,1);
    dialog.querySelector('.mm-reels-live-card').click();
    assert.ok(env.document.querySelector('.mm-reels-live-frame'));
    env.document.dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    await pause(20);
    assert.equal(env.document.querySelector('.mm-reels-live-dialog'),null);
  }finally{env.dom.window.close();}
});
test('closed Reels panel does not poll live sessions in background',async()=>{
  const env=fixture({hash:'',opened:false});
  try{
    await pause(100);
    assert.equal(env.requests.length,0);
  }finally{env.dom.window.close();}
});
