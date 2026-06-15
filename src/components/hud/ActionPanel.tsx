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

// Panel BAWAH: deretan tombol aksi mengambang (tanpa background panel) — roll,
// beli, sewa, upgrade, penjara, emote. Reveal interaksi ditahan saat `animating`
// (pion sedang berjalan) agar tombol baru muncul setelah pion sampai tujuan.
export default function ActionPanel({
  state,
  myTurn,
  me,
  act,
  onPreviewTile,
  animating,
}: {
  state: ClientGameState;
  myTurn: boolean;
  me: Me;
  act: (a: GameAction) => void;
  onPreviewTile?: (tileId: number | null) => void;
  animating?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const secsLeft =
    state.phaseDeadline !== null ? Math.max(0, Math.ceil((state.phaseDeadline - now) / 1000)) : null;

  const buy = animating ? null : state.pendingBuy;
  const rent = animating ? null : state.pendingRent;
  const up = animating ? null : state.pendingUpgrade;
  const mineBuy = !!(buy && me && buy.playerId === me.id);
  const mineRent = !!(rent && me && rent.playerId === me.id);
  const mineUp = !!(up && me && up.playerId === me.id);
  const anyPending = buy || rent || up || (animating ? null : state.quiz);

  const cur = state.players[state.currentPlayer];
  const canRoll = state.canRoll && !animating;

  // saat animasi berjalan, sembunyikan deret tombol (cukup tampil status)
  return (
    <div className="flex min-h-[4.5rem] flex-wrap items-center justify-center gap-2 px-2 py-1">
      {/* status giliran ringkas */}
      {state.phase === "playing" && !mineBuy && !mineRent && !mineUp && (
        <span className="text-base font-bold">
          {animating ? (
            <span className="text-amber-300/80">Pion berjalan…</span>
          ) : myTurn ? (
            <span className="text-amber-300">Giliranmu!</span>
          ) : (
            <span className="text-white/60">
              Giliran <b style={{ color: cur?.color }}>{cur?.name}</b>
              {cur?.bot && " 🤖"}…
            </span>
          )}
        </span>
      )}

      {/* penjara */}
      {myTurn && me?.inJail && canRoll && (
        <>
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
        </>
      )}

      {/* lempar dadu */}
      {myTurn && canRoll && !anyPending && !me?.inJail && (
        <button
          onClick={() => act({ type: "roll" })}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-8 text-2xl font-black text-white shadow-[0_0_30px_-6px_rgba(244,63,94,0.7)] ring-2 ring-white/20 hover:scale-[1.03] active:scale-95 transition"
        >
          🎲 LEMPAR DADU
        </button>
      )}

      {/* beli kota */}
      {mineBuy && buy && (
        <>
          <Label tileId={buy.tile} secs={secsLeft} prefix="Kota kosong:" />
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
                {lvl === 1 ? "🏞️ Beli Tanah" : `🏗️ Lv${lvl}`} · {fmtMoney(cost)}
              </button>
            );
          })}
          <button onClick={() => act({ type: "skipBuy" })} className={btn("ghost")}>
            Lewati
          </button>
        </>
      )}

      {/* upgrade kota sendiri */}
      {mineUp && up && (
        <>
          <Label tileId={up.tile} secs={secsLeft} prefix={`Upgrade ke ${up.toLevel === 5 ? "Gedung 🏨" : `Lv${up.toLevel}`}:`} />
          <button onClick={() => act({ type: "upgrade" })} className={btn("amber")}>
            🏗️ Upgrade · {fmtMoney(up.cost)}
          </button>
          <button onClick={() => act({ type: "skipUpgrade" })} className={btn("ghost")}>
            Nanti
          </button>
        </>
      )}

      {/* bayar sewa */}
      {mineRent && rent && me && (
        <RentRow state={state} me={me} act={act} secs={secsLeft} onPreviewTile={onPreviewTile} />
      )}

      {/* info pasif: pemain lain memutuskan */}
      {anyPending && !mineBuy && !mineRent && !mineUp && (
        <span className="text-sm text-white/50">Pemain lain sedang memutuskan…</span>
      )}

      {/* emote (selalu tersedia) */}
      {me && !animating && (
        <div className="ml-auto flex items-center gap-1">
          {["😂", "🔥", "😭", "👍", "😡", "🤑"].map((e) => (
            <button
              key={e}
              onClick={() => act({ type: "emote", icon: e })}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-xl ring-1 ring-white/10 hover:bg-black/50 hover:scale-110 active:scale-95 transition"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ tileId, secs, prefix }: { tileId: number; secs: number | null; prefix: string }) {
  const tile = BOARD[tileId];
  return (
    <span className="inline-flex items-center gap-2 text-base font-bold text-white">
      <span className="text-white/60">{prefix}</span>
      <span
        className="h-3 w-3 rounded-sm"
        style={{ background: tile.group ? GROUP_COLORS[tile.group] : "#64748b" }}
      />
      {tile.name}
      {secs !== null && (
        <span className={`text-sm tabular-nums ${secs <= 5 ? "font-black text-rose-400" : "text-white/40"}`}>
          {secs}s
        </span>
      )}
    </span>
  );
}

function RentRow({
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
    <>
      <span className="inline-flex items-center gap-2 text-base font-bold text-white">
        Sewa <b className="text-rose-300">{fmtMoney(rent.amount)}</b> ke{" "}
        <b style={{ color: owner?.color }}>{owner?.name}</b>
        {secs !== null && (
          <span className={`text-sm tabular-nums ${secs <= 5 ? "font-black text-rose-400" : "text-white/40"}`}>
            {secs}s
          </span>
        )}
      </span>

      {canCash ? (
        <button onClick={() => act({ type: "payRentCash" })} className={btn("emerald")}>
          💵 Bayar Tunai
        </button>
      ) : (
        <>
          {myTiles.length > 0 && (
            <div className="flex max-w-md flex-wrap items-center gap-1 rounded-xl bg-black/25 p-2">
              <span className="text-xs text-white/40">Jual aset:</span>
              {myTiles.map((id) => {
                const own = state.ownership[id];
                const on = picked.has(id);
                return (
                  <button
                    key={id}
                    onMouseEnter={() => onPreviewTile?.(id)}
                    onMouseLeave={() => onPreviewTile?.(null)}
                    onClick={() => toggle(id)}
                    className={`rounded-lg px-2 py-1 text-xs font-bold ring-1 transition ${
                      on ? "bg-amber-400 text-amber-950 ring-amber-300" : "bg-white/5 text-white ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    {BOARD[id].name} Lv{own.level}{" "}
                    <span className="text-emerald-300">+{fmtMoney(sellValue(own.totalInvestment))}</span>
                  </button>
                );
              })}
              <span className="text-xs text-white/50">
                = <b className="text-emerald-300">{fmtMoney(me.money + pickedValue)}</b>
              </span>
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
    </>
  );
}

type Tone = "emerald" | "amber" | "rose" | "sky" | "ghost";
function btn(tone: Tone): string {
  const base =
    "rounded-xl px-5 py-3 text-base font-bold active:scale-95 transition text-center shadow-lg";
  const tones: Record<Tone, string> = {
    emerald: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400",
    amber: "bg-amber-500 text-amber-950 hover:bg-amber-400",
    rose: "bg-rose-600/90 text-white hover:bg-rose-500",
    sky: "bg-sky-500 text-sky-950 hover:bg-sky-400",
    ghost: "bg-white/10 text-white hover:bg-white/20",
  };
  return `${base} ${tones[tone]}`;
}
function btnDisabled(): string {
  return "rounded-xl px-5 py-3 text-base font-bold bg-white/5 text-white/30 cursor-not-allowed text-center";
}
