"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Text, ContactShadows } from "@react-three/drei";
import { BOARD } from "@/lib/board";
import { ClientGameState } from "@/lib/types";
import { HALF, pawnPos } from "./layout";
import Tile3D from "./Tile3D";
import House3D from "./House3D";
import Pawn3D from "./Pawn3D";
import Dice3D from "./Dice3D";
import CameraRig from "./CameraRig";
import Particles, { Burst } from "./Particles";

function Scene({
  state,
  buildable,
  onTileClick,
}: {
  state: ClientGameState;
  buildable: Set<number>;
  onTileClick?: (id: number) => void;
}) {
  if (!state || !state.players.length) return null;
  const alive = state.players.filter((p) => !p.bankrupt);
  const cur = state.players[state.currentPlayer] ?? state.players[0];
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);
  const prev = useRef<ClientGameState | null>(null);
  const [rollId, setRollId] = useState(0);
  const [moving, setMoving] = useState(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addBurst = (b: Omit<Burst, "id" | "startedAt">) => {
    setBursts((arr) => [...arr, { ...b, id: burstId.current++, startedAt: Date.now() }]);
  };

  // Deteksi perubahan state -> efek
  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!p || p.version >= state.version) return;

    // dadu baru
    if (state.lastDice && JSON.stringify(p.lastDice) !== JSON.stringify(state.lastDice)) {
      setRollId((r) => r + 1);
    }

    // properti baru dibeli -> confetti di petak
    for (const [idStr, own] of Object.entries(state.ownership)) {
      const id = Number(idStr);
      if (!p.ownership[id] || p.ownership[id].owner !== own.owner) {
        const t = pawnPos(id, 0, 1);
        addBurst({ kind: "confetti", origin: [t[0], 0.3, t[2]] });
      }
    }

    // pion pindah -> kamera follow sebentar
    for (const pl of state.players) {
      const old = p.players.find((q) => q.id === pl.id);
      if (old && old.pos !== pl.pos) {
        setMoving(true);
        if (moveTimer.current) clearTimeout(moveTimer.current);
        const steps = (pl.pos - old.pos + 40) % 40;
        moveTimer.current = setTimeout(() => setMoving(false), Math.min(steps, 12) * 300 + 600);
        // uang terbang saat bayar sewa (deteksi: uang berkurang & pemilik bertambah)
      }
      if (old && pl.money > old.money + 20) {
        const t = pawnPos(pl.pos, 0, 1);
        addBurst({ kind: "coins", origin: [t[0], 0.4, t[2]] });
      }
      if (old && pl.money < old.money - 20) {
        // uang keluar -> lembaran terbang ke arah pusat (bank) atau pemilik
        const from = pawnPos(pl.pos, 0, 1);
        addBurst({ kind: "money", origin: [from[0], 0.35, from[2]], target: [0, 0.6, 0] });
      }
    }

    // event THR -> hujan uang
    if (state.lastEvent && state.lastEvent.at !== (p.lastEvent?.at ?? -1) && state.lastEvent.eventId === "thr") {
      addBurst({ kind: "rain", origin: [0, 5, 0] });
    }
  }, [state]);

  // petak yang baru diinjak pemain aktif
  const lastTile = cur?.pos ?? 0;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 4, 0]} intensity={12} color="#4fd1c5" distance={12} />

      {/* dasar papan */}
      <mesh receiveShadow position={[0, -0.08, 0]}>
        <boxGeometry args={[HALF * 2 + 0.5, 0.16, HALF * 2 + 0.5]} />
        <meshStandardMaterial color="#0b1320" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[HALF * 2 - 3.2, 0.04, HALF * 2 - 3.2]} />
        <meshStandardMaterial color="#101c2c" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* logo tengah */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <Text fontSize={0.55} color="#fbbf24" anchorY="bottom" position={[0, 0.05, 0]} fontWeight={900}>
          JURAGAN
        </Text>
        <Text fontSize={0.42} color="#34d399" anchorY="top" position={[0, -0.02, 0]} fontWeight={800}>
          PROPERTI
        </Text>
      </group>

      {BOARD.map((tile) => {
        const own = state.ownership[tile.id];
        const owner = own ? state.players.find((p) => p.id === own.owner) : null;
        return (
          <Tile3D
            key={tile.id}
            tile={tile}
            ownerColor={owner?.color}
            highlight={buildable.has(tile.id)}
            pulse={tile.id === lastTile && !moving}
            onClick={() => onTileClick?.(tile.id)}
          />
        );
      })}

      {Object.entries(state.ownership).map(([id, own]) =>
        own.houses > 0 ? <House3D key={id} tileId={Number(id)} houses={own.houses} /> : null
      )}

      {alive.map((p) => {
        const here = alive.filter((q) => q.pos === p.pos);
        return (
          <Pawn3D
            key={p.id}
            color={p.color}
            pawn={p.pawn}
            tileId={p.pos}
            index={here.findIndex((q) => q.id === p.id)}
            count={here.length}
            active={state.phase === "playing" && p.id === cur?.id}
            emote={p.emote}
          />
        );
      })}

      <Dice3D dice={state.lastDice} rollId={rollId} />
      <Particles bursts={bursts} onDone={(id) => setBursts((arr) => arr.filter((b) => b.id !== id))} />

      <CameraRig followTile={lastTile} moving={moving} ended={state.phase === "ended"} />

      <ContactShadows position={[0, -0.001, 0]} opacity={0.5} scale={16} blur={2.2} far={3} />
    </>
  );
}

export default function Board3D({
  state,
  buildable,
  onTileClick,
}: {
  state: ClientGameState;
  buildable: Set<number>;
  onTileClick?: (id: number) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 9, 8.2], fov: 45 }}
      dpr={1}
      className="!touch-none"
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        // WebGL context-loss recovery: tanpa preventDefault, context TIDAK akan
        // dipulihkan browser dan canvas blank putih permanen.
        canvas.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            console.warn("[Board3D] WebGL context lost — menunggu restore…");
          },
          false
        );
        canvas.addEventListener("webglcontextrestored", () => {
          console.warn("[Board3D] WebGL context restored.");
        });
      }}
    >
      <color attach="background" args={["#060b14"]} />
      <fog attach="fog" args={["#060b14", 18, 36]} />
      <Scene state={state} buildable={buildable} onTileClick={onTileClick} />
    </Canvas>
  );
}
