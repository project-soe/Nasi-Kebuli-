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

## Cara terima (ambil / antar)
- [ ] Pilihan Ambil di tempat / Diantar tampil sesuai pengaturan admin
- [ ] Diantar: alamat wajib, ongkir masuk total; Ambil: tanpa alamat dan ongkir
- [ ] Alamat tampil di admin dan WhatsApp, TIDAK tampil di halaman status pelanggan

## Jadwal (pre-order)
- [ ] Pilihan Secepatnya/Jadwalkan hanya muncul bila diaktifkan admin
- [ ] Daftar tanggal dan jam sesuai lead time, hari ke depan, dan jam awal/akhir
- [ ] Jadwal tampil di sukses, WhatsApp, admin (filter Terjadwal), dan halaman status
- [ ] Toko tutup: pesanan terjadwal hanya diterima bila diizinkan pemilik

## Pembayaran
- [ ] Metode bayar tampil sesuai pengaturan admin (satu metode saja: pilihan disembunyikan)
- [ ] Halaman sukses: petunjuk bayar sesuai metode (rekening + salin, QRIS, atau tunai)
- [ ] Admin: Tandai lunas / Batalkan lunas; halaman status pelanggan ikut berubah

## Status pesanan
- [ ] Halaman status TIDAK menampilkan nama, HP, atau catatan
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

## App Check (setelah diaktifkan)
- [ ] Console > App Check > Cloud Firestore menampilkan permintaan Verified setelah situs dipakai
- [ ] Setelah Enforce: menu, checkout, status pesanan, dan admin tetap berfungsi di situs publik
- [ ] Setelah Enforce: `localhost` tetap berfungsi (domain terdaftar atau token debug)
