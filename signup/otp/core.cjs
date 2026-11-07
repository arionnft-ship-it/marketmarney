'use strict';
const {randomBytes,randomInt,createHmac,createHash,timingSafeEqual}=require('node:crypto');
const {createMailer}=require('./mailer.cjs');
const TTL=5*60*1000,COOLDOWN=60000,MAX_ATTEMPTS=5,VERSION='signup-email-otp-20261108-r1';
function problem(code,status,message,retryAfter=0){return Object.assign(new Error(message),{code,status,retryAfter});}
const badCode=()=>problem('otp_invalid',400,'Kode salah, kedaluwarsa, atau sudah digunakan. Periksa kode terbaru atau kirim ulang.');
const sha=x=>createHash('sha256').update(x).digest('hex');
function createEmailOtp({db,normalizeEmail,env=process.env,clock=Date.now,secure=true,mailer=createMailer(env)}={}){
 const required=env.MM_SIGNUP_EMAIL_OTP==='required';
 const key=/^[a-f0-9]{64}$/i.test(env.MM_OTP_SECRET||'')?Buffer.from(env.MM_OTP_SECRET,'hex'):null;
 const ready=required&&!!key&&mailer.ready===true;
 const cookieName=secure?'__Host-mm_signup_otp':'mm_signup_otp';
 const digest=(scope,value)=>createHmac('sha256',key).update(scope+'\0'+value).digest('hex');
 const dayCap=/^\d+$/.test(env.MM_OTP_DAILY_LIMIT||'')?Math.max(1,Math.min(10000,Number(env.MM_OTP_DAILY_LIMIT))):100;
 function info(){return {required,available:ready,digits:6,expiresInSeconds:TTL/1000,resendAfterSeconds:60};}
 const unavailable=()=>problem('otp_unavailable',503,'Verifikasi email belum tersedia. Silakan coba lagi nanti.');
 function ensure(){if(!ready)throw unavailable();}
 if(!required)return {required,info,issue:async()=>{throw unavailable();},check:()=>null,consume:()=>{},clearCookie:()=>null};
 if(typeof normalizeEmail!=='function')throw Error('Email normalizer is required');
 db.exec(`CREATE TABLE IF NOT EXISTS community_email_otp_20261108(
  id_hash TEXT PRIMARY KEY,browser_hash TEXT NOT NULL,email_key TEXT NOT NULL,code_hash TEXT NOT NULL,
  expires_ms INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_ms INTEGER NOT NULL,delivered INTEGER NOT NULL DEFAULT 0
 );
 CREATE INDEX IF NOT EXISTS community_email_otp_expiry_20261108 ON community_email_otp_20261108(expires_ms);
 CREATE INDEX IF NOT EXISTS community_email_otp_browser_20261108 ON community_email_otp_20261108(browser_hash);
 CREATE TABLE IF NOT EXISTS community_email_otp_rates_20261108(
  key TEXT PRIMARY KEY,started_ms INTEGER NOT NULL,count INTEGER NOT NULL
 );`);
 const get=db.prepare('SELECT * FROM community_email_otp_20261108 WHERE id_hash=?');
 const rateRead=db.prepare('SELECT started_ms,count FROM community_email_otp_rates_20261108 WHERE key=?');
 const ratePut=db.prepare('INSERT INTO community_email_otp_rates_20261108 VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET started_ms=excluded.started_ms,count=1');
 const rateInc=db.prepare('UPDATE community_email_otp_rates_20261108 SET count=count+1 WHERE key=?');
 let lastClean=-Infinity;
 function cleanup(){const now=clock();if(now-lastClean<60000)return;lastClean=now;db.prepare('DELETE FROM community_email_otp_20261108 WHERE expires_ms<=?').run(now);db.prepare('DELETE FROM community_email_otp_rates_20261108 WHERE started_ms<?').run(now-86400000);}
 function limit(scope,value,n,window){
  const k=digest('rate:'+scope,String(value)),now=clock(),r=rateRead.get(k);
  if(!r||now-r.started_ms>=window){ratePut.run(k,now);return;}
  if(r.count>=n)throw problem('otp_rate_limit',429,'Terlalu banyak permintaan. Tunggu sebelum mencoba kembali.',Math.max(1,Math.ceil((window-(now-r.started_ms))/1000)));
  rateInc.run(k);
 }
 function readBrowser(req){const entries=String(req.headers?.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));if(entries.length!==1)return '';const value=entries[0].slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(value)?value:'';}
 const cookie=(value,seconds=1800)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure?'; Secure':''}`;
 function clearCookie(){return cookie('',0);}
 async function issue(req,email,source){
  ensure();cleanup();const normalized=normalizeEmail(email),now=clock();
  const token=readBrowser(req)||randomBytes(32).toString('hex'),browser=digest('browser',token);
  const id=randomBytes(32).toString('hex'),idHash=sha(id),code=String(randomInt(0,1000000)).padStart(6,'0');
  const codeHash=digest('code',idHash+'\0'+normalized.key+'\0'+code);
  db.exec('BEGIN IMMEDIATE');
  try{
   limit('global-requests','all',3000,86400000);
   limit('source-hour',source,10,3600000);limit('source-day',source,30,86400000);
   limit('browser-hour',browser,10,3600000);
   limit('email-cooldown',normalized.key,1,COOLDOWN);limit('email-hour',normalized.key,3,3600000);
   limit('global-send','all',dayCap,86400000);
   db.prepare('DELETE FROM community_email_otp_20261108 WHERE browser_hash=?').run(browser);
   db.prepare('INSERT INTO community_email_otp_20261108 VALUES(?,?,?,?,?,0,?,0)').run(idHash,browser,normalized.key,codeHash,now+TTL,now);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  try{
   await mailer.send({email:normalized.email,code,idempotencyKey:'signup/'+idHash});
   const active=db.prepare('UPDATE community_email_otp_20261108 SET delivered=1 WHERE id_hash=? AND expires_ms>?').run(idHash,clock());
   if(active.changes!==1)throw Error('superseded');
  }catch(_){db.prepare('DELETE FROM community_email_otp_20261108 WHERE id_hash=?').run(idHash);throw problem('otp_delivery_failed',503,'Kode belum dapat dikirim. Tunggu satu menit, lalu coba lagi.');}
  return {body:{ok:true,challengeId:id,expiresInSeconds:Math.max(0,Math.floor((now+TTL-clock())/1000)),resendAfterSeconds:60},cookie:cookie(token)};
 }
 function check(req,b,email,source){
  ensure();cleanup();
  // This limiter is outside the user-creation transaction: bad attempts stay counted.
  limit('verify-source',source,60,3600000);
  const browserToken=readBrowser(req);
  if(!browserToken||!b||!/^([a-f0-9]{64})$/.test(b.otpChallenge||''))throw badCode();
  const normalized=normalizeEmail(email),idHash=sha(b.otpChallenge),row=get.get(idHash),now=clock();
  const browser=digest('browser',browserToken);
  if(!row||row.browser_hash!==browser||row.email_key!==normalized.key||!row.delivered||row.expires_ms<=now||row.attempts>=MAX_ATTEMPTS)throw badCode();
  const supplied=typeof b.otpCode==='string'&&/^\d{6}$/.test(b.otpCode)?b.otpCode:'invalid';
  const attempted=digest('code',idHash+'\0'+normalized.key+'\0'+supplied);
  const matches=timingSafeEqual(Buffer.from(attempted,'hex'),Buffer.from(row.code_hash,'hex'));
  if(!matches){
   db.prepare('UPDATE community_email_otp_20261108 SET attempts=attempts+1 WHERE id_hash=?').run(idHash);
   if(row.attempts+1>=MAX_ATTEMPTS)db.prepare('DELETE FROM community_email_otp_20261108 WHERE id_hash=?').run(idHash);
   throw badCode();
  }
  return {idHash,browserHash:browser,emailKey:normalized.key,codeHash:attempted};
 }
 function consume(ticket){
  // Must be called inside the same BEGIN IMMEDIATE/COMMIT that creates the account.
  if(!db.isTransaction)throw Error('OTP consume requires an account transaction');
  if(!ticket)throw badCode();
  const r=db.prepare('DELETE FROM community_email_otp_20261108 WHERE id_hash=? AND browser_hash=? AND email_key=? AND code_hash=? AND expires_ms>? AND attempts<? AND delivered=1').run(ticket.idHash,ticket.browserHash,ticket.emailKey,ticket.codeHash,clock(),MAX_ATTEMPTS);
  if(r.changes!==1)throw badCode();
 }
 return {required,info,issue,check,consume,clearCookie};
}
module.exports={createEmailOtp,VERSION,TTL,COOLDOWN,MAX_ATTEMPTS};
