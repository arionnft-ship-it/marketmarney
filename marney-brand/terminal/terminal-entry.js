(function(){
 'use strict';
 const ID='mm-terminal-edition-link';
 function install(){
  const sidebar=document.querySelector('aside.sidebar,.sidebar');
  if(!sidebar)return;
  if(sidebar.querySelector('#'+ID))return;
  const nav=[...sidebar.querySelectorAll('button.navbtn')].find(n=>
   /market live/i.test(n.getAttribute('data-page')||n.textContent||''))||
   sidebar.querySelector('button.navbtn');
  if(!nav)return;
  const a=document.createElement('a');
  a.id=ID;a.href='/terminal';a.className='mm-terminal-edition-link';
  a.setAttribute('aria-label','Buka MarketMarney Terminal Edition');
  const icon=document.createElement('span');icon.className='mm-terminal-edition-icon';icon.textContent='▣';icon.setAttribute('aria-hidden','true');
  const body=document.createElement('span');body.className='mm-terminal-edition-copy';
  const title=document.createElement('strong');title.textContent='TERMINAL EDITION';
  const subtitle=document.createElement('small');subtitle.textContent='News · feed · kalender';
  body.append(title,subtitle);
  const badge=document.createElement('span');badge.className='mm-terminal-edition-badge';badge.textContent='BARU';
  a.append(icon,body,badge);
  nav.insertAdjacentElement('afterend',a);
 }
 function start(){
  install();
  let pending=false;
  new MutationObserver(()=>{
   if(document.getElementById(ID)||pending)return;
   pending=true;requestAnimationFrame(()=>{pending=false;install()});
  }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();