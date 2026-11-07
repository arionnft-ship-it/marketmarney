'use strict';
// Add exactly one supported public chat target, without changing auth/moderation or on-disk files.
const path=require('node:path'),APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const TARGET='MARKET:HYPERLIQUID:WTI';
function patch(source){const before="if(kind==='analysis')return allowedAnalysis.has(target)",after="if(kind==='analysis')return target==='"+TARGET+"'||allowedAnalysis.has(target)";
 if(source.split(before).length!==2)throw Error('Oil chat target validation anchor changed');return source.replace(before,after);}
function install(root=APP){const fs=require('node:fs'),Module=require('node:module'),vm=require('node:vm'),file=path.join(root,'discussion1827.js');if(require.cache[file])throw Error('Discussion loaded before oil preload');const source=patch(fs.readFileSync(file,'utf8'));new vm.Script(Module.wrap(source),{filename:file});const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(source,file);m.loaded=true;require.cache[file]=m;console.log('MM_OIL_CHAT_READY '+JSON.stringify({target:TARGET,auth:'unchanged',moderation:'unchanged'}));}
if(path.resolve(process.argv[1]||'.')===path.join(APP,'server.js'))install();
module.exports={patch,install,TARGET};
