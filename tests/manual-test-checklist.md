# Checklist Tes Manual

Jalankan sebelum setiap rilis. Uji di HP (utama), lalu tablet/desktop.

## Beranda
- [ ] Animasi pembuka tampil singkat (sekitar 2 detik), tidak muncul lagi saat pindah halaman
- [ ] Status Buka/Tutup sesuai saklar admin
- [ ] Tombol Pesan Sekarang dan Chat WhatsApp berfungsi (nomor benar)

## Menu & keranjang
- [ ] Kartu menu: foto, harga, deskripsi; efek saat disentuh
- [ ] Tombol Tambah: animasi titik terbang, centang "Ditambahkan", angka keranjang naik
- [ ] Bar bawah menampilkan jumlah dan total yang benar
- [ ] Modal pesanan: tombol - / + / hapus; total ikut berubah; Kosongkan butuh dua tekan
- [ ] Muat ulang halaman: isi keranjang tetap ada
- [ ] Menu ditandai Habis: tombol nonaktif
- [ ] Toko ditutup: tombol tambah nonaktif dan pita pemberitahuan tampil

## Checkout
- [ ] Nama/nomor kosong atau salah: pesan error muncul di bawah kolom
- [ ] Pesanan valid: tersimpan, muncul kode pesanan
- [ ] Tombol Kirim ke WhatsApp: pesan berisi menu, jumlah, total, nama, HP, kode
- [ ] Toko tutup: tombol kirim nonaktif
- [ ] Keranjang kosong: tampil keadaan kosong

## Status pesanan
- [ ] Tautan dari checkout menampilkan pesanan yang benar
- [ ] Status berubah sendiri saat admin mengubahnya
- [ ] Pesanan ditolak: alasan tampil

## Admin
- [ ] Login benar masuk; password salah menampilkan pesan; akun non-admin ditolak
- [ ] Pesanan baru masuk: toast, bunyi, getar, angka di tab
- [ ] Terima, Mulai Proses, Tandai Selesai, Tolak (dengan alasan)
- [ ] Tambah, ubah, hapus menu; saklar Tersedia
- [ ] Simpan pengaturan toko; nomor WhatsApp dinormalkan (08... menjadi 62...)
- [ ] Keluar mengembalikan ke halaman login

## Tampilan & akses
- [ ] HP 360px, tablet 768px, desktop 1100px: tidak ada konten terpotong atau menggeser ke samping
- [ ] Mode "kurangi animasi" di pengaturan HP: animasi mati, situs tetap berfungsi
- [ ] Alamat salah menampilkan 404 yang rapi
