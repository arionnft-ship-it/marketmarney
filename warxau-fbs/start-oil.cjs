'use strict';
// Compose ahead of the existing BTC handler so all arenas gain the three-way navigation.
function boot(){const mod=require('./btc-addon.cjs'),original=mod.createBTC,oil=require('./oil-addon.cjs').createOil();mod.createBTC=(...args)=>{const btc=original(...args);return {...btc,handle(req,res){return oil.handle(req,res)||btc.handle(req,res);}};};console.log('MM_OIL_WAR_READY '+JSON.stringify(oil.metadata()));require('./start-btc.cjs').boot();}
if(require.main===module){try{boot();}catch(e){console.error('MM_OIL_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={boot};
