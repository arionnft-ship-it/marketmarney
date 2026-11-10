# MarketMarney 4.36 Stable

Versi ini melanjutkan 4.35 dengan fokus pada koneksi Android nyata, jaringan terbatas, mode hemat daya, pemulihan Reels, serta stabilitas ketika pengguna berpindah Wi-Fi/data seluler.

## Perubahan utama

- Status koneksi dibaca langsung dari Android, termasuk internet tervalidasi, jaringan terbatas, dan perkiraan downlink.
- Reels mengurangi preload saat jaringan berbayar, internet belum tervalidasi, mode hemat daya aktif, atau RAM sedang tertekan.
- Video aktif tetap diprioritaskan, tetapi video berikutnya tidak dipaksa dimuat penuh pada kondisi terbatas.
- Media dijeda ketika aplikasi berada di latar, offline, atau internet belum benar-benar siap.
- Kegagalan jaringan yang sedang menampilkan halaman pemulihan dicoba kembali setelah koneksi tervalidasi, dengan pembatas agar tidak terjadi loop reload.
- Banner koneksi kecil hanya muncul ketika offline, internet belum siap, atau baru tersambung kembali.
- Tidak ada perubahan pada website publik, database, akun, isi postingan, atau izin pengguna.

## Identitas build

- Package: `com.marketmarney.mobile.beta436`
- Version name: `4.36.0-beta`
- Version code: `40`
- Tema: terang
- Opening: sederhana

## Catatan instalasi

Package berbeda dari 4.35 sehingga dapat dipasang berdampingan. Login mungkin perlu dilakukan kembali. Setelah versi ini dipastikan berjalan baik, versi lama dapat dihapus.
