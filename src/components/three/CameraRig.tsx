"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { tileTransform } from "./layout";

export type CameraMode = "overview" | "followPawn" | "cinematic";

// Shared ref yang ditulis pion lokal tiap frame (posisi dunia + kesiapan).
export interface PawnFocusRef {
  pos: THREE.Vector3;
  ready: boolean;
}

const OVERVIEW_POS = new THREE.Vector3(0, 9, 8.2);
const CENTER = new THREE.Vector3(0, 0, 0);

// Kamera 3 mode berbasis OrbitControls:
// - wheel = zoom (minDistance/maxDistance), drag = rotate (pitch di-clamp).
// - Overview: target = pusat board.
// - followPawn: target = posisi pion LOKAL (lerp), fallback overview bila NaN/belum ready.
// - cinematic: saat pion bergerak, target condong ke tile tujuan lalu kembali
//   ke mode dasar; selalu validasi target (anti blank screen).
// - focusTile: override sementara (preview aset) -> target ke tile tsb.
// - resetSignal / double-click: snap kamera ke angle default mode aktif.
export default function CameraRig({
  mode,
  pawnRef,
  focusTile,
  resetSignal,
  ended,
  moving,
  destTile,
}: {
  mode: CameraMode;
  pawnRef: React.MutableRefObject<PawnFocusRef>;
  focusTile: number | null;
  resetSignal: number;
  ended: boolean;
  moving: boolean;
  destTile: number | null;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
  const scratch = useRef(new THREE.Vector3());

  // snap kamera ke angle default sesuai mode aktif
  function snapToMode() {
    const c = controls.current;
    if (!c) return;
    if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      const p = pawnRef.current.pos;
      camera.position.set(p.x, p.y + 4, p.z + 4.2);
      c.target.set(p.x, p.y, p.z);
    } else {
      camera.position.copy(OVERVIEW_POS);
      c.target.copy(CENTER);
    }
    c.update();
  }

  // Reset / mode change: snap ke angle default.
  useEffect(() => {
    snapToMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, mode]);

  // double-click pada canvas = reset kamera
  useEffect(() => {
    const el = gl.domElement;
    const onDbl = () => snapToMode();
    el.addEventListener("dblclick", onDbl);
    return () => el.removeEventListener("dblclick", onDbl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, mode]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;

    // tentukan target yang diinginkan (selalu fallback aman)
    const target = scratch.current;
    let speed = 3.5;

    if (focusTile != null) {
      const t = tileTransform(focusTile);
      target.set(t.x, 0.2, t.z);
      speed = 5;
    } else if (mode === "cinematic" && moving && destTile != null) {
      // condong ke tujuan + sedikit ke pion (jika valid)
      const t = tileTransform(destTile);
      const dest = scratch.current.set(t.x, 0.2, t.z);
      if (pawnRef.current.ready && isValid(pawnRef.current.pos)) {
        dest.lerp(pawnRef.current.pos, 0.45);
      }
      target.copy(dest);
      speed = 2.5;
    } else if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      target.copy(pawnRef.current.pos);
    } else {
      target.copy(CENTER); // overview / fallback aman
    }

    // jaga-jaga: target tak valid -> pusat board
    if (!isValid(target)) target.copy(CENTER);

    const k = 1 - Math.exp(-speed * delta);
    c.target.lerp(target, k);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={4.5}
      maxDistance={15}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.25}
      autoRotate={ended}
      autoRotateSpeed={1.2}
    />
  );
}

function isValid(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
