'use strict';
// Add one independent WTI perpetual arena. Existing price/game scripts are not overwritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BASE_SHA='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const NAV=`(()=>{const root=document.getElementById('warxau-social-root');if(!root||document.getElementById('war-market-selector'))return;const nav=document.createElement('nav');nav.id='war-market-selector';nav.setAttribute('aria-label','Pilih arena market');nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px';for(const [name,url,kind] of [['XAUUSD WAR','/assets/xau-war-3d.html?v=7.8','xau'],['₿ BTCUSD WAR','/assets/btc-war-3d.html?v=1.0','btc'],['OIL WAR · WTI','/assets/oil-war-3d.html?v=1.0','oil']]){const a=document.createElement('a');a.href=url;a.textContent=name;const current=location.pathname.includes('oil-war')?'oil':location.pathname.includes('btc-war')?'btc':'xau';const selected=current===kind;if(selected)a.setAttribute('aria-current','page');a.style.cssText='text-decoration:none;padding:10px 16px;border-radius:8px;border:1px solid '+(selected?'#dfa955':'#52604c')+';color:'+(selected?'#eeb861':'var(--text,#d5ddce)')+';font:700 12px system-ui;letter-spacing:.5px;background:'+(selected?'#bd811719':'transparent');nav.append(a);}root.prepend(nav);})();`;
function replaceSection(html,startMarker,content,endMarker='</section>'){const a=html.indexOf(startMarker),z=html.indexOf(endMarker,a+startMarker.length);if(a<0||z<0||html.indexOf(startMarker,a+1)!==-1)throw Error('OIL section mismatch');return html.slice(0,a)+content+html.slice(z+endMarker.length);}
function makeOil(raw,feed,enhance){
 if(crypto.createHash('sha256').update(raw).digest('hex')!==BASE_SHA)throw Error('Approved XAU base changed');
 let html=raw.toString('utf8'),index=0;
 html=html.replace(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,(all,open,code,close)=>{
  const i=index++;if(i===19)return open+feed.replaceAll('</script','<\\/script')+close;
  if(i>=4&&i<=18)return all;
  code=code.replaceAll('XAU/USD','WTI-PERP').replaceAll('XAUUSD','WTIPERP').replaceAll('WarXAU','OIL WAR').replaceAll('WARXAU','OIL WAR').replaceAll('XAU War','OIL WAR');
  code=code.replaceAll('window.MMGold','window.MMOil').replaceAll('stream=MMGold.create','stream=MMOil.create').replaceAll('mm-warxau-premium-','mm-oilwar-premium-');
  code=code.replaceAll('Gold API · WTI-PERP spot','trade[XYZ]/Hyperliquid · WTI perp').replaceAll('GOLD API · SPOT','WTI PERPETUAL').replaceAll('LIVE · 30 DETIK','WTI · STREAMING').replaceAll('harga emas','harga minyak WTI perpetual').replaceAll('USD / oz','USD REF / BBL');
  if(i===1)code=code.replace('this.price=4000','this.price=90');
  code=code.replace('const MAX_AGE=150000, HORIZON','const MAX_AGE=30000, HORIZON').replaceAll('Lebih dari 150 detik tanpa harga segar','Lebih dari 30 detik tanpa transaksi segar');
  if(i===20){
   code=code.replace('minimumFractionDigits:2,maximumFractionDigits:2','minimumFractionDigits:3,maximumFractionDigits:3');
   code=code.replace(/function liveNotice\(\)\{[^\n]+/,"function liveNotice(){return 'WTI PERPETUAL · trade[XYZ]/Hyperliquid (xyz:CL), bukan FBS/spot/CME. Sampel visual maksimal 4/detik. 1 pip visual = 0,01. Daily mengikuti candle sumber; statistik sejak tersambung.';}");
  }
  code=code.replaceAll('Gold API · pembaruan sekitar 30 detik. Tidak ada harga simulasi dalam mode LIVE.','WTI perpetual · sumber trade[XYZ]/Hyperliquid. Bukan harga minyak spot atau FBS.');
  code=code.replaceAll('gold-feed-gap','oil-feed-gap').replaceAll('D1 UTC OIL WAR (bukan broker)','Candle 1D Hyperliquid · WTI perp');
  code=code.replaceAll('D1 UTC OIL WAR · sinkronisasi jam server','Candle daily minyak · menunggu metadata sumber');
  code=code.replaceAll('Ini sesi agregasi OIL WAR, bukan close broker.','Batas candle mengikuti WTI perpetual Hyperliquid, bukan jam FBS/CME.').replaceAll('Jadwal ini bukan kalender broker; close resmi provider tidak dihitung dari sampel terakhir.','Candle sumber belum terkonfirmasi final; sampel terakhir bukan harga settlement minyak.');
  code=code.replaceAll("version:'7.7-hd-live'","version:'1.0-oil-war-live'").replace('window.MM_WAR_LIVE_BUILD="7.7-gold-api"','window.MM_WAR_LIVE_BUILD="1.0-hl-wti"');
  return open+code+close;
 });
 if(index!==24)throw Error('Unexpected base script count');
 const marker='<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7">';
 html=replaceSection(html,marker,marker+'<strong>OIL WAR · WTI PERPETUAL · xyz:CL</strong><br>Harga transaksi kontrak trade[XYZ] di Hyperliquid, bukan minyak spot, futures CME/NYMEX, Brent/XBRUSD, atau harga FBS. Ini kontrak perpetual terkait WTI, bukan pembelian atau pengiriman minyak fisik. Pasar perpetual dapat bergerak saat benchmark tradisional tutup.<br>Browser terhubung langsung ke API publik Hyperliquid; penyedia menerima alamat IP koneksi. Tidak memerlukan wallet, akun trading, atau API key. Tidak ada transaksi trading yang dikirim.<br><strong>1 pip visual = 0,01:</strong> infanteri 0,05; tank 0,20; heli 0,50; jet 1,00; gedung 3,00. Akumulasi naik/turun dihitung terpisah. Ini skala aplikasi, bukan standar pip broker.<br><strong>Daily:</strong> batas ronde memakai t/T candle 1D sumber (UTC; 07.00 WIB), bukan jam close FBS. Statistik hanya sejak tersambung; sampel visual maksimal 4/detik, bukan semua transaksi. Data terputus menjeda perang tanpa harga buatan.</section>');
 const a=html.indexOf('<h3>Perang satu sesi D1 UTC WarXAU</h3>'),z=html.indexOf('<h3>',a+10);if(a<0||z<0)throw Error('Daily help missing');
 html=html.slice(0,a)+'<h3>Perang minyak satu candle daily</h3><p>OIL WAR memakai harga transaksi WTI perpetual xyz:CL dari trade[XYZ]/Hyperliquid. Tidak sama dengan minyak spot, Brent, kontrak berjangka CME/NYMEX, atau akun FBS. Transaksi disaring berdasarkan simbol, timestamp asli, dan identitas transaksi. Tampilan mengambil harga terakhir per jendela 250 ms; riwayat snapshot tidak dimainkan ulang. Harga pertama menjadi patokan awal, bukan pemicu pasukan gratis. Ronde ditutup memakai waktu T candle daily dari sumber, lalu menunggu candle baru. Harga terakhir bukan settlement resmi.</p>'+html.slice(z);
 const parts=html.split(/(<script(?:\s[^>]*)?>[\s\S]*?<\/script>)/gi);
 for(let i=0;i<parts.length;i+=2){parts[i]=parts[i].replaceAll('WarXAU HD LIVE 7.7 | MarketMarney','OIL WAR · WTI Perpetual | MarketMarney').replaceAll('WarXAU <i>3D</i>','OIL WAR <i>3D</i>').replaceAll('XAU / USD','WTI / PERP').replaceAll('>XAU<','>OIL<').replaceAll('>XAU/USD<','>WTI PERP<').replaceAll('USD / TROY OZ','USD REF / BBL').replaceAll('USD / oz','USD REF / BBL').replaceAll('HD DAILY / 7.6','WTI / HD LIVE').replaceAll('WARXAU / HD LIVE 7.7','OIL WAR / WTI PERP').replaceAll('XAU WAR / PREMIUM','OIL WAR / WTI PERP').replaceAll('Cara kerja HD LIVE v7.7','Cara kerja OIL WAR').replaceAll('D1 UTC WarXAU · bukan kalender broker','Candle daily WTI perpetual · bukan FBS');
 parts[i]=parts[i].replaceAll('MarketMarney WarXAU Conquest: visualisasi perebutan base 3D dan momentum harga emas.','MarketMarney OIL WAR: arena 3D WTI perpetual trade[XYZ]/Hyperliquid.').replaceAll('Arena 3D momentum XAU/USD','Arena 3D WTI perpetual').replaceAll('Grafik sampel harga XAU/USD','Grafik sampel WTI perpetual').replace('1 pip visual awal = US$0,01; pilihan US$0,10 tersedia.','1 pip visual = 0,01 khusus OIL WAR.').replace('<select id="pip-unit"><option value="0.01">0,01 USD</option><option value="0.1">0,10 USD</option></select>','<select id="pip-unit"><option value="0.01">0,01 / pip visual</option></select>').replace('Pratinjau tidak terhubung harga asli. Demo mulai dengan harga otomatis mati agar ambang mudah diperiksa. Mode feed membutuhkan backend berizin dan tidak diam-diam diganti simulasi.','LIVE memakai transaksi WTI perpetual. DEMO terpisah; harga contoh hanya aktif ketika mode demo dipilih.');}
 html=enhance(parts.join('')).replaceAll('/assets/warxau-topchat-layout.js','/assets/oil-war-layout.js').replaceAll('/assets/warxau-topchat-chat.js','/assets/oil-war-chat.js');
 if(html.includes('api.gold-api.com')||html.includes('wss://ws.kraken.com'))throw Error('Wrong feed remains');return html;
}
function createOil({appRoot=APP,assetRoot=__dirname,topchat=require('./topchat.cjs')}={}){
 const read=f=>fs.readFileSync(path.join(assetRoot,f),'utf8'),raw=fs.readFileSync(path.join(appRoot,'assets/xau-war-3d.html'));
 const page=Buffer.from(require('./derived-software.cjs').tuneDerivedSoftware(makeOil(raw,read('oil-feed.js'),topchat.enhancePage),'oil'));
 const layout=read('topchat-layout.js'),chat=topchat.chatSource(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.js'),'utf8'));
 const oilLayout=layout.replaceAll('OANDA:XAUUSD','HYPERLIQUID:WTI').replaceAll('XAU/USD','WTI perpetual').replace('WarXAU:','OIL WAR:')+'\n'+NAV;
 const btcLayout=layout.replaceAll('OANDA:XAUUSD','BITSTAMP:BTCUSD').replaceAll('XAU/USD','BTC/USD').replace('WarXAU:','BTCUSD War:')+'\n'+NAV;
 const routes=new Map([['/assets/oil-war-3d.html',[page,'text/html; charset=utf-8']],['/assets/oil-war-layout.js',[Buffer.from(oilLayout),'text/javascript; charset=utf-8']],['/assets/oil-war-chat.js',[Buffer.from(chat.replaceAll('XAU/USD','WTI perpetual')),'text/javascript; charset=utf-8']],['/assets/warxau-topchat-layout.js',[Buffer.from(layout+'\n'+NAV),'text/javascript; charset=utf-8']],['/assets/btc-war-layout.js',[Buffer.from(btcLayout),'text/javascript; charset=utf-8']]]);
 return {handle(req,res){const p=String(req.url||'').split('?')[0];let a=routes.get(p);if(p==='/api/oil-war/clock')a=[Buffer.from(JSON.stringify({now:Date.now()})),'application/json'];if(!a)return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
 res.writeHead(200,{'Content-Type':a[1],'Content-Length':a[0].length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-Oil-War':'1.0'});res.end(req.method==='HEAD'?undefined:a[0]);return true;
 },metadata:()=>({version:'1.0-oil-war-live',coin:'xyz:CL',symbol:'WTI-PERP',provider:'trade[XYZ]/Hyperliquid',visualPip:0.01,chatRoom:'MARKET:HYPERLIQUID:WTI',pageBytes:page.length})};
}
module.exports={makeOil,createOil,BASE_SHA,NAV};
