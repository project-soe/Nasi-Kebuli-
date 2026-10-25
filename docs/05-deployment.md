# 05 - Deployment

## Menjalankan lokal
    python3 -m http.server 8080 -d public

## Menyiapkan Firebase (sekali)
1. Firebase Console > Build > Firestore Database > Create database
   (mode production, lokasi asia-southeast2 / Jakarta).
2. Tab Rules: tempel isi `firebase/firestore.rules`, lalu Publish.
3. Buat dokumen `settings/store` dan beberapa dokumen `menu` (lihat `03-data-schema.md`).
4. Authentication > Sign-in method: aktifkan Email/Password, lalu buat akun admin.
   Buat dokumen `admins/<UID akun admin>` (boleh kosong).
5. Authentication > Settings > Authorized domains: tambahkan domain situs saat nanti dipublikasikan.
