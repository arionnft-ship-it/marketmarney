'use strict';
const {once}=require('./transform.cjs');
const PANEL=`<div id="mmOtpPanel" hidden style="padding:16px;border:1px solid #dda64b;border-radius:12px;margin:12px 0">
<p id="mmOtpHelp" role="status" aria-live="polite">Verifikasi email diperlukan sebelum akun aktif.</p>
<label for="signupOtp">Kode OTP dari email<input id="signupOtp" type="text" name="otpCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" placeholder="6 digit" disabled aria-describedby="mmOtpHelp"></label>
<button type="button" class="secondary" id="mmResendOtp" style="display:block;margin:10px 0;padding:10px 12px;border:1px solid #a67736;border-radius:9px;background:transparent;color:inherit" hidden>Kirim ulang kode</button>
<small style="display:block;line-height:1.6">Kode hanya berlaku 5 menit. Jangan bagikan kepada siapa pun.</small></div>`;
const CLIENT=`
let otpPolicy={required:false,available:false},otpChallenge='',otpEmail='',otpExpiresAt=0,otpRetryAt=0;
function syncOtpUi(){
 const show=signupMode&&otpPolicy.required,live=!!otpChallenge&&Date.now()<otpExpiresAt;
 $('mmOtpPanel').hidden=!show;$('signupOtp').disabled=!show||!live;$('signupOtp').required=show&&live;
 $('mmResendOtp').hidden=!show||!otpChallenge;
 const remaining=Math.max(0,Math.ceil((otpRetryAt-Date.now())/1000));
 $('mmResendOtp').disabled=processing||remaining>0;
 $('mmResendOtp').textContent=remaining?'Kirim ulang ('+remaining+' dtk)':'Kirim ulang kode';
 if(show){
  $('login').textContent=live?'Verifikasi & buat akun':'Kirim kode OTP';
  $('mmSignupGoogleNote').textContent='Akun baru harus melalui formulir dan OTP email. Setelah mendaftar, Anda dapat menghubungkan Google di Pengaturan akun. Login Google untuk akun lama tetap tersedia.';
  if(!otpPolicy.available)$('mmOtpHelp').textContent='Pengiriman kode belum tersedia. Anda tetap dapat masuk ke akun yang sudah ada.';
  else if(!otpChallenge)$('mmOtpHelp').textContent='Isi data akun, lalu pilih Kirim kode OTP. Akun belum dibuat sebelum kode benar.';
  else if(!live)$('mmOtpHelp').textContent='Kode kedaluwarsa. Kirim ulang untuk mendapatkan kode baru.';
 }
}
function resetOtp(){otpChallenge='';otpEmail='';otpExpiresAt=0;$('signupOtp').value='';syncOtpUi();}
async function issueSignupOtp(email){
 if(processing)return;
 if(!otpPolicy.available){notice('Verifikasi email belum tersedia. Silakan coba lagi nanti.',true);return;}
 processing=true;$('login').disabled=true;$('register').disabled=true;syncOtpUi();
 otpChallenge='';$('signupOtp').value='';
 try{
  const reply=await api('register/otp','POST',{email});
  if(!/^[a-f0-9]{64}$/.test(reply.challengeId||''))throw Error('Respons verifikasi tidak valid.');
  otpChallenge=reply.challengeId;otpEmail=email;otpExpiresAt=Date.now()+reply.expiresInSeconds*1000;
  otpRetryAt=Date.now()+reply.resendAfterSeconds*1000;
  notice('Periksa email Anda, termasuk folder Spam. Masukkan kode terbaru untuk menyelesaikan pendaftaran.');
  $('mmOtpHelp').textContent='Permintaan kode sudah diterima. Periksa email Anda, termasuk folder Spam. Hanya kode terbaru yang dapat digunakan.';
 }catch(e){otpRetryAt=Date.now()+60000;notice(e.message,true);}
 finally{processing=false;$('login').disabled=false;$('register').disabled=false;syncOtpUi();if(otpChallenge)$('signupOtp').focus();}
}
$('signupEmail').addEventListener('input',()=>{if(otpChallenge&&$('signupEmail').value.trim()!==otpEmail)resetOtp();});
$('mmResendOtp').addEventListener('click',()=>{if(Date.now()<otpRetryAt||processing)return;const email=$('signupEmail').value.trim();if(!$('signupEmail').checkValidity()||!email){notice('Masukkan email yang valid.',true);return;}issueSignupOtp(email);});
setInterval(()=>{if(signupMode&&otpPolicy.required)syncOtpUi();},1000);
`;
function enhance(s){
 if(s.includes('id="mmOtpPanel"'))return s;
 s=once(s,'<div class="actions"><button id="login"',PANEL+'<div class="actions"><button id="login"');
 s=once(s,"function setAuthMode(wanted){",CLIENT+'\nfunction setAuthMode(wanted){');
 s=once(s,"$('password').autocomplete=signupMode?'new-password':'current-password';","$('password').autocomplete=signupMode?'new-password':'current-password';\n syncOtpUi();");
 s=once(s,"signupAllowed=d.registrationEnabled===true;","otpPolicy=d.emailOtp||{required:false,available:false};signupAllowed=d.registrationEnabled===true;");
 s=once(s,"processing=true;$('login').disabled=true;$('register').disabled=true;\n try{\n  await api(mode,'POST',payload);", "if(mode==='register'&&otpPolicy.required){\n  if(!otpChallenge||otpEmail!==payload.email||Date.now()>=otpExpiresAt){await issueSignupOtp(payload.email);return;}\n  const code=$('signupOtp').value.trim();if(!/^[0-9]{6}$/.test(code)){notice('Masukkan kode enam digit dari email Anda.',true);$('signupOtp').focus();return;}\n  payload.otpChallenge=otpChallenge;payload.otpCode=code;\n }\n processing=true;$('login').disabled=true;$('register').disabled=true;\n try{\n  await api(mode,'POST',payload);resetOtp();");
 s=once(s,'const googleMessages={',"const googleMessages={email_otp_required:'Untuk akun baru, pilih Daftar akun dan verifikasi OTP email terlebih dahulu. Setelah itu, hubungkan Google di Pengaturan akun.',");
 s=once(s,"get('google_error')==='profile_required'","get('google_error')==='profile_required'||new URLSearchParams(location.search).get('google_error')==='email_otp_required'");
 return s;
}
module.exports={enhance,PANEL,CLIENT};
