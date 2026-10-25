// pages/menu.js - halaman menu: daftar menu, filter, keranjang, ringkasan pesanan
import { bootCommon, initReveal, applyStoreInfo, applyWhatsAppLinks, applyStoreStatus } from '../core/app.js';
import { STORE } from '../core/config.js';
import { h, icon } from '../core/dom.js';
import { formatRupiah, categoryLabel } from '../core/formatters.js';
import { fetchMenu } from '../services/menu-service.js';
import { subscribeStore } from '../services/store-service.js';
import { cart, MAX_QTY } from '../components/cart.js';
import { createMenuCard, createSkeletonCard, flashAdded } from '../components/menu-card.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const state = {
  menu: [],
  category: 'semua',
  store: { ...STORE, isOpen: true, closedMessage: '' },
};

const grid = document.getElementById('menu-grid');
const filterBar = document.getElementById('filter-bar');
const banner = document.getElementById('store-banner');
const bannerText = document.getElementById('store-banner-text');
const cartBar = document.getElementById('cart-bar');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const isClosed = () => state.store.isOpen === false;

/* ---------------------------------------------------------
   Animasi kecil
   --------------------------------------------------------- */
function bump(el) {
  if (!el) return;
  el.classList.remove('is-bump');
  void el.offsetWidth; // mulai ulang animasi
  el.classList.add('is-bump');
  el.addEventListener('animationend', () => el.classList.remove('is-bump'), { once: true });
}

function flyToCart(fromEl) {
  const target = cartBar.querySelector('[data-cart-target]');
  if (reducedMotion.matches || !target || cartBar.hidden) return;

  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;

  const dot = h('span', { class: 'fly-dot', 'aria-hidden': 'true' });
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  dot.style.setProperty('--dx', `${to.left + to.width / 2 - startX}px`);
  dot.style.setProperty('--dy', `${to.top + to.height / 2 - startY}px`);

  dot.addEventListener('animationend', () => {
    dot.remove();
    bump(target);
  }, { once: true });
  document.body.append(dot);
  setTimeout(() => dot.remove(), 1000);
}

/* ---------------------------------------------------------
   Daftar menu
   --------------------------------------------------------- */
function renderSkeleton() {
  grid.setAttribute('aria-busy', 'true');
  grid.replaceChildren(...Array.from({ length: 4 }, createSkeletonCard));
}

function renderFilters() {
  const keys = ['semua', ...new Set(state.menu.map((m) => m.category))];
  filterBar.replaceChildren(
    ...keys.map((key) =>
      h('button', {
        class: `chip${key === state.category ? ' is-active' : ''}`,
        type: 'button',
        'aria-pressed': String(key === state.category),
        text: key === 'semua' ? 'Semua' : categoryLabel(key),
        onClick: () => {
          state.category = key;
          renderFilters();
          renderGrid();
        },
      })
    )
  );
}

function renderGrid() {
  const list = state.category === 'semua'
    ? state.menu
    : state.menu.filter((m) => m.category === state.category);

  grid.setAttribute('aria-busy', 'false');

  if (list.length === 0) {
    grid.replaceChildren(
      h('div', { class: 'empty-state', style: 'grid-column: 1 / -1' },
        icon('i-photo', 'empty-state__icon'),
        h('p', { text: 'Belum ada menu di kategori ini.' }))
    );
    return;
  }

  grid.replaceChildren(
    ...list.map((item, index) => {
      const card = createMenuCard(item, { closed: isClosed(), onAdd: handleAdd });
      card.style.setProperty('--i', String(index % 6));
      return card;
    })
  );
  initReveal(grid);
}

function handleAdd(item, button) {
  if (isClosed()) {
    showToast('Toko sedang tutup', { type: 'error' });
    return;
  }
  if (!cart.add(item)) {
    showToast(`Maksimal ${MAX_QTY} porsi per menu`);
    return;
  }
  flashAdded(button);
  flyToCart(button);
  if (navigator.vibrate) navigator.vibrate(12);
}

