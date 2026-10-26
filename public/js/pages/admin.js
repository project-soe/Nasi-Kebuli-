// pages/admin.js - dashboard admin: penjaga akses, tab, status toko
import { watchAdmin, signOutAdmin } from '../services/auth-service.js';
import { subscribeStore } from '../services/store-service.js';
import { setStoreOpen } from '../services/admin-service.js';
import { initOrders } from '../components/admin-orders.js';
import { initMenu } from '../components/admin-menu.js';
import { initStore } from '../components/admin-store.js';
import { showToast } from '../components/toast.js';

window.__appReady = true; // penanda: modul & semua impornya berhasil dimuat

const $ = (id) => document.getElementById(id);
const TABS = ['pesanan', 'menu', 'toko'];
const BASE_TITLE = 'Admin | Kebuli Ikhsan';

const loading = $('admin-loading');
const loadingText = $('admin-loading-text');
const app = $('admin-app');
const openToggle = $('open-toggle');
const openLabel = $('open-label');

let started = false;
let storeName = 'Kebuli Ikhsan';

/* ---------- tab ---------- */
function tabFromHash() {
  const name = location.hash.replace('#', '');
  return TABS.includes(name) ? name : 'pesanan';
}

function showTab(name) {
  TABS.forEach((tab) => {
    $(`panel-${tab}`).hidden = tab !== name;
    const button = document.querySelector(`[data-tab="${tab}"]`);
    button.classList.toggle('is-active', tab === name);
    button.setAttribute('aria-selected', String(tab === name));
  });
  window.scrollTo({ top: 0 });
}

/* ---------- mulai setelah akses terverifikasi ---------- */
function start(user) {
  loading.hidden = true;
  app.hidden = false;

  // tab
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => { location.hash = button.dataset.tab; });
  });
  window.addEventListener('hashchange', () => showTab(tabFromHash()));
  showTab(tabFromHash());

  // pesanan
  const pendingBadge = $('tab-pending');
  initOrders({
    filterBar: $('order-filter'),
    list: $('order-list'),
    adminEmail: user.email || user.uid,
    getStoreName: () => storeName,
    onPending: (count) => {
      pendingBadge.textContent = String(count);
      pendingBadge.hidden = count === 0;
      document.title = count ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
    },
  });

  // menu & toko
  initMenu({ container: $('menu-admin') });
  const storeTab = initStore({ container: $('store-admin') });

  // status toko (saklar di header) mengikuti Firestore
  subscribeStore((store) => {
    storeName = store.name;
    document.querySelectorAll('[data-store-name]').forEach((el) => (el.textContent = store.name));
    openToggle.checked = store.isOpen !== false;
    openLabel.textContent = openToggle.checked ? 'Buka' : 'Tutup';
    storeTab.update(store);
  });

  openToggle.addEventListener('change', async () => {
    const wanted = openToggle.checked;
    openLabel.textContent = wanted ? 'Buka' : 'Tutup';
    try {
      await setStoreOpen(wanted);
      showToast(wanted ? 'Toko dibuka. Pesanan bisa masuk.' : 'Toko ditutup. Pesanan baru ditolak.', { type: 'success' });
    } catch (error) {
      console.warn('[admin] gagal mengubah status toko:', error);
      openToggle.checked = !wanted;
      openLabel.textContent = openToggle.checked ? 'Buka' : 'Tutup';
      showToast('Gagal mengubah status toko.', { type: 'error' });
    }
  });

  $('logout-btn').addEventListener('click', async () => {
    await signOutAdmin().catch(() => {});
    location.replace('login.html');
  });
}

/* ---------- penjaga akses ---------- */
watchAdmin(({ user, isAdmin, error }) => {
  if (!user) {
    if (error) {
      loadingText.textContent = 'Tidak bisa terhubung ke Firebase. Periksa koneksi internet, lalu muat ulang.';
      return;
    }
    location.replace('login.html');
    return;
  }
  if (!isAdmin) {
    signOutAdmin().catch(() => {}).finally(() => location.replace('login.html?reason=bukan-admin'));
    return;
  }
  if (!started) {
    started = true;
    start(user);
  }
});
