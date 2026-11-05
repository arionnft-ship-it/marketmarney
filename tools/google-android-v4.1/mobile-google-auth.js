'use strict';
// MarketMarney Android — native Credential Manager ID-token exchange.
// Never stores or logs Google ID tokens. Reuses Social Marney accounts and cookies.
const crypto = require('node:crypto');
const {verifyGoogleIdToken} = require('./google-auth1856.js');
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const noStore = {'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};

function createMobileGoogleAuth({db, deployment, community, env=process.env, fetchImpl=fetch, clock=Date.now}) {
  const clientId=String(env.MM_GOOGLE_CLIENT_ID||'').trim();
  // Bind authorized parties to registered Android OAuth clients only.
  // An attacker cannot add client IDs through the request body.
  const rawAndroidIds=String(env.MM_ANDROID_GOOGLE_CLIENT_IDS||'').split(/[;,\s]+/).filter(Boolean);
  const androidClientsValid=rawAndroidIds.length<=8 && rawAndroidIds.every(id=>/^[a-zA-Z0-9_-]{8,230}\.apps\.googleusercontent\.com$/.test(id));
  const authorizedParties=[clientId,...(androidClientsValid?rawAndroidIds:[])];
  const enabled=clientId.endsWith('.apps.googleusercontent.com') && !!env.MM_GOOGLE_REDIRECT_URI && !!env.MM_GOOGLE_CLIENT_SECRET && androidClientsValid;
  db.exec(`CREATE TABLE IF NOT EXISTS mobile_google_nonce_v4 (
    nonce_hash TEXT PRIMARY KEY, expires_ms INTEGER NOT NULL, issued_ms INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mobile_google_rate_v4 (
    source_hash TEXT PRIMARY KEY, window_ms INTEGER NOT NULL, attempts INTEGER NOT NULL
  );`);
  let cachedKeys=null,keysUntil=0;
  const json=(res,status,body,extra={})=>{res.writeHead(status,{...deployment.securityHeaders,...noStore,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(body));return true;};
  const limit=(req,max=15)=>{const now=clock(),key=sha(String(deployment.clientSource(req))).slice(0,40),row=db.prepare('SELECT window_ms,attempts FROM mobile_google_rate_v4 WHERE source_hash=?').get(key);const within=row&&now-row.window_ms<900000;const attempts=within?row.attempts+1:1;if(attempts>max)return false;db.prepare('INSERT INTO mobile_google_rate_v4 VALUES(?,?,?) ON CONFLICT(source_hash) DO UPDATE SET window_ms=excluded.window_ms, attempts=excluded.attempts').run(key,within?row.window_ms:now,attempts);return true;};
  async function parseJson(req){
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw Object.assign(Error('Konten harus JSON'),{status:415});
    let size=0;const parts=[];for await(const b of req){size+=b.length;if(size>16000)throw Object.assign(Error('Permintaan terlalu besar'),{status:413});parts.push(b)}
    let obj;try{obj=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw Object.assign(Error('JSON tidak valid'),{status:400})}
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Object.assign(Error('Objek JSON diperlukan'),{status:400});return obj;
  }
  async function getKeys(){const now=clock();if(cachedKeys&&keysUntil>now)return cachedKeys;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetchImpl(JWKS_URL,{redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error('Kunci Google tidak tersedia');const raw=await response.text();if(raw.length>50000)throw Error('Kunci Google terlalu besar');const v=JSON.parse(raw);if(!Array.isArray(v.keys)||v.keys.length<1||v.keys.length>30)throw Error('Kunci Google tidak valid');cachedKeys=v.keys;keysUntil=now+10*60000;return cachedKeys;}finally{clearTimeout(timer)}}
  async function handle(req,res,p){
    if(!['/api/auth/android/config','/api/auth/android/challenge','/api/auth/android/google'].includes(p))return false;
    if(p==='/api/auth/android/config'){
      if(req.method!=='GET')return json(res,405,{error:'Metode ditolak'});
      return json(res,200,{enabled,webClientId:enabled?clientId:null,registrationEnabled:community.registrationEnabled(),accountMode:'social-marney',androidOAuthClientsConfigured:rawAndroidIds.length>0 && androidClientsValid});
    }
    if(req.method!=='POST')return json(res,405,{error:'Metode ditolak'});
    // A browser cannot use cross-origin credentialed requests; native requests have no Origin.
    const origin=String(req.headers.origin||'');
    if(origin&&origin!==deployment.publicOrigin)return json(res,403,{error:'Origin ditolak'});
    if(!enabled)return json(res,503,{error:'Google Login Android belum diaktifkan'});
    if(!limit(req,25))return json(res,429,{error:'Terlalu banyak permintaan login'});
    if(p==='/api/auth/android/challenge'){
      try{await parseJson(req)}catch(e){return json(res,e.status||400,{error:e.message})}
      const nonce=crypto.randomBytes(32).toString('base64url');const issued=clock();
      db.prepare('DELETE FROM mobile_google_nonce_v4 WHERE expires_ms<?').run(issued);
      db.prepare('INSERT INTO mobile_google_nonce_v4 VALUES(?,?,?)').run(sha(nonce),issued+5*60000,issued);
      return json(res,200,{nonce,expiresInSeconds:300});
    }
    try{
      const b=await parseJson(req),nonce=b.nonce,idToken=b.idToken;
      if(typeof nonce!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(nonce)||typeof idToken!=='string'||idToken.length>12000||idToken.length<80)return json(res,400,{error:'Kredensial Google tidak valid'});
      const row=db.prepare('SELECT expires_ms FROM mobile_google_nonce_v4 WHERE nonce_hash=?').get(sha(nonce));
      // Delete on first use, even if verification fails, so tokens cannot be replayed.
      db.prepare('DELETE FROM mobile_google_nonce_v4 WHERE nonce_hash=?').run(sha(nonce));
      if(!row||row.expires_ms<=clock())return json(res,400,{error:'Sesi login kedaluwarsa, silakan ulangi'});
      const identity=verifyGoogleIdToken(idToken,await getKeys(),clientId,nonce,clock(),authorizedParties);
      const auth=community.googleIdentity(req,identity.sub,'login',null,env.MM_GOOGLE_AUTO_REGISTER==='1');
      return json(res,200,{ok:true,user:auth.user},{'Set-Cookie':auth.cookie});
    }catch(e){
      const known=new Set(['registrasi','linked_elsewhere','banned','account_missing','login_required']);
      const message=known.has(e.message)?e.message:'Login Google belum berhasil, silakan coba lagi';
      return json(res,known.has(e.message)?403:401,{error:message});
    }
  }
  return {handle};
}
module.exports={createMobileGoogleAuth};