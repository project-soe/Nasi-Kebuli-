# 04 - Keamanan

Perlindungan data ada di `firebase/firestore.rules` dan Firebase Authentication, bukan di
kode browser. Konfigurasi web Firebase (apiKey dll.) memang publik.

## Harga pesanan tidak dipercaya dari browser
Saat pesanan dibuat, aturan Firestore memeriksa SETIAP baris terhadap dokumen menu:
- `id` harus ada di koleksi `menu`, menu tersedia
- `price` dan `name` harus sama persis dengan menu (mencegah menukar harga/nama)
- `qty` bilangan bulat 1-20
- `total` harus sama dengan jumlah (price x qty) seluruh baris
- maksimal 6 jenis menu per pesanan (aturan tidak punya perulangan; batas ini juga menjaga
  jumlah pembacaan dokumen di bawah batas 10 per permintaan)
- toko harus buka; nomor HP berformat 08xxxxxxxxxx

Bila harga menu berubah saat pelanggan sedang checkout, server menolak; halaman checkout
otomatis menyelaraskan keranjang dan meminta pelanggan mengirim ulang.

## Data pribadi
- `orders` (nama, HP, catatan): hanya admin yang bisa membaca (get/list/update/delete).
- Pelanggan memantau status lewat `orderStatus/{id}`: salinan TANPA data pribadi, hanya bisa
  dibaca bila tahu ID acaknya (20 karakter acak dari Firestore). Ini "tautan rahasia":
  bukan otorisasi per akun, tetapi isinya tidak memuat identitas pelanggan.
- Dokumen `orderStatus` hanya bisa dibuat bersamaan dengan pesanan yang lolos validasi.

## Admin
- Admin = akun Firebase Auth yang punya dokumen `admins/{uid}` (dibuat manual di Console).
- Hanya admin yang bisa mengubah menu, pengaturan toko, dan status pesanan.

## Yang BELUM dicegah (diketahui)
- Spam pesanan: aturan Firestore tidak bisa membatasi frekuensi. Pesanan palsu tetap harus
  lolos validasi harga, tetapi bisa dikirim berulang. Pemilik memeriksa pesanan sebelum Terima.
  Opsi lanjutan: Firebase App Check (reCAPTCHA) atau login anonim + pembatas per akun.
- Siapa pun yang memegang tautan status dapat melihat isi dan status pesanan itu.

## Praktik
- Jangan commit: file service account (*.json berisi private_key), .env.
- Semua teks dari database ditampilkan lewat textContent (anti XSS).
- Setelah mengubah `firestore.rules`, tempel ulang di Console lalu Publish.
