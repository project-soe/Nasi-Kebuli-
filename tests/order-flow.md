# Alur Tes Pesanan (ujung ke ujung)

1. Admin: pastikan toko BUKA, menu tersedia.
2. Pelanggan (HP A): menu.html > tambah 2 menu > Lihat Pesanan > Lanjut Checkout.
3. Isi nama dan nomor HP > Kirim Pesanan > catat kode pesanan.
4. Tekan Kirim ke WhatsApp: pesan tersusun benar, kirim ke nomor toko.
5. Pelanggan: buka Lihat status pesanan (status Menunggu).
6. Admin (HP B): tab Pesanan menampilkan pesanan baru (bunyi + notifikasi) > Terima.
7. Pelanggan: status berubah ke Diterima otomatis.
8. Admin: Mulai Proses > Tandai Selesai. Pelanggan melihat tiap perubahan.
9. Ulangi dengan pesanan baru, Admin menekan Tolak dengan alasan: pelanggan melihat alasannya.
10. Admin menutup toko: pelanggan tidak bisa menambah/checkout; Firestore menolak pesanan baru.

## Uji keamanan harga (Firebase Console > Firestore > Rules > Rules Playground)
Jenis: create, lokasi /orders/tes1, tanpa login. Isi data dengan dokumen pesanan lalu cek hasilnya:
1. Harga item sama dengan menu, total benar -> DIIZINKAN
2. Harga item diganti lebih murah dari menu -> DITOLAK
3. Harga benar tetapi total lebih kecil dari jumlah baris -> DITOLAK
4. Nama item diganti (id menu murah, nama menu mahal) -> DITOLAK
5. qty 0, 21, atau pecahan -> DITOLAK
6. Id menu tidak ada -> DITOLAK
7. Toko tutup -> DITOLAK
8. Baca /orders/<id> tanpa login -> DITOLAK; baca /orderStatus/<id> -> DIIZINKAN
Catatan: Playground memerlukan dokumen orderStatus pasangan; uji lengkap paling mudah lewat checkout asli.

## Uji perubahan harga saat checkout
1. Pelanggan menambah menu ke keranjang (jangan checkout dulu).
2. Admin mengubah harga menu itu.
3. Pelanggan membuka checkout dan menekan Kirim: muncul pemberitahuan "menu atau harga berubah",
   ringkasan menampilkan harga baru; kirim lagi -> berhasil.
