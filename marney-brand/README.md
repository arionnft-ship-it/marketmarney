# MarketMarney — simbol M dan panah oranye (10 November 2026)

Pemilik website memilih **simbol M hitam dengan panah pertumbuhan oranye** sebagai logo baru untuk semua permukaan website.

- Sumber transparan: `user-logo-20261109.b64`, PNG 768×768, diverifikasi SHA-256 saat build.
- `/assets/brand-logo.png` dan `.webp`: simbol M hitam-oranye, latar transparan.
- `/assets/brand-logo-dark.png` dan `.webp`: simbol M terang dengan panah oranye yang sama, untuk header/area gelap.
- `/assets/brand-about-transparent.webp`: varian transparan kontras di halaman Tentang MarketMarney, tanpa mengubah desain halaman.
- `/assets/brand-wordmark.png` dan `.webp`: simbol M baru dengan tulisan MarketMarney yang lama; tulisan asli dipertahankan dari `wordmark-text-source.b64` agar identitas tetap konsisten.
- `/assets/brand-wordmark-dark.webp`: alternatif terang untuk area gelap.
- `/favicon.png`, `/favicon.ico`, `/apple-touch-icon.png`, dan `/icons/icon-*.png`: simbol M baru dengan ukuran sesuai favicon dan PWA.

Tidak ada perubahan pada artikel, berita, media pengguna, autentikasi, database, navigasi, atau data pasar. Versi cache: `marney-m-arrow-20261110-v1`.

Uji build: `python marney-brand/build-assets.py` lalu `node --test marney-brand/logo-asset.test.cjs` pada runtime yang memiliki Sharp dan output assets.

Rollback: kembali ke commit Railway sebelum pergantian logo. Tidak ada migrasi data.
