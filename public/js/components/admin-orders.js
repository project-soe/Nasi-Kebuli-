// components/admin-orders.js - daftar pesanan masuk (langsung/real-time) untuk admin
import { h, icon } from '../core/dom.js';
import { formatRupiah, statusLabel, timeAgo } from '../core/formatters.js';
import { subscribeOrders, updateOrderStatus } from '../services/admin-service.js';
import { orderCode, whatsappUrl } from '../services/order-service.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const FILTERS = ['menunggu', 'diterima', 'diproses', 'selesai', 'ditolak', 'semua'];

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
  switch (order.status) {
    case 'diterima':
      return `Halo ${name}, pesanan ${code} sudah kami terima dengan total ${formatRupiah(order.total)}. Terima kasih sudah memesan di ${storeName}!`;
    case 'diproses':
      return `Halo ${name}, pesanan ${code} sedang kami siapkan. Mohon ditunggu ya.`;
    case 'selesai':
      return `Halo ${name}, pesanan ${code} sudah selesai. Terima kasih sudah memesan di ${storeName}!`;
    case 'ditolak':
      return `Mohon maaf ${name}, pesanan ${code} belum bisa kami proses.${order.rejectReason ? ` Alasan: ${order.rejectReason}.` : ''}`;
    default:
      return `Halo ${name}, kami dari ${storeName}. Terkait pesanan ${code}: `;
  }
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

      h('ul', { class: 'order-card__items' },
        order.items.map((item) =>
          h('li', {},
            h('span', { text: `${item.qty}\u00d7 ${item.name}` }),
            h('span', { text: formatRupiah(item.price * item.qty) })))),

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
          text: `${key === 'semua' ? 'Semua' : statusLabel(key)} (${c[key] ?? 0})`,
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

    const shown = state.filter === 'semua'
      ? state.orders
      : state.orders.filter((o) => o.status === state.filter);

    if (shown.length === 0) {
      list.replaceChildren(h('div', { class: 'empty-state' },
        icon('i-list', 'empty-state__icon'),
        h('p', { text: state.filter === 'semua' ? 'Belum ada pesanan masuk.' : `Tidak ada pesanan berstatus ${statusLabel(state.filter).toLowerCase()}.` })));
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
