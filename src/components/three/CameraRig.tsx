"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Fallback aman: overview camera seperti versi yang tadi sempat working.
// Nanti GTA follow dibalikin setelah root cause blank ketemu.
export default function CameraRig({
  moving,
  ended,
}: {
  followTile: number;
  moving: boolean;
  ended: boolean;
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    let camPos: THREE.Vector3;
    let lookAt: THREE.Vector3;

    if (ended) {
      camPos = new THREE.Vector3(Math.sin(t * 0.5) * 5, 3.2, Math.cos(t * 0.5) * 5);
      lookAt = new THREE.Vector3(0, 0.3, 0);
    } else {
      camPos = new THREE.Vector3(Math.sin(t * 0.06) * 1.2, 8.8, 8.2);
      lookAt = new THREE.Vector3(0, 0, 0.4);
    }

    const k = 1 - Math.exp(-(moving ? 4.5 : 2.2) * delta);
    camera.position.lerp(camPos, k);
    target.current.lerp(lookAt, k);
    camera.lookAt(target.current);
  });

  return null;
}

