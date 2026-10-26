# 03 - Skema Data (Firestore)

## settings/store  (satu dokumen)
| Field | Tipe | Contoh |
|---|---|---|
| name | string | Kebuli Ikhsan |
| whatsapp | string | 6281234567890 (tanpa + dan tanpa 0 di depan) |
| isOpen | boolean | true / false |
| hours | string | 10.00 - 21.00 |
| address | string | alamat toko |
| closedMessage | string | Toko sedang tutup... |

## menu/{id}  (satu dokumen per menu)
| Field | Tipe | Contoh |
|---|---|---|
| name | string | Nasi Kebuli Ayam |
| category | string | ayam / kambing / paket |
| price | number | 35000 |
| description | string | teks singkat |
| imageUrl | string | alamat https gambar (boleh kosong) |
| available | boolean | false = tampil "Habis" |
| featured | boolean | true = tampil di "Menu Andalan" beranda (maks. 3 pertama) |
| sortOrder | number | urutan tampil (kecil = awal) |

## orders/{id}  (ID acak otomatis)
| Field | Tipe | Keterangan |
|---|---|---|
| customerName | string | 2-60 karakter |
| phone | string | 8-20 karakter |
| note | string | opsional, maks 300 |
| items | array | [{id, name, price, qty}] |
| total | number | jumlah harga saat pesanan dibuat |
| status | string | menunggu, diterima, ditolak, diproses, selesai |
| createdAt | timestamp | waktu server |

## orders/{id}/history/{id}
Riwayat perubahan status (hanya admin).

## admins/{uid}
Dokumen kosong dengan ID = UID akun admin (dibuat manual di Firebase Console).
