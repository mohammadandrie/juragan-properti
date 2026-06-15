"use client";

import { useEffect, useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { buyCost, sellValue, fmtMoney } from "@/lib/money";

type Me = { id: string; money: number; hasUsedBankLoan: boolean } | null;

// Overlay keputusan saat mendarat: beli kota / bayar sewa / upgrade.
export default function InteractionOverlay({
  state,
  me,
  act,
  onPreviewTile,
}: {
  state: ClientGameState;
  me: Me;
  act: (a: GameAction) => void;
  onPreviewTile?: (tileId: number | null) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const secsLeft =
    state.phaseDeadline !== null ? Math.max(0, Math.ceil((state.phaseDeadline - now) / 1000)) : null;

  const buy = state.pendingBuy;
  const rent = state.pendingRent;
  const up = state.pendingUpgrade;

  // hanya tampil untuk pemain yang sedang diminta keputusan
  const mineBuy = buy && me && buy.playerId === me.id;
  const mineRent = rent && me && rent.playerId === me.id;
  const mineUp = up && me && up.playerId === me.id;
  if (!mineBuy && !mineRent && !mineUp) {
    // tampilkan info pasif kalau pemain lain sedang memutuskan
    const who =
      buy ? state.players.find((p) => p.id === buy.playerId) :
      rent ? state.players.find((p) => p.id === rent.playerId) :
      up ? state.players.find((p) => p.id === up.playerId) : null;
    if (!who) return null;
    return (
      <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold text-white/70 backdrop-blur">
        <b style={{ color: who.color }}>{who.name}</b> sedang memutuskan…
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex flex-col items-center gap-2 px-4">
      {mineBuy && buy && <BuyPanel tileId={buy.tile} maxLevel={buy.maxLevel} money={me!.money} act={act} secs={secsLeft} />}
      {mineRent && rent && (
        <RentPanel state={state} me={me!} act={act} secs={secsLeft} onPreviewTile={onPreviewTile} />
      )}
      {mineUp && up && <UpgradePanel tileId={up.tile} toLevel={up.toLevel} cost={up.cost} act={act} secs={secsLeft} />}
    </div>
  );
}

function Timer({ secs }: { secs: number | null }) {
  if (secs === null) return null;
  return (
    <span className={`ml-1 tabular-nums ${secs <= 5 ? "text-rose-400 font-black" : "text-white/60"}`}>
      {secs}s
    </span>
  );
}

function TileChip({ tileId }: { tileId: number }) {
  const tile = BOARD[tileId];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: tile.group ? GROUP_COLORS[tile.group] : "#64748b" }} />
      <b className="text-amber-300">{tile.name}</b>
    </span>
  );
}

