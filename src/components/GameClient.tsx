"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BOARD } from "@/lib/board";
import { ClientGameState, GameAction } from "@/lib/types";
import PlayerPanel from "./hud/PlayerPanel";
import ActionPanel from "./hud/ActionPanel";
import PropertyInspector from "./hud/PropertyInspector";
import PropertyListPanel from "./hud/PropertyListPanel";
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
      Menyiapkan papan…
    </div>
  ),
});

// Selaras Pawn3D: dadu mengacak ~1s + START_DELAY 0.4s untuk baca angka,
// lalu pion jalan ~0.3s/petak.
const DICE_SPIN_MS = 1000;
const READ_MS = 400;
function moveDurationMs(steps: number): number {
  const s = Math.min(Math.abs(steps), 12);
  return DICE_SPIN_MS + READ_MS + s * 300;
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
  const [highlightTiles, setHighlightTiles] = useState<number[]>([]);
  // mode UI: tampilkan panel list properti (kamera otomatis ke topDown)
  const [showPropList, setShowPropList] = useState(false);
  const prevCamRef = useRef<CameraMode>("followPawn");
  // Gating animasi: tahan reveal interaksi sampai pion sampai tujuan.
  const [gateUntil, setGateUntil] = useState(0);
  const [, setNowTick] = useState(0);
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

    // pion berpindah → mulai gating
    let maxSteps = 0;
    for (const pl of state.players) {
      const old = p.players.find((q) => q.id === pl.id);
      if (old && old.pos !== pl.pos) {
        const steps = (pl.pos - old.pos + 40) % 40;
        maxSteps = Math.max(maxSteps, steps);
      }
    }
    if (maxSteps > 0) setGateUntil(Date.now() + moveDurationMs(maxSteps));
  }, [state]);

  // paksa render saat gate berakhir
  useEffect(() => {
    if (gateUntil <= Date.now()) return;
    const t = setTimeout(() => setNowTick((n) => n + 1), gateUntil - Date.now() + 30);
    return () => clearTimeout(t);
  }, [gateUntil]);

  const now = Date.now();
  const animating = gateUntil > now;
  // dadu masih mengacak (jangan tampilkan angka)
  const diceSpinning = animating && gateUntil - now > moveDurationMs(0) - DICE_SPIN_MS;

  // jam mundur batas waktu + countdown giliran
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 500);
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

  // Toggle list properti milikku — kamera berpindah ke topDown saat dibuka.
  function togglePropList() {
    if (showPropList) {
      setShowPropList(false);
      setHighlightTiles([]);
      setCameraMode(prevCamRef.current);
    } else {
      prevCamRef.current = cameraMode;
      setShowPropList(true);
      setCameraMode("topDown");
    }
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
        <p className="text-xl font-semibold text-amber-300 animate-pulse">Memuat ruangan…</p>
      </main>
    );
  }

  const winner = state.winner ? state.players.find((p) => p.id === state.winner) : null;
  const diceSum = state.lastDice ? state.lastDice[0] + state.lastDice[1] : null;

  // jam mundur batas waktu game (mm:ss)
  const remainMs = state.endsAt !== null ? Math.max(0, state.endsAt - clock) : null;
  const remainStr =
    remainMs !== null
      ? `${Math.floor(remainMs / 60000)}:${String(Math.floor((remainMs % 60000) / 1000)).padStart(2, "0")}`
      : null;
  const remainUrgent = remainMs !== null && remainMs <= 60_000;

  // countdown giliran (sebelum di-takeover bot): tampilkan saat aku giliran &
  // belum lempar dadu, ada deadline aktif.
  const turnSecsLeft =
    myTurn && state.canRoll && state.phaseDeadline !== null
      ? Math.max(0, Math.ceil((state.phaseDeadline - clock) / 1000))
      : null;

  // properti milikku (untuk PropertyListPanel)
  const myTiles = me
    ? Object.entries(state.ownership)
        .filter(([, o]) => o.owner === me.id)
        .map(([id]) => Number(id))
    : [];

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0F172A]">
      {/* BOARD: isi penuh layar */}
      <section className="absolute inset-0">
        <CanvasBoundary>
          <Board3D
            state={state}
            highlightTiles={highlightTiles}
            onTileClick={(id) => setSelectedTile(id)}
            cameraMode={cameraMode}
            focusTile={focusTile}
            resetSignal={resetSignal}
          />
        </CanvasBoundary>
      </section>

      {/* KIRI ATAS: kartu pemain (transparan, tanpa kotak panel) */}
      <aside className="pointer-events-none absolute left-2 top-2 z-20 max-h-[calc(100vh-9rem)] w-60 overflow-y-auto">
        <div className="pointer-events-auto">
          <PlayerPanel state={state} act={act} />
        </div>
      </aside>

      {/* ATAS TENGAH: jam mundur batas waktu */}
      {remainStr && state.phase === "playing" && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
          <div
            className={`rounded-full px-5 py-2 text-xl font-black tabular-nums backdrop-blur ring-1 ${
              remainUrgent
                ? "bg-rose-500/80 text-white ring-rose-300 animate-pulse"
                : "bg-black/50 text-amber-300 ring-white/15"
            }`}
          >
            ⏱ {remainStr}
          </div>
        </div>
      )}

      {/* overlay di atas board */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {/* event banner (selalu mount, posisi di bawah timer agar tak bentrok) */}
        <EventBanner state={state} />
        {/* kartu kesempatan/dana umum: ditahan sampai pion sampai tujuan */}
        {!animating && <CardReveal state={state} />}

        {/* angka dadu — TUNGGU dadu berhenti mengacak baru tampil */}
        {animating && !diceSpinning && diceSum !== null && state.lastDice && (
          <div className="pointer-events-none absolute left-1/2 top-[42%] z-30 -translate-x-1/2 text-center">
            <div className="flex items-center gap-3">
              {state.lastDice.map((d, i) => (
                <span
                  key={i}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl font-black text-slate-900 shadow-xl ring-2 ring-amber-300"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-2 text-4xl font-black text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
              {diceSum}
            </div>
          </div>
        )}

        {/* property card kanan: muncul saat tile diklik */}
        {selectedTile !== null && (
          <div className="pointer-events-auto">
            <PropertyInspector
              state={state}
              selected={selectedTile}
              onClose={() => setSelectedTile(null)}
            />
          </div>
        )}

        {/* panel list properti milikku (saat tombol "Propertiku" diklik) */}
        {showPropList && me && (
          <div className="pointer-events-auto">
            <PropertyListPanel
              state={state}
              tiles={myTiles}
              highlightTiles={highlightTiles}
              onHover={(id) => setHighlightTiles(id === null ? [] : [id])}
              onClose={togglePropList}
            />
          </div>
        )}

        {/* kontrol kanan-atas: hanya mode kamera + mute */}
        <div className="pointer-events-auto absolute right-2 top-2 z-30 flex gap-1">
          {(
            [
              ["overview", "🗺 Papan"],
              ["followPawn", "🎯 Pion"],
            ] as [CameraMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setCameraMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold backdrop-blur ring-1 transition ${
                cameraMode === m
                  ? "bg-amber-400 text-amber-950 ring-amber-300"
                  : "bg-black/50 text-white ring-white/15 hover:bg-black/70"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              const m = !mute;
              setMute(m);
              setMuted(m);
            }}
            className="rounded-lg bg-black/50 px-3 py-1.5 text-base backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
          >
            {mute ? "🔇" : "🔊"}
          </button>
        </div>

        {/* pemenang */}
        {winner && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
            <p className="animate-[dropIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)] text-7xl">🏆</p>
            <p className="mt-3 text-5xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
              {winner.name} MENANG
            </p>
            <p className="mt-2 text-base text-white/70">
              {state.log.slice().reverse().find((l) => l.includes("menang") || l.includes("memenangkan")) ??
                ""}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-lg font-black text-amber-950 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              🏠 Kembali ke Beranda
            </button>
          </div>
        )}

        {/* error toast */}
        {error && (
          <p className="absolute left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {error}
          </p>
        )}
      </div>

      {/* BAWAH: aksi mengambang (tombol di tengah) */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto">
          <ActionPanel
            state={state}
            myTurn={myTurn}
            me={me}
            act={act}
            onPreviewTile={setFocusTile}
            onSetHighlight={setHighlightTiles}
            animating={animating}
            turnSecsLeft={turnSecsLeft}
            onToggleProps={togglePropList}
            propsOpen={showPropList}
            setCameraMode={setCameraMode}
          />
        </div>
      </footer>

      {/* overlay modal: kuis (ditahan selama animasi) & lobby */}
      {!animating && <QuizOverlay state={state} me={me} act={act} />}
      <LobbyOverlay state={state} me={me} act={act} code={code} />
    </main>
  );
}
