# Social Marney 4.4 Beta - referensi video

Perubahan hanya di aplikasi Android beta; tidak mengubah website, database, akun, atau Google OAuth aplikasi utama.

## Tampilan
- Feed putih, ikon garis hitam, Story melingkar dengan ring gradasi.
- Foto/video selebar linimasa, tombol reaksi/komentar/bagikan memakai handler lama.
- Reels berkanvas gelap, pesan memenuhi area konten aplikasi.
- Pencarian asli Social Marney dan grid media yang sudah dimuat.
- Profil grid tiga kolom dengan jumlah postingan/pengikut asli; tersedia tampilan daftar.
- Menu atas Social: Linimasa, Reels, Pesan, Jelajah, Profil.
- Menu utama bawah tetap Beranda, Berita, Market Live, Social Marney.

## Instalasi
Ekstrak paket ZIP, lalu instal Marney44.apk di Android 7 atau lebih baru. Aplikasi bernama Social Marney 4.4 Beta, package com.marketmarney.mobile.beta44. Jangan menghapus aplikasi utama atau beta sebelumnya; ini terpasang terpisah.

## Batas penting
Ini build debug pengujian, bukan versi Play Store. Google Login native belum didaftarkan untuk identitas/sertifikat beta44 dan tidak diklaim aktif. Login email dapat digunakan hanya jika akun Anda sebelumnya memiliki kata sandi. Akun Google-only tidak otomatis memiliki kata sandi. Kredensial aplikasi utama tidak diganti.

Data contoh hanya ada dalam fixture uji dan pratinjau, tidak dimasukkan ke APK. Grid Jelajah menampilkan media linimasa yang sudah dimuat, bukan mesin rekomendasi global. Fungsi Story, Reels, pesan, follow dan moderasi tetap bergantung pada backend serta izin akun yang sudah ada. Tidak menambahkan panggilan suara/video, efek kamera, atau fitur Instagram yang belum dimiliki server.

## Pengujian
Uji DOM lokal menggunakan fixture sintetis pada lebar 360 dan 412 piksel: 53 pemeriksaan lulus. Meliputi tata letak, navigasi, tampilan tamu dan pelestarian handler komentar/reaksi/pencarian/follow. Bukan pengujian login nyata atau pengiriman konten.
Workflow membangun APK, menjalankan Android Lint dan verifikasi tanda tangan. Job emulator terpisah memeriksa halaman tamu dan empat tab. Hasil aktual job harus dibaca sebelum menyatakan pengujian perangkat lulus.

## Reproduksi
python3 mobile43/prepare.py
python3 mobile44/prepare44.py android43
gradle --project-dir android43 :app:assembleDebug :app:lintDebug

Gunakan keystore rilis yang stabil dan dikelola pemilik untuk distribusi utama; jangan menerbitkan debug APK ini ke Play Store.
