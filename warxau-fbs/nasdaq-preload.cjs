'use strict';
// Replaces oil-preload only in the new image; preserves its exact existing target.
const path=require('node:path'),APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const TARGET='MARKET:NASDAQ:NDX',OIL='MARKET:HYPERLIQUID:WTI';
function patch(source){const before="if(kind==='analysis')return allowedAnalysis.has(target)",after="if(kind==='analysis')return target==='"+TARGET+"'||target==='"+OIL+"'||allowedAnalysis.has(target)";
 if(source.split(before).length!==2)throw Error('NASDAQ chat validation anchor changed');return source.replace(before,after);}
function install(root=APP){const fs=require('node:fs'),Module=require('node:module'),vm=require('node:vm'),file=path.join(root,'discussion1827.js');if(require.cache[file])throw Error('Discussion loaded before NASDAQ preload');const source=patch(fs.readFileSync(file,'utf8'));new vm.Script(Module.wrap(source),{filename:file});const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(source,file);m.loaded=true;require.cache[file]=m;console.log('MM_NASDAQ_CHAT_READY '+JSON.stringify({target:TARGET,oilTargetPreserved:OIL,auth:'unchanged',moderation:'unchanged'}));}
if(path.resolve(process.argv[1]||'.')===path.join(APP,'server.js'))install();
module.exports={patch,install,TARGET,OIL};
