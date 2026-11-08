'use strict';
// Only adjust the reading column on desktop. No changes to user data or server-rendered article content.
const STYLE_ID='mm-desktop-article-reading-v1';
const ARTICLE_STYLE='<style id="'+STYLE_ID+'">\n'+
  '@media screen and (min-width:1024px){\n'+
  '  #app .article .articletext{box-sizing:border-box;width:100%!important;max-width:650px!important;margin-inline:auto!important;}\n'+
  '  body>main:not(#app){box-sizing:border-box;width:min(100%,700px)!important;max-width:700px!important;padding-inline:24px!important;}\n'+
  '}\n'+
  '</style>';
function isCanonicalArticlePath(urlPath){
 return /^\/berita\/[^/?#]+(?:\/[^/?#]*)?\/?$/.test(String(urlPath||''));
}
function injectReadingWidthStyle(html){
 if(typeof html!=='string'||html.includes('id="'+STYLE_ID+'"'))return html;
 const pos=html.search(/<\/head\s*>/i);
 if(pos<0)return html;
 return html.slice(0,pos)+ARTICLE_STYLE+html.slice(pos);
}
module.exports={STYLE_ID,ARTICLE_STYLE,isCanonicalArticlePath,injectReadingWidthStyle};
