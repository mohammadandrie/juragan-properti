"use client";

import { useEffect, useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { MIN_INCREMENT } from "@/lib/engine/auction";

// Overlay lelang dramatis: kartu properti spotlight + timer + bid war.
export default function AuctionOverlay({
  state,
  me,
  act,
}: {
  state: ClientGameState;
  me: { id: string; money: number } | null;
  act: (a: GameAction) => void;
}) {
  const a = state.auction;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (!a) return null;
  const tile = BOARD[a.tile];
  const secsLeft = Math.max(0, Math.ceil((a.deadline - now) / 1000));
  const highBidder = a.highBidder ? state.players.find((p) => p.id === a.highBidder) : null;
  const myBid = a.highBid + MIN_INCREMENT;
  const canBid =
    me && !a.passed.includes(me.id) && a.highBidder !== me.id && me.money >= myBid;
  const urgent = secsLeft <= 3;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`flex flex-col items-center gap-4 ${urgent ? "animate-[shake_0.4s_ease-in-out_infinite]" : ""}`}>
        <p className="text-2xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
          🔨 LELANG!
        </p>

        {/* kartu properti */}
        <div className="w-64 overflow-hidden rounded-2xl bg-slate-100 shadow-[0_0_60px_-10px_rgba(251,191,36,0.5)]">
          <div
            className="px-4 py-3 text-center text-lg font-black text-white"
            style={{ background: tile.group ? GROUP_COLORS[tile.group] : "#475569" }}
          >
            {tile.name}
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-slate-500">harga normal</p>
            <p className="text-xl font-black text-slate-800">Rp {tile.price}jt</p>
            {tile.umr && (
              <p className="mt-1 text-[10px] text-slate-400">UMR riil: Rp {(tile.umr / 1e6).toFixed(2)}jt/bln</p>
            )}
          </div>
        </div>

        {/* status bid */}
        <div className="text-center">
          {highBidder ? (
            <p className="text-lg font-bold text-white">
              <span style={{ color: highBidder.color }}>{highBidder.name}</span> —{" "}
              <span className="text-2xl font-black text-amber-300">Rp {a.highBid}jt</span>
            </p>
          ) : (
            <p className="text-lg font-semibold text-white/70">Belum ada penawar…</p>
          )}
          <p className={`mt-1 text-4xl font-black tabular-nums ${urgent ? "text-rose-400 scale-125" : "text-white"} transition`}>
            {secsLeft}
          </p>
        </div>

        {/* aksi */}
        {me && (
          <div className="flex gap-3">
            {canBid && (
              <button
                onClick={() => act({ type: "bid", amount: myBid })}
                className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-lg font-black text-amber-950 shadow-lg shadow-amber-500/50 hover:scale-105 active:scale-95 transition"
              >
                Bid Rp {myBid}jt
              </button>
            )}
            {!a.passed.includes(me.id) && a.highBidder !== me.id && (
              <button
                onClick={() => act({ type: "passAuction" })}
                className="rounded-full bg-white/15 px-6 py-3 font-bold text-white hover:bg-white/25 active:scale-95 transition"
              >
                🙅 Mundur
              </button>
            )}
            {a.highBidder === me.id && (
              <p className="rounded-full bg-emerald-500/20 px-6 py-3 font-bold text-emerald-300 ring-1 ring-emerald-400/50">
                Kamu penawar tertinggi! 🤞
              </p>
            )}
            {a.passed.includes(me.id) && (
              <p className="rounded-full bg-white/10 px-6 py-3 font-semibold text-white/50">Kamu mundur dari lelang ini.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
