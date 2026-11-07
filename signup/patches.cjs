"use strict";
const path=require('node:path');
function once(source,old,next,label){
 if(source.split(old).length!==2)throw Error('Registration source mismatch: '+label);
 return source.replace(old,next);
}
function community(source,helper=path.join(__dirname,'requirements.cjs')){
 let s=once(source," const VERSION='18.2.0';"," const signup=require("+JSON.stringify(helper)+").createSignup({db,displayNames});\n const VERSION='18.2.0';",'community version');
 s=once(s,"function googleIdentity(req,googleSub,mode,readerId,allowSignup=false){","function googleIdentity(req,googleSub,mode,readerId,allowSignup=false,registrationProfile=null){",'Google signature');
 s=once(s,"if(!allowSignup&&!config().registrationEnabled)throw Error('registrasi');", "if(!allowSignup&&!config().registrationEnabled)throw Error('registrasi');\n     const signupProfile=signup.googleProfile(registrationProfile);",'new Google account validation');
 s=once(s,"db.prepare('INSERT INTO community_google_identities_1856 VALUES(?,?,?)').run(googleSub,id,Date.now());", "db.prepare('INSERT INTO community_google_identities_1856 VALUES(?,?,?)').run(googleSub,id,Date.now());\n     signup.save(id,signupProfile,true,'google');",'Google private profile');
 const begin=s.indexOf("    if(p==='/api/community/register'){");const finish=s.indexOf("    if(p==='/api/community/login'){",begin);
 if(begin<0||finish<=begin)throw Error('Registration route bounds changed');
 const replacement=`    if(p==='/api/community/register'){
     if(!config().registrationEnabled)return bad(res,403,'Registrasi belum dibuka oleh admin');
     if(!bucket('register',source(req),3,3600000))return bad(res,429,'Terlalu banyak registrasi; coba lagi nanti');
     const b=await parse(req),username=typeof b.username==='string'?b.username.toLowerCase():'',password=b.password;
     if(!safeUsername(username)||new Set(['admin','administrator','moderator','support','marketmarney','official']).has(username)||typeof password!=='string'||password.length<12||password.length>128)return bad(res,400,'Username 3–24 karakter (huruf/angka/_) dan password 12–128 karakter diperlukan');
     let profile;try{profile=signup.validate(b.displayName,b.email);signup.available(profile);}catch(e){return bad(res,e.code==='email_used'?409:400,e.message);}
     if(db.prepare('SELECT 1 FROM community_users_181 WHERE username=?').get(username))return bad(res,409,'Email atau username tidak tersedia.');
     const id=randomUUID(),salt=randomBytes(16).toString('hex'),hash=slowPassword(password,salt),token=randomBytes(32).toString('hex');
     db.exec('BEGIN IMMEDIATE');
     try{
      signup.available(profile);
      db.prepare('INSERT INTO community_users_181 VALUES(?,?,?,?,?,0)').run(id,username,salt,hash,Date.now());
      signup.save(id,profile,false,'password');displayNames.set(id,profile.name);
      db.prepare('INSERT INTO community_sessions_181 VALUES(?,?,?,?)').run(sha(token),id,Date.now()+7*86400000,Date.now());
      record('reader-registered',id);db.exec('COMMIT');
     }catch(e){db.exec('ROLLBACK');return bad(res,e.code==='email_used'?409:500,e.code==='email_used'?'Email atau username tidak tersedia.':'Pendaftaran belum berhasil. Silakan coba lagi.');}
     write(res,200,{ok:true,user:{id,username}},{'Set-Cookie':setCookie(req,token,7*86400)});return true;
    }
`;
 s=s.slice(0,begin)+replacement+s.slice(finish);
 // A non-sensitive feature declaration lets old clients explain why registration fails.
 s=once(s,"registrationEnabled:config().registrationEnabled,categories:categories()", "registrationEnabled:config().registrationEnabled,registrationFields:['displayName','email','username','password'],emailVerification:'not-sent-for-manual-signup',categories:categories()",'public status');
 return s;
}
function google(source){
 let s=once(source,'return {sub:payload.sub};',"return {sub:payload.sub,email:payload.email,name:payload.name,emailVerified:payload.email_verified===true||payload.email_verified==='true'};",'verified Google claims');
 s=once(s,"community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1')", "community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1',identity)",'Google callback');
 s=once(s,"new Set(['registrasi','linked_elsewhere','login_required','banned','account_missing'])", "new Set(['registrasi','linked_elsewhere','login_required','banned','account_missing','profile_required','email_used'])",'Google failure allowlist');
 return s;
}
function android(source){
 const old="community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1')";
 let s=once(source,old,"community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1',identity)",'Android verified claims');
 s=once(s,"new Set(['registrasi','linked_elsewhere','banned','account_missing','login_required'])","new Set(['registrasi','linked_elsewhere','banned','account_missing','login_required','profile_required','email_used'])",'Android profile errors');
 return s;
}
module.exports={community,google,android,once};
