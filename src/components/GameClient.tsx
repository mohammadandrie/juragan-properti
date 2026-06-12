"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BOARD, tilesInGroup, GROUP_COLORS } from "@/lib/board";
import { ClientGameState, GameAction } from "@/lib/types";
import PlayerStrip from "./hud/PlayerStrip";
import FloatingLog from "./hud/FloatingLog";
import ActionDock from "./hud/ActionDock";
import AuctionOverlay from "./hud/AuctionOverlay";
import QuizOverlay from "./hud/QuizOverlay";
import LobbyOverlay from "./hud/LobbyOverlay";
import { EventBanner, CardReveal } from "./hud/Banners";
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
    if (!p.auction && state.auction) sfx.auction();
    if (p.auction && state.auction && state.auction.highBid > p.auction.highBid) sfx.auction();
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

  // properti yang bisa dibangun
  const buildable = new Set<number>();
  const sellable = new Set<number>();
  if (myTurn && me) {
    for (const t of BOARD) {
      if (t.type !== "property") continue;
      const own = state.ownership[t.id];
      if (own?.owner !== me.id) continue;
      const group = tilesInGroup(t.group!);
      const complete = group.every((g) => state.ownership[g.id]?.owner === me.id);
      if (own.houses > 0) {
        const maxH = Math.max(...group.map((g) => state.ownership[g.id].houses));
        if (own.houses >= maxH) sellable.add(t.id);
      }
      if (!complete || own.houses >= 5 || me.money < (t.houseCost ?? 0)) continue;
      const minH = Math.min(...group.map((g) => state.ownership[g.id].houses));
      if (own.houses <= minH) buildable.add(t.id);
    }
  }

  const winner = state.winner ? state.players.find((p) => p.id === state.winner) : null;
  const myProps = me ? BOARD.filter((t) => state.ownership[t.id]?.owner === me.id) : [];

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#060b14]">
      {/* papan = seluruh layar */}
      <div className="absolute inset-0">
        <Board3D
          state={state}
          buildable={buildable}
          onTileClick={(id) => buildable.has(id) && act({ type: "build", tile: id })}
        />
      </div>

      {/* HUD */}
      <PlayerStrip state={state} />
      <FloatingLog log={state.log} />
      <EventBanner state={state} />
      <CardReveal state={state} />
      <ActionDock state={state} myTurn={myTurn} me={me} act={act} />
      <AuctionOverlay state={state} me={me} act={act} />
      <QuizOverlay state={state} me={me} act={act} />
      <LobbyOverlay state={state} me={me} act={act} code={code} />

      {/* giliranmu! */}
      {myTurn && state.canRoll && !state.auction && !state.quiz && state.pendingBuy === null && (
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
                    {own.houses > 0 && <span>{own.houses === 5 ? "🏨" : "🏠".repeat(own.houses)}</span>}
                    {myTurn && buildable.has(t.id) && (
                      <button
                        onClick={() => act({ type: "build", tile: t.id })}
                        className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-emerald-950 hover:bg-emerald-400"
                      >
                        +🏠
                      </button>
                    )}
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
