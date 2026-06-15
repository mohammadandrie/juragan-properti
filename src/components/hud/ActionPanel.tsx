"use client";

import { useEffect, useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { JAIL_FINE, buyCost, sellValue, fmtMoney } from "@/lib/money";

type Me = {
  id: string;
  money: number;
  inJail: boolean;
  jailCards: number;
  hasUsedBankLoan: boolean;
} | null;

// Panel kanan: semua interaksi aktif terpusat (roll, beli, sewa, upgrade,
// penjara, emote). Menggantikan popup melayang agar board tidak tertutup.
export default function ActionPanel({
  state,
  myTurn,
  me,
  act,
  onPreviewTile,
}: {
  state: ClientGameState;
  myTurn: boolean;
  me: Me;
  act: (a: GameAction) => void;
  onPreviewTile?: (tileId: number | null) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const secsLeft =
    state.phaseDeadline !== null ? Math.max(0, Math.ceil((state.phaseDeadline - now) / 1000)) : null;

  const buy = state.pendingBuy;
  const rent = state.pendingRent;
  const up = state.pendingUpgrade;
  const mineBuy = !!(buy && me && buy.playerId === me.id);
  const mineRent = !!(rent && me && rent.playerId === me.id);
  const mineUp = !!(up && me && up.playerId === me.id);
  const anyPending = buy || rent || up || state.quiz;

  const cur = state.players[state.currentPlayer];

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-white/40">Aksi</h2>

      {/* status singkat giliran */}
      {state.phase === "playing" && (
        <div className="rounded-xl bg-black/30 px-3 py-2 text-center text-xs ring-1 ring-white/10">
          {myTurn ? (
            <span className="font-black text-amber-300">Giliranmu!</span>
          ) : (
            <span className="text-white/60">
              Giliran <b style={{ color: cur?.color }}>{cur?.name}</b>
              {cur?.bot && " 🤖"}…
            </span>
          )}
        </div>
      )}

      {/* penjara */}
      {myTurn && me?.inJail && state.canRoll && (
        <Card>
          <p className="mb-2 text-xs text-white/70">Kamu di penjara.</p>
          <button onClick={() => act({ type: "payJail" })} className={btn("amber")}>
            💸 Bayar Denda {fmtMoney(JAIL_FINE)}
          </button>
          {me.jailCards > 0 && (
            <button onClick={() => act({ type: "useJailCard" })} className={btn("amber")}>
              🎟️ Pakai Kartu Bebas
            </button>
          )}
          <button onClick={() => act({ type: "roll" })} className={btn("rose")}>
            🎲 Coba Lempar Dobel
          </button>
        </Card>
      )}

      {/* lempar dadu */}
      {myTurn && state.canRoll && !anyPending && !me?.inJail && (
        <Card>
          <button
            onClick={() => act({ type: "roll" })}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-2xl font-black text-white shadow-[0_0_30px_-6px_rgba(244,63,94,0.7)] ring-2 ring-white/20 hover:scale-[1.02] active:scale-95 transition"
          >
            🎲 LEMPAR DADU
          </button>
        </Card>
      )}

      {/* beli kota */}
      {mineBuy && buy && (
        <Card>
          <PanelTitle tileId={buy.tile} secs={secsLeft} />
          <p className="mb-2 text-[11px] text-white/60">Kota kosong — beli atau lewati.</p>
          {Array.from({ length: buy.maxLevel }, (_, i) => i + 1).map((lvl) => {
            const cost = buyCost(BOARD[buy.tile].price ?? 0, lvl);
            const afford = (me?.money ?? 0) >= cost;
            return (
              <button
                key={lvl}
                disabled={!afford}
                onClick={() => act({ type: "buyLevel", level: lvl })}
                className={afford ? btn("emerald") : btnDisabled()}
              >
                {lvl === 1 ? "🏞️ Beli Tanah" : `🏗️ Beli Lv${lvl}`} · {fmtMoney(cost)}
              </button>
            );
          })}
          <button onClick={() => act({ type: "skipBuy" })} className={btn("ghost")}>
            Lewati
          </button>
        </Card>
      )}

      {/* upgrade kota sendiri */}
      {mineUp && up && (
        <Card>
          <PanelTitle tileId={up.tile} secs={secsLeft} />
          <p className="mb-2 text-[11px] text-white/60">
            Upgrade ke {up.toLevel === 5 ? "Gedung 🏨" : `Lv${up.toLevel}`}.
          </p>
          <button onClick={() => act({ type: "upgrade" })} className={btn("amber")}>
            🏗️ Upgrade · {fmtMoney(up.cost)}
          </button>
          <button onClick={() => act({ type: "skipUpgrade" })} className={btn("ghost")}>
            Nanti
          </button>
        </Card>
      )}

      {/* bayar sewa */}
      {mineRent && rent && me && (
        <RentCard state={state} me={me} act={act} secs={secsLeft} onPreviewTile={onPreviewTile} />
      )}

      {/* info pasif: pemain lain memutuskan */}
      {anyPending && !mineBuy && !mineRent && !mineUp && (
        <div className="rounded-xl bg-black/30 px-3 py-2 text-center text-[11px] text-white/50 ring-1 ring-white/10">
          Pemain lain sedang memutuskan…
        </div>
      )}

      {/* emote */}
      {me && (
        <div className="mt-auto">
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">Emote</div>
          <div className="flex flex-wrap gap-1">
            {["😂", "🔥", "😭", "👍", "😡", "🤑"].map((e) => (
              <button
                key={e}
                onClick={() => act({ type: "emote", icon: e })}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-base ring-1 ring-white/10 hover:bg-black/50 hover:scale-110 active:scale-95 transition"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-black/30 p-2.5 ring-1 ring-white/10">{children}</div>
  );
}

function PanelTitle({ tileId, secs }: { tileId: number; secs: number | null }) {
  const tile = BOARD[tileId];
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: tile.group ? GROUP_COLORS[tile.group] : "#64748b" }}
        />
        {tile.name}
      </span>
      {secs !== null && (
        <span className={`text-xs tabular-nums ${secs <= 5 ? "font-black text-rose-400" : "text-white/40"}`}>
          {secs}s
        </span>
      )}
    </div>
  );
}

function RentCard({
  state,
  me,
  act,
  secs,
  onPreviewTile,
}: {
  state: ClientGameState;
  me: NonNullable<Me>;
  act: (a: GameAction) => void;
  secs: number | null;
  onPreviewTile?: (tileId: number | null) => void;
}) {
  const rent = state.pendingRent!;
  const owner = state.players.find((p) => p.id === rent.ownerId);
  const canCash = me.money >= rent.amount;
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const myTiles = Object.entries(state.ownership)
    .filter(([, o]) => o.owner === me.id)
    .map(([id]) => Number(id));

  const pickedValue = [...picked].reduce(
    (s, id) => s + sellValue(state.ownership[id].totalInvestment),
    0
  );
  const canSellPay = me.money + pickedValue >= rent.amount && picked.size > 0;

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <PanelTitle tileId={rent.tile} secs={secs} />
      <p className="text-[11px] text-white/70">
        Bayar sewa <b className="text-rose-300">{fmtMoney(rent.amount)}</b> ke{" "}
        <b style={{ color: owner?.color }}>{owner?.name}</b>.
      </p>

      {canCash ? (
        <button onClick={() => act({ type: "payRentCash" })} className={btn("emerald")}>
          💵 Bayar Tunai
        </button>
      ) : (
        <>
          {myTiles.length > 0 && (
            <div className="flex flex-col gap-0.5 rounded-lg bg-black/25 p-1.5">
              <p className="text-center text-[9px] text-white/40">Centang aset untuk dijual</p>
              {myTiles.map((id) => {
                const own = state.ownership[id];
                return (
                  <label
                    key={id}
                    className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] hover:bg-white/5"
                    onMouseEnter={() => onPreviewTile?.(id)}
                    onMouseLeave={() => onPreviewTile?.(null)}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(id)}
                      onChange={() => toggle(id)}
                      className="h-3 w-3 accent-amber-400"
                    />
                    <span className="flex-1 truncate font-bold text-white">
                      {BOARD[id].name} <span className="text-white/40">Lv{own.level}</span>
                    </span>
                    <span className="text-emerald-300">+{fmtMoney(sellValue(own.totalInvestment))}</span>
                  </label>
                );
              })}
              <p className="text-center text-[9px] text-white/50">
                Terkumpul <b className="text-emerald-300">{fmtMoney(me.money + pickedValue)}</b> /{" "}
                {fmtMoney(rent.amount)}
              </p>
            </div>
          )}
          <button
            disabled={!canSellPay}
            onClick={() => {
              onPreviewTile?.(null);
              act({ type: "sellAndPay", tiles: [...picked] });
            }}
            className={canSellPay ? btn("amber") : btnDisabled()}
          >
            📉 Jual & Bayar
          </button>
          {!me.hasUsedBankLoan && (
            <button onClick={() => act({ type: "bankLoan" })} className={btn("sky")}>
              🏦 Pinjam Bank
            </button>
          )}
          <button onClick={() => act({ type: "surrender" })} className={btn("rose")}>
            🏳️ Menyerah
          </button>
        </>
      )}
    </Card>
  );
}

type Tone = "emerald" | "amber" | "rose" | "sky" | "ghost";
function btn(tone: Tone): string {
  const base =
    "w-full rounded-xl px-3 py-2 text-sm font-bold active:scale-95 transition text-center";
  const tones: Record<Tone, string> = {
    emerald: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400",
    amber: "bg-amber-500 text-amber-950 hover:bg-amber-400",
    rose: "bg-rose-600/80 text-white hover:bg-rose-500",
    sky: "bg-sky-500 text-sky-950 hover:bg-sky-400",
    ghost: "bg-white/10 text-white hover:bg-white/20",
  };
  return `${base} ${tones[tone]}`;
}
function btnDisabled(): string {
  return "w-full rounded-xl px-3 py-2 text-sm font-bold bg-white/5 text-white/30 cursor-not-allowed text-center";
}
