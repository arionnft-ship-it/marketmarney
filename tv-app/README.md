# MarketMarney TV pada APK Android

Tujuan: mengganti tab bawah XAUWar (posisi ketiga) menjadi MarketMarney TV. Empat tab lain tetap Beranda, Berita, Market Live, Social Marney.

- Nama menu: MarketMarney TV. Label tampilan dua baris (MarketMarney / TV) agar muat di layar ponsel.
- Ikon: bentuk layar video dan simbol play, menggantikan ikon XAUWar.
- Tujuan: katalog TV yang sudah aktif di halaman utama https://marketmarney.com/index.html, bukan URL terpisah /tv.html (404).
- Mekanisme: WebView mengakses halaman resmi dengan penanda #mm-app-tv, lalu memilih tombol navigasi data-page="MarketMarney TV" di halaman asli.
- Pemeriksaan siap: menu TV harus benar-benar aktif dan area filter video .mm-tv-filters harus tampil di dalam konten utama. Layar beranda kosong atau loading dianggap gagal.
- Link XAUWar lama dari website tidak dipetakan ke tab TV.
- Tidak mengubah website, backend, database, atau APK beta lama.

Status: cabang pengembangan, bukan publikasi. Build AAB untuk Google Play harus menggunakan kunci upload resmi dan melewati tes perangkat nyata serta persyaratan privasi/UGC.
