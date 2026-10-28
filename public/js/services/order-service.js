// services/order-service.js - validasi checkout, simpan pesanan ke Firestore,
// susun pesan WhatsApp, dan pantau status pesanan.
//
// Satu pesanan = dua dokumen yang ditulis BERSAMAAN (satu batch):
//   orders/{id}       lengkap (nama, HP, catatan) - hanya admin yang bisa membaca
//   orderStatus/{id}  salinan publik tanpa data pribadi - dibaca pelanggan lewat ID
// Harga/total diperiksa ulang oleh aturan Firestore terhadap data menu.

import { formatRupiah, paymentLabel } from '../core/formatters.js';
import { formatSchedule } from '../core/schedule.js';
import { getFirebase } from './api.js';

const SAVE_TIMEOUT_MS = 15000;

/** Batas jenis menu berbeda per pesanan (selaras dengan firebase/firestore.rules) */
export const MAX_LINES = 5;

/* ---------- validasi ---------- */

/** "+62 812-3456-7890" -> "081234567890" */
export function normalizePhone(value = '') {
  return String(value).replace(/[\s\-().]/g, '').replace(/^\+?62/, '0');
}

/** @returns {Record<string, string>} pesan error per kolom (kosong = valid) */
export function validateCheckout({ name = '', phone = '', note = '', fulfillment = 'ambil', address = '' }) {
  const errors = {};
  const cleanName = name.trim();

  if (cleanName.length < 2) errors.name = 'Nama minimal 2 huruf.';
  else if (cleanName.length > 60) errors.name = 'Nama maksimal 60 huruf.';

  if (!/^08[1-9]\d{6,11}$/.test(normalizePhone(phone))) {
    errors.phone = 'Masukkan nomor HP yang benar, contoh 081234567890.';
  }

  if (note.trim().length > 300) errors.note = 'Catatan maksimal 300 huruf.';

  if (fulfillment === 'antar') {
    const len = address.trim().length;
    if (len < 10) errors.address = 'Isi alamat lengkap (jalan, nomor, RT/RW, patokan), minimal 10 huruf.';
    else if (len > 200) errors.address = 'Alamat maksimal 200 huruf.';
  }
  return errors;
}

/* ---------- pesan WhatsApp ---------- */

export const orderCode = (id) => String(id).slice(0, 6).toUpperCase();

