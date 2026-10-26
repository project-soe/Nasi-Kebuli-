// components/order-summary.js - baris pesanan dan ringkasan total
// Dipakai di modal pesanan (menu.html) dan halaman checkout.
import { h, icon } from '../core/dom.js';
import { formatRupiah } from '../core/formatters.js';
import { cart, MAX_QTY } from './cart.js';

/** Satu baris pesanan dengan tombol - / + dan hapus */
export function orderLine(item) {
  const key = (action) => `${item.id}:${action}`;
  return h('li', { class: 'order-line' },
    h('div', {},
      h('div', { class: 'order-line__name', text: item.name }),
      h('div', { class: 'order-line__meta', text: `${formatRupiah(item.price)} \u00d7 ${item.qty}` })),
    h('div', { class: 'order-line__price', text: formatRupiah(item.price * item.qty) }),
    h('div', { class: 'order-line__qty' },
      h('div', { class: 'qty' },
        h('button', {
          class: 'qty__btn', type: 'button', dataset: { key: key('dec') },
          'aria-label': `Kurangi ${item.name}`, text: '\u2212',
          onClick: () => cart.setQty(item.id, item.qty - 1),
        }),
        h('span', { class: 'qty__value', 'aria-live': 'polite', text: String(item.qty) }),
        h('button', {
          class: 'qty__btn', type: 'button', dataset: { key: key('inc') },
          'aria-label': `Tambah ${item.name}`, text: '+',
          disabled: item.qty >= MAX_QTY,
          onClick: () => cart.setQty(item.id, item.qty + 1),
        })),
      h('button', {
        class: 'order-line__remove', type: 'button', dataset: { key: key('del') },
        'aria-label': `Hapus ${item.name}`,
        onClick: () => cart.remove(item.id),
      }, icon('i-trash', ''))));
}

/** Baris "Jumlah porsi" dan "Total" */
export function summaryRows({ count, total }) {
  return [
    h('div', { class: 'order-summary__row' },
      h('span', { text: 'Jumlah porsi' }),
      h('span', { text: String(count) })),
    h('div', { class: 'order-summary__row order-summary__row--total' },
      h('span', { text: 'Total' }),
      h('span', { class: 'order-summary__amount', text: formatRupiah(total) })),
  ];
}

/** Jaga fokus pada tombol yang sama setelah daftar digambar ulang */
export function restoreFocus(container, key) {
  if (!key) return;
  const again = [...container.querySelectorAll('[data-key]')].find((n) => n.dataset.key === key);
  if (again && !again.disabled) again.focus();
}
