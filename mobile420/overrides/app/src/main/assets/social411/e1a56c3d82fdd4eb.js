/* MarketMarney v18.6.8 — mobile account drawer. Existing nodes are moved, never cloned.
   No new requests, private storage, authentication logic or desktop layout changes. */
(()=>{'use strict';
  const $=id=>document.getElementById(id);
  const trigger=$('shMobileAccountButton'),dialog=$('shMobileAccountDialog'),host=$('shMobileAccountPanels');
  const original=$('shTopAccount'),logged=$('shLogged'),profile=$('shPublicProfile');
  if(!trigger||!dialog||!host||!original||!logged||typeof dialog.showModal!=='function')return;
  const media=matchMedia('(max-width: 790px)');
  const cards=[$('shFriendToggle')?.closest('.sh-collapsible-card'),$('shMessagePanel'),$('shGroupPanel')];
  if(cards.some(card=>!card))return;
  const homes=cards.map(card=>{const slot=document.createComment('mobile-account: original panel position');card.before(slot);return slot});
  let mounted=false,wasBackdrop=false,deepLinkApplied=false;
  const isUser=()=>!logged.hidden&&/^@\S/.test(original.textContent.trim());
  function identity(){
    const name=original.textContent.trim();$('shMobileAccountLabel').textContent=name;
    $('shMobileAccountTitle').textContent=name;trigger.setAttribute('aria-label','Buka menu akun '+name);trigger.title='Menu akun '+name;
    $('shMobileAccountProfile').href=profile?.getAttribute('href')||'/profil.html';
  }
  function close(){if(dialog.open)dialog.close();trigger.setAttribute('aria-expanded','false')}
  // Keep header overlays mutually exclusive, without resetting either conversation.
  function closeHeaderPanels(){for(const id of ['shMessengerButton','shNotificationBell']){const button=$(id);if(button?.getAttribute('aria-expanded')==='true')button.click()}}
  function open({deferHeaderClose=false}={}){
    if(!mounted||!isUser())return false;
    if(!deferHeaderClose)closeHeaderPanels();
    if(!dialog.open){identity();dialog.showModal();trigger.setAttribute('aria-expanded','true')}
    if(deferHeaderClose)queueMicrotask(closeHeaderPanels);
    return true;
  }
  function panelFor(target){return cards.find(card=>card===target||card.contains(target))}
  function reveal(target,{focus=false,deferHeaderClose=false}={}){
    if(!target||!panelFor(target)||!open({deferHeaderClose}))return false;
    const card=panelFor(target),toggle=card.querySelector('.sh-collapse-toggle');
    if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();
    queueMicrotask(()=>{if(!dialog.open)return;target.scrollIntoView({block:'nearest',behavior:'auto'});if(focus){const field=target.matches('input,button,a,textarea')?target:target.querySelector('input:not([hidden]),button,a');field?.focus({preventScroll:true})}});
    return true;
  }
  function hashTarget(hash){try{return hash?.startsWith('#')?$(decodeURIComponent(hash.slice(1))):null}catch{return null}}
  function layout(){
    identity();const shouldMount=(media.matches||document.documentElement.dataset.mm44Social==='1')&&isUser();
    if(shouldMount===mounted)return;
    const active=document.activeElement;
    if(shouldMount){
      for(const card of cards)host.append(card);
      mounted=true;document.documentElement.dataset.mmMobileAccount='ready';
    }else{
      close();for(let i=0;i<cards.length;i++)homes[i].after(cards[i]);
      mounted=false;delete document.documentElement.dataset.mmMobileAccount;
    }
    window.dispatchEvent(new Event('mm:sidebar-layout'));
    if(shouldMount&&!deepLinkApplied){deepLinkApplied=true;reveal(hashTarget(location.hash))}
    if(!shouldMount&&active&&dialog.contains(active))original.focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>{layout();dialog.open?close():open()});
  $('shMobileAccountClose').addEventListener('click',close);
  dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));
  // Require both down and click on the backdrop; dragging outside a field must not close it.
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
  dialog.addEventListener('pointerdown',e=>{wasBackdrop=e.target===dialog&&outside(e)});
  dialog.addEventListener('click',e=>{if(wasBackdrop&&e.target===dialog&&outside(e))close();wasBackdrop=false});
  // Existing sidebar/Messenger handlers still own their data operations. Open the drawer
  // before those handlers focus/scroll, but only close the previous overlay afterwards.
  document.addEventListener('click',e=>{
    if(!mounted)return;const link=e.target.closest('a[href^="#"]');if(!link)return;
    const target=hashTarget(link.getAttribute('href'));
    if(target&&panelFor(target)){e.preventDefault();reveal(target,{focus:true,deferHeaderClose:true})}
  },true);
  window.addEventListener('hashchange',()=>{if(mounted)reveal(hashTarget(location.hash))});
  window.addEventListener('mm:dm-open',()=>{if(mounted)reveal($('shMessagePanel'),{deferHeaderClose:true})});
  window.addEventListener('mm:messenger-open',close);
  window.addEventListener('mm:notification-open',close);
  // Only observe identity/authentication anchors, not the private messages themselves.
  const observer=new MutationObserver(layout);
  observer.observe(original,{childList:true,subtree:true,characterData:true});
  observer.observe(logged,{attributes:true,attributeFilter:['hidden']});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-mm44-social']});
  if(profile)observer.observe(profile,{attributes:true,attributeFilter:['href']});
  if(media.addEventListener)media.addEventListener('change',layout);else media.addListener(layout);
  layout();
})();
