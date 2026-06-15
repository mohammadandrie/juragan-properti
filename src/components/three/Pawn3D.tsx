"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { PawnKind } from "@/lib/types";
import { pawnPos, pathBetween } from "./layout";
import PawnModel from "./PawnModel";
import type { PawnFocusRef } from "./CameraRig";

const STEP_DURATION = 0.28; // detik per petak
const START_DELAY = 0.75; // jeda sebelum jalan: beri waktu dadu mendarat & angka terbaca

export default function Pawn3D({
  color,
  pawn,
  tileId,
  index,
  count,
  active,
  emote,
  focusRef,
  reportFocus,
}: {
  color: string;
  pawn: PawnKind;
  tileId: number;
  index: number;
  count: number;
  active?: boolean;
  emote?: { icon: string; at: number } | null;
  focusRef?: React.MutableRefObject<PawnFocusRef>;
  reportFocus?: boolean; // tulis posisi ke focusRef (pion lokal), lepas dari `active`
}) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  // antrean petak yang harus dilalui
  const queue = useRef<number[]>([]);
  const visual = useRef<number>(tileId); // petak yang sedang ditampilkan
  const stepT = useRef(0);
  const delay = useRef(0); // sisa jeda awal sebelum melangkah
  const [walking, setWalking] = useState(false);

  // tileId berubah -> hitung jalur jalan
  useEffect(() => {
    if (visual.current === tileId) return;
    queue.current = pathBetween(visual.current, tileId);
    // jika mundur (kartu moveBack) jalurnya kepanjangan; teleport halus saja
    if (queue.current.length > 12) queue.current = [tileId];
    stepT.current = 0;
    delay.current = START_DELAY; // tunggu dadu mendarat dulu
    setWalking(true);
  }, [tileId]);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;

    // jeda awal: pion diam DI PETAK ASAL (bukan tujuan) — dadu mendarat, tile
    // tujuan glow, angka terbaca. Park posisi di visual.current agar tidak
    // "teleport ke tujuan lalu balik jalan".
    if (delay.current > 0 && queue.current.length > 0) {
      delay.current -= delta;
      const here = pawnPos(visual.current, index, count);
      g.position.set(here[0], here[1], here[2]);
      // tetap lapor posisi ke kamera agar follow stabil saat menunggu
      if (reportFocus && focusRef) {
        focusRef.current.pos.set(here[0], here[1], here[2]);
        focusRef.current.ready = true;
      }
      return;
    }

    if (queue.current.length > 0) {
      stepT.current += delta / STEP_DURATION;
      const from = pawnPos(visual.current, index, count);
      const to = pawnPos(queue.current[0], index, count);
      const k = Math.min(stepT.current, 1);
      // easing + lompatan parabola antar petak
      const e = k * k * (3 - 2 * k);
      g.position.x = from[0] + (to[0] - from[0]) * e;
      g.position.z = from[2] + (to[2] - from[2]) * e;
      g.position.y = from[1] + Math.sin(k * Math.PI) * 0.22;
      // hadap arah jalan
      const ang = Math.atan2(to[0] - from[0], to[2] - from[2]);
      g.rotation.y = ang + Math.PI;
      if (k >= 1) {
        visual.current = queue.current.shift()!;
        stepT.current = 0;
        if (queue.current.length === 0) setWalking(false);
      }
    } else {
      const target = pawnPos(visual.current, index, count);
      const k = 1 - Math.exp(-8 * delta);
      g.position.x += (target[0] - g.position.x) * k;
      g.position.z += (target[2] - g.position.z) * k;
      g.position.y = target[1] + (active ? 0.02 * (1 + Math.sin(t * 4)) : 0);
    }

    // pion aktif sedikit lebih besar; base dikecilkan agar proporsional dgn petak
    const s = active ? 1.0 : 0.85;
    g.scale.x += (s - g.scale.x) * Math.min(delta * 6, 1);
    g.scale.y = g.scale.x;
    g.scale.z = g.scale.x;

    // pion lokal lapor posisi dunia ke shared ref (untuk kamera follow)
    if (reportFocus && focusRef) {
      focusRef.current.pos.set(g.position.x, g.position.y, g.position.z);
      focusRef.current.ready = true;
    }
  });

  const showEmote = emote && Date.now() - emote.at < 3000;
  const start = pawnPos(tileId, index, count);

  return (
    <group ref={ref} position={[start[0], start[1], start[2]]}>
      <group ref={inner}>
        <PawnTime walking={walking} kind={pawn} color={color} />
      </group>
      {active && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.22, 28]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      )}
      {showEmote && <EmoteBubble icon={emote!.icon} />}
    </group>
  );
}

// wrapper agar PawnModel dapat waktu animasi dari useFrame
function PawnTime({ kind, color, walking }: { kind: PawnKind; color: string; walking: boolean }) {
  const [t, setT] = useState(0);
  useFrame(({ clock }) => setT(clock.elapsedTime));
  return <PawnModel kind={kind} color={color} walking={walking} t={t} />;
}

function EmoteBubble({ icon }: { icon: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock, camera }) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = 0.62 + Math.sin(clock.elapsedTime * 3) * 0.03;
    g.quaternion.copy(camera.quaternion); // selalu hadap kamera
  });
  return (
    <group ref={ref} position={[0, 0.62, 0]}>
      <Text fontSize={0.3} anchorX="center" anchorY="middle">
        {icon}
      </Text>
    </group>
  );
}
