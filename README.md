# Kebuli Ikhsan

Website pemesanan nasi kebuli (ayam & kambing) khas Timur Tengah.
Database: Firebase Firestore. Pesanan dikirim ke WhatsApp penjual.

## Struktur
- `public/`   halaman website (HTML, CSS, JS)
- `firebase/` aturan keamanan Firestore
- `docs/`     dokumentasi
- `tests/`    checklist tes manual

## Menjalankan di lokal
```
python3 dev-server.py
```
Lalu buka http://localhost:8080 (jangan buka file HTML langsung).

## Publikasi
Firebase Hosting (lihat `docs/05-deployment.md`). Setiap push dicek otomatis oleh GitHub Actions.

## Admin
Buka `/admin/login.html`. Hanya akun yang terdaftar di koleksi `admins` yang bisa masuk.

## Pengaturan Firebase (sekali saja)
Lihat `docs/05-deployment.md`.
