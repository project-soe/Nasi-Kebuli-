// components/modal.js - dialog (lembar dari bawah di HP, di tengah di desktop)
import { h } from '../core/dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
let current = null;

/**
 * @param {{ title: string, onClose?: () => void }} options
 * @returns {{ close: () => void, body: HTMLElement, footer: HTMLElement }}
 */
export function openModal({ title, onClose } = {}) {
  if (current) current.close();

  const previousFocus = document.activeElement;
  const titleId = `modal-title-${Date.now()}`;

  const closeButton = h('button', {
    class: 'modal__close', type: 'button', 'aria-label': 'Tutup', text: '\u00d7',
  });
  const body = h('div', { class: 'modal__body' });
  const footer = h('div', { class: 'modal__actions' });
  const backdrop = h('div', { class: 'modal__backdrop' });
  const panel = h(
    'div',
    { class: 'modal__panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
    h('div', { class: 'modal__head' }, h('h3', { id: titleId, text: title }), closeButton),
    body,
    footer
  );
  const root = h('div', { class: 'modal' }, backdrop, panel);

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    root.classList.add('is-closing');

    const finish = () => {
      root.remove();
      document.body.classList.remove('scroll-locked');
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      if (current && current.root === root) current = null;
      if (onClose) onClose();
    };
    panel.addEventListener('animationend', finish, { once: true });
    setTimeout(() => { if (root.isConnected) finish(); }, 350); // cadangan bila animasi dimatikan
  }

  function onKeydown(event) {
    if (event.key === 'Escape') return close();
    if (event.key !== 'Tab') return;
    const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter((n) => !n.hidden);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);

  document.body.append(root);
  document.body.classList.add('scroll-locked');
  panel.focus();

  current = { root, close };
  return { close, body, footer };
}
