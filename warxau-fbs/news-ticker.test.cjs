'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {STYLE_ID,CLIENT_ID,ROOT_ID,API_PATH,PROVIDER_URL,PROVIDERS,CLIENT,CSS,decodeXml,allowedUrl,parseRss,createMarketTicker,injectTickerHtml}=require('./news-ticker.cjs');
const XML='<?xml version="1.0"?><rss version="2.0"><channel><title>News</title>'+
 '<item><title><![CDATA[Gold &amp; Silver Markets Rise After CPI]]></title><link>https://www.actionforex.com/live-comments/gold-test/</link><pubDate>Fri, 13 Nov 2026 02:00:00 GMT</pubDate></item>'+
 '<item><title><![CDATA[News about private data leak]]></title><link>https://127.0.0.1/private</link><pubDate>Fri, 13 Nov 2026 02:00:00 GMT</pubDate></item>'+
 '<item><title>Foreign link should not display</title><link>https://evil.example.org/news</link><pubDate>Fri, 13 Nov 2026 02:00:00 GMT</pubDate></item>'+
 '<item><title>Outdated market story will not count as latest</title><link>https://www.actionforex.com/old/</link><pubDate>Mon, 1 Jan 2024 02:00:00 GMT</pubDate></item></channel></rss>';
const NOW=Date.parse('2026-11-13T09:00:00Z');

