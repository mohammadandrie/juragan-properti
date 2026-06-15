import { Card } from "./types";

// Kartu Kesempatan — tema kejadian viral/relatable Indonesia.
// amount dalam RUPIAH penuh.
export const CHANCE_CARDS: Card[] = [
  { text: "Menang lomba 17-an tingkat RT! Hadiah Rp1 jt.", icon: "🎌", effect: { kind: "money", amount: 1_000_000 } },
  { text: "Kena tilang elektronik. Bayar Rp1,5 jt.", icon: "📸", effect: { kind: "money", amount: -1_500_000 } },
  { text: "Warungmu direview food vlogger, langsung antre! Dapat Rp2,5 jt.", icon: "🍜", effect: { kind: "money", amount: 2_500_000 } },
  { text: "HP kena hack, saldo dikuras 'admin'. Bayar Rp1,2 jt.", icon: "📱", effect: { kind: "money", amount: -1_200_000 } },
  { text: "Maju ke MULAI, ambil gaji Rp2 jt.", icon: "➡️", effect: { kind: "moveTo", tile: 0 } },
  { text: "Lupa dompet di warkop. Mundur 3 langkah.", icon: "👛", effect: { kind: "moveBack", steps: 3 } },
  { text: "Kena razia, langsung masuk penjara!", icon: "🚔", effect: { kind: "gotojail" } },
  { text: "Punya orang dalam 😏 — Kartu Bebas Penjara.", icon: "🎟️", effect: { kind: "jailcard" } },
  { text: "Dapat warisan tanah dari nenek. Terima Rp2 jt.", icon: "📜", effect: { kind: "money", amount: 2_000_000 } },
  { text: "Sumbang korban bencana. Bayar Rp800 rb. (pahala +1)", icon: "🤲", effect: { kind: "money", amount: -800_000 } },
  { text: "Kamu ulang tahun! Semua pemain transfer Rp500 rb.", icon: "🎂", effect: { kind: "collectFromAll", amount: 500_000 } },
  { text: "Bayar parkir liar di mana-mana. Rp400 rb melayang.", icon: "🅿️", effect: { kind: "money", amount: -400_000 } },
  { text: "Kontenmu FYP 3 hari berturut-turut! Endorse cair Rp3 jt.", icon: "🔥", effect: { kind: "money", amount: 3_000_000 } },
  { text: "Terbang ke Bandara Soekarno-Hatta.", icon: "✈️", effect: { kind: "moveTo", tile: 35 } },
];

// Kartu Dana Umum
export const CHEST_CARDS: Card[] = [
  { text: "THR cair! Terima Rp2 jt.", icon: "💰", effect: { kind: "money", amount: 2_000_000 } },
  { text: "Listrik token habis tengah malam. Beli darurat Rp600 rb.", icon: "💡", effect: { kind: "money", amount: -600_000 } },
  { text: "Menang giveaway sembako premium. Dapat Rp900 rb.", icon: "🎁", effect: { kind: "money", amount: 900_000 } },
  { text: "Iuran kas RT + ronda setahun. Bayar Rp700 rb.", icon: "🏘️", effect: { kind: "money", amount: -700_000 } },
  { text: "Refund tiket konser yang batal. Terima Rp1,6 jt.", icon: "🎫", effect: { kind: "money", amount: 1_600_000 } },
  { text: "Servis motor turun mesin. Bayar Rp1,1 jt.", icon: "🔧", effect: { kind: "money", amount: -1_100_000 } },
  { text: "Arisan keluarga — giliranmu narik! Dapat Rp1,8 jt.", icon: "🤝", effect: { kind: "money", amount: 1_800_000 } },
  { text: "Traktir bukber satu kantor. Bayar Rp1 jt.", icon: "🍽️", effect: { kind: "money", amount: -1_000_000 } },
  { text: "Cashback belanja online gede-gedean. Terima Rp800 rb.", icon: "🛒", effect: { kind: "money", amount: 800_000 } },
  { text: "Kondangan 5 kali sebulan. Amplop Rp900 rb.", icon: "💌", effect: { kind: "money", amount: -900_000 } },
  { text: "Jual koleksi lama di marketplace, laku semua! Rp1,4 jt.", icon: "📦", effect: { kind: "money", amount: 1_400_000 } },
  { text: "Semua pemain patungan kado buatmu. Terima Rp400 rb dari masing-masing.", icon: "🎉", effect: { kind: "collectFromAll", amount: 400_000 } },
  { text: "Kamu kalah taruhan bola. Bayar Rp300 rb ke semua pemain.", icon: "⚽", effect: { kind: "payToAll", amount: 300_000 } },
  { text: "Dapat Kartu Bebas Penjara dari kenalan pengacara.", icon: "🎟️", effect: { kind: "jailcard" } },
];