function BuyPanel({
  tileId,
  maxLevel,
  money,
  act,
  secs,
}: {
  tileId: number;
  maxLevel: number;
  money: number;
  act: (a: GameAction) => void;
  secs: number | null;
}) {
  const tile = BOARD[tileId];
  const base = tile.price ?? 0;
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  return (
    <div className="pointer-events-auto flex max-w-[92vw] flex-col items-center gap-2 rounded-2xl bg-black/65 px-5 py-3 backdrop-blur-md ring-1 ring-white/15">
      <p className="text-sm font-semibold text-white">
        Beli <TileChip tileId={tileId} />? <Timer secs={secs} />
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {levels.map((lvl) => {
          const cost = buyCost(base, lvl);
          const afford = money >= cost;
          return (
            <button
              key={lvl}
              disabled={!afford}
              onClick={() => act({ type: "buyLevel", level: lvl })}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                afford
                  ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  : "bg-white/10 text-white/40"
              }`}
            >
              {lvl === 1 ? "Tanah" : `Lv${lvl}`} · {fmtMoney(cost)}
            </button>
          );
        })}
        <button
          onClick={() => act({ type: "skipBuy" })}
          className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/25 active:scale-95 transition"
        >
          Lewati
        </button>
      </div>
    </div>
  );
}

function UpgradePanel({
  tileId,
  toLevel,
  cost,
  act,
  secs,
}: {
  tileId: number;
  toLevel: number;
  cost: number;
  act: (a: GameAction) => void;
  secs: number | null;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/65 px-5 py-2.5 backdrop-blur-md ring-1 ring-white/15">
      <span className="text-sm font-semibold text-white">
        Upgrade <TileChip tileId={tileId} /> ke {toLevel === 5 ? "Gedung 🏨" : `Lv${toLevel}`} ({fmtMoney(cost)})?
        <Timer secs={secs} />
      </span>
      <button
        onClick={() => act({ type: "upgrade" })}
        className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-black text-amber-950 hover:bg-amber-400 active:scale-95 transition"
      >
        🏗️ Upgrade
      </button>
      <button
        onClick={() => act({ type: "skipUpgrade" })}
        className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/25 active:scale-95 transition"
      >
        Nanti
      </button>
    </div>
  );
}

function RentPanel({
  state,
  me,
  act,
  secs,
  onPreviewTile,
}: {
  state: ClientGameState;
  me: { id: string; money: number; hasUsedBankLoan: boolean };
  act: (a: GameAction) => void;
  secs: number | null;
  onPreviewTile?: (tileId: number | null) => void;
}) {
  const rent = state.pendingRent!;
  const owner = state.players.find((p) => p.id === rent.ownerId);
  const canCash = me.money >= rent.amount;
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<number | null>(null);

  // aset milikku untuk dijual
  const myTiles = Object.entries(state.ownership)
    .filter(([, o]) => o.owner === me.id)
    .map(([id]) => Number(id));

  const pickedValue = [...picked].reduce(
    (s, id) => s + sellValue(state.ownership[id].totalInvestment),
    0
  );
  const cashAfterSell = me.money + pickedValue;
  const canSellPay = cashAfterSell >= rent.amount && picked.size > 0;

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // klik nama kota = preview lokasi (kamera fokus tile)
  const previewTile = (id: number) => {
    const next = preview === id ? null : id;
    setPreview(next);
    onPreviewTile?.(next);
  };
  const clearPreview = () => {
    setPreview(null);
    onPreviewTile?.(null);
  };

  return (
    <div className="pointer-events-auto flex max-w-[92vw] flex-col items-center gap-2 rounded-2xl bg-black/70 px-5 py-3 backdrop-blur-md ring-1 ring-rose-400/30">
      <p className="text-sm font-semibold text-white">
        Bayar sewa <b className="text-rose-300">{fmtMoney(rent.amount)}</b> ke{" "}
        <b style={{ color: owner?.color }}>{owner?.name}</b> di <TileChip tileId={rent.tile} />
        <Timer secs={secs} />
      </p>

      {!canCash && myTiles.length > 0 && (
        <div className="flex max-w-full flex-col gap-1">
          <p className="text-center text-[10px] text-white/50">
            Klik nama kota untuk lihat lokasi · centang untuk dijual
          </p>
          {myTiles.map((id) => {
            const sel = picked.has(id);
            const own = state.ownership[id];
            const isPreview = preview === id;
            return (
              <div
                key={id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] transition ${
                  isPreview ? "bg-amber-400/20 ring-1 ring-amber-300/50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(id)}
                  className="h-3.5 w-3.5 accent-amber-400"
                />
                <button
                  onClick={() => previewTile(id)}
                  className="flex-1 text-left font-bold text-white hover:text-amber-300 transition"
                >
                  {BOARD[id].name} <span className="text-white/50">Lv{own.level}</span>
                </button>
                <span className="text-emerald-300">+{fmtMoney(sellValue(own.totalInvestment))}</span>
              </div>
            );
          })}
          <p className="text-center text-[10px] text-white/60">
            Terkumpul: <b className="text-emerald-300">{fmtMoney(me.money + pickedValue)}</b> / {fmtMoney(rent.amount)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {canCash ? (
          <button
            onClick={() => act({ type: "payRentCash" })}
            className="rounded-full bg-emerald-500 px-5 py-1.5 text-sm font-black text-emerald-950 hover:bg-emerald-400 active:scale-95 transition"
          >
            💵 Bayar Tunai
          </button>
        ) : (
          <>
            <button
              disabled={!canSellPay}
              onClick={() => {
                clearPreview();
                act({ type: "sellAndPay", tiles: [...picked] });
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-black transition active:scale-95 ${
                canSellPay ? "bg-amber-500 text-amber-950 hover:bg-amber-400" : "bg-white/10 text-white/40"
              }`}
            >
              📉 Jual & Bayar
            </button>
            {!me.hasUsedBankLoan && (
              <button
                onClick={() => {
                  clearPreview();
                  act({ type: "bankLoan" });
                }}
                className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-black text-sky-950 hover:bg-sky-400 active:scale-95 transition"
              >
                🏦 Pinjam Bank
              </button>
            )}
            <button
              onClick={() => {
                clearPreview();
                act({ type: "surrender" });
              }}
              className="rounded-full bg-rose-600/80 px-4 py-1.5 text-sm font-bold text-white hover:bg-rose-500 active:scale-95 transition"
            >
              🏳️ Menyerah
            </button>
          </>
        )}
      </div>
    </div>
  );
}
