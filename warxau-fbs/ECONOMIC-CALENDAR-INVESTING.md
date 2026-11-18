# Integrasi Kalender Ekonomi Investing.com — MarketMarney

Status: **siap diintegrasikan**, belum aktif sampai URL iframe resmi tersedia.

## Menghasilkan URL widget resmi
1. Buka https://id.investing.com/webmaster-tools/economiccalendar
2. Pilih tema terang: background `#FFFFFF`, teks `#172334`, pembatas `#E5E9F0`, warna aksen oranye sesuai opsi yang tersedia.
3. Pilih zona waktu **GMT+07:00 / Jakarta (WIB)**, bukan zona waktu browser otomatis.
4. Centang kolom `Mata Uang`, `Tingkat Kepentingan`, `Aktual`, `Perkiraan`, dan `Sebelumnya`.
5. Atur Negara ke Amerika Serikat, Zona Euro, Inggris Raya, Jepang; dapat tambah Indonesia bila dibutuhkan.
6. Pada `Tingkat Kepentingan`, pilih **hanya High / tiga simbol dampak**.
7. Aktifkan pemilih tanggal dan kotak filter, pilih kalender mingguan jika tersedia.
8. Baca dan setujui **Syarat dan Ketentuan Investing.com** sebagai pemilik website, kemudian klik **Kirim/Generate HTML Code**.
9. Salin hanya URL lengkap dari atribut `src` iframe resmi (biasanya host `https://sslecal2.investing.com/`). Jangan mengubah sendiri ID zona waktu atau tingkat kepentingan.

## Railway
Di proyek Railway `MarketMarney` → layanan `marketmarney-web` → Environment `staging`, tambahkan variabel:

`MM_INVESTING_CALENDAR_URL=https://sslecal2.investing.com/?...parameter-resmi...`

**Verifikasi 18 November 2026:** opsi zona waktu Jakarta `(GMT +7:00) Bangkok, Hanoi, Jakarta` memiliki nilai `timeZone=27`; filter dampak tinggi saja memiliki nilai `importance=3`. Negara utama: AS `5`, Zona Euro `72`, Inggris `4`, Jepang `35`. Modul otomatis menolak URL tanpa setelan ini, atau tanpa kolom Actual/Forecast/Previous, agar tidak menampilkan label WIB/High Impact untuk data yang salah.

Modul bersifat opt-in: bila variabel kosong atau URL tidak berasal dari host widget resmi Investing.com, halaman lama tidak diubah. Setelah kode resmi ditempel ke variabel dan perubahan dirilis, buka menu Kalender Ekonomi untuk melihat widget di panel `section.mm88-desk` (menggantikan tampilan kalender TradingView di `#mm88Calendar`); halaman Market Live dan News tidak diubah. Widget memperbarui datanya langsung; tombol "Muat ulang" hanya cadangan.

## Pengujian dan rilis
Jalankan `node --test warxau-fbs/economic-calendar-investing.test.cjs`. Setelah variabel diatur, tinjau secara visual pada desktop dan HP, pastikan jam NFP/CPI ditampilkan WIB, filter High Impact aktif, dan indikator Actual berubah mengikuti rilis. Periksa browser console bila ada hambatan iframe/CSP atau jaringan. Simpan atribusi Investing.com pada widget.

Tidak ada scraping, penyimpanan ulang data pihak ketiga, atau pengubahan feed TradingView untuk grafik.