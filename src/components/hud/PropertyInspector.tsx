"use client";

import { ClientGameState } from "@/lib/types";
import { BOARD, GROUP_COLORS, GROUP_LABELS, AIRPORT_RENT, UTILITY_RENT } from "@/lib/board";
import { rentForLevel, buyCost, fmtMoney } from "@/lib/money";

// Panel bawah: detail properti yang dipilih (klik tile). Bukan log.
export default function PropertyInspector({
  state,
  selected,
}: {
  state: ClientGameState;
  selected: number | null;
}) {
  if (selected == null) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-white/40">
        Pilih properti untuk melihat detail.
      </div>
    );
  }

  const tile = BOARD[selected];
  const own = state.ownership[selected];
  const owner = own ? state.players.find((p) => p.id === own.owner) : null;
  const buyable = tile.type === "property" || tile.type === "airport" || tile.type === "utility";

  if (!buyable) {
    return (
      <div className="flex h-full flex-col justify-center px-4">
        <div className="text-sm font-black text-white">{tile.name}</div>
        <div className="text-xs text-white/50">Petak khusus — tidak bisa dimiliki.</div>
      </div>
    );
  }

  const groupColor = tile.group ? GROUP_COLORS[tile.group] : "#64748b";

  // hitung sewa untuk ditampilkan
  let rentText: string;
  if (tile.type === "property") {
    const lvl = own?.level ?? 1;
    rentText = own ? fmtMoney(rentForLevel(tile.price ?? 0, lvl)) : `mulai ${fmtMoney(rentForLevel(tile.price ?? 0, 1))}`;
  } else if (tile.type === "airport") {
    rentText = `${fmtMoney(AIRPORT_RENT[0])} – ${fmtMoney(AIRPORT_RENT[3])}`;
  } else {
    rentText = `${fmtMoney(UTILITY_RENT[0])} / ${fmtMoney(UTILITY_RENT[1])}`;
  }

  return (
    <div className="flex h-full items-center gap-4 overflow-x-auto px-4">
      {/* identitas */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="h-10 w-2 rounded-full" style={{ background: groupColor }} />
        <div>
          <div className="text-base font-black text-white">{tile.name}</div>
          <div className="text-[11px] text-white/50">
            {tile.group ? GROUP_LABELS[tile.group] : tile.type === "airport" ? "Bandara" : "Utilitas"}
          </div>
        </div>
      </div>

      <div className="h-10 w-px shrink-0 bg-white/10" />

      {/* detail */}
      <Field label="Status" value={owner ? "Dimiliki" : "Belum dimiliki"} tone={owner ? "warn" : "ok"} />
      {owner && <Field label="Pemilik" value={owner.name} color={owner.color} />}
      {tile.type === "property" && (
        <Field label="Level" value={own ? `Lv${own.level}${own.level === 5 ? " 🏨" : ""}` : "—"} />
      )}
      <Field label="Harga" value={fmtMoney(tile.price ?? 0)} />
      <Field label="Sewa" value={rentText} />
      {tile.type === "property" && own && own.level < 5 && (
        <Field label="Upgrade berikutnya" value={fmtMoney(buyCost(tile.price ?? 0, own.level + 1) - buyCost(tile.price ?? 0, own.level))} />
      )}
      {tile.umr && <Field label="UMR" value={fmtMoney(tile.umr)} />}
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
    <div className="shrink-0">
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <div
        className="text-sm font-bold"
        style={color ? { color } : undefined}
      >
        <span className={tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-white"}>
          {value}
        </span>
      </div>
    </div>
  );
}
