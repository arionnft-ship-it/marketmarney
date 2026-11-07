'use strict';
const {once}=require('./patches.cjs');
const VERSION=require('./requirements.cjs').VERSION;
const fields=`<div id="mmSignupFields" hidden style="display:grid;gap:13px">
<label for="signupName">Nama tampilan<input id="signupName" name="displayName" type="text" autocomplete="nickname" maxlength="60" placeholder="Nama Anda di Social Marney" disabled aria-describedby="mmSignupNameHelp"></label>
<small id="mmSignupNameHelp">Nama ini terlihat pada profil, postingan, dan percakapan.</small>
<label for="signupEmail">Email<input id="signupEmail" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="nama@email.com" disabled aria-describedby="mmSignupEmailHelp"></label>
<small id="mmSignupEmailHelp">Email disimpan untuk akun Anda dan tidak ditampilkan di profil publik.</small>
</div>`;
const modes=`let processing=false,signupAllowed=false,signupMode=location.hash==='#daftar'||new URLSearchParams(location.search).get('google_error')==='profile_required';
function setAuthMode(wanted){
 signupMode=!!wanted&&signupAllowed;
 $('mmSignupFields').hidden=!signupMode;
 for(const id of ['signupName','signupEmail']){$(id).disabled=!signupMode;$(id).required=signupMode;}
 $('guest').querySelector('h2').textContent=signupMode?'Daftar Social Marney':'Masuk ke akun';
 $('guest').querySelector('p.muted').textContent=signupMode?'Isi data akun untuk bergabung dengan komunitas.':'Masuk untuk berdiskusi dan mengelola profil Anda.';
 $('login').textContent=signupMode?'Buat akun':'Masuk';
 $('register').textContent=signupMode?'Sudah punya akun? Masuk':'Daftar akun';
 $('password').autocomplete=signupMode?'new-password':'current-password';
 $('mmSignupGoogleNote').hidden=!signupMode;
 $('registrationNote').textContent=!signupAllowed?'Registrasi akun baru belum dibuka oleh admin.':signupMode?'Nama tampilan, email, username, dan password wajib diisi.':'Belum punya akun? Pilih Daftar akun.';
}
`;
const authenticate=`async function authenticate(mode){
 if(processing)return;
 const username=$('username').value.trim().toLowerCase(),password=$('password').value;
 const payload={username,password};
 if(mode==='register'){
  if(!signupAllowed){notice('Registrasi akun baru belum dibuka oleh admin.',true);return;}
  setAuthMode(true);
  const name=$('signupName').value.trim(),email=$('signupEmail').value.trim();
  $('signupName').value=name;$('signupEmail').value=email;
  if(!name){notice('Nama tampilan wajib diisi.',true);$('signupName').focus();return;}
  if(!email||!$('signupEmail').checkValidity()){notice('Masukkan alamat email yang valid.',true);$('signupEmail').focus();return;}
  payload.displayName=name;payload.email=email;
 }
 if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||password.length<12||password.length>128){notice('Username 3–24 karakter, diawali huruf. Password 12–128 karakter.',true);return;}
 processing=true;$('login').disabled=true;$('register').disabled=true;
 try{
  await api(mode,'POST',payload);$('password').value='';
  $('signupEmail').value='';$('signupName').value='';
  await refresh();notice(mode==='login'?'Berhasil masuk. Selamat datang!':'Akun berhasil dibuat dan Anda sudah masuk.');
  document.dispatchEvent(new Event('mm36-account-login'));
 }catch(e){notice(e.message,true);}
 finally{processing=false;$('login').disabled=false;$('register').disabled=false;}
}
`;
function enhanceAccount(html,page='/akun.html'){
 if(page!=='/akun.html'||typeof html!=='string')return html;
 if(html.includes('data-mm-signup-release="'+VERSION+'"'))return html;
 let s=once(html,'<form id="authForm">','<form id="authForm" data-mm-signup-release="'+VERSION+'">'+fields,'account form');
 s=once(s,"let processing=false;",modes,'account state');
 s=once(s,"$('register').hidden=!d.registrationEnabled;","signupAllowed=d.registrationEnabled===true;$('register').hidden=!signupAllowed;",'signup enabled');
 s=once(s,"if(!gerr&&!params.has('google'))notice('');initGoogle()","setAuthMode(signupMode);if(!gerr&&!params.has('google'))notice('');initGoogle()",'auth mode after refresh');
 const a=s.indexOf('async function authenticate(mode){'),end=s.indexOf('\n\nconst googleMessages=',a);
 if(a<0||end<=a)throw Error('Account authenticate anchor changed');s=s.slice(0,a)+authenticate+s.slice(end);
 s=once(s,'const googleMessages={',"const googleMessages={profile_required:'Untuk akun Google baru, nama dan email terverifikasi harus tersedia. Lengkapi profil Google atau daftar melalui form.',email_used:'Email sudah digunakan. Masuk ke akun yang ada, lalu hubungkan Google di Pengaturan akun.',",'Google messages');
 s=once(s,"$('authForm').addEventListener('submit',e=>{e.preventDefault();authenticate('login')});$('register').addEventListener('click',()=>authenticate('register'));", "$('authForm').addEventListener('submit',e=>{e.preventDefault();authenticate(signupMode?'register':'login')});$('register').addEventListener('click',()=>{setAuthMode(!signupMode);notice('');(signupMode?$('signupName'):$('username')).focus()});window.addEventListener('hashchange',()=>setAuthMode(location.hash==='#daftar'));",'form listeners');
 s=once(s,'<p class="mm-google-note" id="mmGoogleNote">','<p class="mm-google-note" id="mmSignupGoogleNote" hidden>Daftar melalui Google memakai nama dan email dari akun Google. Nama Google disimpan untuk akun, tidak otomatis dijadikan nama tampilan publik.</p><p class="mm-google-note" id="mmGoogleNote">','Google disclosure');
 return s;
}
module.exports={enhanceAccount,VERSION};
