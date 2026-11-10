# MarketMarney 4.38 Adaptive RC

Versi ini melanjutkan 4.37 dengan fokus pada kelancaran video dan stabilitas penggunaan harian.

## Perubahan utama

- Reel berikutnya tidak lagi langsung mengambil bandwidth besar sebelum Reel aktif memiliki buffer aman.
- Preload mengikuti arah swipe terakhir pengguna, termasuk saat kembali ke Reel sebelumnya.
- Pemulihan video mencoba melanjutkan pemutaran terlebih dahulu sebelum melakukan pemuatan ulang media.
- Scrubbing atau menggeser posisi video tidak lagi mudah dianggap sebagai video macet.
- Buffer yang masih bertambah diberi waktu tambahan agar tidak diputus terlalu cepat.
- Aset Social yang dipersiapkan di latar menggunakan prioritas thread rendah agar tidak mengganggu respons antarmuka.
- Keyboard Android memakai mode `adjustResize` agar kolom chat dan unggahan tetap terlihat.
- Logo baru, opening sederhana, tema terang, Social layar penuh, tombol Beranda, dan seluruh fitur 4.37 tetap tersedia.

Website publik dan database MarketMarney tidak diubah.

## Identitas

- Package: `com.marketmarney.mobile.beta438`
- Version: `4.38.0-beta`
- Version code: `42`

Build ini masih merupakan kandidat beta untuk pengujian perangkat nyata, bukan paket Google Play produksi.
