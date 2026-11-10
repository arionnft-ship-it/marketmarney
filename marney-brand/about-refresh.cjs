'use strict';
// About logo ONLY. All original dark styling, content, layout and navigation remain untouched.
const VERSION='about-m-arrow-only-20261110-v2';
const SOURCE='/assets/brand-about-transparent.webp?v='+VERSION;
function client(){
 'use strict';
 if(location.pathname!=='/about.html')return;
 const source='/assets/brand-about-transparent.webp?v=about-m-arrow-only-20261110-v2';
 function label(n){return String(n?.textContent||'').replace(/\s+/g,' ').trim();}
 function apply(){
  const headings=[...document.querySelectorAll('h1,h2,h3')];
  const title=headings.find(h=>/informasi pasar/i.test(label(h)) && /perspektif lebih luas/i.test(label(h.parentElement))) ||
    headings.find(h=>/informasi pasar|perspektif lebih luas/i.test(label(h)));
  if(!title)return false;
  const hero=title.closest('section,article,[class*="hero"],[class*="intro"]') || title.parentElement?.parentElement?.parentElement;
  if(!hero || hero===document.body || hero===document.documentElement)return false;
  const images=[...hero.querySelectorAll('img')].filter(img=>!img.closest('header,nav'));
  const logo=images.find(img=>/marney|logo|brand/i.test([img.alt,img.getAttribute('src'),img.className].join(' ')))||images[0];
  if(!logo)return false;
  logo.setAttribute('src',source);
  logo.removeAttribute('srcset');
  logo.alt='Logo MarketMarney';
  // No colour, typography, spacing, navigation, or container changes.
  logo.style.backgroundColor='transparent';
  return true;
 }
 function start(){
  if(apply())return;
  const observer=new MutationObserver(()=>{if(apply())observer.disconnect();});
  observer.observe(document.body,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
const CLIENT='('+client.toString()+')();';
function assets(){return new Map([
 ['/assets/mm-about-logo-only-v1.js',{body:Buffer.from(CLIENT,'utf8'),mime:'text/javascript; charset=utf-8'}]
]);}
function injectHtml(html,pathname){
 if(pathname!=='/about.html'||typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-mm-about-logo-only="'+VERSION+'"'))return html;
 const tag='<script defer src="/assets/mm-about-logo-only-v1.js?v='+VERSION+'" data-mm-about-logo-only="'+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,tag+'</head>');
}
module.exports={VERSION,SOURCE,CLIENT,assets,injectHtml};
