"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { GROUP_COLORS } from "@/lib/board";
import { fmtMoney } from "@/lib/money";
import { Tile } from "@/lib/types";
import { tileTransform } from "./layout";

const TYPE_LABELS: Record<string, string> = {
  go: "MULAI",
  chance: "?",
  chest: "DANA\nUMUM",
  quiz: "CERDAS\nCERMAT",
  tax: "PAJAK",
  jail: "PENJARA",
  parking: "PARKIR",
  gotojail: "MASUK\nPENJARA",
};

const TYPE_COLORS: Record<string, string> = {
  quiz: "#7c3aed",
  chance: "#d97706",
  chest: "#0e7490",
  gotojail: "#b91c1c",
  go: "#15803d",
};

export default function Tile3D({
  tile,
  ownerColor,
  highlight,
  pulse, // petak baru diinjak -> glow pulse
  dest, // petak tujuan dadu -> glow kuning terang
  onClick,
}: {
  tile: Tile;
  ownerColor?: string;
  highlight?: boolean;
  pulse?: boolean;
  dest?: boolean;
  onClick?: () => void;
}) {
  const t = tileTransform(tile.id);
  const groupColor = tile.group ? GROUP_COLORS[tile.group] : null;
  const isProp = tile.type === "property";
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const m = matRef.current;
    if (!m) return;
    if (dest) {
      // petak tujuan dadu: glow kuning terang berdenyut
      m.emissiveIntensity = 0.6 + 0.4 * Math.sin(clock.elapsedTime * 6);
      m.emissive.set("#fbbf24");
    } else if (pulse) {
      m.emissiveIntensity = 0.35 + 0.3 * Math.sin(clock.elapsedTime * 5);
      m.emissive.set("#38bdf8");
    } else if (highlight) {
      m.emissiveIntensity = 0.5 + 0.2 * Math.sin(clock.elapsedTime * 4);
      m.emissive.set("#10b981");
    } else {
      m.emissiveIntensity = 0;
    }
  });

  const accent = TYPE_COLORS[tile.type];
  const base = t.corner ? "#182433" : accent ? "#1b2737" : "#22303f";

  return (
    <group position={[t.x, 0, t.z]} rotation={[0, t.rotY, 0]} onClick={onClick}>
      <mesh receiveShadow castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[t.w - 0.04, 0.1, t.d - 0.04]} />
        <meshStandardMaterial ref={matRef} color={base} roughness={0.55} metalness={0.25} />
      </mesh>

      {/* strip warna grup */}
      {groupColor && (
        <mesh position={[0, 0.12, -t.d / 2 + 0.16]} castShadow>
          <boxGeometry args={[t.w - 0.08, 0.06, 0.26]} />
          <meshStandardMaterial color={groupColor} emissive={groupColor} emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
      )}

      {/* aksen tipe khusus (kuis ungu, dll) */}
      {accent && !t.corner && (
        <mesh position={[0, 0.105, -t.d / 2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[t.w - 0.08, 0.14]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* penanda pemilik */}
      {ownerColor && (
        <mesh position={[0, 0.105, t.d / 2 - 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.11, 24]} />
          <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={0.8} />
        </mesh>
      )}

      {/* ZONA ATAS: nama/label (corner tetap center karena petak besar) */}
      <Text
        position={[0, 0.106, t.corner ? 0 : -t.d / 2 + 0.46]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={t.corner ? 0.16 : 0.1}
        maxWidth={t.w - 0.12}
        textAlign="center"
        color="#e8f0f8"
        anchorX="center"
        anchorY="middle"
      >
        {isProp || tile.type === "airport" || tile.type === "utility"
          ? tile.name
          : TYPE_LABELS[tile.type] ?? tile.name}
      </Text>

      {/* ZONA BAWAH: harga */}
      {tile.price != null && (
        <Text
          position={[0, 0.106, t.d / 2 - 0.26]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.095}
          color="#7dd3a8"
          anchorX="center"
          anchorY="middle"
        >
          {fmtMoney(tile.price)}
        </Text>
      )}
    </group>
  );
}
