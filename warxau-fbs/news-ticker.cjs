'use strict';
// Official X embedded public profile — no scraping, unauthorized text copying,
// synthetic tweets, automatic translation claims, or X API credentials.
const STYLE_ID='mm-fj-x-style-v1';
const CLIENT_ID='mm-fj-x-client-v1';
const ROOT_ID='mm-fj-x-feed-v1';
const EMBED_URL='https://x.com/financialjuice';
const PROVIDER_URL='https://x.com/financialjuice';
const WIDGET_SCRIPT='https://platform.twitter.com/widgets.js';
function client(){
 'use strict';
 if(document.getElementById('mm-fj-x-feed-v1'))return;
 const root=document.createElement('section');
 root.id='mm-fj-x-feed-v1';
 root.setAttribute('role','region');
 root.setAttribute('aria-label','Berita pasar resmi FinancialJuice dari X');
 const strip=document.createElement('div');
 strip.className='mm-fj-strip';
 const mark=document.createElement('span');
 mark.className='mm-fj-mark';mark.setAttribute('aria-hidden','true');mark.textContent='X';
 const copy=document.createElement('div');
 copy.className='mm-fj-copy';
 const name=document.createElement('strong');
 name.textContent='FINANCIALJUICE · X';
 const subtitle=document.createElement('span');
 subtitle.textContent='Berita finansial dari akun resmi @financialjuice';
 copy.append(name,subtitle);
 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='mm-fj-show';
 toggle.textContent='Lihat berita';toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-controls','mm-fj-x-timeline');
 const link=document.createElement('a');
 link.className='mm-fj-link';
 link.href='https://x.com/financialjuice';
 link.target='_blank';link.rel='noopener noreferrer';
 link.textContent='Buka X';link.title='Buka akun FinancialJuice di X';
 strip.append(mark,copy,toggle,link);
 const panel=document.createElement('div');
 panel.id='mm-fj-x-timeline';panel.className='mm-fj-panel';panel.hidden=true;
 const header=document.createElement('div');
 header.className='mm-fj-panel-heading';
 const headLabel=document.createElement('strong');
 headLabel.textContent='Postingan terbaru FinancialJuice';
 const notice=document.createElement('small');
 notice.textContent='Feed resmi X. Postingan tetap dalam bahasa aslinya; ketersediaan dan urutan diatur X.';
 header.append(headLabel,notice);
 const shell=document.createElement('div');
 shell.className='mm-fj-timeline-shell';
 const anchor=document.createElement('a');
 anchor.className='twitter-timeline';
 anchor.href='https://x.com/financialjuice';
 anchor.textContent='Baca postingan FinancialJuice (@financialjuice) di X';
 anchor.setAttribute('data-theme','light');
 anchor.setAttribute('data-height','460');
 anchor.setAttribute('data-dnt','true');
 anchor.setAttribute('data-lang','id');
 shell.appendChild(anchor);
 const footer=document.createElement('div');
 footer.className='mm-fj-panel-foot';
 const sourceNote=document.createElement('span');
 sourceNote.textContent='Sumber: X / @financialjuice · Buka X bila feed tidak tampil.';
 const profile=document.createElement('a');
 profile.className='mm-fj-profile';
 profile.href='https://x.com/financialjuice';
 profile.target='_blank';profile.rel='noopener noreferrer';
 profile.textContent='Lihat profil di X';
 footer.append(sourceNote,profile);
 panel.append(header,shell,footer);
 root.append(strip,panel);
 document.body.prepend(root);
 let loaded=false;
 toggle.addEventListener('click',function(){
  panel.hidden=!panel.hidden;
  const open=!panel.hidden;
  toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Tutup berita':'Lihat berita';
  if(!open)return;
  if(loaded){
   if(window.twttr&&window.twttr.widgets&&window.twttr.widgets.load)window.twttr.widgets.load(panel);
   return;
  }
  loaded=true;
  const script=document.createElement('script');
  script.src='https://platform.twitter.com/widgets.js';
  script.async=true;script.charset='utf-8';
  script.setAttribute('data-mm-financialjuice-widget','v1');
  script.onload=function(){
   if(window.twttr&&window.twttr.widgets&&window.twttr.widgets.load)window.twttr.widgets.load(panel);
  };
  document.head.appendChild(script);
 });
}
const CSS="\n/* Official FinancialJuice X profile, displayed on demand. No copied tweets. */\n#mm-fj-x-feed-v1{position:relative;z-index:9998;width:100%;box-sizing:border-box;background:#0f1724;color:#f8fafc;border-bottom:1px solid #f5a33755;font-family:system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}\n#mm-fj-x-feed-v1 *{box-sizing:border-box}\n#mm-fj-x-feed-v1 .mm-fj-strip{display:flex;align-items:center;gap:12px;min-height:54px;padding:7px clamp(12px,2.4vw,34px);width:100%}\n#mm-fj-x-feed-v1 .mm-fj-mark{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border-radius:9px;background:#ffad39;color:#152236;font-weight:900;font-size:18px}\n#mm-fj-x-feed-v1 .mm-fj-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}\n#mm-fj-x-feed-v1 .mm-fj-copy strong{font-size:12px;font-weight:850;letter-spacing:.015em;line-height:1.2;color:#fff}\n#mm-fj-x-feed-v1 .mm-fj-copy span{font-size:11px;color:#abb9cb;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#mm-fj-x-feed-v1 .mm-fj-show{flex:none;min-height:34px;padding:7px 14px;border-radius:9px;border:1px solid #efb15d;background:#263244;color:#ffe0af;cursor:pointer;font:750 12px/1.25 system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}\n#mm-fj-x-feed-v1 .mm-fj-show:hover{background:#38445a;color:#fff}\n#mm-fj-x-feed-v1 .mm-fj-show:focus-visible,#mm-fj-x-feed-v1 .mm-fj-link:focus-visible,#mm-fj-x-feed-v1 .mm-fj-profile:focus-visible{outline:2px solid #ffb14d;outline-offset:2px}\n#mm-fj-x-feed-v1 .mm-fj-link{flex:none;font-size:11px;font-weight:800;color:#ffc47d;text-decoration:none}\n#mm-fj-x-feed-v1 .mm-fj-link:hover{text-decoration:underline;color:#fff}\n#mm-fj-x-feed-v1 .mm-fj-panel{max-width:860px;width:calc(100% - 28px);margin:0 auto 16px;border-radius:15px;overflow:hidden;background:#fff;color:#26384a;border:1px solid #d9e1eb}\n#mm-fj-x-feed-v1 .mm-fj-panel[hidden]{display:none!important}\n#mm-fj-x-feed-v1 .mm-fj-panel-heading{padding:13px 16px;background:#f8fafc;border-bottom:1px solid #e5eaf1}\n#mm-fj-x-feed-v1 .mm-fj-panel-heading strong{display:block;color:#172b40;font-size:14px;line-height:1.4}\n#mm-fj-x-feed-v1 .mm-fj-panel-heading small{display:block;color:#617186;font-size:12px;line-height:1.5;margin-top:4px}\n#mm-fj-x-feed-v1 .mm-fj-timeline-shell{padding:6px 10px;min-height:120px;max-height:520px;overflow-y:auto;overscroll-behavior:contain}\n#mm-fj-x-feed-v1 .mm-fj-timeline-shell .twitter-timeline{display:block;text-align:center;padding:26px 6px;font-size:13px;font-weight:700;color:#a95e14}\n#mm-fj-x-feed-v1 .mm-fj-panel-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid #e8edf3;background:#f8fafc}\n#mm-fj-x-feed-v1 .mm-fj-panel-foot span{font-size:11px;color:#6d7b8d;line-height:1.45}\n#mm-fj-x-feed-v1 .mm-fj-profile{flex:none;font-size:12px;color:#9e5c18;font-weight:800;text-decoration:none}\n#mm-fj-x-feed-v1 .mm-fj-profile:hover{text-decoration:underline}\n@media(max-width:650px){\n #mm-fj-x-feed-v1 .mm-fj-strip{gap:8px;padding:7px 10px;min-height:56px}\n #mm-fj-x-feed-v1 .mm-fj-mark{width:28px;height:28px;font-size:16px}\n #mm-fj-x-feed-v1 .mm-fj-copy strong{font-size:11px}\n #mm-fj-x-feed-v1 .mm-fj-copy span{font-size:10px}\n #mm-fj-x-feed-v1 .mm-fj-show{padding:7px 9px;font-size:11px}\n #mm-fj-x-feed-v1 .mm-fj-link{font-size:10px}\n #mm-fj-x-feed-v1 .mm-fj-timeline-shell{max-height:450px}\n #mm-fj-x-feed-v1 .mm-fj-panel-foot{align-items:flex-start;flex-direction:column}\n}\n@media(prefers-reduced-motion:reduce){#mm-fj-x-feed-v1 .mm-fj-show{transition:none}}\n";

const CLIENT='('+client.toString()+')();';
const STYLE='<style id="'+STYLE_ID+'">'+CSS+'</style>';
const SCRIPT='<script id="'+CLIENT_ID+'">'+CLIENT+'</script>';
function injectTickerHtml(html){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/body\s*>/i.test(html))return html;
 if(!html.includes('id="'+STYLE_ID+'"'))html=html.replace(/<\/head\s*>/i,STYLE+'</head>');
 if(!html.includes('id="'+CLIENT_ID+'"'))html=html.replace(/<\/body\s*>/i,SCRIPT+'</body>');
 return html;
}
module.exports={STYLE_ID,CLIENT_ID,ROOT_ID,EMBED_URL,PROVIDER_URL,WIDGET_SCRIPT,CLIENT,CSS,injectTickerHtml};
