// services/store-service.js - pengaturan toko (dokumen "settings/store")
// Dipantau langsung (onSnapshot): saat pemilik menutup toko, semua
// pengunjung melihat perubahannya tanpa refresh.

import { STORE } from '../core/config.js';
import { getFirebase } from './api.js';

const DEFAULT_STORE = {
  ...STORE,
  isOpen: true,
  closedMessage: 'Toko sedang tutup. Silakan kembali pada jam buka.',
};

function normalize(data = {}) {
  const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    name: text(data.name, DEFAULT_STORE.name),
    whatsapp: text(String(data.whatsapp ?? ''), DEFAULT_STORE.whatsapp).replace(/\D/g, ''),
    hours: text(data.hours, DEFAULT_STORE.hours),
    address: text(data.address, DEFAULT_STORE.address),
    defaultMessage: DEFAULT_STORE.defaultMessage,
    closedMessage: text(data.closedMessage, DEFAULT_STORE.closedMessage),
    isOpen: data.isOpen !== false,
  };
}

/**
 * Pantau pengaturan toko. callback dipanggil setiap ada perubahan.
 * @returns {() => void} fungsi untuk berhenti memantau
 */
export function subscribeStore(callback) {
  let unsubscribe = () => {};
  let stopped = false;

  getFirebase()
    .then(({ db, fs }) => {
      if (stopped) return;
      unsubscribe = fs.onSnapshot(
        fs.doc(db, 'settings', 'store'),
        (snap) => callback(snap.exists() ? normalize(snap.data()) : { ...DEFAULT_STORE }),
        (error) => {
          console.warn('[toko] Tidak bisa membaca pengaturan, memakai bawaan:', error);
          callback({ ...DEFAULT_STORE });
        }
      );
    })
    .catch((error) => {
      console.warn('[toko] Firebase tidak termuat, memakai bawaan:', error);
      callback({ ...DEFAULT_STORE });
    });

  return () => {
    stopped = true;
    unsubscribe();
  };
}
