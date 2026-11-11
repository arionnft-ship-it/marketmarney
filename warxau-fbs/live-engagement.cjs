'use strict';
/* Live Marney comments & free virtual gifts. No payments or stored-value tokens.
   Reuses the existing WebRTC viewer/host tokens and live stream source of truth. */
const crypto=require('node:crypto');
const BASE='/api/live-interactions';
const ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GIFTS=Object.freeze({
  heart:{emoji:'❤️',label:'Hati',price:0},
  clap:{emoji:'👏',label:'Tepuk tangan',price:0},
  star:{emoji:'⭐',label:'Bintang',price:0},
  flower:{emoji:'🌸',label:'Bunga',price:0}
});
const MAX_COMMENTS=60,MAX_GIFTS=12,MAX_REPORTS=50,MAX_BODY_BYTES=4096;
function tokenEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length>0&&left.length===right.length&&crypto.timingSafeEqual(left,right);
}
function bearer(req){
  const match=String(req.headers.authorization||'').match(/^Bearer\s+([A-Za-z0-9_-]{20,128})$/);
  return match?match[1]:'';
}
function clean(value,max=180){
  return Array.from(String(value==null?'':value).replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim()).slice(0,max).join('');
}
function respond(res,status,body,extra={}){
  const raw=Buffer.from(JSON.stringify(body));
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':raw.length,
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    ...extra
  });
  res.end(raw);
}
function fail(res,status,error){respond(res,status,{error});}
function parseBody(req){
  return new Promise((resolve,reject)=>{
    let buffers=[],size=0,ended=false;
    const timer=setTimeout(()=>end(Object.assign(new Error('BODY_TIMEOUT'),{status:408})),5000);
    timer.unref?.();
    function end(error,result){
      if(ended)return;ended=true;clearTimeout(timer);
      error?reject(error):resolve(result);
    }
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return end(Object.assign(new Error('JSON_REQUIRED'),{status:415}));
    if(Number(req.headers['content-length']||0)>MAX_BODY_BYTES)return end(Object.assign(new Error('BODY_TOO_LARGE'),{status:413}));
    req.on('data',buffer=>{
      size+=buffer.length;
      if(size>MAX_BODY_BYTES)return end(Object.assign(new Error('BODY_TOO_LARGE'),{status:413}));
      buffers.push(buffer);
    });
    req.on('end',()=>{
      try{
        const data=JSON.parse(Buffer.concat(buffers).toString('utf8'));
        if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('OBJECT_REQUIRED');
        end(null,data);
      }catch{end(Object.assign(new Error('INVALID_JSON'),{status:400}));}
    });
    req.on('error',error=>end(error));
    req.on('aborted',()=>end(Object.assign(new Error('REQUEST_ABORTED'),{status:400})));
  });
}
function createEngagementService(live,{now=Date.now}={}){
  if(!live||!(live.streams instanceof Map))throw new Error('Verified Live Marney service required');
  const states=new Map();
  function active(id){return live.streams.get(id)||null;}
  function principal(req,stream){
    const token=bearer(req);
    if(!token)return null;
    if(tokenEqual(token,stream.hostToken)){
      return {role:'host',id:'host',name:clean(stream.hostName,48)||'Streamer'};
    }
    for(const viewer of stream.viewers.values())if(tokenEqual(token,viewer.token)){
      return {role:'viewer',id:viewer.id,name:'Penonton '+viewer.id.slice(0,4).toUpperCase()};
    }
    return null;
  }
  function stateOf(id){
    let state=states.get(id);
    if(!state){
      state={comments:[],gifts:[],giftCount:{heart:0,clap:0,star:0,flower:0},
        reports:[],muted:new Set(),sse:new Set(),rate:new Map(),sequence:0};
      states.set(id,state);
    }
    return state;
  }
  function rate(state,key,kind,minSpacing,maxPerMinute){
    const time=now(),id=key+':'+kind;
    let r=state.rate.get(id);
    if(!r||time-r.window>=60000){r={window:time,count:0,last:0};state.rate.set(id,r);}
    if(time-r.last<minSpacing||r.count>=maxPerMinute)return false;
    r.count++;r.last=time;
    return true;
  }
  function emit(state,type,payload,only='all'){
    const content='event: '+type+'\ndata: '+JSON.stringify(payload)+'\n\n';
    for(const sub of state.sse){
      if(sub.res.destroyed||sub.res.writableEnded){state.sse.delete(sub);continue;}
      if(only==='host'&&sub.role!=='host')continue;
      if(sub.res.writableLength>128*1024){sub.res.end();state.sse.delete(sub);continue;}
      try{sub.res.write(content);}catch{state.sse.delete(sub);}
    }
  }
  function snapshot(state){
    return {comments:state.comments.slice(-MAX_COMMENTS),
      giftCounts:{...state.giftCount},recentGifts:state.gifts.slice(-MAX_GIFTS),
      giftsAreFree:true,monetaryValue:0};
  }
  function openEvents(req,res,state,who){
    if(state.sse.size>=32)return fail(res,429,'TOO_MANY_VIEWERS');
    res.writeHead(200,{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-store, no-transform',
      'Connection':'keep-alive',
      'X-Accel-Buffering':'no',
      'X-Content-Type-Options':'nosniff'
    });
    res.write(': connected\n\n');
    const sub={res,role:who.role,id:who.id};
    state.sse.add(sub);
    res.write('event: snapshot\ndata: '+JSON.stringify(snapshot(state))+'\n\n');
    const timer=setInterval(()=>{if(!res.writableEnded)res.write(': keepalive\n\n');},12000);
    timer.unref?.();
    const close=()=>{clearInterval(timer);state.sse.delete(sub);};
    req.on('close',close);res.on('close',close);
  }
  async function post(req,res,state,who,action,commentId,stream){
    const allowedOrigin=String(req.headers.origin||'');
    if(!['https://marketmarney.com','https://www.marketmarney.com'].includes(allowedOrigin))return fail(res,403,'ORIGIN_REJECTED');
    let body;
    try{body=await parseBody(req);}catch(e){return fail(res,e.status||400,e.message||'INVALID_BODY');}
    if(action==='comments'){
      if(state.muted.has(who.id))return fail(res,403,'CHAT_MUTED');
      const message=clean(body.text);
      if(message.length<1||message.length>180)return fail(res,400,'COMMENT_LENGTH');
      if(!rate(state,who.id,'comment',2200,12))return fail(res,429,'COMMENT_RATE_LIMIT');
      const entry={id:crypto.randomUUID(),senderId:who.id,sender:who.name,text:message,createdAt:now()};
      state.comments.push(entry);
      if(state.comments.length>MAX_COMMENTS)state.comments.splice(0,state.comments.length-MAX_COMMENTS);
      emit(state,'comment',entry);
      return respond(res,201,{ok:true,id:entry.id});
    }
    if(action==='gifts'){
      const giftId=clean(body.giftId,30);
      if(!Object.hasOwn(GIFTS,giftId))return fail(res,400,'UNKNOWN_GIFT');
      if(!rate(state,who.id,'gift',1200,10))return fail(res,429,'GIFT_RATE_LIMIT');
      const gift=GIFTS[giftId];
      const entry={id:crypto.randomUUID(),giftId,emoji:gift.emoji,
        label:gift.label,sender:who.name,createdAt:now(),virtual:true,price:0,redeemable:false};
      state.gifts.push(entry);
      if(state.gifts.length>MAX_GIFTS)state.gifts.splice(0,state.gifts.length-MAX_GIFTS);
      state.giftCount[giftId]++;
      emit(state,'gift',{...entry,giftCounts:{...state.giftCount}});
      return respond(res,201,{ok:true,giftCounts:{...state.giftCount},virtual:true,price:0,redeemable:false});
    }
    if(action==='reports'){
      const item=state.comments.find(c=>c.id===body.commentId);
      if(!item)return fail(res,404,'COMMENT_NOT_FOUND');
      const reason=clean(body.reason,20);
      if(!['spam','harassment','other'].includes(reason))return fail(res,400,'REASON_REQUIRED');
      if(!rate(state,who.id,'report',5000,5))return fail(res,429,'REPORT_RATE_LIMIT');
      const report={id:crypto.randomUUID(),commentId:item.id,reason,createdAt:now()};
      state.reports.push(report);
      if(state.reports.length>MAX_REPORTS)state.reports.shift();
      emit(state,'report',{commentId:item.id,reason},'host');
      return respond(res,202,{ok:true,temporary:true});
    }
    if(action==='mutes'){
      if(who.role!=='host')return fail(res,403,'HOST_ONLY');
      const viewerId=clean(body.viewerId,80);
      if(!stream.viewers.has(viewerId))return fail(res,404,'VIEWER_NOT_FOUND');
      state.muted.add(viewerId);
      emit(state,'muted',{viewerId});
      return respond(res,200,{ok:true});
    }
    return fail(res,404,'ROUTE_NOT_FOUND');
  }
  function removeComment(req,res,state,who,commentId){
    if(!['https://marketmarney.com','https://www.marketmarney.com'].includes(String(req.headers.origin||'')))return fail(res,403,'ORIGIN_REJECTED');
    if(who.role!=='host')return fail(res,403,'HOST_ONLY');
    const before=state.comments.length;
    state.comments=state.comments.filter(item=>item.id!==commentId);
    if(before===state.comments.length)return fail(res,404,'COMMENT_NOT_FOUND');
    emit(state,'comment-removed',{id:commentId});
    return respond(res,200,{ok:true});
  }
  function handle(req,res){
    const path=String(req.url||'').split('?')[0];
    if(!path.startsWith(BASE+'/'))return false;
    if(path===BASE+'/gifts'&&req.method==='GET'){
      respond(res,200,{gifts:Object.entries(GIFTS).map(([id,v])=>({id,...v,virtual:true,redeemable:false})),
        currency:null,giftsAreFree:true,monetaryValue:0});return true;
    }
    const match=path.match(/^\/api\/live-interactions\/streams\/([a-f0-9-]{36})\/(history|events|comments|gifts|reports|mutes|comments\/([a-f0-9-]{36}))$/i);
    if(!match||!ID_RE.test(match[1])){fail(res,404,'ROUTE_NOT_FOUND');return true;}
    const stream=active(match[1]);
    if(!stream){states.delete(match[1]);fail(res,404,'LIVE_NOT_FOUND');return true;}
    const who=principal(req,stream);
    if(!who){fail(res,401,'VIEWER_TOKEN_REQUIRED');return true;}
    const state=stateOf(match[1]),action=match[2];
    if(req.method==='GET'&&action==='history'){respond(res,200,snapshot(state));return true;}
    if(req.method==='GET'&&action==='events'){openEvents(req,res,state,who);return true;}
    if(req.method==='DELETE'&&action.startsWith('comments/')){
      removeComment(req,res,state,who,match[3]);return true;
    }
    if(req.method==='POST'&&['comments','gifts','reports','mutes'].includes(action)){
      void post(req,res,state,who,action,match[3],stream);
      return true;
    }
    fail(res,405,'METHOD_NOT_ALLOWED');return true;
  }
  function sweep(){
    for(const [id,state] of states){
      if(active(id))continue;
      emit(state,'ended',{reason:'stream-ended'});
      for(const sub of state.sse)try{sub.res.end();}catch{}
      states.delete(id);
    }
  }
  const timer=setInterval(sweep,7000);timer.unref?.();
  function close(){clearInterval(timer);for(const state of states.values())for(const sub of state.sse)try{sub.res.end();}catch{}states.clear();}
  return {handle,close,states,sweep,gifts:GIFTS};
}
module.exports={createEngagementService,GIFTS,BASE};
