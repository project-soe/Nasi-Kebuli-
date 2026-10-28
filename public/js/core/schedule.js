// core/schedule.js - jadwal ambil/antar (pre-order): daftar tanggal & jam yang bisa dipilih.
// Semua hitungan memakai zona waktu perangkat pelanggan (pelanggan dan toko diasumsikan sewilayah).
// Batas jam dan lead time hanya ditegakkan di aplikasi; aturan Firestore hanya memastikan
// jadwal ada di masa depan dan paling jauh 60 hari.

export const SLOT_MINUTES = 30;
const MIN_BUFFER_MS = 5 * 60 * 1000; // jadwal harus minimal 5 menit dari sekarang

const dayFormat = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
const pad = (n) => String(n).padStart(2, '0');

/** "10:30" -> 630 (menit sejak tengah malam); fallback bila tidak valid */
function toMinutes(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return fallback;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : fallback;
}

/** Tanggal lokal -> "2026-10-29" */
export function toYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ("2026-10-29", "12:30") -> Date lokal */
export function fromYmdHm(ymd, hm) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const [hh, mm] = String(hm).split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Jam yang bisa dipilih pada tanggal tertentu: [{ value: '12:00', label: '12.00' }] */
export function listSlots(store, ymd, now = new Date()) {
  const start = toMinutes(store.slotStart, 10 * 60);
  const end = toMinutes(store.slotEnd, 20 * 60);
  const lead = Math.max(0, Number(store.minLeadHours) || 0) * 3600 * 1000;
  const earliest = now.getTime() + Math.max(lead, MIN_BUFFER_MS);
  const latest = now.getTime() + (Number(store.maxAdvanceDays) || 14) * 24 * 3600 * 1000;

  const slots = [];
  for (let minutes = start; minutes <= end; minutes += SLOT_MINUTES) {
    const hm = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const time = fromYmdHm(ymd, hm).getTime();
    if (time >= earliest && time <= latest) slots.push({ value: hm, label: hm.replace(':', '.') });
  }
  return slots;
}

/** Tanggal yang masih punya jam tersedia: [{ value: '2026-10-29', label: 'Besok · Kamis, 29 Okt' }] */
export function listDates(store, now = new Date()) {
  const days = Math.min(59, Math.max(1, Number(store.maxAdvanceDays) || 14));
  const dates = [];
  for (let i = 0; i <= days; i += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const value = toYmd(day);
    if (listSlots(store, value, now).length === 0) continue;
    const prefix = i === 0 ? 'Hari ini \u00b7 ' : i === 1 ? 'Besok \u00b7 ' : '';
    dates.push({ value, label: `${prefix}${dayFormat.format(day)}` });
  }
  return dates;
}

/** Apakah jadwal itu masih sah menurut pengaturan toko? */
export function isValidSchedule(store, date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return listSlots(store, toYmd(date), now).some((slot) => slot.value === hm);
}

/** "Kamis, 29 Okt \u00b7 12.00" */
export function formatSchedule(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${dayFormat.format(date)} \u00b7 ${pad(date.getHours())}.${pad(date.getMinutes())}`;
}
