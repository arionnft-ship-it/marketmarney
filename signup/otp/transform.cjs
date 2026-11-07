'use strict';
const path=require('node:path');
function once(s,a,b){if(s.split(a).length!==2)throw Error('OTP compatibility anchor changed: '+a.slice(0,70));return s.replace(a,b);}
const registerRoute=`    if(p==='/api/community/register/otp'){
     if(!config().registrationEnabled)return bad(res,403,'Registrasi belum dibuka oleh admin');
     try{
      const b=await parse(req),sent=await emailOtp.issue(req,b.email,source(req));
      write(res,200,sent.body,{'Set-Cookie':sent.cookie});return true;
     }catch(e){write(res,e.status||503,{error:e.status?e.message:'Verifikasi email belum tersedia.',code:e.code||'otp_unavailable'},e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});return true;}
    }
    if(p==='/api/community/register'){
     if(!config().registrationEnabled)return bad(res,403,'Registrasi belum dibuka oleh admin');
     if(!bucket('register',source(req),emailOtp.required?30:3,3600000))return bad(res,429,'Terlalu banyak registrasi; coba lagi nanti');
     const b=await parse(req),username=typeof b.username==='string'?b.username.toLowerCase():'',password=b.password;
     if(!safeUsername(username)||new Set(['admin','administrator','moderator','support','marketmarney','official']).has(username)||typeof password!=='string'||password.length<12||password.length>128)return bad(res,400,'Username 3–24 karakter (huruf/angka/_) dan password 12–128 karakter diperlukan');
     let profile,ticket;
     try{
      profile=signup.validate(b.displayName,b.email);
      if(emailOtp.required)ticket=emailOtp.check(req,b,profile.email,source(req));
      signup.available(profile);
     }catch(e){write(res,e.code==='email_used'?409:(e.status||400),{error:e.status?e.message:'Pendaftaran belum berhasil.',code:e.code||'registration_invalid'},e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});return true;}
     if(db.prepare('SELECT 1 FROM community_users_181 WHERE username=?').get(username))return bad(res,409,'Email atau username tidak tersedia.');
     const id=randomUUID(),salt=randomBytes(16).toString('hex'),hash=slowPassword(password,salt),token=randomBytes(32).toString('hex');
     db.exec('BEGIN IMMEDIATE');
     try{
      signup.available(profile);
      if(emailOtp.required)emailOtp.consume(ticket);
      db.prepare('INSERT INTO community_users_181 VALUES(?,?,?,?,?,0)').run(id,username,salt,hash,Date.now());
      signup.save(id,profile,emailOtp.required,'password');displayNames.set(id,profile.name);
      db.prepare('INSERT INTO community_sessions_181 VALUES(?,?,?,?)').run(sha(token),id,Date.now()+7*86400000,Date.now());
      record('reader-registered',id);db.exec('COMMIT');
     }catch(e){db.exec('ROLLBACK');return bad(res,e.code==='email_used'?409:400,e.code==='email_used'?'Email atau username tidak tersedia.':'Pendaftaran belum berhasil. Periksa data dan kode terbaru.');}
     const cookies=[setCookie(req,token,7*86400)];if(emailOtp.required)cookies.push(emailOtp.clearCookie());
     write(res,200,{ok:true,user:{id,username}},{'Set-Cookie':cookies});return true;
    }
`;
function community(s,signupHelper){
 const helper=path.join(path.dirname(signupHelper),'otp','core.cjs');
 s=once(s," const VERSION='18.2.0';",' const emailOtp=require('+JSON.stringify(helper)+').createEmailOtp({db,normalizeEmail:require('+JSON.stringify(signupHelper)+').emailAddress,secure:deployment.cookieSecure});\n const VERSION=\'18.2.0\';');
 s=once(s,'const signupProfile=signup.googleProfile(registrationProfile);',"if(emailOtp.required)throw Error('email_otp_required');\n     const signupProfile=signup.googleProfile(registrationProfile);");
 const start=s.indexOf("    if(p==='/api/community/register'){"),end=s.indexOf("    if(p==='/api/community/login'){",start);
 if(start<0||end<=start)throw Error('OTP registration bounds changed');
 s=s.slice(0,start)+registerRoute+s.slice(end);
 s=once(s,"emailVerification:'not-sent-for-manual-signup'","emailVerification:emailOtp.required?'otp-required':'not-sent-for-manual-signup',emailOtp:emailOtp.info()");
 return s;
}
function oauth(s){return once(s,"'profile_required','email_used']","'profile_required','email_used','email_otp_required']");}
module.exports={community,oauth,once,registerRoute};
