(()=>{'use strict';
const LOGO='/__android417/brand/logo.png';
const avatars='.sh-avatar,.sh-friend-avatar,.sh-msg-avatar:not(.is-group),.sh-msg-chat-avatar,.gm-msg-avatar,.gm-member-avatar,.mm36-avatar,.mm46-person-avatar,.sm-profile-avatar,.mm46-avatar,.mm1828-avatar';
const text='Lencana komunitas diberikan otomatis saat akun memiliki sedikitnya 1.000 pengikut aktif. Ini bukan verifikasi identitas, kepemilikan resmi, keahlian trading, atau jaminan keuntungan. Lencana tidak mengubah hak admin dan hilang jika jumlah pengikut turun di bawah batas.';
function fallback(node){if(!node||node.querySelector('img'))return;const img=document.createElement('img');img.src=LOGO;img.alt='Logo M MarketMarney';img.className='mm-default-avatar';img.decoding='async';node.replaceChildren(img);node.classList.add('mm-avatar-default');}
function scan(root){if(root.nodeType!==1&&root.nodeType!==9)return;if(root.matches?.(avatars)){if(root.querySelector('img:not(.mm-default-avatar)'))root.classList.remove('mm-avatar-default');else fallback(root);}root.querySelectorAll?.(avatars).forEach(n=>{if(n.querySelector('img:not(.mm-default-avatar)'))n.classList.remove('mm-avatar-default');else fallback(n);});}
// Gold is a stored group-ownership role, not an identity/security certification.
const ownerText='Ceklis emas publik menandai pemilik sedikitnya satu grup aktif dengan minimal 999 anggota aktif. Jumlah tidak digabung dari beberapa grup. Dalam percakapan grup, ceklis emas hanya diberikan kepada pemilik grup tersebut. Ini bukan verifikasi identitas, akun resmi MarketMarney, atau jaminan keamanan tautan. Ceklis tidak menambah hak admin.';
function showInfo(kind='community'){
 const isOwner=kind==='owner',id=isOwner?'mmOwnerBadgeInfo':'mmBadgeInfo';
 let d=document.getElementById(id);
 if(!d){d=document.createElement('dialog');d.id=id;d.className='mm-badge-dialog'+(isOwner?' mm-owner-info':'');
  d.setAttribute('aria-labelledby',id+'Title');d.setAttribute('aria-describedby',id+'Description');
  const h=document.createElement('h2');h.id=id+'Title';h.textContent=isOwner?'Ceklis emas · Pemilik grup':'Lencana komunitas';
  const p=document.createElement('p');p.id=id+'Description';p.textContent=isOwner?ownerText:text;
  const b=document.createElement('button');b.type='button';b.textContent='Mengerti';b.autofocus=true;b.addEventListener('click',()=>d.close());
  d.append(h,p,b);document.body.append(d);
 }if(!d.open)d.showModal();
}
function addMark(node,kind){
 const gold=kind==='owner',mark=document.createElement('span');mark.className=gold?'mm-owner-badge':'mm-community-badge';
 mark.title=gold?'Ceklis emas · Pemilik grup (bukan verifikasi identitas)':'Lencana komunitas · 1.000+ pengikut (bukan verifikasi identitas)';
 const interactive='a,button,[role="button"],[data-social-profile]';
 const actionable=!node.matches(interactive)&&!node.closest(interactive);
 mark.setAttribute('role',actionable?'button':'img');mark.setAttribute('aria-label',mark.title);
 if(actionable){mark.tabIndex=0;mark.setAttribute('aria-haspopup','dialog');}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const seal=document.createElementNS(svg.namespaceURI,'path');seal.setAttribute('d','m12 1.5 2.9 1.8 3.4.3 1.4 3.1 2.6 2.2-.7 3.3.7 3.3-2.6 2.2-1.4 3.1-3.4.3-2.9 1.8-2.9-1.8-3.4-.3-1.4-3.1L.7 15.5l.7-3.3-.7-3.3 2.6-2.2 1.4-3.1 3.4-.3Z');seal.setAttribute('fill','currentColor');
 const tick=document.createElementNS(svg.namespaceURI,'path');tick.setAttribute('d','m7.5 12 3 3 6-6');tick.setAttribute('fill','none');tick.setAttribute('stroke',gold?'#342308':'white');tick.setAttribute('stroke-width','2.4');tick.setAttribute('stroke-linecap','round');tick.setAttribute('stroke-linejoin','round');svg.append(seal,tick);mark.append(svg);
 if(actionable){mark.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showInfo(kind);});mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();showInfo(kind);}});}
 node.classList.add('mm-has-badge');node.append(mark);
}
function badge(node,user,key='username',options={}){
 if(!node)return node;
 node.querySelectorAll(':scope > .mm-community-badge,:scope > .mm-owner-badge').forEach(x=>x.remove());node.classList.remove('mm-has-badge');
 const owner=user?.[key==='username'?'groupOwnerBadge':key+'GroupOwnerBadge'];
 const contextMatches=!options.groupContext||key==='owner'||user?.isGroupOwner===true||user?.role==='owner';
 if(options.groupContext?contextMatches:(owner?.eligible===true&&owner.kind==='group-owner'&&owner.threshold===999&&Number.isSafeInteger(owner.groupCount)&&owner.groupCount>0))addMark(node,'owner');
 const b=user?.[key==='username'?'communityBadge':key+'CommunityBadge'];
 if(b?.eligible===true&&b.kind==='community-1000'&&b.threshold===1000&&Number.isFinite(b.followers)&&b.followers>=1000)addMark(node,'community');
 return node;
}
window.SocialIdentity1875={badge,fallback,description:text,ownerDescription:ownerText};
document.addEventListener('error',e=>{const im=e.target;if(im.tagName==='IMG'&&!im.classList.contains('mm-default-avatar')){const parent=im.closest(avatars);if(parent){im.remove();fallback(parent);}}},true);
function boot(){
 scan(document.body);const pending=new Set();let queued=false,active=true;
 const observer=new MutationObserver(ms=>{
  for(const m of ms){
   // A removed avatar image needs a fallback, but an ordinary text edit does
   // not require rescanning the feed, modal or entire document around it.
   const avatar=m.target.nodeType===1?m.target.closest(avatars):m.target.parentElement?.closest(avatars);
   if(avatar)pending.add(avatar);
   for(const n of m.addedNodes)if(n.nodeType===1)pending.add(n);
  }
  if(queued||!pending.size)return;queued=true;
  queueMicrotask(()=>{
   queued=false;if(!active)return;
   const roots=new Set([...pending].filter(n=>n.isConnected));pending.clear();
   for(const root of roots){let parent=root.parentElement;while(parent&&!roots.has(parent))parent=parent.parentElement;if(!parent)scan(root)}
  });
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('pagehide',()=>{active=false;observer.disconnect();pending.clear()},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
