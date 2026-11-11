'use strict';
// Build-time patch to the image wrapper only. Never writes to the mounted application.
const fs=require('node:fs'),path=require('node:path');
const file=process.argv[2];if(!file)throw Error('bootstrap path required');
const BRAND_FROM='marney-m-arrow-20261110-v1';
const BRAND_TO='marney-m-arrow-20261111-v2';
const ABOUT_FROM='about-m-arrow-only-20261110-v2';
const ABOUT_TO='about-m-arrow-only-20261111-v4';
function replaceVersion(filename,from,to){
 const target=path.join(__dirname,filename);if(!fs.existsSync(target))throw Error('Missing brand file: '+filename);
 let source=fs.readFileSync(target,'utf8');
 if(source.includes(from))source=source.split(from).join(to);
 else if(!source.includes(to))throw Error('Brand version anchor missing: '+filename);
 fs.writeFileSync(target,source);
}
for(const name of ['branding.cjs','seo.cjs','logo-asset.test.cjs'])replaceVersion(name,BRAND_FROM,BRAND_TO);
replaceVersion('about-refresh.cjs',ABOUT_FROM,ABOUT_TO);
console.log('MARNEY_BRAND_VERSION_PATCHED '+JSON.stringify({brand:BRAND_TO,about:ABOUT_TO}));
let s=fs.readFileSync(file,'utf8');
const anchor="function attachToServer(server,relay,port){";
const request="if(event==='request'&&server.address()?.port===port){if(relay.owns(args[0]))";
if(s.split(anchor).length!==2||s.split(request).length!==2||s.includes('const branding='))throw Error('Unexpected bootstrap source; refusing patch');
s=s.replace(anchor,"const branding=require('./branding.cjs').createBranding();\n"+anchor);
s=s.replace(request,"if(event==='request'&&server.address()?.port===port){if(branding.handle(args[0],args[1]))return true;branding.wrap(args[0],args[1]);if(relay.owns(args[0]))");
fs.writeFileSync(file,s);
console.log('MARNEY_BRAND_WRAPPER_PATCHED');
