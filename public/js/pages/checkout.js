// pages/checkout.js - checkout: data pemesan, simpan pesanan, kirim ke WhatsApp
import { bootCommon, applyStoreInfo, applyWhatsAppLinks, applyStoreStatus } from '../core/app.js';
import { STORE } from '../core/config.js';
import { h, icon } from '../core/dom.js';
import { formatRupiah, paymentLabel } from '../core/formatters.js';
import { subscribeStore } from '../services/store-service.js';
import {
  createOrder, validateCheckout, normalizePhone,
  buildWhatsAppMessage, whatsappUrl, orderCode, MAX_LINES,
} from '../services/order-service.js';
import { fetchMenu } from '../services/menu-service.js';
import { cart } from '../components/cart.js';
import { orderLine, summaryRows, restoreFocus } from '../components/order-summary.js';
import { showToast } from '../components/toast.js';
import { createPaymentInfo } from '../components/payment-info.js';

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
  storeLoaded: false, // tombol kirim menunggu pengaturan toko (ongkir) termuat
  submitting: false,
  done: false,
  preferredPayment: '', // pilihan terakhir pelanggan (dari penyimpanan perangkat)
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
    if (saved.address) form.elements.address.value = saved.address;
    if (saved.fulfillment === 'antar') setFulfillment('antar');
    if (saved.payment) state.preferredPayment = saved.payment;
  } catch { /* abaikan data rusak */ }
}

/* ---------- cara pembayaran ---------- */
const PAYMENT_HINTS = {
  tunai: 'Bayar saat pesanan diterima',
  transfer: 'Transfer ke rekening penjual',
  qris: 'Scan QRIS lewat e-wallet atau m-banking',
};

function enabledPayments(store = state.store) {
  const list = [];
  if (store.paymentCash !== false) list.push('tunai');
  if (store.paymentTransfer === true) list.push('transfer');
  if (store.paymentQris === true) list.push('qris');
  return list.length ? list : ['tunai'];
}

const checkedPayment = () => form.querySelector('input[name="payment"]:checked')?.value || '';
const currentPayment = () => checkedPayment() || enabledPayments()[0];

function syncPaymentUI() {
  form.querySelectorAll('#payment-options .option').forEach((label) => {
    label.classList.toggle('is-selected', label.querySelector('input').checked);
  });
}

/** Tampilkan hanya metode yang diaktifkan pemilik */
function applyPaymentOptions() {
  const methods = enabledPayments();
  const wanted = checkedPayment() || state.preferredPayment;
  const chosen = methods.includes(wanted) ? wanted : methods[0];

  $('payment-options').replaceChildren(
    ...methods.map((method) =>
      h('label', { class: `option${method === chosen ? ' is-selected' : ''}` },
        h('input', { type: 'radio', name: 'payment', value: method, checked: method === chosen }),
        h('span', { class: 'option__body' },
          h('strong', { text: paymentLabel(method) }),
          h('small', { text: PAYMENT_HINTS[method] }))))
  );
  $('payment-group').hidden = methods.length === 1; // satu metode saja: tidak perlu memilih
}

/* ---------- cara menerima pesanan: ambil / antar ---------- */
const fulfillmentInputs = () => [...form.querySelectorAll('input[name="fulfillment"]')];

function currentFulfillment() {
  return form.elements.fulfillment.value === 'antar' ? 'antar' : 'ambil';
}

/** Ongkos kirim dari pengaturan toko (0 bila ambil di tempat) */
const deliveryFee = () => (currentFulfillment() === 'antar' ? Number(state.store.deliveryFee) || 0 : 0);

function setFulfillment(value) {
  fulfillmentInputs().forEach((input) => { input.checked = input.value === value; });
  syncFulfillmentUI();
}

function syncFulfillmentUI() {
  const antar = currentFulfillment() === 'antar';
  $('opt-ambil').classList.toggle('is-selected', !antar);
  $('opt-antar').classList.toggle('is-selected', antar);
  $('address-field').hidden = !antar;
  $('delivery-note').textContent = state.store.deliveryNote || '';
  renderSummary(cart.getState());
}

/** Tampilkan hanya opsi yang diaktifkan pemilik; isi keterangan ongkir/alamat */
function applyFulfillmentOptions() {
  const s = state.store;
  const pickupOk = s.pickupEnabled !== false;
  const deliveryOk = s.deliveryEnabled !== false;

  $('opt-ambil').hidden = !pickupOk;
  $('opt-antar').hidden = !deliveryOk;
  $('fulfillment-group').hidden = !(pickupOk && deliveryOk); // satu opsi saja: tidak perlu memilih

  const fee = Number(s.deliveryFee) || 0;
  $('delivery-hint').textContent = `Diantar ke alamatmu \u00b7 ongkos kirim ${fee > 0 ? formatRupiah(fee) : 'gratis'}`;
  const addressKnown = s.address && !s.address.startsWith('Alamat toko diisi');
  $('pickup-hint').textContent = addressKnown ? `Ambil di: ${s.address}` : 'Ambil sendiri di toko';

  let choice = currentFulfillment();
  if (choice === 'antar' && !deliveryOk) choice = 'ambil';
  if (choice === 'ambil' && !pickupOk && deliveryOk) choice = 'antar';
  setFulfillment(choice);
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
  const delivery = currentFulfillment() === 'antar' ? { fee: deliveryFee() } : null;
  summaryEl.replaceChildren(
    h('h2', { class: 'order-summary__title', text: 'Ringkasan pesanan' }),
    h('ul', { class: 'order-summary__list' }, items.map(orderLine)),
    ...summaryRows({ count, total, delivery }),
    h('a', { class: 'btn btn--ghost btn--block', href: 'menu.html', style: 'margin-top: var(--space-4)', text: 'Tambah menu lagi' })
  );
  restoreFocus(summaryEl, focusKey);
}

