'use strict';
// FinancialJuice official Headlines widget (publisher-provided iframe).
// This intentionally does NOT scrape X, copy posts, or claim auto-translation.
const STYLE_ID='mm-fj-headlines-style-v2';
const CLIENT_ID='mm-fj-headlines-client-v2';
const ROOT_ID='mm-fj-headlines-v2';
const HEADLINES_URL='https://feed.financialjuice.com/widgets/headlines.aspx?affurl=&backC=1e222d&container=financialjuice-news-widget-container&fontC=b2b5be&height=100%25&mode=Dark&width=100%25&wtype=NEWS';
const PROVIDER_URL='https://www.financialjuice.com/widgets/get-widget.aspx';
const PROFILE_URL='https://x.com/financialjuice';
function browserClient(){
 'use strict';
 if(document.getElementById('mm-fj-headlines-v2'))return;
 function el(tag,cls,text){
  const o=document.createElement(tag);
  if(cls)o.className=cls;
  if(text!==undefined)o.textContent=String(text);
  return o;
 }
 const section=el('section');
 section.id='mm-fj-headlines-v2';
 section.setAttribute('role','region');
 section.setAttribute('aria-label','Berita resmi FinancialJuice');
 const bar=el('div','mm-fj-bar');
 const mark=el('span','mm-fj-mark','FJ');
 mark.setAttribute('aria-hidden','true');
 const copy=el('div','mm-fj-copy');
 copy.append(el('strong','','FINANCIALJUICE NEWS'));
 copy.append(el('span','','Headline finansial dari widget resmi FinancialJuice'));
 const toggle=el('button','mm-fj-toggle','Baca berita');
 toggle.type='button';
 toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-controls','mm-fj-headlines-panel');
 const xlink=el('a','mm-fj-link','Akun X');
 xlink.href='https://x.com/financialjuice';
 xlink.target='_blank';xlink.rel='noopener noreferrer';
 xlink.title='Lihat akun FinancialJuice di X';
 bar.append(mark,copy,toggle,xlink);
 const panel=el('div','mm-fj-panel');
 panel.id='mm-fj-headlines-panel';panel.hidden=true;
 const intro=el('div','mm-fj-intro');
 intro.append(el('strong','','Headline pasar FinancialJuice'));
 intro.append(el('p','','Sumber resmi FinancialJuice. Ditampilkan dalam bahasa aslinya; pembaruan dan ketersediaan berita mengikuti penyedia.'));
 const shell=el('div','mm-fj-frame-shell');
 const foot=el('div','mm-fj-bottom');
 foot.append(el('span','','Jika daftar berita tidak tampil, buka halaman widget resmi FinancialJuice. MarketMarney tidak mengubah isi beritanya.'));
 const source=el('a','mm-fj-provider','Buka FinancialJuice');
 source.href='https://www.financialjuice.com/widgets/get-widget.aspx';
 source.target='_blank';source.rel='noopener noreferrer';
 foot.append(source);
 panel.append(intro,shell,foot);
 section.append(bar,panel);
 document.body.prepend(section);
 let loaded=false;
 toggle.addEventListener('click',function(){
  panel.hidden=!panel.hidden;
  const opened=!panel.hidden;
  toggle.textContent=opened?'Tutup berita':'Baca berita';
  toggle.setAttribute('aria-expanded',String(opened));
  if(!opened||loaded)return;
  loaded=true;
  const iframe=el('iframe','mm-fj-headlines-frame');
  iframe.src='https://feed.financialjuice.com/widgets/headlines.aspx?affurl=&backC=1e222d&container=financialjuice-news-widget-container&fontC=b2b5be&height=100%25&mode=Dark&width=100%25&wtype=NEWS';
  iframe.title='Widget headline resmi FinancialJuice';
  iframe.loading='lazy';
  iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
  iframe.setAttribute('scrolling','yes');
  shell.appendChild(iframe);
 });
}
const CSS="\n#mm-fj-headlines-v2{box-sizing:border-box;position:relative;z-index:9999;width:100%;background:#0e1827;color:#f8fafc;border-bottom:1px solid rgba(242,159,59,.48);font-family:system-ui,-apple-system,\"Segoe UI\",Arial,sans-serif}\n#mm-fj-headlines-v2 *{box-sizing:border-box}\n#mm-fj-headlines-v2 .mm-fj-bar{display:flex;align-items:center;gap:11px;padding:8px clamp(12px,2.4vw,30px);min-height:52px;width:100%}\n#mm-fj-headlines-v2 .mm-fj-mark{flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#f9a438;color:#182535;font-size:12px;font-weight:900;border-radius:9px;letter-spacing:-.02em}\n#mm-fj-headlines-v2 .mm-fj-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}\n#mm-fj-headlines-v2 .mm-fj-copy strong{font-size:12px;color:#fff;font-weight:850;line-height:1.25;letter-spacing:.02em}\n#mm-fj-headlines-v2 .mm-fj-copy span{font-size:11px;color:#aebed0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#mm-fj-headlines-v2 .mm-fj-toggle{flex:none;min-height:35px;padding:8px 13px;border:1px solid #e6a154;border-radius:9px;background:#243247;color:#ffdbac;color-scheme:dark;font:750 12px/1.25 system-ui,-apple-system,\"Segoe UI\",sans-serif;cursor:pointer}\n#mm-fj-headlines-v2 .mm-fj-toggle:hover{background:#37465c;color:#fff}\n#mm-fj-headlines-v2 .mm-fj-link{flex:none;color:#f4c184;font-weight:800;font-size:11px;text-decoration:none;padding:5px}\n#mm-fj-headlines-v2 .mm-fj-link:hover{text-decoration:underline;color:#fff}\n#mm-fj-headlines-v2 .mm-fj-toggle:focus-visible,#mm-fj-headlines-v2 .mm-fj-link:focus-visible,#mm-fj-headlines-v2 .mm-fj-provider:focus-visible{outline:2px solid #ffbd71;outline-offset:2px}\n#mm-fj-headlines-v2 .mm-fj-panel{max-width:970px;width:calc(100% - 24px);margin:0 auto 15px;border:1px solid #d8e1ed;border-radius:15px;overflow:hidden;background:#fff;color:#192d45}\n#mm-fj-headlines-v2 .mm-fj-panel[hidden]{display:none!important}\n#mm-fj-headlines-v2 .mm-fj-intro{padding:13px 16px;background:#f7f9fc;border-bottom:1px solid #e5ebf2}\n#mm-fj-headlines-v2 .mm-fj-intro strong{display:block;font-size:14px;color:#182e44;font-weight:800}\n#mm-fj-headlines-v2 .mm-fj-intro p{font-size:12px;margin:4px 0 0;line-height:1.55;color:#6b7a8b}\n#mm-fj-headlines-v2 .mm-fj-frame-shell{height:360px;min-height:240px;position:relative;background:#1e222d}\n#mm-fj-headlines-v2 .mm-fj-headlines-frame{display:block;width:100%;height:100%;border:0;background:#1e222d}\n#mm-fj-headlines-v2 .mm-fj-bottom{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f8fafc;border-top:1px solid #e3e9f0}\n#mm-fj-headlines-v2 .mm-fj-bottom span{font-size:11px;line-height:1.5;color:#61758a;min-width:0}\n#mm-fj-headlines-v2 .mm-fj-provider{flex:none;color:#925813;text-decoration:none;font-weight:800;font-size:12px}\n#mm-fj-headlines-v2 .mm-fj-provider:hover{text-decoration:underline}\n@media(max-width:620px){\n #mm-fj-headlines-v2 .mm-fj-bar{gap:8px;padding:8px 10px}\n #mm-fj-headlines-v2 .mm-fj-mark{width:30px;height:30px}\n #mm-fj-headlines-v2 .mm-fj-copy strong{font-size:11px}\n #mm-fj-headlines-v2 .mm-fj-copy span{font-size:10px}\n #mm-fj-headlines-v2 .mm-fj-toggle{min-height:33px;padding:7px 9px;font-size:11px}\n #mm-fj-headlines-v2 .mm-fj-link{font-size:10px}\n #mm-fj-headlines-v2 .mm-fj-frame-shell{height:340px}\n #mm-fj-headlines-v2 .mm-fj-bottom{align-items:flex-start;flex-direction:column;gap:7px}\n}\n";

const CLIENT='('+browserClient.toString()+')();';
const STYLE='<style id="'+STYLE_ID+'">'+CSS+'</style>';
const SCRIPT='<script id="'+CLIENT_ID+'">'+CLIENT+'</script>';
function injectTickerHtml(html){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/body\s*>/i.test(html))return html;
 if(!html.includes('id="'+STYLE_ID+'"'))html=html.replace(/<\/head\s*>/i,STYLE+'</head>');
 if(!html.includes('id="'+CLIENT_ID+'"'))html=html.replace(/<\/body\s*>/i,SCRIPT+'</body>');
 return html;
}
module.exports={STYLE_ID,CLIENT_ID,ROOT_ID,HEADLINES_URL,PROVIDER_URL,PROFILE_URL,CLIENT,CSS,injectTickerHtml};
