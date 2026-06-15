"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { PawnKind } from "@/lib/types";

// Pion catur klasik dibuat prosedural (LatheGeometry: profil 2D diputar 360°).
// Semua kind dirender sama; pembeda antar pemain = warna. Tinggi ±0.52 unit,
// pas di papan petak 1 unit. Ringan: tanpa GLB/skeleton/animasi.

// Profil siluet pion (x = radius dari sumbu, y = tinggi), urut bawah -> atas.
const PROFILE: [number, number][] = [
  [0.001, 0.0],
  [0.2, 0.0], // alas
  [0.2, 0.03],
  [0.165, 0.055],
  [0.14, 0.075], // alur kerah
  [0.16, 0.095], // cincin kerah
  [0.135, 0.115],
  [0.085, 0.155], // masuk ke batang
  [0.07, 0.24], // batang
  [0.066, 0.3],
  [0.1, 0.335], // pelebaran leher
  [0.118, 0.35], // cincin bawah kepala
  [0.07, 0.375],
  [0.001, 0.375], // tutup atas (kepala = sphere terpisah)
];

const HEAD_RADIUS = 0.1;
const HEAD_Y = 0.43;

export default function PawnModel({
  color,
  walking,
  t,
}: {
  kind: PawnKind;
  color: string;
  walking: boolean;
  t: number;
}) {
  const bodyGeom = useMemo(() => {
    const points = PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(points, 40);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // bob halus saat jalan (animasi langkah utama ada di parent Pawn3D)
  const bob = walking ? Math.sin(t * 16) * 0.012 : 0;

  return (
    <group position={[0, bob, 0]}>
      <mesh geometry={bodyGeom} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[0, HEAD_Y, 0]} castShadow receiveShadow>
        <sphereGeometry args={[HEAD_RADIUS, 24, 18]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  );
}
