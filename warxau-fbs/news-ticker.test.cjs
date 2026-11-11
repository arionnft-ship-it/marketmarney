'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {API_PATH,STYLE_ID,CLIENT_ID,injectTickerHtml,createNewsTicker}=require('./news-ticker.cjs');
const {providerFor,checkedUrl,parseFeed}=require('./squawk-feed.cjs');

async function launch(instance){
 const server=http.createServer((req,res)=>{if(instance.owns(req)){void instance.handle(req,res);return;}res.writeHead(404);res.end('no route');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
test('visible ticker uses only Newsquawk and never local MarketMarney news',()=>{
 const html='<!doctype html><html><head></head><body><main id="app">Berita dalam konten asli</main></body></html>';
 const result=injectTickerHtml(html);
 assert.match(result,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(result,new RegExp('id="'+CLIENT_ID+'"'));
 assert.match(result,/NEWSQUAWK/);
 assert.match(result,/Newsquawk belum terhubung/);
 assert.match(result,/pause\.addEventListener/);
 assert.match(result,/prefers-reduced-motion/);
 assert.match(result,/Berita dalam konten asli/);
 assert.equal(injectTickerHtml(result),result);
 assert.doesNotMatch(require('node:fs').readFileSync(require.resolve('./squawk-feed.cjs'),'utf8'),/marketmarney\.sqlite|DatabaseSync/);
});
test('no provider license: zero external requests and unconfigured response, not site news',async t=>{
 let requests=0;
 const ticker=createNewsTicker({feedUrl:'https://api.newsquawk.com/feed',licensed:false,fetchImpl:async()=>{requests++;throw Error('should not request');}});
 const srv=await launch(ticker);t.after(srv.close);
 const r=await fetch(srv.url+API_PATH);
 assert.equal(r.status,200);
 const j=await r.json();
 assert.deepEqual(j,{ok:false,status:'not_connected',source:'Newsquawk',headlines:[]});
 assert.equal(r.headers.get('x-squawk-connected'),'false');
 assert.equal(requests,0);
 assert.equal((await fetch(srv.url+'/admin.html')).status,404);
});
test('license + provider JSON: returns external only, filters unsafe links and deduplicates, etag & HEAD',async t=>{
 let calls=0;
 const ticker=createNewsTicker({feedUrl:'https://api.newsquawk.com/headlines.json',licensed:true,now:()=>1234567,fetchImpl:async(url,options)=>{
  calls++;
  assert.equal(url,'https://api.newsquawk.com/headlines.json');
  assert.equal(options.redirect,'error');
  return {status:200,headers:{get:(key)=>key==='content-type'?'application/json':null},text:async()=>JSON.stringify({headlines:[
   {title:'Central bank prepares new announcement for traders',url:'https://newsquawk.com/story/one',date:'2026-11-11T12:30:00Z'},
   {title:'Central bank prepares new announcement for traders',url:'https://newsquawk.com/story/one',date:'2026-11-11T12:30:00Z'},
   {title:'Unsafe javascript link should not render',url:'javascript:alert(1)'},
   {title:'Outside provider headline should not render',url:'https://marketmarney.com/berita/fake'},
   {title:'Another international market development',url:'https://www.newsquawk.com/story/two',date:'2026-11-11T12:31:00Z'}
  ]})};
 }});
 const srv=await launch(ticker);t.after(srv.close);
 let r=await fetch(srv.url+API_PATH);
 assert.equal(r.status,200);
 assert.equal(r.headers.get('x-squawk-connected'),'true');
 const etag=r.headers.get('etag'),j=await r.json();
 assert.equal(j.ok,true);assert.equal(j.source,'Newsquawk');
 assert.equal(j.headlines.length,2);
 assert.ok(j.headlines.every(x=>x.url.includes('newsquawk.com')));
 assert.equal(calls,1);
 r=await fetch(srv.url+API_PATH,{headers:{'If-None-Match':etag}});
 assert.equal(r.status,304);assert.equal(calls,1);
 r=await fetch(srv.url+API_PATH,{method:'HEAD'});
 assert.equal(r.status,200);assert.equal(await r.text(),'');
 assert.equal((await fetch(srv.url+'/api/content')).status,404);
});
test('RSS is parsed safely; FinancialJuice and other domains are rejected',()=>{
 const rss='<?xml version="1.0"?><rss><channel><item><title><![CDATA[Fed &amp; global markets remain in focus]]></title><link>https://newsquawk.com/alpha</link><pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
 assert.equal(parseFeed(rss,'application/rss+xml').length,1);
 assert.match(parseFeed(rss,'application/rss+xml')[0].title,/Fed & global/);
 assert.equal(providerFor('api.newsquawk.com'),'Newsquawk');
 assert.equal(providerFor('live.financialjuice.com'),null);
 assert.equal(providerFor('newsquawk.com.evil.example'),null);
 assert.throws(()=>checkedUrl('http://api.newsquawk.com/feed'));
 assert.throws(()=>checkedUrl('https://notnewsquawk.com/feed'));
 assert.throws(()=>checkedUrl('https://www.financialjuice.com/news'));
 assert.throws(()=>checkedUrl('https://newsquawk.com.evil.example/rss'));
 assert.equal(providerFor('other.squawk.com'),null);
 assert.throws(()=>checkedUrl('https://localhost/feed'));
 assert.throws(()=>checkedUrl('https://newsquawk.com:8080/feed'));
});
test('unavailable provider fails closed, never fallback to MarketMarney',async t=>{
 const ticker=createNewsTicker({licensed:true,feedUrl:'https://api.newsquawk.com/feed',fetchImpl:async()=>({status:403})});
 const srv=await launch(ticker);t.after(srv.close);
 const saved=console.error;console.error=()=>{};
 try{
  const r=await fetch(srv.url+API_PATH);assert.equal(r.status,503);
  assert.deepEqual(await r.json(),{ok:false,status:'unavailable',source:'Newsquawk',headlines:[]});
 }finally{console.error=saved}
});
