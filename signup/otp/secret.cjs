'use strict';
// Generate a stable private key on the mounted volume, never expose it through tools/logs.
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
function loadKey(env=process.env){
 const supplied=env.MM_OTP_SECRET;
 if(supplied)return /^[a-f0-9]{64}$/i.test(supplied)?Buffer.from(supplied,'hex'):null;
 if(!env.MM_OTP_SECRET_FILE)return null;
 const filename=path.resolve(env.MM_OTP_SECRET_FILE),dir=path.dirname(filename);
 if(filename.includes('/site-r1/')||filename.includes('/uploads/'))throw Error('OTP secret must be outside public application files');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const d=fs.lstatSync(dir);
 if(!d.isDirectory()||d.isSymbolicLink()||(d.mode&0o077))throw Error('OTP secret directory is not private');
 if(!fs.existsSync(filename)){
  const tmp=path.join(dir,'.otp-key-'+randomBytes(12).toString('hex'));
  let fd;
  try{
   fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,randomBytes(32).toString('hex'));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
   try{fs.linkSync(tmp,filename);}catch(e){if(e.code!=='EEXIST')throw e;}
  }finally{if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')throw e;}}
 }
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const st=fs.fstatSync(fd);
  if(!st.isFile()||(st.mode&0o077)||st.size!==64)throw Error('OTP secret file has invalid permissions or format');
  const value=fs.readFileSync(fd,'utf8');
  if(!/^[a-f0-9]{64}$/i.test(value))throw Error('OTP secret file is invalid');
  return Buffer.from(value,'hex');
 }finally{fs.closeSync(fd);}
}
module.exports={loadKey};
