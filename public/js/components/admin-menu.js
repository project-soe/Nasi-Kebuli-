// components/admin-menu.js - kelola menu: tambah, ubah, hapus, habis/tersedia
import { h, icon, safeImageUrl } from '../core/dom.js';
import { formatRupiah, categoryLabel } from '../core/formatters.js';
import {
  subscribeMenuAll, saveMenuItem, setMenuAvailable, deleteMenuItem, seedSampleMenu,
} from '../services/admin-service.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const CATEGORIES = ['ayam', 'kambing', 'paket', 'minuman'];

function parsePrice(value) {
  return Number(String(value).replace(/\D/g, '')) || 0;
}

/** @returns {Record<string,string>} */
function validate(values) {
  const errors = {};
  if (values.name.length < 2 || values.name.length > 80) errors.name = 'Nama menu 2-80 huruf.';
  if (!values.category) errors.category = 'Isi kategori, misalnya ayam atau kambing.';
  if (values.price < 500 || values.price > 10000000) errors.price = 'Harga antara Rp 500 dan Rp 10.000.000.';
  if (values.imageUrl && !safeImageUrl(values.imageUrl)) errors.imageUrl = 'Isi dengan https://... atau jalur seperti assets/images/menu/foto.jpg';
  if (values.description.length > 200) errors.description = 'Deskripsi maksimal 200 huruf.';
  return errors;
}

function field(name, label, control, hint) {
  return h('div', { class: 'field', dataset: { field: name } },
    h('label', { for: `m-${name}`, text: label }),
    control,
    hint ? h('span', { class: 'field__hint', text: hint }) : null,
    h('span', { class: 'field__error', role: 'alert' }));
}

