"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Sistem partikel ringan berbasis InstancedMesh.
// kind: "confetti" (beli), "coins" (terima uang), "money" (lembaran uang terbang), "rain" (hujan uang THR)
export interface Burst {
  id: number;
  kind: "confetti" | "coins" | "money" | "rain";
  origin: [number, number, number];
  target?: [number, number, number]; // untuk "money": terbang ke sini
  startedAt: number;
}

const COUNTS: Record<Burst["kind"], number> = { confetti: 60, coins: 24, money: 14, rain: 90 };
const LIFE: Record<Burst["kind"], number> = { confetti: 2.2, coins: 1.6, money: 1.4, rain: 3.5 };

// Warna pecahan rupiah stylized: 100rb merah, 50rb biru, 20rb hijau, 10rb ungu
const MONEY_COLORS = ["#d33b3b", "#3b6fd3", "#3bd36f", "#9b3bd3"];
const CONFETTI_COLORS = ["#f43f5e", "#fbbf24", "#34d399", "#38bdf8", "#a78bfa"];

function ParticleBurst({ burst, onDone }: { burst: Burst; onDone: (id: number) => void }) {
  const count = COUNTS[burst.kind];
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // state awal tiap partikel
  const parts = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const speed = 0.8 + Math.random() * 1.6;
      if (burst.kind === "rain") {
        return {
          pos: new THREE.Vector3((Math.random() - 0.5) * 9, 4 + Math.random() * 3, (Math.random() - 0.5) * 9),
          vel: new THREE.Vector3(0, -1.2 - Math.random(), 0),
          rot: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3),
          color: MONEY_COLORS[i % MONEY_COLORS.length],
        };
      }
      if (burst.kind === "money" && burst.target) {
        return {
          pos: new THREE.Vector3(...burst.origin),
          vel: new THREE.Vector3(), // dihitung per-frame ke target
          rot: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3),
          color: MONEY_COLORS[i % MONEY_COLORS.length],
          delay: i * 0.06,
        };
      }
      return {
        pos: new THREE.Vector3(...burst.origin),
        vel: new THREE.Vector3(Math.cos(a) * speed, 1.6 + Math.random() * 1.8, Math.sin(a) * speed),
        rot: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
        color:
          burst.kind === "coins"
            ? "#fbbf24"
            : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      };
    });
  }, [burst, count]);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const age = (Date.now() - burst.startedAt) / 1000;
    if (age > LIFE[burst.kind]) {
      onDone(burst.id);
      return;
    }
    parts.forEach((p, i) => {
      if (burst.kind === "money" && burst.target) {
        const d = p as typeof p & { delay: number };
        const tt = Math.max(0, Math.min((age - d.delay) / 0.9, 1));
        const e = tt * tt * (3 - 2 * tt);
        const tgt = new THREE.Vector3(...burst.target!);
        const src = new THREE.Vector3(...burst.origin);
        p.pos.lerpVectors(src, tgt, e);
        p.pos.y += Math.sin(tt * Math.PI) * 0.8; // lengkung parabola
      } else {
        p.vel.y -= (burst.kind === "rain" ? 0.4 : 4.5) * delta;
        p.pos.addScaledVector(p.vel, delta);
        if (p.pos.y < 0.02 && burst.kind !== "rain") {
          p.pos.y = 0.02;
          p.vel.multiplyScalar(0.3);
        }
      }
      dummy.position.copy(p.pos);
      dummy.rotation.set(p.rot.x + age * 3, p.rot.y + age * 2, p.rot.z + age * 4);
      const fade = 1 - Math.max(0, (age - LIFE[burst.kind] * 0.6) / (LIFE[burst.kind] * 0.4));
      const s = burst.kind === "coins" ? 0.05 : 1;
      dummy.scale.setScalar(Math.max(fade, 0.01) * s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new THREE.Color(p.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      {burst.kind === "coins" ? (
        <cylinderGeometry args={[1, 1, 0.3, 12]} />
      ) : burst.kind === "money" || burst.kind === "rain" ? (
        <planeGeometry args={[0.22, 0.1]} />
      ) : (
        <planeGeometry args={[0.06, 0.06]} />
      )}
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.5} metalness={burst.kind === "coins" ? 0.7 : 0} />
    </instancedMesh>
  );
}

export default function Particles({ bursts, onDone }: { bursts: Burst[]; onDone: (id: number) => void }) {
  return (
    <>
      {bursts.map((b) => (
        <ParticleBurst key={b.id} burst={b} onDone={onDone} />
      ))}
    </>
  );
}
