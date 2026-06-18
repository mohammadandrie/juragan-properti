"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Rotasi agar muka `n` menghadap atas.
// Penting: nilai harus benar-benar menempatkan muka `n` di +Y. Muka 2 ada di
// sisi +X, muka 5 di sisi −X. Untuk membawa +X → +Y butuh rotasi Z = +90°,
// dan −X → +Y butuh rotasi Z = −90° (sebelumnya tertukar → dadu menampilkan
// angka berbeda dari nilai backend/popup).
const FACE_ROT: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [0, 0, Math.PI / 2],
  3: [Math.PI / 2, 0, 0],
  4: [-Math.PI / 2, 0, 0],
  5: [0, 0, -Math.PI / 2],
  6: [Math.PI, 0, 0],
};

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.16, -0.16], [0.16, 0.16]],
  3: [[-0.16, -0.16], [0, 0], [0.16, 0.16]],
  4: [[-0.16, -0.16], [-0.16, 0.16], [0.16, -0.16], [0.16, 0.16]],
  5: [[-0.16, -0.16], [-0.16, 0.16], [0, 0], [0.16, -0.16], [0.16, 0.16]],
  6: [[-0.16, -0.16], [-0.16, 0], [-0.16, 0.16], [0.16, -0.16], [0.16, 0], [0.16, 0.16]],
};

const FACES: { value: number; pos: [number, number, number]; rot: [number, number, number] }[] = [
  { value: 1, pos: [0, 0.276, 0], rot: [-Math.PI / 2, 0, 0] },
  { value: 6, pos: [0, -0.276, 0], rot: [Math.PI / 2, 0, 0] },
  { value: 2, pos: [0.276, 0, 0], rot: [0, Math.PI / 2, 0] },
  { value: 5, pos: [-0.276, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { value: 3, pos: [0, 0, -0.276], rot: [0, Math.PI, 0] },
  { value: 4, pos: [0, 0, 0.276], rot: [0, 0, 0] },
];

// Dadu "fisik": dilempar dari atas, melambung dengan gravitasi, mantul 2x, lalu snap ke nilai.
function Die({
  value,
  x,
  seed,
  onSettled,
}: {
  value: number;
  x: number;
  seed: number;
  onSettled?: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const phase = useRef<"fly" | "settle">("fly");
  const settledNotified = useRef(false);
  const vel = useRef({ y: 0, t: 0 });

  useEffect(() => {
    phase.current = "fly";
    settledNotified.current = false;
    vel.current = { y: 4 + (seed % 10) * 0.1, t: 0 };
    const g = ref.current;
    if (g) {
      g.position.y = 2.2;
      g.position.x = x + Math.sin(seed) * 0.3;
      g.position.z = Math.cos(seed) * 0.3;
    }
  }, [value, seed, x]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    if (phase.current === "fly") {
      vel.current.t += delta;
      vel.current.y -= 20 * delta; // gravitasi lebih kuat (realistic)
      g.position.y += vel.current.y * delta;
      g.rotation.x += delta * (11 + (seed % 6)); // spin lebih cepat
      g.rotation.y += delta * 9;
      g.rotation.z += delta * 7;
      // mantul di "meja" (y=0.3)
      if (g.position.y <= 0.3) {
        g.position.y = 0.3;
        if (Math.abs(vel.current.y) > 1.2) {
          vel.current.y = -vel.current.y * 0.35; // bounce lebih realistis (kehilangan energy lebih banyak)
        } else {
          phase.current = "settle";
        }
      }
      // geser perlahan ke posisi akhir
      g.position.x += (x - g.position.x) * delta * 2;
      g.position.z += (0 - g.position.z) * delta * 2;
    } else {
      // snap halus ke rotasi muka yang benar
      const [tx, ty, tz] = FACE_ROT[value] ?? [0, 0, 0];
      const k = 1 - Math.exp(-12 * delta);
      g.rotation.x += shortAngle(g.rotation.x, tx) * k;
      g.rotation.y += shortAngle(g.rotation.y, ty) * k;
      g.rotation.z += shortAngle(g.rotation.z, tz) * k;
      g.position.y += (0.3 - g.position.y) * k;
      g.position.x += (x - g.position.x) * k;
      g.position.z += (0 - g.position.z) * k;
      
      // Cek convergence: semua 3 axis harus dekat target
      const dx = Math.abs(shortAngle(g.rotation.x, tx));
      const dy = Math.abs(shortAngle(g.rotation.y, ty));
      const dz = Math.abs(shortAngle(g.rotation.z, tz));
      const isFullySettled = dx < 0.05 && dy < 0.05 && dz < 0.05;

      // Dadu snap deterministik ke FACE_ROT[value] → muka `value` selalu di atas.
      // Cukup beri tahu saat sudah benar-benar diam; nilai yang tampil = value.
      if (!settledNotified.current && isFullySettled) {
        settledNotified.current = true;
        onSettled?.();
      }
    }
  });

  return (
    <group ref={ref} position={[x, 0.3, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
      </mesh>
      {FACES.map((f) => (
        <group key={f.value} position={f.pos} rotation={f.rot}>
          {PIPS[f.value].map(([px, py], i) => (
            <mesh key={i} position={[px, py, 0.002]}>
              <circleGeometry args={[0.05, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function shortAngle(from: number, to: number): number {
  const diff = (to - from) % (Math.PI * 2);
  return diff > Math.PI ? diff - Math.PI * 2 : diff < -Math.PI ? diff + Math.PI * 2 : diff;
}

export default function Dice3D({
  dice,
  rollId,
  onAllSettled,
}: {
  dice: [number, number] | null;
  rollId: number;
  onAllSettled?: () => void;
}) {
  // rollId berubah tiap lemparan agar dadu dilempar ulang walau nilainya sama
  const [visible, setVisible] = useState(false);
  const settledCount = useRef(0);
  const hasReportedRef = useRef(false);
  useEffect(() => {
    if (dice) setVisible(true);
    settledCount.current = 0;
    hasReportedRef.current = false;
  }, [dice, rollId]);
  if (!dice || !visible) return null;
  // Kedua dadu snap ke FACE_ROT[value]; saat keduanya diam → beri tahu sekali.
  const handleSettled = () => {
    settledCount.current++;
    if (settledCount.current >= 2 && !hasReportedRef.current) {
      hasReportedRef.current = true;
      onAllSettled?.();
    }
  };
  return (
    <group position={[0, 0, 1.2]}>
      <Die value={dice[0]} x={-0.45} seed={rollId * 7 + 1} onSettled={handleSettled} />
      <Die value={dice[1]} x={0.45} seed={rollId * 13 + 5} onSettled={handleSettled} />
    </group>
  );
}
