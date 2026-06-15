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

// Jendela kecil emissive (lampu) sebagai aksen di sisi depan bangunan.
function Windows({ y, w, rows, color = "#fde68a" }: { y: number; w: number; rows: number; color?: string }) {
  const items = [];
  const cols = 2;
  const gap = w / (cols + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push(
        <mesh key={`${r}-${c}`} position={[-w / 2 + gap * (c + 1), y + 0.07 + r * 0.1, w / 2 + 0.001]}>
          <planeGeometry args={[0.04, 0.05]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
        </mesh>
      );
    }
  }
  return <>{items}</>;
}

function Building({ level, color }: { level: number; color: string }) {
  switch (level) {
    case 1: // rumah kecil 1 lantai + atap pelana
      return (
        <group>
          <Box w={0.28} h={0.16} d={0.26} y={0} color={color} />
          <Roof size={0.21} y={0.16} />
          {/* pintu */}
          <mesh position={[0, 0.05, 0.131]}>
            <planeGeometry args={[0.06, 0.09]} />
            <meshStandardMaterial color="#3f2d1d" />
          </mesh>
        </group>
      );
    case 2: // rumah 2 lantai
      return (
        <group>
          <Box w={0.3} h={0.34} d={0.28} y={0} color={color} />
          <Roof size={0.23} y={0.34} />
          <Windows y={0.02} w={0.3} rows={2} />
        </group>
      );
    case 3: // apartemen kecil (atap datar, 3 lantai)
      return (
        <group>
          <Box w={0.32} h={0.46} d={0.3} y={0} color={color} />
          <Box w={0.36} h={0.04} d={0.34} y={0.46} color="#334155" emissive={0.05} />
          <Windows y={0.04} w={0.32} rows={3} />
        </group>
      );
    case 4: // apartemen tinggi ramping
      return (
        <group>
          <Box w={0.3} h={0.66} d={0.3} y={0} color={color} />
          <Box w={0.34} h={0.05} d={0.34} y={0.66} color="#334155" emissive={0.05} />
          {/* setback atas */}
          <Box w={0.18} h={0.12} d={0.18} y={0.71} color={color} emissive={0.15} />
          <Windows y={0.05} w={0.3} rows={5} color="#bae6fd" />
        </group>
      );
    case 5: // gedung / tower bertingkat + mahkota
      return (
        <group>
          <Box w={0.34} h={0.5} d={0.34} y={0} color={color} />
          <Box w={0.26} h={0.4} d={0.26} y={0.5} color={color} emissive={0.18} />
          <Box w={0.16} h={0.28} d={0.16} y={0.9} color={color} emissive={0.25} />
          {/* puncak menara */}
          <mesh castShadow position={[0, 1.28, 0]}>
            <coneGeometry args={[0.1, 0.22, 4]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} roughness={0.4} />
          </mesh>
          {/* antena */}
          <mesh position={[0, 1.46, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
          </mesh>
          <Windows y={0.06} w={0.34} rows={4} color="#fde68a" />
        </group>
      );
    default:
      return null;
  }
}

// Marker untuk bandara: menara ATC kecil.
function AirportMarker({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 0.36, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.12, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// Marker untuk utilitas: tiang listrik kecil.
function UtilityMarker({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.32, 6]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* lengan atas */}
      <mesh castShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.02]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
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
  const tile = BOARD[tileId];
  if (!tile || level < 1) return null;

  const color = ownerColor ?? "#34d399";
  const scale = 1.05;

  // Bandara & Utilitas dapat marker tetap (tak tergantung level karena tak bisa upgrade)
  if (tile.type === "airport" || tile.type === "utility") {
    return (
      <group position={[t.x, 0.15, t.z]} rotation={[0, t.rotY, 0]} scale={scale}>
        <group position={[0, 0, -t.d / 2 + 0.18]}>
          {tile.type === "airport" ? <AirportMarker color={color} /> : <UtilityMarker color={color} />}
        </group>
      </group>
    );
  }
  if (tile.type !== "property") return null;

  return (
    <group position={[t.x, 0.15, t.z]} rotation={[0, t.rotY, 0]} scale={scale}>
      <group position={[0, 0, -t.d / 2 + 0.18]}>
        <Building level={level} color={color} />
      </group>
    </group>
  );
}
