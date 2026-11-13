'use strict';
// Only adjust the reading column on desktop. No changes to user data or server-rendered article content.
const STYLE_ID='mm-desktop-article-reading-v1';
const ARTICLE_STYLE='<style id="'+STYLE_ID+'">\n'+
  '@media screen and (min-width:1024px){\n'+
  '  #app .article .articletext{box-sizing:border-box;width:100%!important;max-width:650px!important;margin-inline:auto!important;}\n'+
  '  body>main:not(#app){box-sizing:border-box;width:min(100%,700px)!important;max-width:700px!important;padding-inline:24px!important;}\n'+
  '}\n'+
  "\n[data-mm-formatted='1']{font-size:17px!important;line-height:1.8!important;max-width:740px!important;margin-inline:auto!important}\n[data-mm-formatted='1'] p{font-size:inherit!important;line-height:inherit!important;margin:0 0 1.3em!important;overflow-wrap:anywhere}\n[data-mm-formatted='1'] h2{font-size:1.35em!important;font-weight:750!important;line-height:1.35!important;margin:1.8em 0 .75em!important}\n[data-mm-formatted='1'] h3{font-size:1.15em!important;font-weight:750!important;margin:1.7em 0 .75em!important}\n[data-mm-formatted='1'] .mm-disclaimer{font-size:.9em!important;opacity:.75;border-top:1px solid #aaa;padding-top:1em}\n"+
  '</style>';
function isCanonicalArticlePath(urlPath){
 return /^\/berita\/[^/?#]+(?:\/[^/?#]*)?\/?$/.test(String(urlPath||''));
}
const ARTICLE_POLISH_SCRIPT="<script id=\"mm-global-news-polish-v1\">(function(){'use strict';\nif(!location.pathname.includes('/berita/mm-editorial-fb17f057e34a2a830d91d723'))return;\nconst heads=['SMIC: PERMINTAAN CHIP AI MASIH KUAT','XI JINPING AKAN MEMIMPIN KTT APEC 2026','THE FED: EKONOMI AS MENUNJUKKAN POLA BERBENTUK K','INVESTASI AI DAN SUKU BUNGA','POTENSI DAMPAK TERHADAP MARKET','SUMBER:'];\nfunction add(root,fragment,part){for(const t of part.split(/\\n\\s*\\n/).map(x=>x.trim()).filter(Boolean)){const p=document.createElement('p');p.textContent=t;if(t.startsWith('Disclaimer:'))p.className='mm-disclaimer';fragment.append(p);}}\nfunction fix(){const root=document.querySelector('#app .article .articletext')||document.querySelector('.article .articletext')||document.querySelector('main .articletext');if(!root||root.dataset.mmFormatted==='1')return;\nconst all=[...root.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean).join('\\n\\n').replaceAll('<p>','\\n\\n').replaceAll('</p>','\\n\\n');if(!all.includes(heads[0])||!all.includes(heads[1])||!all.includes(heads[2]))return;\nconst fragment=document.createDocumentFragment();let cursor=0;for(const h of heads){const index=all.indexOf(h,cursor);if(index<0)continue;add(root,fragment,all.slice(cursor,index));const tag=document.createElement(h==='SUMBER:'?'h3':'h2');tag.textContent=h==='SUMBER:'?'Sumber Berita':h;fragment.append(tag);cursor=index+h.length;}add(root,fragment,all.slice(cursor));root.replaceChildren(fragment);root.dataset.mmFormatted='1';}\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();\nconst obs=new MutationObserver(()=>{if(document.querySelector('[data-mm-formatted=\"1\"]')){obs.disconnect();return;}fix()});obs.observe(document.documentElement,{childList:true,subtree:true});\n})();</script>";
function injectReadingWidthStyle(html){
 if(typeof html!=='string'||html.includes('id="'+STYLE_ID+'"'))return html;
 const pos=html.search(/<\/head\s*>/i);
 if(pos<0)return html;
 let next=html.slice(0,pos)+ARTICLE_STYLE+html.slice(pos);
 if(html.includes('mm-editorial-fb17f057e34a2a830d91d723')&&!html.includes('mm-global-news-polish-v1')){const close=next.search(/<\/body\s*>/i);if(close>=0)next=next.slice(0,close)+ARTICLE_POLISH_SCRIPT+next.slice(close)}
 return next;
}
module.exports={STYLE_ID,ARTICLE_STYLE,isCanonicalArticlePath,injectReadingWidthStyle,ARTICLE_POLISH_SCRIPT};
