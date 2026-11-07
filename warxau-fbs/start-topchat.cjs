'use strict';
// Add only the WarXAU UI overlay; preserve current gateway, private relay and homepage patches.
const http=require('node:http');
function boot(){
 let addon=null;
 try{addon=require('./topchat.cjs').createTopChat();}
 catch(e){console.warn('MM_WARXAU_TOPCHAT_SKIPPED '+String(e.message).slice(0,160));}
 if(addon){
  const pageModule=require('./page.cjs'),originalPage=pageModule.privatePage;
  pageModule.privatePage=(...args)=>{const html=originalPage(...args);return typeof html==='string'?addon.enhance(html):html;};
  const create=http.createServer,port=Number(process.env.PORT||8080);
  http.createServer=function(...args){const server=create.apply(this,args),emit=server.emit;server.emit=function(event,...a){if(event==='request'&&server.address()?.port===port&&addon.handle(a[0],a[1]))return true;return emit.call(this,event,...a);};return server;};
  console.log('MM_WARXAU_TOPCHAT_READY '+JSON.stringify(addon.metadata()));
 }
 require('./bootstrap.cjs').boot();
}
if(require.main===module){try{boot();}catch(e){console.error('MM_TOPCHAT_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={boot};
