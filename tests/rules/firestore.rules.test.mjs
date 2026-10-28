// Tes otomatis untuk firebase/firestore.rules memakai Firebase Emulator.
// Dijalankan: npm run test:rules (di GitHub Actions: lihat .github/workflows/ci.yml)
//
// Tujuan utama: memastikan pesanan yang SAH diterima, dan semua upaya curang
// (harga murah, total palsu, nama tertukar, ongkir palsu, dsb.) DITOLAK.

import { describe, it, before, beforeEach, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, writeBatch, serverTimestamp,
} from 'firebase/firestore';

const RULES = readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8');

/* ---------------- data awal ---------------- */

const MENU = {
  'ayam-1':    { name: 'Nasi Kebuli Ayam',     price: 35000,  available: true },
  'kambing-1': { name: 'Nasi Kebuli Kambing',  price: 55000,  available: true },
  'paket-1':   { name: 'Paket Keluarga',       price: 150000, available: true },
  'minum-1':   { name: 'Es Teh',               price: 5000,   available: true },
  'acar-1':    { name: 'Acar Segar',           price: 8000,   available: true },
  'sambal-1':  { name: 'Sambal Tambahan',      price: 3000,   available: true },
  'extra-1':   { name: 'Kerupuk',              price: 2000,   available: true },
};

const STORE = {
  name: 'Toko Uji',
  isOpen: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFee: 5000,
  paymentCash: true,
  paymentTransfer: true,
  paymentQris: false,
};

let env;

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-kebuli', firestore: { rules: RULES } });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [id, data] of Object.entries(MENU)) await setDoc(doc(db, 'menu', id), data);
    await setDoc(doc(db, 'settings', 'store'), STORE);
    await setDoc(doc(db, 'admins', 'admin1'), { role: 'admin' });
  });
});

/* ---------------- pembantu ---------------- */

const customer = () => env.unauthenticatedContext().firestore();
const admin = () => env.authenticatedContext('admin1').firestore();
const stranger = () => env.authenticatedContext('orang-lain').firestore();

/** Satu baris pesanan yang cocok dengan menu */
function line(menuId, qty = 1) {
  const m = MENU[menuId];
  return { id: menuId, name: m.name, price: m.price, qty };
}

/** Pesanan sah (dan salinan publiknya). Ubah isinya di tiap tes untuk menguji penolakan. */
function makeOrder({
  items = [line('ayam-1', 2)], fulfillment = 'ambil', paymentMethod = 'tunai', scheduledFor = null,
} = {}) {
  const deliveryFee = fulfillment === 'antar' ? STORE.deliveryFee : 0;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const createdAt = serverTimestamp();
  const total = subtotal + deliveryFee;

  const order = {
    customerName: 'Budi',
    phone: '081234567890',
    items,
    total,
    fulfillment,
    deliveryFee,
    paymentMethod,
    scheduledFor,
    status: 'menunggu',
    createdAt,
  };
  if (fulfillment === 'antar') order.address = 'Jl. Merdeka No. 10, RT 01';

  const publicCopy = {
    items, total, fulfillment, deliveryFee, paymentMethod, scheduledFor, status: 'menunggu', createdAt,
  };
  return { order, publicCopy };
}

/** Waktu mendatang (jam dari sekarang) untuk pesanan terjadwal */
const inHours = (h) => new Date(Date.now() + h * 3600 * 1000);

let counter = 0;
const newId = () => `pesanan${++counter}abcdefghij`;

/** Tulis pesanan + salinan publik dalam satu batch, seperti yang dilakukan checkout */
function place(db, id, { order, publicCopy }, { skipStatus = false, skipOrder = false } = {}) {
  const batch = writeBatch(db);
  if (!skipOrder) batch.set(doc(db, 'orders', id), order);
  if (!skipStatus) batch.set(doc(db, 'orderStatus', id), publicCopy);
  return batch.commit();
}

/** Ubah total di kedua dokumen sekaligus */
function setTotal(o, total) {
  o.order.total = total;
  o.publicCopy.total = total;
}

/**
 * Tes negatif yang bermakna: pesanan dasar TANPA manipulasi harus DITERIMA (kontrol), lalu
 * versi yang dimanipulasi harus DITOLAK. Dengan begitu penolakan pasti berasal dari
 * manipulasinya, bukan dari hal lain (mis. batas ekspresi atau kesalahan pada pesanan dasar).
 */
async function expectRejected(mutate, orderOpts = {}, placeOpts = {}) {
  await assertSucceeds(place(customer(), newId(), makeOrder(orderOpts)));
  const manipulated = makeOrder(orderOpts);
  mutate(manipulated);
  await assertFails(place(customer(), newId(), manipulated, placeOpts));
}

