// core/firebase-config.js - konfigurasi Firebase (proyek Kebuli Ikhsan)
//
// Catatan keamanan:
// - Nilai di bawah memang dirancang publik (terlihat di browser). Ini BUKAN
//   kata sandi. Yang melindungi data adalah Firestore Security Rules dan
//   Firebase Authentication (untuk admin), bukan menyembunyikan kunci ini.
// - JANGAN PERNAH commit file "service account" (*.json berisi private_key)
//   atau isi .env ke GitHub.

export const firebaseConfig = {
  apiKey: "AIzaSyDWgMl4CB3ldSVqzJxYokFwwid0bhhkfEM",
  authDomain: "studio-2645889636-44b24.firebaseapp.com",
  projectId: "studio-2645889636-44b24",
  storageBucket: "studio-2645889636-44b24.firebasestorage.app",
  messagingSenderId: "271430366667",
  appId: "1:271430366667:web:b7a34287add225c677f24e"
};

// Firebase App Check (anti-bot untuk Firestore).
// Kosongkan siteKey = App Check dimatikan (situs tetap jalan seperti biasa).
// Site key reCAPTCHA v3 bersifat PUBLIK, aman ada di sini. JANGAN tulis Secret key di file ini.
// Cara mengisi: lihat docs/04-security.md bagian "Mengaktifkan App Check".
export const appCheckConfig = {
  siteKey: '',
};
