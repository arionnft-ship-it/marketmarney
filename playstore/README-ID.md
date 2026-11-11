# Persiapan Google Play — MarketMarney (11 November 2026)

**Status: BELUM SIAP DIPUBLIKASIKAN.** Cabang ini hanya menyiapkan kandidat AAB dan pengujian; **tidak** mengunggah aplikasi ke Google Play atau mengubah website/database.

## Pemeriksaan teknis

- [x] Sumber APK 4.39 Beta tersedia dan build beta sebelumnya berhasil di GitHub Actions.
- [x] Alur kandidat AAB dibuat dari sumber 4.39 yang sama, setelah pengujian beta.
- [x] ID aplikasi kandidat disiapkan menjadi `com.marketmarney.mobile`, bukan `com.marketmarney.mobile.beta439`.
- [x] API target diatur ke 36 dan versi kandidat `4.39.0` dengan `versionCode 44`.
- [x] Keamanan manifest diperiksa: `allowBackup=false` dan `usesCleartextTraffic=false`.
- [ ] Workflow kandidat AAB selesai tanpa error (lihat hasil GitHub Actions).
- [ ] AAB **ditandatangani** memakai kunci upload terpisah (bukan debug key). Di GitHub Secrets, sediakan: `MM_UPLOAD_KEYSTORE_B64`, `MM_PLAY_STORE_PASSWORD`, `MM_PLAY_KEY_ALIAS`, `MM_PLAY_KEY_PASSWORD`. Jangan masukkan rahasia ke repository atau percakapan.
- [ ] Verifikasi Play App Signing SHA-1/SHA-256 dan Google Login Android pada build yang diinstal dari jalur Play, bukan hanya APK debug.
- [ ] Pastikan `com.marketmarney.mobile` belum digunakan oleh aplikasi Play lain dengan penandatanganan yang tidak cocok; identitas paket tidak boleh diubah setelah publikasi.
- [ ] Pengujian di perangkat Android fisik: RAM rendah, Android 14–16, jaringan lambat/offline, cold start, background/resume, upload galeri, tautan, Google Login, Reels dan chat grup.

## Persyaratan produk dan Google Play

- [ ] Halaman **Kebijakan Privasi** publik (HTTPS), tanpa login dan dapat diakses dari dalam aplikasi; penjelasan sesuai dengan alur data nyata.
- [ ] **Penghapusan akun dan data terkait** tersedia dari dalam aplikasi **dan** dari URL publik di luar aplikasi; proses backend benar-benar menghapus data sesuai kebijakan retensi.
- [ ] Formulir **Keamanan Data (Data safety)** Play Console diisi berdasarkan audit data yang benar (login, profil, posting, pesan, foto/video, analitik, dan SDK).
- [ ] Social Marney: syarat penggunaan sebelum mengunggah, laporkan pengguna/konten, blokir pengguna, moderasi yang efektif, serta penanganan laporan.
- [ ] Reviewer Play Console dapat masuk dengan akun uji yang aman dan menguji fitur yang memerlukan login.
- [ ] Siapkan nama, ikon, screenshot asli aplikasi, grafis fitur, deskripsi, email dukungan, klasifikasi usia, deklarasi aplikasi berita/keuangan jika berlaku.
- [ ] Pastikan tidak ada klaim menyesatkan tentang fitur/iklan, serta disclaimer finansial dan sumber berita.
- [ ] Jika akun developer pribadi dibuat setelah 13 November 2023, lakukan **closed testing minimal 12 penguji selama 14 hari berturut-turut**, kemudian ajukan akses produksi.
- [ ] Pemilik memberi persetujuan eksplisit sebelum publikasi produksi.

## Kandidat AAB dan rahasia

Workflow: `.github/workflows/playstore-candidate.yml`.

1. Memulihkan kode dari pipeline 4.39 yang terverifikasi.
2. Membangun APK uji dan menjalankan emulator untuk performa Reels, navigasi Social, branding dan tema terang.
3. Menyesuaikan identitas aplikasi hanya di salinan build calon rilis.
4. Membangun AAB; **jika kunci belum disediakan, AAB adalah UNSIGNED dan hanya untuk inspeksi**.
5. Menyimpan hasil sebagai GitHub Actions artifact; **tidak** membuat GitHub Release atau publikasi Google Play.

**Catatan:** Build sukses ≠ siap produksi. Persyaratan kebijakan dan uji nyata tidak bisa dianggap lulus hanya dari CI.

Referensi resmi:
- Google Play target API 36: https://developer.android.com/google/play/requirements/target-sdk
- AAB untuk aplikasi baru: https://support.google.com/googleplay/android-developer/answer/2481797
- Pengujian developer pribadi baru: https://support.google.com/googleplay/android-developer/answer/14151465
- Kebijakan UGC Social: https://support.google.com/googleplay/android-developer/answer/9876937
- Penghapusan akun: https://support.google.com/googleplay/android-developer/answer/13327111
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
