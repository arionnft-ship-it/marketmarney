'use strict';
// WarXAU Arena + Social Marney chat. Response-only overlay: no on-disk app/DB changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createWarXauPerformance}=require('./performance-warxau.cjs');
const {enhancePublicPage:enhanceXauLivePage}=require('./xau-public-live.cjs');
const VERSION='7.8-topchat',APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const APPROVED='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const PAGE='/assets/xau-war-3d.html';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function once(s,a,b){if(s.split(a).length!==2)throw Error('Chat source anchor changed');return s.replace(a,b);}
function chatSource(source){
 let s=once(source,"document.getElementById('app')","document.getElementById('warxau-social-root')");
 s=once(s,"},12000);","},3000);");
 s=once(s,'Chat teratas','Chat live');
 s=once(s,'Live Chat Market Live','Chat live XAU/USD');
 s=once(s,'Pesan Live Market','Pesan chat XAU/USD');
 s=once(s,'Diperbarui sekitar setiap 12 detik','Menghubungkan chat…');
 s=once(s,'Chat MarketMarney · Moderasi aktif','XAU/USD · Terhubung ke Market Live');
 s=once(s,'Masuk sebagai pembaca untuk berinteraksi.','Masuk ke Social Marney untuk berinteraksi.');
 s=once(s,"async function api(url,method,data){const opt=", "async function api(url,method,data){const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),8000);try{const opt=");
 s=once(s,"const r=await fetch(url,opt);","const r=await fetch(url,{...opt,signal:abort.signal});");
 s=once(s,"return d;}\n function articleTarget", "return d;}finally{clearTimeout(deadline)}}\n function articleTarget");
 const indicator="function connection(ctx,ok){const dot=ctx.el.querySelector('.mm1831-live-indicator');if(dot){dot.dataset.state=ok?'connected':'error';dot.title=ok?'Chat tersambung · diperbarui sekitar 3 detik':'Chat terputus · mencoba kembali';dot.setAttribute('aria-label',dot.title);dot.setAttribute('role','img');}}\n ";
 s=once(s,'function loginNotice(ctx)',indicator+'function loginNotice(ctx)');
 s=once(s,'ctx.user=d.user;','connection(ctx,true);ctx.user=d.user;');
 s=once(s,"if(token!==ctx.loadToken)return;\n   if(reset)","if(token!==ctx.loadToken)return;connection(ctx,false);\n   if(reset)");
 s=once(s,"if(!ctx.el.isConnected||ctx.el.dataset.target!==ctx.target||ctx.seenTotal===null)return;", "if(!ctx.el.isConnected||ctx.el.dataset.target!==ctx.target)return;connection(ctx,true);if(ctx.seenTotal===null){await load(ctx,true);return;}if((ctx.user?.username||'')!==(d.user?.username||'')){await load(ctx,true);return;}");
 s=once(s,"}catch(_){/* Koneksi sementara terputus; tombol Perbarui tetap tersedia. */}","}catch(_){connection(ctx,false);status(ctx,'Chat terputus sementara. Mencoba kembali; draf tetap disimpan.');}");
 s=once(s,'class="mm1831-live-indicator" title=','class="mm1831-live-indicator" data-state="waiting" title=');
 s=once(s,'Buka halaman Social Marney</a>','Buka Social Marney / Login Google ↗</a>');
 s=once(s,'class="mm1832-auth-link" href="/akun.html"','class="mm1832-auth-link" href="/akun.html" target="_blank" rel="noopener noreferrer"');
 return s;
}
function enhancePage(html){
 if(typeof html!=='string')throw Error('HTML required');
 if(html.includes('data-warxau-topchat="7.8"'))return html;
 const head=html.indexOf('</head>'),body=html.indexOf('<body'),script=html.indexOf('<script',body);
 if(head<0||body<0||script<body||!html.includes('id="battle"')||!html.includes('class="battle-panel"'))throw Error('WarXAU layout anchors missing');
 html=html.slice(0,script)+'<script data-warxau-topchat="7.8" src="/assets/warxau-topchat-layout.js?v=7.8"></script><script src="/assets/warxau-topchat-chat.js?v=7.8"></script>\n'+html.slice(script);
 return html.replace('</head>','<link rel="stylesheet" href="/assets/warxau-topchat.css?v=7.8">\n</head>');
}
function createTopChat({appRoot=APP,assetRoot=__dirname,approved=APPROVED}={}){
 let page;const layout=fs.readFileSync(path.join(assetRoot,'topchat-layout.js'));
 const customCSS=fs.readFileSync(path.join(assetRoot,'topchat.css'),'utf8');
 const css=Buffer.from(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.css'),'utf8')+'\n'+customCSS);
 const chat=Buffer.from(chatSource(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.js'),'utf8')));
 const performance=createWarXauPerformance({layoutSource:layout.toString('utf8'),chatSource:chat.toString('utf8'),cssSource:css.toString('utf8')});
 function source(){const raw=fs.readFileSync(path.join(appRoot,'assets/xau-war-3d.html'));if(sha(raw)!==approved)throw Error('WarXAU approved source changed');return raw.toString('utf8');}
 function asset(p){
  if(p===PAGE){if(!page){const optimized=performance.transform(enhancePage(source()));page=Buffer.from(enhanceXauLivePage(optimized));}return [page,'text/html; charset=utf-8'];}
  if(p==='/assets/warxau-topchat-layout.js')return [layout,'text/javascript; charset=utf-8'];
  if(p==='/assets/warxau-topchat-chat.js')return [chat,'text/javascript; charset=utf-8'];
  if(p==='/assets/warxau-topchat.css')return [css,'text/css; charset=utf-8'];
  return null;
 }
 for(const p of [PAGE,'/assets/warxau-topchat-chat.js','/assets/warxau-topchat.css'])asset(p);
 return {enhance:enhancePage,handle(req,res){
  if(performance.handle(req,res))return true;
  const p=String(req.url||'').split('?')[0];const a=asset(p);if(!a)return false;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
  res.writeHead(200,{'Content-Type':a[1],'Content-Length':a[0].length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-WarXAU-Layout':VERSION,'X-MarketMarney-XAU-Live':'20261109-xau-sse-v1'});
  res.end(req.method==='HEAD'?undefined:a[0]);return true;
 },metadata(){return {version:VERSION,sourceHash:approved,pageBytes:page.length,chatIntervalMs:3000,room:'MARKET:OANDA:XAUUSD',performance:performance.metadata(),xauPageStreamInjected:page.includes(Buffer.from('data-warxau-public-live'))};}};
}
module.exports={createTopChat,enhancePage,chatSource,VERSION,APPROVED};
