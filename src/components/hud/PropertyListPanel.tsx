"use client";

import { ClientGameState } from "@/lib/types";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { fmtMoney, sellValue } from "@/lib/money";

// Panel list properti milikku — muncul mengambang tengah-kanan saat tombol
// "Propertiku" ditekan. Hover/klik item akan menandai petak di papan agar mudah
// dikenali. Mode read-only di sini; mode jual punya panel sendiri.
export default function PropertyListPanel({
  state,
  tiles,
  highlightTiles,
  onHover,
  onClose,
}: {
  state: ClientGameState;
  tiles: number[];
  highlightTiles: number[];
  onHover: (id: number | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-3 top-16 z-30 w-80 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl bg-slate-900/95 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-black text-white">Daftar Properti</div>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-2.5 py-1 text-base font-bold text-white/80 hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      {tiles.length === 0 ? (
        <p className="mt-4 text-base text-white/55">Belum ada properti yang dimiliki.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {tiles.map((id) => {
            const t = BOARD[id];
            const own = state.ownership[id];
            const sell = sellValue(own.totalInvestment);
            const active = highlightTiles.includes(id);
            return (
              <li key={id}>
                <button
                  onMouseEnter={() => onHover(id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onHover(active ? null : id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 transition ${
                    active ? "bg-amber-400/20 ring-amber-300" : "bg-black/30 ring-white/10 hover:bg-black/45"
                  }`}
                >
                  <span
                    className="h-7 w-2 shrink-0 rounded-full"
                    style={{ background: t.group ? GROUP_COLORS[t.group] : "#64748b" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-white">{t.name}</div>
                    <div className="text-xs text-white/55">
                      {t.type === "property" ? `Level ${own.level}` : t.type === "airport" ? "Bandara" : "Utilitas"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/45">Nilai jual</div>
                    <div className="text-sm font-bold text-emerald-300">{fmtMoney(sell)}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
