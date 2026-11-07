'use strict';
// Build-time patch to the image wrapper only. Never writes to the mounted application.
const fs=require('node:fs');
const file=process.argv[2];if(!file)throw Error('bootstrap path required');
let s=fs.readFileSync(file,'utf8');
const anchor="function attachToServer(server,relay,port){";
const request="if(event==='request'&&server.address()?.port===port){if(relay.owns(args[0]))";
if(s.split(anchor).length!==2||s.split(request).length!==2||s.includes('const branding='))throw Error('Unexpected bootstrap source; refusing patch');
s=s.replace(anchor,"const branding=require('./branding.cjs').createBranding();\n"+anchor);
s=s.replace(request,"if(event==='request'&&server.address()?.port===port){if(branding.handle(args[0],args[1]))return true;branding.wrap(args[0],args[1]);if(relay.owns(args[0]))");
fs.writeFileSync(file,s);
console.log('MARNEY_BRAND_WRAPPER_PATCHED');
