'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const top=require('./topchat.cjs'),addon=require('./ihsg-addon.cjs'),raw=fs.readFileSync('warxau-live/dist/WEB-LIVE.html');
const html=addon.makeIHSG(raw,top.enhancePage),scripts=s=>[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean),before=scripts(raw.toString()),after=scripts(html),checks=[];
function ck(name,ok){checks.push({name,ok:Boolean(ok)});assert.ok(ok,name);}
function tests(){
 ck('24 original inline scripts retained',after.length===24);for(const s of after)new vm.Script(s);ck('all inline scripts parse',true);
 ck('15 rendering scripts identical',before.slice(4,19).every((s,i)=>s===after[i+4]));
 ck('no unrelated live market API',!html.includes('api.gold-api.com')&&!html.includes('api.hyperliquid.xyz')&&!html.includes('wss://ws.kraken.com'));
 ck('no Nasdaq identity leaks',!html.includes('NASDAQ')&&!html.includes('NAS100')&&!html.includes('MMNasdaq'));
 ck('base source unchanged',crypto.createHash('sha256').update(raw).digest('hex')==='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212');
 const ctx={Intl,Date,performance,console};ctx.globalThis=ctx;vm.createContext(ctx);for(const i of [1,2,3,19])vm.runInContext(after[i],ctx);
 const status=ctx.MMIHSG.diagnostics();ck('live unconfigured and no provider',status.liveAvailable===false&&status.provider===null&&status.symbol==='IHSG');
 ck('no quote callback in waiting adapter',!after[19].includes('onQuote'));
 const d=new ctx.MMCore.Demo();ck('demo baseline is example 8000',d.price===8000);const q1=d.next(Date.now());ck('demo symbol IHSG',q1.symbol==='IHSG');ck('demo explicitly marked',q1.mode==='demo');
 const now=Date.now(),q=(price,t)=>({symbol:'IHSG',price,timestamp:t,mode:'demo',provider:'DEMO'});
 let l=new ctx.MMDestruction.Ledger({pipSize:1});l.accept(q(8000,now-1),now);l.accept(q(8100,now),now);let s=l.snapshot();
 ck('100 points: 20 infantry',s.triggered.up.infantry===20);ck('100 points: 5 tanks',s.triggered.up.tank===5);ck('100 points: 2 heli 1 jet',s.triggered.up.heli===2&&s.triggered.up.jet===1);
 l=new ctx.MMDestruction.Ledger({pipSize:1});l.accept(q(8000,now-2),now);l.accept(q(8300,now-1),now);l.accept(q(8280,now),now);s=l.snapshot();
 ck('300 points: one building',s.triggered.up.building===1);ck('down movement separate',s.triggered.down.tank===1);
 ck('foreign symbol rejected',!l.accept({...q(8000,now+1),symbol:'NAS100'},now+1).accepted);ck('duplicate timestamp rejected',!l.accept(q(8500,now),now).accepted);
 let t=now;const daily=new ctx.MMDaily.Session({wall:()=>t,mono:()=>t}),meta=ctx.MMDaily.demoSession(now,1);daily.ingest(meta);t=meta.closesAt;daily.tick();ck('demo daily close stops session',daily.phase==='closed');
 ck('demo calendar explicitly not BEI',html.includes('bukan jam perdagangan, hari libur, jeda sesi atau penutupan BEI'));
 const source="function valid(kind,target){if(kind==='analysis')return allowedAnalysis.has(target);return false;}",patch=require('./ihsg-preload.cjs').patch(source),allow=vm.runInNewContext('const allowedAnalysis=new Set(["MARKET:OANDA:XAUUSD","MARKET:BITSTAMP:BTCUSD"]);'+patch+';valid');
 for(const name of ['IDX:COMPOSITE','NASDAQ:NDX','HYPERLIQUID:WTI','OANDA:XAUUSD','BITSTAMP:BTCUSD'])ck(name+' chat allowed',allow('analysis','MARKET:'+name));
 ck('arbitrary targets rejected',!allow('analysis','MARKET:IDX:ARBITRARY'));ck('other kinds unchanged',!allow('article','MARKET:IDX:COMPOSITE'));
 const originalNas=require('./nasdaq-addon.cjs').makeNasdaq(raw,top.enhancePage);ck('Nasdaq still separate',originalNas.includes('NAS100 · BELUM TERHUBUNG')&&!originalNas.includes('MMIHSG'));
 fs.mkdirSync('ihsg-test-results',{recursive:true});fs.writeFileSync('ihsg-test-results/unit.json',JSON.stringify({ok:true,checks,liveAvailable:false},null,2));console.log(JSON.stringify({ok:true,checks}));
}
if(process.argv.includes('--serve')){
 const appRoot=path.resolve('ihsg-fixture-app');fs.mkdirSync(appRoot+'/assets',{recursive:true});fs.writeFileSync(appRoot+'/assets/xau-war-3d.html',raw);const p={appRoot,assetRoot:__dirname,topchat:top};
 const handlers=[addon.createIHSG(p),require('./nasdaq-addon.cjs').createNasdaq(p),require('./oil-addon.cjs').createOil(p),require('./btc-addon.cjs').createBTC(p),top.createTopChat(p)];
 http.createServer((req,res)=>{for(const h of handlers)if(h.handle(req,res))return;const p=req.url.split('?')[0];if(req.method==='GET'&&['/api/discussions','/api/community/status','/_railway/health'].includes(p)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(p==='/api/discussions'?{items:[],user:null,total:0,hasMore:false,nextBefore:null,nextBeforeId:null}:{ok:true,registrationEnabled:false}));return;}res.writeHead(404);res.end();}).listen(8977,'127.0.0.1',()=>console.log('IHSG fixture ready'));
}else tests();
