// components/payment-info.js - petunjuk pembayaran (tunai / transfer / QRIS)
// Dipakai di halaman sukses checkout dan halaman status pesanan.
import { h, icon, safeImageUrl } from '../core/dom.js';
import { formatRupiah, paymentLabel } from '../core/formatters.js';
import { showToast } from './toast.js';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Rekening disalin', { type: 'success' });
  } catch {
    showToast('Tidak bisa menyalin. Salin manual dari kotak di atas.', { type: 'error' });
  }
}

/**
 * @param {{ store: object, method: string, total: number, paid?: boolean, fulfillment?: string }} options
 * @returns {HTMLElement | null}
 */
export function createPaymentInfo({ store, method, total, paid = false, fulfillment = 'ambil' }) {
  if (!method) return null;

  if (paid) {
    return h('div', { class: 'pay-info pay-info--paid' },
      h('span', { class: 'pay-info__icon' }, icon('i-check', '')),
      h('div', {},
        h('strong', { text: 'Pembayaran sudah diterima' }),
        h('p', { text: `${paymentLabel(method)} \u00b7 ${formatRupiah(total)}` })));
  }

  const amount = formatRupiah(total);
  const children = [h('strong', { class: 'pay-info__title', text: `Pembayaran: ${paymentLabel(method)}` })];

  if (method === 'tunai') {
    children.push(h('p', {
      text: fulfillment === 'antar'
        ? `Bayar tunai saat pesanan diantar. Siapkan uang pas ${amount}.`
        : `Bayar tunai saat mengambil pesanan. Total ${amount}.`,
    }));
  }

  if (method === 'transfer') {
    children.push(h('p', { text: `Transfer tepat sejumlah ${amount} ke:` }));
    if (store.transferInfo) {
      children.push(
        h('p', { class: 'pay-info__accounts', text: store.transferInfo }),
        h('button', {
          class: 'btn btn--ghost btn--sm', type: 'button', text: 'Salin rekening',
          onClick: () => copyText(store.transferInfo),
        }));
    } else {
      children.push(h('p', { class: 'pay-info__warn', text: 'Nomor rekening belum diatur. Tanyakan ke penjual lewat WhatsApp.' }));
    }
  }

  if (method === 'qris') {
    children.push(h('p', { text: `Scan QRIS ini lalu bayar sejumlah ${amount}:` }));
    const url = safeImageUrl(store.qrisImage);
    children.push(url
      ? h('img', { class: 'pay-info__qris', src: url, alt: 'Kode QRIS pembayaran', loading: 'lazy', width: '320', height: '320' })
      : h('p', { class: 'pay-info__warn', text: 'Gambar QRIS belum diatur. Tanyakan ke penjual lewat WhatsApp.' }));
  }

  if (method !== 'tunai') {
    children.push(h('p', { class: 'pay-info__hint', text: 'Setelah membayar, kirim bukti pembayaran lewat WhatsApp agar pesanan segera diproses.' }));
  }
  if (store.paymentNote) children.push(h('p', { class: 'pay-info__hint', text: store.paymentNote }));

  return h('div', { class: 'pay-info' }, ...children);
}
