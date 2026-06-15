import { Card } from "./types";

// Kartu Kesempatan — gaya Monopoli profesional, tema Indonesia.
export const CHANCE_CARDS: Card[] = [
  { text: "Anda memenangkan turnamen daerah. Terima Rp1 jt.", icon: "🏅", effect: { kind: "money", amount: 1_000_000 } },
  { text: "Anda menerima surat tilang elektronik. Bayar Rp1,5 jt.", icon: "📸", effect: { kind: "money", amount: -1_500_000 } },
  { text: "Usaha kuliner Anda diliput media. Pendapatan naik Rp2,5 jt.", icon: "🍜", effect: { kind: "money", amount: 2_500_000 } },
  { text: "Anda menjadi korban penipuan daring. Bayar Rp1,2 jt.", icon: "📱", effect: { kind: "money", amount: -1_200_000 } },
  { text: "Maju ke petak MULAI. Terima gaji Rp2 jt.", icon: "➡️", effect: { kind: "moveTo", tile: 0 } },
  { text: "Anda kehilangan dompet. Mundur 3 langkah.", icon: "👛", effect: { kind: "moveBack", steps: 3 } },
  { text: "Anda terjaring razia. Masuk Penjara.", icon: "🚔", effect: { kind: "gotojail" } },
  { text: "Anda memperoleh Kartu Bebas Penjara.", icon: "🎟️", effect: { kind: "jailcard" } },
  { text: "Anda menerima warisan keluarga. Terima Rp2 jt.", icon: "📜", effect: { kind: "money", amount: 2_000_000 } },
  { text: "Anda menyumbang untuk korban bencana. Bayar Rp800 rb.", icon: "🤲", effect: { kind: "money", amount: -800_000 } },
  { text: "Hari ulang tahun Anda. Setiap pemain memberi Anda Rp500 rb.", icon: "🎂", effect: { kind: "collectFromAll", amount: 500_000 } },
  { text: "Biaya parkir akumulatif. Bayar Rp400 rb.", icon: "🅿️", effect: { kind: "money", amount: -400_000 } },
  { text: "Kontrak kerja sama Anda disetujui. Terima Rp3 jt.", icon: "📈", effect: { kind: "money", amount: 3_000_000 } },
  { text: "Anda terbang ke Bandara Soekarno-Hatta.", icon: "✈️", effect: { kind: "moveTo", tile: 35 } },
];

// Kartu Dana Umum — gaya Monopoli profesional.
export const CHEST_CARDS: Card[] = [
  { text: "Anda menerima tunjangan hari raya. Terima Rp2 jt.", icon: "💰", effect: { kind: "money", amount: 2_000_000 } },
  { text: "Tagihan listrik bulan ini melonjak. Bayar Rp600 rb.", icon: "💡", effect: { kind: "money", amount: -600_000 } },
  { text: "Anda memenangkan undian belanja. Terima Rp900 rb.", icon: "🎁", effect: { kind: "money", amount: 900_000 } },
  { text: "Iuran tahunan warga. Bayar Rp700 rb.", icon: "🏘️", effect: { kind: "money", amount: -700_000 } },
  { text: "Pengembalian dana tiket. Terima Rp1,6 jt.", icon: "🎫", effect: { kind: "money", amount: 1_600_000 } },
  { text: "Servis besar kendaraan. Bayar Rp1,1 jt.", icon: "🔧", effect: { kind: "money", amount: -1_100_000 } },
  { text: "Anda menerima arisan keluarga. Terima Rp1,8 jt.", icon: "🤝", effect: { kind: "money", amount: 1_800_000 } },
  { text: "Anda mentraktir kolega. Bayar Rp1 jt.", icon: "🍽️", effect: { kind: "money", amount: -1_000_000 } },
  { text: "Cashback belanja Anda cair. Terima Rp800 rb.", icon: "🛒", effect: { kind: "money", amount: 800_000 } },
  { text: "Sumbangan undangan pernikahan. Bayar Rp900 rb.", icon: "💌", effect: { kind: "money", amount: -900_000 } },
  { text: "Penjualan barang lama Anda berhasil. Terima Rp1,4 jt.", icon: "📦", effect: { kind: "money", amount: 1_400_000 } },
  { text: "Patungan kado untuk Anda. Setiap pemain memberi Rp400 rb.", icon: "🎉", effect: { kind: "collectFromAll", amount: 400_000 } },
  { text: "Anda kalah taruhan. Bayar Rp300 rb kepada setiap pemain.", icon: "🎲", effect: { kind: "payToAll", amount: 300_000 } },
  { text: "Anda memperoleh Kartu Bebas Penjara.", icon: "🎟️", effect: { kind: "jailcard" } },
];
