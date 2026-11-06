"""Patch only feed/UI text in the approved self-contained 7.6 page. No 3D changes."""
from pathlib import Path
import hashlib,re,json,sys
ROOT=Path(__file__).resolve().parent
BASE_SHA='5b242984dc0cfc8180d964a4cece6ee0fdbdb302d6463325888a0b867ad0ab44'
def build(source, output):
 b=Path(source).read_bytes()
 if hashlib.sha256(b).hexdigest()!=BASE_SHA:raise ValueError('Approved base page changed')
 s=b.decode();module=(ROOT/'live-gold.js').read_text()
 marker='<script>/* MarketMarney XAU War Market Assault v7 — UI and feed controller;'
 assert s.count(marker)==1
 s=s.replace(marker,'<script>'+module.replace('</script','<\\/script')+'</script>\n'+marker)
 old='window.MM_DEMO_ONLY=true';assert s.count(old)==1
 s=s.replace(old,'window.MM_DEMO_ONLY=false;window.MM_WAR_LIVE_BUILD="7.7-gold-api"')
 start=s.index('async function startLive(resume=false)');end=s.index('function renderData(',start)
 replacement="""async function startLive(resume=false){
 const keep=resume===true&&mode==='live'&&daily.meta;disconnect();mode='live';demo=null;
 if(!keep){daily.reset();dailyResult=null;dailyHandled=null;reset();}
 setModeButtons();status('waiting','MENGHUBUNGKAN HARGA ASLI');setText('source','Gold API · XAU/USD spot');
 notice(liveNotice());overlay('Menghubungkan harga spot emas.','Gold API · pembaruan sekitar 30 detik. Tidak ada harga simulasi dalam mode LIVE.');
 const rev=revision;
 if(offline){status('waiting','BUKA WEBSITE UNTUK LIVE');notice('Mode LIVE memerlukan HTTPS MarketMarney. File lokal tetap menggunakan DEMO.');return;}
 stream=MMGold.create({onQuote(q,meta){if(rev!==revision||mode!=='live')return;applyDaily(meta);if(accept(q,rev))retryCount=0;renderDaily();},onStatus(d){
  if(rev!==revision||mode!=='live'||d.state==='waiting')return;
  pauseDamage('gold-feed-gap');engine?.setActive(false);
  if(daily.phase!=='closed'){status(d.state==='stale'?'stale':'error',d.state==='stale'?'HARGA KEDALUWARSA':'FEED TERPUTUS');notice(d.message,true);setText('stage-stamp','DATA ASLI BELUM TERSEDIA');setText('battle-state','Pertempuran dijeda');if(!last)overlay('Menunggu harga asli.',d.message);}
  renderDaily();
 }});
}
"""
 s=s[:start]+replacement+s[end:]
 replacements={
 "function liveNotice(){return 'FEED XAU/USD • Pembaruan mengikuti penyedia, bukan setiap frame animasi. Timestamp dan usia data ditampilkan apa adanya.';}":"function liveNotice(){return 'LIVE SPOT · Gold API · pembaruan ±30 detik, bukan tick broker. D1 UTC WarXAU tutup 07.00 WIB. Gerakan dihitung sejak halaman tersambung; tidak merekonstruksi seluruh hari.';}",
 "status('live','FEED TERSAMBUNG')":"status('live','LIVE · 30 DETIK')",
 "'XAU/USD · FEED TERSAMBUNG'":"'XAU/USD · HARGA ASLI'",
 "mode==='live'?'FEED SERVER'":"mode==='live'?'GOLD API · SPOT'",
 "meta.provider+' · '+meta.timezone":"meta.provider+' · D1 UTC WarXAU (bukan broker)'",
 "Belum ada jadwal candle dari server":"Menunggu waktu server dan harga sumber",
 "Sesi live tidak ditebak dari jam browser":"D1 UTC WarXAU · sinkronisasi jam server",
 "DAILY CLOSE • Ronde selesai sesuai batas sesi dari server. Menunggu sesi daily berikutnya dari penyedia.":"DAILY CLOSE D1 UTC WARXAU • Ronde selesai pukul 07.00 WIB. Ini sesi agregasi WarXAU, bukan close broker. Menunggu sampel segar pada hari UTC berikutnya.",
 "Menunggu sesi berikutnya. Akhir pekan/libur mengikuti provider.":"Menunggu sampel segar sesi UTC berikutnya. Jadwal ini bukan kalender broker; close resmi provider tidak dihitung dari sampel terakhir.",
 "Candle daily mencapai batas tutup":"Sesi D1 UTC WarXAU mencapai batas tutup",
 "version:'7.6-hd-daily'":"version:'7.7-hd-live',liveFeed:window.MMGold?.diagnostics()??null",
 '>Feed server</button>':'>Live market</button>',
 'WarXAU HD Daily 7.6 | MarketMarney':'WarXAU HD LIVE 7.7 | MarketMarney',
 'WARXAU / HD DAILY 7.6':'WARXAU / HD LIVE 7.7',
 '7.6 / HD DAILY':'7.7 / HD LIVE',
 'REINFORCEMENT / AIR SUPPORT / 7.6':'REINFORCEMENT / AIR SUPPORT / 7.7',
 'Cara kerja HD Daily v7.6':'Cara kerja HD LIVE v7.7',
 'Jadwal dari server / provider':'D1 UTC WarXAU · bukan kalender broker'
 }
 for old,new in replacements.items():
  if old not in s:raise ValueError('Missing patch anchor: '+old)
  s=s.replace(old,new)
 # Make source, privacy, daily meaning and incomplete session observation explicit.
 note='''<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7"><strong>DATA PASAR ASLI · SNAPSHOT ±30 DETIK</strong><br>Harga spot XAU/USD dari <a href="https://gold-api.com" target="_blank" rel="noopener noreferrer">Gold API</a>. Browser menghubungi penyedia langsung; penyedia menerima alamat IP koneksi. Timestamp adalah waktu penyedia mengambil data, bukan waktu transaksi bursa. Harga bisa berbeda dari broker.<br><strong>D1 UTC WarXAU:</strong> penutupan ronde 00.00 UTC / 07.00 WIB, bukan New York close atau kalender broker. Statistik hanya dari sampel sejak tersambung; refresh memulai pengamatan baru. Tidak ada replay harga terlewat, interpolasi harga, atau peralihan otomatis ke DEMO.</section>'''
 anchor='<section class="daily-strip"';assert s.count(anchor)==1;s=s.replace(anchor,note+anchor)
 a=s.index('<h3>Perang satu sesi daily</h3>');z=s.index('<h3>',a+8)
 s=s[:a]+'''<h3>Perang satu sesi D1 UTC WarXAU</h3><p>Mode LIVE memakai harga spot Gold API setiap sekitar 30 detik. Arena menghitung perubahan sampel yang benar-benar diterima, bukan seluruh tick market. Batas sesi adalah 00.00 UTC sampai 00.00 UTC berikutnya (tutup 07.00 WIB), disinkronkan dengan jam HTTP server MarketMarney. Ini kalender agregasi WarXAU, bukan candle broker. Pada deadline, seluruh serangan berhenti. Hari berikutnya dimulai hanya setelah sampel baru yang valid masuk. Harga terakhir bukan closing resmi penyedia. Refresh dan kembali dari tab tidak aktif tidak merekonstruksi gerak yang terlewat. Mode DEMO tetap terpisah.</p>'''+s[z:]
 assert 'window.MM_DEMO_ONLY=true' not in s
 assert "new EventSource('/api/xau-war/stream')" not in s
 assert 'id="quality"' not in s
 p=Path(output);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
 return {'sha256':hashlib.sha256(s.encode()).hexdigest(),'bytes':len(s.encode()),'baseSha256':BASE_SHA,'mode':'live-spot','provider':'Gold API','intervalMs':30000,'calendar':'MarketMarney D1 UTC; not broker calendar','version':'7.7-hd-live'}
if __name__=='__main__':
 result=build(sys.argv[1],sys.argv[2]);Path(sys.argv[2]).with_suffix('.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
