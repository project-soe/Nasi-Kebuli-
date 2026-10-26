// pages/home.js - halaman beranda
import { bootCommon, initReveal, applyStoreInfo, applyWhatsAppLinks, applyStoreStatus } from '../core/app.js';
import { fetchMenu } from '../services/menu-service.js';
import { subscribeStore } from '../services/store-service.js';
import { createMenuCard, createSkeletonCard } from '../components/menu-card.js';
import { cart } from '../components/cart.js';

const FEATURED_COUNT = 3;
const grid = document.getElementById('featured-grid');

bootCommon();

// nama, jam, WhatsApp, dan status buka/tutup mengikuti Firestore
subscribeStore((store) => {
  applyStoreInfo(store);
  applyWhatsAppLinks(store);
  applyStoreStatus(store);
});

// angka keranjang di header
cart.subscribe(({ count }) => {
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.dataset.count = String(count);
    el.textContent = String(count);
  });
});

/** Menu andalan: yang ditandai "featured"; bila belum ada, 3 menu tersedia pertama */
function pickFeatured(menu) {
  const available = menu.filter((m) => m.available);
  const marked = available.filter((m) => m.featured);
  return (marked.length ? marked : available).slice(0, FEATURED_COUNT);
}

async function renderFeatured() {
  grid.replaceChildren(...Array.from({ length: FEATURED_COUNT }, createSkeletonCard));

  const { items } = await fetchMenu();
  const featured = pickFeatured(items);
  grid.setAttribute('aria-busy', 'false');

  if (featured.length === 0) {
    grid.closest('.section').hidden = true; // belum ada menu: sembunyikan bagian ini
    return;
  }

  grid.replaceChildren(
    ...featured.map((item, index) => {
      const card = createMenuCard(item, { linkTo: 'menu.html' });
      card.style.setProperty('--i', String(index));
      return card;
    })
  );
  initReveal(grid);
}

renderFeatured();
