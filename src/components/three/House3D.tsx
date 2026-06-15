"use client";

import { tileTransform } from "./layout";
import { BOARD } from "@/lib/board";

// Bangunan bertingkat per level kepemilikan (1-5), gaya Monopoli:
//   1 = rumah 1 lantai
//   2 = rumah 2 lantai
//   3 = apartemen kecil (3 lantai)
//   4 = apartemen tinggi (5 lantai)
//   5 = tower / gedung (menara ramping + puncak)
// Warna badan mengikuti warna owner agar mudah dikenali. Atap/aksen abu gelap.
// Posisi di strip dalam tile (dekat tepi atas), tidak menutup teks nama/harga/pion.

function Box({
  w,
  h,
  d,
  y,
  color,
  emissive = 0.12,
}: {
  w: number;
  h: number;
  d: number;
  y: number;
  color: string;
  emissive?: number;
}) {
  return (
    <mesh castShadow position={[0, y + h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

// Atap prisma untuk rumah (level 1-2)
function Roof({ size, y }: { size: number; y: number }) {
  return (
    <mesh castShadow position={[0, y + size * 0.3, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[size * 0.82, size * 0.6, 4]} />
      <meshStandardMaterial color="#475569" roughness={0.6} />
    </mesh>
  );
}

function Building({ level, color }: { level: number; color: string }) {
  switch (level) {
    case 1: // rumah 1 lantai
      return (
        <group>
          <Box w={0.26} h={0.18} d={0.26} y={0} color={color} />
          <Roof size={0.2} y={0.18} />
        </group>
      );
    case 2: // rumah 2 lantai
      return (
        <group>
          <Box w={0.26} h={0.32} d={0.26} y={0} color={color} />
          <Roof size={0.2} y={0.32} />
        </group>
      );
    case 3: // apartemen kecil
      return (
        <group>
          <Box w={0.3} h={0.42} d={0.3} y={0} color={color} />
          <Box w={0.34} h={0.04} d={0.34} y={0.42} color="#334155" emissive={0.05} />
        </group>
      );
    case 4: // apartemen tinggi
      return (
        <group>
          <Box w={0.3} h={0.62} d={0.3} y={0} color={color} />
          <Box w={0.34} h={0.05} d={0.34} y={0.62} color="#334155" emissive={0.05} />
        </group>
      );
    case 5: // tower / gedung
      return (
        <group>
          <Box w={0.32} h={0.5} d={0.32} y={0} color={color} />
          <Box w={0.22} h={0.4} d={0.22} y={0.5} color={color} emissive={0.2} />
          {/* puncak menara */}
          <mesh castShadow position={[0, 1.0, 0]}>
            <coneGeometry args={[0.12, 0.22, 4]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} roughness={0.4} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

export default function House3D({
  tileId,
  level,
  ownerColor,
}: {
  tileId: number;
  level: number;
  ownerColor?: string;
}) {
  const t = tileTransform(tileId);
  // hanya properti (kota) yang punya bangunan; bandara/utilitas tidak
  if (level < 1 || BOARD[tileId]?.type !== "property") return null;

  // skala global agar tinggi tower tetap dalam batas pandang & tidak menutup teks
  const scale = 0.85;
  const color = ownerColor ?? "#34d399";

  return (
    <group position={[t.x, 0.15, t.z]} rotation={[0, t.rotY, 0]} scale={scale}>
      {/* geser ke tepi atas tile (zona bangunan), jauh dari pion di tengah */}
      <group position={[0, 0, -t.d / 2 + 0.18]}>
        <Building level={level} color={color} />
      </group>
    </group>
  );
}
