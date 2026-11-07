'use strict';
// Build-time key storage integration. No persistent application files are modified.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const file=path.join(__dirname,'core.cjs'),source=fs.readFileSync(file,'utf8');
const marker="const key=required?require('./secret.cjs').loadKey(env):null;";
if(source.includes(marker)){console.log('OTP activation integration already installed');process.exit(0);}
const sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
if(sha!=='ce8ef95a5acdaaf27036ca3a6f0d723b0ca65f9d')throw Error('OTP core changed; review activation integration');
const before="const key=/^[a-f0-9]{64}$/i.test(env.MM_OTP_SECRET||'')?Buffer.from(env.MM_OTP_SECRET,'hex'):null;";
if(source.split(before).length!==2)throw Error('OTP key anchor mismatch');
const updated=source.replace(before,marker).replace("VERSION='signup-email-otp-20261108-r1'","VERSION='signup-email-otp-20261108-r2'");
fs.writeFileSync(file,updated);
console.log('OTP activation integration ready; secret values never generated during build');
