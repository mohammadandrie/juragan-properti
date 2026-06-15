"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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

// Durasi animasi pion (klien) untuk MENAHAN reveal interaksi sampai pion sampai.
// Selaras dengan Pawn3D: START_DELAY 0.75s + ~0.3s per petak + sisa mendarat.
function moveDurationMs(steps: number): number {
  const s = Math.min(Math.abs(steps), 12);
  return 850 + s * 300;
}

export default function GameClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [mute, setMute] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("followPawn");
  const [focusTile, setFocusTile] = useState<number | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  // Gating animasi: tahan reveal beli/sewa/kartu/quiz sampai pion selesai jalan.
  const [gateUntil, setGateUntil] = useState(0);
  const [nowTick, setNowTick] = useState(0); // dipaksa berubah saat gate berakhir
  const tokenRef = useRef<string | null>(null);
  const prevState = useRef<ClientGameState | null>(null);

  // efek suara + deteksi gerak pion untuk gating
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

    // pion berpindah → mulai gating (dadu mendarat → angka → pion jalan → sampai)
    let maxSteps = 0;
    for (const pl of state.players) {
      const old = p.players.find((q) => q.id === pl.id);
      if (old && old.pos !== pl.pos) {
        const steps = (pl.pos - old.pos + 40) % 40;
        maxSteps = Math.max(maxSteps, steps);
      }
    }
    if (maxSteps > 0) {
      const until = Date.now() + moveDurationMs(maxSteps);
      setGateUntil(until);
    }
  }, [state]);

  // saat gate aktif, paksa re-render tepat ketika berakhir agar reveal muncul
  useEffect(() => {
    if (gateUntil <= Date.now()) return;
    const t = setTimeout(() => setNowTick((n) => n + 1), gateUntil - Date.now() + 30);
    return () => clearTimeout(t);
  }, [gateUntil]);

  const animating = gateUntil > Date.now();

  // jam mundur batas waktu game (tick tiap detik)
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
  if (myTurn && me && !pending && !animating) {
    for (const t of BOARD) {
      if (state.ownership[t.id]?.owner === me.id) sellable.add(t.id);
    }
  }

  const winner = state.winner ? state.players.find((p) => p.id === state.winner) : null;
  const diceSum = state.lastDice ? state.lastDice[0] + state.lastDice[1] : null;
  // sisa waktu game (mm:ss); null bila tanpa batas / belum mulai
  const remainMs = state.endsAt !== null ? Math.max(0, state.endsAt - clock) : null;
  const remainStr =
    remainMs !== null
      ? `${Math.floor(remainMs / 60000)}:${String(Math.floor((remainMs % 60000) / 1000)).padStart(2, "0")}`
      : null;
  const remainUrgent = remainMs !== null && remainMs <= 60_000;

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0F172A]">
      {/* BOARD: isi penuh layar */}
      <section className="absolute inset-0">
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
      </section>

      {/* KIRI ATAS: kartu pemain mengambang (tanpa kotak background panel) */}
      <aside className="pointer-events-none absolute left-2 top-2 z-20 max-h-[calc(100vh-7rem)] w-60 overflow-y-auto">
        <div className="pointer-events-auto">
          <PlayerPanel state={state} act={act} />
        </div>
      </aside>

      {/* ATAS TENGAH: jam mundur batas waktu */}
      {remainStr && state.phase === "playing" && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
          <div
            className={`rounded-full px-4 py-1.5 text-lg font-black tabular-nums backdrop-blur ring-1 ${
              remainUrgent
                ? "bg-rose-500/80 text-white ring-rose-300 animate-pulse"
                : "bg-black/50 text-amber-300 ring-white/15"
            }`}
          >
            ⏱️ {remainStr}
          </div>
        </div>
      )}

      {/* overlay di atas board */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {/* banner event: selalu mounted (event terjadi saat ganti ronde, bukan
            saat mendarat) — kalau di-gate, remount memicu banner muncul ulang. */}
        <EventBanner state={state} />
        {/* kartu kesempatan/dana umum: ditahan sampai pion sampai tujuan */}
        {!animating && <CardReveal state={state} />}

        {/* angka dadu besar saat animasi (dadu mendarat → angka terbaca) */}
        {animating && diceSum !== null && state.lastDice && (
          <div className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 text-center">
            <div className="flex items-center gap-2">
              {state.lastDice.map((d, i) => (
                <span
                  key={i}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-3xl font-black text-slate-900 shadow-lg ring-2 ring-amber-300"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-1 text-3xl font-black text-amber-300 drop-shadow-[0_0_16px_rgba(251,191,36,0.7)]">
              {diceSum}
            </div>
          </div>
        )}

        {/* property card: muncul HANYA saat tile diklik (poin 3) */}
        {selectedTile !== null && (
          <div className="pointer-events-auto">
            <PropertyInspector
              state={state}
              selected={selectedTile}
              onClose={() => setSelectedTile(null)}
            />
          </div>
        )}

        {/* kamera control (kanan atas board) */}
        <div className="pointer-events-auto absolute right-2 top-2 z-30 flex gap-1">
          {(["overview", "followPawn", "cinematic"] as CameraMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setCameraMode(m)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold backdrop-blur ring-1 transition ${
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
            className="rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/70 transition"
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
            className="rounded-lg bg-black/50 px-2.5 py-1.5 text-sm backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
          >
            {mute ? "🔇" : "🔊"}
          </button>
        </div>

        {/* giliranmu! */}
        {myTurn && state.canRoll && !pending && !animating && (
          <p className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 animate-[dropIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)] text-2xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]">
            GILIRANMU!
          </p>
        )}

        {/* pemenang */}
        {winner && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <p className="animate-[dropIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)] text-6xl">🏆</p>
            <p className="mt-3 text-4xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
              {winner.name} MENANG!
            </p>
            <p className="mt-2 text-base text-white/70">
              {state.log.slice().reverse().find((l) => l.includes("menang") || l.includes("memenangkan")) ??
                "Juragan properti sejati! 👑"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-lg font-black text-amber-950 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              🏠 Kembali ke Home
            </button>
          </div>
        )}

        {/* error toast */}
        {error && (
          <p className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {error}
          </p>
        )}
      </div>

      {/* BAWAH: aksi mengambang (tombol saja, tanpa kotak background) — poin 6 */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto">
          <ActionPanel
            state={state}
            myTurn={myTurn}
            me={me}
            act={act}
            onPreviewTile={setFocusTile}
            animating={animating}
          />
        </div>
      </footer>

      {/* overlay modal: kuis (ditahan selama animasi) & lobby */}
      {!animating && <QuizOverlay state={state} me={me} act={act} />}
      <LobbyOverlay state={state} me={me} act={act} code={code} />
    </main>
  );
}
