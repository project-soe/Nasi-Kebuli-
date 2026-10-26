// pages/checkout.js - checkout: data pemesan, simpan pesanan, kirim ke WhatsApp
import { bootCommon, applyStoreInfo, applyWhatsAppLinks, applyStoreStatus } from '../core/app.js';
import { STORE } from '../core/config.js';
import { h, icon } from '../core/dom.js';
import { subscribeStore } from '../services/store-service.js';
import {
  createOrder, validateCheckout, normalizePhone,
  buildWhatsAppMessage, whatsappUrl, orderCode,
} from '../services/order-service.js';
import { cart } from '../components/cart.js';
import { orderLine, summaryRows, restoreFocus } from '../components/order-summary.js';
import { showToast } from '../components/toast.js';

const CUSTOMER_KEY = 'kebuli.customer.v1';
const LAST_ORDER_KEY = 'kebuli.lastOrderId';

const $ = (id) => document.getElementById(id);
const form = $('checkout-form');
const summaryEl = $('summary');
const contentEl = $('checkout-content');
const emptyEl = $('checkout-empty');
const successEl = $('checkout-success');
const submitBtn = $('submit-btn');
const banner = $('store-banner');
const bannerText = $('store-banner-text');

const state = {
  store: { ...STORE, isOpen: true, closedMessage: '' },
  submitting: false,
  done: false,
  attemptId: null,   // dipakai ulang bila pengiriman gagal, agar tidak ada pesanan ganda
};

const isClosed = () => state.store.isOpen === false;

/* ---------- penyimpanan kecil di perangkat ---------- */
function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* abaikan */ }
}

function prefill() {
  try {
    const saved = JSON.parse(readStorage(CUSTOMER_KEY) || '{}');
    if (saved.name) form.elements.name.value = saved.name;
    if (saved.phone) form.elements.phone.value = saved.phone;
  } catch { /* abaikan data rusak */ }
}

/* ---------- tampilan ---------- */
function updateView({ count }) {
  contentEl.hidden = state.done || count === 0;
  emptyEl.hidden = state.done || count > 0;
  successEl.hidden = !state.done;

  const last = readStorage(LAST_ORDER_KEY);
  const link = $('last-order-link');
  link.hidden = !last;
  if (last) link.href = `order-status.html?id=${encodeURIComponent(last)}`;
}

function renderSummary({ items, count, total }) {
  const focusKey = document.activeElement?.dataset?.key;
  summaryEl.replaceChildren(
    h('h2', { class: 'order-summary__title', text: 'Ringkasan pesanan' }),
    h('ul', { class: 'order-summary__list' }, items.map(orderLine)),
    ...summaryRows({ count, total }),
    h('a', { class: 'btn btn--ghost btn--block', href: 'menu.html', style: 'margin-top: var(--space-4)', text: 'Tambah menu lagi' })
  );
  restoreFocus(summaryEl, focusKey);
}

function refreshSubmit() {
  const closed = isClosed();
  submitBtn.disabled = closed || state.submitting;
  submitBtn.classList.toggle('is-loading', state.submitting);
  if (!state.submitting) submitBtn.textContent = closed ? 'Toko sedang tutup' : 'Kirim Pesanan';
}

/* ---------- validasi tampilan ---------- */
function showErrors(errors) {
  form.querySelectorAll('.field').forEach((field) => {
    const message = errors[field.dataset.field];
    field.classList.toggle('has-error', Boolean(message));
    field.querySelector('.field__error').textContent = message || '';
    const input = field.querySelector('input, textarea');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  });
}

function readForm() {
  return {
    name: form.elements.name.value,
    phone: form.elements.phone.value,
    note: form.elements.note.value,
  };
}

form.addEventListener('input', (event) => {
  const field = event.target.closest('.field');
  if (field?.classList.contains('has-error')) {
    field.classList.remove('has-error');
    field.querySelector('.field__error').textContent = '';
  }
});

/* ---------- kirim ---------- */
function errorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Pesanan ditolak. Toko mungkin baru saja tutup. Coba lagi sebentar lagi.';
  }
  if (error?.code === 'timeout' || error?.code === 'unavailable') {
    return 'Koneksi lambat. Pesananmu belum terkirim, silakan tekan Kirim Pesanan lagi.';
  }
  return 'Pesanan belum terkirim. Periksa koneksi internet, lalu coba lagi.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.submitting || state.done) return;

  if (isClosed()) {
    showToast('Toko sedang tutup', { type: 'error' });
    return;
  }

  const { items, total, count } = cart.getState();
  if (count === 0) return;

  const values = readForm();
  const errors = validateCheckout(values);
  showErrors(errors);
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    form.elements[firstError].focus();
    return;
  }

  state.submitting = true;
  refreshSubmit();

  try {
    const { id } = await createOrder({ ...values, items, total }, { orderId: state.attemptId });

    writeStorage(CUSTOMER_KEY, JSON.stringify({
      name: values.name.trim(),
      phone: normalizePhone(values.phone),
    }));
    writeStorage(LAST_ORDER_KEY, id);

    state.done = true;
    state.attemptId = null;
    showSuccess({ id, ...values, name: values.name.trim(), phone: normalizePhone(values.phone), note: values.note.trim(), items, total });
    cart.clear();
  } catch (error) {
    console.warn('[checkout] gagal menyimpan pesanan:', error);
    state.attemptId = error?.orderId || state.attemptId;
    showToast(errorMessage(error), { type: 'error', duration: 5000 });
  } finally {
    state.submitting = false;
    refreshSubmit();
  }
});

/* ---------- berhasil ---------- */
function showSuccess(order) {
  const code = orderCode(order.id);
  const message = buildWhatsAppMessage({ storeName: state.store.name, code, ...order });
  const hasNumber = /^\d{8,15}$/.test(String(state.store.whatsapp || ''));

  successEl.replaceChildren(
    h('div', { class: 'success__icon' }, icon('i-check', '')),
    h('h2', { text: 'Pesanan tersimpan!' }),
    h('p', { class: 'success__code', text: `Kode pesanan: ${code}` }),
    h('p', { text: 'Satu langkah lagi: kirim pesananmu ke WhatsApp penjual agar segera diproses.' }),
    hasNumber
      ? h('a', {
          class: 'btn btn--wa btn--lg', target: '_blank', rel: 'noopener noreferrer',
          href: whatsappUrl(state.store.whatsapp, message),
        }, icon('i-wa'), 'Kirim ke WhatsApp')
      : h('p', { class: 'field__error', style: 'display:block', text: 'Nomor WhatsApp toko belum diatur. Simpan kode pesananmu dan hubungi penjual.' }),
    h('a', { class: 'btn btn--ghost', href: `order-status.html?id=${encodeURIComponent(order.id)}`, text: 'Lihat status pesanan' }),
    h('a', { class: 'success__back', href: 'menu.html', text: 'Kembali ke menu' })
  );
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- mulai ---------- */
bootCommon();
prefill();

cart.subscribe((cartState, change) => {
  if (!state.done) {
    if (change.type !== 'init') state.attemptId = null; // isi pesanan berubah: percobaan baru
    renderSummary(cartState);
  }
  updateView(cartState);
});

subscribeStore((store) => {
  state.store = store;
  applyStoreInfo(store);
  applyWhatsAppLinks(store);
  applyStoreStatus(store);
  banner.hidden = !isClosed();
  bannerText.textContent = store.closedMessage;
  refreshSubmit();
});
