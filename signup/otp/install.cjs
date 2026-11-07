'use strict';
// Apply hooks to the build copy only. Never write the protected app in /persist.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),Module=require('node:module');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
if(root==='/persist'||root.startsWith('/persist/'))throw Error('Refusing protected production volume');
const blob=s=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
function once(s,a,b){if(s.split(a).length!==2)throw Error('Expected one source anchor');return s.replace(a,b);}
const jobs=[
 ['patches.cjs','7402cf87ab183861b82ce9752768c105a84a5e55',s=>{
  s=once(s,' return s;\n}\nfunction google(source)'," return require('./otp/transform.cjs').community(s,helper);\n}\nfunction google(source)");
  s=once(s,' return s;\n}\nfunction android(source)'," return require('./otp/transform.cjs').oauth(s);\n}\nfunction android(source)");
  return once(s,' return s;\n}\nmodule.exports='," return require('./otp/transform.cjs').oauth(s);\n}\nmodule.exports=");
 }],
 ['account-page.cjs','d1eeff8a244b1b0c3a8c0ea8ee1c54086419627a',s=>once(s,' return s;\n}\nmodule.exports='," return require('./otp/ui.cjs').enhance(s);\n}\nmodule.exports=")]
];
const writes=[];
for(const [name,expected,edit]of jobs){const file=path.join(root,name),s=fs.readFileSync(file,'utf8');if(s.includes("require('./otp/"))continue;if(blob(s)!==expected)throw Error('Signup source changed; review before applying OTP: '+name);const next=edit(s);new vm.Script(Module.wrap(next),{filename:name});writes.push({file,next});}
for(const name of ['core.cjs','mailer.cjs','transform.cjs','ui.cjs'])new vm.Script(Module.wrap(fs.readFileSync(path.join(root,'otp',name),'utf8')),{filename:name});
for(const {file,next}of writes)fs.writeFileSync(file,next);
console.log(JSON.stringify({otpBuildHooksInstalled:true,changedFiles:writes.length,productionVolumeWritten:false,activationChanged:false}));
