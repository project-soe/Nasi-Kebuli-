// services/admin-service.js - operasi khusus admin (pesanan, menu, pengaturan toko)
// Semua tulis ke Firestore dijaga oleh firestore.rules (hanya akun admin).

import { getFirebase } from './api.js';
import { SAMPLE_MENU } from './menu-service.js';

const toDate = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate() : null);

/* ======================= PESANAN ======================= */

export function normalizeOrder(id, d = {}) {
  return {
    id,
    customerName: String(d.customerName || ''),
    phone: String(d.phone || ''),
    note: String(d.note || ''),
    items: Array.isArray(d.items)
      ? d.items.map((i) => ({
          id: String(i.id || ''), name: String(i.name || ''),
          price: Number(i.price) || 0, qty: Number(i.qty) || 0,
        }))
      : [],
    total: Number(d.total) || 0,
    fulfillment: d.fulfillment === 'antar' ? 'antar' : d.fulfillment === 'ambil' ? 'ambil' : '',
    address: String(d.address || ''),
    deliveryFee: Number(d.deliveryFee) || 0,
    paymentMethod: ['tunai', 'transfer', 'qris'].includes(d.paymentMethod) ? d.paymentMethod : '',
    paid: d.paid === true,
    scheduledFor: toDate(d.scheduledFor),
    status: String(d.status || 'menunggu'),
    createdAt: toDate(d.createdAt),
    rejectReason: String(d.rejectReason || ''),
  };
}

/**
 * Pantau 100 pesanan terbaru secara langsung.
 * onData(orders, newOrders): newOrders = pesanan yang baru masuk setelah pemuatan pertama.
 * @returns {() => void}
 */
export function subscribeOrders(onData, onError) {
  let unsubscribe = () => {};
  let stopped = false;
  let first = true;
  const opts = { serverTimestamps: 'estimate' };

  getFirebase()
    .then(({ db, fs }) => {
      if (stopped) return;
      const q = fs.query(fs.collection(db, 'orders'), fs.orderBy('createdAt', 'desc'), fs.limit(100));
      unsubscribe = fs.onSnapshot(q, (snap) => {
        const orders = snap.docs.map((d) => normalizeOrder(d.id, d.data(opts)));
        const added = first
          ? []
          : snap.docChanges()
              .filter((c) => c.type === 'added' && !c.doc.metadata.hasPendingWrites)
              .map((c) => normalizeOrder(c.doc.id, c.doc.data(opts)));
        first = false;
        onData(orders, added);
      }, onError);
    })
    .catch(onError);

  return () => { stopped = true; unsubscribe(); };
}

/**
 * Salinan publik pesanan (tanpa data pribadi). Dipakai dengan merge, sehingga juga
 * melengkapi pesanan lama yang belum punya dokumen orderStatus.
 */
function publicCopyOf(order, extra = {}) {
  const copy = {
    status: order.status,
    items: order.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
    total: order.total,
    ...extra,
  };
  if (order.createdAt instanceof Date) copy.createdAt = order.createdAt;
  if (order.fulfillment) {
    copy.fulfillment = order.fulfillment;
    copy.deliveryFee = order.deliveryFee;
  }
  if (order.paymentMethod) copy.paymentMethod = order.paymentMethod;
  copy.scheduledFor = order.scheduledFor || null;
  return copy;
}

/** Ubah status di pesanan lengkap + salinan publik + riwayat, dalam satu transaksi */
export async function updateOrderStatus(order, status, { reason = '', by = '' } = {}) {
  const { db, fs } = await getFirebase();
  const ref = fs.doc(db, 'orders', order.id);
  const batch = fs.writeBatch(db);

  const patch = { status };
  if (status === 'ditolak' && reason) patch.rejectReason = reason;
  batch.update(ref, patch);

  const extra = { status };
  if (status === 'ditolak') extra.rejectReason = reason || '';
  batch.set(fs.doc(db, 'orderStatus', order.id), publicCopyOf(order, extra), { merge: true });

  const entry = { from: order.status, to: status, by, at: fs.serverTimestamp() };
  if (reason) entry.reason = reason;
  batch.set(fs.doc(fs.collection(ref, 'history')), entry);

  await batch.commit();
}

/** Tandai pesanan lunas / belum lunas (pesanan lengkap + salinan publik) */
export async function setOrderPaid(order, paid, { by = '' } = {}) {
  const { db, fs } = await getFirebase();
  const ref = fs.doc(db, 'orders', order.id);
  const batch = fs.writeBatch(db);

  batch.update(ref, { paid });
  batch.set(fs.doc(db, 'orderStatus', order.id), publicCopyOf(order, { paid }), { merge: true });
  batch.set(fs.doc(fs.collection(ref, 'history')), {
    from: order.status, to: order.status, by, at: fs.serverTimestamp(),
    reason: paid ? 'Ditandai lunas' : 'Tanda lunas dibatalkan',
  });

  await batch.commit();
}

/* ======================= MENU ======================= */

export function subscribeMenuAll(onData, onError) {
  let unsubscribe = () => {};
  let stopped = false;

  getFirebase()
    .then(({ db, fs }) => {
      if (stopped) return;
      unsubscribe = fs.onSnapshot(fs.collection(db, 'menu'), (snap) => {
        const items = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              name: String(x.name || ''),
              category: String(x.category || 'lainnya'),
              price: Number(x.price) || 0,
              description: String(x.description || ''),
              imageUrl: String(x.imageUrl || ''),
              available: x.available !== false,
              featured: x.featured === true,
              sortOrder: Number.isFinite(Number(x.sortOrder)) ? Number(x.sortOrder) : 999,
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'id'));
        onData(items);
      }, onError);
    })
    .catch(onError);

  return () => { stopped = true; unsubscribe(); };
}

/** id kosong = menu baru */
export async function saveMenuItem(id, data) {
  const { db, fs } = await getFirebase();
  if (id) await fs.setDoc(fs.doc(db, 'menu', id), data);
  else await fs.addDoc(fs.collection(db, 'menu'), data);
}

export async function setMenuAvailable(id, available) {
  const { db, fs } = await getFirebase();
  await fs.updateDoc(fs.doc(db, 'menu', id), { available });
}

export async function deleteMenuItem(id) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'menu', id));
}

/** Isi menu contoh ke Firestore (untuk pemakaian pertama) */
export async function seedSampleMenu() {
  const { db, fs } = await getFirebase();
  const batch = fs.writeBatch(db);
  SAMPLE_MENU.forEach(({ id, ...data }) => {
    batch.set(fs.doc(db, 'menu', id.replace(/^contoh-/, '')), data);
  });
  await batch.commit();
}

/* ======================= TOKO ======================= */

export async function saveStoreSettings(data) {
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, 'settings', 'store'), data, { merge: true });
}

export const setStoreOpen = (isOpen) => saveStoreSettings({ isOpen });
