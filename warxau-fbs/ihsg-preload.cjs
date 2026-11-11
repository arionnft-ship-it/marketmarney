'use strict';
const path=require('node:path'),APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const TARGET='MARKET:IDX:COMPOSITE',NAS='MARKET:NASDAQ:NDX',OIL='MARKET:HYPERLIQUID:WTI';
function patch(source){const before="if(kind==='analysis')return allowedAnalysis.has(target)",after="if(kind==='analysis')return target==='"+TARGET+"'||target==='"+NAS+"'||target==='"+OIL+"'||allowedAnalysis.has(target)";if(source.split(before).length!==2)throw Error('IHSG chat validation anchor changed');return source.replace(before,after);}
function install(root=APP){const fs=require('node:fs'),Module=require('node:module'),vm=require('node:vm'),file=path.join(root,'discussion1827.js');if(require.cache[file])throw Error('Discussion loaded before IHSG preload');const source=patch(fs.readFileSync(file,'utf8'));new vm.Script(Module.wrap(source),{filename:file});const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(source,file);m.loaded=true;require.cache[file]=m;console.log('MM_IHSG_CHAT_READY '+JSON.stringify({target:TARGET,preserved:[NAS,OIL],auth:'unchanged',moderation:'unchanged'}));}

// Temporary read-only discovery for Live Marney integration. It emits only route names,
// filenames and feature markers; it never emits cookies, secrets, tokens or user content.
function safeRoutes(text){
 const out=new Set(),source=String(text||''),re=/["'`](\/(?:api|auth)\/[A-Za-z0-9_./:?=&${}-]{1,180})["'`]/g;let m;
 while((m=re.exec(source))){
  const route=m[1].replace(/\$\{[^}]+\}/g,':param').replace(/[?&](?:token|key|secret|code)=[^&"'`]+/gi,'');
  if(!/(?:token|secret|password|authorization)/i.test(route))out.add(route);
 }
 return [...out].sort();
}
function discover(root=APP){
 const fs=require('node:fs'),found=[];
 function walk(dir,depth=0){if(depth>3)return;let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}for(const e of entries){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,depth+1);else if(/\.(?:html|js|cjs)$/i.test(e.name)&&/(?:social|trader|profile|profil|group|grup|account|akun|auth|message|chat|community|discussion)/i.test(e.name))found.push(p);}}
 walk(root);
 const files=[];
 for(const file of found.slice(0,120))try{const stat=fs.statSync(file);if(stat.size>6*1024*1024)continue;const text=fs.readFileSync(file,'utf8'),routes=safeRoutes(text),markers=[];for(const marker of ['getUserMedia','MediaRecorder','WebSocket','EventSource','session','currentUser','profile','message','chat'])if(text.includes(marker))markers.push(marker);if(routes.length||markers.length)files.push({file:path.relative(root,file),bytes:stat.size,routes:routes.slice(0,80),markers});}catch{}
 console.log('MM_LIVE_PROBE_ASSETS '+JSON.stringify({files:files.slice(0,60)}));
}
if(path.resolve(process.argv[1]||'.')===path.join(APP,'server.js')){install();setTimeout(()=>discover(),8000).unref?.();}
module.exports={patch,install,TARGET,NAS,OIL,safeRoutes,discover};
