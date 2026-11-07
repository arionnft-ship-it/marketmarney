# Marney 4.22 — Beranda lebih ringkas

Empat kartu pintasan pada Beranda dihapus dari tampilan:

- Berita Terkini
- Analisa Market
- Kalender Ekonomi
- Social Marney

Seluruh bagian kartu disembunyikan tanpa menyisakan tinggi atau margin. Aturan tampilan tetap berlaku ketika berpindah menu dan kembali ke Beranda. Menu utama, navigasi bawah, halaman fitur, headline, daftar berita, dan MarketMarney TV tetap tersedia.

## Memasang

1. Unduh dan pasang `Marney422.apk`.
2. Buka **Marney 4.22**.
3. Masuk kembali menggunakan username dan kata sandi bila diminta.

Paket beta: `com.marketmarney.mobile.beta422`, versi `4.22.0-beta`, kode 26. Aplikasi dapat terpasang berdampingan dengan 4.21; sesi login sebelumnya tidak berpindah otomatis.

## Perubahan dan pemeriksaan

Perubahan tampilan hanya berlaku pada halaman Beranda di APK. Aturan CSS diarahkan ke wadah empat kartu, tidak ke tombol navigasi atau seluruh halaman fitur. Tidak ada polling, observer baru, ataupun permintaan jaringan tambahan.

Logo transparan dari 4.21 dan perbaikan pemuatan serta akses fitur dari 4.20 tetap disertakan. Semua aset web dan gambar logo dalam paket ini dipertahankan byte demi byte dari 4.21. Build memeriksa versi, tanda tangan, keutuhan sumber yang dipertahankan, serta kesamaan aset dalam APK dengan sumbernya.

Pembaruan ini berfokus pada tampilan Beranda. Pengujian seluruh fitur dari versi sebelumnya tidak diklaim sebagai pengujian ulang pada 4.22.

## Catatan beta

Login Google langsung di APK beta belum tersedia. Untuk akun yang hanya memakai Google, gunakan versi web. Login di browser tidak otomatis membuat APK ikut masuk.

Logo sumber memiliki transparansi asli. Bingkai ikon pada layar utama dapat mengikuti launcher atau tema perangkat.
