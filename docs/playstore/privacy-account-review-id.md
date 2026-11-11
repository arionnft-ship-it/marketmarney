# MarketMarney — Audit privasi & penghapusan akun sebelum Google Play

**STATUS: DOKUMEN KERJA INTERNAL — BUKAN KEBIJAKAN PRIVASI YANG SUDAH BERLAKU.**
**Jangan unggah ke Play Console atau terbitkan sebagai kebijakan final sebelum tim pemilik memeriksa data dan implementasi backend.**

Tanggal audit: 11 November 2026. Kandidat Android: `com.marketmarney.mobile` / 4.39.0, PR #16. Kendala tercatat dalam Issue #17.

## Fakta yang teridentifikasi dari kode / halaman

- Pendaftaran Social Marney memproses `username`, nama tampilan, email, dan password; password disimpan dalam bentuk hash dan sesi menggunakan cookie aman sesuai dokumentasi kode pendaftaran. Status verifikasi email manual pada desain pendaftaran awal tidak otomatis sama dengan verifikasi email Google.
- Identitas Google ditautkan lewat Google `sub` dan email terverifikasi; jangan menyamakan email login dan identitas Google tanpa alur tautkan akun yang sah.
- Social Marney memungkinkan konten pengguna, termasuk profil, foto, postingan, komentar, chat, grup dan jurnal privat. Kategori data yang benar-benar disimpan, log, cadangan, dan retensinya perlu diverifikasi dari layanan produksi.
- Halaman publik XAUWar menyatakan akses data emas langsung ke Gold API dan bahwa penyedia menerima alamat IP koneksi; aliran tersebut perlu dipertimbangkan dalam pemberitahuan privasi dan Data safety.
- Android memiliki WebView, akses internet, pemilih file/galeri, dan Google Login. Audit SDK, transfer dan penyimpanan berkas diperlukan sebelum mendeklarasikan Data safety.

## Pertanyaan yang HARUS dijawab pemilik/operator sebelum kebijakan final

1. Siapa pengendali data dan alamat email bantuan privasi yang **aktif dan dapat dihubungi**?
2. Vendor apa yang memproses data di server, penyimpanan, login, analitik, media/video, dan kalender/market feed? Apa saja kategori data yang mereka terima?
3. Apa masa penyimpanan untuk identitas, profil, pesan 1:1, pesan grup, postingan, foto, video, jurnal, cookie, log server, laporan moderasi, dan backup?
4. Apakah data pengguna dibagikan untuk iklan, analitik pihak ketiga atau dipakai untuk pelatihan AI? Jawab berdasarkan bukti, bukan asumsi.
5. Apa mekanisme permintaan akses/koreksi/penghapusan data, bagaimana identitas pemohon diverifikasi, dan berapa lama permintaan diselesaikan?
6. Setelah akun dihapus, apa yang terjadi pada postingan, media, balasan, pesan grup, pesan langsung, jurnal, sesi, dan relasi follow/grup? Bagaimana konsistensi dan retensi legalnya dikelola?
7. Apakah ada pengguna di bawah umur? Apa pembatasan umur dan moderasi untuk Social Marney sesuai konten yang ditampilkan?

## Alur penghapusan akun yang wajib diimplementasikan dan dibuktikan

- **Dalam aplikasi:** pengaturan akun → Hapus akun → konfirmasi identitas → penjelasan konsekuensi → permintaan terautentikasi → bukti permintaan berhasil; tidak boleh hanya menghapus akun dari UI.
- **Melalui web tanpa aplikasi:** URL HTTPS yang berfungsi untuk mengajukan penghapusan akun dan data. Pengguna yang sudah menghapus aplikasi tidak boleh diwajibkan memasang aplikasi kembali.
- **Server:** verifikasi ulang identitas, pencegahan CSRF/salah akun, pencatatan status permintaan tanpa data sensitif berlebih, penghapusan atau anonimisasi sesuai retensi yang sah, dan pencabutan seluruh sesi/token.
- **Pengujian:** akun dengan posting, DM, grup, media, jurnal, Google login; akun terlarang; permintaan ganda; kegagalan database; pemulihan dari backup; audit tidak menampilkan data pengguna lain.
- **Jangan aktifkan tombol** sampai backend benar-benar dapat menjalankan proses dan tes end-to-end lulus.

## Ketentuan Social Marney yang harus diverifikasi

- Pengguna menyetujui aturan komunitas sebelum bisa membuat/mengunggah konten.
- Ada pelaporan konten dan akun, sistem penanganan laporan, serta pemblokiran pengguna yang benar-benar diterapkan pada backend dan UI.
- Penilaian umur/konten, pencegahan pelecehan dan konten terlarang, serta kanal banding dan dukungan pengguna.
- Beri akses untuk peninjau Play Console menggunakan akun uji tanpa data pengguna nyata.

## Tautan kebijakan resmi

- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/10787469

**Gerbang publikasi:** jangan tandai privasi/penghapusan akun/UGC sebagai selesai di Play Console sebelum endpoint, UI, teks, data dan moderasi benar-benar telah diterapkan dan diuji.
