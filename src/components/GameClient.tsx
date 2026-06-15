"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BOARD } from "@/lib/board";
import { ClientGameState, GameAction } from "@/lib/types";
import PlayerPanel from "./hud/PlayerPanel";
import ActionPanel from "./hud/ActionPanel";
import PropertyInspector from "./hud/PropertyInspector";
import QuizOverlay from "./hud/QuizOverlay";
import LobbyOverlay from "./hud/LobbyOverlay";
import { EventBanner, CardReveal } from "./hud/Banners";
import CanvasBoundary from "./three/CanvasBoundary";
import type { CameraMode } from "./three/CameraRig";
import { sfx, setMuted } from "@/lib/sfx";

const Board3D = dynamic(() => import("./three/Board3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0F172A] text-amber-300/80 animate-pulse">
      Menyiapkan papan 3D…
    </div>
  ),
});

export default function GameClient({ code }: { code: string }) {
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [mute, setMute] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [focusTile, setFocusTile] = useState<number | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const prevState = useRef<ClientGameState | null>(null);

  // efek suara dari perubahan state
  useEffect(() => {
    const p = prevState.current;
    prevState.current = state;
    if (!p || !state || p.version >= state.version) return;
    if (JSON.stringify(p.lastDice) !== JSON.stringify(state.lastDice) && state.lastDice) sfx.dice();
    if (state.lastCard && state.lastCard.at !== (p.lastCard?.at ?? 0)) sfx.card();
    if (state.lastEvent && state.lastEvent.at !== (p.lastEvent?.at ?? -1)) sfx.event();
    if (!p.quiz && state.quiz) sfx.quiz();
    if (!p.winner && state.winner) sfx.win();
    const meNow = state.players.find((x) => x.id === state.you);
    const meOld = p.players.find((x) => x.id === state.you);
    if (meNow && meOld) {
      if (meNow.money > meOld.money) sfx.cash();
      if (meNow.money < meOld.money) sfx.pay();
      if (!meOld.inJail && meNow.inJail) sfx.jail();
    }
    const wasMyTurn = p.players[p.currentPlayer]?.id === state.you;
    const isMyTurnNow = state.players[state.currentPlayer]?.id === state.you;
    if (!wasMyTurn && isMyTurnNow && state.phase === "playing") sfx.turn();
  }, [state]);

  useEffect(() => {
    tokenRef.current = localStorage.getItem(`jp:${code}`);
  }, [code]);

  // bersihkan fokus preview tile saat tak ada lagi keputusan sewa
  useEffect(() => {
    if (state && !state.pendingRent) setFocusTile(null);
  }, [state?.pendingRent]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const token = tokenRef.current;
    const res = await fetch(`/api/game/${code}${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) {
      const data: ClientGameState = await res.json();
      setState((prev) => (prev && prev.version > data.version ? prev : data));
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [refresh]);

  const me = useMemo(() => state?.players.find((p) => p.id === state.you) ?? null, [state]);
  const cur = state ? state.players[state.currentPlayer] : null;
  const myTurn = !!state && !!me && cur?.id === me.id && state.phase === "playing";

  async function act(action: GameAction) {
    setError("");
    const res = await fetch(`/api/game/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRef.current, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan.");
      setTimeout(() => setError(""), 3500);
      return;
    }
    setState(data);
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-lg font-semibold text-red-300">
          Room <span className="font-mono">{code}</span> tidak ditemukan atau kedaluwarsa.
        </p>
      </main>
    );
  }

  if (!state || !state.players.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <p className="text-xl font-semibold text-amber-300 animate-pulse">Memuat room…</p>
      </main>
    );
  }

  // aset yang bisa dijual bebas saat giliranku (tidak sedang interaksi pending)
  const pending =
    state.pendingBuy !== null ||
    state.pendingRent !== null ||
    state.pendingUpgrade !== null ||
    state.quiz !== null;
  const sellable = new Set<number>();
  if (myTurn && me && !pending) {
    for (const t of BOARD) {
      if (state.ownership[t.id]?.owner === me.id) sellable.add(t.id);
    }
  }

  const winner = state.winner ? state.players.find((p) => p.id === state.winner) : null;

  return (
    <main className="fixed inset-0 grid grid-cols-[minmax(180px,15rem)_1fr_minmax(200px,17rem)] grid-rows-[1fr_auto] gap-2 overflow-hidden bg-[#0F172A] p-2">
      {/* KIRI: player panel */}
      <aside className="row-span-1 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/5 backdrop-blur">
        <PlayerPanel state={state} act={act} />
      </aside>

      {/* TENGAH: board */}
      <section className="relative row-span-1 overflow-hidden rounded-2xl ring-1 ring-white/5">
        <CanvasBoundary>
          <Board3D
            state={state}
            sellable={sellable}
            onTileClick={(id) => {
              setSelectedTile(id);
              if (sellable.has(id)) act({ type: "sell", tile: id });
            }}
            cameraMode={cameraMode}
            focusTile={focusTile}
            resetSignal={resetSignal}
          />
        </CanvasBoundary>

        {/* overlay tengah: hanya banner & info penting */}
        <EventBanner state={state} />
        <CardReveal state={state} />

        {/* kamera control (kanan atas board) */}
        <div className="absolute right-2 top-2 z-30 flex gap-1">
          {(["overview", "followPawn", "cinematic"] as CameraMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setCameraMode(m)}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur ring-1 transition ${
                cameraMode === m
                  ? "bg-amber-400 text-amber-950 ring-amber-300"
                  : "bg-black/50 text-white ring-white/15 hover:bg-black/70"
              }`}
            >
              {m === "overview" ? "🗺️ Papan" : m === "followPawn" ? "🎯 Pion" : "🎬 Sinema"}
            </button>
          ))}
          <button
            onClick={() => setResetSignal((s) => s + 1)}
            className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/70 transition"
            title="Reset kamera (atau klik-ganda papan)"
          >
            ↺
          </button>
          <button
            onClick={() => {
              const m = !mute;
              setMute(m);
              setMuted(m);
            }}
            className="rounded-lg bg-black/50 px-2 py-1 text-[10px] backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
          >
            {mute ? "🔇" : "🔊"}
          </button>
        </div>

        {/* giliranmu! */}
        {myTurn && state.canRoll && !pending && (
          <p className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 animate-[dropIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)] text-xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]">
            GILIRANMU!
          </p>
        )}

        {/* pemenang */}
        {winner && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <p className="animate-[dropIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)] text-5xl">🏆</p>
            <p className="mt-3 text-3xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
              {winner.name} MENANG!
            </p>
            <p className="mt-2 text-sm text-white/70">Juragan properti sejati! 👑</p>
          </div>
        )}

        {/* error toast */}
        {error && (
          <p className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
            {error}
          </p>
        )}
      </section>

      {/* KANAN: action panel */}
      <aside className="row-span-1 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/5 backdrop-blur">
        <ActionPanel
          state={state}
          myTurn={myTurn}
          me={me}
          act={act}
          onPreviewTile={setFocusTile}
        />
      </aside>

      {/* BAWAH: property inspector (lebar penuh) */}
      <footer className="col-span-3 h-20 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/5 backdrop-blur">
        <PropertyInspector state={state} selected={selectedTile} />
      </footer>

      {/* overlay modal: kuis & lobby */}
      <QuizOverlay state={state} me={me} act={act} />
      <LobbyOverlay state={state} me={me} act={act} code={code} />
    </main>
  );
}
