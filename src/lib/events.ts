import { ViralEvent } from "./types";

// Event viral — dipicu tiap beberapa putaran, efek bisa berlangsung beberapa putaran.
export const VIRAL_EVENTS: ViralEvent[] = [
  {
    id: "nasi-padang",
    title: "Nasi Padang Viral!",
    desc: "Seluruh dunia ngomongin rendang. Sewa properti grup Sumatera & Kalbar naik 2x selama 1 putaran!",
    icon: "🍛",
    good: true,
    rounds: 1,
    effect: { kind: "rentMultiplier", group: "g3", mult: 2 },
  },
  {
    id: "konser",
    title: "Konser Akbar!",
    desc: "Band internasional manggung. Pemilik kota tempat konser dapat Rp3 jt!",
    icon: "🎸",
    good: true,
    rounds: 0,
    effect: { kind: "bonusOwner", tile: -1, amount: 3_000_000 }, // tile diisi acak saat trigger
  },
  {
    id: "thr",
    title: "THR Cair Nasional!",
    desc: "Pemerintah cairkan THR. Semua pemain dapat Rp1,5 jt. Hujan uang!",
    icon: "💸",
    good: true,
    rounds: 0,
    effect: { kind: "moneyAll", amount: 1_500_000 },
  },
  {
    id: "promo-ojol",
    title: "Promo Ojol 90%!",
    desc: "Perang diskon aplikasi. Semua perjalanan gratis — tidak ada yang bayar sewa 1 putaran!",
    icon: "🛵",
    good: true,
    rounds: 1,
    effect: { kind: "rentFree" },
  },
  {
    id: "wisata-boom",
    title: "Pariwisata Meledak!",
    desc: "Turis membanjiri Indonesia Timur. Sewa grup Indonesia Timur 3x selama 1 putaran!",
    icon: "🏝️",
    good: true,
    rounds: 1,
    effect: { kind: "rentMultiplier", group: "g1", mult: 3 },
  },
  {
    id: "banjir",
    title: "Banjir Rob!",
    desc: "Hujan deras semalaman. Satu kota terendam — pemiliknya bayar perbaikan Rp1,2 jt.",
    icon: "🌊",
    good: false,
    rounds: 0,
    effect: { kind: "bonusOwner", tile: -1, amount: -1_200_000 },
  },
  {
    id: "bbm-naik",
    title: "BBM Naik!",
    desc: "Harga bensin melonjak. Semua pemain bayar ongkos Rp800 rb.",
    icon: "⛽",
    good: false,
    rounds: 0,
    effect: { kind: "moneyAll", amount: -800_000 },
  },
  {
    id: "pinjol",
    title: "Terjerat Pinjol!",
    desc: "Bunga berbunga. Pemain terkaya kena potong 10% saldonya!",
    icon: "📉",
    good: false,
    rounds: 0,
    effect: { kind: "moneyRichest", pct: 10 },
  },
  {
    id: "dbd",
    title: "DBD Mewabah!",
    desc: "Musim hujan, nyamuk merajalela. Semua pemain bayar fogging Rp500 rb.",
    icon: "🦟",
    good: false,
    rounds: 0,
    effect: { kind: "moneyAll", amount: -500_000 },
  },
  {
    id: "harga-cabai",
    title: "Harga Cabai Meroket!",
    desc: "Ibu-ibu panik nasional. Sewa SEMUA properti naik 1.5x selama 1 putaran.",
    icon: "🌶️",
    good: false,
    rounds: 1,
    effect: { kind: "rentMultiplier", group: "all", mult: 1.5 },
  },
];

// Interval acak antar-event (putaran penuh). Setelah event muncul, jadwal
// berikutnya = roundCount + acak[MIN..MAX].
export const EVENT_INTERVAL_MIN = 3;
export const EVENT_INTERVAL_MAX = 5;
// Durasi acak event berdurasi (rentMultiplier/rentFree), dalam putaran.
export const EVENT_DURATION_MIN = 2;
export const EVENT_DURATION_MAX = 3;

// Jadwal putaran event berikutnya secara acak dari sekarang.
export function scheduleNextEvent(fromRound: number): number {
  const span = EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN + 1;
  return fromRound + EVENT_INTERVAL_MIN + Math.floor(Math.random() * span);
}

// Durasi acak untuk event berdurasi.
export function randomEventDuration(): number {
  const span = EVENT_DURATION_MAX - EVENT_DURATION_MIN + 1;
  return EVENT_DURATION_MIN + Math.floor(Math.random() * span);
}

export function eventById(id: string): ViralEvent | undefined {
  return VIRAL_EVENTS.find((e) => e.id === id);
}
