"use client";

import { ClientGameState } from "@/lib/types";
import { BOARD, GROUP_COLORS, GROUP_LABELS, AIRPORT_RENT, UTILITY_RENT } from "@/lib/board";
import { rentForLevel, buyCost, fmtMoney } from "@/lib/money";

// Kartu detail properti yang dipilih (klik tile). Mengambang di kanan board,
// muncul HANYA saat ada tile terpilih; tombol ✕ untuk menutup.
export default function PropertyInspector({
  state,
  selected,
  onClose,
}: {
  state: ClientGameState;
  selected: number;
  onClose: () => void;
}) {
  const tile = BOARD[selected];
  const own = state.ownership[selected];
  const owner = own ? state.players.find((p) => p.id === own.owner) : null;
  const buyable = tile.type === "property" || tile.type === "airport" || tile.type === "utility";
  const groupColor = tile.group ? GROUP_COLORS[tile.group] : "#64748b";

  let rentText: string | null = null;
  if (buyable) {
    if (tile.type === "property") {
      const lvl = own?.level ?? 1;
      rentText = own
        ? fmtMoney(rentForLevel(tile.price ?? 0, lvl))
        : `mulai ${fmtMoney(rentForLevel(tile.price ?? 0, 1))}`;
    } else if (tile.type === "airport") {
      rentText = `${fmtMoney(AIRPORT_RENT[0])} – ${fmtMoney(AIRPORT_RENT[3])}`;
    } else {
      rentText = `${fmtMoney(UTILITY_RENT[0])} / ${fmtMoney(UTILITY_RENT[1])}`;
    }
  }

  return (
    <div className="absolute bottom-2 right-2 z-30 w-64 animate-[dropIn_0.3s_ease-out] rounded-2xl bg-slate-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-2 rounded-full" style={{ background: groupColor }} />
          <div>
            <div className="text-lg font-black leading-tight text-white">{tile.name}</div>
            <div className="text-xs text-white/50">
              {tile.group
                ? GROUP_LABELS[tile.group]
                : tile.type === "airport"
                  ? "Bandara"
                  : tile.type === "utility"
                    ? "Utilitas"
                    : "Petak khusus"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-sm font-bold text-white/70 hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      {!buyable ? (
        <p className="mt-3 text-sm text-white/50">Petak khusus — tidak bisa dimiliki.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="Status" value={owner ? "Dimiliki" : "Kosong"} tone={owner ? "warn" : "ok"} />
          {owner && <Field label="Pemilik" value={owner.name} color={owner.color} />}
          {tile.type === "property" && (
            <Field label="Level" value={own ? `Lv${own.level}${own.level === 5 ? " 🏨" : ""}` : "—"} />
          )}
          <Field label="Harga" value={fmtMoney(tile.price ?? 0)} />
          {rentText && <Field label="Sewa" value={rentText} />}
          {tile.type === "property" && own && own.level < 5 && (
            <Field
              label="Upgrade"
              value={fmtMoney(
                buyCost(tile.price ?? 0, own.level + 1) - buyCost(tile.price ?? 0, own.level)
              )}
            />
          )}
          {tile.umr && <Field label="UMR" value={fmtMoney(tile.umr)} />}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  tone,
  color,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-black/30 px-2.5 py-1.5">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="text-sm font-bold" style={color ? { color } : undefined}>
        <span className={tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-white"}>
          {value}
        </span>
      </div>
    </div>
  );
}
