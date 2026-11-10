# MarketMarney 4.34 Performance

Versi ini menyempurnakan performa APK tanpa mengubah website publik atau database MarketMarney.

## Perbaikan utama

- Reel aktif menggunakan preload otomatis.
- Reel berikutnya dipersiapkan sebelum pengguna melakukan swipe.
- Reel sebelumnya dipertahankan sementara agar kembali ke video tidak mengunduh ulang dari awal.
- Maksimum tiga sampai empat Reel dipertahankan sesuai RAM dan kualitas koneksi.
- Video yang jauh dari layar dilepas dengan jeda singkat untuk mencegah bongkar-pasang buffer saat swipe cepat.
- Mode Hemat Data tetap tersedia dan membatasi preload.
- Perubahan kualitas koneksi diterapkan tanpa membuka ulang aplikasi.
- Observer pemulihan video hanya memantau area Reels, bukan seluruh halaman Social Marney.
- Waktu tunggu video macet dipersingkat menjadi sekitar lima detik sebelum tombol coba lagi tersedia.
- Kartu feed yang jauh dari layar tidak dirender penuh sampai mendekati viewport.
- Efek blur berat pada feed dinonaktifkan.
- Cache WebView, database lokal, dan DOM storage digunakan bersama tanpa memakai mode cache yang berisiko menampilkan data lama.
- Scrollbar dan efek overscroll WebView disederhanakan.

## Yang tetap dipertahankan

- Logo MarketMarney terbaru.
- Opening sederhana.
- Tema terang.
- Social Marney layar penuh.
- Tombol Beranda di Social Marney.
- Galeri langsung untuk unggah foto dan video.
- Tata letak Reels 4.33 yang sudah diperbaiki.
- Seluruh fungsi akun, feed, grup, pesan, profil, berita, XAUWar, dan Market Live.

## Catatan media

APK dapat mempercepat persiapan dan pemakaian buffer, tetapi kecepatan awal tetap dipengaruhi ukuran video, bitrate, koneksi, dukungan byte-range server, dan lokasi penyimpanan media. Video unggahan ideal menggunakan MP4 H.264/AAC, 720p atau 1080p, 30 fps, dan bitrate sekitar 2–4 Mbps.
