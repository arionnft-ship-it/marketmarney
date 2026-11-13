'use strict';
const SCRIPT="<script id=\"mm-token-creator-menu-script\">\n(function(){'use strict';\nfunction add(){\n const side=document.querySelector('.sidebar')||document.querySelector('aside.sidebar')||document.querySelector('.side-nav');\n if(!side||side.querySelector('[data-marney-token-creator]'))return;\n const link=document.createElement('a');link.href='/marney-coin';link.dataset.marneyTokenCreator='1';\n link.className='mm-token-creator-nav';link.textContent='◈ MARNEY COIN — SOON';\n link.setAttribute('aria-label','MARNEY Coin segera hadir — lihat informasi persiapan');\n link.addEventListener('click',function(e){e.stopPropagation()});\n const nearby=[...side.querySelectorAll('a,button,.navbtn')].find(el=>/UTILITIES/i.test(el.textContent||''));\n if(nearby)nearby.insertAdjacentElement('afterend',link);else side.append(link);\n}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();\nconst root=document.getElementById('app')||document.body;let queued=false;\nnew MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;add()})}).observe(root,{childList:true,subtree:true});\n})();\n</script>";
const STYLE="<style id=\"mm-token-creator-menu-style\">\n.mm-token-creator-nav{display:flex;align-items:center;gap:8px;margin:5px 9px;padding:12px 14px;border-radius:11px;background:#fff8ec;border:1px solid #eddab8;color:#7f490d!important;text-decoration:none!important;font-size:12px;font-weight:750;letter-spacing:.2px}\n.mm-token-creator-nav:hover{background:#fff0d8}\n</style>";
function injectTokenCreatorNav(html){
 if(typeof html!=='string')return html;
 let result=html;
 if(!result.includes('id="mm-token-creator-menu-style"')&&/<\/head\s*>/i.test(result))result=result.replace(/<\/head\s*>/i,STYLE+'</head>');
 if(!result.includes('id="mm-token-creator-menu-script"')&&/<\/body\s*>/i.test(result))result=result.replace(/<\/body\s*>/i,SCRIPT+'</body>');
 return result;
}
module.exports={injectTokenCreatorNav,SCRIPT,STYLE};
