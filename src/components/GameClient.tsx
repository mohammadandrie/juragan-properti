"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { ClientGameState, GameAction } from "@/lib/types";
import PlayerStrip from "./hud/PlayerStrip";
import FloatingLog from "./hud/FloatingLog";
import ActionDock from "./hud/ActionDock";
import InteractionOverlay from "./hud/InteractionOverlay";
import SurrenderButton from "./hud/SurrenderButton";
import QuizOverlay from "./hud/QuizOverlay";
import LobbyOverlay from "./hud/LobbyOverlay";
import { EventBanner, CardReveal } from "./hud/Banners";
import DiceInfo from "./hud/DiceInfo";
import CanvasBoundary from "./three/CanvasBoundary";
import { sfx, setMuted } from "@/lib/sfx";

const Board3D = dynamic(() => import("./three/Board3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060b14] text-amber-300/80 animate-pulse">
      Menyiapkan papan 3D…
    </div>
  ),
});

export default function GameClient({ code }: { code: string }) {
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [mute, setMute] = useState(false);
  const [cameraMode, setCameraMode] = useState<"overview" | "followPawn">("overview");
  const [focusTile, setFocusTile] = useState<number | null>(null);
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
      <main className="flex min-h-screen items-center justify-center bg-[#060b14] p-4">
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-lg font-semibold text-red-300">
          Room <span className="font-mono">{code}</span> tidak ditemukan atau kedaluwarsa.
        </p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060b14]">
        <p className="text-xl font-semibold text-amber-300 animate-pulse">Memuat room…</p>
      </main>
    );
  }

  // aset yang bisa dijual bebas saat giliranku (tidak sedang ada interaksi pending)
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
  const myProps = me ? BOARD.filter((t) => state.ownership[t.id]?.owner === me.id) : [];

  if (!state.players.length) {
    return (
      <main className="fixed inset-0 overflow-hidden bg-[#060b14] flex items-center justify-center text-amber-300/80 animate-pulse">
        Menyiapkan game…
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#060b14]">
      {/* papan = seluruh layar */}
      <div className="absolute inset-0">
        <CanvasBoundary>
          <Board3D
            state={state}
            sellable={sellable}
            onTileClick={(id) => sellable.has(id) && act({ type: "sell", tile: id })}
            cameraMode={cameraMode}
            focusTile={focusTile}
            resetSignal={resetSignal}
          />
        </CanvasBoundary>
      </div>

      {/* HUD */}
      <PlayerStrip state={state} />
      <FloatingLog log={state.log} />
      <EventBanner state={state} />
      <CardReveal state={state} />
      <DiceInfo state={state} />
      <ActionDock state={state} myTurn={myTurn} me={me} act={act} />
      <SurrenderButton
        show={
          state.phase === "playing" &&
          !!me &&
          !me.bot &&
          !me.bankrupt &&
          !me.surrendered
        }
        act={act}
      />
      <InteractionOverlay state={state} me={me} act={act} onPreviewTile={setFocusTile} />
      <QuizOverlay state={state} me={me} act={act} />
      <LobbyOverlay state={state} me={me} act={act} code={code} />

      {/* giliranmu! */}
      {myTurn && state.canRoll && !pending && (
        <p className="pointer-events-none absolute left-1/2 top-1/4 z-10 -translate-x-1/2 animate-[dropIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)] text-2xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]">
          GILIRANMU!
        </p>
      )}

      {/* menunggu pemain lain */}
      {state.phase === "playing" && !myTurn && cur && (
        <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-xs font-semibold text-white/70 backdrop-blur">
          Giliran <b style={{ color: cur.color }}>{cur.name}</b>
          {cur.bot && " 🤖"}…
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

      {/* tombol properti-ku (kiri bawah) */}
      {me && myProps.length > 0 && state.phase === "playing" && (
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setPropsOpen((o) => !o)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-black/50 px-4 text-sm font-bold text-white backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
          >
            🏠 {myProps.length}
          </button>
          {propsOpen && (
            <div className="absolute bottom-13 left-0 max-h-72 w-64 overflow-y-auto rounded-2xl bg-black/70 p-3 backdrop-blur-md ring-1 ring-white/15">
              {myProps.map((t) => {
                const own = state.ownership[t.id];
                return (
                  <div key={t.id} className="flex items-center gap-2 py-1 text-xs text-white">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: t.group ? GROUP_COLORS[t.group] : "#64748b" }}
                    />
                    <span className="flex-1 truncate">{t.name}</span>
                    {own.level > 1 && <span>{own.level === 5 ? "🏨" : "🏠".repeat(own.level - 1)}</span>}
                    {myTurn && sellable.has(t.id) && (
                      <button
                        onClick={() => act({ type: "sell", tile: t.id })}
                        className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/25"
                      >
                        Jual
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* toggle kamera (kanan atas) */}
      <div className="absolute right-3 top-3 z-30 flex gap-1.5">
        <button
          onClick={() => setCameraMode("overview")}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur ring-1 transition ${
            cameraMode === "overview"
              ? "bg-amber-400 text-amber-950 ring-amber-300"
              : "bg-black/50 text-white ring-white/15 hover:bg-black/70"
          }`}
          title="Kamera papan"
        >
          🗺️ Papan
        </button>
        <button
          onClick={() => setCameraMode("followPawn")}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur ring-1 transition ${
            cameraMode === "followPawn"
              ? "bg-amber-400 text-amber-950 ring-amber-300"
              : "bg-black/50 text-white ring-white/15 hover:bg-black/70"
          }`}
          title="Kamera ikuti pion"
        >
          🎯 Pion
        </button>
        <button
          onClick={() => setResetSignal((s) => s + 1)}
          className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/70 transition"
          title="Reset kamera"
        >
          ↺ Reset
        </button>
      </div>

      {/* tombol mute (kanan bawah) */}
      <button
        onClick={() => {
          const m = !mute;
          setMute(m);
          setMuted(m);
        }}
        className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
        title={mute ? "Nyalakan suara" : "Matikan suara"}
      >
        {mute ? "🔇" : "🔊"}
      </button>

      {/* error toast */}
      {error && (
        <p className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
          {error}
        </p>
      )}
    </main>
  );
}
