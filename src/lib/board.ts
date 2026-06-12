import { Tile, ColorGroup } from "./types";

// Kota diurutkan berdasar UMP/UMK 2026 riil (paling murah dekat MULAI,
// paling mahal sebelum kembali ke MULAI). Nilai `umr` dalam rupiah.
export const GROUP_LABELS: Record<ColorGroup, string> = {
  g1: "Indonesia Timur",
  g2: "Jawa Hemat",
  g3: "Sumatera & Kalbar",
  g4: "Tengah Naik Daun",
  g5: "Kota Berkembang",
  g6: "Kalimantan & Bali",
  g7: "Kota Besar",
  g8: "Metropolitan",
};

export const GROUP_COLORS: Record<ColorGroup, string> = {
  g1: "#8d6e63", // coklat
  g2: "#4fc3f7", // biru muda
  g3: "#ec407a", // pink
  g4: "#ff9800", // oranye
  g5: "#ef5350", // merah
  g6: "#ffeb3b", // kuning
  g7: "#66bb6a", // hijau
  g8: "#1e88e5", // biru tua
};

export const GAJI_LEWAT_MULAI = 200;
export const DENDA_PENJARA = 50;
export const QUIZ_REWARD = 75;
export const QUIZ_PENALTY = 40;

// Urutan UMR/UMK 2026 riil (rupiah): Kupang 2,46jt → Mataram 2,67 → Yogyakarta 2,83
// → Bengkulu 2,83 → B.Lampung 3,05 → Pontianak 3,05 → Palu 3,18 → Padang 3,21
// → Kendari 3,31 → Ambon 3,33 → Semarang 3,70 → Banjarmasin 3,73 → Samarinda 3,76
// → Banda Aceh 3,93 → Palembang 3,94 → Manado 4,00 → Makassar 4,15 → Medan 4,34
// → Jayapura 4,44 → Bandung 4,74 → Surabaya 5,29 → Jakarta 5,73 → Bekasi 5,99 (tertinggi nasional)
export const BOARD: Tile[] = [
  { id: 0, type: "go", name: "MULAI" },
  { id: 1, type: "property", name: "Kupang", group: "g1", umr: 2455898, price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
  { id: 2, type: "chest", name: "Dana Umum" },
  { id: 3, type: "property", name: "Mataram", group: "g1", umr: 2673861, price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
  { id: 4, type: "tax", name: "Pajak Penghasilan", taxAmount: 200 },
  { id: 5, type: "airport", name: "Bandara El Tari", price: 200 },
  { id: 6, type: "property", name: "Yogyakarta", group: "g2", umr: 2827593, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 7, type: "chance", name: "Kesempatan" },
  { id: 8, type: "property", name: "Bengkulu", group: "g2", umr: 2827251, price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 9, type: "property", name: "Bandar Lampung", group: "g2", umr: 3047734, price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
  { id: 10, type: "jail", name: "Penjara" },
  { id: 11, type: "property", name: "Pontianak", group: "g3", umr: 3054552, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 12, type: "utility", name: "PLN", price: 150 },
  { id: 13, type: "property", name: "Palu", group: "g3", umr: 3179565, price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 14, type: "property", name: "Padang", group: "g3", umr: 3214846, price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
  { id: 15, type: "airport", name: "Bandara Minangkabau", price: 200 },
  { id: 16, type: "property", name: "Kendari", group: "g4", umr: 3306496, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 17, type: "quiz", name: "Cerdas Cermat" },
  { id: 18, type: "property", name: "Ambon", group: "g4", umr: 3334490, price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 19, type: "property", name: "Semarang", group: "g4", umr: 3701709, price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
  { id: 20, type: "parking", name: "Parkir Bebas" },
  { id: 21, type: "property", name: "Banjarmasin", group: "g5", umr: 3725000, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 22, type: "chance", name: "Kesempatan" },
  { id: 23, type: "property", name: "Samarinda", group: "g5", umr: 3762431, price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 24, type: "property", name: "Banda Aceh", group: "g5", umr: 3932552, price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
  { id: 25, type: "airport", name: "Bandara Sultan Hasanuddin", price: 200 },
  { id: 26, type: "property", name: "Palembang", group: "g6", umr: 3942963, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 27, type: "property", name: "Manado", group: "g6", umr: 4002630, price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 28, type: "utility", name: "PDAM", price: 150 },
  { id: 29, type: "property", name: "Makassar", group: "g6", umr: 4148719, price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
  { id: 30, type: "gotojail", name: "Masuk Penjara" },
  { id: 31, type: "property", name: "Medan", group: "g7", umr: 4335279, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 32, type: "property", name: "Jayapura", group: "g7", umr: 4436283, price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 33, type: "quiz", name: "Cerdas Cermat" },
  { id: 34, type: "property", name: "Bandung", group: "g7", umr: 4737678, price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
  { id: 35, type: "airport", name: "Bandara Soekarno-Hatta", price: 200 },
  { id: 36, type: "chance", name: "Kesempatan" },
  { id: 37, type: "property", name: "Surabaya", group: "g8", umr: 5288796, price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
  { id: 38, type: "property", name: "Jakarta", group: "g8", umr: 5729876, price: 380, rent: [40, 190, 550, 1250, 1500, 1750], houseCost: 200 },
  { id: 39, type: "property", name: "Bekasi", group: "g8", umr: 5994443, price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 },
];

export const AIRPORT_RENT = [25, 50, 100, 200];

export function tilesInGroup(group: ColorGroup): Tile[] {
  return BOARD.filter((t) => t.group === group);
}
