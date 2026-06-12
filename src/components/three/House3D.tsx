"use client";

import { tileTransform } from "./layout";

// Satu rumah kecil: badan kubus + atap prisma
function House({ position, hotel }: { position: [number, number, number]; hotel?: boolean }) {
  const s = hotel ? 0.22 : 0.13;
  const color = hotel ? "#ef4444" : "#34d399";
  return (
    <group position={position}>
      <mesh castShadow position={[0, s / 2, 0]}>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, s + s * 0.3, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[s * 0.78, s * 0.6, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Rumah-rumah di atas strip warna sebuah petak (houses 1-4, 5 = hotel)
export default function House3D({ tileId, houses }: { tileId: number; houses: number }) {
  const t = tileTransform(tileId);
  if (houses <= 0) return null;

  return (
    <group position={[t.x, 0.15, t.z]} rotation={[0, t.rotY, 0]}>
      {houses === 5 ? (
        <House position={[0, 0, -t.d / 2 + 0.16]} hotel />
      ) : (
        Array.from({ length: houses }, (_, i) => (
          <House
            key={i}
            position={[(i - (houses - 1) / 2) * 0.2, 0, -t.d / 2 + 0.16]}
          />
        ))
      )}
    </group>
  );
}
