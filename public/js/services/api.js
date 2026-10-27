// services/api.js - satu-satunya pintu masuk ke Firebase.
// SDK dimuat saat dibutuhkan (dynamic import) sehingga jika Firebase
// gagal dimuat, halaman tetap tampil dengan data cadangan.
// Versi SDK hanya diatur di SINI.

import { firebaseConfig, appCheckConfig } from '../core/firebase-config.js';

const SDK_VERSION = '10.14.1';
const BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let ready;
let authReady;

/**
 * Token debug App Check untuk pengembangan lokal (opsional).
 * Buka sekali: http://localhost:8080/?appcheck_debug=<token>, token disimpan di browser itu.
 * Token didaftarkan di Firebase Console > App Check > Manage debug tokens.
 * Tidak pernah ditulis di kode/repo, karena token debug memberi akses melewati App Check.
 */
function localDebugToken() {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return null;
  const fromUrl = new URLSearchParams(location.search).get('appcheck_debug');
  try {
    if (fromUrl) localStorage.setItem('appcheck-debug-token', fromUrl);
    return localStorage.getItem('appcheck-debug-token');
  } catch {
    return fromUrl;
  }
}

/** Aktifkan App Check bila site key diisi. Gagal = situs tetap jalan tanpa App Check. */
async function setupAppCheck(app) {
  if (!appCheckConfig.siteKey) return;
  try {
    const debugToken = localDebugToken();
    if (debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;

    const { initializeAppCheck, ReCaptchaV3Provider } = await import(`${BASE}/firebase-app-check.js`);
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckConfig.siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn('[app-check] gagal diaktifkan:', error);
  }
}

/** Firestore. @returns {Promise<{ app: object, db: object, fs: object }>} */
export function getFirebase() {
  ready ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${BASE}/firebase-app.js`),
      import(`${BASE}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    await setupAppCheck(app); // harus sebelum permintaan Firestore pertama
    return { app, db: fs.getFirestore(app), fs };
  })();
  // jika gagal, izinkan percobaan ulang pada pemanggilan berikutnya
  ready.catch(() => { ready = undefined; });
  return ready;
}

/** Authentication (hanya dimuat di halaman admin). */
export function getAuthSdk() {
  authReady ??= (async () => {
    const [{ app }, sdk] = await Promise.all([
      getFirebase(),
      import(`${BASE}/firebase-auth.js`),
    ]);
    return { auth: sdk.getAuth(app), sdk };
  })();
  authReady.catch(() => { authReady = undefined; });
  return authReady;
}
