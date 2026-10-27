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

## Uji ambil di tempat / diantar
1. Admin > Toko: aktifkan dua opsi, isi ongkos kirim (mis. 5000) dan keterangan; Simpan.
2. Checkout: pilih Diantar > kolom alamat muncul; ringkasan menampilkan Subtotal, Ongkos kirim, Total.
3. Kirim dengan alamat kurang dari 10 huruf: muncul pesan error di bawah kolom alamat.
4. Kirim dengan alamat benar: pesan WhatsApp memuat ongkos kirim, total, cara terima, dan alamat.
5. Admin > Pesanan: kartu menampilkan "Diantar", alamat, tautan Google Maps, baris ongkos kirim.
6. Halaman status pelanggan: menampilkan "Diantar", baris ongkos kirim, TANPA alamat.
7. Pilih Ambil di tempat: kolom alamat hilang, ongkir tidak dihitung, total = subtotal.
8. Admin menonaktifkan "Diantar": checkout hanya menampilkan satu opsi (ambil) tanpa pilihan.
9. Admin mengubah ongkir saat pelanggan sedang di checkout: ringkasan pelanggan ikut berubah otomatis.

## Uji pembayaran
1. Admin > Toko: aktifkan Tunai + Transfer + QRIS; isi rekening (satu per baris) dan jalur gambar QRIS; Simpan.
   (Aktifkan Transfer tanpa rekening atau QRIS tanpa gambar: muncul pesan error.)
2. Checkout: muncul kartu "Cara pembayaran" dengan tiga pilihan.
3. Pilih Transfer, kirim: halaman sukses menampilkan nominal, rekening, tombol "Salin rekening".
4. Pilih QRIS: halaman sukses menampilkan gambar QRIS dan nominal.
5. Pilih Tunai + Diantar: "Bayar tunai saat pesanan diantar. Siapkan uang pas ...".
6. Pesan WhatsApp memuat baris "Pembayaran: ..." (dan "Bukti pembayaran saya kirim setelah ini." untuk transfer/QRIS).
7. Admin > Pesanan: kartu menampilkan metode dan "Belum dibayar"; tekan "Tandai lunas" -> berubah "Lunas".
8. Halaman status pelanggan: petunjuk bayar berganti menjadi "Pembayaran sudah diterima" setelah ditandai lunas.
9. Nonaktifkan Transfer di admin saat pelanggan sedang di checkout: pelanggan yang masih memilih Transfer
   ditolak server; pilihan otomatis disegarkan.
