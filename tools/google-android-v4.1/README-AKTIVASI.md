# MarketMarney Android v4.1 — Premium + native Google Login

Dibuat dan diuji 5 November 2026. **Belum dipasang ke MarketMarney live.**

## Yang sudah diperbaiki
- APK mengirim penanda `MarketMarneyAndroid/4.1` dan `android-native-v4.1`, bukan v3.
- Identifikasi origin WebView hanya diterapkan pada HTTPS `marketmarney.com`, bukan URL yang sekadar diawali teks domain serupa.
- Google Login tetap memakai Android Credential Manager dan ID token via HTTPS; tidak menggunakan formulir Google dalam WebView.
- Validasi token pada server menjaga pemeriksaan tanda tangan, audience Web Client ID, waktu, issuer, sub, email_verified, nonce sekali pakai.
- Klaim `azp` jika berbeda dari Web Client ID *hanya* diterima jika ID Klien Android terdaftar pada daftar izin `MM_ANDROID_GOOGLE_CLIENT_IDS`. Permintaan pengguna tidak dapat mengubah daftar izin itu.
- Cookie sesi `mm_reader` tetap berasal dari backend MarketMarney dan akun Social Marney yang sama. Tidak ada database akun baru.

## Hasil uji lokal
- 13 pemeriksaan login Android berbasis pasangan kunci uji, termasuk nonce, replay, `aud` salah, `azp` tidak terdaftar, dan `azp` yang terdaftar.
- 16/16 uji regresi OAuth web MarketMarney lama.
- Installer: `--check` pada source dasar, `--apply` dengan backup SQLite sintetis yang valid, `--check` ulang, upgrade dari v4 ke v4.1.
- Installer menolak backup kedaluwarsa (>6 jam) dan tidak mengubah source.
- Seluruh uji memakai data dummy lokal; belum diuji dengan akun Google nyata dan HP pengguna.

## Aktivasi server (untuk operator yang berwenang)
1. **Cadangkan database dan uploads live secara lengkap**, verifikasi, dan salin backup ke luar volume Railway. Installer belum bisa memverifikasi apakah salinan offsite sudah dilakukan.
2. Upload `MarketMarney-Google-Android-v4.1-Installer.js` ke **/persist** Railway.
3. Jalankan `node /persist/MarketMarney-Google-Android-v4.1-Installer.js --check` (hanya pemeriksaan).
4. Jika source cocok dan backup terbaru sudah diverifikasi, jalankan `node /persist/MarketMarney-Google-Android-v4.1-Installer.js --apply` pada waktu pemeliharaan.
5. Jalankan `node /persist/site-r1/MarketMarney-Railway-Staging/app/VERIFIKASI-RILIS.js`, lalu **Restart** layanan Railway, bukan Redeploy/Rollback.
6. Periksa GET `https://marketmarney.com/api/auth/android/config` melalui HTTPS. Respons harus `enabled: true`. Jangan menguji token nyata pada issue publik/log.
7. Uji Google Login pada HP: akun sudah tertaut, akun baru (jika registrasi diizinkan), akun diblokir, logout, dan akses grup privat setelah login.

## Google Cloud (tindakan pemilik proyek)
- Google Auth platform → Clients → Create client → Android.
- Package: `com.marketmarney.mobile`.
- **SHA-1 harus diambil dari APK v4.1 yang benar-benar akan diinstal** (file `MARKETMARNEY-APK-SHA1.txt` dari GitHub Actions). SHA-1 v4 sebelumnya tidak sama jika keystore debug berubah.
- Buat Android OAuth client pada proyek yang sama dengan Web Client ID MarketMarney. Jangan mengganti kredensial OAuth web.
- Jika token ID Google membawa `azp` Android client ID, set `MM_ANDROID_GOOGLE_CLIENT_IDS` di Railway ke Android client ID terdaftar (bukan client secret). Jika ada beberapa, pisahkan dengan koma.
- Untuk Play Store produksi, tanda tangani APK/AAB dengan kunci rilis yang dikelola pengguna dan daftarkan fingerprint **Play App Signing** terpisah. APK debug tidak layak publikasi.

## Batas akses
Koneksi Railway saat ini dapat membaca status layanan tetapi **tidak dapat mengeksekusi Console atau menulis file pada volume `/persist`**. Google Cloud OAuth Client Management juga belum tersedia untuk perubahan langsung. Karena itu tidak ada klaim bahwa login Google Android sudah aktif. Jangan mengirim client secret, backup, password, atau token Google ke chat.

## Setelah siap
Uji dari perangkat fisik Android, lalu siapkan build rilis AAB, kebijakan privasi, pelaporan konten, dan Play Console.