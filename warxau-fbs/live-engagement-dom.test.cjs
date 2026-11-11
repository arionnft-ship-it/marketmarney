'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(require('node:path').join(__dirname,'live-engagement.js'),'utf8');
const ID='8feaac3b-1426-4cdf-aecd-12526da981fe';
const TOKEN='viewer-token-qa-abcdefghijklmnopqrstuvwxyz1234';
const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function create(){
  const html='<!doctype html><html><body>'+
    '<section id="viewerStage"><div class="mm-live-panel"><video id="remoteVideo"></video></div></section>'+
    '<section id="hostStage"><div class="mm-live-panel"><video id="localVideo"></video></div></section>'+
    '</body></html>';
  const dom=new JSDOM(html,{url:'https://marketmarney.com/live.html?watch='+ID,
    runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  window.TextDecoder=globalThis.TextDecoder;
  window.TextEncoder=globalThis.TextEncoder;
  const calls=[],readers=[];
  window.fetch=async (url,options={})=>{
    calls.push({url:String(url),method:options.method||'GET',headers:options.headers||{},body:options.body});
    if(String(url).endsWith('/events')){
      let sent=false;
      return {ok:true,status:200,body:{getReader:()=>({
        read:()=>{
          if(!sent){
            sent=true;
            const msg='event: snapshot\ndata: {"comments":[{"id":"sample","sender":"Penonton","text":"<script>alert(1)</script>","createdAt":1}],"giftCounts":{"heart":0}}\n\n';
            return Promise.resolve({done:false,value:new TextEncoder().encode(msg)});
          }
          return new Promise(resolve=>options.signal.addEventListener('abort',()=>resolve({done:true}),{once:true}));
        }
      })}};
    }
    if(options.method==='POST'||options.method==='DELETE'){
      return {ok:true,status:options.method==='POST'?201:200,json:async()=>({ok:true})};
    }
    return {ok:true,status:200,json:async()=>({comments:[],recentGifts:[]})};
  };
  window.eval(script);
  return {window,document:window.document,calls,close(){window.dispatchEvent(new window.Event('pagehide'));window.close();}};
}
test('viewer can comment, choose four FREE gifts and never enters payment flow',async()=>{
  const app=create();
  try{
    app.window.dispatchEvent(new app.window.CustomEvent('mm-live-session',{
      detail:{streamId:ID,viewerId:'aabbccdd',token:TOKEN,role:'viewer'}
    }));
    await tick(50);
    const stage=app.document.querySelector('#viewerStage .mm-live-engagement');
    assert.ok(stage&&!stage.hidden);
    assert.equal(stage.querySelectorAll('.mm-live-gift').length,4);
    assert.match(stage.textContent,/gratis/);
    const comment=stage.querySelector('.mm-live-comment-text');
    assert.equal(comment.textContent,'<script>alert(1)</script>');
    assert.equal(stage.querySelectorAll('script').length,0);
    const input=stage.querySelector('.mm-live-chat-input');
    input.value='Terima kasih untuk analisanya!';
    stage.querySelector('form').dispatchEvent(new app.window.Event('submit',{bubbles:true,cancelable:true}));
    await tick(35);
    const sent=app.calls.find(c=>c.url.endsWith('/comments')&&c.method==='POST');
    assert.ok(sent);assert.equal(sent.headers.Authorization,'Bearer '+TOKEN);
    assert.equal(JSON.parse(sent.body).text,'Terima kasih untuk analisanya!');
    stage.querySelector('[data-gift-id="heart"]').click();
    await tick(35);
    const gift=app.calls.find(c=>c.url.endsWith('/gifts')&&c.method==='POST');
    assert.ok(gift);assert.equal(JSON.parse(gift.body).giftId,'heart');
    assert.equal(stage.querySelectorAll('button[aria-label*="hadiah virtual gratis"]').length,4);
    assert.equal(app.document.querySelectorAll('input[type="number"]').length,0);
  }finally{app.close();}
});
test('streamer sees delete/mute controls and can leave cleanly',async()=>{
  const app=create();
  try{
    app.window.dispatchEvent(new app.window.CustomEvent('mm-live-session',{detail:{
      streamId:ID,token:'host-token-abcdefghijklmnopqrstuvwxyz123',role:'host'
    }}));
    await tick(50);
    const host=app.document.querySelector('#hostStage .mm-live-engagement');
    assert.ok(host&&!host.hidden);
    const line=host.querySelector('.mm-live-comment');
    assert.ok(line);
    assert.match(line.textContent,/Hapus/);
    app.window.dispatchEvent(new app.window.Event('mm-live-end'));
    assert.ok(host.hidden);
  }finally{app.close();}
});
test('without joining a live stream comments and gifts remain inaccessible',async()=>{
  const app=create();
  try{
    await tick(30);
    assert.ok(app.document.querySelector('#viewerStage .mm-live-engagement').hidden);
    assert.equal(app.calls.length,0);
  }finally{app.close();}
});
