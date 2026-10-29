# Tes aturan Firestore - kriteria penerimaan

Aturan (`firebase/firestore.rules`) baru boleh dipublikasikan bila SEMUA tes di bawah lolos
(tab Actions di GitHub hijau; log menampilkan tanda ✔ per tes).

Batas 5 jenis menu per pesanan adalah mitigasi sementara terhadap batas Firestore
(1.000 ekspresi dan 10 pembacaan dokumen per permintaan). Batas itu hanya sah bila
tes pesanan 1 sampai 5 baris lolos dan tes 6 baris ditolak.

| Kriteria | Kelompok tes (nama di log) |
|---|---|
| Pesanan sah 1, 2, 3, 4, 5 jenis menu DITERIMA | `pesanan sah DITERIMA` > "1 jenis menu berbeda" ... "5 jenis menu berbeda" |
| Kasus terberat (5 baris + diantar + transfer + catatan) DITERIMA | "KASUS TERBERAT: ..." |
| 6 dan 7 baris DITOLAK (termasuk 6 baris yang semuanya sah) | `batas 5 jenis menu` |
| Nama/harga tidak cocok dengan menu DITOLAK | `kecurangan harga/jumlah DITOLAK`: "harga lebih murah...", "nama menu mahal...", "nama menu tidak sama...", "harga menu naik..." |
| Menu tidak tersedia / dihapus DITOLAK | "menu sedang habis", "menu dihapus dari database" |
| Total tidak sama dengan jumlah (harga x qty) + ongkir DITOLAK | "total lebih kecil...", "total lebih besar...", `pengaturan toko DITEGAKKAN`: ongkir diakali / dikenakan pada ambil |
| Jumlah (qty) di luar 1-20 atau pecahan DITOLAK | "jumlah (qty) 21", "pecahan", "negatif", "qty 0" |
| Toko tutup, ongkir/metode bayar tidak sesuai pengaturan DITOLAK | `pengaturan toko DITEGAKKAN` |
| Data pemesan tidak valid, field tambahan, createdAt palsu DITOLAK | `data pemesan divalidasi` |
| Salinan publik tidak cocok / memuat data pribadi DITOLAK | `salinan publik harus sesuai pesanan` |
| Pelanggan tidak bisa membaca pesanan lengkap; admin bisa | `hak akses baca dan ubah` |

## Tes negatif yang bermakna
Setiap tes penolakan lebih dulu memastikan pesanan dasar YANG SAMA tanpa manipulasi
DITERIMA (kontrol), baru kemudian memastikan versi yang dimanipulasi DITOLAK. Jadi sebuah
penolakan tidak mungkin lolos hanya karena hal lain (mis. batas ekspresi terlampaui).

## Bila ada tes gagal
- Tes "DITERIMA" gagal dengan PERMISSION_DENIED: aturan terlalu ketat atau melewati batas
  ekspresi. Jangan publikasikan; turunkan batas baris atau sederhanakan aturan.
- Tes "DITOLAK" gagal (pesanan curang diterima): celah keamanan. Jangan publikasikan.
