"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { pawnPos } from "./layout";

// Kamera sinematik: idle orbit pelan; saat pion aktif bergerak, ikuti dari dekat.
export default function CameraRig({
  followTile,
  moving,
  ended,
}: {
  followTile: number; // petak pion yang sedang giliran
  moving: boolean; // pion sedang jalan?
  ended: boolean; // game selesai -> orbit kemenangan
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    let camPos: THREE.Vector3;
    let lookAt: THREE.Vector3;

    if (ended) {
      // orbit kemenangan
      camPos = new THREE.Vector3(Math.sin(t * 0.5) * 5, 3.2, Math.cos(t * 0.5) * 5);
      lookAt = new THREE.Vector3(0, 0.3, 0);
    } else if (moving) {
      // ikuti pion dari belakang-atas
      const p = pawnPos(followTile, 0, 1);
      const toCenter = new THREE.Vector3(p[0], 0, p[2]).normalize();
      camPos = new THREE.Vector3(
        p[0] + toCenter.x * 2.6,
        2.4,
        p[2] + toCenter.z * 2.6
      );
      lookAt = new THREE.Vector3(p[0], 0.2, p[2]);
    } else {
      // pandangan keseluruhan, goyang halus
      camPos = new THREE.Vector3(Math.sin(t * 0.06) * 1.2, 8.8, 8.2);
      lookAt = new THREE.Vector3(0, 0, 0.4);
    }

    const k = 1 - Math.exp(-(moving ? 3.5 : 1.6) * delta);
    camera.position.lerp(camPos, k);
    target.current.lerp(lookAt, k);
    camera.lookAt(target.current);
  });

  return null;
}
