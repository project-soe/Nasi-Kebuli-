// core/dom.js - pembantu membuat elemen dengan aman.
// Semua teks dari database dimasukkan lewat textContent (bukan innerHTML),
// sehingga tidak bisa menyisipkan kode berbahaya.

const SPRITE = new URL('../../assets/icons/sprite.svg', import.meta.url).href;
const SVG_NS = 'http://www.w3.org/2000/svg';
// akar situs (folder public/), agar jalur relatif seperti assets/images/menu/ayam.jpg
// terbaca benar dari halaman mana pun (termasuk /admin/)
const SITE_ROOT = new URL('../../', import.meta.url).href;

/** h('div', { class: 'x', text: 'halo', onClick: fn }, anak1, anak2) */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Ikon dari sprite.svg */
export function icon(id, className = 'btn__icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#${id}`);
  svg.append(use);
  return svg;
}

/** Izinkan alamat gambar http(s) atau jalur relatif situs; selain itu dianggap tidak ada */
export function safeImageUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim(), SITE_ROOT);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}
