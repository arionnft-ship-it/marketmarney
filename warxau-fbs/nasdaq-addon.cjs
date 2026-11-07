'use strict';
// NASDAQ WAR: independent demonstration + honest unconfigured live state.
// Does NOT map XYZ100, QQQ, NQ or another instrument onto NAS100.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BASE_SHA='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const VERSION='1.0-nasdaq-war',TARGET='MARKET:NASDAQ:NDX';
const NAV=`(()=>{const root=document.getElementById('warxau-social-root');if(!root||document.getElementById('war-market-selector'))return;const nav=document.createElement('nav');nav.id='war-market-selector';nav.setAttribute('aria-label','Pilih arena market');nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px';for(const [name,url,kind] of [['XAUUSD WAR','/assets/xau-war-3d.html?v=7.8','xau'],['BTCUSD WAR','/assets/btc-war-3d.html?v=1.0','btc'],['OIL WAR · WTI','/assets/oil-war-3d.html?v=1.0','oil'],['NASDAQ WAR','/assets/nasdaq-war-3d.html?v=1.0','nasdaq']]){const a=document.createElement('a');a.href=url;a.textContent=name;const current=location.pathname.includes('nasdaq-war')?'nasdaq':location.pathname.includes('oil-war')?'oil':location.pathname.includes('btc-war')?'btc':'xau';if(current===kind)a.setAttribute('aria-current','page');a.style.cssText='text-decoration:none;padding:10px 14px;border-radius:8px;border:1px solid '+(current===kind?'#dfa955':'#52604c')+';color:'+(current===kind?'#eeb861':'var(--text,#d5ddce)')+';font:700 12px system-ui;letter-spacing:.5px;max-width:100%';nav.append(a);}root.prepend(nav);})();`;
const WAITING_MODULE=`/* No price provider connected. No fake quote callbacks or third-party proxy. */
(function(root){'use strict';root.MMNasdaq={diagnostics:()=>({state:'unconfigured',symbol:'NAS100',provider:null,transport:null,receivedTrades:0,liveAvailable:false}),create(){return {close(){}};}};})(globalThis);`;
function exactly(s,a,b){if(s.split(a).length!==2)throw Error('NASDAQ source anchor mismatch: '+a.slice(0,55));return s.replace(a,b);}
function makeNasdaq(raw,enhance){
 if(crypto.createHash('sha256').update(raw).digest('hex')!==BASE_SHA)throw Error('Approved XAU base changed');
 let count=0,html=raw.toString('utf8').replace(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,(all,open,code,close)=>{
 const i=count++;if(i===19)return open+WAITING_MODULE+close;if(i>=4&&i<=18)return all;
 code=code.replaceAll('XAU/USD','NAS100').replaceAll('XAUUSD','NAS100').replaceAll('WarXAU','NASDAQ WAR').replaceAll('WARXAU','NASDAQ WAR').replaceAll('XAU War','NASDAQ WAR').replaceAll('mm-warxau-premium-','mm-nasdaqwar-premium-');
 code=code.replaceAll('window.MMGold','window.MMNasdaq').replaceAll('Gold API · NAS100 spot','NAS100 · belum tersambung').replaceAll('GOLD API · SPOT','NAS100 · BELUM TERHUBUNG').replaceAll('harga emas','harga NASDAQ').replaceAll('USD / oz','POIN NAS100');
 code=code.replaceAll("version:'7.7-hd-live'","version:'1.0-nasdaq-war'").replace('window.MM_WAR_LIVE_BUILD="7.7-gold-api"','window.MM_WAR_LIVE_BUILD="1.0-nasdaq-unconfigured"');
 if(i===1)code=exactly(code,'this.price=4000','this.price=25000').replace("?0.075:this.pattern==='down'?-0.075:Math.sin(this.tick/15)*0.048","?7.5:this.pattern==='down'?-7.5:Math.sin(this.tick/15)*4.8").replace('(this.random()-.5)*0.175','(this.random()-.5)*17.5');
 if(i===20){
 code=exactly(code,'let destruction=new MMDestruction.Ledger({pipSize:.01})','let destruction=new MMDestruction.Ledger({pipSize:1})');
 const a=code.indexOf('async function startLive(resume=false)'),z=code.indexOf('function renderData(',a);if(a<0||z<0)throw Error('Live handler missing');
 code=code.slice(0,a)+`async function startLive(){
 disconnect();daily.reset();dailyResult=null;dailyHandled=null;mode='live';demo=null;reset();setModeButtons();engine?.setActive(false);
 status('waiting','NAS100 · BELUM TERHUBUNG');setText('source','Sumber NAS100 belum dikonfigurasi');notice(liveNotice(),true);
 overlay('Harga NASDAQ belum tersambung.','Arena HD dan chat tersedia. Tekan DEMO untuk mencoba; angka demo bukan harga pasar.');
 setText('stage-stamp','NAS100 · BELUM ADA HARGA LIVE');setText('battle-state','Menunggu sumber NAS100 terverifikasi');renderDaily();
}
`+code.slice(z);
 code=code.replace(/function liveNotice\(\)\{[^\n]+/,"function liveNotice(){return 'NASDAQ WAR · FEED BELUM TERHUBUNG. Tidak memakai XYZ100, QQQ atau harga acak sebagai NASDAQ. DEMO dipilih manual dan memakai harga contoh. 1 pip visual = 1 poin; daily live menunggu jadwal penyedia.';}");
 code=code.replaceAll('Menunggu waktu server dan harga sumber','Menunggu sumber NAS100 dan jadwal daily').replaceAll('D1 UTC NASDAQ WAR · sinkronisasi jam server','Jadwal daily LIVE belum tersedia');
 code=code.replaceAll('DATA DEMO','DATA DEMO · NAS100').replaceAll('SIMULASI LOKAL •','SIMULASI NAS100 •');
 }
 return open+code+close;
 });
 if(count!==24)throw Error('Unexpected original script count');
 const notice='<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7">',a=html.indexOf(notice),z=html.indexOf('</section>',a);if(a<0||z<0)throw Error('Notice missing');
 html=html.slice(0,a)+notice+'<strong>NASDAQ WAR · NAS100 / US100 · LIVE BELUM TERHUBUNG</strong><br>Arena 3D dan chat NASDAQ tersedia. Belum ada sumber harga NAS100/US100 terverifikasi yang tersambung. Harga LIVE sengaja kosong; tidak menggunakan XYZ100, QQQ, harga BTC, minyak, atau angka acak sebagai NASDAQ.<br><strong>1 pip visual = 1 poin:</strong> infanteri 5; tank 20; heli 50; jet 100; gedung 300. Ini skala visual aplikasi, bukan ukuran lot atau nilai profit broker.<br><strong>DEMO:</strong> hanya aktif setelah dipilih, memakai angka contoh. Daily close demo memakai kalender contoh UTC; jadwal daily live belum tersedia. Tidak ada transaksi atau akses akun trading.</section>'+html.slice(z+10);
 const h=html.indexOf('<h3>Perang satu sesi D1 UTC WarXAU</h3>'),he=html.indexOf('<h3>',h+10);if(h<0||he<0)throw Error('Daily help missing');
 html=html.slice(0,h)+'<h3>NASDAQ: demo dan koneksi live dipisahkan</h3><p>Arena ini disiapkan untuk NAS100/US100. Sumber live belum tersambung, sehingga tidak ada harga atau countdown pasar yang dibuat-buat. Demo memakai angka contoh dan kalender UTC contoh. Saat daily close demo diuji, semua serangan dihentikan. Feed, jenis harga, izin penayangan dan kalender penyedia harus terverifikasi sebelum mode live diaktifkan. NASDAQ-100 cash, CFD US100 broker, NQ futures, QQQ dan XYZ100 bukan instrumen yang boleh ditukar diam-diam.</p>'+html.slice(he);
 const parts=html.split(/(<script(?:\s[^>]*)?>[\s\S]*?<\/script>)/gi);
 for(let i=0;i<parts.length;i+=2){parts[i]=parts[i].replaceAll('WarXAU HD LIVE 7.7 | MarketMarney','NASDAQ WAR · NAS100 | MarketMarney').replaceAll('WarXAU <i>3D</i>','NASDAQ WAR <i>3D</i>').replaceAll('XAU / USD','NAS100 / US100').replaceAll('>XAU<','>NAS100<').replaceAll('>XAU/USD<','>NAS100<').replaceAll('USD / TROY OZ','POIN NAS100').replaceAll('USD / oz','POIN NAS100').replaceAll('HD DAILY / 7.6','NASDAQ / HD').replaceAll('WARXAU / HD LIVE 7.7','NASDAQ WAR / HD').replaceAll('XAU WAR / PREMIUM','NASDAQ WAR / HD').replaceAll('Cara kerja HD LIVE v7.7','Cara kerja NASDAQ WAR').replaceAll('D1 UTC WarXAU · bukan kalender broker','LIVE belum tersedia · demo terpisah').replaceAll('MarketMarney WarXAU Conquest: visualisasi perebutan base 3D dan momentum harga emas.','NASDAQ WAR: arena NAS100 HD dengan mode demo dan chat terpisah.').replaceAll('Arena 3D momentum XAU/USD','Arena 3D NAS100').replaceAll('Grafik sampel harga XAU/USD','Grafik sampel NAS100').replace('1 pip visual awal = US$0,01; pilihan US$0,10 tersedia.','1 pip visual = 1 poin khusus NAS100.').replace('<select id="pip-unit"><option value="0.01">0,01 USD</option><option value="0.1">0,10 USD</option></select>','<select id="pip-unit"><option value="1">1 poin / pip visual</option></select>').replace('Pratinjau tidak terhubung harga asli. Demo mulai dengan harga otomatis mati agar ambang mudah diperiksa. Mode feed membutuhkan backend berizin dan tidak diam-diam diganti simulasi.','DEMO memakai harga contoh. Mode LIVE belum tersambung dan tidak otomatis beralih ke simulasi.').replace('>Live market</button>','>Status feed</button>');}
 html=enhance(parts.join('')).replaceAll('/assets/warxau-topchat-layout.js','/assets/nasdaq-war-layout.js').replaceAll('/assets/warxau-topchat-chat.js','/assets/nasdaq-war-chat.js');
 if(html.includes('api.gold-api.com')||html.includes('wss://ws.kraken.com')||html.includes('api.hyperliquid.xyz')||html.includes('MMGold.create'))throw Error('Unrelated live feed remains');
 return html;
}
function createNasdaq({appRoot=APP,assetRoot=__dirname,topchat=require('./topchat.cjs')}={}){
 const read=f=>fs.readFileSync(path.join(assetRoot,f),'utf8');const raw=fs.readFileSync(path.join(appRoot,'assets/xau-war-3d.html'));
 const page=Buffer.from(makeNasdaq(raw,topchat.enhancePage));const layout=read('topchat-layout.js'),chat=topchat.chatSource(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.js'),'utf8'));
 const renderLayout=(target,label)=>Buffer.from(layout.replaceAll('OANDA:XAUUSD',target).replaceAll('XAU/USD',label)+'\n'+NAV);
 const routes=new Map([['/assets/nasdaq-war-3d.html',[page,'text/html; charset=utf-8']],['/assets/nasdaq-war-layout.js',[renderLayout('NASDAQ:NDX','NASDAQ / NAS100'),'text/javascript; charset=utf-8']],['/assets/nasdaq-war-chat.js',[Buffer.from(chat.replaceAll('XAU/USD','NASDAQ / NAS100')),'text/javascript; charset=utf-8']],['/assets/warxau-topchat-layout.js',[renderLayout('OANDA:XAUUSD','XAU/USD'),'text/javascript; charset=utf-8']],['/assets/btc-war-layout.js',[renderLayout('BITSTAMP:BTCUSD','BTC/USD'),'text/javascript; charset=utf-8']],['/assets/oil-war-layout.js',[renderLayout('HYPERLIQUID:WTI','WTI perpetual'),'text/javascript; charset=utf-8']]]);
 return {handle(req,res){const p=String(req.url||'').split('?')[0];let a=routes.get(p);if(p==='/api/nasdaq-war/status')a=[Buffer.from(JSON.stringify({version:VERSION,liveAvailable:false,state:'unconfigured',symbol:'NAS100',provider:null,dailySession:null,price:null,chatRoom:TARGET})),'application/json'];if(!a)return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
 res.writeHead(200,{'Content-Type':a[1],'Content-Length':a[0].length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-Nasdaq-War':VERSION});res.end(req.method==='HEAD'?undefined:a[0]);return true;},metadata:()=>({version:VERSION,symbol:'NAS100',liveAvailable:false,visualPoint:1,chatRoom:TARGET,pageBytes:page.length})};
}
module.exports={makeNasdaq,createNasdaq,BASE_SHA,NAV,VERSION,TARGET};
