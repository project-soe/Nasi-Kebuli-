// components/toast.js - pemberitahuan singkat
import { h } from '../core/dom.js';

const MAX_VISIBLE = 3;

/** @param {'info'|'success'|'error'} type */
export function showToast(message, { type = 'info', duration = 2600 } = {}) {
  const region = document.querySelector('.toast-region');
  if (!region) return;

  while (region.children.length >= MAX_VISIBLE) region.firstElementChild.remove();

  const modifier = type === 'success' ? ' toast--sukses' : type === 'error' ? ' toast--error' : '';
  const toast = h('div', { class: `toast${modifier}`, role: 'status', text: message });
  region.append(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 600); // cadangan bila animasi dimatikan
  }, duration);
}
