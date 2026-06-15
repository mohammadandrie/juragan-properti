"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { tileTransform } from "./layout";

export type CameraMode = "overview" | "followPawn";

// Shared ref yang ditulis pion aktif tiap frame (posisi dunia + kesiapan).
export interface PawnFocusRef {
  pos: THREE.Vector3;
  ready: boolean;
}

const OVERVIEW_POS = new THREE.Vector3(0, 9, 8.2);
const CENTER = new THREE.Vector3(0, 0, 0);

// Kamera 2 POV berbasis OrbitControls:
// - wheel = zoom (minDistance/maxDistance), drag = rotate (pitch di-clamp).
// - Overview: target = pusat board.
// - FollowPawn: target = posisi pion aktif (lerp), fallback ke overview bila NaN/belum ready.
// - focusTile: override sementara (preview aset) -> target ke tile tsb.
// - resetSignal: tiap berubah, snap kamera ke angle default mode aktif.
export default function CameraRig({
  mode,
  pawnRef,
  focusTile,
  resetSignal,
  ended,
}: {
  mode: CameraMode;
  pawnRef: React.MutableRefObject<PawnFocusRef>;
  focusTile: number | null;
  resetSignal: number;
  ended: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const scratch = useRef(new THREE.Vector3());

  // Reset / mode change: snap ke angle default mode aktif.
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, mode]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;

    // tentukan target yang diinginkan
    const target = scratch.current;
    if (focusTile != null) {
      const t = tileTransform(focusTile);
      target.set(t.x, 0.2, t.z);
    } else if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      target.copy(pawnRef.current.pos);
    } else {
      target.copy(CENTER); // overview / fallback aman
    }

    const k = 1 - Math.exp(-(focusTile != null ? 5 : 3.5) * delta);
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
