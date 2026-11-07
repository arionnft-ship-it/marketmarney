'use strict';
// Add IHSG/IDX Composite arena only. No scraped values, proxy instruments or simulated live quotes.
const fs=require('node:fs'),path=require('node:path');
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const VERSION='1.0-ihsg-war',TARGET='MARKET:IDX:COMPOSITE';
const NAV=`(()=>{'use strict';const root=document.getElementById('warxau-social-root');if(!root||document.getElementById('war-market-selector'))return;const nav=document.createElement('nav');nav.id='war-market-selector';nav.setAttribute('aria-label','Pilih arena market');nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px';const options=[['XAUUSD WAR','xau','7.8'],['BTCUSD WAR','btc','1.0'],['OIL WAR · WTI','oil','1.0'],['NASDAQ WAR','nasdaq','1.0'],['IHSG WAR','ihsg','1.0']];const current=options.find(x=>location.pathname.includes('/'+x[1]+'-war-'))?.[1]||'xau';for(const [label,kind,version]of options){const a=document.createElement('a');a.href='/assets/'+kind+'-war-3d.html?v='+version;a.textContent=label;if(kind===current)a.setAttribute('aria-current','page');a.style.cssText='text-decoration:none;padding:10px 14px;border-radius:8px;border:1px solid '+(kind===current?'#dfa955':'#52604c')+';color:'+(kind===current?'#eeb861':'var(--text,#d5ddce)')+';font:700 12px system-ui;letter-spacing:.5px;max-width:100%';nav.append(a);}root.prepend(nav);})();`;
function once(s,a,b){if(s.split(a).length!==2)throw Error('IHSG source anchor changed: '+a.slice(0,60));return s.replace(a,b);}
function makeIHSG(raw,enhance){
 // Reuse verified no-feed page builder; never alter existing Nasdaq output.
 let html=require('./nasdaq-addon.cjs').makeNasdaq(raw,s=>s),n=0;
 html=html.replace(/(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,(all,a,s,z)=>{
  const i=n++;if(i>=4&&i<=18)return all;
  s=s.replaceAll('NASDAQ WAR','IHSG WAR').replaceAll('NASDAQ','IHSG').replaceAll('NAS100','IHSG').replaceAll('US100','IHSG').replaceAll('MMNasdaq','MMIHSG').replaceAll('nasdaqwar','ihsgwar').replaceAll('nasdaq-war','ihsg-war').replaceAll('nasdaq-unconfigured','ihsg-unconfigured');
  if(i===1)s=once(s,'this.price=25000','this.price=8000');
  if(i===20){
   s=s.replace(/function liveNotice\(\)\{[^\n]+/,"function liveNotice(){return 'IHSG / IDX COMPOSITE · LIVE BELUM TERHUBUNG. Nilai indeks dan kalender BEI tidak diisi tanpa feed terverifikasi. DEMO dipilih manual; 1 pip visual = 1 poin indeks. Bukan rekomendasi atau transaksi saham.';}");
   s=s.replaceAll('Harga IHSG belum tersambung.','Data IHSG belum tersambung.').replaceAll('Sumber IHSG belum dikonfigurasi','Feed IDX Composite belum dikonfigurasi');
  }
  return a+s+z;
 });
 if(n!==24)throw Error('Unexpected IHSG script count');
 const parts=html.split(/(<script(?:\s[^>]*)?>[\s\S]*?<\/script>)/gi);
 for(let i=0;i<parts.length;i+=2)parts[i]=parts[i].replaceAll('NASDAQ WAR','IHSG WAR').replaceAll('NASDAQ','IHSG').replaceAll('NAS100 / US100','IHSG / IDX COMPOSITE').replaceAll('NAS100/US100','IHSG / IDX Composite').replaceAll('NAS100','IHSG').replaceAll('US100','IDX Composite').replaceAll('nasdaq-war','ihsg-war');
 html=parts.join('');
 const marker='<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7">',a=html.indexOf(marker),z=html.indexOf('</section>',a);
 if(a<0||z<0)throw Error('IHSG notice boundary missing');
 html=html.slice(0,a)+marker+'<strong>IHSG WAR · IDX COMPOSITE · LIVE BELUM TERHUBUNG</strong><br>Arena HD dan chat IHSG tersedia. Data indeks IHSG live belum dikonfigurasi; nilai LIVE sengaja kosong. Kami tidak mengganti IHSG dengan LQ45, IDX30, satu saham, indeks asing, nilai tertunda tanpa label, atau angka simulasi.<br><strong>1 pip visual = 1 poin indeks:</strong> infanteri 5; tank 20; helikopter 50; jet 100; gedung 300. BUY/SELL hanya kubu visual pergerakan naik/turun, bukan transaksi IHSG atau instruksi perdagangan.<br><strong>DEMO:</strong> dimulai manual dari angka contoh 8.000, bukan nilai IHSG terkini. Kalender DEMO adalah UTC contoh, bukan jam perdagangan, hari libur, jeda sesi atau penutupan BEI. Daily LIVE menunggu kalender dan data penyedia terverifikasi. Tidak ada akun broker, order, wallet atau layanan data berbayar yang diaktifkan.</section>'+html.slice(z+10);
 const h=html.indexOf('<h3>IHSG: demo dan koneksi live dipisahkan</h3>'),he=html.indexOf('<h3>',h+8);
 if(h<0||he<0)throw Error('IHSG help boundary missing');
 html=html.slice(0,h)+'<h3>IHSG: nilai indeks, bukan harga saham tunggal</h3><p>Arena ini disiapkan untuk Indeks Harga Saham Gabungan / IDX Composite. Sumber live dan izin penggunaan data belum diverifikasi sehingga nilai indeks, timestamp pasar, dan sesi LIVE tidak dibuat-buat. DEMO memakai angka contoh dan kalender UTC contoh; tombol uji daily close menghentikan serangan. Implementasi live harus mengikuti kalender BEI dari penyedia yang terverifikasi, bukan batas 07.00 WIB arena kripto. Nilai yang terlambat harus dilabeli delayed dan tidak boleh disebut real time. Chat IHSG memakai akun serta moderasi Social Marney yang sama, tetapi ruangnya terpisah.</p>'+html.slice(he);
 html=enhance(html).replaceAll('/assets/warxau-topchat-layout.js','/assets/ihsg-war-layout.js').replaceAll('/assets/warxau-topchat-chat.js','/assets/ihsg-war-chat.js');
 for(const forbidden of ['api.gold-api.com','api.hyperliquid.xyz','wss://ws.kraken.com','MMGold.create','MMNasdaq','NASDAQ','NAS100'])if(html.includes(forbidden))throw Error('Unrelated IHSG dependency: '+forbidden);
 return html;
}
function createIHSG({appRoot=APP,assetRoot=__dirname,topchat=require('./topchat.cjs')}={}){
 const raw=fs.readFileSync(path.join(appRoot,'assets/xau-war-3d.html'));
 const page=Buffer.from(require('./derived-software.cjs').tuneDerivedSoftware(makeIHSG(raw,topchat.enhancePage),'ihsg'));
 const layout=fs.readFileSync(path.join(assetRoot,'topchat-layout.js'),'utf8');
 const chat=topchat.chatSource(fs.readFileSync(path.join(appRoot,'assets/discussion-1828.js'),'utf8')).replaceAll('XAU/USD','IHSG / IDX Composite');
 const routes=new Map([['/assets/ihsg-war-3d.html',[page,'text/html; charset=utf-8']],['/assets/ihsg-war-chat.js',[Buffer.from(chat),'text/javascript; charset=utf-8']]]);
 for(const [file,target,label]of [['ihsg-war','IDX:COMPOSITE','IHSG / IDX Composite'],['nasdaq-war','NASDAQ:NDX','NASDAQ / NAS100'],['oil-war','HYPERLIQUID:WTI','WTI perpetual'],['btc-war','BITSTAMP:BTCUSD','BTC/USD'],['warxau-topchat','OANDA:XAUUSD','XAU/USD']])routes.set('/assets/'+file+'-layout.js',[Buffer.from(layout.replaceAll('OANDA:XAUUSD',target).replaceAll('XAU/USD',label)+'\n'+NAV),'text/javascript; charset=utf-8']);
 return {handle(req,res){const p=String(req.url||'').split('?')[0];let a=routes.get(p);if(p==='/api/ihsg-war/status')a=[Buffer.from(JSON.stringify({version:VERSION,liveAvailable:false,state:'unconfigured',symbol:'IHSG',index:'IDX Composite',provider:null,dailySession:null,price:null,unit:'index points',chatRoom:TARGET})),'application/json'];if(!a)return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
 res.writeHead(200,{'Content-Type':a[1],'Content-Length':a[0].length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'X-IHSG-War':VERSION});res.end(req.method==='HEAD'?undefined:a[0]);return true;},metadata:()=>({version:VERSION,symbol:'IHSG',liveAvailable:false,visualPoint:1,chatRoom:TARGET,pageBytes:page.length})};
}
module.exports={makeIHSG,createIHSG,NAV,VERSION,TARGET};
