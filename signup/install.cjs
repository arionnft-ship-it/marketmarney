'use strict';
// Build-time adaptation of the response layer only. /persist remains untouched.
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(process.argv[2]||'branding.cjs');
const old="changed=enhance(raw),out=changed===raw?data:Buffer.from(changed)";
const next="changed=enhance(require('./signup/account-page.cjs').enhanceAccount(raw,p)),out=changed===raw?data:Buffer.from(changed)";
const source=fs.readFileSync(file,'utf8');
if(source.includes(next)){console.log('Signup account layer already installed');process.exit(0);}
if(source.split(old).length!==2)throw Error('Branding response anchor changed; aborting build');
fs.writeFileSync(file,source.replace(old,next));
console.log('Signup account layer installed');
