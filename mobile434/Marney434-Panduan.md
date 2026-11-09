# MarketMarney 4.34 Optimized

Versi ini memprioritaskan kelancaran Reels dan Social Marney tanpa mengubah website publik atau database.

## Perbaikan utama
- Reels memakai buffer terbatas tiga video: aktif, berikutnya, dan sebelumnya.
- Reel berikutnya disiapkan lebih awal; video jauh dilepas agar RAM tetap terjaga.
- Buffer Reel aktif dipertahankan sebentar saat berpindah menu atau aplikasi.
- Preferensi reduced motion tidak lagi mematikan pemuatan video.
- Daftar Reels dipersiapkan saat perangkat sedang idle dan koneksi tidak memakai Hemat Data.
- Kembali ke aplikasi tidak memuat ulang daftar Reels bila datanya masih baru.
- Kartu feed di luar layar tidak dirender penuh sampai mendekati viewport.
- Efek blur berat pada navigasi Social dinonaktifkan.

## Pemasangan
Pasang `Marney434.apk`. Paket beta terpisah sehingga login mungkin perlu dilakukan kembali.

## Catatan media
Kecepatan akhir tetap dipengaruhi ukuran MP4, codec, server media, dan koneksi. APK ini mengoptimalkan buffering dan penggunaan memori di sisi aplikasi.
