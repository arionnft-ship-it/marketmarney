'use strict';

// Compose the sanitized public XAU SSE stream around the existing private relay
// and the already-approved public WarXAU page. Persistent app files stay unchanged.
const live=require('./xau-public-live.cjs');
const relayModule=require('./relay.cjs');
const topchatModule=require('./topchat.cjs');
const MARK=Symbol.for('marketmarney.xau.public.live.preload');

if(!globalThis[MARK]){
 globalThis[MARK]=true;
 const originalCreateRelay=relayModule.createRelay;
 relayModule.createRelay=function(...args){
  const privateRelay=originalCreateRelay.apply(this,args);
  const publicLive=live.createPublicXauLive({relay:privateRelay});
  return {
   ...privateRelay,
   owns(req){return publicLive.owns(req)||privateRelay.owns(req);},
   handle(req,res){return publicLive.owns(req)?publicLive.handle(req,res):privateRelay.handle(req,res);},
   close(){publicLive.close();privateRelay.close();},
   publicLiveMetadata:publicLive.metadata
  };
 };
 const originalCreateTopChat=topchatModule.createTopChat;
 topchatModule.createTopChat=function(...args){
  const addon=originalCreateTopChat.apply(this,args);
  return {
   ...addon,
   handle(req,res){live.wrapPublicPage(req,res);return addon.handle(req,res);},
   metadata(){return {...addon.metadata(),xauLive:{version:live.VERSION,transport:'sse',watchMs:live.WATCH_MS,provider:live.PROVIDER}};}
  };
 };
}

console.log('MM_XAU_PUBLIC_LIVE_PRELOAD_READY '+JSON.stringify({version:live.VERSION,base:live.BASE,asset:live.ASSET,page:live.PAGE,transport:'sse',watchMs:live.WATCH_MS}));
