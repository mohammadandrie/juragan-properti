"use client";

import { ClientGameState, GameAction } from "@/lib/types";
import { fmtMoney } from "@/lib/money";
import Avatar from "./Avatar";

// Panel kiri: kartu tiap pemain — avatar besar, nama, saldo, jumlah properti,
// status pinjaman bank, status giliran. Tombol menyerah untuk pemain lokal.
export default function PlayerPanel({
  state,
  act,
}: {
  state: ClientGameState;
  act: (a: GameAction) => void;
}) {
  const richestId = state.players
    .filter((p) => !p.bankrupt)
    .reduce((a, b) => (b.money > a.money ? b : a), state.players[0])?.id;

  // jumlah properti per pemain
  const propCount: Record<string, number> = {};
  for (const own of Object.values(state.ownership)) {
    propCount[own.owner] = (propCount[own.owner] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      <h2 className="px-1 text-xs font-black uppercase tracking-wider text-white/40">Pemain</h2>
      {state.players.map((p, i) => {
        const isTurn = state.phase === "playing" && i === state.currentPlayer;
        const isLocal = p.id === state.you;
        const out = p.bankrupt || p.surrendered;
        return (
          <div
            key={p.id}
            className={`rounded-2xl p-2.5 ring-1 transition ${
              isTurn
                ? "bg-white/10 ring-amber-300/60 shadow-[0_0_20px_-6px_rgba(251,191,36,0.6)]"
                : "bg-black/30 ring-white/10"
            } ${out ? "opacity-40 grayscale" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Avatar pawn={p.pawn} color={p.color} size={52} />
                {richestId === p.id && !out && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">👑</span>
                )}
                {p.inJail && <span className="absolute -bottom-1 -right-1 text-sm">🚔</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-base font-bold text-white" style={{ color: p.color }}>
                    {p.name}
                  </span>
                  {isLocal && <span className="text-xs text-amber-300">✦</span>}
                  {p.bot && <span className="text-xs">🤖</span>}
                </div>
                <div className="text-lg font-black tabular-nums text-amber-300">{fmtMoney(p.money)}</div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <Stat label="Properti" value={`${propCount[p.id] ?? 0} 🏠`} />
              <Stat
                label="Pinjaman"
                value={p.hasUsedBankLoan ? "Terpakai" : "Tersedia"}
                tone={p.hasUsedBankLoan ? "warn" : "ok"}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  out
                    ? "bg-white/10 text-white/50"
                    : isTurn
                      ? "bg-amber-400 text-amber-950"
                      : "bg-white/10 text-white/60"
                }`}
              >
                {out ? (p.bankrupt ? "Bangkrut" : "Menyerah") : isTurn ? "Giliran" : "Menunggu"}
              </span>
              {isLocal && !out && state.phase === "playing" && (
                <button
                  onClick={() => {
                    if (confirm("Yakin menyerah dari permainan?")) act({ type: "surrender" });
                  }}
                  className="rounded-full bg-rose-600/70 px-2.5 py-0.5 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 transition"
                >
                  🏳️ Menyerah
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg bg-black/25 px-2 py-1">
      <div className="text-white/40">{label}</div>
      <div
        className={`font-bold ${
          tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-white/90"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
