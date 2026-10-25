# Kebuli Ikhsan

Website pemesanan nasi kebuli (ayam & kambing) khas Timur Tengah.

## Alur
Website pelanggan -> Backend (validasi) -> Google Apps Script -> Google Sheets

## Struktur
- `public/`            : halaman website (HTML, CSS, JS)
- `backend/`           : server Node.js (validasi harga, auth admin, status pesanan)
- `google-apps-script/`: jembatan ke Google Sheets
- `docs/`              : dokumentasi
- `tests/`             : checklist tes manual

## Menjalankan (lokal)
Lihat `docs/05-deployment.md`.
