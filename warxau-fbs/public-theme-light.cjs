'use strict';
// Public-site first-visit policy only. Do not write to storage, account data, or War preferences.
const RELEASE='public-first-visit-light-20261108-v1';
const MARKER='/* '+RELEASE+' */';
function once(source,old,value){
 if(source.split(old).length!==2)throw Error('Public theme source changed: '+old.slice(0,60));
 return source.replace(old,value);
}
function patchPublicTheme(source){
 if(source.includes(MARKER))return source;
 let result=once(source,"let theme='dark',scheduled=false;","let theme='light',scheduled=false;");
 result=once(result,"set(valid(event.newValue)?event.newValue:'dark',false,false)","set(valid(event.newValue)?event.newValue:'light',false,false)");
 result=once(result,"if(valid(value))set(value,false,false);","set(valid(value)?value:'light',false,false);");
 return MARKER+'\n'+result;
}
const INIT="(()=>{'use strict';let t='light';try{const v=localStorage.getItem('mm_public_theme_v1');if(v==='light'||v==='dark')t=v;}catch{}document.documentElement.dataset.mmTheme=t;document.documentElement.style.colorScheme=t;})();";
function prepareHomeHtml(html){
 if(typeof html!=='string'||!html.includes('id="mmThemeSwitch"')||!/<head\b/i.test(html))return html;
 if(html.includes('id="mm-first-visit-theme"'))return html;
 let out=html.replace(/<html\b([^>]*)>/i,(_,attrs)=>'<html'+attrs.replace(/\sdata-mm-theme\s*=\s*(["']).*?\1/gi,'')+' data-mm-theme="light">');
 out=out.replace(/<meta\b(?=[^>]*name=["']theme-color["'])[^>]*>/i,'<meta name="theme-color" content="#f5f7fb">');
 out=out.replace(/<button\b([^>]*data-mm-theme-choice=["'](light|dark)["'][^>]*)>/g,(_,attrs,theme)=>'<button'+attrs.replace(/\saria-pressed=["'](?:true|false)["']/,'')+' aria-pressed="'+(theme==='light')+'">');
 const init='<script id="mm-first-visit-theme" data-release="'+RELEASE+'">'+INIT+'</script>';
 if(/<meta\b[^>]*charset\s*=/i.test(out))out=out.replace(/(<meta\b[^>]*charset\s*=[^>]*>)/i,'$1'+init);
 else out=out.replace(/(<head\b[^>]*>)/i,'$1'+init);
 return out;
}
module.exports={patchPublicTheme,prepareHomeHtml,RELEASE,INIT};
