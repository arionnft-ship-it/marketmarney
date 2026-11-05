'use strict';
// Google OpenID Connect authorization-code flow for reader accounts only.
// Configuration is server-side; secrets are never sent to the browser.
const crypto=require('node:crypto');
const START='/api/auth/google/start', CALLBACK='/api/auth/google/callback', FINISH='/api/auth/google/finish-link';
const AUTH='https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN='https://oauth2.googleapis.com/token';
const JWKS='https://www.googleapis.com/oauth2/v3/certs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const b64=x=>Buffer.from(x).toString('base64url');
function configGoogle(env,deployment){
 const clientId=String(env.MM_GOOGLE_CLIENT_ID||'').trim();
 const clientSecret=String(env.MM_GOOGLE_CLIENT_SECRET||'').trim();
 const redirectUri=String(env.MM_GOOGLE_REDIRECT_URI||'').trim();
 if(!clientId&&!clientSecret&&!redirectUri)return {enabled:false};
 if(!clientId||!clientSecret||!redirectUri)throw Error('Google Login: set MM_GOOGLE_CLIENT_ID, MM_GOOGLE_CLIENT_SECRET, dan MM_GOOGLE_REDIRECT_URI bersama-sama.');
 let uri;try{uri=new URL(redirectUri)}catch{throw Error('MM_GOOGLE_REDIRECT_URI tidak valid')}
 if(uri.pathname!==CALLBACK||uri.search||uri.hash||uri.username||uri.password)throw Error('MM_GOOGLE_REDIRECT_URI harus URL callback tanpa query/hash');
 if(!clientId.endsWith('.apps.googleusercontent.com')||clientId.length>240||clientSecret.length>512)throw Error('Credential Google OAuth tidak valid');
 if(deployment.production){if(uri.protocol!=='https:'||uri.origin!==deployment.publicOrigin)throw Error('Google OAuth produksi harus menggunakan origin HTTPS yang sama dengan MM_PUBLIC_BASE_URL')}
 else if(uri.protocol!=='http:'||!['localhost','127.0.0.1'].includes(uri.hostname)||uri.port!==String(deployment.port))throw Error('Google OAuth lokal: gunakan http://localhost:'+deployment.port+CALLBACK);
 return {enabled:true,clientId,clientSecret,redirectUri,origin:uri.origin};
}
function verifyGoogleIdToken(idToken, keys, clientId, nonce, now=Date.now(), allowedAzp=[clientId]){
 if(typeof idToken!=='string'||idToken.length>12000)throw Error('ID token Google tidak valid');
 const parts=idToken.split('.');if(parts.length!==3)throw Error('Format ID token Google salah');
 let header,payload;try{header=JSON.parse(Buffer.from(parts[0],'base64url').toString());payload=JSON.parse(Buffer.from(parts[1],'base64url').toString())}catch{throw Error('ID token Google tidak dapat dibaca')}
 if(header.alg!=='RS256'||typeof header.kid!=='string'||!Array.isArray(keys))throw Error('Algoritma ID token Google ditolak');
 const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
 if(!jwk)throw Error('Kunci publik Google tidak ditemukan');
 let signed=false;try{signed=crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'))}catch{};
 if(!signed)throw Error('Tanda tangan Google tidak valid');
 const seconds=Math.floor(now/1000);
 if(!['https://accounts.google.com','accounts.google.com'].includes(payload.iss)||payload.aud!==clientId||(payload.azp&&!allowedAzp.includes(payload.azp))||!Number.isInteger(payload.exp)||payload.exp<=seconds||!Number.isInteger(payload.iat)||payload.iat>seconds+300||payload.iat<seconds-86400)throw Error('Klaim identitas Google tidak valid');
 if(payload.nonce!==nonce||typeof payload.sub!=='string'||!/^[a-zA-Z0-9_-]{8,255}$/.test(payload.sub))throw Error('Identitas/nonce Google tidak cocok');
 if(payload.email_verified!==true&&payload.email_verified!=='true')throw Error('Email Google belum diverifikasi');
 return {sub:payload.sub};
}
function createGoogleAuth1856({db,deployment,community,env=process.env,fetchImpl=fetch}){
 const cfg=configGoogle(env,deployment);
 db.exec(`CREATE TABLE IF NOT EXISTS community_google_pending_1856 (
  state_hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL,
  reader_id TEXT, mode TEXT NOT NULL, expires_ms INTEGER NOT NULL
 );`);
 db.exec('CREATE TABLE IF NOT EXISTS community_google_rates_1856 (source_hash TEXT PRIMARY KEY,started_ms INTEGER NOT NULL,count INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS community_google_link_complete_1857 (token_hash TEXT PRIMARY KEY,reader_id TEXT NOT NULL,google_sub TEXT NOT NULL,expires_ms INTEGER NOT NULL)');
 const toCookie=(state,seconds)=>`mm_google_state=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${seconds}${deployment.cookieSecure?'; Secure':''}`;
 const toFinishCookie=(value,seconds)=>`mm_google_final=${value}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${seconds}${deployment.cookieSecure?'; Secure':''}`;
 const noStore={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 function redirect(res,location,cookie){res.writeHead(303,{...deployment.securityHeaders,...noStore,'Location':location,...(cookie?{'Set-Cookie':cookie}:{})});res.end()}
 function fail(res,reason){redirect(res,'/akun.html?google_error='+encodeURIComponent(reason),toCookie('',0))}
 const readCookie=(req,name='mm_google_state')=>{const part=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));return part?part.slice(name.length+1):''};
 let keysCache=null,keysExpiry=0;
 async function jsonEndpoint(url,opt){const response=await fetchImpl(url,{...opt,signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Google OAuth API menolak permintaan');const str=await response.text();if(str.length>50000)throw Error('Respons Google terlalu besar');return JSON.parse(str)}
 async function googleKeys(){if(keysCache&&keysExpiry>Date.now())return keysCache;const d=await jsonEndpoint(JWKS,{redirect:'error',headers:{Accept:'application/json'}});if(!Array.isArray(d.keys)||d.keys.length>30)throw Error('Kunci publik Google tidak tersedia');keysCache=d.keys;keysExpiry=Date.now()+10*60*1000;return keysCache}
 async function handle(req,res,p,u){
  if(p!=='/api/auth/google/config'&&p!==START&&p!==CALLBACK&&p!==FINISH)return false;
  if(p==='/api/auth/google/config'){
   res.writeHead(200,{...deployment.securityHeaders,...noStore,'Content-Type':'application/json; charset=utf-8'});
   const reader=community.currentReader(req);
   const linked=!!reader&&!!db.prepare('SELECT 1 FROM community_google_identities_1856 WHERE user_id=?').get(reader.id);
   res.end(JSON.stringify({enabled:cfg.enabled,registrationEnabled:community.registrationEnabled(),googleSignupEnabled:community.registrationEnabled()||env.MM_GOOGLE_AUTO_REGISTER==='1',linked}));return true;
  }
  if(p===FINISH){
   const write=(status,body,cookie)=>{res.writeHead(status,{...deployment.securityHeaders,...noStore,'Content-Type':'application/json; charset=utf-8',...(cookie?{'Set-Cookie':cookie}:{})});res.end(JSON.stringify(body));return true};
   if(req.method!=='POST'||req.headers['x-marketmarney-request']!=='1'||!deployment.sameOrigin(req))return write(403,{error:'Permintaan tidak diizinkan.'});
   const token=readCookie(req,'mm_google_final');
   if(!/^[a-f0-9]{64}$/.test(token))return write(400,{error:'Konfirmasi Google kedaluwarsa.'},toFinishCookie('',0));
   const row=db.prepare('SELECT * FROM community_google_link_complete_1857 WHERE token_hash=?').get(hash(token));
   // Single use, including on failure: a link cannot be replayed by a stale browser.
   db.prepare('DELETE FROM community_google_link_complete_1857 WHERE token_hash=?').run(hash(token));
   if(!row||row.expires_ms<Date.now())return write(400,{error:'Konfirmasi Google kedaluwarsa.'},toFinishCookie('',0));
   const reader=community.currentReader(req);
   if(!reader||reader.id!==row.reader_id)return write(401,{error:'Sesi akun berubah. Masuk kembali dan ulangi penghubungan Google.'},toFinishCookie('',0));
   try{const auth=community.googleIdentity(req,row.google_sub,'link',row.reader_id);
    return write(200,{ok:true,linked:true},[auth.cookie,toFinishCookie('',0)]);
   }catch(e){return write(400,{error:'Tidak dapat menghubungkan akun Google.'},toFinishCookie('',0))}
  }
  if(req.method!=='GET'){fail(res,'request');return true}
  if(!cfg.enabled){fail(res,'disabled');return true}
  if(p===START){
   // Prevent state cookies being bound to a different local origin (localhost vs 127.0.0.1).
   if(!deployment.production&&String(req.headers.host||'')!==new URL(cfg.redirectUri).host){
    const mode=u.searchParams.get('mode')==='link'?'link':'login';redirect(res,cfg.origin+START+'?mode='+mode);return true;
   }
   if(deployment.production&&cfg.origin!==deployment.publicOrigin){fail(res,'origin');return true}
   const mode=u.searchParams.get('mode')==='link'?'link':'login';
   const reader=mode==='link'?community.currentReader(req):null;
   if(mode==='link'&&!reader){fail(res,'login_required');return true}
   const now=Date.now(),sourceHash=hash(deployment.clientSource(req)).slice(0,40);
   const bucket=db.prepare('SELECT started_ms,count FROM community_google_rates_1856 WHERE source_hash=?').get(sourceHash);
   if(bucket&&now-bucket.started_ms<900000&&bucket.count>=20){fail(res,'rate');return true}
   db.prepare('INSERT INTO community_google_rates_1856(source_hash,started_ms,count) VALUES(?,?,?) ON CONFLICT(source_hash) DO UPDATE SET started_ms=excluded.started_ms,count=excluded.count').run(sourceHash,bucket&&now-bucket.started_ms<900000?bucket.started_ms:now,bucket&&now-bucket.started_ms<900000?bucket.count+1:1);
   db.prepare('DELETE FROM community_google_pending_1856 WHERE expires_ms<?').run(Date.now());
   const state=crypto.randomBytes(32).toString('hex'),nonce=b64(crypto.randomBytes(24)),verifier=b64(crypto.randomBytes(32));
   db.prepare('INSERT INTO community_google_pending_1856 VALUES(?,?,?,?,?,?)').run(hash(state),nonce,verifier,reader?.id||null,mode,Date.now()+10*60*1000);
   const params=new URLSearchParams({client_id:cfg.clientId,redirect_uri:cfg.redirectUri,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:b64(crypto.createHash('sha256').update(verifier).digest()),code_challenge_method:'S256',prompt:'select_account'});
   redirect(res,AUTH+'?'+params.toString(),toCookie(state,600));return true;
  }
  if(p===CALLBACK){
   const state=u.searchParams.get('state')||'',cookie=readCookie(req),code=u.searchParams.get('code')||'';
   if(!/^[a-f0-9]{64}$/.test(state)||!/^([a-f0-9]{64})$/.test(cookie)||state!==cookie){fail(res,'state');return true}
   const row=db.prepare('SELECT * FROM community_google_pending_1856 WHERE state_hash=?').get(hash(state));
   // Single-use state, also on a failed callback. No replay after token exchange.
   db.prepare('DELETE FROM community_google_pending_1856 WHERE state_hash=?').run(hash(state));
   if(!row||row.expires_ms<Date.now()||code.length<8||code.length>4000){fail(res,'expired');return true}
   try{
    const tokens=await jsonEndpoint(TOKEN,{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({code,client_id:cfg.clientId,client_secret:cfg.clientSecret,redirect_uri:cfg.redirectUri,grant_type:'authorization_code',code_verifier:row.verifier})});
    const identity=verifyGoogleIdToken(tokens.id_token,await googleKeys(),cfg.clientId,row.nonce);
    if(row.mode==='link'){
     // Cross-site Google redirects do not send the Strict reader cookie. Confirm the
     // existing signed-in reader via a same-origin POST after the browser returns.
     if(!row.reader_id)throw Error('login_required');
     db.prepare('DELETE FROM community_google_link_complete_1857 WHERE expires_ms<?').run(Date.now());
     const finishToken=crypto.randomBytes(32).toString('hex');
     db.prepare('INSERT INTO community_google_link_complete_1857 VALUES(?,?,?,?)').run(hash(finishToken),row.reader_id,identity.sub,Date.now()+5*60*1000);
     res.writeHead(303,{...deployment.securityHeaders,...noStore,Location:'/akun.html?pengaturan=1&google=confirm','Set-Cookie':[toCookie('',0),toFinishCookie(finishToken,300)]});res.end();
    }else{
     const auth=community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1');
     res.writeHead(303,{...deployment.securityHeaders,...noStore,Location:'/beranda-trader.html','Set-Cookie':[auth.cookie,toCookie('',0)]});res.end();
    }
   }catch(e){const allowed=new Set(['registrasi','linked_elsewhere','login_required','banned','account_missing']);
    fail(res,allowed.has(e.message)?e.message:'failed');
   }
   return true;
  }
  return false;
 }
 return {handle,enabled:cfg.enabled};
}
module.exports={createGoogleAuth1856,verifyGoogleIdToken,configGoogle};