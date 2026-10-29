// core/config.js - pengaturan awal (cadangan bila Google Sheets belum terhubung)
// Nilai asli nanti dibaca dari tab "Pengaturan" di Google Sheets.

export const STORE = {
  name: 'Kebuli Ikhsan',
  // Format internasional tanpa + dan tanpa 0 di depan. Contoh: 6281234567890
  // GANTI dengan nomor WhatsApp toko yang asli.
  whatsapp: '6280000000000',
  hours: '10.00 - 21.00',
  address: 'Alamat toko diisi dari Google Sheets',
  defaultMessage: 'Halo Kebuli Ikhsan, saya ingin bertanya.',
};

// Kredit pengembang: tulisan kecil "Website oleh ..." di bagian paling bawah halaman publik.
// Sengaja kecil dan redup agar tidak mengganggu pengunjung maupun pemilik toko.
//   enabled: false  -> kredit dimatikan sepenuhnya (mis. bila klien meminta tanpa kredit)
//   name            -> nama brand yang tampil (GANTI bila brand-mu bukan "Soe")
//   url             -> tautan saat kredit diklik: situs/portofolio, atau WhatsApp,
//                      mis. 'https://wa.me/6281234567890?text=Halo%2C%20saya%20tertarik%20membuat%20website'
//                      Kosongkan ('') bila tidak ingin ada tautan.
// Logo ada di public/assets/images/branding/soe-mark.svg
export const CREDIT = {
  enabled: true,
  label: 'Website oleh',
  name: 'SS',
  url: '',
};