export function initMenu({ container }) {
  const state = { items: [], loaded: false, failed: false };

  const toolbar = h('div', { class: 'admin-toolbar' },
    h('button', { class: 'btn', type: 'button', onClick: () => openForm(null) },
      icon('i-plus'), 'Tambah menu'));
  const listEl = h('div', { class: 'admin-list' });
  container.replaceChildren(toolbar, listEl);

  /* ---------- form tambah / ubah ---------- */
  function openForm(item) {
    const modal = openModal({ title: item ? 'Ubah menu' : 'Tambah menu' });
    const v = item || { name: '', category: 'ayam', price: '', description: '', imageUrl: '', available: true, sortOrder: state.items.length + 1 };

    const inputs = {
      name: h('input', { id: 'm-name', type: 'text', maxlength: '80', value: v.name, placeholder: 'Nasi Kebuli Ayam' }),
      category: h('input', { id: 'm-category', type: 'text', maxlength: '30', value: v.category, list: 'm-category-list', placeholder: 'ayam' }),
      price: h('input', { id: 'm-price', type: 'text', inputmode: 'numeric', value: v.price ? String(v.price) : '', placeholder: '35000' }),
      description: h('textarea', { id: 'm-description', maxlength: '200', rows: '3', placeholder: 'Deskripsi singkat yang menggugah selera' }),
      imageUrl: h('input', { id: 'm-imageUrl', type: 'text', value: v.imageUrl, placeholder: 'assets/images/menu/ayam.jpg' }),
      sortOrder: h('input', { id: 'm-sortOrder', type: 'number', inputmode: 'numeric', value: String(v.sortOrder) }),
    };
    inputs.description.value = v.description;
    const available = h('input', { id: 'm-available', type: 'checkbox', role: 'switch' });
    available.checked = v.available;
    const featured = h('input', { id: 'm-featured', type: 'checkbox' });
    featured.checked = Boolean(v.featured);

    const datalist = h('datalist', { id: 'm-category-list' }, CATEGORIES.map((c) => h('option', { value: c })));

    const form = h('form', { class: 'stack', novalidate: true },
      field('name', 'Nama menu', inputs.name),
      field('category', 'Kategori', inputs.category, 'Pilih dari saran atau ketik kategori baru.'),
      datalist,
      field('price', 'Harga (Rp)', inputs.price),
      field('description', 'Deskripsi', inputs.description),
      field('imageUrl', 'Alamat foto (opsional)', inputs.imageUrl, 'Foto di repo: assets/images/menu/nama-foto.jpg. Atau tempel tautan https:// langsung ke gambar.'),
      field('sortOrder', 'Urutan tampil', inputs.sortOrder, 'Angka kecil tampil lebih awal.'),
      h('label', { class: 'admin-check', for: 'm-available' }, available, h('span', { text: 'Tersedia untuk dipesan' })),
      h('label', { class: 'admin-check', for: 'm-featured' }, featured, h('span', { text: 'Tampilkan di menu andalan (beranda)' }))
    );
    modal.body.append(form);

    const save = h('button', { class: 'btn btn--block', type: 'button', text: 'Simpan' });
    const cancel = h('button', { class: 'btn btn--ghost btn--block', type: 'button', text: 'Batal', onClick: () => modal.close() });
    modal.footer.append(save, cancel);

    async function submit() {
      const values = {
        name: inputs.name.value.trim(),
        category: inputs.category.value.trim().toLowerCase(),
        price: parsePrice(inputs.price.value),
        description: inputs.description.value.trim(),
        imageUrl: inputs.imageUrl.value.trim(),
        available: available.checked,
        featured: featured.checked,
        sortOrder: Number(inputs.sortOrder.value) || 999,
      };
      const errors = validate(values);
      form.querySelectorAll('.field').forEach((f) => {
        const msg = errors[f.dataset.field];
        f.classList.toggle('has-error', Boolean(msg));
        f.querySelector('.field__error').textContent = msg || '';
      });
      const firstKey = Object.keys(errors)[0];
      if (firstKey) { inputs[firstKey].focus(); return; }

      save.classList.add('is-loading');
      try {
        await saveMenuItem(item ? item.id : null, values);
        showToast(item ? 'Menu diperbarui' : 'Menu ditambahkan', { type: 'success' });
        modal.close();
      } catch (error) {
        console.warn('[admin] gagal menyimpan menu:', error);
        showToast('Gagal menyimpan menu. Coba lagi.', { type: 'error' });
        save.classList.remove('is-loading');
      }
    }
    save.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    inputs.name.focus();
  }

  /* ---------- hapus ---------- */
  function askDelete(item) {
    const modal = openModal({ title: 'Hapus menu?' });
    modal.body.append(h('p', { text: `"${item.name}" akan dihapus permanen dari daftar menu. Bila hanya habis sementara, matikan saja saklar "Tersedia".` }));
    const confirm = h('button', { class: 'btn btn--block', type: 'button', text: 'Hapus menu' });
    confirm.addEventListener('click', async () => {
      confirm.classList.add('is-loading');
      try {
        await deleteMenuItem(item.id);
        showToast('Menu dihapus', { type: 'success' });
        modal.close();
      } catch {
        showToast('Gagal menghapus menu.', { type: 'error' });
        confirm.classList.remove('is-loading');
      }
    });
    modal.footer.append(confirm, h('button', { class: 'btn btn--ghost btn--block', type: 'button', text: 'Batal', onClick: () => modal.close() }));
  }

  /* ---------- daftar ---------- */
  function row(item) {
    const url = safeImageUrl(item.imageUrl);
    const thumb = url
      ? h('img', { class: 'admin-row__thumb', src: url, alt: '', loading: 'lazy' })
      : h('div', { class: 'admin-row__thumb admin-row__thumb--empty' }, icon('i-photo', ''));

    const toggle = h('input', { type: 'checkbox', role: 'switch', 'aria-label': `${item.name} tersedia` });
    toggle.checked = item.available;
    toggle.addEventListener('change', async () => {
      try { await setMenuAvailable(item.id, toggle.checked); }
      catch {
        toggle.checked = !toggle.checked;
        showToast('Gagal mengubah ketersediaan.', { type: 'error' });
      }
    });

    return h('article', { class: `admin-row${item.available ? '' : ' admin-row--off'}` },
      thumb,
      h('div', { class: 'admin-row__info' },
        h('strong', { text: item.name }),
        h('span', { class: 'admin-row__meta', text: `${categoryLabel(item.category)} \u00b7 ${formatRupiah(item.price)}` }),
        h('label', { class: 'admin-row__avail' },
          h('span', { class: 'switch' }, toggle, h('span', { class: 'switch__track' })),
          h('span', { text: item.available ? 'Tersedia' : 'Habis' }))),
      h('div', { class: 'admin-row__actions' },
        h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': `Ubah ${item.name}`, onClick: () => openForm(item) }, icon('i-edit')),
        h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': `Hapus ${item.name}`, onClick: () => askDelete(item) }, icon('i-trash'))));
  }

  function render() {
    if (state.failed) {
      listEl.replaceChildren(h('div', { class: 'empty-state' }, h('p', { text: 'Menu tidak bisa dimuat. Periksa aturan Firestore dan hak admin.' })));
      return;
    }
    if (!state.loaded) {
      listEl.replaceChildren(h('div', { class: 'empty-state' }, h('p', { text: 'Memuat menu\u2026' })));
      return;
    }
    if (state.items.length === 0) {
      const seed = h('button', { class: 'btn btn--ghost', type: 'button', text: 'Isi dengan menu contoh' });
      seed.addEventListener('click', async () => {
        seed.classList.add('is-loading');
        try { await seedSampleMenu(); showToast('Menu contoh ditambahkan. Silakan ubah sesuai kebutuhan.', { type: 'success', duration: 4000 }); }
        catch { showToast('Gagal menambahkan menu contoh.', { type: 'error' }); seed.classList.remove('is-loading'); }
      });
      listEl.replaceChildren(h('div', { class: 'empty-state' },
        icon('i-dish', 'empty-state__icon'),
        h('p', { text: 'Belum ada menu di database. Situs pelanggan sementara menampilkan menu contoh.' }),
        seed));
      return;
    }
    listEl.replaceChildren(...state.items.map(row));
  }

  const unsubscribe = subscribeMenuAll(
    (items) => { state.items = items; state.loaded = true; state.failed = false; render(); },
    (error) => { console.warn('[admin] gagal memuat menu:', error); state.failed = true; render(); }
  );
  render();

  return { destroy: unsubscribe };
}
