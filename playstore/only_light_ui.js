/* MarketMarney Play candidate only — no scanning the live Social/Reels DOM. */
(function(){
  'use strict';
  if(location.protocol!=='https:' || location.hostname!=='marketmarney.com')return;
  if(window.MMPlayLightGuard)return;
  window.MMPlayLightGuard=true;

  var styleId='mm-play-early-light';
  var css='#mmThemeSwitch,.mm-theme-switch,[data-mm-theme-choice],'+
    '.sh-theme-switch,#shTheme,.mm80-themes,.j-theme,[data-theme-toggle]'+
    '{display:none!important;visibility:hidden!important}';
  function enforce(){
    var root=document.documentElement;
    if(!root)return;
    var style=document.getElementById(styleId);
    if(!style){
      style=document.createElement('style');
      style.id=styleId;
      style.textContent=css;
      (document.head||root).appendChild(style);
    }
    if(root.getAttribute('data-mm-theme')!=='light')root.setAttribute('data-mm-theme','light');
    if(root.getAttribute('data-theme')!=='light')root.setAttribute('data-theme','light');
    root.style.setProperty('color-scheme','light','important');
    if(window.MMLight425 && typeof window.MMLight425.force==='function'){
      window.MMLight425.force();
    }
  }
  // CSS works for header replacements without observing every feed/reel/chat node.
  // Block only hidden theme choice clicks from stale script handlers.
  document.addEventListener('click',function(e){
    var target=e.target && e.target.closest ? e.target.closest(
      '#mmThemeSwitch,.mm-theme-switch,[data-mm-theme-choice],[data-theme-toggle]'
    ) : null;
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    enforce();
  },true);
  document.addEventListener('DOMContentLoaded',enforce,{once:true});
  window.addEventListener('pageshow',enforce,{passive:true});
  enforce();
})();
