'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const originalLoad=Module._load;
let relayWrapped=false,topchatWrapped=false;
const fakeRelayModule={createRelay(){return {owns:()=>false,handle:()=>false,status:()=>({state:'waiting',ageMs:null,quote:null,dailySession:null}),close(){}};}};
const fakeTopchatModule={createTopChat(){return {handle:()=>false,metadata:()=>({version:'fake'})};}};
const fakeLive={VERSION:'test',BASE:'/api/x',ASSET:'/asset.js',PAGE:'/page.html',WATCH_MS:80,PROVIDER:'provider',createPublicXauLive(){relayWrapped=true;return {owns:req=>req.url==='/api/x/status',handle:()=>true,close(){},metadata:()=>({version:'test'})};},wrapPublicPage(){topchatWrapped=true;}};
Module._load=function(request,parent,isMain){if(request==='./xau-public-live.cjs')return fakeLive;if(request==='./relay.cjs')return fakeRelayModule;if(request==='./topchat.cjs')return fakeTopchatModule;return originalLoad.call(this,request,parent,isMain);};
try{delete globalThis[Symbol.for('marketmarney.xau.public.live.preload')];require('./xau-public-live-preload.cjs');}finally{Module._load=originalLoad;}
const relay=fakeRelayModule.createRelay();assert.equal(relay.owns({url:'/api/x/status'}),true);assert.equal(relay.handle({url:'/api/x/status'},{}),true);assert.equal(relayWrapped,true);
const top=fakeTopchatModule.createTopChat();top.handle({url:'/page.html'},{});assert.equal(topchatWrapped,true);assert.equal(top.metadata().xauLive.transport,'sse');
console.log(JSON.stringify({ok:true}));
