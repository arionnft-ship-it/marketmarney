'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadKey}=require('../signup/otp/secret.cjs'),{preflight}=require('../signup/otp/preflight.cjs');
test('Private key persists without overwriting it and permissions are restricted',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mm-otp-'));const filename=path.join(root,'private','secret');
 try{const a=loadKey({MM_OTP_SECRET_FILE:filename}),b=loadKey({MM_OTP_SECRET_FILE:filename});assert.equal(a.length,32);assert(a.equals(b));assert.equal(fs.statSync(filename).mode&0o777,0o600);assert.equal(fs.statSync(path.dirname(filename)).mode&0o777,0o700);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Existing invalid/private key is never overwritten',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mm-otp-')),filename=path.join(root,'secret');
 try{fs.writeFileSync(filename,'broken',{mode:0o600});assert.throws(()=>loadKey({MM_OTP_SECRET_FILE:filename}));assert.equal(fs.readFileSync(filename,'utf8'),'broken');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Symlink and public-directory secret paths rejected',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mm-otp-'));
 try{const target=path.join(root,'target');fs.writeFileSync(target,'a'.repeat(64),{mode:0o600});fs.symlinkSync(target,path.join(root,'link'));assert.throws(()=>loadKey({MM_OTP_SECRET_FILE:path.join(root,'link')}));assert.throws(()=>loadKey({MM_OTP_SECRET_FILE:'/persist/site-r1/secret'}));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Preflight uses provider synthetic address, does not create users or expose key',async()=>{
 const sends=[],env={MM_SIGNUP_EMAIL_OTP:'required',MM_EMAIL_FROM:'otp@auth.marketmarney.com',MM_OTP_SECRET_FILE:'/persist/.marketmarney-private/signup-otp.secret',RAILWAY_DEPLOYMENT_ID:'test-id',RESEND_API_KEY:'hidden'};
 const result=await preflight(env,{ready:true,async send(m){sends.push(m);}});assert.equal(sends.length,1);assert.equal(sends[0].email,'delivered+marketmarney-otp-setup@resend.dev');assert(result.providerAccepted);assert(!JSON.stringify(result).includes('hidden'));assert.equal(result.accountCreated,false);
});
test('Preflight fails closed for sender errors and does nothing when disabled',async()=>{
 await assert.rejects(preflight({MM_SIGNUP_EMAIL_OTP:'required'},{ready:false}));
 const result=await preflight({},{ready:false});assert.equal(result.skipped,true);
 await assert.rejects(preflight({MM_SIGNUP_EMAIL_OTP:'required',MM_OTP_SECRET:'a'.repeat(64)},{ready:true,async send(){throw Error('provider failure');}}));
});
