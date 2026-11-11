# Komentar dan Hadiah LIVE — MarketMarney (kandidat)

Perubahan ini melanjutkan **LIVE Sekarang dalam Reels** pada PR #27. Penonton dapat mengirim komentar secara real-time dan hadiah virtual gratis saat menonton siaran Live Marney. Streamer juga melihat komentar/hadiah yang sama, dapat menghapus komentar, dan membisukan penonton.

## Perilaku

- Komentar maksimum 180 karakter; tidak mendukung HTML atau skrip aktif. Server mengirim pesan melalui SSE dan UI merender dengan `textContent`.
- Hadiah virtual tersedia: Hati ❤️, Tepuk tangan 👏, Bintang ⭐, Bunga 🌸.
- **Semua hadiah gratis**: tidak ada koin, pembayaran, saldo, hadiah tunai, nilai penukaran, atau transaksi keuangan. Server menandai `virtual:true`, `price:0`, `redeemable:false`.
- Penonton harus sudah bergabung ke siaran. Izin komentar/hadiah berdasarkan token sesi penonton Live Marney yang dikeluarkan oleh backend; token tidak dikirim lewat query URL.
- Server membatasi komentar (minimal ~2,2 detik antarpesan, maksimum 12/menit) dan hadiah (minimal ~1,2 detik antarpengiriman, maksimum 10/menit).
- Streamer dapat menghapus pesan dan membisukan penonton. Penonton dapat melaporkan komentar melalui fitur laporan sementara selama siaran.
- Penyimpanan metadata chat dan total hadiah **hanya selama siaran berjalan**, dibatasi memori; saat siaran berakhir, data sementara dihapus. Laporan juga hanya sementara dan **belum** masuk ke antrean moderasi persisten.
- API hanya beroperasi untuk stream aktif pada `live.streams`, mempertahankan batas delapan penonton siaran beta dan sistem WebRTC/SSE aslinya.
- Penonton dapat melihatnya di `/live.html` dan dalam viewer LIVE Reels yang memakai halaman sama `?embed=reels`. Browser tak memerlukan izin kamera/mikrofon penonton.

## Gerbang rilis

**Masih draft. Jangan deploy ke produksi** sebelum uji dua perangkat (host+penonton), uji moderasi persistens/laporan, kontrol komentar, persyaratan kebijakan konten pengguna (UGC), perlindungan spam, dan pemeriksaan Android WebView. Fitur transaksi atau hadiah berbayar **belum dibuat**.

Pengujian: `.github/workflows/live-engagement-qa.yml` menjalankan tes API, autentikasi, SSE, Reels versi sebelumnya, DOM/UI, serta membangun image Docker tanpa deployment.