export function buildWhatsAppMessage({
  storeName, code, name, phone, note, items, total,
  fulfillment = 'ambil', address = '', deliveryFee = 0, paymentMethod = 'tunai', scheduledFor = null,
}) {
  const lines = [`Halo ${storeName}, saya mau pesan:`, ''];
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.name} x${item.qty} = ${formatRupiah(item.price * item.qty)}`);
  });

  if (fulfillment === 'antar') {
    lines.push('', `Ongkos kirim: ${deliveryFee > 0 ? formatRupiah(deliveryFee) : 'Gratis'}`);
  }
  lines.push('', `Total: ${formatRupiah(total)}`, '', `Nama: ${name}`, `No. HP: ${phone}`);
  lines.push(`Cara terima: ${fulfillment === 'antar' ? 'Diantar' : 'Ambil di tempat'}`);
  lines.push(`Jadwal: ${scheduledFor ? formatSchedule(scheduledFor) : 'Secepatnya'}`);
  if (fulfillment === 'antar' && address) lines.push(`Alamat: ${address}`);
  lines.push(`Pembayaran: ${paymentLabel(paymentMethod) || 'Tunai'}`);
  if (paymentMethod !== 'tunai') lines.push('Bukti pembayaran saya kirim setelah ini.');
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
export async function createOrder(
  { name, phone, note, items, total, fulfillment = 'ambil', address = '', deliveryFee = 0, paymentMethod = 'tunai', scheduledFor = null },
  { orderId } = {}
) {
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
    fulfillment,
    deliveryFee,
    paymentMethod,
    scheduledFor: scheduledFor || null,
    status: 'menunggu',
    createdAt,
  };
  if (note && note.trim()) order.note = note.trim();
  if (fulfillment === 'antar') order.address = address.trim();

  // alamat TIDAK ikut ke salinan publik
  const publicCopy = {
    items: lines, total, fulfillment, deliveryFee, paymentMethod,
    scheduledFor: scheduledFor || null, status: 'menunggu', createdAt,
  };

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

/* ---------- diagnosa: kenapa server menolak? ---------- */

/**
 * Dijalankan SETELAH server menolak pesanan (permission-denied). Membaca menu dan pengaturan
 * toko (keduanya publik) lalu mencocokkannya dengan pesanan, meniru pemeriksaan aturan Firestore.
 * @returns {Promise<string[]>} daftar penyebab dalam bahasa Indonesia (kosong = tidak ketemu)
 */
export async function diagnoseDenied({
  items, total, fulfillment, deliveryFee, paymentMethod,
  name = '', phone = '', note = '', address = '', scheduledFor = null,
}) {
  const reasons = [];

  // ---- data pemesan (meniru aturan di firestore.rules) ----
  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 60) reasons.push('Nama harus 2-60 huruf.');
  if (!/^08[1-9][0-9]{6,11}$/.test(normalizePhone(phone))) reasons.push('Format nomor HP tidak diterima server (harus 08xxxxxxxxxx).');
  if (String(note).trim().length > 300) reasons.push('Catatan lebih dari 300 huruf.');
  if (fulfillment === 'antar' && (address.trim().length < 10 || address.trim().length > 200)) {
    reasons.push('Alamat harus 10-200 huruf.');
  }
  if (total > 10000000) reasons.push('Total melebihi batas Rp 10.000.000 per pesanan.');
  if (scheduledFor) {
    if (scheduledFor.getTime() <= Date.now()) reasons.push('Jadwal yang dipilih sudah lewat. Pilih jam yang lebih akhir.');
    if (scheduledFor.getTime() > Date.now() + 60 * 24 * 3600 * 1000) reasons.push('Jadwal terlalu jauh (maksimal 60 hari).');
  }

  try {
    const { db, fs } = await getFirebase();

    if (items.length > MAX_LINES) {
      reasons.push(`Maksimal ${MAX_LINES} jenis menu per pesanan.`);
    }

    // ---- pengaturan toko ----
    const storeSnap = await fs.getDoc(fs.doc(db, 'settings', 'store'));
    if (!storeSnap.exists()) {
      if (deliveryFee !== 0 || paymentMethod !== 'tunai') {
        reasons.push('Pengaturan toko belum tersimpan di database. Buka Admin > Toko, lalu tekan Simpan pengaturan.');
      }
    } else {
      const st = storeSnap.data();
      if (st.isOpen === false && !(scheduledFor && st.preorderWhenClosed === true)) {
        reasons.push(scheduledFor ? 'Toko sedang tutup dan tidak menerima pesanan terjadwal saat tutup.' : 'Toko sedang tutup.');
      }
      if (fulfillment === 'antar' && st.deliveryEnabled === false) reasons.push('Pengantaran sedang dinonaktifkan penjual.');
      if (fulfillment === 'ambil' && st.pickupEnabled === false) reasons.push('Ambil di tempat sedang dinonaktifkan penjual.');

      const expectedFee = fulfillment === 'antar' ? st.deliveryFee ?? 0 : 0;
      if (typeof expectedFee !== 'number') {
        reasons.push('Ongkos kirim di pengaturan toko tersimpan bukan sebagai angka. Simpan ulang di Admin > Toko.');
      } else if (deliveryFee !== expectedFee) {
        reasons.push(`Ongkos kirim sekarang ${formatRupiah(expectedFee)}, bukan ${formatRupiah(deliveryFee)}.`);
      }

      const methodOk = paymentMethod === 'tunai' ? st.paymentCash !== false
        : paymentMethod === 'transfer' ? st.paymentTransfer === true
        : st.paymentQris === true;
      if (!methodOk) reasons.push(`Pembayaran ${paymentLabel(paymentMethod)} sedang tidak diaktifkan penjual.`);
    }

    // ---- baris pesanan ----
    let sum = 0;
    for (const item of items) {
      sum += item.price * item.qty;
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(item.id))) {
        reasons.push(`ID dokumen menu "${item.name}" (${item.id}) berisi karakter yang tidak diizinkan aturan (hanya huruf, angka, _ dan -). Buat ulang menu itu lewat Admin > Menu.`);
      }
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) {
        reasons.push(`Jumlah "${item.name}" harus 1-20.`);
      }
      const snap = await fs.getDoc(fs.doc(db, 'menu', item.id));
      if (!snap.exists()) {
        reasons.push(`Menu "${item.name}" tidak ada di database (mungkin masih menu contoh). Hapus dari pesanan atau isi menu di Admin.`);
        continue;
      }
      const m = snap.data();
      if (m.available === false) reasons.push(`Menu "${item.name}" sedang habis.`);
      if (typeof m.price !== 'number' || !Number.isInteger(m.price)) {
        reasons.push(`Harga menu "${item.name}" di database bukan bilangan bulat bertipe angka. Ubah lewat Admin > Menu.`);
      } else if (m.price !== item.price) {
        reasons.push(`Harga "${item.name}" sekarang ${formatRupiah(m.price)}, bukan ${formatRupiah(item.price)}.`);
      }
      if (m.name !== item.name) {
        reasons.push(`Nama menu "${item.name}" di database berbeda ("${m.name}"). Simpan ulang menu itu di Admin.`);
      }
    }

    if (sum + deliveryFee !== total) reasons.push('Total pesanan tidak sama dengan jumlah semua baris.');
  } catch (error) {
    reasons.push(`Penyebab tidak bisa diperiksa (${error?.code || error?.message || 'error'}).`);
  }
  return reasons;
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
    fulfillment: d.fulfillment === 'antar' ? 'antar' : d.fulfillment === 'ambil' ? 'ambil' : '',
    deliveryFee: Number(d.deliveryFee) || 0,
    paymentMethod: ['tunai', 'transfer', 'qris'].includes(d.paymentMethod) ? d.paymentMethod : '',
    paid: d.paid === true,
    scheduledFor: toDate(d.scheduledFor),
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
