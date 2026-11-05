# MarketMarney Android v4 — status aktivasi Google Login

Tanggal: 5 November 2026.

## Status terverifikasi
- APK Android v4 debug berhasil dibangun di GitHub Actions, memakai `com.marketmarney.mobile`.
- Railway `MarketMarney` / `staging` / `marketmarney-web` berstatus Online dan memiliki volume `/persist`.
- Nama environment variable `MM_GOOGLE_CLIENT_ID`, `MM_GOOGLE_CLIENT_SECRET`, dan `MM_GOOGLE_REDIRECT_URI` tersedia. Nilai rahasia tidak dibaca/disalin.
- APK Android v4 belum mendapat autentikasi Google yang berhasil pada perangkat sungguhan.
- Endpoint `/api/auth/android/` belum dipastikan terpasang di website aktif.

## Yang belum dilakukan
1. Cadangkan database dan unggahan live secara lengkap, kemudian verifikasi backup di luar volume Railway.
2. Audit ketat endpoint Google Android, termasuk klaim OIDC `aud`, `azp`, `nonce`, dan cookie sesi. Jangan melemahkan pemeriksaan Google demi memaksa login berhasil. Client Android harus masuk allowlist yang sah jika `azp` berbeda dari Web Client ID.
3. Pasang kode backend ke source aktif di volume `/persist` melalui Railway Console, hanya setelah pemeriksaan dan backup terbaru lulus. Restart secara terkendali, lalu uji endpoint dan sesi tanpa mengubah Google Login web.
4. Daftarkan client OAuth **Android** di proyek Google Cloud yang sama: package `com.marketmarney.mobile`, SHA-1 debug APK v4 `9E:CD:D6:FC:BB:04:CA:AE:16:5A:A4:FA:EB:07:2A:94:F3:B2:70:8C`.
5. Uji Google Account Picker pada HP, reuse akun Social Marney, session WebView, logout, akun diblokir, dan uji ulang grup privat.
6. Untuk publikasi Play Store, gunakan keystore rilis yang dikelola pengguna (bukan kunci debug sementara GitHub), lalu daftarkan fingerprint Play App Signing.

## Batas akses saat ini
Koneksi Railway yang tersedia dalam percakapan ini dapat membaca status dan konfigurasi, tetapi **tidak memiliki perintah untuk menulis file pada volume `/persist` atau menjalankan perintah Console**. Google Cloud OAuth Client Management belum terhubung. Tidak ada klaim bahwa aktivasi server dan pendaftaran Google Cloud sudah selesai. Untuk mengerjakan bagian UI, gunakan ChatGPT Work / Cloud Browser dengan otorisasi pengguna.

**Keamanan**: Jangan tempelkan Google Client Secret, password, database, backup atau ID token ke percakapan/issue GitHub.