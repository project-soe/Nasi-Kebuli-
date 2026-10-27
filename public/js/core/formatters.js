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

const STATUS_LABELS = {
  menunggu: 'Menunggu',
  diterima: 'Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || String(status);
}

const dateTime = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

/** "25 Okt, 14.05" */
export function formatDateTime(date) {
  return date instanceof Date && !Number.isNaN(date) ? dateTime.format(date) : 'Baru saja';
}

/** "5 menit lalu", "2 jam lalu", atau tanggal bila lebih dari sehari */
export function timeAgo(date) {
  if (!(date instanceof Date) || Number.isNaN(date)) return 'Baru saja';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} jam lalu`;
  return formatDateTime(date);
}

const PAYMENT_LABELS = { tunai: 'Tunai', transfer: 'Transfer bank', qris: 'QRIS' };

export function paymentLabel(method) {
  return PAYMENT_LABELS[method] || '';
}
