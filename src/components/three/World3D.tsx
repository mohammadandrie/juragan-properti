"use client";

import { HALF } from "./layout";

// Dunia di sekeliling papan: hanya platform tebal tempat papan berdiri.
// Miniatur kota dihapus (menutupi pandangan ke papan). Platform dibuat bersih
// agar fokus penuh ke papan permainan. Murni dekoratif, tidak interaktif.

const PLATFORM_HALF = HALF + 4.2;

export default function World3D() {
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
    </group>
  );
}
