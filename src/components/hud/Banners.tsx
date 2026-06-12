"use client";

import { useEffect, useState } from "react";
import { ClientGameState } from "@/lib/types";
import { eventById } from "@/lib/events";
import { BOARD } from "@/lib/board";

// Banner event viral: masuk dramatis dari atas, auto-hilang 6 detik.
export function EventBanner({ state }: { state: ClientGameState }) {
  const [shown, setShown] = useState<number | null>(null);
  const ev = state.lastEvent ? eventById(state.lastEvent.eventId) : null;

  useEffect(() => {
    if (!state.lastEvent) return;
    setShown(state.lastEvent.at);
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [state.lastEvent?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ev || shown === null || shown !== state.lastEvent?.at) return null;
  const tileName = state.lastEvent.tile != null ? BOARD[state.lastEvent.tile].name : null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-20 z-30 w-full max-w-md -translate-x-1/2 px-4">
      <div
        className={`animate-[dropIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)] rounded-2xl p-[2px] ${
          ev.good
            ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
            : "bg-gradient-to-r from-rose-500 via-red-500 to-orange-500"
        }`}
      >
        <div className="rounded-2xl bg-slate-950/90 px-5 py-4 backdrop-blur">
          <p className="flex items-center gap-2 text-lg font-black text-white">
            <span className="text-2xl">{ev.icon}</span> {ev.title}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {ev.desc}
            {tileName && <b className="text-amber-300"> ({tileName})</b>}
          </p>
        </div>
      </div>
    </div>
  );
}

// Kartu kesempatan/dana umum: flip muncul di tengah, auto-hilang.
export function CardReveal({ state }: { state: ClientGameState }) {
  const [shownAt, setShownAt] = useState<number | null>(null);

  useEffect(() => {
    if (!state.lastCard) return;
    setShownAt(state.lastCard.at);
    const t = setTimeout(() => setShownAt(null), 5000);
    return () => clearTimeout(t);
  }, [state.lastCard?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.lastCard || shownAt !== state.lastCard.at) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2">
      <div className="animate-[cardFlip_0.6s_ease-out] w-60 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-50 to-amber-100 p-5 text-center shadow-[0_0_50px_-5px_rgba(251,191,36,0.6)]">
        <p className="text-4xl">{state.lastCard.icon}</p>
        <p className="mt-2 text-sm font-bold text-amber-950">{state.lastCard.text}</p>
      </div>
    </div>
  );
}