/** Sama, tetapi yang berubah adalah keadaan database (toko tutup, menu habis, dst.) */
async function expectRejectedAfter(changeState, orderOpts = {}) {
  await assertSucceeds(place(customer(), newId(), makeOrder(orderOpts)));
  await changeState();
  await assertFails(place(customer(), newId(), makeOrder(orderOpts)));
}

const seedStore = (patch) => env.withSecurityRulesDisabled((ctx) =>
  setDoc(doc(ctx.firestore(), 'settings', 'store'), { ...STORE, ...patch }));

/* ---------------- pesanan sah diterima ---------------- */

describe('pesanan sah DITERIMA', () => {
  it('ambil di tempat + tunai', async () => {
    await assertSucceeds(place(customer(), newId(), makeOrder()));
  });

  it('diantar: ongkir sesuai pengaturan + alamat', async () => {
    await assertSucceeds(place(customer(), newId(), makeOrder({ fulfillment: 'antar' })));
  });

  it('dengan catatan', async () => {
    const o = makeOrder();
    o.order.note = 'Sambal dipisah';
    await assertSucceeds(place(customer(), newId(), o));
  });

  it('transfer (diaktifkan toko)', async () => {
    await assertSucceeds(place(customer(), newId(), makeOrder({ paymentMethod: 'transfer' })));
  });

  it('QRIS setelah diaktifkan toko', async () => {
    await seedStore({ paymentQris: true });
    await assertSucceeds(place(customer(), newId(), makeOrder({ paymentMethod: 'qris' })));
  });

  // Jumlah baris 1..5: pastikan batas 1.000 ekspresi / 10 pembacaan dokumen tidak terlewati
  const DISTINCT = ['ayam-1', 'kambing-1', 'paket-1', 'minum-1', 'acar-1'];
  for (let n = 1; n <= 5; n += 1) {
    it(`${n} jenis menu berbeda`, async () => {
      const items = DISTINCT.slice(0, n).map((id) => line(id, 2));
      await assertSucceeds(place(customer(), newId(), makeOrder({ items })));
    });
  }

  it('KASUS TERBERAT: 5 jenis menu + diantar + transfer + catatan', async () => {
    const items = DISTINCT.map((id) => line(id, 3));
    const o = makeOrder({ items, fulfillment: 'antar', paymentMethod: 'transfer' });
    o.order.note = 'Tolong sambal dipisah dan diantar sebelum jam 12';
    await assertSucceeds(place(customer(), newId(), o));
  });

  it('KASUS TERBERAT + TERJADWAL: 5 jenis menu + diantar + transfer + catatan + jadwal', async () => {
    const items = DISTINCT.map((id) => line(id, 3));
    const when = inHours(30);
    const o = makeOrder({ items, fulfillment: 'antar', paymentMethod: 'transfer', scheduledFor: when });
    o.order.note = 'Tolong sambal dipisah dan diantar sebelum jam 12';
    await assertSucceeds(place(customer(), newId(), o));
  });

  it('pengaturan toko belum dibuat: tunai + ambil tetap diterima', async () => {
    await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'settings', 'store')));
    await assertSucceeds(place(customer(), newId(), makeOrder()));
  });
});

/* ---------------- batas jumlah baris ---------------- */

describe('batas 5 jenis menu', () => {
  const SIX = ['ayam-1', 'kambing-1', 'paket-1', 'minum-1', 'acar-1', 'sambal-1'];

  it('5 jenis menu berbeda DITERIMA, tetapi 6 jenis menu berbeda DITOLAK', async () => {
    await assertSucceeds(place(customer(), newId(), makeOrder({ items: SIX.slice(0, 5).map((id) => line(id, 1)) })));
    await assertFails(place(customer(), newId(), makeOrder({ items: SIX.map((id) => line(id, 1)) })));
  });

  it('6 baris yang semuanya sah dan jumlahnya cocok tetap DITOLAK (bukan karena data salah)', async () => {
    const o = makeOrder({ items: SIX.map((id) => line(id, 1)), fulfillment: 'antar', paymentMethod: 'transfer' });
    await assertFails(place(customer(), newId(), o));
  });

  it('7 baris DITOLAK', async () => {
    const items = [...SIX, 'extra-1'].map((id) => line(id, 1));
    await assertFails(place(customer(), newId(), makeOrder({ items })));
  });
});

/* ---------------- kecurangan harga ---------------- */

