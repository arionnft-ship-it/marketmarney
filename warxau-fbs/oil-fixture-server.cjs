'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const app=path.resolve(process.env.OIL_FIXTURE||'oil-fixture-app');fs.mkdirSync(app+'/assets',{recursive:true});
const base=process.env.OIL_BASE||path.resolve(__dirname,'../base.html');fs.copyFileSync(base,app+'/assets/xau-war-3d.html');
const top=require('./topchat.cjs'),xau=top.createTopChat({appRoot:app,assetRoot:__dirname}),btc=require('./btc-addon.cjs').createBTC({appRoot:app,assetRoot:__dirname,topchat:top}),oil=require('./oil-addon.cjs').createOil({appRoot:app,assetRoot:__dirname,topchat:top});
const json=(r,d)=>{r.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});r.end(JSON.stringify(d));};
http.createServer((req,res)=>{if(oil.handle(req,res)||btc.handle(req,res)||xau.handle(req,res))return;const p=req.url.split('?')[0];if(p==='/api/discussions'){json(res,{items:[],user:null,total:0,hasMore:false,nextBefore:null,nextBeforeId:null});return;}if(p==='/api/community/status'){json(res,{registrationEnabled:false});return;}if(p==='/_railway/health'){json(res,{ok:true});return;}res.writeHead(404);res.end();}).listen(8978,'127.0.0.1',()=>console.log('OIL fixture ready'));
