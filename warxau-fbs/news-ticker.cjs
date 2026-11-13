'use strict';
// Provider-owned TradingView Top Stories embed. No scraping or republishing news.
// TradingView's legacy timeline script remains supported per widget documentation.
const STYLE_ID='mm-tv-news-style-v1';
const CLIENT_ID='mm-tv-news-client-v1';
const ROOT_ID='mm-tv-news-v1';
const WIDGET_SCRIPT='https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
const PROVIDER_URL='https://id.tradingview.com/news/';
const CONFIG={displayMode:'regular',feedMode:'all_symbols',colorTheme:'light',isTransparent:false,locale:'id',width:'100%',height:300};
function browserClient(){
 'use strict';
 if(document.getElementById('mm-tv-news-v1'))return;
 const widgetScript='https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
 const sourceUrl='https://id.tradingview.com/news/';
 const config={displayMode:'regular',feedMode:'all_symbols',colorTheme:'light',isTransparent:false,locale:'id',width:'100%',height:300};
 // Expand only on the homepage, so login, article and Social Marney pages stay compact.
 const autoExpand=typeof location==='undefined'||/^\/(?:index\.html)?$/.test(String(location.pathname||''));
 function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;}
 const root=el('section');
 root.id='mm-tv-news-v1';root.setAttribute('role','region');root.setAttribute('aria-label','Headline pasar TradingView');
 const strip=el('div','mm-tv-news-strip');
 const mark=el('span','mm-tv-news-mark','TV');mark.setAttribute('aria-hidden','true');
 const info=el('div','mm-tv-news-info');
 info.append(el('strong','','MARKET NEWS · TRADINGVIEW'));
 info.append(el('span','','Headline langsung dari TradingView · tanpa ticker berjalan'));
 const btn=el('button','mm-tv-news-toggle',autoExpand?'Tutup berita':'Lihat berita');btn.type='button';btn.setAttribute('aria-expanded',String(autoExpand));btn.setAttribute('aria-controls','mm-tv-news-panel');
 const link=el('a','mm-tv-news-link','Sumber');link.href=sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
 strip.append(mark,info,btn,link);
 const panel=el('div','mm-tv-news-panel');panel.id='mm-tv-news-panel';panel.hidden=!autoExpand;
 const intro=el('div','mm-tv-news-intro');
 intro.append(el('strong','','Berita Pasar Terbaru'));
 intro.append(el('p','','Diperbarui oleh TradingView. Bahasa judul mengikuti penyedia dan mungkin tidak selalu bahasa Indonesia.'));
 const host=el('div','mm-tv-news-host');
 const footer=el('div','mm-tv-news-foot');
 footer.append(el('span','','Jika widget tidak memuat berita, buka sumber TradingView. Data bukan berita buatan MarketMarney.'));
 const source=el('a','mm-tv-news-provider','Buka Berita TradingView');
 source.href=sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
 footer.append(source);panel.append(intro,host,footer);root.append(strip,panel);
 document.body.prepend(root);
 let loaded=false;
 function loadWidget(){
  if(loaded||panel.hidden)return;
  loaded=true;
  const status=el('span','mm-tv-news-status','Memuat berita…');host.append(status);
  const container=el('div','tradingview-widget-container');
  const widget=el('div','tradingview-widget-container__widget');
  container.append(widget);
  const script=el('script');
  script.src=widgetScript;script.async=true;
  script.type='text/javascript';
  script.textContent=JSON.stringify(config);
  script.onload=function(){status.textContent='Sumber: TradingView';};
  script.onerror=function(){status.textContent='Widget tidak tersedia. Gunakan tautan sumber di bawah.';};
  container.append(script);host.append(container);
 }
 btn.addEventListener('click',function(){
  panel.hidden=!panel.hidden;
  const isOpen=!panel.hidden;
  btn.textContent=isOpen?'Tutup berita':'Lihat berita';
  btn.setAttribute('aria-expanded',String(isOpen));
  if(isOpen)loadWidget();
 });
 // The panel is visible on the homepage, but external scripts do not run until
 // the widget approaches the viewport. Rendering and navigation stay responsive.
 if(autoExpand){
  if(typeof IntersectionObserver==='function'){
   const observer=new IntersectionObserver(function(entries){
    if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loadWidget();}
   },{rootMargin:'160px 0px'});
   observer.observe(panel);
  }else if(typeof setTimeout==='function')setTimeout(loadWidget,250);
  else loadWidget();
 }
}
const CSS="\n#mm-tv-news-v1{position:relative;z-index:9998;width:100%;background:#0c1623;color:#f5f7fb;border-bottom:1px solid #de974666;font-family:system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}\n#mm-tv-news-v1 *{box-sizing:border-box}\n#mm-tv-news-v1 .mm-tv-news-strip{display:flex;align-items:center;gap:11px;min-height:54px;padding:7px clamp(12px,2.5vw,28px)}\n#mm-tv-news-v1 .mm-tv-news-mark{display:flex;align-items:center;justify-content:center;flex:none;width:35px;height:35px;border-radius:10px;background:#ec9d34;color:#172337;font-size:12px;font-weight:900}\n#mm-tv-news-v1 .mm-tv-news-info{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}\n#mm-tv-news-v1 .mm-tv-news-info strong{font-size:12px;font-weight:850;letter-spacing:.04em}\n#mm-tv-news-v1 .mm-tv-news-info span{color:#b5c0d1;font-size:11px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#mm-tv-news-v1 .mm-tv-news-toggle{flex:none;min-height:34px;background:#253247;color:#ffdbad;border:1px solid #dba562;border-radius:9px;padding:7px 13px;font:750 12px/1.2 system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif;cursor:pointer}\n#mm-tv-news-v1 .mm-tv-news-toggle:hover{background:#36455b;color:white}\n#mm-tv-news-v1 .mm-tv-news-link{flex:none;font-size:11px;font-weight:800;color:#f8ca91;text-decoration:none}\n#mm-tv-news-v1 .mm-tv-news-link:hover{text-decoration:underline;color:#fff}\n#mm-tv-news-v1 .mm-tv-news-toggle:focus-visible,#mm-tv-news-v1 a:focus-visible{outline:2px solid #ffb45e;outline-offset:3px}\n#mm-tv-news-v1 .mm-tv-news-panel{width:calc(100% - 24px);max-width:980px;margin:0 auto 16px;border-radius:15px;border:1px solid #dae2eb;overflow:hidden;background:#fff;color:#23344a}\n#mm-tv-news-v1 .mm-tv-news-panel[hidden]{display:none!important}\n#mm-tv-news-v1 .mm-tv-news-intro{padding:12px 16px;border-bottom:1px solid #e6ebf1;background:#f8fafc}\n#mm-tv-news-v1 .mm-tv-news-intro strong{display:block;color:#1d344b;font-size:14px}\n#mm-tv-news-v1 .mm-tv-news-intro p{font-size:12px;line-height:1.6;color:#69798b;margin:4px 0 0}\n#mm-tv-news-v1 .mm-tv-news-host{min-height:270px;height:300px;width:100%;overflow:hidden;background:#fff;position:relative}\n#mm-tv-news-v1 .tradingview-widget-container{width:100%;height:100%;background:#fff}\n#mm-tv-news-v1 .tradingview-widget-container__widget{width:100%;height:100%}\n#mm-tv-news-v1 .mm-tv-news-foot{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid #e4eaf1;background:#f8fafc}\n#mm-tv-news-v1 .mm-tv-news-foot span{font-size:11px;line-height:1.5;color:#65768a}\n#mm-tv-news-v1 .mm-tv-news-provider{font-size:12px;font-weight:800;white-space:nowrap;color:#9d5e18;text-decoration:none}\n#mm-tv-news-v1 .mm-tv-news-provider:hover{text-decoration:underline}\n#mm-tv-news-v1 .mm-tv-news-status{position:absolute;top:8px;right:8px;z-index:2;font-size:10px;background:#ffffffdc;color:#6e7989;padding:4px 6px;border-radius:5px;pointer-events:none}\n@media(max-width:650px){#mm-tv-news-v1 .mm-tv-news-strip{padding:7px 10px;gap:8px}#mm-tv-news-v1 .mm-tv-news-mark{width:31px;height:31px;font-size:11px}#mm-tv-news-v1 .mm-tv-news-info strong{font-size:11px}#mm-tv-news-v1 .mm-tv-news-info span{font-size:10px}#mm-tv-news-v1 .mm-tv-news-toggle{padding:7px 9px;font-size:11px}#mm-tv-news-v1 .mm-tv-news-link{font-size:10px}#mm-tv-news-v1 .mm-tv-news-host{height:260px;min-height:260px}#mm-tv-news-v1 .mm-tv-news-foot{flex-direction:column;align-items:flex-start}}\n";

const CLIENT='('+browserClient.toString()+')();';
const STYLE='<style id="'+STYLE_ID+'">'+CSS+'</style>';
const SCRIPT='<script id="'+CLIENT_ID+'">'+CLIENT+'</script>';
function injectTickerHtml(html){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/body\s*>/i.test(html))return html;
 if(!html.includes('id="'+STYLE_ID+'"'))html=html.replace(/<\/head\s*>/i,STYLE+'</head>');
 if(!html.includes('id="'+CLIENT_ID+'"'))html=html.replace(/<\/body\s*>/i,SCRIPT+'</body>');
 return html;
}
module.exports={STYLE_ID,CLIENT_ID,ROOT_ID,WIDGET_SCRIPT,PROVIDER_URL,CONFIG,CLIENT,CSS,injectTickerHtml};