/* ---------------------------------------------------------
   Keranjang: header, bar bawah, dan ringkasan pesanan
   --------------------------------------------------------- */
let cartModal = null;

function updateCartUI({ count, total }, change) {
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.dataset.count = String(count);
    el.textContent = String(count);
    if (change.type === 'add') bump(el);
  });

  cartBar.hidden = count === 0;
  document.getElementById('cart-bar-count').textContent = `${count} item`;
  document.getElementById('cart-bar-total').textContent = formatRupiah(total);

  if (cartModal) renderCartModal();
}

function openCart() {
  if (cart.getState().count === 0) {
    showToast('Pesanan masih kosong. Pilih menu dulu, ya.');
    return;
  }
  cartModal = openModal({ title: 'Pesanan kamu', onClose: () => { cartModal = null; } });
  renderCartModal();
}

function orderLine(item) {
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

function renderCartModal() {
  if (!cartModal) return;
  const { items, count, total } = cart.getState();
  if (count === 0) {
    cartModal.close();
    return;
  }

  // jaga fokus tetap pada tombol yang baru ditekan setelah daftar digambar ulang
  const focusKey = document.activeElement?.dataset?.key;

  cartModal.body.replaceChildren(
    h('ul', { class: 'order-summary__list' }, items.map(orderLine)),
    h('div', { class: 'order-summary__row' },
      h('span', { text: 'Jumlah porsi' }),
      h('span', { text: String(count) })),
    h('div', { class: 'order-summary__row order-summary__row--total' },
      h('span', { text: 'Total' }),
      h('span', { class: 'order-summary__amount', text: formatRupiah(total) }))
  );

  const checkout = isClosed()
    ? h('button', { class: 'btn btn--lg btn--block', type: 'button', disabled: true, text: 'Toko sedang tutup' })
    : h('a', { class: 'btn btn--lg btn--block', href: 'checkout.html', text: 'Lanjut Checkout' });

  const clear = h('button', { class: 'btn btn--ghost btn--block', type: 'button', text: 'Kosongkan pesanan' });
  let armed = false;
  clear.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      clear.textContent = 'Yakin? Tekan lagi';
      setTimeout(() => { armed = false; clear.textContent = 'Kosongkan pesanan'; }, 2500);
      return;
    }
    cart.clear();
    showToast('Pesanan dikosongkan');
  });

  cartModal.footer.replaceChildren(checkout, clear);

  if (focusKey) {
    const again = [...cartModal.body.querySelectorAll('[data-key]')].find((n) => n.dataset.key === focusKey);
    if (again && !again.disabled) again.focus();
  }
}

/* ---------------------------------------------------------
   Status toko
   --------------------------------------------------------- */
function onStoreChange(store) {
  const wasClosed = isClosed();
  state.store = store;

  applyStoreInfo(store);
  applyWhatsAppLinks(store);
  applyStoreStatus(store);

  banner.hidden = !isClosed();
  bannerText.textContent = store.closedMessage;

  if (wasClosed !== isClosed() && state.menu.length) renderGrid();
  if (cartModal) renderCartModal();
}

/* ---------------------------------------------------------
   Mulai
   --------------------------------------------------------- */
async function init() {
  bootCommon();
  renderSkeleton();

  document.querySelectorAll('[data-open-cart]').forEach((btn) => btn.addEventListener('click', openCart));
  cart.subscribe(updateCartUI);
  subscribeStore(onStoreChange);

  const { items, source } = await fetchMenu();
  state.menu = items;

  if (source === 'firebase') {
    const { removed, repriced } = cart.sync(items);
    if (removed.length) showToast(`${removed.join(', ')} tidak tersedia lagi dan dihapus dari pesanan`, { duration: 4000 });
    else if (repriced.length) showToast('Harga di pesananmu sudah disesuaikan dengan menu terbaru', { duration: 4000 });
  }

  renderFilters();
  renderGrid();
}

init();
