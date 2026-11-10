# MarketMarney 4.35 Stability

Versi ini melanjutkan MarketMarney 4.34 dengan fokus pada pemulihan koneksi dan penggunaan memori yang lebih aman.

## Perubahan utama

- Aplikasi mengenali koneksi Android yang benar-benar sudah tervalidasi.
- Halaman yang gagal karena DNS, timeout, atau jaringan dapat mencoba pulih otomatis setelah internet kembali.
- Retry otomatis memakai jeda bertahap dan dibatalkan ketika pengguna pindah menu, aplikasi masuk latar belakang, atau dokumen berubah.
- Kesalahan TLS, izin akun, HTTP, dan renderer tidak diputar ulang sebagai retry jaringan.
- Saat Android memberi sinyal tekanan memori, buffer Reel yang tidak terlihat langsung dilepas.
- Ketika aplikasi berada di latar belakang, sumber video Reel dapat dilepas dan dimuat kembali saat diperlukan.
- Cache satu halaman hangat, tema terang, logo baru, opening sederhana, Social Marney layar penuh, galeri, berita, XAUWar, dan Market Live tetap dipertahankan.
- Website publik serta database MarketMarney tidak diubah.

## Identitas build

- Paket: `com.marketmarney.mobile.beta435`
- Versi: `4.35.0-beta`
- Version code: `39`
- Tipe: APK debug beta yang ditandatangani otomatis untuk pengujian

## Verifikasi rilis

Build final memeriksa integritas sumber dan aset, tanda tangan APK, opening, branding, navigasi, galeri, Social Marney, Reels, pemulihan koneksi, tekanan memori, serta seluruh rangkaian regresi Android sebelum rilis diterbitkan.

Versi ini dapat dipasang berdampingan dengan beta sebelumnya karena nama paketnya berbeda.
