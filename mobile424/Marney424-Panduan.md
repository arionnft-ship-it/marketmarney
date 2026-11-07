# Marney 4.24 — menu adaptif dan galeri langsung

Versi ini menyempurnakan Marney 4.23 tanpa menghapus tampilan 3D ringan, logo transparan, maupun penghapusan empat kartu pintasan Beranda.

## Perubahan utama

### Warna menu bawah mengikuti halaman

- Menu bawah menyesuaikan mode terang atau gelap dari halaman yang sedang dibuka.
- Beranda dan Market Live mengikuti pilihan tema publik.
- Halaman Berita mengikuti tombol tema berita.
- Social Marney, grup, profil, akun, dan jurnal mengikuti warna latar halaman masing-masing.
- Saat Reels dibuka, status bar, navigation bar, dudukan menu, dan pelat ikon menggunakan dasar hitam agar menyatu dengan area video.
- Ketika keluar dari Reels, warna menu kembali mengikuti halaman tujuan.

Sinkronisasi dilakukan ketika atribut tema atau tujuan halaman berubah. Tidak ada polling berkala, animasi latar berulang, font baru, gambar besar, atau permintaan jaringan tambahan.

### Unggah langsung membuka galeri

- Pada Social Marney, Reels, grup, profil, dan halaman akun, tombol unggah media langsung membuka pemilih foto/video Android.
- Input media generik pada Social dan grup diarahkan ke foto serta video.
- Input generik pada profil dan akun diarahkan ke foto.
- Permintaan kamera pada halaman media diarahkan ke galeri sesuai permintaan versi ini.
- Input yang secara eksplisit meminta dokumen seperti PDF tetap memakai pemilih berkas dan tidak dipaksa menjadi galeri.
- Aplikasi tetap hanya membaca media yang dipilih pengguna; aplikasi tidak memindai atau mengunggah seluruh galeri.

## Memasang

1. Unduh dan pasang `Marney424.apk`.
2. Buka **Marney 4.24**.
3. Masuk kembali menggunakan username dan kata sandi jika diminta.

Paket beta: `com.marketmarney.mobile.beta424`, versi `4.24.0-beta`, kode 28. Versi ini dapat terpasang berdampingan dengan 4.23. Sesi login versi sebelumnya tidak berpindah otomatis.

Login Google langsung di APK beta belum tersedia. Akun yang hanya memakai Google dapat menggunakan versi web; login browser tidak otomatis membuat APK ikut masuk.

## Cakupan pemeriksaan

Build memeriksa versi, tanda tangan, keutuhan aset, sinkronisasi warna terang–gelap–Reels, kebijakan pemilih galeri, ukuran serta urutan navigasi, pengamanan injeksi halaman, dan layar pemulihan. Pengujian emulator tidak menjamin hasil kinerja yang sama pada setiap HP fisik, versi WebView, atau launcher.
