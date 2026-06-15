"use client";

import { useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { JAIL_FINE, fmtMoney } from "@/lib/money";

// Dock aksi bawah-tengah: tombol kontekstual yang muncul/hilang sesuai state.
// Tidak ada panel; tombol melayang langsung di atas scene.
export default function ActionDock({
  state,
  myTurn,
  me,
  act,
}: {
  state: ClientGameState;
  myTurn: boolean;
  me: { id: string; money: number; inJail: boolean; jailCards: number } | null;
  act: (a: GameAction) => void;
}) {
  const [emoteOpen, setEmoteOpen] = useState(false);
  const pending =
    state.pendingBuy !== null ||
    state.pendingRent !== null ||
    state.pendingUpgrade !== null ||
    state.quiz !== null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2">
      {/* penjara */}
      {myTurn && me?.inJail && state.canRoll && (
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => act({ type: "payJail" })}
            className="rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-400 active:scale-95 transition"
          >
            💸 Bayar {fmtMoney(JAIL_FINE)}
          </button>
          {me.jailCards > 0 && (
            <button
              onClick={() => act({ type: "useJailCard" })}
              className="rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-400 active:scale-95 transition"
            >
              🎟️ Pakai Kartu
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* emote */}
        {me && (
          <div className="pointer-events-auto relative">
            <button
              onClick={() => setEmoteOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg backdrop-blur hover:bg-black/70 active:scale-95 transition ring-1 ring-white/15"
            >
              😀
            </button>
            {emoteOpen && (
              <div className="absolute bottom-13 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-md ring-1 ring-white/15">
                {["😂", "🔥", "😭", "👍", "😡", "🤑"].map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      act({ type: "emote", icon: e });
                      setEmoteOpen(false);
                    }}
                    className="rounded-full px-1.5 py-0.5 text-lg hover:scale-125 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* tombol utama */}
        {myTurn && state.canRoll && !pending && (
          <button
            onClick={() => act({ type: "roll" })}
            className="pointer-events-auto group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-4xl shadow-[0_0_40px_-5px_rgba(244,63,94,0.7)] ring-2 ring-white/30 hover:scale-105 active:scale-95 transition animate-[wiggle_2s_ease-in-out_infinite]"
            title="Lempar dadu"
          >
            🎲
            <span className="absolute -top-7 text-xs font-black tracking-wide text-white/90 opacity-0 group-hover:opacity-100 transition">
              LEMPAR!
            </span>
          </button>
        )}

        {myTurn && !state.canRoll && !pending && (
          <button
            onClick={() => act({ type: "endTurn" })}
            className="pointer-events-auto rounded-full bg-white/15 px-6 py-3 text-sm font-black text-white backdrop-blur hover:bg-white/25 active:scale-95 transition ring-1 ring-white/20"
          >
            ⏭️ Akhiri Giliran
          </button>
        )}
      </div>
    </div>
  );
}
