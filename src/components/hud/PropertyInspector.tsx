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
      rentText = `${fmtMoney(UTILITY_RENT[0])} – ${fmtMoney(UTILITY_RENT[1])}`;
    }
  }

  return (
    <div className="absolute right-3 top-16 z-30 w-80 animate-[dropIn_0.3s_ease-out] rounded-2xl bg-slate-900/95 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="h-12 w-2.5 rounded-full" style={{ background: groupColor }} />
          <div>
            <div className="text-xl font-black leading-tight text-white">{tile.name}</div>
            <div className="text-sm text-white/55">
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
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-base font-bold text-white/80 hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      {!buyable ? (
        <p className="mt-4 text-base text-white/60">Petak khusus — tidak bisa dimiliki.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Field label="Status" value={owner ? "Dimiliki" : "Belum dimiliki"} tone={owner ? "warn" : "ok"} />
          {owner && <Field label="Pemilik" value={owner.name} color={owner.color} />}
          {tile.type === "property" && (
            <Field label="Tingkat" value={own ? `Level ${own.level}${own.level === 5 ? " · Hotel" : ""}` : "—"} />
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
    <div className="rounded-lg bg-black/30 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-white/45">{label}</div>
      <div
        className="whitespace-nowrap text-base font-bold"
        style={color ? { color } : undefined}
      >
        <span className={tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-white"}>
          {value}
        </span>
      </div>
    </div>
  );
}
