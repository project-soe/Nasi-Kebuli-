// services/api.js - satu-satunya pintu masuk ke Firebase.
// SDK dimuat saat dibutuhkan (dynamic import) sehingga jika Firebase
// gagal dimuat, halaman tetap tampil dengan data cadangan.
// Versi SDK hanya diatur di SINI.

import { firebaseConfig } from '../core/firebase-config.js';

const SDK_VERSION = '10.14.1';
const BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let ready;

/** @returns {Promise<{ db: object, fs: object }>} */
export function getFirebase() {
  ready ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${BASE}/firebase-app.js`),
      import(`${BASE}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    return { db: fs.getFirestore(app), fs };
  })();
  // jika gagal, izinkan percobaan ulang pada pemanggilan berikutnya
  ready.catch(() => { ready = undefined; });
  return ready;
}
