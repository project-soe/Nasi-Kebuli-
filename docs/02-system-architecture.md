# 02 - Arsitektur Sistem

```
Website pelanggan (public/)  --->  Firebase Firestore  <---  Panel admin (public/admin/)
   lihat menu, keranjang,           menu, settings,           login Firebase Auth,
   checkout, WhatsApp               orders, admins            kelola menu & pesanan
```

- Tanpa server sendiri: semua halaman statis, data lewat Firebase.
- Keamanan data diatur oleh `firebase/firestore.rules` (bukan oleh browser).
- Tanpa Cloud Functions (keputusan pemilik): harga disalin ke pesanan saat
  dibuat dan diperiksa pemilik sebelum menekan Terima.
- Folder `backend/` dan `google-apps-script/` tidak dipakai.

## Lapisan kode (public/js)
- `core/`       konfigurasi, format, pembantu DOM, fungsi bersama
- `services/`   satu-satunya yang bicara ke Firebase (`api.js` pintu masuk)
- `components/` UI yang bisa dipakai ulang (cart, modal, toast, menu-card)
- `pages/`      perakit tiap halaman
