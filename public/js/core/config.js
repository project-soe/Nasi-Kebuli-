// core/config.js - pengaturan awal (cadangan bila Google Sheets belum terhubung)
// Nilai asli nanti dibaca dari tab "Pengaturan" di Google Sheets.

export const STORE = {
  name: 'Kebuli Ikhsan',
  // Format internasional tanpa + dan tanpa 0 di depan. Contoh: 6281234567890
  // GANTI dengan nomor WhatsApp toko yang asli.
  whatsapp: '6285158884404',
  hours: '09.00 - 21.00',
  address: 'Alamat toko diisi dari Google Sheets',
  defaultMessage: 'Halo Kebuli Ikhsan, saya ingin bertanya.',
};
