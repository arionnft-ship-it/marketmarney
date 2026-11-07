'use strict';
// Compose with current, verified XAU/chat/logo boot. No persistent source writes or migrations.
function boot(){const top=require('./topchat.cjs'),original=top.createTopChat;let btc=null;
 try{btc=require('./btc-addon.cjs').createBTC({topchat:top});}catch(e){console.error('MM_BTC_ADDON_FAILED '+String(e.message).slice(0,180));throw e;}
 top.createTopChat=(...args)=>{const xau=original(...args);return {...xau,handle(req,res){return btc.handle(req,res)||xau.handle(req,res);}};};
 console.log('MM_BTC_WAR_READY '+JSON.stringify(btc.metadata()));require('./start-topchat.cjs').boot();}
if(require.main===module){try{boot();}catch(e){console.error('MM_BTC_BOOT_FAILED '+String(e.message).slice(0,180));process.exit(1);}}
module.exports={boot};
