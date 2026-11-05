# MarketMarney Android 4.3 Beta

## Cara memasang

APK ini dipasang berdampingan dengan MarketMarney v4.1/v4.2. **Jangan hapus aplikasi lama.**
Unduh `Marney43.apk` atau ekstrak paket ZIP. Buka APK dari File Manager Android dan konfirmasi instalasi. Jangan menonaktifkan Play Protect. Aplikasi bernama **MarketMarney 4.3 Beta**.

## Yang berubah

Navigasi bawah hanya **Beranda, Berita, Market Live, Social Marney**.

- Beranda tetap memakai halaman website MarketMarney di dalam aplikasi, bukan Chrome.
- Berita: tampilan editorial mobile, artikel unggulan, thumbnail, pencarian, filter kategori, simpan penanda artikel di perangkat, pagination, tema terang/gelap, dan kondisi gagal koneksi yang jelas. Artikel berasal dari `/api/content`; tidak ada harga atau berita rekaan.
- Market Live langsung membuka grafik yang sudah ada di website.
- Social Marney langsung membuka halaman komunitas, bukan layar tombol perantara. Terdapat header Social Marney, Story berbentuk lingkaran, linimasa dengan media lebar, tab Reels, akses Grup, pesan, notifikasi, buat postingan dan pengaturan profil. Tampilan ini terinspirasi pola interaksi Instagram, bukan aplikasi Instagram atau replika seluruh fiturnya.
- Komentar, reaksi, jumlah penonton, izin grup, moderasi dan publikasi tetap memakai backend MarketMarney yang sudah ada. Tidak ada database baru dan tidak ada data live yang diubah oleh pembuatan APK ini.
- Pemutar layar penuh, unggah dari pemilih berkas, halaman coba-lagi dan tombol Kembali ditangani di dalam APK.

## Login dan batas beta

Package uji: `com.marketmarney.mobile.beta43`.
Aplikasi ini memiliki sesi terpisah dari APK utama. **Google Login native belum didaftarkan untuk package/sertifikat beta ini.** Jangan menghapus OAuth klien v4.1. Tombol Google di beta menjelaskan batas ini dan menawarkan masuk dengan email. Gunakan akun email yang sudah terdaftar; tidak perlu membuat akun baru bila akun tersebut sudah punya kata sandi.

Akun yang dibuat hanya dengan Google tidak otomatis memiliki password. Tetap gunakan aplikasi utama untuk akun tersebut sampai sertifikat rilis final didaftarkan. Tidak ada klaim login Google beta, upload, komentar dan Story dengan akun nyata sudah diuji.

## Pengujian

Workflow GitHub menjalankan pemeriksaan kode, kompilasi, Android Lint, verifikasi tanda tangan APK, pengujian UI Chromium dengan data sintetis, dan uji pasang/buka empat tab pada emulator Android 11. Hasil akhir tiap pengujian harus dilihat pada artefak laporan; sebuah build berhasil saja bukan bukti semua pengujian berhasil.

Uji browser memeriksa pencarian, filter, bookmark, tema, kondisi offline, tata letak 360/412 px, Story bulat, perpindahan Reels, composer dan pelestarian event handler komentar. Tidak mengirim postingan maupun mengubah data pengguna pada server.

## Catatan operator

Kode utama baru: `mobile43/MainActivity.java`. Aset tampilan: `mobile43/assets/`. Proyek hasil build menggunakan sumber autentikasi dari `android-v4`, tanpa mengubah konfigurasi Railway atau Google Cloud.

WebView menerima halaman utama hanya dari origin HTTPS MarketMarney. Tidak ada JavaScript bridge. SSL error dibatalkan, akses file WebView nonaktif, konten HTTP campuran diblokir, dan situs eksternal memerlukan konfirmasi pengguna.

Penanda berita disimpan lokal dengan prefix `mm43-news-`. Menghapus APK beta menghapus penandanya, bukan artikel/server. Tidak ada publikasi Play Store, perubahan domain atau pembelian layanan.

Sebelum rilis utama, gunakan keystore rilis tetap yang dikelola pemilik. APK debug CI menggunakan sertifikat uji; jangan diperlakukan sebagai pembaruan produksi dengan sertifikat v4.1.
