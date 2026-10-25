# 04 - Keamanan

- Konfigurasi web Firebase (apiKey dll.) memang publik. Perlindungan data ada di
  Firestore Security Rules (`firebase/firestore.rules`) dan Firebase Authentication.
- Pelanggan hanya bisa: membaca menu/pengaturan, membuat pesanan yang lolos validasi,
  dan membaca satu pesanan bila tahu ID-nya.
- Hanya admin (akun terdaftar di `admins/`) yang bisa mengubah menu, pengaturan,
  dan status pesanan, serta melihat daftar pesanan.
- Pesanan baru ditolak otomatis bila toko berstatus tutup.
- Harga di pesanan berasal dari browser pelanggan, jadi pemilik WAJIB memeriksa
  total sebelum menekan Terima.
- Jangan commit: file service account (*.json berisi private_key), .env.
- Semua teks dari database ditampilkan lewat textContent (anti XSS).