describe('kecurangan harga/jumlah DITOLAK', () => {
  const cases = {
    'harga lebih murah dari menu (total ikut dipalsukan)': (o) => {
      o.order.items[0].price = 1000;
      setTotal(o, 2000);
    },
    'total lebih kecil dari jumlah baris': (o) => setTotal(o, 1000),
    'total lebih besar dari jumlah baris': (o) => setTotal(o, o.order.total + 1000),
    'nama menu mahal dipasang di id menu murah': (o) => { o.order.items[0].name = 'Paket Keluarga'; },
    'nama menu tidak sama dengan database': (o) => { o.order.items[0].name = 'Nasi Kebuli Ayam Spesial'; },
    'jumlah (qty) 21': (o) => { o.order.items[0].qty = 21; setTotal(o, 35000 * 21); },
    'jumlah (qty) pecahan': (o) => { o.order.items[0].qty = 1.5; setTotal(o, 52500); },
    'jumlah (qty) negatif': (o) => { o.order.items[0].qty = -1; setTotal(o, 35000 * -1); },
    'id menu tidak ada': (o) => { o.order.items[0].id = 'tidak-ada'; },
    'id menu berisi karakter terlarang': (o) => { o.order.items[0].id = 'ayam 1'; },
    'baris berisi field tambahan': (o) => { o.order.items[0].diskon = 100; },
    'baris kekurangan field': (o) => { delete o.order.items[0].name; },
    'total melebihi Rp 10 juta': (o) => {
      o.order.items.length = 0;
      for (let i = 0; i < 4; i += 1) o.order.items.push(line('paket-1', 20));
      setTotal(o, 150000 * 20 * 4);
    },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    it(name, () => expectRejected(mutate));
  }

  it('qty 0 di salah satu baris', () => expectRejected((o) => {
    o.order.items.length = 0;
    o.order.items.push(line('ayam-1', 0), line('kambing-1', 1));
    setTotal(o, 55000);
  }));

  it('menu sedang habis (available: false)', () => expectRejectedAfter(() =>
    env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], available: false }))));

  it('menu dihapus dari database', () => expectRejectedAfter(() =>
    env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'menu', 'ayam-1')))));

  it('harga menu naik setelah pelanggan menambah ke keranjang', () => expectRejectedAfter(() =>
    env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], price: 40000 }))));

  it('harga menu di database bertipe teks', () => expectRejectedAfter(() =>
    env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], price: '35000' }))));
});

/* ---------------- pengaturan toko, ongkir, pembayaran ---------------- */

describe('pengaturan toko DITEGAKKAN', () => {
  it('toko tutup', () => expectRejectedAfter(() => seedStore({ isOpen: false })));

  it('ongkir diakali (0) padahal toko menetapkan 5000', () => expectRejected((o) => {
    o.order.deliveryFee = 0;
    o.publicCopy.deliveryFee = 0;
    setTotal(o, o.order.total - 5000);
  }, { fulfillment: 'antar' }));

  it('ongkir dikenakan pada pesanan ambil di tempat', () => expectRejected((o) => {
    o.order.deliveryFee = 5000;
    o.publicCopy.deliveryFee = 5000;
    setTotal(o, o.order.total + 5000);
  }));

  it('ongkir berubah di pengaturan setelah pelanggan menghitung', () => expectRejectedAfter(
    () => seedStore({ deliveryFee: 9000 }), { fulfillment: 'antar' }));

  it('pengantaran dinonaktifkan', () => expectRejectedAfter(
    () => seedStore({ deliveryEnabled: false }), { fulfillment: 'antar' }));

  it('ambil di tempat dinonaktifkan', () => expectRejectedAfter(() => seedStore({ pickupEnabled: false })));

  it('QRIS dipilih padahal dimatikan', async () => {
    await seedStore({ paymentQris: true });
    await assertSucceeds(place(customer(), newId(), makeOrder({ paymentMethod: 'qris' }))); // kontrol
    await seedStore({ paymentQris: false });
    await assertFails(place(customer(), newId(), makeOrder({ paymentMethod: 'qris' })));
  });

  it('transfer dipilih padahal dimatikan', () => expectRejectedAfter(
    () => seedStore({ paymentTransfer: false }), { paymentMethod: 'transfer' }));

  it('tunai dimatikan', () => expectRejectedAfter(() => seedStore({ paymentCash: false })));

  it('metode bayar tidak dikenal (walau QRIS aktif)', async () => {
    await seedStore({ paymentQris: true });
    await expectRejected((o) => {
      o.order.paymentMethod = 'bitcoin';
      o.publicCopy.paymentMethod = 'bitcoin';
    });
  });

  it('pengaturan toko belum dibuat: transfer ditolak', () => expectRejectedAfter(() =>
    env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), 'settings', 'store'))),
    { paymentMethod: 'transfer' }));
});

