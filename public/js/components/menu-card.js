// components/menu-card.js - kartu menu (foto, harga, deskripsi, tombol tambah)
import { h, icon, safeImageUrl } from '../core/dom.js';
import { formatRupiah, categoryLabel } from '../core/formatters.js';

function placeholder(name) {
  return h('div', { class: 'photo-ph', role: 'img', 'aria-label': `Foto ${name} belum tersedia` }, icon('i-photo', ''));
}

function setButton(button, iconId, label) {
  button.replaceChildren(icon(iconId), label);
}

/** Animasi singkat "Ditambahkan" pada tombol */
export function flashAdded(button) {
  clearTimeout(button._resetTimer);
  button.classList.add('is-added');
  setButton(button, 'i-check', 'Ditambahkan');
  button._resetTimer = setTimeout(() => {
    button.classList.remove('is-added');
    setButton(button, 'i-plus', 'Tambah');
  }, 1100);
}

/**
 * @param {object} item  data menu
 * @param {{ closed?: boolean, onAdd?: (item: object, button: HTMLElement) => void, linkTo?: string }} options
 * linkTo: bila diisi, tombol menjadi tautan "Pesan" ke alamat itu (dipakai di beranda).
 */
export function createMenuCard(item, { closed = false, onAdd, linkTo } = {}) {
  const soldOut = !item.available;
  const imageUrl = safeImageUrl(item.imageUrl);

  let picture = placeholder(item.name);
  if (imageUrl) {
    picture = h('img', {
      class: 'menu-card__img', src: imageUrl, alt: item.name,
      loading: 'lazy', decoding: 'async', width: '800', height: '600',
    });
    picture.addEventListener('error', () => picture.replaceWith(placeholder(item.name)), { once: true });
  }

  let button;
  if (soldOut) {
    button = h('button', { class: 'btn btn--sm', type: 'button', disabled: true, text: 'Habis' });
  } else if (linkTo) {
    button = h('a', { class: 'btn btn--sm', href: linkTo, 'aria-label': `Pesan ${item.name}`, text: 'Pesan' });
  } else if (closed) {
    button = h('button', { class: 'btn btn--sm', type: 'button', disabled: true, text: 'Toko tutup' });
  } else {
    button = h('button', {
      class: 'btn btn--sm', type: 'button',
      'aria-label': `Tambah ${item.name} ke pesanan`,
    });
    setButton(button, 'i-plus', 'Tambah');
    button.addEventListener('click', () => onAdd && onAdd(item, button));
  }

  return h(
    'article',
    { class: `menu-card reveal${soldOut ? ' menu-card--habis' : ''}`, dataset: { id: item.id } },
    h('div', { class: 'menu-card__media' }, picture,
      h('span', { class: 'menu-card__tag', text: categoryLabel(item.category) })),
    h('div', { class: 'menu-card__body' },
      h('h3', { class: 'menu-card__title', text: item.name }),
      item.description ? h('p', { class: 'menu-card__desc', text: item.description }) : null),
    h('div', { class: 'menu-card__foot' },
      h('span', { class: 'menu-card__price', text: formatRupiah(item.price) }),
      button)
  );
}

/** Kerangka pemuatan sebelum data datang */
export function createSkeletonCard() {
  return h('article', { class: 'menu-card menu-card--skeleton', 'aria-hidden': 'true' },
    h('div', { class: 'menu-card__media' }),
    h('div', { class: 'menu-card__body' },
      h('h3', { class: 'menu-card__title', text: 'Memuat menu' }),
      h('p', { class: 'menu-card__desc', text: 'Memuat deskripsi menu yang lezat untuk kamu' })),
    h('div', { class: 'menu-card__foot' }, h('span', { class: 'menu-card__price', text: '\u00a0' })));
}
