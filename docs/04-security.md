# 04 - Keamanan

Perlindungan data ada di `firebase/firestore.rules` dan Firebase Authentication, bukan di
kode browser. Konfigurasi web Firebase (apiKey dll.) memang publik.

## Harga pesanan tidak dipercaya dari browser
Saat pesanan dibuat, aturan Firestore memeriksa SETIAP baris terhadap dokumen menu:
- `id` harus ada di koleksi `menu`, menu tersedia
- `price` dan `name` harus sama persis dengan menu (mencegah menukar harga/nama)
- `qty` bilangan bulat 1-20
- `total` harus sama dengan jumlah (price x qty) seluruh baris + ongkos kirim
- `fulfillment` hanya `ambil` atau `antar`; opsi itu harus aktif di pengaturan toko
- `deliveryFee` harus sama dengan pengaturan toko (0 bila ambil di tempat); alamat wajib bila `antar`
- `paymentMethod` hanya `tunai`/`transfer`/`qris` dan harus aktif di pengaturan toko
- `paid` (lunas) tidak bisa diisi pelanggan; hanya admin yang dapat mengubahnya
- Sistem TIDAK memverifikasi pembayaran otomatis: pemilik mencocokkan bukti transfer/QRIS secara manual lalu menekan "Tandai lunas"
- maksimal 5 jenis menu per pesanan. Aturan tidak punya perulangan, dan Firestore membatasi
  1.000 ekspresi per permintaan serta 10 pembacaan dokumen; pemeriksaan tiap baris dikalikan jumlah baris,
  sehingga 6 baris dilaporkan melampaui batas ekspresi saat diuji
- toko harus buka; nomor HP berformat 08xxxxxxxxxx

Bila harga menu berubah saat pelanggan sedang checkout, server menolak; halaman checkout
otomatis menyelaraskan keranjang dan meminta pelanggan mengirim ulang.

## Data pribadi
- `orders` (nama, HP, alamat, catatan): hanya admin yang bisa membaca (get/list/update/delete).
- Pelanggan memantau status lewat `orderStatus/{id}`: salinan TANPA data pribadi, hanya bisa
  dibaca bila tahu ID acaknya (20 karakter acak dari Firestore). Ini "tautan rahasia":
  bukan otorisasi per akun, tetapi isinya tidak memuat identitas pelanggan.
- Dokumen `orderStatus` hanya bisa dibuat bersamaan dengan pesanan yang lolos validasi.

## Admin
- Admin = akun Firebase Auth yang punya dokumen `admins/{uid}` (dibuat manual di Console).
- Hanya admin yang bisa mengubah menu, pengaturan toko, dan status pesanan.

## Spam pesanan: Firebase App Check
Aturan Firestore tidak bisa membatasi frekuensi, dan konfigurasi Firebase di situs bersifat publik,
sehingga skrip dapat memanggil Firestore langsung tanpa membuka situs. App Check menolak permintaan
yang tidak membawa bukti berasal dari situs asli (reCAPTCHA v3). Gratis, tanpa Cloud Functions.

### Mengaktifkan App Check (urutan penting)
1. Buka https://www.google.com/recaptcha/admin/create > jenis **reCAPTCHA v3**.
   Domain: `studio-2645889636-44b24.web.app`, `studio-2645889636-44b24.firebaseapp.com`, dan `localhost`. Simpan **Site key** dan **Secret key**.
2. Firebase Console > **App Check** > tab Apps > pilih aplikasi web > reCAPTCHA > tempel
   **Secret key** > Save. (Secret key HANYA di Console, jangan di kode.)
3. Isi **Site key** di `public/js/core/firebase-config.js` pada `appCheckConfig.siteKey`.
   Commit dan push, tunggu GitHub Pages selesai.
4. Buka situs, telusuri menu dan buat satu pesanan uji. Di Console > App Check > **APIs** >
   Cloud Firestore, lihat grafik: permintaan "Verified" harus muncul.
5. Baru setelah itu tekan **Enforce** pada Cloud Firestore. Bila ada yang rusak, tekan
   Unenforce (bisa dibatalkan kapan saja).
6. Pengembangan lokal: domain `localhost` sudah didaftarkan di langkah 1, jadi biasanya langsung
   jalan. Bila ditolak, buat token debug sendiri:
   `python3 -c "import uuid; print(uuid.uuid4())"`, daftarkan di App Check > Manage debug tokens,
   lalu buka sekali `http://localhost:8080/?appcheck_debug=<token>` di browser HP itu.
   JANGAN menulis token debug di kode atau repo.

## Yang BELUM dicegah (diketahui)
- Pengunjung nyata yang sengaja mengirim banyak pesanan. App Check hanya menyaring bot/skrip.
  Pemilik tetap memeriksa pesanan sebelum menekan Terima.
- Siapa pun yang memegang tautan status dapat melihat isi dan status pesanan itu.

## Tes otomatis aturan Firestore
`tests/rules/firestore.rules.test.mjs` menjalankan Firebase Emulator dan memeriksa lebih dari 60 skenario:
pesanan sah diterima; harga murah, total palsu, nama tertukar, ongkir diakali, metode bayar tidak aktif,
toko tutup, field tambahan, dan salinan publik yang tidak cocok ditolak; serta hak baca/tulis
pelanggan, admin, dan akun biasa.
- Berjalan otomatis di GitHub Actions pada setiap push (tab Actions; centang hijau = lolos).
- Setiap kali `firebase/firestore.rules` diubah, tambahkan tes untuk perubahan itu.
- Menjalankan lokal butuh Java; di Termux proot lebih mudah mengandalkan GitHub Actions.

## Praktik
- Jangan commit: file service account (*.json berisi private_key), .env.
- Semua teks dari database ditampilkan lewat textContent (anti XSS).
- Setelah mengubah `firestore.rules`, tempel ulang di Console lalu Publish.
