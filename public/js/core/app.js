// core/app.js - fungsi bersama semua halaman
import { STORE, CREDIT } from './config.js';
import { h } from './dom.js';

/** Isi teks toko (nama, jam, alamat) ke elemen ber-atribut data-store-* */
export function applyStoreInfo(store = STORE) {
  const set = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((el) => (el.textContent = value));
  };
  set('[data-store-name]', store.name);
  set('[data-store-hours]', store.hours);
  set('[data-store-address]', store.address);
}

/** Pasang tautan WhatsApp ke semua elemen ber-atribut data-wa-link */
export function applyWhatsAppLinks(store = STORE) {
  const url = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(store.defaultMessage || '')}`;
  document.querySelectorAll('[data-wa-link]').forEach((a) => {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

/** Tampilkan status Buka/Tutup pada lencana [data-store-status] */
export function applyStoreStatus(store) {
  const open = store.isOpen !== false;
  document.body.dataset.storeOpen = String(open);

  document.querySelectorAll('[data-store-status]').forEach((badge) => {
    const was = badge.classList.contains('badge--open')
      ? true
      : badge.classList.contains('badge--closed')
        ? false
        : null;

    badge.classList.remove('badge--pending', 'badge--open', 'badge--closed');
    badge.classList.add(open ? 'badge--open' : 'badge--closed');

    const text = badge.querySelector('[data-store-status-text]');
    if (text) text.textContent = open ? 'Buka' : 'Tutup';

    if (was !== null && was !== open) {
      badge.classList.add('is-changed');
      setTimeout(() => badge.classList.remove('is-changed'), 1900);
    }
  });
}

/** Munculkan elemen .reveal saat masuk layar (aman dipanggil berulang) */
let revealObserver;
export function initReveal(root = document) {
  const items = root.querySelectorAll('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => revealObserver.observe(el));
}

/** Hapus splash dari halaman setelah animasinya selesai */
export function initSplashCleanup() {
  const splash = document.querySelector('.splash');
  if (!splash) return;
  splash.addEventListener('animationend', (e) => {
    if (e.animationName === 'splash-out') splash.remove();
  });
}

/**
 * Kredit pengembang kecil di bawah footer ("Website oleh Soe" + logo).
 * Dimatikan lewat CREDIT.enabled = false di core/config.js.
 */
export function applyCredit(credit = CREDIT) {
  if (!credit?.enabled) return;
  document.querySelectorAll('.site-footer .container').forEach((box) => {
    if (box.querySelector('.site-credit')) return;
    const content = [
      h('span', { class: 'site-credit__mark', 'aria-hidden': 'true' }),
      h('span', { class: 'site-credit__text' }, `${credit.label} `, h('strong', { text: credit.name })),
    ];
    const el = credit.url
      ? h('a', {
          class: 'site-credit', href: credit.url, target: '_blank', rel: 'noopener noreferrer',
          'aria-label': `${credit.label} ${credit.name}`,
        }, ...content)
      : h('span', { class: 'site-credit' }, ...content);
    box.append(el);
  });
}

/** Jalankan semua fungsi umum */
export function bootCommon() {
  applyStoreInfo();
  applyWhatsAppLinks();
  initReveal();
  initSplashCleanup();
  applyCredit();
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}
