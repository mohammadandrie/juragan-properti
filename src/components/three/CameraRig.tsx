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

// Default kamera: lebih tinggi & sedikit lebih jauh → papan terlihat utuh,
// tidak nunduk. Pitch tetap bisa dinaik-turunkan user.
const OVERVIEW_POS = new THREE.Vector3(0, 13, 11);
const TOPDOWN_POS = new THREE.Vector3(0, 16, 0.001);
const CENTER = new THREE.Vector3(0, 0, 0);

// Kamera 3 mode:
// - Overview: target = pusat papan; user bebas orbit/zoom.
// - followPawn: kunci ke pion LOKAL.
//     * Target = pion lokal (selalu menatap pion sendiri, tak pernah pemain lain).
//     * Pitch (atas-bawah) & jarak (zoom) dikontrol penuh oleh user — TIDAK
//       di-reset saat pion bergerak.
//     * Azimuth (kiri-kanan) di-orient otomatis dari arah radial pusat→pion
//       (kamera selalu di sisi luar menghadap ke dalam papan).
//     * Saat pion lokal BERJALAN, kamera ikut bergeser mengikuti pion (smooth)
//       tanpa mengubah pitch/zoom — tidak ada reset mendadak.
// - topDown: untuk panel pilih properti / list.
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
  moving: boolean; // hanya true saat PION LOKAL bergerak
  destTile: number | null;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const scratch = useRef(new THREE.Vector3());
  const scratch2 = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());

  // snap kamera ke angle default sesuai mode aktif (saat ganti mode / reset)
  function snapToMode() {
    const c = controls.current;
    if (!c) return;
    if (mode === "topDown") {
      camera.position.copy(TOPDOWN_POS);
      c.target.copy(CENTER);
    } else if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      const p = pawnRef.current.pos;
      camera.position.set(p.x, p.y + 8, p.z + 6);
      c.target.set(p.x, p.y, p.z);
    } else {
      camera.position.copy(OVERVIEW_POS);
      c.target.copy(CENTER);
    }
    c.update();
  }

  // hanya snap saat MODE berubah / reset eksplisit — tidak saat pion bergerak.
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
      target.copy(CENTER);
      lerpTarget(c, target, delta, speed);
      c.update();
      return;
    }

    if (focusTile != null) {
      const t = tileTransform(focusTile);
      target.set(t.x, 0.2, t.z);
      speed = 5;
      orientAzimuth(camera, c, scratch2.current, dir.current, target, delta, speed, true);
      lerpTarget(c, target, delta, speed);
      c.update();
      return;
    }

    if (mode === "followPawn" && pawnRef.current.ready && isValid(pawnRef.current.pos)) {
      // selalu kunci ke pion LOKAL — tak peduli giliran siapa
      target.copy(pawnRef.current.pos);
      // azimuth selalu di-orient ke arah radial keluar pion lokal,
      // tapi pitch/zoom milik user TIDAK diubah. Kamera bergeser smooth
      // mengikuti pion (target bergeser → orientAzimuth menyesuaikan posisi
      // horizontalnya). Pitch user (sumbu Y) tidak disentuh.
      orientAzimuth(camera, c, scratch2.current, dir.current, target, delta, speed, true);
      lerpTarget(c, target, delta, speed);
      c.update();
      return;
    }

    // overview: user bebas orbit, target = pusat (atau dest cinematic)
    if (mode === "overview" && moving && destTile != null) {
      const t = tileTransform(destTile);
      target.set(t.x, 0.2, t.z);
      if (pawnRef.current.ready && isValid(pawnRef.current.pos)) {
        target.lerp(pawnRef.current.pos, 0.45);
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

// Override AZIMUTH kamera ke arah radial keluar dari pusat → target,
// PERTAHANKAN pitch (sudut atas-bawah) & radius (zoom) milik user.
// Caranya: pisahkan posisi kamera relatif target ke (y vertikal) + (horizontal
// length). Putar horizontal-nya ke arah radial baru. Pitch & jarak tetap.
function orientAzimuth(
  camera: THREE.Camera,
  c: OrbitControlsImpl,
  scratch: THREE.Vector3,
  dir: THREE.Vector3,
  target: THREE.Vector3,
  delta: number,
  speed: number,
  follow: boolean
) {
  dir.set(target.x - CENTER.x, 0, target.z - CENTER.z);
  if (dir.lengthSq() < 0.0004) return;
  dir.normalize();

  scratch.copy(camera.position).sub(c.target);
  const radius = scratch.length();
  if (radius < 0.0001) return;
  const y = scratch.y;
  const horizLen = Math.sqrt(Math.max(0, radius * radius - y * y));

  const targetCamX = target.x + dir.x * horizLen;
  const targetCamZ = target.z + dir.z * horizLen;
  const targetCamY = target.y + y;

  if (follow) {
    const k = 1 - Math.exp(-speed * delta);
    camera.position.x += (targetCamX - camera.position.x) * k;
    camera.position.y += (targetCamY - camera.position.y) * k;
    camera.position.z += (targetCamZ - camera.position.z) * k;
  }
}

function isValid(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}
