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
python3 -m http.server 8080 -d public
```
Lalu buka http://localhost:8080 (jangan buka file HTML langsung).

## Pengaturan Firebase (sekali saja)
Lihat `docs/05-deployment.md`.
