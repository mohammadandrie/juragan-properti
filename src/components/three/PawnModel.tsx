"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { PawnKind } from "@/lib/types";

// Radius target agar semua pion berukuran seragam di papan.
const TARGET_RADIUS = 0.3;

type PawnConfig = {
  url: string;
  // Klip animasi: idle/walk dipakai bergantian; `always` selalu diputar
  // (model dengan satu klip), timeScale naik saat jalan.
  idle?: string;
  walk?: string;
  always?: string;
  // Rotasi Y agar model menghadap -Z (konvensi arah jalan dari parent).
  rotateY: number;
  // Ketinggian melayang + amplitudo/frekuensi naik-turun (pakai `t`).
  lift?: number;
  bobAmp?: number;
  bobFreq?: number;
};

const CONFIGS: Record<PawnKind, PawnConfig> = {
  default: { url: "/models/default.glb", idle: "Idle", walk: "Walk", rotateY: 0 },
  bajaj: { url: "/models/bajaj.glb", always: "horse_A_", rotateY: 0 },
  pinisi: { url: "/models/pinisi.glb", always: "storkFly_B_", rotateY: 0, lift: 0.06, bobAmp: 0.02, bobFreq: 2.2 },
  komodo: { url: "/models/komodo.glb", idle: "Survey", walk: "Walk", rotateY: 0 },
  garuda: { url: "/models/garuda.glb", always: "flamingo_flyA_", rotateY: 0, lift: 0.12, bobAmp: 0.02, bobFreq: 3 },
  ojek: { url: "/models/ojek.glb", always: "Holobike_Loop", rotateY: 0 },
};

Object.values(CONFIGS).forEach((c) => useGLTF.preload(c.url));

export default function PawnModel({ kind, color, walking, t }: { kind: PawnKind; color: string; walking: boolean; t: number }) {
  const config = CONFIGS[kind] ?? CONFIGS.default;
  const { scene, animations } = useGLTF(config.url);

  // Clone per instance (SkeletonUtils untuk skinned mesh) + clone material
  // agar warna tiap pemain tidak saling menimpa. Skala dihitung dari
  // bounding sphere supaya semua model pas di TARGET_RADIUS.
  const { clonedScene, scale, groundOffset } = useMemo(() => {
    const cloned = cloneSkeleton(scene);
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const scale = TARGET_RADIUS / (sphere.radius || 1);
    return { clonedScene: cloned, scale, groundOffset: -box.min.y * scale };
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if ((mat as THREE.MeshStandardMaterial).color) {
          (mat as THREE.MeshStandardMaterial).color.set(color);
        }
      }
    });
  }, [clonedScene, color]);

  const { actions } = useAnimations(animations, clonedScene);

  useEffect(() => {
    const pick = (name?: string) => (name ? actions[name] : null);
    const action =
      pick(config.always) ??
      pick(walking ? config.walk : config.idle) ??
      Object.values(actions).find(Boolean);
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    action.setEffectiveTimeScale(config.always && walking ? 1.8 : 1);
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, config, walking]);

  const bob = config.bobAmp ? Math.sin(t * (config.bobFreq ?? 2)) * config.bobAmp : 0;
  const y = groundOffset + (config.lift ?? 0) + bob;

  return (
    <group position={[0, y, 0]} rotation={[0, config.rotateY, 0]} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}
