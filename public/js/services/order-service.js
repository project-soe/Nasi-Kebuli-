// services/order-service.js - validasi checkout, simpan pesanan ke Firestore,
// susun pesan WhatsApp, dan pantau status pesanan.
//
// Satu pesanan = dua dokumen yang ditulis BERSAMAAN (satu batch):
//   orders/{id}       lengkap (nama, HP, catatan) - hanya admin yang bisa membaca
//   orderStatus/{id}  salinan publik tanpa data pribadi - dibaca pelanggan lewat ID
// Harga/total diperiksa ulang oleh aturan Firestore terhadap data menu.

import { formatRupiah } from '../core/formatters.js';
import { getFirebase } from './api.js';

const SAVE_TIMEOUT_MS = 15000;

/** Batas jenis menu berbeda per pesanan (selaras dengan firebase/firestore.rules) */
export const MAX_LINES = 6;

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
  const orderRef = orderId ? fs.doc(db, 'orders', orderId) : fs.doc(fs.collection(db, 'orders'));
  const statusRef = fs.doc(db, 'orderStatus', orderRef.id);

  // baris pesanan HARUS identik di kedua dokumen (diperiksa aturan Firestore)
  const lines = items.map(({ id, name: itemName, price, qty }) => ({ id, name: itemName, price, qty }));
  const createdAt = fs.serverTimestamp();

  const order = {
    customerName: name.trim(),
    phone: normalizePhone(phone),
    items: lines,
    total,
    status: 'menunggu',
    createdAt,
  };
  if (note && note.trim()) order.note = note.trim();

  const publicCopy = { items: lines, total, status: 'menunggu', createdAt };

  try {
    const batch = fs.writeBatch(db);
    batch.set(orderRef, order);
    batch.set(statusRef, publicCopy);
    await withTimeout(batch.commit(), SAVE_TIMEOUT_MS);
    return { id: orderRef.id };
  } catch (error) {
    // percobaan ulang: bila pesanan ternyata sudah tersimpan, anggap berhasil
    if (orderId && error.code === 'permission-denied') {
      try {
        if ((await fs.getDoc(statusRef)).exists()) return { id: orderRef.id };
      } catch { /* abaikan, lempar error asli */ }
    }
    error.orderId = orderRef.id;
    throw error;
  }
}

/* ---------- pantau status satu pesanan (halaman status pelanggan) ---------- */

const toDate = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate() : null);

function normalizeStatusDoc(id, d = {}) {
  return {
    id,
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
 * Pantau status satu pesanan secara langsung (dokumen publik orderStatus).
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
        fs.doc(db, 'orderStatus', id),
        (snap) => onData(snap.exists() ? normalizeStatusDoc(snap.id, snap.data({ serverTimestamps: 'estimate' })) : null),
        onError
      );
    })
    .catch(onError);

  return () => { stopped = true; unsubscribe(); };
}
