# MarketMarney TV pada APK Android

Tab ketiga Android diganti dari XAUWar menjadi **MarketMarney TV**, dengan ikon televisi/play dan label dua baris. Tab lainnya tetap Beranda, Berita, Market Live, Social Marney.

## Implementasi
- WebView memuat halaman ringan **khusus APK Android** di URL same-origin https://marketmarney.com/__android43/marketmarney-tv. HTML dipaketkan di APK dan tidak bergantung pada homepage berat.
- Video, kategori, judul, dan thumbnail tetap dimuat dari **API konten MarketMarney yang sudah ada** (GET /api/content). Tidak ada video atau berita baru yang dibuat.
- Daftar responsif, filter kategori, pemutar MP4/YouTube dengan kontrol pengguna, dan tombol coba lagi jika server atau jaringan gagal.
- Tidak membuka JavaScript bridge atau mengubah backend. Tidak mengubah web publik, database, ataupun APK beta yang sudah didistribusikan.
- Halaman TV bisa tampil meskipun API sedang bermasalah. Pengujian mencatat secara terpisah apakah daftar video berhasil dimuat, atau hanya halaman + pesan coba lagi yang tersedia.
- Tautan XAUWar lama pada website tidak membajak tab TV.

## Pengujian dan publikasi
- Build Android dan APK test/Play candidate dilakukan di GitHub Actions pada cabang feature/android-marketmarney-tv-20261111.
- Native smoke test pada Android 16 wajib membuktikan tab 2 membuka UI TV dengan konten terlihat (bukan halaman hitam), dan mencatat status API.
- Tes opening beta lama tetap merupakan persyaratan QA terpisah.
- Kandidat AAB masih harus ditandatangani dengan kunci upload resmi dan diuji di perangkat nyata sebelum dirilis melalui Google Play.
