# Marney 4.20 — perbaikan kinerja dan akses fitur

Versi ini menindaklanjuti laporan lambat dan fitur yang sulit dibuka pada 4.19. Logo MARNEY amber terbaru dan tampilan premium tetap dipakai.

## Perubahan

- Menu Social menunggu pemeriksaan sesi selesai sebelum menentukan apakah pengguna harus masuk. Pilihan menu selama pemuatan akan dilanjutkan setelah sesi valid.
- Gangguan pemuatan profil ditampilkan sebagai masalah profil dengan pilihan coba lagi. Gangguan tersebut tidak lagi menyembunyikan seluruh fitur dari pengguna yang sudah terautentikasi.
- Pembacaan data memiliki batas waktu. Tombol coba lagi tersedia untuk memulihkan bagian yang gagal, tanpa mengulang pengiriman postingan atau pesan secara otomatis.
- Panel pengikut dan jaringan trader dapat dibuka kembali melalui menu Social.
- Reels dapat mulai dimuat tanpa menunggu daftar percakapan, grup, atau statistik tambahan.
- Pencarian feed dijeda singkat saat mengetik, dan pemuatan halaman berikutnya mempertahankan kartu yang sudah ada.
- Penyimpanan cookie tidak dipaksakan secara sinkron pada setiap halaman selesai dimuat. Penyimpanan sesi pada alur autentikasi native tetap tersedia.
- Tombol coba lagi untuk halaman BTC War dan OIL War kembali ke halaman yang gagal, termasuk pilihan tampilannya.

## Memasang APK

1. Unduh `Marney420.apk` dan buka dari pengelola berkas Android.
2. Izinkan pemasangan dari aplikasi pengelola berkas tersebut bila Android meminta.
3. Buka aplikasi bernama **Marney 4.20**.
4. Masuk dengan username dan kata sandi akun yang sudah terdaftar.

Identitas paket versi uji ini adalah `com.marketmarney.mobile.beta420`. APK dapat terpasang berdampingan dengan versi uji sebelumnya. Data aplikasi sebelumnya tidak dihapus. Karena paket berbeda, sesi login sebelumnya tidak berpindah otomatis. Data akun di server mengikuti akun yang digunakan untuk masuk.

## Login Google

Login Google native belum tersedia untuk paket beta ini karena identitas penandatanganannya belum terdaftar untuk OAuth Android. Akun yang mempunyai username dan kata sandi dapat masuk melalui formulir aplikasi.

Untuk akun yang hanya memakai Google, pilih **Buka versi web** pada penjelasan login atau buka `https://marketmarney.com/akun.html` di browser. Login tersebut berlaku untuk versi web; tidak membuat APK ikut masuk. Tidak ada perubahan atau pelonggaran pemeriksaan autentikasi server dalam perbaikan ini.

## Ruang lingkup pemeriksaan

Rangkaian pemeriksaan menjalankan HTML dan skrip asli dari APK dengan respons API simulasi yang dinyatakan secara eksplisit. Skenario meliputi sesi lambat, sesi gagal, tamu, profil gagal, pemulihan baca, navigasi, panel akun, Reels, dan pembaruan feed. Pengujian native mencakup Android API 29 dan 35 serta batas origin, pemulihan halaman, navigasi, dan aset logo.

Pengujian produksi awal memakai sesi anonim dan permintaan baca. Tidak ada akun pribadi, pesan, postingan, unggahan, atau transaksi nyata yang digunakan. Hasil tersebut tidak menggantikan pengujian akun pengguna pada perangkatnya sendiri.

Manifest sumber, sertifikat, dan SHA-256 APK disertakan dalam hasil build. Berkas `Marney420-SHA256.txt` menunjukkan hash APK hasil build yang tepat.
