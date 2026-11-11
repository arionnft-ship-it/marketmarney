'use strict';
// Purely visual stylesheet for MarketMarney TV listings and player; no video or site-data mutation.
const VERSION='mm-tv-layout-20261111-v2';
const ASSET='/assets/mm-tv-layout-v1.css';
const CSS=String.raw`
/* MarketMarney TV - light responsive editorial layout. This only styles TV-specific nodes. */
body:has(.mm-tv-filters) .pagehead,body:has(#tvMount) .pagehead{
 max-width:1220px;margin:0 auto 20px!important;padding:clamp(22px,3vw,36px)!important;
 border:1px solid #e3e8ef!important;border-radius:20px!important;
 background:linear-gradient(125deg,#fff 0%,#fff 60%,#fff8ed 100%)!important;
 box-shadow:0 8px 25px rgba(18,36,54,.04)!important}
body:has(.mm-tv-filters) .pagehead .eyebrow,body:has(#tvMount) .pagehead .eyebrow{
 color:#ae691c!important;font-size:11px!important;font-weight:800!important;letter-spacing:.12em!important}
body:has(.mm-tv-filters) .pagehead h1,body:has(#tvMount) .pagehead h1{
 font-size:clamp(27px,3.4vw,40px)!important;line-height:1.18!important;
 margin:6px 0 10px!important;letter-spacing:-.035em!important;color:#192b40!important}
body:has(.mm-tv-filters) .pagehead p,body:has(#tvMount) .pagehead p{
 color:#64748b!important;max-width:770px!important;font-size:14px!important;line-height:1.7!important}
.mm-tv-filters{
 display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:9px!important;
 width:100%!important;max-width:1220px!important;margin:0 auto 22px!important;
 padding:2px 0 8px!important;background:transparent!important;border:0!important}
.mm-tv-filters button{
 flex:0 0 auto!important;white-space:nowrap!important;
 font-family:inherit!important;font-size:13px!important;font-weight:700!important;line-height:1.4!important;
 color:#50637a!important;background:#fff!important;border:1px solid #dce4ed!important;
 border-radius:999px!important;padding:10px 17px!important;min-height:39px!important;
 cursor:pointer!important;box-shadow:none!important;
 transition:background-color .16s,border-color .16s,color .16s!important}
.mm-tv-filters button.active{background:#f3a13c!important;border-color:#f3a13c!important;color:#19293b!important;
 box-shadow:0 3px 12px rgba(227,136,34,.12)!important}
.mm-tv-filters button:hover{background:#fff2dd!important;border-color:#f0be7f!important;color:#a75e16!important}
.mm-tv-grid{
 display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;
 gap:clamp(14px,2vw,22px)!important;align-items:stretch!important;
 max-width:1220px!important;width:100%!important;margin:0 auto 42px!important}
.mm-tv-grid .mm-tv-card{
 display:flex!important;flex-direction:column!important;min-width:0!important;
 overflow:hidden!important;background:#fff!important;border:1px solid #e2e8f0!important;
 border-radius:17px!important;box-shadow:0 7px 24px rgba(18,37,55,.065)!important;
 cursor:pointer!important;transition:transform .18s,box-shadow .18s,border-color .18s!important}
.mm-tv-grid .mm-tv-card:hover{
 transform:translateY(-3px)!important;border-color:#edc28d!important;
 box-shadow:0 13px 31px rgba(18,37,55,.11)!important}
.mm-tv-grid .mm-tv-thumb{
 position:relative!important;display:block!important;flex:none!important;
 width:100%!important;height:auto!important;min-height:0!important;
 aspect-ratio:16/9!important;overflow:hidden!important;
 background:#111b2b!important;border-radius:0!important;margin:0!important}
.mm-tv-grid .mm-tv-thumb img{
 position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
 display:block!important;object-fit:cover!important;min-height:0!important;
 margin:0!important;border:0!important;border-radius:0!important}
.mm-tv-grid .mm-tv-play{
 position:absolute!important;z-index:2!important;top:50%!important;left:50%!important;
 transform:translate(-50%,-50%)!important;display:flex!important;align-items:center!important;justify-content:center!important;
 width:50px!important;height:50px!important;border:1px solid #ffffff8c!important;border-radius:50%!important;
 background:#132033e0!important;color:#fff!important;font-size:18px!important;
 box-shadow:0 3px 15px #0004!important}
.mm-tv-grid .mm-tv-info{
 flex:1 1 auto!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;
 gap:9px!important;padding:16px 18px 19px!important;background:#fff!important;color:#203145!important}
.mm-tv-grid .mm-tv-chip{
 display:inline-block!important;max-width:100%!important;
 background:#fff1de!important;border:1px solid #f5dfc2!important;color:#a46117!important;
 border-radius:999px!important;padding:5px 10px!important;font-size:10px!important;
 letter-spacing:.07em!important;font-weight:800!important;line-height:1.4!important}
.mm-tv-grid .mm-tv-info h3{
 display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
 overflow:hidden!important;margin:0!important;
 font-size:clamp(16px,1.27vw,18px)!important;font-weight:760!important;
 line-height:1.46!important;letter-spacing:-.01em!important;color:#17283e!important}
.mm-tv-grid .mm-tv-info p.muted{
 display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
 overflow:hidden!important;margin:0!important;
 font-size:12.5px!important;color:#69778a!important;line-height:1.65!important;overflow-wrap:anywhere!important}
.mm-tv-empty{
 max-width:1220px!important;margin:0 auto 40px!important;padding:42px 24px!important;
 background:#fff!important;color:#64748b!important;border:1px dashed #d8e0e9!important;
 border-radius:16px!important;text-align:center!important}
#tvBack{
 display:inline-flex!important;align-items:center!important;justify-content:center!important;
 padding:11px 17px!important;min-height:41px!important;margin:0 0 18px!important;
 font-size:12px!important;font-weight:800!important;line-height:1.3!important;
 color:#99591a!important;background:#fff8ee!important;
 border:1px solid #eacda6!important;border-radius:11px!important;box-shadow:none!important}
#tvBack:hover{background:#ffefd9!important;border-color:#eab879!important}
body:has(#tvMount) #tvBack + h2{
 margin:0 0 18px!important;max-width:1150px!important;
 font-size:clamp(20px,2.35vw,29px)!important;font-weight:780!important;
 line-height:1.35!important;color:#172b40!important;letter-spacing:-.02em!important;overflow-wrap:anywhere!important}
#tvMount.mm-tv-player{
 position:relative!important;display:block!important;overflow:hidden!important;
 width:100%!important;max-width:1150px!important;min-height:0!important;
 height:auto!important;max-height:none!important;aspect-ratio:16/9!important;
 margin:0 0 18px!important;background:#080e1b!important;border:1px solid #243046!important;
 border-radius:18px!important;box-shadow:0 13px 35px rgba(10,26,42,.15)!important}
#tvMount.mm-tv-player > iframe,#tvMount.mm-tv-player > video{
 position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
 max-width:none!important;max-height:none!important;display:block!important;
 padding:0!important;margin:0!important;border:0!important;background:#000!important;object-fit:contain!important}
#tvMount + p.muted{
 max-width:1100px!important;margin:0 0 30px!important;
 padding:15px 17px!important;background:#fff!important;border:1px solid #e4e9ef!important;
 border-radius:12px!important;color:#64748b!important;font-size:13px!important;line-height:1.65!important}
.mm-tv-filters button:focus-visible,.mm-tv-grid .mm-tv-card:focus-visible,#tvBack:focus-visible{
 outline:3px solid #e89427!important;outline-offset:3px!important}
@media(max-width:1080px){.mm-tv-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:650px){
 body:has(.mm-tv-filters) .pagehead,body:has(#tvMount) .pagehead{
  padding:21px 17px!important;border-radius:15px!important;margin-bottom:17px!important}
 .mm-tv-filters{flex-wrap:nowrap!important;overflow-x:auto!important;scroll-snap-type:x proximity!important;
  overscroll-behavior-inline:contain!important;scrollbar-width:thin!important;
  gap:7px!important;padding-bottom:13px!important}
 .mm-tv-filters button{scroll-snap-align:start!important;padding:9px 14px!important}
 .mm-tv-grid{grid-template-columns:minmax(0,1fr)!important;gap:16px!important}
 .mm-tv-grid .mm-tv-info{padding:15px 16px 18px!important}
 #tvMount.mm-tv-player{border-radius:12px!important}
 #tvMount + p.muted{padding:13px!important}
}
@media(prefers-reduced-motion:reduce){
 .mm-tv-filters button,.mm-tv-grid .mm-tv-card{transition:none!important}
 .mm-tv-grid .mm-tv-card:hover{transform:none!important}
}

/* Remove the MarketMarney TV category row only; all videos remain available. */
.mm-tv-filters{display:none!important}
`;
function injectHtml(html,pathname){
 if(pathname!=="/"&&pathname!=="/index.html")return html;
 if(typeof html!=="string"||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-mm-tv-layout="'+VERSION+'"'))return html;
 const tag='<link rel="stylesheet" href="'+ASSET+'?v='+VERSION+'" data-mm-tv-layout="'+VERSION+'">';
 return html.replace(/<\/head\s*>/i,tag+"</head>");
}
function assets(){return new Map([[ASSET,{body:Buffer.from(CSS,"utf8"),mime:"text/css; charset=utf-8"}]]);}
module.exports={VERSION,ASSET,CSS,injectHtml,assets};
