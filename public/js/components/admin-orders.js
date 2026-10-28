// components/admin-orders.js - daftar pesanan masuk (langsung/real-time) untuk admin
import { h, icon } from '../core/dom.js';
import { formatRupiah, statusLabel, timeAgo, paymentLabel } from '../core/formatters.js';
import { formatSchedule } from '../core/schedule.js';
import { subscribeOrders, updateOrderStatus, setOrderPaid } from '../services/admin-service.js';
import { orderCode, whatsappUrl } from '../services/order-service.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const FILTERS = ['menunggu', 'terjadwal', 'diterima', 'diproses', 'selesai', 'ditolak', 'semua'];

/** Pesanan terjadwal yang masih aktif (belum selesai/ditolak) */
const isUpcoming = (o) => Boolean(o.scheduledFor) && ['menunggu', 'diterima', 'diproses'].includes(o.status);

const filterLabel = (key) => (key === 'semua' ? 'Semua' : key === 'terjadwal' ? 'Terjadwal' : statusLabel(key));

// langkah berikutnya untuk tiap status
const NEXT = {
  menunggu: { to: 'diterima', label: 'Terima' },
  diterima: { to: 'diproses', label: 'Mulai Proses' },
  diproses: { to: 'selesai', label: 'Tandai Selesai' },
};

/** Nada pendek saat ada pesanan baru (diam bila browser memblokir audio) */
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close();
  } catch { /* abaikan */ }
}

/** 081234567890 -> 6281234567890 */
const waNumber = (phone) => String(phone).replace(/\D/g, '').replace(/^0/, '62');

function chatMessage(order, storeName) {
  const code = orderCode(order.id);
  const name = order.customerName;
  const antar = order.fulfillment === 'antar';
  switch (order.status) {
    case 'diterima':
      return `Halo ${name}, pesanan ${code} sudah kami terima dengan total ${formatRupiah(order.total)}${antar ? ' (sudah termasuk ongkos kirim)' : ''}${order.scheduledFor ? `, dijadwalkan ${formatSchedule(order.scheduledFor)}` : ''}. Terima kasih sudah memesan di ${storeName}!`;
    case 'diproses':
      return antar
        ? `Halo ${name}, pesanan ${code} sedang kami siapkan dan akan segera diantar. Mohon ditunggu ya.`
        : `Halo ${name}, pesanan ${code} sedang kami siapkan. Kami kabari saat sudah bisa diambil ya.`;
    case 'selesai':
      return antar
        ? `Halo ${name}, pesanan ${code} sudah kami antar. Terima kasih sudah memesan di ${storeName}!`
        : `Halo ${name}, pesanan ${code} sudah selesai dan siap diambil. Terima kasih sudah memesan di ${storeName}!`;
    case 'ditolak':
      return `Mohon maaf ${name}, pesanan ${code} belum bisa kami proses.${order.rejectReason ? ` Alasan: ${order.rejectReason}.` : ''}`;
    default:
      return `Halo ${name}, kami dari ${storeName}. Terkait pesanan ${code}: `;
  }
}

/** Jadwal ambil/antar untuk pesanan pre-order */
function scheduleBlock(order) {
  if (!order.scheduledFor) return null;
  return h('div', { class: 'order-card__schedule' },
    h('span', { class: 'fulfil-pill fulfil-pill--jadwal', text: 'Dijadwalkan' }),
    h('strong', { text: formatSchedule(order.scheduledFor) }));
}

