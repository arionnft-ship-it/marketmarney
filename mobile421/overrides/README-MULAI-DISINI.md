# Marney 4.21 — logo aplikasi transparan

Pembaruan ini menghapus lapisan latar biru gelap yang sebelumnya ditambahkan Android pada ikon MARNEY. Logo M, tulisan MARNEY, warna amber, serta bentuk dan ukuran gambar aslinya tetap dipertahankan. Latar khusus di belakang logo pada splash Android juga dibuat transparan.

## Memasang

1. Unduh dan pasang `Marney421.apk`.
2. Buka aplikasi bernama **Marney 4.21**.
3. Masuk menggunakan username dan kata sandi akun yang sudah terdaftar bila diperlukan.

Identitas paket uji ini adalah `com.marketmarney.mobile.beta421` (versi `4.21.0-beta`, kode 25). Aplikasi dapat terpasang berdampingan dengan 4.20. Sesi login versi sebelumnya tidak berpindah otomatis.

## Cakupan perubahan

- Ikon aplikasi menggunakan PNG transparan secara langsung. Ikon adaptif tidak dipakai karena Android dapat menggabungkan lapisan transparannya di atas bidang hitam.
- Logo splash memakai PNG yang sama dengan ruang aman 20% agar bentuknya tidak terpotong, dan tanpa latar khusus di belakang ikon.
- Nama dan penanda versi diperbarui menjadi 4.21.
- Semua gambar logo dan aset web dipertahankan byte demi byte dari 4.20; perbaikan akses, pemuatan, dan navigasi 4.20 tetap disertakan.

PNG asli yang disertakan adalah `Marney-Logo-Transparan.png`, ukuran 1254 × 1254 piksel dengan kanal alpha asli. Berkas ini tidak mempunyai bidang warna latar.

Bentuk dan pewarnaan ikon pada layar utama masih dapat mengikuti launcher atau tema perangkat. Pembaruan menghapus bidang biru yang ditambahkan aplikasi; pengaturan tema ikon Android berada di perangkat. Referensi: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive

## Akun dan kompatibilitas

Login Google langsung di APK beta belum tersedia. Untuk akun yang hanya memakai Google, gunakan versi web. Login pada browser tidak membuat APK ikut masuk. Jika aplikasi menampilkan petunjuk pembaruan WebView, perbarui komponen yang digunakan perangkat lalu buka aplikasi kembali.

## Pemeriksaan

Build memverifikasi bahwa aset web dan gambar logo sama dengan 4.20, memeriksa paket dan tanda tangan APK, lalu memeriksa ikon yang benar-benar dirender oleh Android. Bukti khusus ikon mencakup transparansi di area dalam logo dan gambar hasil render. Ini adalah pemeriksaan pembaruan logo; hasil pengujian fitur 4.20 dicatat terpisah di build sebelumnya: https://github.com/arionnft-ship-it/marketmarney/actions/runs/42396336237
