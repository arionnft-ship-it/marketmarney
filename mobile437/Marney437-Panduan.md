# MarketMarney 4.37 Smooth

Versi 4.37 memusatkan perubahan pada kelancaran penggunaan sehari-hari tanpa mengubah website publik atau database.

## Perubahan utama

- Aset Social Marney yang berat tidak lagi dibaca pada jalur pembukaan awal aplikasi.
- Setelah halaman pertama tampil, aset Social disiapkan di thread terpisah pada perangkat yang memiliki cukup RAM dan tidak sedang memakai mode hemat daya.
- Jika Social dibuka lebih dahulu, aset dimuat saat dibutuhkan dengan pengaman satu kali.
- Cookie WebView disimpan saat aplikasi dijeda atau dihentikan agar sesi login lebih tahan terhadap penutupan proses.
- Perubahan status jaringan Android digabung sebelum dikirim ke halaman, sehingga callback jaringan yang datang beruntun tidak memicu pekerjaan JavaScript berulang.
- Reel aktif yang benar-benar tidak bergerak dapat mencoba menyambung ulang secara otomatis sambil mempertahankan posisi.
- Pemulihan otomatis dibatasi paling banyak dua kali dan memiliki jeda 18 detik; setelah itu tombol Coba lagi ditampilkan.
- Pemulihan Reel tidak memuat ulang seluruh Social Marney dan tidak membuat permintaan API baru.

## Yang tetap dipertahankan

- Logo MarketMarney hitam-oranye terbaru.
- Opening sederhana dan singkat.
- Tema terang.
- Social Marney layar penuh.
- Tombol Beranda di Social.
- Navigasi Media, Reels, Pesan, Jelajah, dan Profil.
- Galeri langsung untuk foto dan video.
- Pengaturan jaringan, RAM, dan hemat daya dari versi 4.36.

## Catatan

Kecepatan video tetap dipengaruhi format dan ukuran unggahan, kualitas internet, server media/CDN, Android System WebView, serta kemampuan dekoder perangkat. Versi ini memperbaiki pekerjaan di sisi APK dan memberi pemulihan terbatas saat pemutaran benar-benar macet.
