// services/menu-service.js - membaca menu dari Firestore (koleksi "menu")
// Bila Firestore belum siap/kosong, dipakai data contoh agar situs tetap tampil.

import { getFirebase } from './api.js';

export const SAMPLE_MENU = [
  { id: 'contoh-ayam-1', name: 'Nasi Kebuli Ayam', category: 'ayam', price: 35000,
    description: 'Nasi berempah dengan potongan ayam empuk, disajikan dengan acar dan sambal.', imageUrl: 'assets/images/menu/kebuli-ayam.jpg', available: true, featured: true, sortOrder: 1 },
  { id: 'contoh-ayam-2', name: 'Kebuli Ayam Jumbo', category: 'ayam', price: 45000,
    description: 'Porsi lebih besar dengan paha ayam utuh untuk yang benar-benar lapar.', imageUrl: 'assets/images/menu/kebuli-ayam.jpg', available: true, sortOrder: 2 },
  { id: 'contoh-kambing-1', name: 'Nasi Kebuli Kambing', category: 'kambing', price: 55000,
    description: 'Daging kambing empuk di atas nasi kebuli harum rempah pilihan.', imageUrl: 'assets/images/menu/kebuli-kambing.jpg', available: true, featured: true, sortOrder: 3 },
  { id: 'contoh-kambing-2', name: 'Kebuli Kambing Jumbo', category: 'kambing', price: 70000,
    description: 'Porsi besar daging kambing, cocok untuk dinikmati sepuasnya.', imageUrl: 'assets/images/menu/kebuli-kambing.jpg', available: true, sortOrder: 4 },
  { id: 'contoh-paket-1', name: 'Paket Keluarga', category: 'paket', price: 150000,
    description: 'Porsi besar untuk berbagi bersama keluarga, bisa pilih ayam atau kambing.', imageUrl: '', available: true, featured: true, sortOrder: 5 },
];

/** Rapikan dokumen dari database; kembalikan null bila datanya tidak layak */
function normalize(id, data = {}) {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const price = Number(data.price);
  if (!name || !Number.isFinite(price) || price <= 0) return null;
  return {
    id,
    name,
    category: String(data.category || 'lainnya').toLowerCase().trim(),
    price: Math.round(price),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '',
    available: data.available !== false,
    featured: data.featured === true,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 999,
  };
}

/** @returns {Promise<{ items: object[], source: 'firebase' | 'sample' }>} */
export async function fetchMenu() {
  try {
    const { db, fs } = await getFirebase();
    const snap = await fs.getDocs(fs.collection(db, 'menu'));
    const items = snap.docs
      .map((d) => normalize(d.id, d.data()))
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'id'));

    if (items.length === 0) return { items: SAMPLE_MENU, source: 'sample' };
    return { items, source: 'firebase' };
  } catch (error) {
    console.warn('[menu] Firestore belum bisa dibaca, memakai data contoh:', error);
    return { items: SAMPLE_MENU, source: 'sample' };
  }
}
