'use strict';
const {randomBytes,randomInt,createHmac,createHash,timingSafeEqual}=require('node:crypto');
const {createMailer}=require('../otp/mailer.cjs');
const {loadKey}=require('../otp/secret.cjs');
const TTL=5*60*1000,COOLDOWN=60000,MAX_ATTEMPTS=5,VERSION='password-security-20261108-r1';
function problem(code,status,message,retryAfter=0){return Object.assign(new Error(message),{code,status,retryAfter});}
const badCode=()=>problem('password_otp_invalid',400,'Kode salah, kedaluwarsa, atau sudah digunakan. Gunakan kode terbaru atau kirim ulang.');
const sha=value=>createHash('sha256').update(value).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function createPasswordSecurity({db,normalizeEmail,env=process.env,clock=Date.now,secure=true,mailer=createMailer(env),wait=sleep}={}){
 const required=env.MM_PASSWORD_EMAIL_OTP==='required';
 const key=required?loadKey(env):null;
 const ready=required&&!!key&&mailer.ready===true;
 const cookieName=secure?'__Host-mm_password_reset':'mm_password_reset';
 const digest=(scope,value)=>createHmac('sha256',key).update(scope+'\0'+value).digest('hex');
 const dayCap=/^\d+$/.test(env.MM_PASSWORD_OTP_DAILY_LIMIT||'')?Math.max(1,Math.min(1000,Number(env.MM_PASSWORD_OTP_DAILY_LIMIT))):50;
 const unavailable=()=>problem('password_otp_unavailable',503,'Pemulihan password melalui email belum tersedia. Silakan coba lagi nanti.');
 function ensure(){if(!ready)throw unavailable();}
 function info(){return {required,available:ready,digits:6,expiresInSeconds:TTL/1000,resendAfterSeconds:COOLDOWN/1000};}
 if(!required)return {required,info,issue:async()=>{throw unavailable();},check:()=>null,consume:()=>{},clearCookie:()=>null};
 if(typeof normalizeEmail!=='function')throw Error('Email normalizer is required');
 db.exec(`CREATE TABLE IF NOT EXISTS community_password_reset_20261108(
  id_hash TEXT PRIMARY KEY,browser_hash TEXT NOT NULL,user_id TEXT,email_key TEXT NOT NULL,code_hash TEXT NOT NULL,
  expires_ms INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_ms INTEGER NOT NULL,delivered INTEGER NOT NULL DEFAULT 0
 );
 CREATE INDEX IF NOT EXISTS community_password_reset_expiry_20261108 ON community_password_reset_20261108(expires_ms);
 CREATE INDEX IF NOT EXISTS community_password_reset_browser_20261108 ON community_password_reset_20261108(browser_hash);
 CREATE INDEX IF NOT EXISTS community_password_reset_user_20261108 ON community_password_reset_20261108(user_id);
 CREATE TABLE IF NOT EXISTS community_password_reset_rates_20261108(
  key TEXT PRIMARY KEY,started_ms INTEGER NOT NULL,count INTEGER NOT NULL
 );`);
 const get=db.prepare('SELECT * FROM community_password_reset_20261108 WHERE id_hash=?');
 const account=db.prepare(`SELECT r.user_id,r.email,r.email_key,r.email_verified,u.username,u.banned
  FROM community_registration_20261107 r JOIN community_users_181 u ON u.id=r.user_id
  WHERE r.email_key=?`);
 const rateRead=db.prepare('SELECT started_ms,count FROM community_password_reset_rates_20261108 WHERE key=?');
 const ratePut=db.prepare('INSERT INTO community_password_reset_rates_20261108 VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET started_ms=excluded.started_ms,count=1');
 const rateInc=db.prepare('UPDATE community_password_reset_rates_20261108 SET count=count+1 WHERE key=?');
 let lastClean=-Infinity;
 function cleanup(){const now=clock();if(now-lastClean<60000)return;lastClean=now;db.prepare('DELETE FROM community_password_reset_20261108 WHERE expires_ms<=?').run(now);db.prepare('DELETE FROM community_password_reset_rates_20261108 WHERE started_ms<?').run(now-86400000);}
 function limit(scope,value,n,window){
  const k=digest('reset-rate:'+scope,String(value)),now=clock(),row=rateRead.get(k);
  if(!row||now-row.started_ms>=window){ratePut.run(k,now);return;}
  if(row.count>=n)throw problem('password_otp_rate_limit',429,'Terlalu banyak permintaan. Tunggu sebelum mencoba kembali.',Math.max(1,Math.ceil((window-(now-row.started_ms))/1000)));
  rateInc.run(k);
 }
 function readBrowser(req){const found=String(req.headers?.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));if(found.length!==1)return '';const value=found[0].slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(value)?value:'';}
 const cookie=(value,seconds=1800)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure?'; Secure':''}`;
 function clearCookie(){return cookie('',0);}
 async function issue(req,email,source){
  ensure();cleanup();const normalized=normalizeEmail(email),started=clock();
  const browserToken=readBrowser(req)||randomBytes(32).toString('hex'),browserHash=digest('reset-browser',browserToken);
  const id=randomBytes(32).toString('hex'),idHash=sha(id),code=String(randomInt(0,1000000)).padStart(6,'0');
  const codeHash=digest('reset-code',idHash+'\0'+normalized.key+'\0'+code);
  const row=account.get(normalized.key),eligible=row&&row.email_verified===1&&!row.banned?row:null;
  db.exec('BEGIN IMMEDIATE');
  try{
   limit('global-requests','all',3000,86400000);
   limit('source-hour',source,8,3600000);limit('source-day',source,20,86400000);
   limit('browser-hour',browserHash,8,3600000);
   limit('email-cooldown',normalized.key,1,COOLDOWN);limit('email-hour',normalized.key,3,3600000);
   if(eligible)limit('global-send','all',dayCap,86400000);
   db.prepare('DELETE FROM community_password_reset_20261108 WHERE browser_hash=?').run(browserHash);
   db.prepare('INSERT INTO community_password_reset_20261108 VALUES(?,?,?,?,?,?,0,?,0)').run(idHash,browserHash,eligible?.user_id||null,normalized.key,codeHash,started+TTL,started);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  let delivered=false;
  if(eligible){
   try{
    await mailer.send({email:eligible.email,code,idempotencyKey:'password-reset/'+idHash,purpose:'password-reset'});
    const active=db.prepare('UPDATE community_password_reset_20261108 SET delivered=1 WHERE id_hash=? AND expires_ms>?').run(idHash,clock());
    delivered=active.changes===1;
   }catch(_){db.prepare('DELETE FROM community_password_reset_20261108 WHERE id_hash=?').run(idHash);}
  }
  const minimum=800+randomInt(0,151),elapsed=clock()-started;if(elapsed<minimum)await wait(minimum-elapsed);
  const message='Jika email terhubung ke akun terverifikasi, kode pemulihan telah dikirim. Periksa Inbox dan Spam.';
  return {body:{ok:true,challengeId:id,expiresInSeconds:Math.max(0,Math.floor((started+TTL-clock())/1000)),resendAfterSeconds:60,message},cookie:cookie(browserToken),delivered};
 }
 function check(req,payload,email,source){
  ensure();cleanup();limit('verify-source',source,50,3600000);
  const browserToken=readBrowser(req);
  if(!browserToken||!payload||!/^[a-f0-9]{64}$/.test(payload.otpChallenge||''))throw badCode();
  const normalized=normalizeEmail(email),idHash=sha(payload.otpChallenge),row=get.get(idHash),now=clock();
  const browserHash=digest('reset-browser',browserToken);
  if(!row||!row.user_id||row.browser_hash!==browserHash||row.email_key!==normalized.key||!row.delivered||row.expires_ms<=now||row.attempts>=MAX_ATTEMPTS)throw badCode();
  const supplied=typeof payload.otpCode==='string'&&/^\d{6}$/.test(payload.otpCode)?payload.otpCode:'invalid';
  const attempted=digest('reset-code',idHash+'\0'+normalized.key+'\0'+supplied);
  const matches=timingSafeEqual(Buffer.from(attempted,'hex'),Buffer.from(row.code_hash,'hex'));
  if(!matches){
   db.prepare('UPDATE community_password_reset_20261108 SET attempts=attempts+1 WHERE id_hash=?').run(idHash);
   if(row.attempts+1>=MAX_ATTEMPTS)db.prepare('DELETE FROM community_password_reset_20261108 WHERE id_hash=?').run(idHash);
   throw badCode();
  }
  return {idHash,browserHash,emailKey:normalized.key,codeHash:attempted,userId:row.user_id};
 }
 function consume(ticket){
  if(!db.isTransaction)throw Error('Password reset consume requires a transaction');
  if(!ticket)throw badCode();
  const result=db.prepare(`DELETE FROM community_password_reset_20261108
   WHERE id_hash=? AND browser_hash=? AND email_key=? AND code_hash=? AND user_id=?
   AND expires_ms>? AND attempts<? AND delivered=1`).run(ticket.idHash,ticket.browserHash,ticket.emailKey,ticket.codeHash,ticket.userId,clock(),MAX_ATTEMPTS);
  if(result.changes!==1)throw badCode();
  db.prepare('DELETE FROM community_password_reset_20261108 WHERE user_id=?').run(ticket.userId);
 }
 return {required,info,issue,check,consume,clearCookie};
}
module.exports={createPasswordSecurity,VERSION,TTL,COOLDOWN,MAX_ATTEMPTS};