test('RSS titles are real attributed headlines, cleaned, limited and valid HTTPS provider links only',()=>{
 const action=PROVIDERS[0];
 const rows=parseRss(XML,action,NOW);
 assert.equal(rows.length,1);
 assert.equal(rows[0].title,'Gold & Silver Markets Rise After CPI');
 assert.equal(rows[0].source,'ActionForex');
 assert.equal(rows[0].url,'https://www.actionforex.com/live-comments/gold-test/');
 assert.equal(rows[0].published,'2026-11-13T02:00:00.000Z');
 assert.equal(allowedUrl('https://actionforex.com/story',action.domain),'https://actionforex.com/story');
 assert.equal(allowedUrl('https://actionforex.com.evil.org/story',action.domain),null);
 assert.equal(allowedUrl('http://actionforex.com/story',action.domain),null);
 assert.equal(allowedUrl('https://127.0.0.1/secret',action.domain),null);
 assert.equal(decodeXml('&lt;news&gt; &amp; &quot;gold&quot;'),'<news> & "gold"');
 assert.throws(()=>parseRss('invalid data',action,NOW),/unsupported/);
});
test('Public RSS backend refreshes, caches, deduplicates and serves no invented news on outage',async()=>{
 let requests=0;
 const provider=PROVIDERS[0];
 const ticker=createMarketTicker({providers:[provider],now:()=>NOW,cacheMs:300000,
  fetchImpl:async(uri)=>{requests++;assert.equal(uri,provider.url);return {ok:true,status:200,headers:{get:()=>null},text:async()=>XML}}});
 const first=await ticker.snapshot(),second=await ticker.snapshot();
 assert.equal(first.body,second.body);
 assert.equal(requests,1);
 const payload=JSON.parse(first.body);
 assert.equal(payload.ok,true);
 assert.equal(payload.status,'connected');
 assert.equal(payload.headlines.length,1);
 assert.equal(payload.headlines[0].source,'ActionForex');
 assert.equal(payload.headlines[0].title,'Gold & Silver Markets Rise After CPI');
 const empty=createMarketTicker({providers:[provider],now:()=>NOW,fetchImpl:async()=>{throw Error('offline')}});
 const noNews=JSON.parse((await empty.snapshot()).body);
 assert.equal(noNews.ok,false);
 assert.deepEqual(noNews.headlines,[]);
});
test('Endpoint is GET/HEAD only, scoped to news ticker and respects ETag',async()=>{
 const provider=PROVIDERS[0];
 const ticker=createMarketTicker({providers:[provider],now:()=>NOW,fetchImpl:async()=>({ok:true,headers:{get:()=>null},text:async()=>XML})});
 assert.equal(ticker.owns({method:'POST',url:API_PATH}),false);
 assert.equal(ticker.owns({method:'GET',url:'/api/admin'}),false);
 assert.equal(ticker.owns({method:'GET',url:API_PATH+'?v=1'}),true);
 const response=()=>{
  const r={status:0,headers:null,body:null,writeHead(code,headers){this.status=code;this.headers=headers},
  end(body){this.body=body}};return r;
 };
 const first=response();
 await ticker.handle({method:'GET',url:API_PATH,headers:{}},first);
 assert.equal(first.status,200);
 assert.equal(first.headers['X-Content-Type-Options'],'nosniff');
 assert.equal(JSON.parse(first.body).headlines.length,1);
 const second=response();
 await ticker.handle({method:'GET',url:API_PATH,headers:{'if-none-match':first.headers.ETag}},second);
 assert.equal(second.status,304);
 const head=response();await ticker.handle({method:'HEAD',url:API_PATH,headers:{}},head);
 assert.equal(head.status,200);assert.equal(head.body,'');
});
class FakeNode{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent='';this.className='';this.hidden=false;this.handlers={};this.style={setProperty:(k,v)=>{this.property={k,v}}};this.classList={add(name){this.selected=name},remove(name){if(this.selected===name)this.selected=''}};}
 get firstChild(){return this.children[0]??null;}
 setAttribute(k,v){this.attributes[k]=String(v)}
 append(...children){this.children.push(...children)}
 prepend(...children){this.children.unshift(...children)}
 removeChild(child){this.children.splice(this.children.indexOf(child),1)}
 addEventListener(name,cb){this.handlers[name]=cb}
}
test('Client renders one ticker strip, never a panel, with two seamless ticker segments',async()=>{
 const body=new FakeNode('body'),timers=[],docHandlers={},doc={body,hidden:false,
  getElementById(){return null},
  createElement(tag){return new FakeNode(tag)},
  addEventListener(name,cb){docHandlers[name]=cb}};
 const result={headlines:[{id:'a1',title:'Gold moves sharply after central bank release',source:'ActionForex',url:'https://www.actionforex.com/live-comments/gold-test/'}]};
 const context={document:doc,URL,fetch:async()=>({ok:true,json:async()=>result}),
   setInterval:(fn,ms)=>{timers.push({fn,ms})}};
 vm.runInNewContext(CLIENT,context,{timeout:1000});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(body.children.length,1);
 const root=body.children[0];
 assert.equal(root.id,ROOT_ID);
 assert.equal(root.children.length,3,'label, ticker viewport, and source — no expandable news panel');
 const viewport=root.children[1],track=viewport.children[0],placeholder=viewport.children[1];
 assert.equal(placeholder.hidden,true);
 assert.equal(track.children.length,2);
 const group=track.children[0],repeated=track.children[1];
 assert.equal(repeated.attributes['aria-hidden'],'true');
 assert.equal(group.children.length,1);
 assert.equal(group.children[0].href,result.headlines[0].url);
 assert.equal(group.children[0].target,'_blank');
 assert.equal(repeated.children[0].tabIndex,-1);
 assert.equal(track.classList.selected,'mm-tv-news-playing');
 assert.equal(timers[0].ms,300000);
 assert.ok(!root.children.some(x=>x.className.includes('panel')));
});
test('Ticker injection is homepage compatible, standalone, no inline third-party scripts',()=>{
 const before='<!doctype html><html lang="id"><head></head><body><main id="app">MARNEY</main></body></html>';
 const html=injectTickerHtml(before);
 assert.ok(html.includes('id="'+STYLE_ID+'"'));
 assert.ok(html.includes('id="'+CLIENT_ID+'"'));
 assert.equal(injectTickerHtml(html),html,'no duplicate');
 assert.ok(html.includes('MARNEY'));
 assert.equal(injectTickerHtml('<html><body>missing head</body></html>'),'<html><body>missing head</body></html>');
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i);
 assert.ok(CSS.includes('@keyframes mm-market-news-scroll'));
 assert.ok(CSS.includes('prefers-reduced-motion'));
 assert.ok(CSS.includes('animation-play-state:paused'));
 assert.equal(API_PATH,'/api/marketmarney/news-ticker');
 assert.equal(PROVIDER_URL,'https://www.actionforex.com/');
 const bootstrap=fs.readFileSync(require.resolve('./bootstrap.cjs'),'utf8');
 assert.match(bootstrap,/marketTicker\.owns\(args\[0\]\)/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(html\)\)/);
});
