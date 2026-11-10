# MarketMarney 4.38 Fluid

Versi ini melanjutkan 4.37 dengan fokus pada respons sentuhan, kestabilan perpindahan Reel, dan navigasi aplikasi yang tidak melakukan muat ulang tanpa alasan.

## Perubahan utama

- Aktivasi Reel memakai hysteresis agar dua video tidak saling mengambil alih saat swipe pendek.
- Preload mengikuti arah swipe, sehingga bandwidth diprioritaskan ke video yang kemungkinan dibuka berikutnya.
- Setelah gerakan berhenti, kartu terdekat dipilih secara konsisten melalui `scrollend` atau fallback terjadwal.
- Postingan Social yang jauh dari layar memakai `content-visibility` dan containment agar feed panjang lebih ringan.
- Tab yang sering dipakai dapat dipertahankan hingga dua pada perangkat normal; perangkat RAM rendah atau mode hemat daya tetap dibatasi satu.
- Menekan tab yang sedang aktif tidak lagi memuat ulang halaman yang sama.
- Permintaan membuka URL yang identik tidak lagi mengulang navigasi WebView.
- Renderer WebView tetap diprioritaskan pada perangkat normal, tetapi boleh dilepas Android pada perangkat RAM rendah.

## Yang tidak diubah

- Website publik dan database MarketMarney.
- Akun, postingan, komentar, grup, pesan, dan data pengguna.
- Logo MarketMarney terbaru, opening sederhana, tema terang, Social layar penuh, tombol Beranda, dan struktur menu.

## Identitas build

- Nama: MarketMarney 4.38 Fluid
- Versi: 4.38.0-beta
- Version code: 42
- Package: com.marketmarney.mobile.beta438

Build ini adalah APK beta pengujian dan belum memakai kunci produksi Google Play Store.
