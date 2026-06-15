"use client";

import { useMemo } from "react";
import { HALF } from "./layout";

// Dunia di sekeliling papan: platform tebal tempat papan berdiri + miniatur
// kota low-poly (rumah, apartemen, tower) yang tersebar di luar papan.
// Murni dekoratif, tidak interaktif. Dibuat deterministik (tanpa Math.random
// di render) agar stabil antar-frame & SSR-safe.

const PLATFORM_HALF = HALF + 4.2;

// Bangunan dekoratif kecil — kotak bertingkat + atap sederhana.
function MiniBuilding({
  x,
  z,
  h,
  w,
  color,
  roof,
}: {
  x: number;
  z: number;
  h: number;
  w: number;
  color: string;
  roof?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
      </mesh>
      {roof ? (
        <mesh castShadow position={[0, h + w * 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[w * 0.78, w * 0.5, 4]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      ) : (
        // atap datar gedung — sedikit lebih gelap
        <mesh castShadow position={[0, h + 0.03, 0]}>
          <boxGeometry args={[w * 1.05, 0.06, w * 1.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// PRNG deterministik sederhana (mulberry32) — tidak pakai Math.random saat render.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITY_COLORS = ["#64748b", "#475569", "#52606d", "#5b6b7d", "#6b7280", "#7c8794"];

interface Deco {
  x: number;
  z: number;
  h: number;
  w: number;
  color: string;
  roof: boolean;
}

export default function World3D() {
  // sebar bangunan di "cincin" antara tepi papan dan tepi platform
  const decos = useMemo<Deco[]>(() => {
    const rnd = mulberry32(20260615);
    const out: Deco[] = [];
    const inner = HALF + 0.8;
    const outer = PLATFORM_HALF - 0.6;
    const count = 46;
    for (let i = 0; i < count; i++) {
      // pilih sisi & posisi sepanjang cincin persegi
      const t = rnd();
      const along = (rnd() * 2 - 1) * outer;
      const depth = inner + rnd() * (outer - inner);
      let x: number, z: number;
      if (t < 0.25) {
        x = along;
        z = depth;
      } else if (t < 0.5) {
        x = along;
        z = -depth;
      } else if (t < 0.75) {
        x = depth;
        z = along;
      } else {
        x = -depth;
        z = along;
      }
      const tall = rnd() > 0.55;
      const h = tall ? 0.9 + rnd() * 2.6 : 0.4 + rnd() * 0.6;
      const w = tall ? 0.34 + rnd() * 0.28 : 0.4 + rnd() * 0.3;
      out.push({
        x,
        z,
        h,
        w,
        color: CITY_COLORS[Math.floor(rnd() * CITY_COLORS.length)],
        roof: !tall,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {/* platform besar tebal — papan berdiri di atasnya */}
      <mesh receiveShadow position={[0, -0.55, 0]}>
        <boxGeometry args={[PLATFORM_HALF * 2, 0.9, PLATFORM_HALF * 2]} />
        <meshStandardMaterial color="#15233a" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* permukaan platform (lapisan atas lebih terang) */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[PLATFORM_HALF * 2 - 0.3, 0.06, PLATFORM_HALF * 2 - 0.3]} />
        <meshStandardMaterial color="#1c2e49" roughness={0.7} metalness={0.15} />
      </mesh>

      {/* miniatur kota di sekeliling */}
      {decos.map((d, i) => (
        <MiniBuilding key={i} x={d.x} z={d.z} h={d.h} w={d.w} color={d.color} roof={d.roof} />
      ))}
    </group>
  );
}
