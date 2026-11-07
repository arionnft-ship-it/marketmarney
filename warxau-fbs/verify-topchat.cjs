'use strict';
// Read-only public verification. No credentials or messages are written to production.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http');
const {createTopChat,enhancePage,chatSource,APPROVED}=require('./topchat.cjs');
const result={ok:false,checks:[],scope:'read-only public inspection; isolated adapter tests; no message or account creation'};
function check(name,ok){result.checks.push({name,ok:Boolean(ok)});assert.ok(ok,name);}
async function get(p,expected=200){const r=await fetch('https://marketmarney.com'+p,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'MarketMarney-WarXAU-Chat-Verification','Accept-Encoding':'identity'}});check(p+' HTTP',r.status===expected);return Buffer.from(await r.arrayBuffer());}
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{try{
 const app=fs.mkdtempSync(path.join(os.tmpdir(),'warxau-chat-'));fs.mkdirSync(app+'/assets');
 const raw=await get('/assets/xau-war-3d.html?v=7.7');check('approved live page checksum',digest(raw)===APPROVED);fs.writeFileSync(app+'/assets/xau-war-3d.html',raw);
 for(const name of ['discussion-1828.js','discussion-1828.css'])fs.writeFileSync(app+'/assets/'+name,await get('/assets/'+name));
 const chat=chatSource(fs.readFileSync(app+'/assets/discussion-1828.js','utf8'));new vm.Script(chat);check('transformed current chat syntax',true);
 const enhanced=enhancePage(raw.toString()),original=[...raw.toString().matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean),after=[...enhanced.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
 check('all original engine/feed scripts identical',JSON.stringify(original.map(digest))===JSON.stringify(after.map(digest)));
 for(const s of original)new vm.Script(s);check('all original scripts parse',true);
 check('idempotent HTML overlay',enhancePage(enhanced)===enhanced);
 const privateHTML=require('./page.cjs').privatePage(raw.toString(),fs.readFileSync(__dirname+'/client.js','utf8'));
 check('private FBS page transformation preserved',typeof privateHTML==='string'&&privateHTML.includes('7.8-fbs-private'));
 check('private FBS layout can be enhanced',enhancePage(privateHTML).includes('data-warxau-topchat="7.8"'));
 const d=JSON.parse((await get('/api/discussions?kind=analysis&target=MARKET%3AOANDA%3AXAUUSD&sort=newest')).toString());
 check('existing XAU room readable without login',Array.isArray(d.items)&&d.user===null);
 for(const p of ['/_railway/health','/akun.html','/api/community/status','/api/xau-war/mt4/health'])await get(p);
 for(const p of ['/api/xau-war/mt4/arena','/api/xau-war/mt4/status','/api/xau-war/mt4/stream'])await get(p,401);
 const a=createTopChat({appRoot:app,assetRoot:__dirname}),s=http.createServer((req,res)=>{if(!a.handle(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>s.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+s.address().port;for(const p of ['/assets/xau-war-3d.html','/assets/warxau-topchat-layout.js','/assets/warxau-topchat-chat.js','/assets/warxau-topchat.css']){const r=await fetch(base+p);check('overlay route '+p,r.status===200&&r.headers.get('x-warxau-layout')==='7.8-topchat');}check('private endpoint not claimed by UI addon',(await fetch(base+'/api/xau-war/mt4/arena')).status===404);}finally{await new Promise(r=>s.close(r));}
 result.originalInlineScripts=original.length;result.originalPageSha256=digest(raw);result.metadata=a.metadata();result.ok=true;
 }catch(e){result.error=String(e.stack||e).slice(0,1200);process.exitCode=1;}finally{result.checkedAt=new Date().toISOString();fs.writeFileSync('warxau-topchat-verify.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}})();
