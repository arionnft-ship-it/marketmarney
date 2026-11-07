'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http');
const addon=require('./nasdaq-addon.cjs'),top=require('./topchat.cjs');
const raw=fs.readFileSync('warxau-live/dist/WEB-LIVE.html'),html=addon.makeNasdaq(raw,top.enhancePage);
const scripts=s=>[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean);
const before=scripts(raw.toString()),after=scripts(html),checks=[];
function ck(name,ok){checks.push({name,ok:Boolean(ok)});assert.ok(ok,name);}
function tests(){
 ck('24 inline scripts retained',after.length===24);for(const c of after)new vm.Script(c);ck('all inline scripts compile',true);
 ck('all 15 renderer and graphics scripts identical',before.slice(4,19).every((s,i)=>s===after[i+4]));
 ck('wrong price providers absent',!html.includes('api.gold-api.com')&&!html.includes('api.hyperliquid.xyz')&&!html.includes('wss://ws.kraken.com'));
 ck('no silent demo fallback',after[20].includes("status('waiting','NAS100 · BELUM TERHUBUNG')")&&!after[19].includes('onQuote'));
 const ctx={Intl,Date,performance,console};ctx.globalThis=ctx;vm.createContext(ctx);for(const i of [1,2,3,19])vm.runInContext(after[i],ctx);
 ck('diagnostics say live unavailable',ctx.MMNasdaq.diagnostics().liveAvailable===false);
 const n=Date.now(),q=(p,t)=>({symbol:'NAS100',price:p,timestamp:t,mode:'demo',provider:'DEMO'});
 let l=new ctx.MMDestruction.Ledger({pipSize:1});l.accept(q(25000,n-1),n);l.accept(q(25100,n),n);let s=l.snapshot();
 ck('100 points gives 20 infantry',s.triggered.up.infantry===20);ck('100 points gives 5 tanks',s.triggered.up.tank===5);ck('100 points gives 2 heli and 1 jet',s.triggered.up.heli===2&&s.triggered.up.jet===1);
 l=new ctx.MMDestruction.Ledger({pipSize:1});l.accept(q(25000,n-2),n);l.accept(q(25300,n-1),n);l.accept(q(25280,n),n);s=l.snapshot();
 ck('300 points destroys one building',s.triggered.up.building===1);ck('down direction independent',s.triggered.down.tank===1);
 ck('foreign quote rejected',l.accept({...q(25000,n+1),symbol:'XAU/USD'},n+1).accepted===false);
 const d=new ctx.MMCore.Demo();ck('demo symbol NAS100',d.next(n).symbol==='NAS100');
 ck('demo price not a live quote',d.next(n+1).mode==='demo');
 let t=n;const daily=new ctx.MMDaily.Session({wall:()=>t,mono:()=>t}),meta=ctx.MMDaily.demoSession(n,1);daily.ingest(meta);t=meta.closesAt;daily.tick();ck('demo daily deadline stops session',daily.phase==='closed');
 const patched=require('./nasdaq-preload.cjs').patch("function valid(kind,target){if(kind==='analysis')return allowedAnalysis.has(target);return false;}");
 const allow=vm.runInNewContext('const allowedAnalysis=new Set(["MARKET:OANDA:XAUUSD","MARKET:BITSTAMP:BTCUSD"]);'+patched+';valid');
 ck('NASDAQ chat target allowed',allow('analysis','MARKET:NASDAQ:NDX'));ck('oil target retained',allow('analysis','MARKET:HYPERLIQUID:WTI'));ck('arbitrary target rejected',!allow('analysis','MARKET:NASDAQ:ARBITRARY'));ck('other kinds unchanged',!allow('article','MARKET:NASDAQ:NDX'));
 fs.mkdirSync('nasdaq-test-results',{recursive:true});fs.writeFileSync('nasdaq-test-results/unit.json',JSON.stringify({ok:true,checks,liveAvailable:false},null,2));console.log(JSON.stringify({ok:true,checks}));
}
if(process.argv.includes('--serve')){
 const appRoot=path.resolve('nasdaq-fixture-app');fs.mkdirSync(appRoot+'/assets',{recursive:true});fs.writeFileSync(appRoot+'/assets/xau-war-3d.html',raw);
 const params={appRoot,assetRoot:__dirname,topchat:top},nas=addon.createNasdaq(params),oil=require('./oil-addon.cjs').createOil(params),btc=require('./btc-addon.cjs').createBTC(params),xau=top.createTopChat(params);
 http.createServer((req,res)=>{if(nas.handle(req,res)||oil.handle(req,res)||btc.handle(req,res)||xau.handle(req,res))return;const p=req.url.split('?')[0];if(req.method==='GET'&&['/api/discussions','/api/community/status','/_railway/health'].includes(p)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(p==='/api/discussions'?{items:[],user:null,total:0,hasMore:false,nextBefore:null,nextBeforeId:null}:{ok:true,registrationEnabled:false}));return;}res.writeHead(404);res.end();}).listen(8977,'127.0.0.1',()=>console.log('NASDAQ fixture ready'));
}else tests();
