// components/admin-store.js - pengaturan toko (nama, WhatsApp, jam, alamat, pesan tutup)
import { h, safeImageUrl } from '../core/dom.js';
import { saveStoreSettings } from '../services/admin-service.js';
import { showToast } from './toast.js';

/** 0812... / +62812... -> 62812... ; kosong bila tidak valid */
export function normalizeWhatsApp(value) {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return /^62[1-9]\d{7,13}$/.test(digits) ? digits : '';
}

function field(name, label, control, hint) {
  return h('div', { class: 'field', dataset: { field: name } },
    h('label', { for: `s-${name}`, text: label }),
    control,
    hint ? h('span', { class: 'field__hint', text: hint }) : null,
    h('span', { class: 'field__error', role: 'alert' }));
}

export function initStore({ container }) {
  const inputs = {
    name: h('input', { id: 's-name', type: 'text', maxlength: '60' }),
    whatsapp: h('input', { id: 's-whatsapp', type: 'tel', inputmode: 'tel', maxlength: '20', placeholder: '081234567890' }),
    hours: h('input', { id: 's-hours', type: 'text', maxlength: '60', placeholder: '10.00 - 21.00' }),
    address: h('textarea', { id: 's-address', maxlength: '200', rows: '2' }),
    closedMessage: h('textarea', { id: 's-closedMessage', maxlength: '160', rows: '2' }),
  };
  const pickup = h('input', { id: 's-pickup', type: 'checkbox' });
  const delivery = h('input', { id: 's-delivery', type: 'checkbox' });
  inputs.deliveryFee = h('input', { id: 's-deliveryFee', type: 'text', inputmode: 'numeric', placeholder: '0 = gratis' });
  inputs.deliveryNote = h('textarea', {
    id: 's-deliveryNote', maxlength: '160', rows: '2',
    placeholder: 'Contoh: Antar dalam radius 5 km. Di luar itu, ongkir disepakati lewat WhatsApp.',
  });
  inputs.fulfillment = pickup; // untuk fokus saat error

  const payCash = h('input', { id: 's-payCash', type: 'checkbox' });
  const payTransfer = h('input', { id: 's-payTransfer', type: 'checkbox' });
  const payQris = h('input', { id: 's-payQris', type: 'checkbox' });
  inputs.payment = payCash;
  inputs.transferInfo = h('textarea', {
    id: 's-transferInfo', maxlength: '300', rows: '3',
    placeholder: 'BCA 1234567890 a.n. Nama Pemilik\nDANA 081234567890 a.n. Nama Pemilik',
  });
  inputs.qrisImage = h('input', { id: 's-qrisImage', type: 'text', placeholder: 'assets/images/branding/qris.jpg' });
  inputs.paymentNote = h('textarea', {
    id: 's-paymentNote', maxlength: '160', rows: '2',
    placeholder: 'Contoh: Kirim bukti transfer ke WhatsApp, pesanan diproses setelah pembayaran diterima.',
  });

  const save = h('button', { class: 'btn btn--lg btn--block', type: 'submit', text: 'Simpan pengaturan' });

  const form = h('form', { class: 'form-card stack', novalidate: true },
    h('h2', { class: 'form-card__title', text: 'Pengaturan toko' }),
    field('name', 'Nama toko', inputs.name),
    field('whatsapp', 'Nomor WhatsApp toko', inputs.whatsapp, 'Tombol "Kirim ke WhatsApp" pelanggan mengarah ke nomor ini.'),
    field('hours', 'Jam buka', inputs.hours),
    field('address', 'Alamat', inputs.address),
    h('div', { class: 'field', dataset: { field: 'fulfillment' } },
      h('span', { class: 'field__label', text: 'Cara pelanggan menerima pesanan' }),
      h('label', { class: 'admin-check', for: 's-pickup' }, pickup, h('span', { text: 'Ambil di tempat' })),
      h('label', { class: 'admin-check', for: 's-delivery' }, delivery, h('span', { text: 'Diantar ke alamat pelanggan' })),
      h('span', { class: 'field__error', role: 'alert' })),
    field('deliveryFee', 'Ongkos kirim (Rp)', inputs.deliveryFee,
      'Satu tarif tetap untuk semua pesanan yang diantar. Isi 0 bila gratis.'),
    field('deliveryNote', 'Keterangan pengantaran (tampil di checkout)', inputs.deliveryNote),
    h('div', { class: 'field', dataset: { field: 'payment' } },
      h('span', { class: 'field__label', text: 'Metode pembayaran yang diterima' }),
      h('label', { class: 'admin-check', for: 's-payCash' }, payCash, h('span', { text: 'Tunai (bayar saat diterima)' })),
      h('label', { class: 'admin-check', for: 's-payTransfer' }, payTransfer, h('span', { text: 'Transfer bank / e-wallet' })),
      h('label', { class: 'admin-check', for: 's-payQris' }, payQris, h('span', { text: 'QRIS' })),
      h('span', { class: 'field__error', role: 'alert' })),
    field('transferInfo', 'Nomor rekening / e-wallet', inputs.transferInfo,
      'Wajib bila Transfer aktif. Satu rekening per baris; pelanggan bisa menyalinnya.'),
    field('qrisImage', 'Gambar QRIS', inputs.qrisImage,
      'Wajib bila QRIS aktif. Simpan gambar di public/assets/images/branding/ (push ke GitHub), lalu tulis jalurnya di sini. Boleh juga tautan https://.'),
    field('paymentNote', 'Catatan pembayaran (opsional)', inputs.paymentNote),
    field('closedMessage', 'Pesan saat toko tutup', inputs.closedMessage),
    save);
  container.replaceChildren(form);

  let filled = false;

  /** Isi form dari data Firestore (hanya sekali, agar ketikan tidak tertimpa) */
  function update(store) {
    if (filled) return;
    filled = true;
    inputs.name.value = store.name || '';
    inputs.whatsapp.value = /^\d{8,15}$/.test(store.whatsapp || '') && store.whatsapp !== '6280000000000' ? store.whatsapp : '';
    inputs.hours.value = store.hours || '';
    inputs.address.value = store.address || '';
    inputs.closedMessage.value = store.closedMessage || '';
    pickup.checked = store.pickupEnabled !== false;
    delivery.checked = store.deliveryEnabled !== false;
    inputs.deliveryFee.value = store.deliveryFee ? String(store.deliveryFee) : '';
    inputs.deliveryNote.value = store.deliveryNote || '';
    payCash.checked = store.paymentCash !== false;
    payTransfer.checked = store.paymentTransfer === true;
    payQris.checked = store.paymentQris === true;
    inputs.transferInfo.value = store.transferInfo || '';
    inputs.qrisImage.value = store.qrisImage || '';
    inputs.paymentNote.value = store.paymentNote || '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = {
      name: inputs.name.value.trim(),
      whatsapp: normalizeWhatsApp(inputs.whatsapp.value),
      hours: inputs.hours.value.trim(),
      address: inputs.address.value.trim(),
      closedMessage: inputs.closedMessage.value.trim(),
      pickupEnabled: pickup.checked,
      deliveryEnabled: delivery.checked,
      deliveryFee: Number(String(inputs.deliveryFee.value).replace(/\D/g, '')) || 0,
      deliveryNote: inputs.deliveryNote.value.trim(),
      paymentCash: payCash.checked,
      paymentTransfer: payTransfer.checked,
      paymentQris: payQris.checked,
      transferInfo: inputs.transferInfo.value.trim(),
      qrisImage: inputs.qrisImage.value.trim(),
      paymentNote: inputs.paymentNote.value.trim(),
    };
    const errors = {};
    if (values.name.length < 2) errors.name = 'Nama toko minimal 2 huruf.';
    if (!values.whatsapp) errors.whatsapp = 'Nomor tidak valid. Contoh: 081234567890';
    if (!values.pickupEnabled && !values.deliveryEnabled) errors.fulfillment = 'Aktifkan minimal satu cara menerima pesanan.';
    if (!values.paymentCash && !values.paymentTransfer && !values.paymentQris) {
      errors.payment = 'Aktifkan minimal satu metode pembayaran.';
    }
    if (values.paymentTransfer && values.transferInfo.length < 5) {
      errors.transferInfo = 'Isi nomor rekening / e-wallet untuk metode Transfer.';
    }
    if (values.paymentQris && !safeImageUrl(values.qrisImage)) {
      errors.qrisImage = 'Isi jalur gambar QRIS (mis. assets/images/branding/qris.jpg) atau tautan https://.';
    }
    if (values.deliveryFee > 500000) errors.deliveryFee = 'Ongkos kirim maksimal Rp 500.000.';

    form.querySelectorAll('.field').forEach((f) => {
      const msg = errors[f.dataset.field];
      f.classList.toggle('has-error', Boolean(msg));
      f.querySelector('.field__error').textContent = msg || '';
    });
    const firstKey = Object.keys(errors)[0];
    if (firstKey) { inputs[firstKey].focus(); return; }

    save.classList.add('is-loading');
    try {
      await saveStoreSettings(values);
      inputs.whatsapp.value = values.whatsapp;
      showToast('Pengaturan toko disimpan', { type: 'success' });
    } catch (error) {
      console.warn('[admin] gagal menyimpan pengaturan:', error);
      showToast('Gagal menyimpan. Coba lagi.', { type: 'error' });
    } finally {
      save.classList.remove('is-loading');
    }
  });

  return { update };
}
