# 05 - Deployment

## A. Menjalankan lokal
    python3 dev-server.py        # http://localhost:8080 (tanpa cache)

## B. Menyiapkan Firebase (sekali)
1. Firestore Database > Create database (lokasi asia-southeast2 / Jakarta).
2. Tab Rules: tempel isi `firebase/firestore.rules` > Publish.
3. Authentication > Sign-in method: aktifkan Email/Password > buat akun admin.
4. Firestore: buat koleksi `admins`, dokumen dengan ID = UID akun admin (salin-tempel), isi satu field bebas.
5. Login ke `/admin/login.html`, tab Toko: isi nama, WhatsApp, jam, alamat. Tab Menu: isi menu.

## C. Publikasi ke GitHub Pages (otomatis)
1. Pastikan file `.github/workflows/pages.yml` ikut ter-push.
2. Di GitHub: repo > Settings > Pages > Source: **GitHub Actions**.
3. Setiap `git push` ke cabang `main`, situs diperbarui otomatis (tab Actions menunjukkan progres).
4. Alamat situs: `https://project-soe.github.io/Nasi-Kebuli-/`
5. WAJIB: Firebase Console > Authentication > Settings > Authorized domains > Add domain:
   `project-soe.github.io` (tanpa https:// dan tanpa nama repo). Tanpa ini login admin gagal di situs publik.

## D. Domain sendiri (opsional)
Settings > Pages > Custom domain, lalu tambahkan domain itu juga di Authorized domains Firebase.

## E. Alur memperbarui situs
    git add .
    git commit -m "Pesan singkat perubahan"
    git push
Tunggu 1-2 menit, lalu muat ulang situs (bila tampilan lama masih muncul, hapus cache browser).
