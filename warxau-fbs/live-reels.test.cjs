'use strict';
process.env.MM_LIVE_REELS_UNIT_TEST='1';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const { once }=require('node:events');
const originalCreateServer=http.createServer;
// Load verified existing streaming service FIRST, then install the new Reels
// wrapper exactly as the production NODE_OPTIONS order does.
const existing=require('./live-stream-preload.cjs');
const addon=require('./live-reels-preload.cjs');
addon.install();

const REELS='<html><head></head><body><details id="shReelsPanel"><div id="shReelFeed"></div></details></body></html>';
const SIMPLE='<html><head></head><body>Other social page</body></html>';
const STREAM_ID='8b11b9a4-706b-4b12-92b3-ac557b1c074a';

test('Reels HTML receives LIVE assets exactly once, without altering other pages',()=>{
  const output=addon.injectReels(REELS);
  assert.match(output,/live-reels\.js\?v=/);
  assert.match(output,/live-reels\.css\?v=/);
  assert.equal(addon.injectReels(output),output);
  assert.equal(addon.injectReels(SIMPLE),SIMPLE);
  assert.equal(addon.injectReels('<html><body>None'),'<html><body>None');
});
test('same-origin live viewing adds optional Reels embed style only for a viewer page',()=>{
  const page='<html><head></head><body><section id="viewerStage"></section></body></html>';
  const result=addon.injectEmbeddedViewer(page);
  assert.match(result,/mm-live-reels-embed/);
  assert.match(result,/<link rel="stylesheet" href="\/assets\/live-reels\.css/);
  assert.equal(addon.injectEmbeddedViewer(result),result);
  assert.equal(addon.injectEmbeddedViewer(SIMPLE),SIMPLE);
});
test('composes with existing Live Marney server and preserves public API/auth',async()=>{
  const server=http.createServer((req,res)=>{
    if(req.url?.startsWith('/beranda-trader.html')||req.url?.startsWith('/grup-trader.html')){
      const body=req.url.startsWith('/beranda-trader.html')?REELS:SIMPLE;
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':Buffer.byteLength(body)});
      return res.end(body);
    }
    res.writeHead(404,{'Content-Type':'text/plain'});res.end('not_found');
  });
  try{
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const base='http://127.0.0.1:'+server.address().port;
    async function get(route){
      const response=await fetch(base+route);
      return {status:response.status,headers:response.headers,body:await response.text()};
    }
    const social=await get('/beranda-trader.html');
    assert.equal(social.status,200);
    assert.match(social.body,/live-marney-launcher\.js/);
    assert.match(social.body,/live-reels\.js/);
    assert.match(social.body,/live-reels\.css/);
    assert.equal((social.body.match(/data-mm-live-reels=/g)||[]).length,1);
    assert.equal(Number(social.headers.get('content-length')),Buffer.byteLength(social.body));
    const group=await get('/grup-trader.html');
    assert.equal(group.status,200);
    assert.doesNotMatch(group.body,/live-reels\.js/);
    const client=await get('/assets/live-reels.js?v='+addon.VERSION);
    assert.equal(client.status,200);
    assert.match(client.body,/\/api\/live\/streams/);
    assert.match(client.body,/new MutationObserver/);
    assert.match(client.body,/&embed=reels/);
    assert.doesNotMatch(client.body,/getUserMedia/);
    const css=await get('/assets/live-reels.css?v='+addon.VERSION);
    assert.equal(css.status,200);assert.match(css.body,/\.mm-reels-live-dialog/);
    const live=await get('/live.html?watch='+STREAM_ID+'&embed=reels');
    assert.equal(live.status,200);
    assert.match(live.body,/id="viewerStage"/);
    assert.match(live.body,/class="mm-live-reels-embed"/);
    assert.match(live.body,/live-reels\.css/);
    assert.equal((live.body.match(/data-mm-live-reels-embed=/g)||[]).length,1);
    const normal=await get('/live.html');
    assert.equal(normal.status,200);
    assert.doesNotMatch(normal.body,/mm-live-reels-embed/);
    const listing=await get('/api/live/streams');
    assert.equal(listing.status,200);
    const data=JSON.parse(listing.body);
    assert.ok(Array.isArray(data.streams));
    assert.equal(data.streams.length,0,'Never fabricate a live broadcast');
    const invalid=await fetch(base+'/api/live/streams',{method:'POST',headers:{Origin:'https://marketmarney.com','Content-Type':'application/json'},body:'{}'});
    assert.equal(invalid.status,401,'Existing live broadcast creation still requires a signed-in user');
  }finally{
    await new Promise(resolve=>server.close(resolve));
    http.createServer=originalCreateServer;
  }
});
