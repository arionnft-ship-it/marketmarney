'use strict';
// Isolated public About-page appearance refresh. No application or data changes.
const VERSION='about-light-refresh-20261110-v1';
const CSS=[
'html:has(body.mm-about-modern){color-scheme:light!important;background:#f5f7fb!important}',
'body.mm-about-modern{background:#f5f7fb!important;color:#172638!important;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif!important}',
'body.mm-about-modern main{color:#172638!important}',
'body.mm-about-modern [data-mm-about-hero]{background:linear-gradient(130deg,#fff 0%,#fff 63%,#fff7ed 100%)!important;color:#172638!important;border:1px solid #e2e8f0!important;border-radius:24px!important;box-shadow:0 14px 42px rgba(25,40,55,.065)!important;padding:clamp(23px,4vw,53px)!important;overflow:hidden}',
'body.mm-about-modern [data-mm-about-hero] h1,body.mm-about-modern [data-mm-about-hero] h2{color:#162638!important;font-size:clamp(32px,3.7vw,56px)!important;line-height:1.13!important;letter-spacing:-.042em!important;font-weight:800!important}',
'body.mm-about-modern [data-mm-about-hero] h1 span,body.mm-about-modern [data-mm-about-hero] h1 em,body.mm-about-modern [data-mm-about-hero] h1 strong{color:#dc841a!important}',
'body.mm-about-modern [data-mm-about-hero] p{color:#536477!important;font-size:clamp(14px,1.1vw,16px)!important;line-height:1.85!important;max-width:675px}',
'body.mm-about-modern [data-mm-about-hero] small{color:#b56a16!important}',
'body.mm-about-modern [data-mm-about-logo-panel]{background:linear-gradient(145deg,#fff,#f8fafc)!important;border:1px solid #e6ebf1!important;border-radius:19px!important;box-shadow:0 8px 25px rgba(20,35,50,.04)!important;min-width:0!important}',
'body.mm-about-modern [data-mm-about-logo-panel] img{display:block!important;width:auto!important;height:auto!important;max-width:min(78%,230px)!important;max-height:210px!important;margin:18px auto!important;object-fit:contain!important;background:transparent!important;border:0!important;box-shadow:none!important}',
'body.mm-about-modern [data-mm-about-logo-panel] p,body.mm-about-modern [data-mm-about-logo-panel] small{color:#64748b!important}',
'body.mm-about-modern [data-mm-about-nav]{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;padding:12px 0!important;margin:18px 0 26px!important;background:transparent!important;border-bottom:1px solid #e5eaf1!important}',
'body.mm-about-modern [data-mm-about-nav]> *{min-width:0!important;color:#37475a!important;background:transparent!important;border:1px solid transparent!important;border-radius:11px!important;padding:13px 11px!important;text-decoration:none!important}',
'body.mm-about-modern [data-mm-about-nav]> *:hover,body.mm-about-modern [data-mm-about-nav]> *:focus-visible{color:#ad6419!important;background:#fff0db!important;border-color:#f7d6a7!important}',
'body.mm-about-modern [data-mm-about-section]{color:#233449!important;background:#fff!important;border:1px solid #e4e9ef!important;border-radius:19px!important;box-shadow:0 7px 25px rgba(20,40,60,.035)!important;padding:clamp(20px,2.4vw,35px)!important}',
'body.mm-about-modern [data-mm-about-section] h2,body.mm-about-modern [data-mm-about-section] h3{color:#172638!important}',
'body.mm-about-modern [data-mm-about-section] p{color:#546578!important;line-height:1.8!important}',
'body.mm-about-modern a{scroll-margin-top:88px}',
'@media(max-width:960px){body.mm-about-modern [data-mm-about-hero]{padding:28px!important}body.mm-about-modern [data-mm-about-nav]{display:flex!important;overflow-x:auto!important;scroll-snap-type:x proximity}body.mm-about-modern [data-mm-about-nav]>*{flex:0 0 auto!important;white-space:nowrap!important;scroll-snap-align:start}}',
'@media(max-width:640px){body.mm-about-modern [data-mm-about-hero]{padding:23px 19px!important;border-radius:18px!important}body.mm-about-modern [data-mm-about-hero] h1{font-size:clamp(29px,8.3vw,40px)!important}body.mm-about-modern [data-mm-about-logo-panel]{margin-top:18px!important}body.mm-about-modern [data-mm-about-section]{border-radius:15px!important;padding:20px!important}}',
'@media(prefers-reduced-motion:reduce){body.mm-about-modern [data-mm-about-nav]>*{transition:none!important}}'
].join('\n');
function browserClient(){
 'use strict';
 if(location.pathname!=='/about.html')return;
 function txt(n){return(n&&n.textContent||'').replace(/\s+/g,' ').trim();}
 function init(){
  document.body.classList.add('mm-about-modern');
  const headings=[...document.querySelectorAll('h1,h2,h3')];
  const heading=headings.find(n=>/informasi pasar/i.test(txt(n))&&/perspektif lebih luas/i.test(txt(n.parentElement)))||headings.find(n=>/informasi pasar|perspektif lebih luas/i.test(txt(n)));
  if(heading){
   const hero=heading.closest('section,article,[class*="hero"],[class*="intro"]')||heading.parentElement?.parentElement?.parentElement;
   if(hero&&hero!==document.body){
    hero.setAttribute('data-mm-about-hero','');
    const images=[...hero.querySelectorAll('img')].filter(i=>!i.closest('nav,header'));
    const logo=images.find(i=>/marketmarney|marney|brand|logo/i.test([i.alt,i.getAttribute('src'),i.className].join(' ')))||images[0];
    if(logo){
     logo.src='/assets/brand-logo.webp?v=marney-20261109-new-logo-r1';
     logo.removeAttribute('srcset');logo.alt='Logo MarketMarney';
     let card=logo.parentElement;
     for(let i=0;i<4&&card&&card!==hero;i++,card=card.parentElement){
      if(txt(card).length>15&&txt(card).length<280&&card.querySelectorAll('img').length===1)break;
     }
     if(card&&card!==hero)card.setAttribute('data-mm-about-logo-panel','');
    }
   }
  }
  const keys=['platform','visi kami','social marney','tim','informasi & risiko'];
  const links=[...document.querySelectorAll('a,button')].filter(n=>keys.some(k=>txt(n).toLowerCase().includes(k)));
  const first=links.find(n=>/platform/i.test(txt(n)));
  if(first){
   let nav=first.parentElement;
   for(let i=0;i<5&&nav&&!/^(BODY|MAIN)$/.test(nav.tagName);i++,nav=nav.parentElement){
    if(links.filter(x=>nav.contains(x)).length>=4){nav.setAttribute('data-mm-about-nav','');break;}
   }
  }
  for(const h of headings){
   if(h===heading||!/^(platform|visi kami|social marney|tim|informasi\s*(?:&|dan)\s*risiko)$/i.test(txt(h)))continue;
   const sect=h.closest('section,article');
   if(sect&&sect!==document.body&&!sect.hasAttribute('data-mm-about-hero'))sect.setAttribute('data-mm-about-section','');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
const CLIENT='('+browserClient.toString()+')();';
const path=require('node:path'),fs=require('node:fs');
function assets(){
 return new Map([
 ['/assets/mm-about-modern-v1.css',{body:Buffer.from(CSS),mime:'text/css; charset=utf-8'}],
 ['/assets/mm-about-modern-v1.js',{body:Buffer.from(CLIENT),mime:'text/javascript; charset=utf-8'}]
 ]);
}
function injectHtml(html,pathname){
 if(pathname!=='/about.html'||typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-mm-about-modern="'+VERSION+'"'))return html;
 const tags='<link rel="stylesheet" href="/assets/mm-about-modern-v1.css?v='+VERSION+'" data-mm-about-modern="'+VERSION+'"><script defer src="/assets/mm-about-modern-v1.js?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,tags+'</head>');
}
module.exports={VERSION,CSS,CLIENT,assets,injectHtml};
