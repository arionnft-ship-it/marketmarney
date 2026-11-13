'use strict';
function boot(){
 const mod=require('./nasdaq-addon.cjs'),original=mod.createNasdaq,ihsg=require('./ihsg-addon.cjs').createIHSG(),admin=require('./admin-portal.cjs');
 mod.createNasdaq=(...args)=>{const nasdaq=original(...args);return {...nasdaq,handle(req,res){return admin.handle(req,res)||ihsg.handle(req,res)||nasdaq.handle(req,res);}};};
 console.log('MM_IHSG_WAR_READY '+JSON.stringify(ihsg.metadata()));require('./start-nasdaq.cjs').boot();
}
if(require.main===module){try{boot();}catch(e){console.error('MM_IHSG_BOOT_FAILED '+String(e.message).slice(0,160));process.exit(1);}}
module.exports={boot};
