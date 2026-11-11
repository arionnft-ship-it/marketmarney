'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {once}=require('node:events');
const {createEngagementService,GIFTS}=require('./live-engagement.cjs');
const streamId='e1a9c632-2bbb-4a7b-8b71-d6c9264ce4c1';
const viewerId='a32b65e1-1167-4d92-b3bd-b3e20f483b72';
const hostToken='host-token-QA-abcdefghijklmnopqrstuvwxyz123456';
const viewerToken='viewer-token-QA-abcdefghijklmnopqrstuvw123';
const header={Origin:'https://marketmarney.com','Content-Type':'application/json'};
const auth=t=>({Authorization:'Bearer '+t});
async function fixture(callback){
  let clock=Date.now();
  const viewers=new Map([[viewerId,{id:viewerId,token:viewerToken,lastSeen:clock,feeds:new Set()}]]);
  const stream={id:streamId,title:'LIVE Gold QA',category:'Edukasi',
    hostName:'Streamer QA',hostToken,hostUserId:'host',
    viewers,hostFeeds:new Set(),startedAt:new Date(clock).toISOString(),hostLastSeen:clock};
  const streams=new Map([[streamId,stream]]);
  const service=createEngagementService({streams},{now:()=>clock});
  const server=http.createServer((req,res)=>{
    if(service.handle(req,res))return;
    res.writeHead(404);res.end('not-found');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const url='/api/live-interactions/streams/'+streamId;
  async function call(path,method='GET',body,token=viewerToken,origin=true){
    const headers={...auth(token)};
    if(origin)headers.Origin=header.Origin;
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(base+url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    let data={};try{data=await response.json()}catch{}
    return {status:response.status,data};
  }
  try{await callback({service,streams,stream,call,base,url,viewerId,tick(ms=3000){clock+=ms}});}
  finally{service.close();await new Promise(resolve=>server.close(resolve));}
}
test('public gift menu has zero price and no money redemption',()=>{
  for(const value of Object.values(GIFTS))assert.equal(value.price,0);
  assert.equal(Object.keys(GIFTS).length,4);
});
test('only joined viewers or host can read the live comment feed',async()=>{
  await fixture(async({call})=>{
    const good=await call('/history');
    assert.equal(good.status,200);
    assert.deepEqual(good.data.comments,[]);
    assert.equal(good.data.giftsAreFree,true);
    const invalid=await call('/history','GET',undefined,'invalid-token-abcdefghijklmnop');
    assert.equal(invalid.status,401);
  });
});
test('comment is safely trimmed, bounded, stream-scoped and visible to host',async()=>{
  await fixture(async({call,tick})=>{
    const created=await call('/comments','POST',{text:'    XAU/USD naik? <script>alert(1)</script>   '});
    assert.equal(created.status,201);
    const history=await call('/history','GET',undefined,hostToken);
    assert.equal(history.status,200);
    assert.equal(history.data.comments.length,1);
    assert.equal(history.data.comments[0].text,'XAU/USD naik? <script>alert(1)</script>');
    assert.equal(history.data.comments[0].sender,'Penonton '+viewerId.slice(0,4).toUpperCase());
    const spam=await call('/comments','POST',{text:'spam'});
    assert.equal(spam.status,429);
    tick();
    const deleted=await call('/comments/'+created.data.id,'DELETE',undefined,hostToken);
    assert.equal(deleted.status,200);
    const after=await call('/history');
    assert.equal(after.data.comments.length,0);
  });
});
test('free virtual gifts broadcast counts and cannot buy coins',async()=>{
  await fixture(async({call,tick})=>{
    const gift=await call('/gifts','POST',{giftId:'heart'});
    assert.equal(gift.status,201);
    assert.equal(gift.data.giftCounts.heart,1);
    assert.equal(gift.data.price,0);
    assert.equal(gift.data.redeemable,false);
    const fast=await call('/gifts','POST',{giftId:'star'});
    assert.equal(fast.status,429);
    tick();
    const wrong=await call('/gifts','POST',{giftId:'cash'});
    assert.equal(wrong.status,400);
    const state=await call('/history');
    assert.equal(state.data.recentGifts[0].emoji,'❤️');
    assert.equal(state.data.recentGifts[0].virtual,true);
    assert.equal(state.data.recentGifts[0].price,0);
  });
});
test('cross-origin posting rejected, viewer cannot delete another comment',async()=>{
  await fixture(async({call,tick})=>{
    const csrf=await call('/comments','POST',{text:'not allowed'},viewerToken,false);
    assert.equal(csrf.status,403);
    const created=await call('/comments','POST',{text:'Valid comment'});
    assert.equal(created.status,201);
    const forbidden=await call('/comments/'+created.data.id,'DELETE',undefined,viewerToken);
    assert.equal(forbidden.status,403);
    tick();
    const report=await call('/reports','POST',{commentId:created.data.id,reason:'harassment'});
    assert.equal(report.status,202);
    assert.equal(report.data.temporary,true);
  });
});
test('host can mute a viewer, ended broadcasts reject new interactions',async()=>{
  await fixture(async({call,streams})=>{
    const muted=await call('/mutes','POST',{viewerId},hostToken);
    assert.equal(muted.status,200);
    const blocked=await call('/comments','POST',{text:'attempt'});
    assert.equal(blocked.status,403);
    streams.delete(streamId);
    const ended=await call('/history');
    assert.equal(ended.status,404);
  });
});
test('same stream publishes SSE snapshot and new comments in real time',async()=>{
  await fixture(async({base,url,call})=>{
    const controller=new AbortController();
    const response=await fetch(base+url+'/events',{
      headers:{...auth(viewerToken)},signal:controller.signal
    });
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/text\/event-stream/);
    const reader=response.body.getReader();
    const first=await reader.read();
    assert.match(Buffer.from(first.value).toString('utf8'),/event: snapshot/);
    const comment=await call('/comments','POST',{text:'Good market LIVE'});
    assert.equal(comment.status,201);
    const second=await reader.read();
    assert.match(Buffer.from(second.value).toString('utf8'),/event: comment/);
    controller.abort();reader.cancel().catch(()=>{});
  });
});
test('Live Marney original HTML and client gain chat/gift integration without altering stream signaling',()=>{
  process.env.MM_LIVE_REELS_UNIT_TEST='1';
  process.env.MM_LIVE_ENGAGEMENT_UNIT_TEST='1';
  const live=require('./live-stream.cjs');
  const injection=require('./live-engagement-preload.cjs');
  const html=injection.injectHtml(live.HTML);
  assert.match(html,/assets\/live-engagement\.css/);
  assert.match(html,/assets\/live-engagement\.js/);
  assert.equal(injection.injectHtml(html),html);
  const client=injection.injectClient(live.CLIENT);
  assert.match(client,/mm-live-session/);
  assert.match(client,/mm-live-end/);
  assert.equal(injection.injectClient(client),client);
  assert.match(client,/RTCPeerConnection/);
  assert.match(client,/\/streams\/.*join/);
});
