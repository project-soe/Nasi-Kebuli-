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

## orders/{id}  (ID acak otomatis) - PRIBADI, hanya admin yang bisa membaca
| Field | Tipe | Keterangan |
|---|---|---|
| customerName | string | 2-60 karakter |
| phone | string | format 08xxxxxxxxxx |
| note | string | opsional, maks 300 |
| items | array | [{id, name, price, qty}] - maks. 6 baris, qty 1-20 |
| total | number | HARUS sama dengan jumlah (price x qty) semua baris (diperiksa server) |
| status | string | menunggu, diterima, diproses, selesai, ditolak |
| createdAt | timestamp | waktu server |
| rejectReason | string | alasan penolakan (diisi admin) |

## orderStatus/{id}  (ID sama dengan orders/{id}) - salinan PUBLIK tanpa data pribadi
Dibaca pelanggan di halaman status lewat ID acak. Tidak berisi nama, HP, atau catatan.
| Field | Tipe |
|---|---|
| items | array (identik dengan orders/{id}) |
| total | number |
| status | string |
| createdAt | timestamp |
| rejectReason | string (opsional) |

Kedua dokumen dibuat bersamaan dalam satu batch; admin mengubah status di keduanya.

## orders/{id}/history/{id}
Riwayat perubahan status (hanya admin).

## admins/{uid}
Dokumen dengan ID = UID akun admin (dibuat manual di Firebase Console).
