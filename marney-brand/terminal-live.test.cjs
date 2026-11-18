'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {ENDPOINT,MAX_CLIENTS,articlePreview,tickerPreview,createTerminalLive}=require('./terminal-live.cjs');

test('public SSE normalizes only published article previews and verified publisher URLs',()=>{
 assert.equal(ENDPOINT,'/api/terminal/live');
 assert.ok(MAX_CLIENTS<200);
 const preview=articlePreview({id:'a',title:'Fed affects gold',cat:'EMAS',status:'published',desc:'Report',body:'Private long article body',sourceName:'MarketMarney',date:'2026-11-18T01:00:00Z'});
 assert.equal(preview.id,'a');
 assert.equal(Object.hasOwn(preview,'body'),false,'never stream full article bodies');
 assert.equal(preview.title,'Fed affects gold');
 assert.equal(articlePreview({id:'b',title:'Draft',status:'draft'}),null);
 assert.equal(tickerPreview({id:'1',title:'Gold moves',url:'https://www.actionforex.com/news',source:'ActionForex'}).source,'ActionForex');
 for(const url of ['http://127.0.0.1/private','https://actionforex.com.evil.org','https://evil.example.com','http://www.actionforex.com','https://x:y@www.actionforex.com']){
  assert.equal(tickerPreview({title:'Fake',url}),null,url);
 }
});
test('one shared one-second SSE heartbeat plus bounded 15s/60s source polls, close releases timer',async()=>{
 let t=100000,intervals=[],clears=0;
 const fetched=[],articles=[{id:'1',title:'XAUUSD rises',cat:'EMAS',status:'published',desc:'Gold'}];
 const feed=[{id:'ff',title:'Fed prepares next decision',url:'https://www.actionforex.com/contributors/a/',source:'ActionForex',published:'2026-11-18T00:00:00Z'}];
 const live=createTerminalLive({
  now:()=>t,articleMs:15000,tickerMs:60000,tickMs:1000,
  setIntervalFn:(fn,ms)=>{const handle={fn,ms,unref(){}};intervals.push(handle);return handle},
  clearIntervalFn:()=>{clears++},
  fetchImpl:async url=>{
   fetched.push(url);
   return {ok:true,json:async()=>url.endsWith('/api/content')?{articles}:{headlines:feed}};
  }
 });
 assert.equal(live.owns({url:ENDPOINT,method:'POST'}),true);
 assert.equal(live.owns({url:'/api/other',method:'GET'}),false);
 class Response extends EventEmitter{
  constructor(){super();this.status=null;this.headers=null;this.chunks=[];this.destroyed=false;this.writableEnded=false;this.writableLength=0;}
  writeHead(status,headers){this.status=status;this.headers=headers}
  write(data){this.chunks.push(String(data));return true}
  end(data){if(data!=null)this.write(data);this.writableEnded=true;this.emit('close')}
  flushHeaders(){}
 }
 const req=new EventEmitter();req.url=ENDPOINT;req.method='GET';
 const res=new Response();assert.equal(live.handle(req,res),true);
 assert.equal(res.status,200);
 assert.match(res.headers['Content-Type'],/text\/event-stream/);
 assert.equal(intervals.length,1);
 assert.equal(intervals[0].ms,1000);
 await live.refresh();
 assert.equal(fetched.length,2);
 assert.equal(live.payload().articles.length,1);
 assert.equal(live.payload().headlines.length,1);
 assert.ok(res.chunks.join('').includes('event: news'));
 const before=res.chunks.length;
 t+=1000;live.tick();await live.refresh();
 assert.equal(res.chunks.length,before+1,'tick sends one event without network refetch');
 assert.ok(res.chunks.at(-1).includes('event: heartbeat'));
 assert.equal(fetched.length,2);
 t+=15000;await live.refresh();
 assert.equal(fetched.length,3,'articles checked after 15s, not every second');
 t+=45000;await live.refresh();
 assert.equal(fetched.length,5,'both publisher and article refresh on bounded cadence');
 articles.push({id:'2',title:'Breaking latest published news',cat:'SAHAM',status:'published'});
 t+=16000;await live.refresh();
 assert.equal(live.payload().articles.length,2);
 assert.ok(res.chunks.join('').includes('Breaking latest published news'));
 res.end();
 assert.equal(live.subscribers(),0);
 assert.equal(clears,1);
 const denied=new Response(),post=new EventEmitter();post.url=ENDPOINT;post.method='POST';
 assert.equal(live.handle(post,denied),true);
 assert.equal(denied.status,405);
 assert.equal(denied.headers.Allow,'GET');
});
test('publisher outage retains last good news and does not broadcast fabricated headlines',async()=>{
 let t=1700000000000,fail=false;
 const live=createTerminalLive({now:()=>t,setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{},
  fetchImpl:async url=>{
   if(fail)throw Error('source unavailable');
   return {ok:true,json:async()=>url.endsWith('/api/content')?{articles:[{id:'a',title:'Known published',cat:'EMAS',status:'published'}]}:{headlines:[]}};
  }});
 await live.refresh();
 assert.equal(live.payload().articles[0].title,'Known published');
 fail=true;t+=61000;await live.refresh();
 assert.equal(live.payload().articles[0].title,'Known published');
 assert.equal(live.payload().headlines.length,0);
 assert.ok(live.payload().revision>=1);
});


test('per-source freshness becomes stale after failed checks rather than falsely staying connected',async()=>{
 let nowMs=100000,fail=false;
 const live=createTerminalLive({now:()=>nowMs,articleMs:15000,tickerMs:60000,
  setIntervalFn:()=>({unref(){}}),clearIntervalFn:()=>{},
  fetchImpl:async url=>{
   if(fail)throw Error('upstream_outage');
   return {ok:true,json:async()=>url.endsWith('/api/content')?
    {articles:[{id:'a',title:'Published gold market analysis',cat:'EMAS',status:'published'}]}:
    {headlines:[{id:'f',title:'Gold market headline',url:'https://www.actionforex.com/test/news',source:'ActionForex'}]}};
  }});
 await live.refresh();
 assert.equal(live.payload().sources.marney.status,'fresh');
 assert.equal(live.payload().sources.external.status,'fresh');
 assert.equal(live.payload().sources.marney.ageSeconds,0);
 assert.equal(live.payload().sources.marney.retrySeconds,15);
 assert.equal(live.payload().sources.external.retrySeconds,60);
 fail=true;nowMs+=47000;
 await live.refresh();
 assert.equal(live.payload().sources.marney.status,'stale');
 assert.equal(live.payload().sources.external.status,'fresh');
 assert.equal(live.payload().articles.length,1,'retain last valid article through temporary outage');
 nowMs+=150000;await live.refresh();
 assert.equal(live.payload().sources.marney.status,'stale');
 assert.equal(live.payload().sources.external.status,'stale');
 assert.equal(live.payload().headlines.length,1,'retain real publisher items and never fabricate');
});
test('source checks do not claim healthy when no successful response has arrived',async()=>{
 let t=100000;
 const live=createTerminalLive({now:()=>t,fetchImpl:async()=>{throw Error('offline')}});
 assert.equal(live.payload().sources.marney.status,'checking');
 assert.equal(live.payload().sources.external.status,'checking');
 await live.refresh();
 assert.equal(live.payload().sources.marney.status,'unavailable');
 assert.equal(live.payload().sources.external.status,'unavailable');
 assert.equal(live.payload().articles.length,0);
 assert.equal(live.payload().headlines.length,0);
});
