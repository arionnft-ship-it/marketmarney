# MarketMarney Android v4 — Premium Native + Google Credential Manager

## Status

Android v4 memiliki dashboard, navigasi, berita, Social Marney dan akun dalam tampilan **Android native**. Grafik, sebagian fitur komunitas, dan editor masih memakai WebView **di dalam aplikasi** (hybrid), bukan membuka Chrome.

### Native Google Sign-In

- Tombol **Lanjutkan dengan Google** memakai **Google Credential Manager** / account picker bawaan Android. Google tidak ditampilkan dalam WebView.
- APK mengambil `webClientId` publik dan nonce sementara dari server MarketMarney. Tidak ada Client Secret di APK.
- ID token dikirim ke `/api/auth/android/google` melalui HTTPS untuk validasi tanda tangan, audience, issuer, waktu dan nonce satu kali.
- Server menerbitkan cookie `mm_reader` yang dipakai ulang dalam WebView Social Marney. Akun Social Marney tetap sama.
- **Google Login tidak akan berfungsi sampai patch backend Android Google v4 dipasang dan aplikasi Android didaftarkan pada Google Cloud sesuai package dan SHA-1 sertifikat APK.**

### Instalasi di HP

1. Hapus APK v3 jika tanda tangan debug berbeda, kemudian instal APK v4.
2. Buka MarketMarney (dashboard native premium tampil).
3. Buka tab Social atau Akun → **Lanjutkan dengan Google**.
4. Pilih akun pada dialog Google Android. Jika konfigurasi server/OAuth belum lengkap, aplikasi menampilkan pesan status tanpa mengirim pengguna ke website.
5. Setelah berhasil, Social Marney menggunakan sesi yang sama dan tetap terbuka di dalam APK.

### Langkah backend (operator)

1. Buat dan unduh **backup baru terverifikasi** di luar volume Railway. Jangan hanya mengandalkan backup lama.
2. Di Railway Console `/persist/`, upload file `MarketMarney-Android-Google-Installer-v4.js`.
3. Periksa: `node /persist/MarketMarney-Android-Google-Installer-v4.js --check`.
4. Hanya jika source cocok, pada jadwal pemeliharaan, lakukan: `node /persist/MarketMarney-Android-Google-Installer-v4.js --apply`.
5. Jalankan `node /persist/site-r1/MarketMarney-Railway-Staging/app/VERIFIKASI-RILIS.js` dan Restart service Railway **setelah backup**.
6. Endpoint `/api/auth/android/config` harus membalas `enabled:true`. Jangan pernah membagikan Client Secret.

### Registrasi Google Cloud

Di Google Cloud Console → Google Auth platform → Clients, buat **Android OAuth client** di proyek Google yang sama dengan website.
- Package name: `com.marketmarney.mobile`
- SHA-1: ambil dari file `MARKETMARNEY-APK-SHA1.txt` hasil GitHub build v4, atau `keytool -printcert -jarfile MarketMarney-v4.apk`.
- Web Client ID tetap berasal dari konfigurasi server `MM_GOOGLE_CLIENT_ID`, tidak diganti dengan Android Client ID.
- Ketika nanti ada key Play App Signing, daftarkan pula SHA-1 sertifikat Play Store.

### Keamanan

- ID token tidak disimpan atau dicetak di log.
- Nonce single-use, dibatasi waktu dan laju.
- Cookie pembaca bertanda `HttpOnly; Secure; SameSite=Strict`.
- APK debug **bukan paket rilis Play Store**. Keystore debug GitHub dapat berubah tiap build, sehingga fingerprint SHA-1 juga dapat berubah.
- Tidak ada pembelian/penyebaran aplikasi, perubahan DNS, atau pembaruan Railway otomatis pada pembuatan paket ini.

### Catatan

Aplikasi v4 masih beta hybrid. Uji Google Login nyata dengan akun Google, perangkat Android, sesi WebView, logout, Reels, Story, grup privat, upload, dan izin moderasi sebelum publikasi. Google Login native **tidak sama** dengan login OAuth Google di WebView.
## Perbaikan Android v4.1
- Penanda versi WebView diselaraskan dengan APK untuk membedakan aplikasi Android dari browser website.
- Sinyal aplikasi WebView hanya diberikan pada origin HTTPS MarketMarney yang tepat.
- Server login Android mendukung allowlist ID klien Android pada klaim `azp` tanpa mengurangi pemeriksaan `aud` Web Client ID.
- Endpoint baru masih memerlukan aktivasi backend Railway serta pendaftaran OAuth Android di Google Cloud; build APK saja tidak mengaktifkan login.
