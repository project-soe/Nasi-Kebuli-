# 06 - Perawatan

## Kerja harian (lewat /admin, tanpa coding)
- Buka/tutup toko: saklar di header admin
- Terima/tolak pesanan, ubah status: tab Pesanan
- Ubah harga, nama menu, habis/tersedia, tambah/hapus menu: tab Menu
- Ubah nomor WhatsApp, jam buka, alamat: tab Toko

## Menambah foto menu
1. Kecilkan foto: lebar sekitar 800 px, ukuran di bawah 150 KB (format .jpg atau .webp).
2. Simpan di `public/assets/images/menu/` dengan nama tanpa spasi, misalnya `kebuli-kambing.jpg`.
3. `git add . && git commit -m "Tambah foto" && git push`.
4. Admin > Menu > Ubah menu > kolom "Alamat foto": isi `assets/images/menu/kebuli-kambing.jpg`.

## Foto hero (beranda)
Ganti blok `.photo-ph.hero__photo` di `public/index.html` dengan:
`<img class="hero__photo" src="assets/images/hero/hero.jpg" alt="Nasi kebuli kambing" width="800" height="800">`

## Mengganti warna / font
Hanya edit `public/css/tokens.css`.

## Menambah admin
Authentication > Add user, lalu buat dokumen `admins/<UID>` di Firestore.

## Backup data
Firestore Console > menu (tiga titik) > Export, atau salin dokumen penting secara berkala.
Kode sudah aman di GitHub.

## Jika ada masalah
- Situs tidak berubah setelah push: cek tab Actions di GitHub, lalu hapus cache browser.
- Menu contoh muncul terus: Firestore belum berisi menu atau aturan belum dipublikasikan.
- Pesanan ditolak saat checkout: kotak merah di bawah form menyebutkan penyebabnya. Yang sering terjadi:
  1. Aturan Firestore belum dipublikasikan ulang setelah pembaruan (tempel `firebase/firestore.rules` > Publish).
  2. Harga menu di Firestore bertipe teks (string), bukan angka. Buat/ubah menu lewat Admin > Menu, jangan manual di Console.
  3. Pengaturan toko belum pernah disimpan (Admin > Toko > Simpan pengaturan), atau toko sedang ditutup.
  4. Keranjang masih berisi menu contoh yang tidak ada di database.
- Login admin gagal di situs publik: domain belum masuk Authorized domains.
