// services/auth-service.js - login admin (Firebase Authentication)
// Admin = akun yang punya dokumen admins/{uid} di Firestore.

import { getAuthSdk, getFirebase } from './api.js';

/**
 * Pantau status login. callback({ user, isAdmin }) dipanggil setiap status berubah.
 * @returns {() => void} fungsi berhenti memantau
 */
export function watchAdmin(callback) {
  let unsubscribe = () => {};
  let stopped = false;

  getAuthSdk()
    .then(({ auth, sdk }) => {
      if (stopped) return;
      unsubscribe = sdk.onAuthStateChanged(auth, async (user) => {
        if (!user) return callback({ user: null, isAdmin: false });
        try {
          const { db, fs } = await getFirebase();
          const snap = await fs.getDoc(fs.doc(db, 'admins', user.uid));
          callback({ user, isAdmin: snap.exists() });
        } catch (error) {
          console.warn('[admin] gagal memeriksa hak admin:', error);
          callback({ user, isAdmin: false, error });
        }
      });
    })
    .catch((error) => {
      console.warn('[admin] Firebase Auth tidak termuat:', error);
      callback({ user: null, isAdmin: false, error });
    });

  return () => { stopped = true; unsubscribe(); };
}

export async function signInAdmin(email, password) {
  const { auth, sdk } = await getAuthSdk();
  return sdk.signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAdmin() {
  const { auth, sdk } = await getAuthSdk();
  return sdk.signOut(auth);
}

export function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Email atau kata sandi salah.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet. Coba lagi.';
    case 'auth/operation-not-allowed':
      return 'Login Email/Password belum diaktifkan di Firebase Authentication.';
    default:
      return 'Tidak bisa masuk saat ini. Coba lagi sebentar lagi.';
  }
}
