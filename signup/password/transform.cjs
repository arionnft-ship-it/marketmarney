'use strict';
const path=require('node:path');
function once(source,old,next,label){if(source.split(old).length!==2)throw Error('Password security compatibility anchor changed: '+label);return source.replace(old,next);}
const PUBLIC_ROUTES=`    if(p==='/api/community/password/forgot/otp'){
     try{
      const b=await parse(req),sent=await passwordSecurity.issue(req,b.email,source(req));
      write(res,200,sent.body,{'Set-Cookie':sent.cookie});return true;
     }catch(e){write(res,e.status||503,{error:e.status?e.message:'Pemulihan password belum tersedia.',code:e.code||'password_otp_unavailable'},e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});return true;}
    }
    if(p==='/api/community/password/forgot/complete'){
     const b=await parse(req);
     if(typeof b.newPassword!=='string'||b.newPassword.length<12||b.newPassword.length>128)return bad(res,400,'Password baru harus 12–128 karakter.');
     let ticket;
     try{ticket=passwordSecurity.check(req,b,b.email,source(req));}
     catch(e){write(res,e.status||400,{error:e.message||'Kode pemulihan tidak valid.',code:e.code||'password_otp_invalid'},e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});return true;}
     const row=db.prepare('SELECT username,salt,password_hash,banned FROM community_users_181 WHERE id=?').get(ticket.userId);
     if(!row||row.banned)return bad(res,400,'Kode salah, kedaluwarsa, atau sudah digunakan. Gunakan kode terbaru atau kirim ulang.');
     const candidate=slowPassword(b.newPassword,row.salt);
     if(timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(row.password_hash,'hex')))return bad(res,400,'Password baru harus berbeda dari password sebelumnya.');
     const salt=randomBytes(16).toString('hex'),hash=slowPassword(b.newPassword,salt);
     db.exec('BEGIN IMMEDIATE');
     try{
      passwordSecurity.consume(ticket);
      db.prepare('UPDATE community_users_181 SET salt=?,password_hash=? WHERE id=?').run(salt,hash,ticket.userId);
      db.prepare('DELETE FROM community_sessions_181 WHERE user_id=?').run(ticket.userId);
      record('password-reset',ticket.userId);db.exec('COMMIT');
     }catch(e){db.exec('ROLLBACK');return bad(res,400,'Kode salah, kedaluwarsa, atau sudah digunakan. Gunakan kode terbaru atau kirim ulang.');}
     write(res,200,{ok:true,loginAgain:true,message:'Password berhasil diganti. Silakan masuk menggunakan password baru.'},{'Set-Cookie':[passwordSecurity.clearCookie(),setCookie(req,'',0)]});return true;
    }
`;
function community(source,signupHelper){
 const helper=path.join(path.dirname(signupHelper),'password','core.cjs');
 let s=once(source," const VERSION='18.2.0';",' const passwordSecurity=require('+JSON.stringify(helper)+').createPasswordSecurity({db,normalizeEmail:require('+JSON.stringify(signupHelper)+').emailAddress,secure:deployment.cookieSecure});\n const VERSION=\'18.2.0\';','password helper');
 s=once(s,"    if(p==='/api/community/login'){",PUBLIC_ROUTES+"    if(p==='/api/community/login'){",'public password routes');
 s=once(s,'emailOtp:emailOtp.info(),categories:categories()','emailOtp:emailOtp.info(),passwordRecovery:passwordSecurity.info(),categories:categories()','public password policy');
 const old="if(!timingSafeEqual(Buffer.from(existing,'hex'),Buffer.from(row.password_hash,'hex')))return bad(res,403,'Password lama salah');const salt=randomBytes(16).toString('hex');";
 const next="if(!timingSafeEqual(Buffer.from(existing,'hex'),Buffer.from(row.password_hash,'hex')))return bad(res,403,'Password lama salah');if(b.oldPassword===b.newPassword)return bad(res,400,'Password baru harus berbeda dari password lama');const salt=randomBytes(16).toString('hex');";
 s=once(s,old,next,'change password validation');
 return s;
}
module.exports={community,once,PUBLIC_ROUTES};
