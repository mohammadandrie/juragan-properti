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

// Harga properti dalam RUPIAH penuh. Range: termurah ~Rp1,2jt, premium maks Rp25jt.
export const BOARD: Tile[] = [
  { id: 0, type: "go", name: "MULAI" },
  { id: 1, type: "property", name: "Kupang", group: "g1", umr: 2455898, price: 1_200_000 },
  { id: 2, type: "chest", name: "Dana Umum" },
  { id: 3, type: "property", name: "Mataram", group: "g1", umr: 2673861, price: 1_500_000 },
  { id: 4, type: "tax", name: "Pajak Penghasilan", taxAmount: 2_000_000 },
  { id: 5, type: "airport", name: "Bandara El Tari", price: 7_000_000 },
  { id: 6, type: "property", name: "Yogyakarta", group: "g2", umr: 2827593, price: 2_500_000 },
  { id: 7, type: "chance", name: "Kesempatan" },
  { id: 8, type: "property", name: "Bengkulu", group: "g2", umr: 2827251, price: 2_800_000 },
  { id: 9, type: "property", name: "Bandar Lampung", group: "g2", umr: 3047734, price: 3_000_000 },
  { id: 10, type: "jail", name: "Penjara" },
  { id: 11, type: "property", name: "Pontianak", group: "g3", umr: 3054552, price: 4_000_000 },
  { id: 12, type: "utility", name: "PLN", price: 5_000_000 },
  { id: 13, type: "property", name: "Palu", group: "g3", umr: 3179565, price: 4_500_000 },
  { id: 14, type: "property", name: "Padang", group: "g3", umr: 3214846, price: 5_000_000 },
  { id: 15, type: "airport", name: "Bandara Minangkabau", price: 7_000_000 },
  { id: 16, type: "property", name: "Kendari", group: "g4", umr: 3306496, price: 6_000_000 },
  { id: 17, type: "quiz", name: "Cerdas Cermat" },
  { id: 18, type: "property", name: "Ambon", group: "g4", umr: 3334490, price: 6_500_000 },
  { id: 19, type: "property", name: "Semarang", group: "g4", umr: 3701709, price: 7_500_000 },
  { id: 20, type: "parking", name: "Parkir Bebas" },
  { id: 21, type: "property", name: "Banjarmasin", group: "g5", umr: 3725000, price: 9_000_000 },
  { id: 22, type: "chance", name: "Kesempatan" },
  { id: 23, type: "property", name: "Samarinda", group: "g5", umr: 3762431, price: 10_000_000 },
  { id: 24, type: "property", name: "Banda Aceh", group: "g5", umr: 3932552, price: 11_000_000 },
  { id: 25, type: "airport", name: "Bandara Sultan Hasanuddin", price: 7_000_000 },
  { id: 26, type: "property", name: "Palembang", group: "g6", umr: 3942963, price: 12_000_000 },
  { id: 27, type: "property", name: "Manado", group: "g6", umr: 4002630, price: 13_000_000 },
  { id: 28, type: "utility", name: "PDAM", price: 5_000_000 },
  { id: 29, type: "property", name: "Makassar", group: "g6", umr: 4148719, price: 14_000_000 },
  { id: 30, type: "gotojail", name: "Masuk Penjara" },
  { id: 31, type: "property", name: "Medan", group: "g7", umr: 4335279, price: 16_000_000 },
  { id: 32, type: "property", name: "Jayapura", group: "g7", umr: 4436283, price: 17_000_000 },
  { id: 33, type: "quiz", name: "Cerdas Cermat" },
  { id: 34, type: "property", name: "Bandung", group: "g7", umr: 4737678, price: 18_000_000 },
  { id: 35, type: "airport", name: "Bandara Soekarno-Hatta", price: 7_000_000 },
  { id: 36, type: "chance", name: "Kesempatan" },
  { id: 37, type: "property", name: "Surabaya", group: "g8", umr: 5288796, price: 20_000_000 },
  { id: 38, type: "property", name: "Jakarta", group: "g8", umr: 5729876, price: 22_000_000 },
  { id: 39, type: "property", name: "Bekasi", group: "g8", umr: 5994443, price: 25_000_000 },
];

// Sewa bandara per jumlah bandara dimiliki (rupiah penuh)
export const AIRPORT_RENT = [800_000, 1_600_000, 3_200_000, 6_400_000];
// Sewa utilitas per jumlah utilitas dimiliki
export const UTILITY_RENT = [1_000_000, 2_500_000];

export function tilesInGroup(group: ColorGroup): Tile[] {
  return BOARD.filter((t) => t.group === group);
}

