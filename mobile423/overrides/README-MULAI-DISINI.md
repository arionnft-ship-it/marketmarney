# Marney 4.23 — tampilan 3D ringan

Pembaruan ini memberi kesan kedalaman pada antarmuka melalui panel berlapis, tepi timbul, sorotan permukaan, bayangan pendek, dan tombol amber dengan respons saat ditekan.

## Bagian yang diperbarui

- Navigasi bawah: dudukan berlapis, ikon bernuansa metalik, dan penanda menu aktif.
- Beranda, berita, panel analisa, kalender, Market Live, TV, dan utilities: kartu serta kontrol dengan tampilan berdimensi.
- Social Marney, pesan, grup, dan profil: kartu timbul, area input cekung, serta header yang konsisten.
- Akun dan jurnal: panel dan kontrol mengikuti tema halaman.
- Reels dan XAUWar: aksen kedalaman pada kontrol di sekitar konten.
- Dialog aplikasi, status koneksi, dan tombol pemulihan: gaya yang sama dengan navigasi.

Efek menggunakan CSS dan drawable Android yang ringan. Tidak ada mesin 3D tambahan, gambar besar, font baru, animasi berulang, polling, ataupun permintaan jaringan baru untuk tema ini. Waktu dan kelancaran aktual tetap dipengaruhi HP, WebView, jaringan, dan isi halaman.

Warna asli media, area video, grafik dari penyedia eksternal, serta arena XAUWar tetap menggunakan perender masing-masing. Efek 3D diterapkan pada antarmuka Marney di sekelilingnya.

Logo transparan dari 4.21 dan penghapusan empat kartu pintasan Beranda dari 4.22 tetap disertakan. Semua aset web sebelumnya dipertahankan; dua berkas tema baru ditambahkan tanpa mengganti logika fitur lama.

## Memasang

1. Unduh dan pasang `Marney423.apk`.
2. Buka **Marney 4.23**.
3. Masuk kembali menggunakan username dan kata sandi jika diminta.

Paket beta: `com.marketmarney.mobile.beta423`, versi `4.23.0-beta`, kode 27. Versi ini dapat terpasang berdampingan dengan 4.22. Sesi login sebelumnya tidak berpindah otomatis.

Login Google langsung di APK beta belum tersedia. Akun yang hanya memakai Google dapat menggunakan versi web. Login browser tidak otomatis membuat APK ikut masuk.

## Cakupan pemeriksaan

Build memeriksa tanda tangan, versi, keutuhan aset, dan berkas sumber yang dipertahankan. Pratinjau browser memakai berkas dari APK untuk halaman bawaan, dengan data contoh lokal untuk memeriksa tampilan tanpa mengakses akun pengguna. Pemeriksaan native terfokus pada ukuran tombol navigasi, pergantian halaman, pengamanan penerapan gaya, dan layar pemulihan.

Hasil pemeriksaan ini tidak merupakan pengukuran FPS atau jaminan kinerja yang sama pada seluruh perangkat fisik.
