'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const {patchPublicTheme,prepareHomeHtml,INIT,RELEASE}=require('./public-theme-light.cjs');
const root=path.resolve('theme-fixture'),out=path.resolve('theme-test-results');fs.mkdirSync(out,{recursive:true});
const original=fs.readFileSync(root+'/assets/public-theme1867.js','utf8'),patched=patchPublicTheme(original),checks=[];
function ck(name,value){checks.push({name,ok:Boolean(value)});assert.ok(value,name);}
function environment(saved,blocked=false){
 const html={dataset:{},style:{}},meta={content:''},events={},writes=[];let store=saved;
 const ctx={document:{documentElement:html,querySelector:()=>meta,querySelectorAll:()=>[],getElementById:()=>null,readyState:'loading',addEventListener(){}},localStorage:{getItem(){if(blocked)throw Error('blocked');return store;},setItem(k,v){if(blocked)throw Error('blocked');store=v;writes.push([k,v]);}},queueMicrotask,URL,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},location:{href:'https://marketmarney.com/'},MutationObserver:class{observe(){}}};
 ctx.window=ctx;ctx.addEventListener=(name,fn)=>events[name]=fn;ctx.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(patched,ctx);
 return {ctx,html,meta,events,writes,store:()=>store,change:v=>store=v};
}
(async()=>{let server;try{
 new vm.Script(patched);ck('patched script syntax',true);
 for(const [name,value,expected]of [['fresh',null,'light'],['saved dark','dark','dark'],['saved light','light','light'],['invalid','system','light'],['empty','','light']]){const e=environment(value);ck(name+' initial theme',e.html.dataset.mmTheme===expected);ck(name+' initialization does not write preference',e.writes.length===0);}
 const denied=environment(null,true);ck('blocked storage defaults light',denied.html.dataset.mmTheme==='light');denied.ctx.MMTheme1867.set('dark');ck('toggle works with blocked storage',denied.html.dataset.mmTheme==='dark');
 const e=environment(null);e.ctx.MMTheme1867.set('dark');ck('explicit dark choice saved',e.store()==='dark');e.ctx.MMTheme1867.set('light');ck('explicit light choice saved',e.store()==='light');e.ctx.MMTheme1867.set('dark');e.events.storage({key:'mm_public_theme_v1',newValue:null});ck('removed preference returns to light',e.html.dataset.mmTheme==='light');e.ctx.MMTheme1867.set('dark');e.change(null);e.events.pageshow();ck('pageshow without preference uses light',e.html.dataset.mmTheme==='light');
 const pre=environment('dark');vm.runInContext(INIT,pre.ctx);ck('early initializer respects saved dark',pre.html.dataset.mmTheme==='dark');
 const blocked=environment(null,true);vm.runInContext(INIT,blocked.ctx);ck('early initializer tolerates blocked storage',blocked.html.dataset.mmTheme==='light');
 ck('script patch idempotent',patchPublicTheme(patched)===patched);
 const account=fs.readFileSync(root+'/account.html','utf8');ck('account HTML untouched',prepareHomeHtml(account)===account);
 const war='<html><head></head><body><canvas id="battle"></canvas></body></html>';ck('arena HTML untouched',prepareHomeHtml(war)===war);
 const home=fs.readFileSync(root+'/home.html','utf8'),next=prepareHomeHtml(home);ck('HTML defaults light before JS',next.includes('data-mm-theme="light"'));ck('early initializer precedes external scripts',next.indexOf('id="mm-first-visit-theme"')<next.indexOf('<script src='));ck('HTML patch idempotent',prepareHomeHtml(next)===next);
 const dir=path.join(root,'runtime');fs.mkdirSync(dir,{recursive:true});for(const name of ['performance-runtime.cjs','public-theme-light.cjs'])fs.copyFileSync(path.join(__dirname,name),path.join(dir,name));
 require('./install-light-theme.cjs').install(path.join(dir,'performance-runtime.cjs'));
 const {createPublicPerformance}=require(path.join(dir,'performance-runtime.cjs')),runtime=createPublicPerformance({appRoot:root});
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex'),oldURL='/assets/mm-perf-v1-'+digest(original)+'.js',newURL=runtime.snapshotAsset('public-theme1867.js');
 ck('theme receives new immutable cache URL',newURL!==oldURL&&newURL.includes(digest(patched)));
 ck('original theme file not overwritten',fs.readFileSync(root+'/assets/public-theme1867.js','utf8')===original);
 const fixture=runtime.rewriteHomeAssets(home.split(oldURL).join('/assets/public-theme1867.js'));
 ck('HTML references patched hash',fixture.includes(newURL)&&!fixture.includes(oldURL));
 fs.writeFileSync(root+'/fixture-home.html',fixture);fs.writeFileSync(root+'/theme-patched.js',patched);fs.writeFileSync(root+'/config.json',JSON.stringify({url:newURL,release:RELEASE}));
 server=http.createServer((req,res)=>{if(!runtime.handle(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let r=await fetch(base+newURL);ck('hashed endpoint serves patched source',(await r.text())===patched&&r.headers.get('cache-control').includes('immutable'));const tag=r.headers.get('etag');
 r=await fetch(base+newURL,{headers:{'If-None-Match':tag}});ck('new hash supports conditional 304',r.status===304);
 r=await fetch(base+'/assets/public-theme1867.js');ck('legacy asset path is patched and revalidated',(await r.text())===patched&&r.headers.get('cache-control').includes('max-age=0'));
 r=await fetch(base+'/assets/public-theme1867.js',{method:'HEAD'});ck('HEAD response stays empty',r.status===200&&(await r.arrayBuffer()).byteLength===0);
 r=await fetch(base+'/assets/public-theme1867.js',{method:'POST'});ck('asset rejects POST',r.status===405);
 fs.writeFileSync(out+'/unit.json',JSON.stringify({ok:true,checks,release:RELEASE},null,2));console.log(JSON.stringify({ok:true,checks}));
 }catch(error){fs.writeFileSync(out+'/unit.json',JSON.stringify({ok:false,checks,error:String(error.stack)},null,2));console.error(error);process.exitCode=1;}finally{if(server)await new Promise(r=>server.close(r));}})();
