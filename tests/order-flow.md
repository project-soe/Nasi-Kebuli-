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
