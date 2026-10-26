// services/order-service.js - validasi checkout, simpan pesanan ke Firestore,
// dan susun pesan WhatsApp.

import { formatRupiah } from '../core/formatters.js';
import { getFirebase } from './api.js';

const SAVE_TIMEOUT_MS = 15000;

/* ---------- validasi ---------- */

/** "+62 812-3456-7890" -> "081234567890" */
export function normalizePhone(value = '') {
  return String(value).replace(/[\s\-().]/g, '').replace(/^\+?62/, '0');
}

/** @returns {Record<string, string>} pesan error per kolom (kosong = valid) */
export function validateCheckout({ name = '', phone = '', note = '' }) {
  const errors = {};
  const cleanName = name.trim();

  if (cleanName.length < 2) errors.name = 'Nama minimal 2 huruf.';
  else if (cleanName.length > 60) errors.name = 'Nama maksimal 60 huruf.';

  if (!/^08[1-9]\d{6,11}$/.test(normalizePhone(phone))) {
    errors.phone = 'Masukkan nomor HP yang benar, contoh 081234567890.';
  }

  if (note.trim().length > 300) errors.note = 'Catatan maksimal 300 huruf.';
  return errors;
}

/* ---------- pesan WhatsApp ---------- */

export const orderCode = (id) => String(id).slice(0, 6).toUpperCase();

export function buildWhatsAppMessage({ storeName, code, name, phone, note, items, total }) {
  const lines = [`Halo ${storeName}, saya mau pesan:`, ''];
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.name} x${item.qty} = ${formatRupiah(item.price * item.qty)}`);
  });
  lines.push('', `Total: ${formatRupiah(total)}`, '', `Nama: ${name}`, `No. HP: ${phone}`);
  if (note) lines.push(`Catatan: ${note}`);
  lines.push('', `Kode pesanan: ${code}`);
  return lines.join('\n');
}

export function whatsappUrl(number, message) {
  return `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/* ---------- simpan pesanan ---------- */

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Simpan pesanan baru dengan status "menunggu".
 * orderId (opsional): pakai ulang ID dari percobaan sebelumnya yang gagal/timeout,
 * agar pengiriman ulang tidak membuat pesanan ganda.
 * Bila gagal, error membawa properti orderId untuk percobaan berikutnya.
 * @returns {Promise<{ id: string }>}
 */
export async function createOrder({ name, phone, note, items, total }, { orderId } = {}) {
  const { db, fs } = await getFirebase();
  const ref = orderId ? fs.doc(db, 'orders', orderId) : fs.doc(fs.collection(db, 'orders'));

  const payload = {
    customerName: name.trim(),
    phone: normalizePhone(phone),
    items: items.map(({ id, name: itemName, price, qty }) => ({ id, name: itemName, price, qty })),
    total,
    status: 'menunggu',
    createdAt: fs.serverTimestamp(),
  };
  if (note && note.trim()) payload.note = note.trim();

  try {
    await withTimeout(fs.setDoc(ref, payload), SAVE_TIMEOUT_MS);
    return { id: ref.id };
  } catch (error) {
    // percobaan ulang: bila pesanan ternyata sudah tersimpan, anggap berhasil
    if (orderId && error.code === 'permission-denied') {
      try {
        if ((await fs.getDoc(ref)).exists()) return { id: ref.id };
      } catch { /* abaikan, lempar error asli */ }
    }
    error.orderId = ref.id;
    throw error;
  }
}

/* ---------- pantau satu pesanan (halaman status pelanggan) ---------- */

const toDate = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate() : null);

function normalizeOrderDoc(id, d = {}) {
  return {
    id,
    customerName: String(d.customerName || ''),
    note: String(d.note || ''),
    items: Array.isArray(d.items)
      ? d.items.map((i) => ({
          name: String(i.name || ''), price: Number(i.price) || 0, qty: Number(i.qty) || 0,
        }))
      : [],
    total: Number(d.total) || 0,
    status: String(d.status || 'menunggu'),
    rejectReason: String(d.rejectReason || ''),
    createdAt: toDate(d.createdAt),
  };
}

/**
 * Pantau satu pesanan secara langsung.
 * onData(order | null): null = pesanan tidak ditemukan.
 * @returns {() => void}
 */
export function subscribeOrder(id, onData, onError) {
  let unsubscribe = () => {};
  let stopped = false;

  getFirebase()
    .then(({ db, fs }) => {
      if (stopped) return;
      unsubscribe = fs.onSnapshot(
        fs.doc(db, 'orders', id),
        (snap) => onData(snap.exists() ? normalizeOrderDoc(snap.id, snap.data({ serverTimestamps: 'estimate' })) : null),
        onError
      );
    })
    .catch(onError);

  return () => { stopped = true; unsubscribe(); };
}
