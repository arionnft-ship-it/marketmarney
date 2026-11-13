# MarketMarney — Pemeriksaan prapublikasi Google Play

Ini **bukan** persetujuan publikasi atau pengganti pemeriksaan backend.

## 1. URL publik
Jalankan pemeriksaan hanya dengan URL yang **betul-betul sudah dipublikasikan** (jangan mengarang alamat):

```bash
MM_PRIVACY_URL=https://marketmarney.com/<alamat-yang-sudah-live> \
MM_ACCOUNT_DELETION_URL=https://marketmarney.com/<alamat-yang-sudah-live> \
python3 compliance/check_playstore_urls.py
```

Pemeriksaan menolak URL selain HTTPS MarketMarney, status selain 200, halaman bukan HTML, serta halaman yang tampak tidak berisi informasi relevan. **Lolos pemeriksaan ini bukan bukti kepatuhan keseluruhan.**

## 2. Konfirmasi yang tetap diperlukan

- Kebijakan privasi menjelaskan data akun, profil, unggahan, pesan, analitik, pihak ketiga, retensi dan kontak dukungan sesuai perilaku aplikasi sebenarnya.
- Permintaan penghapusan akun tersedia **dari aplikasi** dan **web** tanpa instalasi ulang; penghapusan data di database dan storage teruji end-to-end.
- Persetujuan aturan UGC sebelum mengunggah, tombol laporkan posting/reels/pesan/profil/grup dan blokir pengguna, serta antrean moderasi dan tindakan admin teruji.
- Android Play App Signing dan kunci upload terpisah aktif. Jangan memasukkan private key atau password ke repository atau percakapan.
- Google OAuth Android dengan package ID `com.marketmarney.mobile` dan fingerprint sertifikat Play diuji.
- Google Play Console (Data safety, kategori keuangan/berita jika berlaku, rating usia, screenshot aktual, email dukungan) dilengkapi.
- Android 16 startup Beranda/XAUWar harus benar-benar memuat **konten**, bukan sekadar overlay. Catatan terbaru dan diagnostik ada di PR #16 dan GitHub Actions.
- Uji pada perangkat fisik dan closed testing bila diwajibkan.

Referensi kebijakan:
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/13327111

**Tidak ada deployment website maupun publikasi aplikasi melalui skrip ini.**
