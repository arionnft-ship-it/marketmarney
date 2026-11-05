'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {Readable}=require('node:stream');
const {createMobileGoogleAuth}=require('./mobile-google-auth.js');
const db=new DatabaseSync(':memory:');
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});jwk.kid='mobile-test-kid';jwk.use='sig';
const CLIENT='000000000000-androidtest.apps.googleusercontent.com';
const ANDROID_CLIENT='000000000000-androidregistered.apps.googleusercontent.com';
let now=Date.now(),signupCalls=0,verifiedCalls=0;
const deployment={cookieSecure:true,publicOrigin:'https://marketmarney.com',securityHeaders:{},clientSource:()=> '127.0.0.1'};
const community={registrationEnabled:()=>true,googleIdentity(req,sub,mode,readerId,auto){assert.equal(mode,'login');assert.equal(sub,'google-account-123456789');signupCalls++;return {user:{id:'new-user-id',username:'trader1'},cookie:'mm_reader='+ 'a'.repeat(64)+'; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=604800'}}};
const auth=createMobileGoogleAuth({db,deployment,community,env:{MM_GOOGLE_CLIENT_ID:CLIENT,MM_GOOGLE_REDIRECT_URI:'https://marketmarney.com/api/auth/google/callback',MM_GOOGLE_CLIENT_SECRET:'private-only-test',MM_GOOGLE_AUTO_REGISTER:'1',MM_ANDROID_GOOGLE_CLIENT_IDS:ANDROID_CLIENT},fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({keys:[jwk]})}),clock:()=>now});
function signed(nonce,client=CLIENT,azp){const head={alg:'RS256',kid:jwk.kid};const payload={iss:'https://accounts.google.com',aud:client,nonce,sub:'google-account-123456789',email_verified:true,...(azp?{azp}:{}),exp:Math.floor(now/1000)+1200,iat:Math.floor(now/1000)};let parts=[head,payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url'));const input=parts.join('.');return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url')}
async function send(path,method='POST',body={}){const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={'content-type':'application/json'};const res={writeHead(code,headers){this.status=code;this.headers=headers},end(data){this.payload=JSON.parse(data)}};await auth.handle(req,res,path,new URL('http://localhost'+path));verifiedCalls++;return res;}
(async()=>{
 const cfg=await send('/api/auth/android/config','GET',{});assert.equal(cfg.status,200);assert.equal(cfg.payload.webClientId,CLIENT);
 const ch=await send('/api/auth/android/challenge');assert.equal(ch.status,200);assert.match(ch.payload.nonce,/^[a-zA-Z0-9_-]{43}$/);
 const bad=await send('/api/auth/android/google','POST',{nonce:ch.payload.nonce,idToken:signed('not-the-nonce')});assert.equal(bad.status,401);assert.equal(signupCalls,0);
 const replay=await send('/api/auth/android/google','POST',{nonce:ch.payload.nonce,idToken:signed(ch.payload.nonce)});assert.equal(replay.status,400);assert.equal(signupCalls,0);
 const ch2=await send('/api/auth/android/challenge');
 const wrongAud=await send('/api/auth/android/google','POST',{nonce:ch2.payload.nonce,idToken:signed(ch2.payload.nonce,'some-other-client.apps.googleusercontent.com')});assert.equal(wrongAud.status,401);
 const chAzp=await send('/api/auth/android/challenge');
 const wrongAzp=await send('/api/auth/android/google','POST',{nonce:chAzp.payload.nonce,idToken:signed(chAzp.payload.nonce,CLIENT,'unregistered-android.apps.googleusercontent.com')});
 assert.equal(wrongAzp.status,401);assert.equal(signupCalls,0);
 const ch3=await send('/api/auth/android/challenge');
 const success=await send('/api/auth/android/google','POST',{nonce:ch3.payload.nonce,idToken:signed(ch3.payload.nonce,CLIENT,ANDROID_CLIENT)});
 assert.equal(success.status,200);assert.equal(success.payload.user.username,'trader1');assert.match(success.headers['Set-Cookie'],/^mm_reader=[a-f0-9]{64};/);assert.equal(signupCalls,1);
 const dup=await send('/api/auth/android/google','POST',{nonce:ch3.payload.nonce,idToken:signed(ch3.payload.nonce)});assert.equal(dup.status,400);assert.equal(signupCalls,1);
 const expired=await send('/api/auth/android/challenge');now+=6*60000;const old=await send('/api/auth/android/google','POST',{nonce:expired.payload.nonce,idToken:signed(expired.payload.nonce)});assert.equal(old.status,400);
 console.log('LULUS | Android Google Login native: config, nonce, fake token reject, replay reject, wrong audience reject, valid signed token, cookie, expiry ('+verifiedCalls+' checks).');
 db.close();
})().catch(e=>{console.error(e);process.exitCode=1});