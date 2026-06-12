"use client";

import { PawnKind } from "@/lib/types";

// Model pion low-poly prosedural. Semua menghadap -Z (arah jalan diatur parent).
// `t` = waktu animasi untuk gerak idle/jalan khas tiap pion.
export default function PawnModel({ kind, color, walking, t }: { kind: PawnKind; color: string; walking: boolean; t: number }) {
  switch (kind) {
    case "bajaj":
      return <Bajaj color={color} walking={walking} t={t} />;
    case "pinisi":
      return <Pinisi color={color} t={t} />;
    case "komodo":
      return <Komodo color={color} walking={walking} t={t} />;
    case "garuda":
      return <Garuda color={color} walking={walking} t={t} />;
    case "ojek":
      return <Ojek color={color} walking={walking} t={t} />;
    default:
      return <DefaultPawn color={color} />;
  }
}

function DefaultPawn({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.13, 0]}>
        <coneGeometry args={[0.11, 0.26, 20]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.31, 0]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.5} />
      </mesh>
    </group>
  );
}

// Bajaj: kabin kotak + 3 roda, goyang kiri-kanan saat jalan
function Bajaj({ color, walking, t }: { color: string; walking: boolean; t: number }) {
  const sway = walking ? Math.sin(t * 14) * 0.12 : 0;
  return (
    <group rotation={[0, 0, sway]}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <boxGeometry args={[0.2, 0.18, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      {/* atap */}
      <mesh castShadow position={[0, 0.28, 0.02]}>
        <boxGeometry args={[0.21, 0.06, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      {/* kaca depan */}
      <mesh position={[0, 0.2, -0.155]}>
        <boxGeometry args={[0.16, 0.1, 0.01]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.3} />
      </mesh>
      {/* roda depan 1 + belakang 2 */}
      <Wheel x={0} z={-0.13} t={t} walking={walking} />
      <Wheel x={-0.11} z={0.11} t={t} walking={walking} />
      <Wheel x={0.11} z={0.11} t={t} walking={walking} />
    </group>
  );
}

function Wheel({ x, z, t, walking }: { x: number; z: number; t: number; walking: boolean }) {
  return (
    <mesh castShadow position={[x, 0.05, z]} rotation={[walking ? t * 10 : 0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
      <meshStandardMaterial color="#0f172a" roughness={0.8} />
    </mesh>
  );
}

// Kapal Pinisi: lambung + 2 layar, mengambang naik-turun
function Pinisi({ color, t }: { color: string; t: number }) {
  const bob = Math.sin(t * 2.2) * 0.02;
  const tilt = Math.sin(t * 1.7) * 0.05;
  return (
    <group position={[0, bob, 0]} rotation={[tilt, 0, tilt * 0.6]}>
      {/* lambung */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.36]} />
        <meshStandardMaterial color="#7c4a21" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.05, -0.19]} rotation={[Math.PI / 7, 0, 0]}>
        <boxGeometry args={[0.13, 0.07, 0.1]} />
        <meshStandardMaterial color="#7c4a21" roughness={0.6} />
      </mesh>
      {/* tiang + layar warna pemain */}
      <mesh castShadow position={[0, 0.22, -0.05]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
        <meshStandardMaterial color="#3f2310" />
      </mesh>
      <mesh castShadow position={[0, 0.24, -0.05]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.1, 0.18, 3]} />
        <meshStandardMaterial color={color} roughness={0.4} side={2} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0.1]}>
        <cylinderGeometry args={[0.007, 0.007, 0.18, 6]} />
        <meshStandardMaterial color="#3f2310" />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0.1]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.07, 0.13, 3]} />
        <meshStandardMaterial color={color} roughness={0.4} side={2} />
      </mesh>
    </group>
  );
}

// Komodo: badan memanjang meliuk + 4 kaki + ekor
function Komodo({ color, walking, t }: { color: string; walking: boolean; t: number }) {
  const wiggle = walking ? Math.sin(t * 10) * 0.15 : Math.sin(t * 1.5) * 0.03;
  return (
    <group position={[0, 0.05, 0]}>
      {/* badan */}
      <mesh castShadow rotation={[0, wiggle, 0]}>
        <capsuleGeometry args={[0.07, 0.22, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* kepala */}
      <mesh castShadow position={[0, 0.01, -0.19]} rotation={[0.2, -wiggle, 0]}>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* ekor meliuk */}
      <mesh castShadow position={[0, 0, 0.2]} rotation={[Math.PI / 2 + 0.2, 0, wiggle * 2]}>
        <coneGeometry args={[0.045, 0.22, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* kaki */}
      {[-0.08, 0.08].map((x) =>
        [-0.08, 0.1].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, -0.04, z]} rotation={[walking ? Math.sin(t * 10 + x * z * 99) * 0.5 : 0, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.07, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        ))
      )}
    </group>
  );
}

// Garuda: badan + sayap mengepak, melayang
function Garuda({ color, walking, t }: { color: string; walking: boolean; t: number }) {
  const flap = Math.sin(t * (walking ? 16 : 4)) * (walking ? 0.7 : 0.25);
  const hover = 0.12 + Math.sin(t * 3) * 0.02 + (walking ? 0.1 : 0);
  return (
    <group position={[0, hover, 0]}>
      {/* badan */}
      <mesh castShadow rotation={[0.5, 0, 0]}>
        <capsuleGeometry args={[0.06, 0.14, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* kepala + paruh emas */}
      <mesh castShadow position={[0, 0.1, -0.08]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.09, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* sayap kiri-kanan */}
      <mesh castShadow position={[-0.08, 0.04, 0]} rotation={[0, 0, flap + 0.3]}>
        <boxGeometry args={[0.22, 0.015, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.08, 0.04, 0]} rotation={[0, 0, -flap - 0.3]}>
        <boxGeometry args={[0.22, 0.015, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* ekor */}
      <mesh castShadow position={[0, 0, 0.12]} rotation={[-0.4, 0, 0]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

// Ojek: motor + pengendara helm hijau
function Ojek({ color, walking, t }: { color: string; walking: boolean; t: number }) {
  const lean = walking ? Math.sin(t * 12) * 0.08 : 0;
  return (
    <group rotation={[0, 0, lean]}>
      {/* bodi motor */}
      <mesh castShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[0.08, 0.07, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      {/* setang */}
      <mesh castShadow position={[0, 0.2, -0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* pengendara: badan + helm */}
      <mesh castShadow position={[0, 0.21, 0.05]}>
        <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.31, 0.05]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#16a34a" roughness={0.3} metalness={0.2} />
      </mesh>
      <Wheel x={0} z={-0.13} t={t} walking={walking} />
      <Wheel x={0} z={0.13} t={t} walking={walking} />
    </group>
  );
}