/* ---------------- jadwal ambil/antar (pre-order) ---------------- */

describe('jadwal pre-order', () => {
  it('pesanan terjadwal 1 hari lagi DITERIMA', async () => {
    await assertSucceeds(place(customer(), newId(), makeOrder({ scheduledFor: inHours(24) })));
  });

  it('jadwal di masa lalu DITOLAK', () => expectRejected((o) => {
    const past = inHours(-2);
    o.order.scheduledFor = past;
    o.publicCopy.scheduledFor = past;
  }));

  it('jadwal lebih dari 60 hari DITOLAK', () => expectRejected((o) => {
    const far = inHours(24 * 61);
    o.order.scheduledFor = far;
    o.publicCopy.scheduledFor = far;
  }));

  it('jadwal bukan stempel waktu (teks) DITOLAK', () => expectRejected((o) => {
    o.order.scheduledFor = '2030-01-01';
    o.publicCopy.scheduledFor = '2030-01-01';
  }));

  it('jadwal di salinan publik berbeda dari pesanan DITOLAK', () => expectRejected((o) => {
    o.publicCopy.scheduledFor = inHours(48);
  }, { scheduledFor: inHours(24) }));

  it('toko tutup + pesanan terjadwal DITERIMA bila pemilik mengizinkan pre-order saat tutup', async () => {
    await seedStore({ isOpen: false, preorderWhenClosed: true });
    await assertSucceeds(place(customer(), newId(), makeOrder({ scheduledFor: inHours(24) })));
  });

  it('toko tutup + pesanan terjadwal DITOLAK bila pemilik tidak mengizinkan', () => expectRejectedAfter(
    () => seedStore({ isOpen: false, preorderWhenClosed: false }), { scheduledFor: inHours(24) }));

  it('toko tutup + pesanan secepatnya tetap DITOLAK walau pre-order saat tutup diizinkan', async () => {
    await seedStore({ isOpen: false, preorderWhenClosed: true });
    await assertFails(place(customer(), newId(), makeOrder()));
  });
});

/* ---------------- bentuk dan isi data pemesan ---------------- */

describe('data pemesan divalidasi', () => {
  const cases = {
    'nomor HP salah format': (o) => { o.order.phone = '12345678'; },
    'nama terlalu pendek': (o) => { o.order.customerName = 'A'; },
    'nama terlalu panjang': (o) => { o.order.customerName = 'x'.repeat(61); },
    'catatan lebih dari 300 huruf': (o) => { o.order.note = 'x'.repeat(301); },
    'alamat wajib bila diantar': (o) => { delete o.order.address; },
    'alamat terlalu pendek': (o) => { o.order.address = 'Jl. 1'; },
    'field tambahan di pesanan (paid)': (o) => { o.order.paid = true; },
    'status awal bukan menunggu': (o) => { o.order.status = 'selesai'; o.publicCopy.status = 'selesai'; },
    'createdAt dari jam perangkat, bukan server': (o) => {
      const now = new Date();
      o.order.createdAt = now;
      o.publicCopy.createdAt = now;
    },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    it(`${name} DITOLAK`, () => expectRejected(mutate, { fulfillment: 'antar' }));
  }

  it('alamat pada pesanan ambil di tempat DITOLAK', () => expectRejected((o) => {
    o.order.address = 'Jl. Merdeka No. 10, RT 01';
  }));
});

/* ---------------- salinan publik orderStatus ---------------- */

describe('salinan publik harus sesuai pesanan', () => {
  it('tanpa dokumen orderStatus DITOLAK', () => expectRejected(() => {}, {}, { skipStatus: true }));

  it('orderStatus tanpa pesanan DITOLAK', () => expectRejected(() => {}, {}, { skipOrder: true }));

  it('total di salinan publik berbeda DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, total: 1 };
  }));

  it('isi baris di salinan publik berbeda DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, items: [line('minum-1', 1)] };
  }));

  it('cara terima di salinan publik berbeda DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, fulfillment: 'antar' };
  }));

  it('metode bayar di salinan publik berbeda DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, paymentMethod: 'transfer' };
  }));

  it('salinan publik memuat data pribadi DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, phone: '081234567890' };
  }));

  it('salinan publik sudah berstatus lunas DITOLAK', () => expectRejected((o) => {
    o.publicCopy = { ...o.publicCopy, paid: true };
  }));
});