function refreshSubmit() {
  const closed = isClosed();
  const waiting = !state.storeLoaded;
  submitBtn.disabled = closed || waiting || state.submitting;
  submitBtn.classList.toggle('is-loading', state.submitting);
  if (!state.submitting) {
    submitBtn.textContent = closed ? 'Toko sedang tutup' : waiting ? 'Memuat\u2026' : 'Kirim Pesanan';
  }
}

/* ---------- validasi tampilan ---------- */
function showErrors(errors) {
  form.querySelectorAll('.field').forEach((field) => {
    const message = errors[field.dataset.field];
    field.classList.toggle('has-error', Boolean(message));
    const errorEl = field.querySelector('.field__error');
    if (errorEl) errorEl.textContent = message || '';
    const input = field.querySelector('input, textarea');
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  });
}

function readForm() {
  return {
    name: form.elements.name.value,
    phone: form.elements.phone.value,
    note: form.elements.note.value,
    fulfillment: currentFulfillment(),
    address: form.elements.address.value,
    payment: currentPayment(),
  };
}

form.addEventListener('change', (event) => {
  if (event.target.name === 'fulfillment') syncFulfillmentUI();
  if (event.target.name === 'payment') syncPaymentUI();
});

form.addEventListener('input', (event) => {
  const field = event.target.closest('.field');
  if (field?.classList.contains('has-error')) {
    field.classList.remove('has-error');
    const errorEl = field.querySelector('.field__error');
    if (errorEl) errorEl.textContent = '';
  }
});

/* ---------- samakan keranjang dengan menu & harga terbaru ---------- */
async function syncCartWithMenu() {
  try {
    const { items, source } = await fetchMenu();
    if (source !== 'firebase') return false;
    const { removed, repriced } = cart.sync(items);
    return removed.length > 0 || repriced.length > 0;
  } catch {
    return false;
  }
}

const PRICE_CHANGED = 'Menu atau harga baru saja berubah. Pesananmu sudah disesuaikan, silakan periksa lalu kirim lagi.';

/* ---------- kirim ---------- */
function errorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Pesanan ditolak. Toko mungkin baru saja tutup, atau menu berubah. Coba lagi sebentar lagi.';
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

  if (items.length > MAX_LINES) {
    showToast(`Maksimal ${MAX_LINES} jenis menu per pesanan. Kurangi satu menu atau kirim sebagai dua pesanan.`, { type: 'error', duration: 5000 });
    return;
  }

  const values = readForm();

  if (values.fulfillment === 'antar' && state.store.deliveryEnabled === false) {
    showToast('Pengantaran sedang tidak tersedia. Pilih ambil di tempat.', { type: 'error' });
    return;
  }

  if (!enabledPayments().includes(values.payment)) {
    showToast('Metode pembayaran itu tidak tersedia lagi. Pilih yang lain.', { type: 'error' });
    applyPaymentOptions();
    return;
  }

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
    const fee = deliveryFee();
    const grandTotal = total + fee;
    const { id } = await createOrder(
      { ...values, items, total: grandTotal, deliveryFee: fee, paymentMethod: values.payment },
      { orderId: state.attemptId }
    );

    writeStorage(CUSTOMER_KEY, JSON.stringify({
      name: values.name.trim(),
      phone: normalizePhone(values.phone),
      fulfillment: values.fulfillment,
      address: values.address.trim(),
      payment: values.payment,
    }));
    writeStorage(LAST_ORDER_KEY, id);

    state.done = true;
    state.attemptId = null;
    showSuccess({
      id, ...values,
      name: values.name.trim(), phone: normalizePhone(values.phone),
      note: values.note.trim(), address: values.address.trim(),
      items, total: grandTotal, deliveryFee: fee, paymentMethod: values.payment,
    });
    cart.clear();
  } catch (error) {
    console.warn('[checkout] gagal menyimpan pesanan:', error);
    state.attemptId = error?.orderId || state.attemptId;
    // ditolak server: kemungkinan harga/menu berubah. Sinkronkan lalu beri tahu pelanggan.
    const adjusted = error?.code === 'permission-denied' && (await syncCartWithMenu());
    showToast(adjusted ? PRICE_CHANGED : errorMessage(error), { type: 'error', duration: 6000 });
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
    h('p', { text: order.fulfillment === 'antar'
      ? 'Pesananmu akan diantar. Satu langkah lagi: kirim pesananmu ke WhatsApp penjual agar segera diproses.'
      : 'Pesananmu bisa diambil di toko. Satu langkah lagi: kirim pesananmu ke WhatsApp penjual agar segera diproses.' }),
    createPaymentInfo({
      store: state.store, method: order.paymentMethod, total: order.total, fulfillment: order.fulfillment,
    }),
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

// pastikan harga di keranjang sama dengan menu terbaru sebelum pelanggan mengirim
syncCartWithMenu().then((adjusted) => { if (adjusted) showToast(PRICE_CHANGED, { duration: 6000 }); });

subscribeStore((store) => {
  state.store = store;
  state.storeLoaded = true;
  applyFulfillmentOptions();
  applyPaymentOptions();
  applyStoreInfo(store);
  applyWhatsAppLinks(store);
  applyStoreStatus(store);
  banner.hidden = !isClosed();
  bannerText.textContent = store.closedMessage;
  refreshSubmit();
});

applyPaymentOptions();
refreshSubmit();
