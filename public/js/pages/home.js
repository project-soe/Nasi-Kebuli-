// pages/home.js - halaman beranda
import { bootCommon, applyStoreInfo, applyWhatsAppLinks, applyStoreStatus } from '../core/app.js';
import { subscribeStore } from '../services/store-service.js';
import { cart } from '../components/cart.js';

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
