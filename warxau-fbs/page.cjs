'use strict';
function privatePage(html,client){
 const marker='<script>/* WarXAU 7.7';const start=html.indexOf(marker);if(start<0||html.indexOf(marker,start+1)>=0)throw Error('Feed module anchor missing');const end=html.indexOf('</script>',start);if(end<0)throw Error('Module boundary missing');
 html=html.slice(0,start)+'<script>'+client.replaceAll('</script','<\\/script')+'</script>'+html.slice(end+9);
 const notice='<section class="notice" style="margin:10px 0;font-size:12px;line-height:1.7">';const n=html.indexOf(notice);if(n<0)throw Error('Notice anchor missing');const e=html.indexOf('</section>',n);if(e<0)throw Error('Notice boundary missing');
 html=html.slice(0,n)+notice+'<strong>PRIVAT · FBS MT4 · BID</strong><br>Harga dikirim oleh MT4 milikmu, bukan TradingView. Tidak ada polling 30 detik. Timestamp arena adalah waktu penerimaan server; waktu broker tidak diklaim sebagai UTC. Latensi dan tick yang terlewat tetap mungkin terjadi.<br>Ronde menggunakan D1 UTC WarXAU (07.00 WIB), belum kalender daily FBS yang diverifikasi. Data ini tidak ditampilkan kepada pengunjung umum.</section>'+html.slice(e+10);
 const a=html.indexOf('function liveNotice(){'),z=html.indexOf('\n',a);if(a<0||z<0)throw Error('Notice function missing');
 html=html.slice(0,a)+"function liveNotice(){return 'FBS MT4 · BID · AKSES PRIVAT. Streaming saat tick diterima. Waktu adalah penerimaan server, bukan waktu transaksi bursa. D1 UTC WarXAU, bukan kalender FBS.';}"+html.slice(z);
 const replacements=[['window.MM_WAR_LIVE_BUILD="7.7-gold-api"','window.MM_WAR_LIVE_BUILD="7.8-fbs-private"'],["version:'7.7-hd-live'","version:'7.8-fbs-private'"],['Gold API · XAU/USD spot','FBS MT4 · BID — privat'],['LIVE · 30 DETIK','FBS · STREAM PRIVAT'],['GOLD API · SPOT','FBS MT4 · BID'],['WarXAU HD LIVE 7.7 | MarketMarney','WarXAU FBS Privat | MarketMarney'],['WARXAU / HD LIVE 7.7','WARXAU / FBS PRIVAT'],['Gold API · pembaruan sekitar 30 detik. Tidak ada harga simulasi dalam mode LIVE.','FBS MT4 · menunggu tick asli. Tidak ada harga simulasi dalam mode LIVE.'],['Mode LIVE memakai harga spot Gold API setiap sekitar 30 detik.','Mode privat memakai BID yang diterima relay dari terminal FBS MT4.'],['Gold API','FBS MT4']];
 for(const [old,next]of replacements)html=html.split(old).join(next);
 if(html.includes('https://api.gold-api.com'))throw Error('External feed remains');return html;
}
module.exports={privatePage};
