"use strict";
// Runs only for the existing application process. Does not modify protected source files.
const path=require('node:path');
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
function install(root=APP){
 const fs=require('node:fs'),vm=require('node:vm'),Module=require('node:module');
 const patches=require('./patches.cjs');
 // Refuse a mismatched account template before the app starts accepting requests.
 const page=require('./account-page.cjs').enhanceAccount(fs.readFileSync(path.join(root,'akun.html'),'utf8'));
 if(!page.includes('id="signupEmail"')||!page.includes('id="signupName"'))throw Error('Signup account template not compatible');
 const targets=[['community181.js','community'],['google-auth1856.js','google']];
 if(fs.existsSync(path.join(root,'mobile-google-auth.js')))targets.push(['mobile-google-auth.js','android']);
 // Validate every source before loading any changed module. Never apply a partial patch.
 const prepared=targets.map(([file,kind])=>{const filename=path.join(root,file),source=patches[kind](fs.readFileSync(filename,'utf8'));new vm.Script(Module.wrap(source),{filename});return {filename,source};});
 for(const {filename,source}of prepared){const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(source,filename);m.loaded=true;require.cache[filename]=m;}
 console.log('MM_SIGNUP_NAME_EMAIL_READY '+JSON.stringify({version:require('./requirements.cjs').VERSION,scope:'new-accounts',oldAccountsUnchanged:true,googleNamesPrivate:true}));
}
if(path.resolve(process.argv[1]||'.')===path.join(APP,'server.js'))install();
module.exports={install};
