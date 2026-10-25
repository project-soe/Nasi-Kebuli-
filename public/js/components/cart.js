// components/cart.js - keranjang belanja (disimpan di perangkat pengunjung)
// Hanya menyimpan: id, nama, harga, jumlah. Harga final tetap diperiksa
// pemilik saat pesanan masuk.

const STORAGE_KEY = 'kebuli.cart.v1';
export const MAX_QTY = 20;

const listeners = new Set();
let items = load();

function isValid(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    Number.isInteger(item.qty) &&
    item.qty > 0
  );
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(isValid).map((i) => ({ ...i, qty: Math.min(i.qty, MAX_QTY) }))
      : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* penyimpanan penuh / mode privat: keranjang tetap jalan di memori */
  }
}

function getState() {
  return {
    items: items.map((i) => ({ ...i })),
    count: items.reduce((sum, i) => sum + i.qty, 0),
    total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
  };
}

function emit(change = { type: 'update' }) {
  save();
  const state = getState();
  listeners.forEach((fn) => fn(state, change));
}

export const cart = {
  getState,

  /** Tambah 1 porsi. false bila sudah mencapai batas. */
  add(menuItem) {
    const found = items.find((i) => i.id === menuItem.id);
    if (found) {
      if (found.qty >= MAX_QTY) return false;
      found.qty += 1;
    } else {
      items.push({ id: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 });
    }
    emit({ type: 'add', id: menuItem.id });
    return true;
  },

  setQty(id, qty) {
    const found = items.find((i) => i.id === id);
    if (!found) return;
    const next = Math.min(Math.floor(qty), MAX_QTY);
    if (next <= 0) return this.remove(id);
    found.qty = next;
    emit({ type: 'update', id });
  },

  remove(id) {
    items = items.filter((i) => i.id !== id);
    emit({ type: 'remove', id });
  },

  clear() {
    items = [];
    emit({ type: 'clear' });
  },

  /**
   * Samakan keranjang dengan menu terbaru (harga berubah / menu habis).
   * @returns {{ removed: string[], repriced: string[] }}
   */
  sync(menu) {
    const byId = new Map(menu.map((m) => [m.id, m]));
    const removed = [];
    const repriced = [];

    items = items.filter((i) => {
      const m = byId.get(i.id);
      if (!m || !m.available) {
        removed.push(i.name);
        return false;
      }
      if (m.price !== i.price) repriced.push(m.name);
      i.name = m.name;
      i.price = m.price;
      return true;
    });

    if (removed.length || repriced.length) emit({ type: 'sync' });
    return { removed, repriced };
  },

  /** Daftarkan pendengar; langsung dipanggil sekali dengan keadaan saat ini. */
  subscribe(fn) {
    listeners.add(fn);
    fn(getState(), { type: 'init' });
    return () => listeners.delete(fn);
  },
};

// sinkron antar tab browser
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    items = load();
    const state = getState();
    listeners.forEach((fn) => fn(state, { type: 'external' }));
  }
});
