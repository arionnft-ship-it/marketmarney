'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {VERSION,POLICY,ASSET,CLIENT,isVideoHostPage,injectHtml,assets}=require('./youtube-referrer.cjs');
const html='<!doctype html><html><head><title>MarketMarney TV</title></head><body><div id="app"></div></body></html>';
test('inject only into public SPA HTML and preserve its layout',()=>{
 for(const path of ['/','/index.html']){
  const out=injectHtml(html,path);
  assert.match(out,/mm-youtube-referrer-v1\.js/);
  assert.ok(out.includes('data-mm-youtube-referrer="'+VERSION+'"'));
  assert.equal(injectHtml(out,path),out);
  assert.ok(out.includes('<div id="app"></div>'));
  assert.ok(isVideoHostPage(path));
 }
 for(const path of ['/berita/article','/admin.html','/akun.html','/api/content','/about.html','/sw.js']){
  assert.equal(injectHtml(html,path),html);
  assert.equal(isVideoHostPage(path),false);
 }
 assert.equal(POLICY,'strict-origin-when-cross-origin');
 assert.ok(assets().has(ASSET));
 new vm.Script(CLIENT);
});
test('repair YouTube iframe requests without touching other iframes',()=>{
 function frame(src){
  const attrs={src};
  const obj={
   nodeType:1,tagName:'IFRAME',attrs,edits:[],
   getAttribute(key){return this.attrs[key]??null;},
   setAttribute(key,val){this.attrs[key]=val;this.edits.push([key,val]);},
   querySelectorAll(){return [];}
  };
  return obj;
 }
 const yt=frame('https://www.youtube.com/embed/abcdefghijk?enablejsapi=1');
 const safe=frame('https://www.youtube-nocookie.com/embed/ABCDEFGHIjk');
 const external=frame('https://example.com/embed/abcdefghijk');
 const document={
  readyState:'complete', documentElement:{nodeType:1},
  querySelectorAll(selector){assert.equal(selector,'iframe[src]');return [yt,safe,external];}
 };
 let observer;
 class MutationObserver{
  constructor(cb){this.callback=cb;observer=this;}
  observe(root,opts){assert.equal(root,document.documentElement);assert.equal(opts.attributes,true);}
 }
 const ctx={URL,WeakMap,Set,document,location:{
  pathname:'/index.html',hostname:'marketmarney.com',
  origin:'https://marketmarney.com',href:'https://marketmarney.com/index.html'
 },MutationObserver};
 vm.runInNewContext(CLIENT,ctx,{timeout:200});
 assert.equal(yt.attrs.referrerpolicy,POLICY);
 assert.equal(new URL(yt.attrs.src).searchParams.get('origin'),'https://marketmarney.com');
 assert.equal(safe.attrs.referrerpolicy,POLICY);
 assert.equal(external.attrs.referrerpolicy,undefined);
 assert.deepEqual(external.edits,[]);
 const orig=yt.edits.length;
 observer.callback([{type:'attributes',target:yt}]);
 assert.equal(yt.edits.length,orig,'no repeated iframe reload');
 yt.setAttribute('src','https://www.youtube.com/watch?v=abcdefghijk');
 observer.callback([{type:'attributes',target:yt}]);
 assert.equal(new URL(yt.attrs.src).pathname,'/embed/abcdefghijk');
 assert.equal(yt.attrs.referrerpolicy,POLICY);
});
test('requires genuine HTTPS YouTube host and leaves non-video pages untouched',()=>{
 assert.doesNotMatch(CLIENT,/fetch\(|XMLHttpRequest|sessionStorage|localStorage|document\.body\.innerHTML/);
 assert.match(CLIENT,/youtube-nocookie\.com/);
 assert.match(CLIENT,/MutationObserver/);
 assert.match(CLIENT,/referrerpolicy/);
 const ctx={location:{hostname:'other.example'},document:{querySelectorAll(){throw Error('wrong host');}}};
 vm.runInNewContext(CLIENT,ctx,{timeout:200});
});
