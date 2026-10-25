// core/app.js - fungsi bersama semua halaman
import { STORE } from './config.js';

/** Isi teks toko (nama, jam, alamat) ke elemen ber-atribut data-store-* */
export function applyStoreInfo(store = STORE) {
  document.querySelectorAll('[data-store-name]').forEach((el) => (el.textContent = store.name));
  document.querySelectorAll('[data-store-hours]').forEach((el) => (el.textContent = store.hours));
  document.querySelectorAll('[data-store-address]').forEach((el) => (el.textContent = store.address));
}

/** Pasang tautan WhatsApp ke semua elemen ber-atribut data-wa-link */
export function applyWhatsAppLinks(store = STORE) {
  const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(store.defaultMessage)}`;
  document.querySelectorAll('[data-wa-link]').forEach((a) => {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

/** Munculkan elemen .reveal saat masuk layar */
export function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => io.observe(el));
}

/** Hapus splash dari halaman setelah animasinya selesai */
export function initSplashCleanup() {
  const splash = document.querySelector('.splash');
  if (!splash) return;
  splash.addEventListener('animationend', (e) => {
    if (e.animationName === 'splash-out') splash.remove();
  });
}

/** Jalankan semua fungsi umum */
export function bootCommon() {
  applyStoreInfo();
  applyWhatsAppLinks();
  initReveal();
  initSplashCleanup();
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}
