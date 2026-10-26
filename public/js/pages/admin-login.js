// pages/admin-login.js - halaman login admin
import { watchAdmin, signInAdmin, signOutAdmin, authErrorMessage } from '../services/auth-service.js';

window.__appReady = true; // penanda: modul & semua impornya berhasil dimuat

const form = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const toggleBtn = document.getElementById('toggle-password');
const submitBtn = document.getElementById('login-submit');
const errorEl = document.getElementById('login-error');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.classList.toggle('is-loading', busy);
}

if (new URLSearchParams(location.search).get('reason') === 'bukan-admin') {
  showError('Akun ini belum terdaftar sebagai admin toko.');
}

toggleBtn.addEventListener('click', () => {
  const hidden = passwordInput.type === 'password';
  passwordInput.type = hidden ? 'text' : 'password';
  toggleBtn.textContent = hidden ? 'Sembunyikan' : 'Lihat';
  toggleBtn.setAttribute('aria-pressed', String(hidden));
});

// setelah login berhasil (atau sudah login), cek hak admin lalu masuk dashboard
watchAdmin(async ({ user, isAdmin, error }) => {
  if (!user) {
    if (error) showError('Tidak bisa terhubung ke Firebase. Periksa koneksi internet.');
    return;
  }
  if (isAdmin) {
    location.replace('dashboard.html');
    return;
  }
  await signOutAdmin().catch(() => {});
  setBusy(false);
  showError('Akun ini belum terdaftar sebagai admin toko.');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');

  if (!emailInput.value.trim() || !passwordInput.value) {
    showError('Isi email dan kata sandi.');
    return;
  }

  setBusy(true);
  try {
    await signInAdmin(emailInput.value, passwordInput.value);
    // pengalihan ke dashboard dilakukan oleh watchAdmin di atas
  } catch (error) {
    console.warn('[admin] login gagal:', error?.code);
    showError(authErrorMessage(error));
    setBusy(false);
  }
});
