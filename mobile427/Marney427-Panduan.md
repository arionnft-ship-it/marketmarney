# Marney 4.27 Speed & Stability

Perbaikan utama:

- Opening sinematik tetap dipertahankan, tetapi latarnya statis dan animasinya jauh lebih singkat.
- Pengunci tema terang tidak lagi memantau seluruh perubahan feed, chat, grup, dan Reels.
- Berkas CSS/JavaScript lokal pada Social Marney, grup, dan profil digabung agar jumlah permintaan internal jauh berkurang.
- Enhancements WebView dipasang sekali per dokumen, bukan berulang pada first paint dan page finished.
- Berkas lokal versi APK memakai cache immutable; HTML tetap selalu diperiksa ulang.
- Satu kegagalan renderer WebView dipulihkan otomatis. Kegagalan berulang tetap menampilkan tombol pemulihan yang aman.
- Galeri langsung, tema terang, navigasi, dan fitur versi sebelumnya tetap dipertahankan.

APK beta terpisah dapat dipasang berdampingan. Login ulang mungkin diperlukan.
