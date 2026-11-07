"use strict";
// Registration metadata is private. No email address is added to public user JSON.
const {domainToASCII}=require('node:url');
const VERSION='signup-name-email-20261107-r1';
function invalid(message,code='profile_required'){return Object.assign(new Error(message),{status:400,code});}
function emailAddress(value){
 if(typeof value!=='string'||value.length>254||/[\p{Cc}\p{Cf}\s<>]/u.test(value))throw invalid('Masukkan alamat email yang valid.');
 const at=value.lastIndexOf('@');
 if(at<=0||at!==value.indexOf('@'))throw invalid('Masukkan alamat email yang valid.');
 const local=value.slice(0,at),host=domainToASCII(value.slice(at+1)).toLowerCase();
 if(local.length>64||!/[A-Za-z0-9]/.test(local)||!/^[-A-Za-z0-9.!#$%&'*+/=?^_`{|}~]+$/.test(local)||local.startsWith('.')||local.endsWith('.')||local.includes('..'))throw invalid('Masukkan alamat email yang valid.');
 const labels=host.split('.');
 if(host.length>253||labels.length<2||labels.some(s=>s.length<1||s.length>63||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s))||!/[a-z]/.test(labels.at(-1)))throw invalid('Masukkan alamat email yang valid.');
 const email=local+'@'+host;if(email.length>254)throw invalid('Alamat email terlalu panjang.');
 // Explicit app policy: case-insensitive comparison; never remove dots/plus aliases.
 return {email,key:email.toLowerCase()};
}
function createSignup({db,displayNames}){
 db.exec(`CREATE TABLE IF NOT EXISTS community_registration_20261107(
   user_id TEXT PRIMARY KEY REFERENCES community_users_181(id),
   email TEXT NOT NULL,email_key TEXT NOT NULL UNIQUE COLLATE NOCASE,
   registration_name TEXT NOT NULL,email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN(0,1)),
   provider TEXT NOT NULL CHECK(provider IN('password','google')),created_ms INTEGER NOT NULL
 )`);
 const existing=db.prepare('SELECT user_id FROM community_registration_20261107 WHERE email_key=?');
 const insert=db.prepare('INSERT INTO community_registration_20261107(user_id,email,email_key,registration_name,email_verified,provider,created_ms) VALUES(?,?,?,?,?,?,?)');
 function validate(name,email){
  const normalized=displayNames.normalize(name);
  if(!normalized)throw invalid('Nama tampilan wajib diisi.');
  return {name:normalized,...emailAddress(email)};
 }
 function available(profile){if(existing.get(profile.key))throw invalid('Email atau username tidak tersedia. Masuk ke akun yang sudah ada untuk melanjutkan.','email_used');}
 function save(userId,profile,verified=false,provider='password'){
  available(profile);insert.run(userId,profile.email,profile.key,profile.name,verified?1:0,provider,Date.now());
 }
 function googleProfile(identity){
  if(!identity||identity.emailVerified!==true)throw Error('profile_required');
  let result;try{result=validate(identity.name,identity.email);}catch{throw Error('profile_required');}
  if(existing.get(result.key))throw Error('email_used');return result;
 }
 return {validate,available,save,googleProfile};
}
module.exports={createSignup,emailAddress,VERSION};
