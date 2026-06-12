import { Card } from "./types";

// Kartu Kesempatan — tema kejadian viral/relatable Indonesia
export const CHANCE_CARDS: Card[] = [
  { text: "Menang lomba 17-an tingkat RT! Hadiah Rp 50jt.", icon: "🎌", effect: { kind: "money", amount: 50 } },
  { text: "Kena tilang elektronik. Bayar Rp 75jt.", icon: "📸", effect: { kind: "money", amount: -75 } },
  { text: "Warungmu direview food vlogger, langsung antre! Dapat Rp 120jt.", icon: "🍜", effect: { kind: "money", amount: 120 } },
  { text: "HP kena hack, saldo dikuras 'admin'. Bayar Rp 60jt.", icon: "📱", effect: { kind: "money", amount: -60 } },
  { text: "Maju ke MULAI, ambil gaji Rp 200jt.", icon: "➡️", effect: { kind: "moveTo", tile: 0 } },
  { text: "Lupa dompet di warkop. Mundur 3 langkah.", icon: "👛", effect: { kind: "moveBack", steps: 3 } },
  { text: "Kena razia, langsung masuk penjara!", icon: "🚔", effect: { kind: "gotojail" } },
  { text: "Punya orang dalam 😏 — Kartu Bebas Penjara.", icon: "🎟️", effect: { kind: "jailcard" } },
  { text: "Dapat warisan tanah dari nenek. Terima Rp 100jt.", icon: "📜", effect: { kind: "money", amount: 100 } },
  { text: "Sumbang korban bencana. Bayar Rp 40jt. (pahala +1)", icon: "🤲", effect: { kind: "money", amount: -40 } },
  { text: "Kamu ulang tahun! Semua pemain transfer Rp 25jt.", icon: "🎂", effect: { kind: "collectFromAll", amount: 25 } },
  { text: "Bayar parkir liar di mana-mana. Rp 20jt melayang.", icon: "🅿️", effect: { kind: "money", amount: -20 } },
  { text: "Kontenmu FYP 3 hari berturut-turut! Endorse cair Rp 150jt.", icon: "🔥", effect: { kind: "money", amount: 150 } },
  { text: "Terbang ke Bandara Soekarno-Hatta.", icon: "✈️", effect: { kind: "moveTo", tile: 35 } },
];

// Kartu Dana Umum
export const CHEST_CARDS: Card[] = [
  { text: "THR cair! Terima Rp 100jt.", icon: "💰", effect: { kind: "money", amount: 100 } },
  { text: "Listrik token habis tengah malam. Beli darurat Rp 30jt.", icon: "💡", effect: { kind: "money", amount: -30 } },
  { text: "Menang giveaway sembako premium. Dapat Rp 45jt.", icon: "🎁", effect: { kind: "money", amount: 45 } },
  { text: "Iuran kas RT + ronda setahun. Bayar Rp 35jt.", icon: "🏘️", effect: { kind: "money", amount: -35 } },
  { text: "Refund tiket konser yang batal. Terima Rp 80jt.", icon: "🎫", effect: { kind: "money", amount: 80 } },
  { text: "Servis motor turun mesin. Bayar Rp 55jt.", icon: "🔧", effect: { kind: "money", amount: -55 } },
  { text: "Arisan keluarga — giliranmu narik! Dapat Rp 90jt.", icon: "🤝", effect: { kind: "money", amount: 90 } },
  { text: "Traktir bukber satu kantor. Bayar Rp 50jt.", icon: "🍽️", effect: { kind: "money", amount: -50 } },
  { text: "Cashback belanja online gede-gedean. Terima Rp 40jt.", icon: "🛒", effect: { kind: "money", amount: 40 } },
  { text: "Kondangan 5 kali sebulan. Amplop Rp 45jt.", icon: "💌", effect: { kind: "money", amount: -45 } },
  { text: "Jual koleksi lama di marketplace, laku semua! Rp 70jt.", icon: "📦", effect: { kind: "money", amount: 70 } },
  { text: "Semua pemain patungan kado buatmu. Terima Rp 20jt dari masing-masing.", icon: "🎉", effect: { kind: "collectFromAll", amount: 20 } },
  { text: "Kamu kalah taruhan bola. Bayar Rp 15jt ke semua pemain.", icon: "⚽", effect: { kind: "payToAll", amount: 15 } },
  { text: "Dapat Kartu Bebas Penjara dari kenalan pengacara.", icon: "🎟️", effect: { kind: "jailcard" } },
];