/** Cara terima (diantar / ambil) + alamat dan tautan peta */
function fulfillmentBlock(order) {
  if (!order.fulfillment) return null; // pesanan lama tanpa data cara terima
  const antar = order.fulfillment === 'antar';
  return h('div', { class: 'order-card__fulfil' },
    h('span', { class: `fulfil-pill fulfil-pill--${order.fulfillment}`, text: antar ? 'Diantar' : 'Ambil di tempat' }),
    antar && order.address ? h('p', { class: 'order-card__address', text: order.address }) : null,
    antar && order.address
      ? h('a', {
          class: 'order-card__map', target: '_blank', rel: 'noopener noreferrer', text: 'Buka di Google Maps',
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`,
        })
      : null);
}

/**
 * @param {{ filterBar: HTMLElement, list: HTMLElement, adminEmail: string,
 *           getStoreName: () => string, onPending: (n: number) => void }} options
 */
export function initOrders({ filterBar, list, adminEmail, getStoreName, onPending }) {
  const state = { orders: [], filter: 'menunggu', loaded: false, failed: false };

  /* ---------- aksi ---------- */
  async function changeStatus(order, status, button, extra = {}) {
    button?.classList.add('is-loading');
    try {
      await updateOrderStatus(order, status, { by: adminEmail, ...extra });
      showToast(`Pesanan ${orderCode(order.id)}: ${statusLabel(status)}`, { type: 'success' });
    } catch (error) {
      console.warn('[admin] gagal mengubah status:', error);
      showToast('Gagal mengubah status. Periksa koneksi, lalu coba lagi.', { type: 'error', duration: 4500 });
      button?.classList.remove('is-loading');
    }
  }

  async function togglePaid(order, button) {
    button.classList.add('is-loading');
    try {
      await setOrderPaid(order, !order.paid, { by: adminEmail });
      showToast(order.paid ? 'Tanda lunas dibatalkan' : `Pesanan ${orderCode(order.id)} ditandai lunas`, { type: 'success' });
    } catch (error) {
      console.warn('[admin] gagal mengubah status bayar:', error);
      showToast('Gagal mengubah status pembayaran.', { type: 'error' });
      button.classList.remove('is-loading');
    }
  }

  /** Metode bayar + status lunas + tombol tandai lunas */
  function paymentBlock(order) {
    if (!order.paymentMethod) return null; // pesanan lama tanpa data pembayaran
    const button = h('button', {
      class: 'btn btn--ghost btn--sm', type: 'button',
      text: order.paid ? 'Batalkan lunas' : 'Tandai lunas',
    });
    button.addEventListener('click', () => togglePaid(order, button));
    return h('div', { class: 'order-card__pay' },
      h('span', { class: 'fulfil-pill fulfil-pill--bayar', text: paymentLabel(order.paymentMethod) }),
      h('span', { class: `pay-pill pay-pill--${order.paid ? 'lunas' : 'belum'}`, text: order.paid ? 'Lunas' : 'Belum dibayar' }),
      order.status === 'ditolak' ? null : button);
  }

  function askReject(order) {
    const modal = openModal({ title: `Tolak pesanan ${orderCode(order.id)}?` });
    const reason = h('textarea', {
      id: 'reject-reason', maxlength: '200', rows: '3',
      placeholder: 'Contoh: stok kambing habis hari ini',
    });
    modal.body.append(
      h('p', { text: `Pesanan dari ${order.customerName} akan ditandai ditolak. Alasan (boleh dikosongkan) ikut dikirim ke pelanggan lewat WhatsApp.` }),
      h('div', { class: 'field', style: 'margin-top: var(--space-4)' },
        h('label', { for: 'reject-reason', text: 'Alasan penolakan' }), reason)
    );
    const confirm = h('button', { class: 'btn btn--block', type: 'button', text: 'Tolak pesanan' });
    const cancel = h('button', { class: 'btn btn--ghost btn--block', type: 'button', text: 'Batal', onClick: () => modal.close() });
    confirm.addEventListener('click', async () => {
      const text = reason.value.trim();
      modal.close();
      await changeStatus(order, 'ditolak', null, { reason: text });
    });
    modal.footer.append(confirm, cancel);
  }

  /* ---------- tampilan ---------- */
  function orderCard(order) {
    const code = orderCode(order.id);
    const next = NEXT[order.status];

    const actions = [];
    if (order.status === 'menunggu') {
      actions.push(h('button', {
        class: 'btn btn--ghost btn--sm', type: 'button', text: 'Tolak',
        onClick: () => askReject(order),
      }));
    }
    if (next) {
      const button = h('button', { class: 'btn btn--sm', type: 'button', text: next.label });
      button.addEventListener('click', () => changeStatus(order, next.to, button));
      actions.push(button);
    }

    return h('article', { class: `order-card order-card--${order.status}` },
      h('header', { class: 'order-card__head' },
        h('div', {},
          h('strong', { class: 'order-card__code', text: `#${code}` }),
          h('span', { class: 'order-card__time', text: timeAgo(order.createdAt) })),
        h('span', { class: `status-pill status-pill--${order.status}`, text: statusLabel(order.status) })),

      h('div', { class: 'order-card__customer' },
        h('strong', { text: order.customerName }),
        h('div', { class: 'cluster' },
          h('a', { class: 'order-card__phone', href: `tel:${order.phone}`, text: order.phone }),
          h('a', {
            class: 'btn btn--wa btn--sm', target: '_blank', rel: 'noopener noreferrer',
            href: whatsappUrl(waNumber(order.phone), chatMessage(order, getStoreName())),
            'aria-label': `Chat WhatsApp ${order.customerName}`,
          }, icon('i-wa'), 'Chat'))),

      fulfillmentBlock(order),
      scheduleBlock(order),
      paymentBlock(order),

      h('ul', { class: 'order-card__items' },
        order.items.map((item) =>
          h('li', {},
            h('span', { text: `${item.qty}\u00d7 ${item.name}` }),
            h('span', { text: formatRupiah(item.price * item.qty) }))),
        order.fulfillment === 'antar'
          ? h('li', {},
              h('span', { text: 'Ongkos kirim' }),
              h('span', { text: order.deliveryFee > 0 ? formatRupiah(order.deliveryFee) : 'Gratis' }))
          : null),

      order.note ? h('p', { class: 'order-card__note', text: `Catatan: ${order.note}` }) : null,
      order.status === 'ditolak' && order.rejectReason
        ? h('p', { class: 'order-card__note', text: `Alasan ditolak: ${order.rejectReason}` }) : null,

      h('footer', { class: 'order-card__foot' },
        h('div', { class: 'order-card__total' },
          h('span', { text: 'Total' }),
          h('strong', { text: formatRupiah(order.total) })),
        h('div', { class: 'cluster' }, actions)));
  }

  function counts() {
    const result = { semua: state.orders.length };
    FILTERS.forEach((f) => { if (f !== 'semua') result[f] = 0; });
    state.orders.forEach((o) => { if (o.status in result) result[o.status] += 1; });
    result.terjadwal = state.orders.filter(isUpcoming).length;
    return result;
  }

  function renderFilters() {
    const c = counts();
    filterBar.replaceChildren(
      ...FILTERS.map((key) =>
        h('button', {
          class: `chip${key === state.filter ? ' is-active' : ''}`,
          type: 'button',
          'aria-pressed': String(key === state.filter),
          text: `${filterLabel(key)} (${c[key] ?? 0})`,
          onClick: () => { state.filter = key; render(); },
        }))
    );
  }

  function render() {
    renderFilters();

    if (state.failed) {
      list.replaceChildren(h('div', { class: 'empty-state' },
        h('p', { text: 'Pesanan tidak bisa dimuat. Pastikan aturan Firestore sudah dipublikasikan dan akun ini terdaftar sebagai admin.' })));
      return;
    }
    if (!state.loaded) {
      list.replaceChildren(h('div', { class: 'empty-state' }, h('p', { text: 'Memuat pesanan\u2026' })));
      return;
    }

    let shown;
    if (state.filter === 'semua') shown = state.orders;
    else if (state.filter === 'terjadwal') {
      // paling dekat jadwalnya tampil paling atas
      shown = state.orders.filter(isUpcoming).sort((a, b) => a.scheduledFor - b.scheduledFor);
    } else shown = state.orders.filter((o) => o.status === state.filter);

    if (shown.length === 0) {
      list.replaceChildren(h('div', { class: 'empty-state' },
        icon('i-list', 'empty-state__icon'),
        h('p', { text: state.filter === 'semua' ? 'Belum ada pesanan masuk.' : state.filter === 'terjadwal' ? 'Tidak ada pesanan terjadwal yang aktif.' : `Tidak ada pesanan berstatus ${statusLabel(state.filter).toLowerCase()}.` })));
      return;
    }
    list.replaceChildren(...shown.map(orderCard));
  }

  /* ---------- data langsung ---------- */
  const unsubscribe = subscribeOrders(
    (orders, added) => {
      state.orders = orders;
      state.loaded = true;
      state.failed = false;
      onPending(orders.filter((o) => o.status === 'menunggu').length);
      render();

      if (added.length) {
        const first = added[0];
        showToast(
          added.length === 1
            ? `Pesanan baru dari ${first.customerName}`
            : `${added.length} pesanan baru masuk`,
          { type: 'success', duration: 5000 }
        );
        beep();
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      }
    },
    (error) => {
      console.warn('[admin] gagal memuat pesanan:', error);
      state.failed = true;
      render();
    }
  );

  // perbarui "5 menit lalu" tiap menit
  const ticker = setInterval(render, 60000);
  render();

  return { destroy() { unsubscribe(); clearInterval(ticker); } };
}
