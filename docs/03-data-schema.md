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
| pickupEnabled | boolean | true = opsi "Ambil di tempat" tersedia |
| deliveryEnabled | boolean | true = opsi "Diantar" tersedia |
| deliveryFee | number | ongkos kirim tarif tetap (Rp), 0 = gratis, maks. 500000 |
| deliveryNote | string | keterangan pengantaran yang tampil di checkout |
| paymentCash | boolean | true (bawaan) = tunai/bayar saat diterima |
| paymentTransfer | boolean | true = transfer bank / e-wallet (wajib isi transferInfo) |
| paymentQris | boolean | true = QRIS (wajib isi qrisImage) |
| transferInfo | string | nomor rekening/e-wallet, satu per baris |
| qrisImage | string | jalur gambar QRIS (mis. assets/images/branding/qris.jpg) atau tautan https |
| paymentNote | string | catatan pembayaran (opsional) |
| preorderEnabled | boolean | true = pelanggan boleh menjadwalkan tanggal/jam |
| preorderWhenClosed | boolean | true = pesanan terjadwal tetap diterima saat toko tutup |
| minLeadHours | number | jadwal paling cepat berapa jam dari sekarang (0-72) |
| maxAdvanceDays | number | jadwal paling jauh berapa hari ke depan (1-59) |
| slotStart / slotEnd | string | jam paling awal dan paling akhir, format HH:MM, per 30 menit |

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
| fulfillment | string | `ambil` (ambil di tempat) atau `antar` (diantar) |
| address | string | alamat pengantaran 10-200 huruf; hanya ada bila `antar` |
| deliveryFee | number | ongkir; HARUS sama dengan pengaturan toko (0 bila `ambil`) |
| paymentMethod | string | `tunai`, `transfer`, atau `qris`; harus aktif di pengaturan toko |
| scheduledFor | timestamp / null | jadwal ambil/antar; `null` = secepatnya. Harus di masa depan, maksimal 60 hari |
| paid | boolean | tanda lunas, hanya diubah admin |
| items | array | [{id, name, price, qty}] - maks. 5 baris, qty 1-20 |
| total | number | HARUS sama dengan jumlah (price x qty) semua baris + deliveryFee (diperiksa server) |
| status | string | menunggu, diterima, diproses, selesai, ditolak |
| createdAt | timestamp | waktu server |
| rejectReason | string | alasan penolakan (diisi admin) |

## orderStatus/{id}  (ID sama dengan orders/{id}) - salinan PUBLIK tanpa data pribadi
Dibaca pelanggan di halaman status lewat ID acak. Tidak berisi nama, HP, alamat, atau catatan.
| Field | Tipe |
|---|---|
| items | array (identik dengan orders/{id}) |
| total | number |
| fulfillment | string (`ambil` / `antar`) |
| deliveryFee | number |
| paymentMethod | string (`tunai` / `transfer` / `qris`) |
| scheduledFor | timestamp / null (identik dengan orders/{id}) |
| paid | boolean (diubah admin) |
| status | string |
| createdAt | timestamp |
| rejectReason | string (opsional) |

Kedua dokumen dibuat bersamaan dalam satu batch; admin mengubah status di keduanya.

## orders/{id}/history/{id}
Riwayat perubahan status (hanya admin).

## admins/{uid}
Dokumen dengan ID = UID akun admin (dibuat manual di Firebase Console).
