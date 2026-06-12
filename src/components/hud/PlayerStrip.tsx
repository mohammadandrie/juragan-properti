"use client";

import { ClientGameState } from "@/lib/types";
import MoneyCounter from "./MoneyCounter";

const PAWN_ICONS: Record<string, string> = {
  default: "♟️",
  bajaj: "🛺",
  pinisi: "⛵",
  komodo: "🦎",
  garuda: "🦅",
  ojek: "🏍️",
};

// Strip avatar pemain mengambang di atas; pemain terkaya dapat mahkota.
export default function PlayerStrip({ state }: { state: ClientGameState }) {
  const richest = state.players.filter((p) => !p.bankrupt).reduce(
    (a, b) => (b.money > a.money ? b : a),
    state.players[0]
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-2 sm:gap-4">
      {state.players.map((p, i) => {
        const isTurn = state.phase === "playing" && i === state.currentPlayer;
        return (
          <div
            key={p.id}
            className={`flex flex-col items-center transition-all duration-300 ${
              p.bankrupt ? "opacity-30 grayscale" : ""
            } ${isTurn ? "scale-110" : "scale-100"}`}
          >
            <div className="relative">
              {richest.id === p.id && !p.bankrupt && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base animate-bounce">👑</span>
              )}
              <div
                className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full text-lg sm:text-xl shadow-lg ${
                  isTurn ? "ring-[3px] ring-white/90 animate-pulse" : "ring-2 ring-white/20"
                }`}
                style={{ background: `${p.color}cc`, boxShadow: `0 0 18px ${p.color}66` }}
              >
                {PAWN_ICONS[p.pawn]}
              </div>
              {p.inJail && <span className="absolute -bottom-1 -right-1 text-sm">🚔</span>}
              {p.bot && <span className="absolute -bottom-1 -left-1 text-[10px]">🤖</span>}
            </div>
            <span className="mt-1 max-w-[72px] truncate text-[10px] sm:text-xs font-bold text-white/90 drop-shadow">
              {p.name}
              {p.id === state.you && " ✦"}
            </span>
            <MoneyCounter value={p.money} className="text-[10px] sm:text-xs font-black text-amber-300 drop-shadow" />
          </div>
        );
      })}
    </div>
  );
}
