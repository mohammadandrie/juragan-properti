"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { tileTransform } from "./layout";

export type CameraMode = "overview" | "followPawn" | "topDown";

// Shared ref yang ditulis pion lokal tiap frame (posisi dunia + kesiapan).
export interface PawnFocusRef {
  pos: THREE.Vector3;
  ready: boolean;
}

const OVERVIEW_POS = new THREE.Vector3(0, 11, 9.5);
const TOPDOWN_POS = new THREE.Vector3(0, 14, 0.001);
const CENTER = new THREE.Vector3(0, 0, 0);

// Kamera 3 mode berbasis OrbitControls:
// - Overview: target = pusat papan, user bebas orbit/zoom/pitch.
// - followPawn: target lerp ke pion lokal. Kamera mengikuti AZIMUTH (kiri-kanan)
//   dari arah radial keluar papan, tapi PITCH & JARAK (zoom) tetap dikontrol
//   user — jadi user bebas menaik-turunkan kamera & zoom sambil tetap di-follow.
// - topDown: dipakai saat memilih properti yang akan dijual / lihat list.
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
  const { camera } = useThree();
  const scratch = useRef(new THREE.Vector3());
  const desiredCam = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());

  // snap kamera ke angle default sesuai mode aktif
  function snapToMode() {
    const c = controls.current;
    if (!c) return;
    if (mode === "topDown") {
      camera.position.copy(TOPDOWN_POS);
      c.target.copy(CENTER);
    } else if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      const p = pawnRef.current.pos;
      camera.position.set(p.x, p.y + 6, p.z + 5.5);
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

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const target = scratch.current;
    let speed = 3.5;

    if (mode === "topDown") {
      target.copy(CENTER); // user bisa orbit/zoom dari atas
    } else if (focusTile != null) {
      // sorot tile tertentu — kamera ikut menyamping ke sisi luar tile
      const t = tileTransform(focusTile);
      target.set(t.x, 0.2, t.z);
      speed = 5;
      followAzimuthOnly(camera, c, desiredCam.current, dir.current, target, delta, speed);
      lerpTarget(c, target, delta, speed);
      c.update();
      return;
    } else if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      target.copy(pawnRef.current.pos);
      // saat pion BERJALAN, paksa azimuth follow (kiri-kanan kamera reset ngikut
      // pion). Saat pion DIAM, biarkan user bebas orbit kiri-kanan.
      if (moving) {
        followAzimuthOnly(camera, c, desiredCam.current, dir.current, target, delta, speed);
      }
    } else if (mode === "overview" && moving && destTile != null) {
      const t = tileTransform(destTile);
      const dest = target.set(t.x, 0.2, t.z);
      if (pawnRef.current.ready && isValid(pawnRef.current.pos)) {
        dest.lerp(pawnRef.current.pos, 0.45);
      }
      speed = 2.5;
    } else {
      target.copy(CENTER);
    }

    if (!isValid(target)) target.copy(CENTER);
    lerpTarget(c, target, delta, speed);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={5}
      maxDistance={18}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI / 2.05}
      autoRotate={ended}
      autoRotateSpeed={1.2}
    />
  );
}

function lerpTarget(c: OrbitControlsImpl, target: THREE.Vector3, delta: number, speed: number) {
  const k = 1 - Math.exp(-speed * delta);
  c.target.lerp(target, k);
}

// Geser kamera horizontal mengikuti target (azimuth/follow), TANPA mengubah
// pitch & jarak (radius) yang dikendalikan user. Caranya: konversi posisi
// kamera relatif-target ke spherical, override theta-nya jadi arah radial
// keluar papan, lalu rekonstruksi posisi.
function followAzimuthOnly(
  camera: THREE.Camera,
  c: OrbitControlsImpl,
  scratch: THREE.Vector3,
  dir: THREE.Vector3,
  target: THREE.Vector3,
  delta: number,
  speed: number
) {
  // arah radial keluar: dari pusat papan ke target
  dir.set(target.x - CENTER.x, 0, target.z - CENTER.z);
  if (dir.lengthSq() < 0.0004) return;
  dir.normalize();

  // spherical sekarang relatif target
  scratch.copy(camera.position).sub(c.target);
  const radius = scratch.length();
  if (radius < 0.0001) return;
  const y = scratch.y;
  const horizLen = Math.sqrt(Math.max(0, radius * radius - y * y));

  // posisi horizontal baru: di arah radial keluar dari target, sejauh horizLen
  const targetCamX = target.x + dir.x * horizLen;
  const targetCamZ = target.z + dir.z * horizLen;
  const targetCamY = target.y + y;

  const k = 1 - Math.exp(-speed * delta);
  camera.position.x += (targetCamX - camera.position.x) * k;
  camera.position.z += (targetCamZ - camera.position.z) * k;
  camera.position.y += (targetCamY - camera.position.y) * k;
}

function isValid(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
