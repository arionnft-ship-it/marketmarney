'use strict';
function boot(){
 const mod=require('./oil-addon.cjs'),original=mod.createOil,nasdaq=require('./nasdaq-addon.cjs').createNasdaq();
 mod.createOil=(...args)=>{const oil=original(...args);return {...oil,handle(req,res){return nasdaq.handle(req,res)||oil.handle(req,res);}};};
 console.log('MM_NASDAQ_WAR_READY '+JSON.stringify(nasdaq.metadata()));
 require('./start-oil.cjs').boot();
}
if(require.main===module){try{boot();}catch(e){console.error('MM_NASDAQ_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={boot};
