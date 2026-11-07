'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const appRoot=path.resolve('btc-fixture-app');fs.mkdirSync(appRoot+'/assets',{recursive:true});fs.copyFileSync('warxau-live/dist/WEB-LIVE.html',appRoot+'/assets/xau-war-3d.html');
const top=require('./topchat.cjs'),xau=top.createTopChat({appRoot,assetRoot:__dirname}),btc=require('./btc-addon.cjs').createBTC({appRoot,assetRoot:__dirname,topchat:top});
function json(res,d){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(d));}
http.createServer((req,res)=>{if(btc.handle(req,res)||xau.handle(req,res))return;const p=req.url.split('?')[0];if(p==='/api/discussions'){json(res,{items:[],user:null,total:0,hasMore:false,nextBefore:null,nextBeforeId:null});return;}if(p==='/api/community/status'){json(res,{registrationEnabled:false});return;}if(p==='/_railway/health'){json(res,{ok:true});return;}res.writeHead(404);res.end();}).listen(8977,'127.0.0.1',()=>console.log('BTC fixture ready'));
