'use strict';
// HTTPS transactional sender; no SMTP/Gmail password is needed. No logging of secrets or OTP values.
function mailConfig(env) {
 const from=String(env.MM_EMAIL_FROM||'').trim();
 const key=String(env.RESEND_API_KEY||'');
 const ready=/^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*marketmarney\.com$/i.test(from) &&
  /^re_[A-Za-z0-9_-]{16,}$/.test(key);
 return {from,key,ready};
}
async function boundedJSON(response) {
 if(!response.body)throw Error('empty-response');
 const reader=response.body.getReader();let n=0;const parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>16384)throw Error('response-too-large');parts.push(Buffer.from(value));}}
 finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(parts,n).toString('utf8'));
}
function message(code,purpose){
 if(purpose==='password-reset')return {
  subject:'Kode pemulihan password Social Marney',
  heading:'Pulihkan password Anda',
  intro:'Masukkan kode berikut pada formulir Lupa Password di MarketMarney.',
  text:`Kode pemulihan password Social Marney Anda: ${code}\n\nKode berlaku selama 5 menit dan hanya dapat digunakan sekali. Masukkan kode hanya pada halaman https://marketmarney.com/akun.html#lupa-password.\n\nJangan berikan kode ini kepada siapa pun. Tim MarketMarney tidak pernah meminta kode melalui pesan pribadi. Jika Anda tidak meminta pemulihan password, abaikan email ini dan password Anda tidak berubah.\n\nMarketMarney / Social Marney`,
  footer:'Tidak meminta pemulihan password? Abaikan email ini. Password Anda tetap sama.'
 };
 if(purpose!=='signup')throw Error('unsupported-email-purpose');
 return {
  subject:'Kode verifikasi pendaftaran Social Marney',
  heading:'Verifikasi email Anda',
  intro:'Masukkan kode berikut pada formulir pendaftaran MarketMarney yang Anda buka.',
  text:`Kode verifikasi Social Marney Anda: ${code}\n\nKode berlaku selama 5 menit dan hanya dapat digunakan sekali. Masukkan kode hanya pada formulir pendaftaran yang Anda buka di https://marketmarney.com.\n\nJangan berikan kode ini kepada siapa pun. Tim MarketMarney tidak meminta kode melalui pesan pribadi. Jika Anda tidak meminta kode ini, abaikan email ini. Akun belum dibuat sebelum verifikasi selesai.\n\nMarketMarney / Social Marney`,
  footer:'Tidak meminta kode ini? Abaikan email ini. Akun belum dibuat sebelum verifikasi selesai.'
 };
}
function createMailer(env=process.env,fetchImpl=globalThis.fetch) {
 const cfg=mailConfig(env);
 return {ready:cfg.ready,async send({email,code,idempotencyKey,purpose='signup'}) {
  if(!cfg.ready||!/^\d{6}$/.test(code)||!/^[-A-Za-z0-9_/]{8,180}$/.test(idempotencyKey||''))throw Error('email-not-configured');
  const copy=message(code,purpose),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);timeout.unref?.();
  try{
   const html=`<!doctype html><html lang="id"><body style="margin:0;background:#f4f6f9;font:16px Arial,sans-serif;color:#14202b"><div style="max-width:520px;margin:28px auto;padding:28px;background:#fff;border:1px solid #e0e6ec;border-radius:16px"><p style="font-size:13px;color:#945900;font-weight:bold;letter-spacing:2px">SOCIAL MARNEY</p><h1 style="font-size:24px">${copy.heading}</h1><p>${copy.intro}</p><div style="font-size:36px;font-weight:bold;letter-spacing:8px;background:#fff3de;padding:22px;text-align:center;border-radius:12px">${code}</div><p>Kode berlaku <strong>5 menit</strong> dan hanya dapat digunakan sekali.</p><p style="font-size:14px;color:#4b5968">Jangan berikan kode ini kepada siapa pun. Tim MarketMarney tidak pernah meminta kode melalui pesan pribadi.</p><p style="font-size:13px;color:#657383">${copy.footer}</p></div></body></html>`;
   const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:controller.signal,
    headers:{Authorization:'Bearer '+cfg.key,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
    body:JSON.stringify({from:`Social Marney <${cfg.from}>`,to:[email],subject:copy.subject,text:copy.text,html})});
   if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('provider-rejected');}
   const data=await boundedJSON(response);
   if(typeof data.id!=='string'||data.id.length>200)throw Error('invalid-provider-response');
   return {accepted:true};
  }catch(_){throw Error('email-send-failed');}finally{clearTimeout(timeout);}
 }};
}
module.exports={mailConfig,createMailer,message};
