// components/admin-store.js - pengaturan toko (nama, WhatsApp, jam, alamat, pesan tutup)
import { h } from '../core/dom.js';
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
  const save = h('button', { class: 'btn btn--lg btn--block', type: 'submit', text: 'Simpan pengaturan' });

  const form = h('form', { class: 'form-card stack', novalidate: true },
    h('h2', { class: 'form-card__title', text: 'Pengaturan toko' }),
    field('name', 'Nama toko', inputs.name),
    field('whatsapp', 'Nomor WhatsApp toko', inputs.whatsapp, 'Tombol "Kirim ke WhatsApp" pelanggan mengarah ke nomor ini.'),
    field('hours', 'Jam buka', inputs.hours),
    field('address', 'Alamat', inputs.address),
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
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = {
      name: inputs.name.value.trim(),
      whatsapp: normalizeWhatsApp(inputs.whatsapp.value),
      hours: inputs.hours.value.trim(),
      address: inputs.address.value.trim(),
      closedMessage: inputs.closedMessage.value.trim(),
    };
    const errors = {};
    if (values.name.length < 2) errors.name = 'Nama toko minimal 2 huruf.';
    if (!values.whatsapp) errors.whatsapp = 'Nomor tidak valid. Contoh: 081234567890';

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
