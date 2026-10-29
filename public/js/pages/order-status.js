// pages/order-status.js - pelanggan memantau status pesanan secara langsung
import { bootCommon, applyStoreInfo, applyWhatsAppLinks } from '../core/app.js';
import { STORE } from '../core/config.js';
import { h, icon } from '../core/dom.js';
import { formatRupiah, formatDateTime, statusLabel } from '../core/formatters.js';
import { subscribeStore } from '../services/store-service.js';
import { subscribeOrder, orderCode, whatsappUrl } from '../services/order-service.js';
import { showToast } from '../components/toast.js';
import { createPaymentInfo } from '../components/payment-info.js';
import { formatSchedule } from '../core/schedule.js';

const root = document.getElementById('status-root');
const titleEl = document.getElementById('status-title');

const STEPS = ['menunggu', 'diterima', 'diproses', 'selesai'];
function messageFor(order) {
  const antar = order.fulfillment === 'antar';
  switch (order.status) {
    case 'menunggu': return 'Menunggu konfirmasi penjual. Pastikan pesananmu sudah dikirim ke WhatsApp penjual.';
    case 'diterima': return 'Pesananmu sudah diterima penjual. Terima kasih!';
    case 'diproses': return antar
      ? 'Pesananmu sedang disiapkan dan akan segera diantar.'
      : 'Pesananmu sedang disiapkan. Penjual akan mengabari saat sudah bisa diambil.';
    case 'selesai': return antar
      ? 'Pesananmu sudah diantar. Selamat menikmati!'
      : 'Pesananmu sudah selesai dan siap diambil. Selamat menikmati!';
    case 'ditolak': return 'Mohon maaf, pesananmu belum bisa diproses.';
    default: return '';
  }
}

const fulfillmentText = (order) =>
  order.fulfillment === 'antar' ? 'Diantar' : order.fulfillment === 'ambil' ? 'Ambil di tempat' : '';

let store = { ...STORE };
let lastStatus = null;
let currentOrder = null;

/* ---------- id pesanan dari tautan / pesanan terakhir ---------- */
function resolveId() {
  const fromUrl = new URLSearchParams(location.search).get('id');
  if (fromUrl) return fromUrl;
  try { return localStorage.getItem('kebuli.lastOrderId') || ''; } catch { return ''; }
}

const validId = (id) => /^[A-Za-z0-9]{10,40}$/.test(id);

/* ---------- tampilan ---------- */
function showMessage(title, text, withMenuLink = true) {
  titleEl.textContent = title;
  root.replaceChildren(
    h('div', { class: 'empty-state' },
      icon('i-list', 'empty-state__icon'),
      h('p', { text }),
      withMenuLink ? h('a', { class: 'btn btn--lg', href: 'menu.html', text: 'Lihat Menu' }) : null)
  );
}

function track(status) {
  const index = STEPS.indexOf(status);
  return h('ol', { class: 'track', 'aria-label': 'Tahap pesanan' },
    STEPS.map((step, i) => {
      const done = i < index;
      const current = i === index;
      const cls = ['track__step', done ? 'is-done' : '', current ? 'is-current' : '', current && i === STEPS.length - 1 ? 'is-final' : '']
        .filter(Boolean).join(' ');
      return h('li', { class: cls, 'aria-current': current ? 'step' : null },
        h('span', { class: 'track__dot' }, icon('i-check', '')),
        statusLabel(step));
    }));
}

function chatLink(order) {
  const code = orderCode(order.id);
  const message = `Halo ${store.name}, saya ingin menanyakan pesanan ${code}.`;
  return h('a', {
    class: 'btn btn--wa btn--lg', target: '_blank', rel: 'noopener noreferrer',
    href: whatsappUrl(store.whatsapp, message),
  }, icon('i-wa'), 'Tanya lewat WhatsApp');
}

function render(order) {
  currentOrder = order;
  const rejected = order.status === 'ditolak';
  const code = orderCode(order.id);

  titleEl.textContent = rejected ? 'Pesanan ditolak' : statusLabel(order.status);
  document.title = `${statusLabel(order.status)} \u00b7 ${code} | ${store.name}`;

  root.replaceChildren(
    h('article', { class: `status-card${rejected ? ' status-card--ditolak' : ''}` },
      h('div', { class: 'status-card__head' },
        h('span', { class: 'status-card__code', text: `Kode ${code}` }),
        h('p', { class: 'status-card__message', text: messageFor(order) }),
        h('span', { class: 'status-card__time', text: [`Dipesan ${formatDateTime(order.createdAt)}`, fulfillmentText(order), order.scheduledFor ? `Jadwal ${formatSchedule(order.scheduledFor)}` : ''].filter(Boolean).join(' \u00b7 ') })),
      rejected
        ? (order.rejectReason ? h('p', { class: 'status-card__reason', text: `Alasan: ${order.rejectReason}` }) : null)
        : track(order.status)),

    h('article', { class: 'status-card' },
      h('h2', { class: 'form-card__title', text: 'Isi pesananmu' }),
      h('ul', { class: 'status-items' },
        order.items.map((item) =>
          h('li', {},
            h('span', { text: `${item.qty}\u00d7 ${item.name}` }),
            h('span', { text: formatRupiah(item.price * item.qty) }))),
        order.fulfillment === 'antar'
          ? h('li', {},
              h('span', { text: 'Ongkos kirim' }),
              h('span', { text: order.deliveryFee > 0 ? formatRupiah(order.deliveryFee) : 'Gratis' }))
          : null),
      h('div', { class: 'order-summary__row order-summary__row--total' },
        h('span', { text: 'Total' }),
        h('span', { class: 'order-summary__amount', text: formatRupiah(order.total) })),
      rejected ? null : createPaymentInfo({
        store, method: order.paymentMethod, total: order.total, paid: order.paid, fulfillment: order.fulfillment,
      }),
      h('div', { class: 'status-actions' },
        chatLink(order),
        h('a', { class: 'btn btn--ghost', href: 'menu.html', text: 'Pesan lagi' })))
  );
}

/* ---------- mulai ---------- */
bootCommon();

subscribeStore((s) => {
  store = s;
  applyStoreInfo(s);
  applyWhatsAppLinks(s);
  if (currentOrder) render(currentOrder); // perbarui tautan WhatsApp
});

const id = resolveId();

if (!id) {
  showMessage('Belum ada pesanan', 'Kamu belum punya pesanan yang bisa dipantau. Yuk, pilih menu dulu.');
} else if (!validId(id)) {
  showMessage('Tautan tidak valid', 'Tautan pesanan ini tidak dikenali. Periksa kembali tautan dari penjual atau halaman checkout.');
} else {
  subscribeOrder(
    id,
    (order) => {
      if (!order) {
        showMessage('Pesanan tidak ditemukan', 'Kami tidak menemukan pesanan dengan tautan ini. Periksa kembali tautannya.');
        return;
      }
      if (lastStatus && lastStatus !== order.status) {
        showToast(`Status pesananmu: ${statusLabel(order.status)}`, { type: order.status === 'ditolak' ? 'error' : 'success', duration: 4500 });
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      }
      lastStatus = order.status;
      render(order);
    },
    (error) => {
      console.warn('[status] gagal memuat pesanan:', error);
      showMessage('Tidak bisa memuat pesanan', 'Periksa koneksi internet, lalu muat ulang halaman ini.', false);
    }
  );
}
