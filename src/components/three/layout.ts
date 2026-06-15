// Posisi dunia 3D untuk petak 0-39. Papan berpusat di (0,0).
export const TILE = 1;
export const CORNER = 1.6;
export const HALF = (9 * TILE + 2 * CORNER) / 2; // 5.3

function offset(i: number): number {
  if (i === 0) return -HALF + CORNER / 2;
  if (i === 10) return HALF - CORNER / 2;
  return -HALF + CORNER + (i - 1) * TILE + TILE / 2;
}

export interface TileTransform {
  x: number;
  z: number;
  rotY: number;
  w: number;
  d: number;
  corner: boolean;
}

export function tileTransform(id: number): TileTransform {
  const corner = id % 10 === 0;
  const w = corner ? CORNER : TILE;
  const d = CORNER;
  if (id <= 10) return { x: -offset(id), z: HALF - CORNER / 2, rotY: 0, w, d, corner };
  if (id <= 20)
    return { x: -HALF + CORNER / 2, z: HALF - CORNER / 2 - (offset(id - 10) + HALF - CORNER / 2), rotY: -Math.PI / 2, w, d, corner };
  if (id <= 30) return { x: offset(id - 20), z: -HALF + CORNER / 2, rotY: Math.PI, w, d, corner };
  return { x: HALF - CORNER / 2, z: offset(id - 30), rotY: Math.PI / 2, w, d, corner };
}

// Posisi pion di ZONA TENGAH petak. Untuk beberapa pion, susun grid 2x2 kecil
// supaya tidak menumpuk teks nama (atas) / harga (bawah).
const GRID: [number, number][] = [
  [0, 0],
  [-0.18, 0.18],
  [0.18, 0.18],
  [-0.18, -0.18],
];
export function pawnPos(id: number, index: number, count: number): [number, number, number] {
  const t = tileTransform(id);
  if (count <= 1) return [t.x, 0.12, t.z];
  // offset lokal (grid), lalu rotasikan mengikuti orientasi tile
  const [lx, lz] = GRID[index % GRID.length];
  const cos = Math.cos(t.rotY);
  const sin = Math.sin(t.rotY);
  const ox = lx * cos - lz * sin;
  const oz = lx * sin + lz * cos;
  return [t.x + ox, 0.12, t.z + oz];
}

// Jalur pion dari petak a ke b (maju searah jarum jam) — untuk animasi jalan petak-per-petak
export function pathBetween(a: number, b: number): number[] {
  const path: number[] = [];
  let cur = a;
  let guard = 0;
  while (cur !== b && guard++ < 41) {
    cur = (cur + 1) % 40;
    path.push(cur);
  }
  return path;
}
