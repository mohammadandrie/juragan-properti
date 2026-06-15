// Ekonomi & format uang — semua nilai dalam RUPIAH penuh (mis. 1_000_000 = Rp1 jt).

export const START_MONEY = 35_000_000;
export const SALARY_PASS_START = 2_000_000; // gaji tiap lewat MULAI
export const JAIL_FINE = 500_000;
export const QUIZ_REWARD = 1_000_000;
export const QUIZ_PENALTY = 500_000;

export const MAX_LEVEL = 5;

// Batas putaran; setelah ini, pemain dengan kekayaan bersih tertinggi menang.
export const MAX_ROUNDS = 30;

// Biaya upgrade = basePrice * mult[targetLevel]
export const UPGRADE_MULT = [0, 0, 0.3, 0.45, 0.65, 0.9];
// Sewa = basePrice * mult[currentLevel]
export const RENT_MULT = [0, 0.1, 0.18, 0.3, 0.45, 0.7];

// Durasi tiap fase keputusan (ms)
export const ROLL_MS = 30_000;
export const BUY_MS = 30_000;
export const RENT_MS = 30_000;
export const UPGRADE_MS = 25_000;
export const END_AUTO_MS = 4_500; // jeda setelah mendarat sebelum giliran auto-selesai

// Pengali harga ambil-alih properti lawan (terhadap totalInvestment pemilik).
export const TAKEOVER_MULT = 1.5;

function roundMoney(v: number): number {
  return Math.round(v / 10_000) * 10_000;
}

// Biaya upgrade ke level target (dari level sebelumnya)
export function upgradeCost(basePrice: number, targetLevel: number): number {
  return roundMoney(basePrice * (UPGRADE_MULT[targetLevel] ?? 0));
}

// Total biaya beli langsung sampai level tertentu (basePrice + upgrade kumulatif)
export function buyCost(basePrice: number, level: number): number {
  let c = basePrice;
  for (let l = 2; l <= level; l++) c += upgradeCost(basePrice, l);
  return c;
}

// Sewa untuk level bangunan saat ini
export function rentForLevel(basePrice: number, level: number): number {
  if (level <= 0) return 0;
  return roundMoney(basePrice * (RENT_MULT[level] ?? 0));
}

// Level maksimal yang bisa dibeli langsung berdasar jumlah lewat MULAI
export function maxBuyLevel(startPassCount: number): number {
  return Math.min(1 + startPassCount, 4);
}

// Nilai jual aset (50% dari total investasi)
export function sellValue(totalInvestment: number): number {
  return Math.floor(totalInvestment / 2 / 10_000) * 10_000;
}

// Format uang ringkas: Rp1 jt, Rp2,5 jt, Rp25 jt, Rp450 rb
export function fmtMoney(v: number): string {
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1_000_000) {
    s = `Rp${trim(a / 1_000_000)} jt`;
  } else if (a >= 1_000) {
    s = `Rp${trim(a / 1_000)} rb`;
  } else {
    s = `Rp${Math.round(a)}`;
  }
  return neg ? `-${s}` : s;
}

function trim(n: number): string {
  const r = Math.round(n * 10) / 10;
  return (Number.isInteger(r) ? r.toString() : r.toFixed(1)).replace(".", ",");
}
