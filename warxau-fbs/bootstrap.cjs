'use strict';
// Normal image entry point. Original app/data/auth files remain untouched.
// Existing verified public gateway is loaded exactly as before; only new private routes are added.
const http=require('node:http'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {createRelay}=require('./relay.cjs');const {privatePage}=require('./page.cjs');
const PORT=Number(process.env.PORT||8080);
const SITE='/persist/site-r1/MarketMarney-Railway-Staging/app/assets/xau-war-3d.html';
const APPROVED='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function attachToServer(server,relay,port){const emit=server.emit;server.emit=function(event,...args){if(event==='request'&&server.address()?.port===port&&relay.owns(args[0])){void relay.handle(args[0],args[1]);return true;}return emit.call(this,event,...args);};return server;}
function boot(){
 if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid external port');
 const enc=[1,2,3,4].map(i=>process.env['MM_PUBLIC_GATEWAY_PART'+i]||'').join('');
 const gateway=zlib.gunzipSync(Buffer.from(enc,'base64'),{maxOutputLength:1048576});
 if(!/^[a-f0-9]{64}$/.test(process.env.MM_PUBLIC_GATEWAY_SHA256||'')||hash(gateway)!==process.env.MM_PUBLIC_GATEWAY_SHA256)throw Error('Existing gateway integrity mismatch');
 let page=null;
 const relay=createRelay({writeHash:process.env.MM_MT4_WRITE_SHA256,readHash:process.env.MM_MT4_READ_SHA256,expiresAt:Number(process.env.MM_MT4_KEY_EXPIRES_AT),expectedServer:'FBS-Real-5',privatePage(){if(page)return page;const raw=fs.readFileSync(SITE);if(hash(raw)!==APPROVED)return null;page=privatePage(raw.toString(),fs.readFileSync(__dirname+'/client.js','utf8'));return page;}});
 const create=http.createServer;http.createServer=function(...args){return attachToServer(create.apply(this,args),relay,PORT);};
 const file='/tmp/marketmarney-public.cjs';try{if(fs.lstatSync(file).isSymbolicLink())throw Error('Gateway temp path is a symlink');}catch(e){if(e.code!=='ENOENT')throw e;}
 fs.writeFileSync(file,gateway,{mode:0o600});require(file);
 console.log('MM_FBS_PRIVATE_RECEIVER_READY '+JSON.stringify({version:'1.0',scope:'private',publicPageUnchanged:true}));
}
if(require.main===module){try{boot();}catch(e){console.error('MM_FBS_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={attachToServer,boot};
