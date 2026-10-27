# 05 - Deployment

Hosting: **Firebase Hosting** (folder yang dipublikasikan: `public`).

## A. Menjalankan lokal
    python3 dev-server.py        # http://localhost:8080 (tanpa cache)

## B. Menyiapkan Firebase (sekali)
1. Firestore Database > Create database (lokasi asia-southeast2 / Jakarta).
2. Pasang aturan: tempel isi `firebase/firestore.rules` di tab Rules lalu Publish,
   ATAU lewat CLI (lebih aman dari salah tempel): tambahkan ke `firebase.json`
       "firestore": { "rules": "firebase/firestore.rules" }
   lalu jalankan `firebase deploy --only firestore:rules`.
3. Authentication > Sign-in method: aktifkan Email/Password > buat akun admin.
4. Firestore: koleksi `admins`, dokumen dengan ID = UID akun admin (salin-tempel), isi satu field bebas.
5. Login ke `/admin/login.html`, tab Toko: isi nama, WhatsApp, jam, alamat, ongkir, metode bayar.
   Tab Menu: isi menu.

## B2. Anti-spam
Aktifkan App Check (langkah di `docs/04-security.md`). Daftarkan domain hosting
(`<project>.web.app`, `<project>.firebaseapp.com`) di reCAPTCHA.

## C. Publikasi
    firebase deploy --only hosting
Setiap kali kode atau aturan berubah: `firebase deploy --only hosting,firestore:rules`.
Domain `*.web.app` dan `*.firebaseapp.com` otomatis diizinkan untuk login (Authorized domains).
Bila memakai domain sendiri, tambahkan juga di Authentication > Settings > Authorized domains.

## D. Pemeriksaan otomatis (GitHub Actions)
Setiap push menjalankan `.github/workflows/ci.yml`: pemeriksaan sintaks JavaScript dan tes aturan
Firestore. Jangan publikasikan bila tab Actions menampilkan tanda silang merah.

## E. Alur memperbarui situs
    git add .
    git commit -m "Pesan singkat perubahan"
    git push
    firebase deploy --only hosting,firestore:rules
