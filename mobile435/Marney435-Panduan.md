# MarketMarney 4.35 Optimal

Versi ini melanjutkan 4.34 dengan fokus pada kelancaran penggunaan harian di perangkat Android.

## Perubahan utama

- Reels mencegah beberapa permintaan pemutaran video berjalan bersamaan.
- Video aktif dan video berikutnya tetap memakai buffer adaptif berdasarkan koneksi, RAM, mode Hemat Data, dan tekanan memori Android.
- Ketika aplikasi masuk latar belakang, video dan audio langsung dijeda.
- Saat Android membutuhkan RAM, video Reels yang tidak aktif serta WebView cadangan dilepas lebih cepat tanpa membersihkan login atau cache penting.
- Feed menerapkan pemuatan gambar bertahap dan decoding asinkron.
- Observer dibatasi pada area konten yang relevan agar CPU tidak terus bekerja pada seluruh halaman.
- Perubahan jaringan online/offline diproses tanpa memuat ulang seluruh Social Marney.
- Renderer WebView aktif diberi prioritas yang sesuai dan otomatis dapat dilepas ketika tidak terlihat.
- Logo MarketMarney, opening sederhana, tema terang, Social layar penuh, tombol Beranda, dan tata letak Reels tetap dipertahankan.

## Catatan

Website publik dan database MarketMarney tidak diubah. Kecepatan video tetap dipengaruhi ukuran file unggahan, server media, kualitas koneksi, versi Android System WebView, dan kemampuan dekoder perangkat.
