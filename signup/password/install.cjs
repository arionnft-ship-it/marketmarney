'use strict';
// Build-time integration only. The protected application on /persist is never overwritten.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Module=require('node:module');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
if(root==='/persist'||root.startsWith('/persist/'))throw Error('Refusing to modify protected production volume');
function replaceOne(source,old,next,label){if(source.split(old).length!==2)throw Error('Password integration mismatch: '+label);return source.replace(old,next);}
function update(name,edit){const file=path.join(root,name),source=fs.readFileSync(file,'utf8');const next=edit(source);new vm.Script(Module.wrap(next),{filename:file});if(next!==source)fs.writeFileSync(file,next);return next!==source;}
let changed=0;
changed+=update('patches.cjs',source=>{
 if(source.includes("require('./password/transform.cjs')"))return source;
 return replaceOne(source,"return require('./otp/transform.cjs').community(s,helper);","return require('./password/transform.cjs').community(require('./otp/transform.cjs').community(s,helper),helper);",'community transform hook');
});
changed+=update('account-page.cjs',source=>{
 if(source.includes("require('./password/ui.cjs')"))return source;
 return replaceOne(source,"return require('./otp/ui.cjs').enhance(s);","return require('./password/ui.cjs').enhance(require('./otp/ui.cjs').enhance(s));",'account UI hook');
});
changed+=update('preload.cjs',source=>{
 if(source.includes('MM_PASSWORD_SECURITY_READY'))return source;
 source=replaceOne(source,"if(!page.includes('id=\"signupEmail\"')||!page.includes('id=\"signupName\"'))throw Error('Signup account template not compatible');","if(!page.includes('id=\"signupEmail\"')||!page.includes('id=\"signupName\"')||!page.includes('id=\"mmForgotPanel\"')||!page.includes('id=\"mmChangePasswordForm\"'))throw Error('Signup/password account template not compatible');",'runtime page guard');
 return replaceOne(source," console.log('MM_SIGNUP_NAME_EMAIL_READY '+JSON.stringify({version:require('./requirements.cjs').VERSION,scope:'new-accounts',oldAccountsUnchanged:true,googleNamesPrivate:true}));"," console.log('MM_SIGNUP_NAME_EMAIL_READY '+JSON.stringify({version:require('./requirements.cjs').VERSION,scope:'new-accounts',oldAccountsUnchanged:true,googleNamesPrivate:true}));\n console.log('MM_PASSWORD_SECURITY_READY '+JSON.stringify({version:require('./password/core.cjs').VERSION,forgotPassword:true,changePassword:true}));",'runtime marker');
});
for(const name of ['core.cjs','transform.cjs','ui.cjs'])new vm.Script(Module.wrap(fs.readFileSync(path.join(root,'password',name),'utf8')),{filename:name});
console.log(JSON.stringify({passwordSecurityIntegrated:true,changedFiles:changed,productionVolumeWritten:false}));
