# Marney 4.19 Premium — MARNEY terbaru

Pembaruan aplikasi Android dari source final Marney 4.18.

## Yang diperbarui

- Logo menggunakan file M amber + MARNEY terbaru yang diunggah pengguna. Bentuk dan tulisan utuh, tanpa mengganti foto profil pengguna.
- Ikon launcher, opening, logo Beranda/Market Live, Berita, Social Marney, profil, grup dan header XAUWar memakai aset branding yang disediakan aplikasi.
- Header Social lebih rapi, jarak dan tipografi kartu diperhalus, serta warna amber diselaraskan dengan logo terbaru.
- Halaman Berita mempertahankan tema gelap/terang, pencarian, filter kategori, artikel tersimpan dan penanganan koneksi.
- Menu bawah menggunakan umpan balik sentuhan amber bawaan Android.
- Logo disiapkan pada ukuran sesuai penggunaannya: web 384 px, opening 512 px dan ikon lama 192 px.

## Pemasangan

Unduh Marney419.apk, buka dari folder Unduhan, lalu ikuti pemasangan Android.
Buka aplikasi bernama **Marney 4.19 Premium**.

Ini paket beta terpisah `com.marketmarney.mobile.beta419`, versi `4.19.0-beta`, versionCode 23.
Kunci penandatanganan versi sebelumnya tidak tersedia, sehingga paket ini dapat dipasang
berdampingan. Jangan hapus aplikasi utama atau versi stabil. Sesi login tidak berpindah
otomatis. Google Login native belum didaftarkan untuk paket beta ini; akun Google-only
tidak otomatis memiliki kata sandi email.

## Perilaku yang dipertahankan

Lima menu utama: Beranda, Berita, XAUWar, Market Live dan Social Marney.
Handler Reels, pesan, grup, profil, galeri, cache, autentikasi, izin dan pembatasan origin
dipertahankan. Opening bisa dilewati dan selesai ketika halaman siap; tidak ada penundaan
minimum yang ditambahkan. Konten halaman tetap membutuhkan internet.

Pembaruan tidak menambahkan font jaringan, library runtime, animasi berulang atau efek blur.
Pengujian memakai emulator dan konten contoh yang terpisah dari data pengguna, bukan HP
pengguna. Hasilnya tidak menjamin nol lag pada semua perangkat atau jaringan.

## Source dan build

Folder `android419` dalam paket source sudah berisi hasil patch 4.19. Jangan menjalankan
`prepare419.py` lagi pada folder yang sudah dipatch. Script tersebut khusus mereproduksi
perubahan dari source final 4.18 dengan APK dasar SHA-256
`f47733f283f5469f25833b9068637e41a6e0675d9db097cbbc436849c9e69738`.
Salinan source dasar yang dipakai disertakan pada `mobile419/base418-source.zip` dengan
SHA-256 `701601854939d00ec33097c4c483e20c3d3f576d8921d73f273d263c344dadfc`.

Build membutuhkan JDK 17, Gradle 8.13, Android SDK platform 36 dan Build Tools 35.0.0.
Jalankan `gradle --no-daemon --project-dir android419 :app:assembleDebug :app:assembleDebugAndroidTest`.
Workflow yang disertakan membangun APK dan menjalankan pemeriksaan browser serta emulator
Android 10 dan Android 15. `preserved419.json` berisi hash source yang dipertahankan dan
daftar perubahan visual yang diperbolehkan.

Source tidak menyertakan private signing key, `.env`, kredensial atau data akun.
Paket ini tidak memublikasikan aplikasi ke Play Store dan tidak mengubah server/website.
