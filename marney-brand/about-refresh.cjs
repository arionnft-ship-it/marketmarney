'use strict';
// About logo ONLY. All original dark styling, content, layout and navigation remain untouched.
const VERSION='about-m-arrow-only-20261110-v2';
const SOURCE='/assets/brand-about-transparent.webp?v='+VERSION;
function client(){
 'use strict';
 if(location.pathname!=='/about.html')return;
 const source='/assets/brand-about-transparent.webp?v=about-m-arrow-only-20261110-v2';
 function label(n){return String(n?.textContent||'').replace(/\s+/g,' ').trim();}
 // Remove only the About page's 04 / TIM section, never the adjacent community or risk sections.
 function removeTeam(){
  const nodes=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,span,p,strong,small')];
  const heading=nodes.find(n=>/^Tim\s+MarketMarney$/i.test(label(n)))||
    nodes.find(n=>/^04\s*\/\s*TIM$/i.test(label(n)));
  if(!heading)return false;
  for(let section=heading.parentElement;section&&section!==document.body&&section!==document.documentElement;section=section.parentElement){
   const content=label(section);
   if(!/04\s*\/\s*TIM/i.test(content)||!/Tim\s+MarketMarney/i.test(content))continue;
   if(!['XXXTRIAN','BEMBENG','NYOK'].every(name=>content.includes(name)))continue;
   if(/05\s*\/\s*INFORMASI|Informasi\s*&\s*Risiko|03\s*\/\s*KOMUNITAS|Tentang Social Marney/i.test(content))break;
   section.remove();
   return true;
  }
  return false;
 }
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
  removeTeam();
  if(apply())return;
  const observer=new MutationObserver(()=>{removeTeam();if(apply())observer.disconnect();});
  observer.observe(document.body,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
const CLIENT='('+client.toString()+')();';
function assets(){return new Map([
 ['/assets/mm-about-logo-only-v1.js',{body:Buffer.from(CLIENT,'utf8'),mime:'text/javascript; charset=utf-8'}]
]);}

/**
 * Remove the entire rendered 04 / TIM block from About HTML before it reaches
 * the browser. Match balanced section/div tags and require all three member
 * names; never remove sections containing community or risk information.
 * Client-side removal above remains a fallback for dynamically rendered HTML.
 */
function stripTeamHtml(html){
 if(typeof html!=='string'||!html.includes('Di balik MarketMarney'))return html;
 const masked=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,match=>' '.repeat(match.length));
 const pattern=/<\/?(section|article|div)\b[^>]*>/gi,stack=[],matches=[];
 let m;
 while((m=pattern.exec(masked))){
  const tag=m[1].toLowerCase();
  if(m[0][1]!=='/'){stack.push({tag,start:m.index});continue;}
  let index=stack.length-1;
  while(index>=0&&stack[index].tag!==tag)index--;
  if(index<0)continue;
  const node=stack[index];stack.length=index;
  const end=pattern.lastIndex,block=masked.slice(node.start,end);
  if(!/Di balik MarketMarney/i.test(block))continue;
  if(!['XXXTRIAN','BEMBENG','NYOK'].every(name=>block.includes(name)))continue;
  if(/05\s*\/\s*INFORMASI|Informasi\s*(?:&|&amp;)\s*Risiko|03\s*\/\s*KOMUNITAS|Tentang Social Marney/i.test(block))continue;
  matches.push({tag,start:node.start,end});
 }
 if(!matches.length)return html;
 const rank={section:0,article:1,div:2};
 matches.sort((a,b)=>rank[a.tag]-rank[b.tag]||a.end-a.start-(b.end-b.start));
 const block=matches[0];
 return html.slice(0,block.start)+html.slice(block.end);
}
function injectHtml(html,pathname){
 if(pathname!=='/about.html'||typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 const clean=stripTeamHtml(html);
 if(clean.includes('data-mm-about-logo-only="'+VERSION+'"'))return clean;
 const tag='<script defer src="/assets/mm-about-logo-only-v1.js?v='+VERSION+'" data-mm-about-logo-only="'+VERSION+'"></script>';
 return clean.replace(/<\/head\s*>/i,tag+'</head>');
}
module.exports={VERSION,SOURCE,CLIENT,assets,stripTeamHtml,injectHtml};
