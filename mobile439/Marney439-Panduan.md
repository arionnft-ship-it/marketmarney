# MarketMarney 4.39 Instant

Versi ini melanjutkan 4.38 dengan fokus pada pemutaran Reel aktif, penggunaan bandwidth yang lebih tepat, respons sentuhan, dan perpindahan tab yang lebih cepat pada perangkat yang mampu.

## Perubahan utama

- Reel aktif dipantau berdasarkan jumlah video yang sudah ter-buffer di depan posisi pemutaran.
- Saat buffer aktif menipis, preload Reel lain otomatis diturunkan agar tidak berebut koneksi.
- Setelah buffer aktif kembali sehat, preload arah swipe dilanjutkan secara bertahap.
- Maksimal tiga origin media dipanaskan melalui `preconnect` dan `dns-prefetch` ketika browser sedang idle.
- Tombol, navigasi, dan kontrol Social menggunakan `touch-action: manipulation` agar sentuhan terasa lebih langsung.
- Efek dekoratif nonaktif dikurangi sementara saat video aktif kekurangan buffer.
- WebView yang disimpan sementara dapat memakai offscreen pre-raster pada perangkat normal, tetapi fitur ini tidak dipaksakan pada RAM rendah atau mode hemat daya.
- Opening sederhana memiliki pengaman pelepasan dan tidak dapat menutupi aplikasi tanpa batas.

## Yang tetap dipertahankan

- Logo MarketMarney hitam-oranye terbaru.
- Tema terang di seluruh aplikasi.
- Social Marney layar penuh dengan tombol Beranda.
- Navigasi Media, Reels, Pesan, Jelajah, dan Profil.
- Pemulihan video macet yang dibatasi tanpa memuat ulang seluruh Social.
- Website publik, database, akun, postingan, komentar, grup, dan pesan tidak diubah.

## Identitas build

- Nama: MarketMarney 4.39 Instant
- Versi: 4.39.0-beta
- Version code: 43
- Package: com.marketmarney.mobile.beta439

Build ini adalah APK beta pengujian dan belum memakai kunci produksi Google Play Store.
