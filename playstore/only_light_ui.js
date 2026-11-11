/* Play-candidate-only light-mode polish. The public MarketMarney website is unchanged. */
(function(){
  'use strict';
  if(location.protocol!=='https:' || location.hostname!=='marketmarney.com')return;
  if(window.MMPlayLightGuard)return;
  window.MMPlayLightGuard=true;
  var scheduled=false;
  var selector='button,[role="button"],[role="radio"],[role="switch"],label';
  function nameOf(node){
    var text=String(node.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    var aria=String(node.getAttribute('aria-label')||'').trim().toLowerCase();
    var title=String(node.getAttribute('title')||'').trim().toLowerCase();
    function kind(value){
      // Narrow to real theme controls; never hide arbitrary buttons/content.
      var cleaned=value.replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
      if(/^(terang|light|mode terang|tema terang)$/.test(cleaned))return 'light';
      if(/^(gelap|dark|mode gelap|tema gelap|dark mode)$/.test(cleaned))return 'dark';
      return '';
    }
    return kind(text)||kind(aria)||kind(title);
  }
  function hide(el){
    if(!el || el.dataset.mmPlayLightHidden==='yes')return;
    el.dataset.mmPlayLightHidden='yes';
    el.style.setProperty('display','none','important');
    el.setAttribute('aria-hidden','true');
    if('tabIndex' in el)el.tabIndex=-1;
  }
  function enforce(){
    scheduled=false;
    if(!document.body)return;
    // The original 4.25 layer already forces theme=light and light system bars.
    // This layer only removes light/dark choice widgets visible in website HTML.
    var nodes=Array.prototype.slice.call(document.querySelectorAll(selector));
    for(var i=0;i<nodes.length;i++){
      if(!nameOf(nodes[i]))continue;
      var container=nodes[i].parentElement;
      if(container && container!==document.body){
        var peers=Array.prototype.slice.call(container.querySelectorAll(selector));
        var typed=peers.map(nameOf).filter(Boolean);
        var label=String(container.textContent||'').replace(/\s+/g,' ').trim();
        if(peers.length===2 && typed.indexOf('light')>=0 &&
           typed.indexOf('dark')>=0 && label.length<45){
          hide(container);
          continue;
        }
      }
      hide(nodes[i]);
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    if(window.requestAnimationFrame)requestAnimationFrame(enforce);
    else Promise.resolve().then(enforce);
  }
  // Block a rerendered website dark switch before its own handlers run.
  document.addEventListener('click',function(event){
    var target=event.target && event.target.closest ? event.target.closest(selector) : null;
    if(target && nameOf(target)==='dark'){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  new MutationObserver(schedule).observe(document.documentElement,
    {childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',schedule,{once:true});
  schedule();
})();
