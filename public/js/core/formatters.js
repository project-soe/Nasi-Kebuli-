// core/formatters.js - format tampilan (uang, label kategori)

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 35000 -> "Rp 35.000" */
export function formatRupiah(value) {
  return rupiah.format(Number(value) || 0).replace(/\u00a0/g, ' ');
}

const CATEGORY_LABELS = {
  ayam: 'Ayam',
  kambing: 'Kambing',
  paket: 'Paket',
  minuman: 'Minuman',
};

/** "ayam" -> "Ayam"; kategori baru dari database ikut dirapikan otomatis */
export function categoryLabel(key = '') {
  const k = String(key).toLowerCase();
  if (CATEGORY_LABELS[k]) return CATEGORY_LABELS[k];
  return k ? k.charAt(0).toUpperCase() + k.slice(1) : 'Lainnya';
}
