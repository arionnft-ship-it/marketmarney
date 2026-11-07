'use strict';
// Additive BTC arena. The mounted XAU page, broker relay, app database and authentication stay untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BASE_SHA='b10cb914888c0fcc35a9acbb14c12693ea1e3c0ce1f4d8770a7b86dcfeb99212';
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const NAV=`(()=>{const root=document.getElementById('warxau-social-root');if(!root||document.getElementById('war-market-selector'))return;const nav=document.createElement('nav');nav.id='war-market-selector';nav.setAttribute('aria-label','Pilih arena market');nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px';for(const [name,url,btc]of [['XAUUSD WAR','/assets/xau-war-3d.html?v=7.8',false],['₿ BTCUSD WAR','/assets/btc-war-3d.html?v=1.0',true]]){const a=document.createElement('a');a.href=url;a.textContent=name;const selected=location.pathname.includes('btc-war')===btc;a.setAttribute('aria-current',selected?'page':'false');a.style.cssText='text-decoration:none;padding:10px 16px;border-radius:8px;border:1px solid '+(selected?'#dfa955':'#52604c')+';color:'+(selected?'#eeb861':'var(--text,#d5ddce)')+';font:700 12px system-ui;letter-spacing:.5px;background:'+(selected?'#bd811719':'transparent');nav.append(a);}root.prepend(nav);})();`;
function one(s,a,b){if(s.split(a).length!==2)throw Error('BTC source anchor changed: '+a.slice(0,65));return s.replace(a,b);}
function makeBTC(raw,feed,enhance){
 if(crypto.createHash('sha256').update(raw).digest('hex')!==BASE_SHA)throw Error('Approved XAU source changed');
 let html=raw.toString('utf8');
 const marker='<script>/* WarXAU 7.7',start=html.indexOf(marker),end=html.indexOf('</script>',start);if(start<0||end<0)throw Error('Feed anchor missing');
 html=html.slice(0,start)+'<script>'+feed.replaceAll('</script','<\\/script')+'</script>'+html.slice(end+9);
 // Only text/script source, never image/base64 texture content.
 html=html.replace(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,(all,a,code,z)=>{
  if(code.includes('window.MMAshfallAssets='))return all;
  code=code.replaceAll('XAU/USD','BTC/USD').replaceAll('XAUUSD','BTCUSD').replaceAll('WarXAU','BTCUSD War').replaceAll('WARXAU','BTCUSD WAR').replaceAll('XAU War','BTCUSD War');
  code=code.replaceAll('window.MMGold','window.MMBTC').replaceAll('stream=MMGold.create','stream=MMBTC.create').replaceAll('mm-warxau-premium-','mm-btcwar-premium-');
  code=code.replaceAll('Gold API · BTC/USD spot','Kraken · BTC/USD spot').replaceAll('GOLD API · SPOT','KRAKEN · BTC/USD').replaceAll('LIVE · 30 DETIK','BTC · STREAMING').replaceAll('harga emas','harga Bitcoin').replaceAll('USD / oz','USD / BTC');
  code=code.replaceAll('let destruction=new MMDestruction.Ledger({pipSize:.01})','let destruction=new MMDestruction.Ledger({pipSize:1})');
  if(code.includes('class Demo{'))code=code.replace('this.price=4000','this.price=75000').replace("?0.075:this.pattern==='down'?-0.075:Math.sin(this.tick/15)*0.048","?7.5:this.pattern==='down'?-7.5:Math.sin(this.tick/15)*4.8").replace('(this.random()-.5)*0.175','(this.random()-.5)*17.5');
  code=code.replace('const MAX_AGE=150000, HORIZON','const MAX_AGE=30000, HORIZON').replace('Lebih dari 150 detik tanpa harga segar','Lebih dari 30 detik tanpa transaksi segar');
  if(code.includes('function liveNotice(){'))code=code.replace(/function liveNotice\(\)\{[^\n]+/,"function liveNotice(){return 'BTC/USD · Kraken WebSocket. Sampel visual maksimal 4 kali/detik, tanpa harga buatan. 1 pip visual = US$1. Sesi mengikuti candle D1 UTC Kraken; bukan harga FBS.';}");
  code=code.replaceAll('Gold API · pembaruan sekitar 30 detik. Tidak ada harga simulasi dalam mode LIVE.','Transaksi BTC/USD langsung dari Kraken. Menunggu data candle daily dan transaksi segar.');
  code=code.replaceAll('Menghubungkan harga spot emas.','Menghubungkan Bitcoin.').replaceAll('gold-feed-gap','btc-feed-gap');
  code=code.replaceAll('D1 UTC BTCUSD War (bukan broker)','Candle D1 Kraken · UTC').replaceAll('D1 UTC BTCUSD War · sinkronisasi jam server','Candle D1 Kraken · menunggu metadata sumber');
  code=code.replaceAll('Ini sesi agregasi BTCUSD War, bukan close broker.','Batas sesi mengikuti candle D1 UTC Kraken.').replaceAll('Jadwal ini bukan kalender broker; close resmi provider tidak dihitung dari sampel terakhir.','Harga terakhir yang diamati bukan jaminan harga close resmi Kraken.');
  code=code.replaceAll('version:\'7.7-hd-live\'','version:\'1.0-btc-war-live\'').replace('window.MM_WAR_LIVE_BUILD="7.7-gold-api"','window.MM_WAR_LIVE_BUILD="1.0-kraken-btc"');
  return a+code+z;
 });
 const notice='<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7">',n=html.indexOf(notice),ne=html.indexOf('</section>',n);if(n<0||ne<0)throw Error('Notice missing');
 html=html.slice(0,n)+notice+'<strong>BITCOIN / USD · KRAKEN WEBSOCKET</strong><br>Transaksi BTC/USD spot, bukan BTC/USDT, harga FBS, atau data order flow. Browser terhubung langsung ke Kraken; penyedia menerima alamat IP koneksi. Sampel visual maksimal 4 kali/detik; tidak merekam semua transaksi dan tidak membuat harga perantara.<br><strong>1 pip visual = US$1:</strong> infanteri +US$5, tank +US$20, heli US$50, jet US$100, gedung US$300 sesuai arah. Ini skala aplikasi, bukan standar broker.<br><strong>Daily close:</strong> mengikuti awal candle D1 UTC Kraken + 24 jam (07.00 WIB). Ronde berikutnya menunggu data daily baru. Statistik dihitung sejak tersambung; refresh tidak memulihkan seluruh pertempuran harian.</section>'+html.slice(ne+10);
 const replacements=[['WarXAU HD LIVE 7.7 | MarketMarney','BTCUSD War HD | MarketMarney'],['WarXAU <i>3D</i>','BTCUSD War <i>3D</i>'],['HD DAILY / 7.6','BTC / HD LIVE'],['>XAU<','>BTC<'],['XAU / USD','BTC / USD'],['USD / TROY OZ','USD / BITCOIN'],['USD / oz','USD / BTC'],['>XAU/USD<','>BTC/USD<'],['WARXAU / HD LIVE 7.7','BTCUSD WAR / HD LIVE'],['XAU WAR / PREMIUM','BTCUSD WAR / PREMIUM'],['Cara kerja HD LIVE v7.7','Cara kerja BTCUSD War'],['1 pip visual awal = US$0,01; pilihan US$0,10 tersedia.','1 pip visual = US$1 khusus arena Bitcoin.'],['<select id="pip-unit"><option value="0.01">0,01 USD</option><option value="0.1">0,10 USD</option></select>','<select id="pip-unit"><option value="1">1 USD / pip visual</option></select>']];
 for(const [a,b]of replacements)html=html.split(a).join(b);
 const h=html.indexOf('<h3>Perang satu sesi D1 UTC WarXAU</h3>'),he=html.indexOf('<h3>',h+10);if(h<0||he<0)throw Error('Help anchor missing');
 html=html.slice(0,h)+'<h3>Perang Bitcoin satu candle daily</h3><p>Stream publik Kraken mengirim transaksi BTC/USD beserta waktu asli. Tampilan memakai transaksi terakhir pada jendela maksimal 250 ms, bukan seluruh tick, dan tidak mengarang harga. Jadwal ronde berasal dari interval_begin candle Kraken 1440 menit. Pada daily close seluruh serangan berhenti. Ronde berikutnya dimulai dengan data sesi baru dan harga valid; harga pertama menjadi baseline. Ini bukan feed FBS atau janji identik dengan semua chart TradingView.</p>'+html.slice(he);
 html=html.replace('Pratinjau tidak terhubung harga asli. Demo mulai dengan harga otomatis mati agar ambang mudah diperiksa. Mode feed membutuhkan backend berizin dan tidak diam-diam diganti simulasi.','Mode LIVE terhubung langsung ke WebSocket publik Kraken. Demo terpisah dan mulai dengan harga otomatis mati. Koneksi gagal tidak diganti dengan simulasi.');
 html=html.replaceAll('D1 UTC WarXAU · bukan kalender broker','D1 UTC Kraken · data sesi dari sumber');
 html=enhance(html).replaceAll('/assets/warxau-topchat-layout.js','/assets/btc-war-layout.js').replaceAll('/assets/warxau-topchat-chat.js','/assets/btc-war-chat.js');
 if(html.includes('api.gold-api.com')||html.includes('USD / oz')||html.includes('pipSize:.01'))throw Error('Gold dependency remains');
 return html;
}
function createBTC({appRoot=APP,assetRoot=__dirname,topchat=require('./topchat.cjs')}={}){
 const read=f=>fs.readFileSync(path.join(assetRoot,f),'utf8'),raw=fs.readFileSync(path.join(appRoot,'assets/xau-war-3d.html'));
 const page=Buffer.from(require('./derived-software.cjs').tuneDerivedSoftware(makeBTC(raw,read('btc-feed.js'),topchat.enhancePage),'btc'));
 const layout=read('topchat-layout.js');
 const btcLayout=layout.replaceAll('OANDA:XAUUSD','BITSTAMP:BTCUSD').replaceAll('XAU/USD','BTC/USD').replace('WarXAU:','BTCUSD War:')+'\n'+NAV;
 const chat=topchat.chatSource(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.js'),'utf8')).replaceAll('XAU/USD','BTC/USD');
 const routes=new Map([['/assets/btc-war-3d.html',[page,'text/html; charset=utf-8']],['/assets/btc-war-layout.js',[Buffer.from(btcLayout),'text/javascript; charset=utf-8']],['/assets/btc-war-chat.js',[Buffer.from(chat),'text/javascript; charset=utf-8']],['/assets/warxau-topchat-layout.js',[Buffer.from(layout+'\n'+NAV),'text/javascript; charset=utf-8']]]);
 return {handle(req,res){const p=String(req.url||'').split('?')[0];if(p==='/api/btc-war/clock'){if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return true;}const b=Buffer.from(JSON.stringify({now:Date.now()}));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Length':b.length});res.end(b);return true;}
 const a=routes.get(p);if(!a)return false;if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
 res.writeHead(200,{'Content-Type':a[1],'Content-Length':a[0].length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-BTC-War':'1.0'});res.end(req.method==='HEAD'?undefined:a[0]);return true;},metadata:()=>({version:'1.0-btc-war-live',symbol:'BTC/USD',provider:'Kraken',visualPip:1,sourceHash:BASE_SHA,pageBytes:page.length})};
}
module.exports={makeBTC,createBTC,BASE_SHA,NAV};
