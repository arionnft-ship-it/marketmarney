'use strict';
function once(source,old,next,label){if(source.split(old).length!==2)throw Error('Password UI compatibility anchor changed: '+label);return source.replace(old,next);}
const STYLE=`<style id="mmPasswordSecurityStyle">
#mmForgotOpen{width:100%;margin-top:12px}.mm-password-panel,.mm-password-change{margin:14px 0;padding:16px;border:1px solid rgba(140,145,155,.3);border-radius:14px;background:rgba(127,127,127,.06)}
.mm-password-panel h3,.mm-password-change h3{margin:0 0 6px}.mm-password-panel>p,.mm-password-change>p{margin:0 0 14px;line-height:1.55}.mm-password-panel label,.mm-password-change label{display:block;margin-top:12px}.mm-password-panel input,.mm-password-change input{width:100%;box-sizing:border-box}.mm-password-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.mm-password-actions button{flex:1 1 150px}.mm-password-status{min-height:1.4em;margin-top:10px;font-size:.92rem;line-height:1.45}.mm-password-status.error{color:#d94b58}.mm-password-hint{display:block;margin-top:10px;line-height:1.55;opacity:.78}
</style>`;
const FORGOT=`<button type="button" class="secondary" id="mmForgotOpen">Lupa password?</button>
<section id="mmForgotPanel" class="mm-password-panel" hidden aria-labelledby="mmForgotTitle">
<h3 id="mmForgotTitle">Pulihkan password</h3><p>Masukkan email yang terhubung ke akun. Kami akan mengirim kode OTP enam digit.</p>
<label for="mmForgotEmail">Email akun<input id="mmForgotEmail" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="nama@email.com"></label>
<label for="mmForgotOtp">Kode OTP<input id="mmForgotOtp" type="text" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="6 digit" disabled></label>
<label for="mmForgotNewPassword">Password baru<input id="mmForgotNewPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="12–128 karakter" disabled></label>
<label for="mmForgotConfirmPassword">Ulangi password baru<input id="mmForgotConfirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Ketik ulang password" disabled></label>
<div class="mm-password-actions"><button type="button" id="mmForgotSend">Kirim kode OTP</button><button type="button" id="mmForgotComplete" hidden>Verifikasi & ganti password</button><button type="button" class="secondary" id="mmForgotBack">Kembali ke login</button></div>
<div id="mmForgotStatus" class="mm-password-status" role="status" aria-live="polite"></div><small class="mm-password-hint">Kode berlaku 5 menit. Untuk keamanan, jawaban permintaan tidak mengungkap apakah suatu email terdaftar.</small>
</section>`;
const CHANGE=`<form id="mmChangePasswordForm" class="mm-password-change">
<h3>Ganti password</h3><p>Masukkan password saat ini. Setelah berhasil, semua sesi akan dikeluarkan dan Anda perlu login kembali.</p>
<label for="mmCurrentPassword">Password saat ini<input id="mmCurrentPassword" type="password" autocomplete="current-password" maxlength="128" required></label>
<label for="mmNewPassword">Password baru<input id="mmNewPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="12–128 karakter" required></label>
<label for="mmConfirmPassword">Ulangi password baru<input id="mmConfirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Ketik ulang password" required></label>
<div class="mm-password-actions"><button type="submit" id="mmChangePasswordButton">Simpan password baru</button></div><div id="mmChangePasswordStatus" class="mm-password-status" role="status" aria-live="polite"></div>
</form>`;
const CLIENT=`
let passwordPolicy={required:false,available:false},forgotMode=location.hash==='#lupa-password',forgotChallenge='',forgotEmail='',forgotExpiresAt=0,forgotRetryAt=0;
const mmPasswordNode=selector=>document.querySelector(selector);
function passwordStatus(id,message,error=false){const node=$(id);node.textContent=message||'';node.classList.toggle('error',!!error);}
function resetForgotChallenge(){forgotChallenge='';forgotEmail='';forgotExpiresAt=0;$('mmForgotOtp').value='';$('mmForgotNewPassword').value='';$('mmForgotConfirmPassword').value='';syncPasswordUi();}
function syncPasswordUi(){
 const forgot=forgotMode&&!$('guest').hidden,live=!!forgotChallenge&&Date.now()<forgotExpiresAt;
 $('authForm').hidden=forgot;$('mmForgotPanel').hidden=!forgot;$('mmForgotOpen').hidden=forgot||signupMode||!passwordPolicy.required;
 const separator=mmPasswordNode('.mm-google-separator');if(separator)separator.hidden=forgot;
 $('mmGoogleLogin').hidden=forgot;$('mmGoogleNote').hidden=forgot;$('registrationNote').hidden=forgot;
 if($('mmSignupGoogleNote'))$('mmSignupGoogleNote').hidden=forgot||!signupMode;
 for(const id of ['mmForgotOtp','mmForgotNewPassword','mmForgotConfirmPassword'])$(id).disabled=!forgot||!live;
 $('mmForgotComplete').hidden=!forgot||!live;
 const remaining=Math.max(0,Math.ceil((forgotRetryAt-Date.now())/1000));
 $('mmForgotSend').disabled=processing||remaining>0||!passwordPolicy.available;
 $('mmForgotSend').textContent=remaining?'Kirim ulang ('+remaining+' dtk)':forgotChallenge?'Kirim ulang kode':'Kirim kode OTP';
 if(forgot){
  $('guest').querySelector('h2').textContent='Lupa password';
  $('guest').querySelector('p.muted').textContent='Pulihkan akses menggunakan OTP yang dikirim ke email terverifikasi.';
  if(!passwordPolicy.available)passwordStatus('mmForgotStatus','Pengiriman OTP sedang tidak tersedia. Coba kembali nanti.',true);
  else if(!forgotChallenge&&!$('mmForgotStatus').textContent)passwordStatus('mmForgotStatus','Masukkan email akun, lalu kirim kode OTP.');
  else if(forgotChallenge&&!live)passwordStatus('mmForgotStatus','Kode sudah kedaluwarsa. Kirim ulang untuk mendapatkan kode baru.',true);
 }
}
function setForgotMode(value){
 forgotMode=!!value;
 if(forgotMode){signupMode=false;setAuthMode(false);history.replaceState(null,'',location.pathname+location.search+'#lupa-password');}
 else{resetForgotChallenge();history.replaceState(null,'',location.pathname+location.search);setAuthMode(false);}
 passwordStatus('mmForgotStatus','');syncPasswordUi();
 if(forgotMode)$('mmForgotEmail').focus();else $('username').focus();
}
async function issuePasswordOtp(){
 if(processing)return;
 const email=$('mmForgotEmail').value.trim();$('mmForgotEmail').value=email;
 if(!email||!$('mmForgotEmail').checkValidity()){passwordStatus('mmForgotStatus','Masukkan alamat email yang valid.',true);$('mmForgotEmail').focus();return;}
 if(!passwordPolicy.available){passwordStatus('mmForgotStatus','Pemulihan password sedang tidak tersedia.',true);return;}
 processing=true;forgotChallenge='';$('mmForgotOtp').value='';syncPasswordUi();
 try{
  const reply=await api('password/forgot/otp','POST',{email});
  if(!/^[a-f0-9]{64}$/.test(reply.challengeId||''))throw Error('Respons pemulihan tidak valid.');
  forgotChallenge=reply.challengeId;forgotEmail=email;forgotExpiresAt=Date.now()+Math.max(1,reply.expiresInSeconds||300)*1000;forgotRetryAt=Date.now()+Math.max(1,reply.resendAfterSeconds||60)*1000;
  passwordStatus('mmForgotStatus',reply.message||'Jika email terhubung ke akun, kode telah dikirim. Periksa Inbox dan Spam.');
 }catch(e){forgotRetryAt=Date.now()+60000;passwordStatus('mmForgotStatus',e.message,true);}
 finally{processing=false;syncPasswordUi();if(forgotChallenge)$('mmForgotOtp').focus();}
}
async function completePasswordReset(){
 if(processing)return;
 const email=$('mmForgotEmail').value.trim(),code=$('mmForgotOtp').value.trim(),next=$('mmForgotNewPassword').value,confirm=$('mmForgotConfirmPassword').value;
 if(!forgotChallenge||email!==forgotEmail||Date.now()>=forgotExpiresAt){passwordStatus('mmForgotStatus','Kode tidak tersedia atau sudah kedaluwarsa. Kirim ulang kode.',true);return;}
 if(!/^\\d{6}$/.test(code)){passwordStatus('mmForgotStatus','Masukkan kode OTP enam digit.',true);$('mmForgotOtp').focus();return;}
 if(next.length<12||next.length>128){passwordStatus('mmForgotStatus','Password baru harus 12–128 karakter.',true);$('mmForgotNewPassword').focus();return;}
 if(next!==confirm){passwordStatus('mmForgotStatus','Ulangi password baru dengan tepat.',true);$('mmForgotConfirmPassword').focus();return;}
 processing=true;syncPasswordUi();
 try{
  const reply=await api('password/forgot/complete','POST',{email,otpChallenge:forgotChallenge,otpCode:code,newPassword:next});
  $('mmForgotEmail').value='';resetForgotChallenge();forgotMode=false;history.replaceState(null,'',location.pathname+location.search);setAuthMode(false);syncPasswordUi();
  notice(reply.message||'Password berhasil diganti. Silakan masuk menggunakan password baru.');$('username').focus();
 }catch(e){passwordStatus('mmForgotStatus',e.message,true);}
 finally{processing=false;syncPasswordUi();}
}
$('mmForgotOpen').addEventListener('click',()=>setForgotMode(true));$('mmForgotBack').addEventListener('click',()=>setForgotMode(false));
$('mmForgotSend').addEventListener('click',issuePasswordOtp);$('mmForgotComplete').addEventListener('click',completePasswordReset);
$('mmForgotEmail').addEventListener('input',()=>{if(forgotChallenge&&$('mmForgotEmail').value.trim()!==forgotEmail)resetForgotChallenge();});
$('mmForgotOtp').addEventListener('input',()=>{$('mmForgotOtp').value=$('mmForgotOtp').value.replace(/\\D/g,'').slice(0,6);});
$('mmChangePasswordForm').addEventListener('submit',async event=>{
 event.preventDefault();if(processing)return;
 const oldPassword=$('mmCurrentPassword').value,newPassword=$('mmNewPassword').value,confirm=$('mmConfirmPassword').value;
 if(!oldPassword){passwordStatus('mmChangePasswordStatus','Masukkan password saat ini.',true);return;}
 if(newPassword.length<12||newPassword.length>128){passwordStatus('mmChangePasswordStatus','Password baru harus 12–128 karakter.',true);return;}
 if(oldPassword===newPassword){passwordStatus('mmChangePasswordStatus','Password baru harus berbeda dari password lama.',true);return;}
 if(newPassword!==confirm){passwordStatus('mmChangePasswordStatus','Ulangi password baru dengan tepat.',true);return;}
 processing=true;$('mmChangePasswordButton').disabled=true;passwordStatus('mmChangePasswordStatus','Menyimpan password baru…');
 try{
  await api('password','POST',{oldPassword,newPassword});
  for(const id of ['mmCurrentPassword','mmNewPassword','mmConfirmPassword'])$(id).value='';
  const accessCard=document.getElementById('mm80AccessCard'),accessAnchor=document.getElementById('mm80AccessAnchor');
  if(accessCard&&accessAnchor)accessAnchor.after(accessCard);
  document.getElementById('mm36Account').hidden=true;await refresh();notice('Password berhasil diganti. Semua sesi telah dikeluarkan; silakan login kembali.');
 }catch(e){passwordStatus('mmChangePasswordStatus',e.message,true);}
 finally{processing=false;$('mmChangePasswordButton').disabled=false;}
});
window.addEventListener('hashchange',()=>{const wants=location.hash==='#lupa-password';if(wants!==forgotMode){forgotMode=wants;if(wants){signupMode=false;setAuthMode(false);}syncPasswordUi();}});
setInterval(()=>{if(forgotMode)syncPasswordUi();},1000);
`;
function enhance(source){
 if(source.includes('id="mmForgotPanel"'))return source;
 let s=once(source,'</head>',STYLE+'</head>','style');
 s=once(s,'</form><div class="mm-google-separator">','</form>'+FORGOT+'<div class="mm-google-separator">','forgot panel');
 s=once(s,'<div class="mm-google-linkbox">',CHANGE+'<div class="mm-google-linkbox">','change password form');
 s=once(s,'function setAuthMode(wanted){',CLIENT+'\nfunction setAuthMode(wanted){','password client');
 s=once(s," $('password').autocomplete=signupMode?'new-password':'current-password';\n syncOtpUi();"," $('password').autocomplete=signupMode?'new-password':'current-password';\n syncOtpUi();\n syncPasswordUi();",'mode sync');
 s=once(s,"otpPolicy=d.emailOtp||{required:false,available:false};signupAllowed=d.registrationEnabled===true;","passwordPolicy=d.passwordRecovery||{required:false,available:false};otpPolicy=d.emailOtp||{required:false,available:false};signupAllowed=d.registrationEnabled===true;",'status policy');
 return s;
}
module.exports={enhance,STYLE,FORGOT,CHANGE,CLIENT};
