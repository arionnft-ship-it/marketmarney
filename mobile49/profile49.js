/* Resolve the current account only on an explicit Profile click. Never cache credentials. */
(function(){
'use strict';
if(location.protocol!=='https:'||location.hostname!=='marketmarney.com'||(location.port&&location.port!=='443'))return;
if(!['/beranda-trader.html','/grup-trader.html'].includes(location.pathname)||window.MarneyProfile49)return;
var pending=null,controller=null,dead=false;
function validLink(raw){try{var u=new URL(raw,location.origin);var user=u.searchParams.get('user');return u.protocol==='https:'&&u.hostname==='marketmarney.com'&&(!u.port||u.port==='443')&&!u.username&&!u.password&&u.pathname==='/profil.html'&&user&&user.trim().length>0&&user.length<=100?u.pathname+u.search:null;}catch(e){return null;}}
function status(message){var n=document.getElementById('mm49-profile-status');if(!n){n=document.createElement('p');n.id='mm49-profile-status';n.setAttribute('role','status');n.style.cssText='position:fixed;left:16px;right:16px;bottom:20px;z-index:120;padding:12px 16px;background:#152332;color:#fff;border-radius:12px;font:13px/1.5 sans-serif';document.body.append(n);}n.textContent=message;n.hidden=!message;}
async function open(trigger){
 if(pending)return pending;
 var original=location.pathname+location.search+location.hash,view=document.documentElement.dataset.mm44View;
 function current(){return !dead&&location.pathname+location.search+location.hash===original&&document.documentElement.dataset.mm44View===view;}
 var a=document.getElementById('shPublicProfile'),link=a&&validLink(a.getAttribute('href'));
 if(link){location.assign(link);return;}
 if(trigger){trigger.setAttribute('aria-busy','true');if(trigger.tagName==='BUTTON')trigger.disabled=true;}
 status('Memuat profil akun…');controller=new AbortController();var timer=setTimeout(function(){controller.abort();},12000);
 pending=(async function(){try{
  var r=await fetch('/api/community/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  var d=await r.json();if(!current())return;
  if(r.status===401||r.ok&&!d.user){location.assign('/akun.html');return;}
  if(!r.ok)throw Error('Profil belum dapat dimuat. Coba lagi.');
  var username=String(d.user.username||'').trim();
  if(!username||username.length>100)throw Error('Identitas profil belum tersedia. Coba lagi.');
  location.assign('/profil.html?user='+encodeURIComponent(username));
 }catch(e){if(current())status(e.name==='AbortError'?'Koneksi terputus atau terlalu lama. Ketuk Profil untuk mencoba lagi.':'Profil belum dapat dimuat. Ketuk Profil untuk mencoba lagi.');}
 finally{clearTimeout(timer);if(trigger){trigger.removeAttribute('aria-busy');if(trigger.tagName==='BUTTON')trigger.disabled=false;}pending=null;controller=null;}})();
 return pending;
}
window.MarneyProfile49={open:open,validLink:validLink};
window.addEventListener('pagehide',function(){dead=true;if(controller)controller.abort();},{once:true});
})();
