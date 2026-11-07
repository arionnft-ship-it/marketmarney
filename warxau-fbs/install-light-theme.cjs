'use strict';
// Build-time patch of the image's performance adapter; never touches the mounted app.
const fs=require('node:fs');
function install(file){
 let source=fs.readFileSync(file,'utf8');
 if(source.includes("require('./public-theme-light.cjs')"))return;
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('Theme install anchor changed: '+a.slice(0,60));source=source.replace(a,b);};
 replace("const zlib = require('node:zlib');","const zlib = require('node:zlib');\nconst {patchPublicTheme,prepareHomeHtml}=require('./public-theme-light.cjs');");
 replace("const body=fs.readFileSync(full), digest=hash(body), ext=path.extname(name);","const original=fs.readFileSync(full), body=name==='public-theme1867.js'?Buffer.from(patchPublicTheme(original.toString('utf8'))):original, digest=hash(body), ext=path.extname(name);");
 replace('return html.replace(/(\\b(?:src|href)', 'return prepareHomeHtml(html).replace(/(\\b(?:src|href)');
 replace('function sendAsset(req,res,asset,{immutable=false}={})', 'function sendAsset(req,res,asset,{immutable=false,revalidate=false}={})');
 replace("'Cache-Control':immutable?'public, max-age=31536000, immutable':'public, max-age=3600'","'Cache-Control':immutable?'public, max-age=31536000, immutable':revalidate?'public, max-age=0, must-revalidate':'public, max-age=3600'");
 replace("if(pathname==='/assets/news-war-performance-version.json'){",`if(pathname==='/assets/public-theme1867.js'){
      if(!['GET','HEAD'].includes(req.method)){empty(res,405);return true;}
      const url=snapshotAsset('public-theme1867.js'),asset=staticAssets.get(url);
      if(!asset){empty(res,503);return true;}
      sendAsset(req,res,asset,{revalidate:true});return true;
    }
    if(pathname==='/assets/news-war-performance-version.json'){`);
 new (require('node:vm').Script)(source,{filename:file});fs.writeFileSync(file,source);
}
if(require.main===module)install(process.argv[2]||'performance-runtime.cjs');
module.exports={install};
