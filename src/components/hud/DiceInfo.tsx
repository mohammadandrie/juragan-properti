"use client";

import { useEffect, useRef, useState } from "react";
import { ClientGameState } from "@/lib/types";
import { BOARD } from "@/lib/board";

// Banner ringkas hasil dadu: "🎲 Angka dadu: X · Menuju: <kota>".
// Muncul saat dadu baru keluar, auto-hilang setelah beberapa detik.
export default function DiceInfo({ state }: { state: ClientGameState }) {
  const [info, setInfo] = useState<{ sum: number; dest: number | null } | null>(null);
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!state.lastDice) return;
    // hanya trigger saat dadu benar-benar berubah
    const diceKey = `${state.lastDice[0]}-${state.lastDice[1]}-${state.destTile}`;
    if (lastKey.current === diceKey) return;
    lastKey.current = diceKey;
    setInfo({ sum: state.lastDice[0] + state.lastDice[1], dest: state.destTile });
    const t = setTimeout(() => setInfo(null), 3500);
    return () => clearTimeout(t);
  }, [state.lastDice, state.destTile, state.version]);

  if (!info) return null;
  const destName = info.dest != null ? BOARD[info.dest].name : null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-28 z-30 -translate-x-1/2 px-4">
      <div className="animate-[dropIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] flex items-center gap-2 rounded-full bg-black/65 px-4 py-1.5 text-sm font-bold text-white backdrop-blur ring-1 ring-amber-300/30">
        <span>🎲 Angka dadu: <b className="text-amber-300">{info.sum}</b></span>
        {destName && (
          <span className="text-white/80">
            · Menuju <b className="text-amber-300">{destName}</b>
          </span>
        )}
      </div>
    </div>
  );
}