/* ---------------- siapa boleh membaca / mengubah ---------------- */

describe('hak akses baca dan ubah', () => {
  const id = 'pesananbacaabcdefghij';

  async function seedOrder() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const o = makeOrder();
      await setDoc(doc(db, 'orders', id), { ...o.order, createdAt: new Date() });
      await setDoc(doc(db, 'orderStatus', id), { ...o.publicCopy, createdAt: new Date() });
    });
  }

  it('pelanggan TIDAK bisa membaca pesanan lengkap', async () => {
    await seedOrder();
    await assertFails(getDoc(doc(customer(), 'orders', id)));
  });

  it('pelanggan TIDAK bisa melihat daftar pesanan', async () => {
    await seedOrder();
    await assertFails(getDocs(collection(customer(), 'orders')));
  });

  it('pelanggan bisa membaca salinan publik bila tahu ID', async () => {
    await seedOrder();
    await assertSucceeds(getDoc(doc(customer(), 'orderStatus', id)));
  });

  it('pelanggan TIDAK bisa melihat daftar salinan publik', async () => {
    await seedOrder();
    await assertFails(getDocs(collection(customer(), 'orderStatus')));
  });

  it('pelanggan TIDAK bisa mengubah atau menghapus status', async () => {
    await seedOrder();
    await assertFails(updateDoc(doc(customer(), 'orderStatus', id), { status: 'selesai' }));
    await assertFails(updateDoc(doc(customer(), 'orders', id), { status: 'selesai', paid: true }));
    await assertFails(deleteDoc(doc(customer(), 'orderStatus', id)));
  });

  it('pelanggan TIDAK bisa menimpa pesanan yang sudah ada', async () => {
    await seedOrder();
    await assertFails(place(customer(), id, makeOrder()));
  });

  it('akun login biasa (bukan admin) tidak punya hak admin', async () => {
    await seedOrder();
    await assertFails(getDoc(doc(stranger(), 'orders', id)));
    await assertFails(setDoc(doc(stranger(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], price: 1 }));
  });

  it('admin bisa membaca, melihat daftar, dan mengubah status', async () => {
    await seedOrder();
    const db = admin(); // satu instance Firestore untuk seluruh operasi (referensi tidak boleh dicampur)
    await assertSucceeds(getDoc(doc(db, 'orders', id)));
    await assertSucceeds(getDocs(collection(db, 'orders')));

    // sama seperti updateOrderStatus() di admin: pesanan + salinan publik + riwayat dalam satu batch
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', id), { status: 'diterima', paid: true });
    batch.set(doc(db, 'orderStatus', id), { status: 'diterima', paid: true }, { merge: true });
    batch.set(doc(collection(doc(db, 'orders', id), 'history')), {
      from: 'menunggu', to: 'diterima', at: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('admin bisa melengkapi salinan publik pesanan lama (merge membuat dokumen)', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'orderStatus', 'pesananlamaabcdefghij'),
      { status: 'diterima', items: [line('ayam-1', 1)], total: 35000 }, { merge: true }));
  });

  it('menu dan pengaturan: semua boleh baca, hanya admin yang menulis', async () => {
    await assertSucceeds(getDoc(doc(customer(), 'menu', 'ayam-1')));
    await assertSucceeds(getDoc(doc(customer(), 'settings', 'store')));
    await assertFails(setDoc(doc(customer(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], price: 1 }));
    await assertFails(setDoc(doc(customer(), 'settings', 'store'), { ...STORE, isOpen: false }));
    await assertSucceeds(setDoc(doc(admin(), 'menu', 'ayam-1'), { ...MENU['ayam-1'], price: 36000 }));
    await assertSucceeds(setDoc(doc(admin(), 'settings', 'store'), { ...STORE, deliveryFee: 7000 }));
  });

  it('dokumen admins: hanya pemiliknya yang bisa membaca, tidak ada yang bisa menulis', async () => {
    await assertFails(getDoc(doc(customer(), 'admins', 'admin1')));
    await assertSucceeds(getDoc(doc(admin(), 'admins', 'admin1')));
    await assertFails(setDoc(doc(stranger(), 'admins', 'orang-lain'), { role: 'admin' }));
    await assertFails(setDoc(doc(admin(), 'admins', 'admin2'), { role: 'admin' }));
  });

  it('koleksi lain tertutup', async () => {
    await assertFails(getDoc(doc(customer(), 'rahasia', 'apa-saja')));
    await assertFails(setDoc(doc(admin(), 'rahasia', 'apa-saja'), { a: 1 }));
  });
});
