"use client";

import { useEffect, useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { BOARD, GROUP_COLORS } from "@/lib/board";
import { JAIL_FINE, buyCost, sellValue, fmtMoney } from "@/lib/money";
import type { CameraMode } from "../three/CameraRig";

type Me = {
  id: string;
  money: number;
  inJail: boolean;
  jailCards: number;
  hasUsedBankLoan: boolean;
  afk: boolean;
} | null;

// Panel BAWAH-TENGAH: tombol aksi mengambang tanpa background panel.
// Posisi terpusat di tengah (kanan ada card properti, kiri ada panel pemain).
export default function ActionPanel({
  state,
  myTurn,
  me,
  act,
  onPreviewTile,
  onSetHighlight,
  animating,
  turnSecsLeft,
  onToggleProps,
  propsOpen,
  setCameraMode,
}: {
  state: ClientGameState;
  myTurn: boolean;
  me: Me;
  act: (a: GameAction) => void;
  onPreviewTile?: (tileId: number | null) => void;
  onSetHighlight: (tiles: number[]) => void;
  animating?: boolean;
  turnSecsLeft: number | null;
  onToggleProps: () => void;
  propsOpen: boolean;
  setCameraMode: (m: CameraMode) => void;
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

  // popup konfirmasi (bayar tunai / pinjam bank / jual properti) — bayar sewa
  const [confirmAction, setConfirmAction] = useState<null | "cash" | "loan">(null);
  // mode jual saat bayar sewa: pilih properti yang dijual
  const [sellMode, setSellMode] = useState(false);

  return (
    <>
      <div className="flex min-h-[4.5rem] flex-wrap items-center justify-center gap-2 px-4 py-2">
        {/* AFK: tombol kembali main */}
        {me?.afk && state.phase === "playing" && (
          <button
            onClick={() => act({ type: "resume" })}
            className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-6 text-base font-black text-amber-950 shadow-lg ring-2 ring-white/30 hover:scale-[1.03] active:scale-95 transition"
          >
            🎮 Ambil Alih dari Bot
          </button>
        )}

        {/* status giliran (info pemain lain saat bukan giliranku) */}
        {state.phase === "playing" && !mineBuy && !mineRent && !mineUp && !myTurn && !me?.afk && (
          <span className="text-lg font-bold">
            {animating ? (
              <span className="text-amber-300/80">Pion sedang berjalan…</span>
            ) : (
              <span className="text-white/70">
                Giliran <b style={{ color: cur?.color }}>{cur?.name}</b>
                {cur?.bot && " · 🤖"}
              </span>
            )}
          </span>
        )}

        {/* penjara — tombol */}
        {myTurn && me?.inJail && canRoll && !anyPending && (
          <>
            <span className="text-base font-bold text-rose-300">🚔 Dalam penjara</span>
            <button onClick={() => act({ type: "payJail" })} className={btn("amber")}>
              Bayar Denda {fmtMoney(JAIL_FINE)}
            </button>
            {me.jailCards > 0 && (
              <button onClick={() => act({ type: "useJailCard" })} className={btn("amber")}>
                Pakai Kartu Bebas
              </button>
            )}
            <button onClick={() => act({ type: "roll" })} className={btn("rose")}>
              🎲 Lempar Dadu (dobel)
            </button>
          </>
        )}

        {/* GILIRANMU + tombol lempar (tepat di atas) */}
        {myTurn && canRoll && !anyPending && !me?.inJail && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              Giliranmu
            </span>
            <button
              onClick={() => act({ type: "roll" })}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-10 text-2xl font-black text-white shadow-[0_0_30px_-6px_rgba(244,63,94,0.7)] ring-2 ring-white/20 hover:scale-[1.03] active:scale-95 transition"
            >
              🎲 Lempar Dadu
            </button>
            {turnSecsLeft !== null && (
              <span
                className={`tabular-nums text-sm font-bold ${
                  turnSecsLeft <= 5 ? "text-rose-400 animate-pulse" : "text-white/50"
                }`}
              >
                {turnSecsLeft}s sebelum bot ambil alih
              </span>
            )}
          </div>
        )}

        {/* tawaran beli kota */}
        {mineBuy && buy && (
          <BuyRow buy={buy} me={me} act={act} secs={secsLeft} />
        )}

        {/* upgrade kota sendiri */}
        {mineUp && up && (
          <>
            <Label
              tileId={up.tile}
              secs={secsLeft}
              prefix={`Upgrade ke ${up.toLevel === 5 ? "Hotel" : `Level ${up.toLevel}`}`}
            />
            <button onClick={() => act({ type: "upgrade" })} className={btn("amber")}>
              🏗 Upgrade · {fmtMoney(up.cost)}
            </button>
            <button onClick={() => act({ type: "skipUpgrade" })} className={btn("ghost")}>
              Lewati
            </button>
          </>
        )}

        {/* bayar sewa — 3 tombol dengan konfirmasi */}
        {mineRent && rent && me && !sellMode && (
          <RentRow3
            state={state}
            rent={rent}
            me={me}
            secs={secsLeft}
            onCash={() => setConfirmAction("cash")}
            onLoan={() => setConfirmAction("loan")}
            onSell={() => {
              setSellMode(true);
              setCameraMode("topDown");
            }}
          />
        )}

        {/* info pasif: pemain lain memutuskan */}
        {anyPending && !mineBuy && !mineRent && !mineUp && !me?.afk && (
          <span className="text-sm text-white/55">Pemain lain sedang mengambil keputusan…</span>
        )}

        {/* tombol Propertiku (kanan) + emote — sembunyi saat sedang menghadapi pending */}
        {me && !animating && !anyPending && (
          <>
            <button
              onClick={onToggleProps}
              className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ring-1 transition ${
                propsOpen
                  ? "bg-amber-400 text-amber-950 ring-amber-300"
                  : "bg-black/40 text-white ring-white/15 hover:bg-black/60"
              }`}
            >
              🏠 Propertiku
            </button>
            <div className="flex items-center gap-1">
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
          </>
        )}
      </div>

      {/* modal konfirmasi bayar sewa */}
      {confirmAction && rent && me && (
        <ConfirmRent
          kind={confirmAction}
          amount={rent.amount}
          loanFee={Math.max(0, rent.amount - me.money)}
          alreadyUsedLoan={me.hasUsedBankLoan}
          onCancel={() => setConfirmAction(null)}
          onOk={() => {
            const k = confirmAction;
            setConfirmAction(null);
            if (k === "cash") act({ type: "payRentCash" });
            if (k === "loan") act({ type: "bankLoan" });
          }}
        />
      )}

      {/* panel jual properti saat bayar sewa */}
      {sellMode && rent && me && (
        <SellPropertyPanel
          state={state}
          me={me}
          rentAmount={rent.amount}
          onSetHighlight={onSetHighlight}
          onCancel={() => {
            setSellMode(false);
            onSetHighlight([]);
            setCameraMode("followPawn");
          }}
          onConfirm={(picked) => {
            setSellMode(false);
            onSetHighlight([]);
            setCameraMode("followPawn");
            act({ type: "sellAndPay", tiles: picked });
          }}
        />
      )}
    </>
  );
}

function BuyRow({
  buy,
  me,
  act,
  secs,
}: {
  buy: { tile: number; maxLevel: number };
  me: Me;
  act: (a: GameAction) => void;
  secs: number | null;
}) {
  const base = BOARD[buy.tile].price ?? 0;
  const cheapestCost = buyCost(base, 1);
  const cantAfford = (me?.money ?? 0) < cheapestCost;

  return (
    <>
      <Label tileId={buy.tile} secs={secs} prefix="Kota kosong" />
      {cantAfford && (
        <span className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-sm font-bold text-rose-300 ring-1 ring-rose-400/40">
          ⚠ Uangmu kurang untuk beli ({fmtMoney(cheapestCost)})
        </span>
      )}
      {Array.from({ length: buy.maxLevel }, (_, i) => i + 1).map((lvl) => {
        const cost = buyCost(base, lvl);
        const afford = (me?.money ?? 0) >= cost;
        return (
          <button
            key={lvl}
            disabled={!afford}
            onClick={() => act({ type: "buyLevel", level: lvl })}
            className={afford ? btn("emerald") : btnDisabled()}
          >
            {lvl === 1 ? "Beli Tanah" : `Bangun Level ${lvl}`} · {fmtMoney(cost)}
          </button>
        );
      })}
      <button onClick={() => act({ type: "skipBuy" })} className={btn("ghost")}>
        Lewati
      </button>
    </>
  );
}

function RentRow3({
  state,
  rent,
  me,
  secs,
  onCash,
  onLoan,
  onSell,
}: {
  state: ClientGameState;
  rent: { tile: number; ownerId: string; amount: number };
  me: NonNullable<Me>;
  secs: number | null;
  onCash: () => void;
  onLoan: () => void;
  onSell: () => void;
}) {
  const owner = state.players.find((p) => p.id === rent.ownerId);
  const canCash = me.money >= rent.amount;
  const canLoan = !me.hasUsedBankLoan;
  const hasAssets = Object.values(state.ownership).some((o) => o.owner === me.id);

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <span className="text-base font-bold text-white">
          {BOARD[rent.tile].name} · sewa {fmtMoney(rent.amount)} ke{" "}
          <b style={{ color: owner?.color }}>{owner?.name}</b>
        </span>
        {secs !== null && (
          <span className={`text-xs tabular-nums ${secs <= 5 ? "font-black text-rose-400" : "text-white/40"}`}>
            {secs}s tersisa
          </span>
        )}
      </div>
      {/* kiri: Pinjam Bank | tengah: Bayar Tunai | kanan: Jual Properti */}
      <button
        disabled={!canLoan}
        onClick={onLoan}
        className={canLoan ? btn("sky") : btnDisabled()}
        title={canLoan ? "Pinjam bank (sekali seumur permainan)" : "Pinjaman sudah dipakai"}
      >
        🏦 Pinjam Bank
      </button>
      <button
        disabled={!canCash}
        onClick={onCash}
        className={canCash ? btn("emerald") : btnDisabled()}
      >
        💵 Bayar Tunai
      </button>
      <button
        disabled={!hasAssets}
        onClick={onSell}
        className={hasAssets ? btn("amber") : btnDisabled()}
      >
        📉 Jual Properti
      </button>
    </>
  );
}

function ConfirmRent({
  kind,
  amount,
  loanFee,
  alreadyUsedLoan,
  onCancel,
  onOk,
}: {
  kind: "cash" | "loan";
  amount: number;
  loanFee: number;
  alreadyUsedLoan: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  const title = kind === "cash" ? "Bayar Sewa Tunai" : "Pinjam Bank";
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10">
        <h3 className="text-xl font-black text-white">{title}</h3>
        {kind === "cash" ? (
          <p className="mt-2 text-base text-white/75">
            Bayar sewa sebesar <b className="text-emerald-300">{fmtMoney(amount)}</b> ke pemilik.
          </p>
        ) : (
          <>
            <p className="mt-2 text-base text-white/75">
              Pinjam <b className="text-sky-300">{fmtMoney(loanFee)}</b> dari bank untuk menutup sewa.
            </p>
            <p className="mt-2 rounded-lg bg-amber-500/15 p-3 text-sm font-bold text-amber-300 ring-1 ring-amber-400/30">
              ⚠ Pinjaman bank hanya bisa digunakan <u>1 kali</u> selama permainan.
              {alreadyUsedLoan && " (Kamu sudah pernah pakai.)"}
            </p>
          </>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className={`flex-1 ${btn("ghost")}`}>
            Batal
          </button>
          <button onClick={onOk} className={`flex-1 ${btn(kind === "cash" ? "emerald" : "sky")}`}>
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}

function SellPropertyPanel({
  state,
  me,
  rentAmount,
  onSetHighlight,
  onCancel,
  onConfirm,
}: {
  state: ClientGameState;
  me: NonNullable<Me>;
  rentAmount: number;
  onSetHighlight: (tiles: number[]) => void;
  onCancel: () => void;
  onConfirm: (picked: number[]) => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const myTiles = Object.entries(state.ownership)
    .filter(([, o]) => o.owner === me.id)
    .map(([id]) => Number(id));

  useEffect(() => {
    onSetHighlight([...picked]);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickedValue = [...picked].reduce(
    (s, id) => s + sellValue(state.ownership[id].totalInvestment),
    0
  );
  const canPay = me.money + pickedValue >= rentAmount && picked.size > 0;

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="absolute right-3 top-16 z-40 w-96 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl bg-slate-900/97 p-5 shadow-2xl ring-1 ring-amber-400/30 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-black text-white">Pilih Properti Dijual</h3>
        <button
          onClick={onCancel}
          className="rounded-lg bg-white/10 px-2.5 py-1 text-base font-bold text-white/80 hover:bg-white/20"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-sm text-white/60">
        Sewa <b className="text-rose-300">{fmtMoney(rentAmount)}</b> · kasmu{" "}
        <b className="text-amber-300">{fmtMoney(me.money)}</b>
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {myTiles.map((id) => {
          const t = BOARD[id];
          const own = state.ownership[id];
          const sell = sellValue(own.totalInvestment);
          const on = picked.has(id);
          return (
            <li key={id}>
              <button
                onClick={() => toggle(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition ${
                  on ? "bg-amber-400/25 ring-amber-300" : "bg-black/30 ring-white/10 hover:bg-black/45"
                }`}
              >
                <span
                  className="h-7 w-2 shrink-0 rounded-full"
                  style={{ background: t.group ? GROUP_COLORS[t.group] : "#64748b" }}
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-base font-bold text-white">{t.name}</div>
                  <div className="text-xs text-white/55">
                    {t.type === "property" ? `Level ${own.level}` : t.type === "airport" ? "Bandara" : "Utilitas"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/45">Harga jual</div>
                  <div className="text-sm font-bold text-emerald-300">{fmtMoney(sell)}</div>
                </div>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded ${
                    on ? "bg-amber-400 text-amber-950" : "bg-white/10"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-sm text-white/70">
        Total terkumpul:{" "}
        <b className={`${canPay ? "text-emerald-300" : "text-rose-300"}`}>
          {fmtMoney(me.money + pickedValue)}
        </b>{" "}
        / {fmtMoney(rentAmount)}
      </p>

      <div className="mt-3 flex gap-2">
        <button onClick={onCancel} className={`flex-1 ${btn("ghost")}`}>
          Batal
        </button>
        <button
          disabled={!canPay}
          onClick={() => onConfirm([...picked])}
          className={canPay ? `flex-1 ${btn("amber")}` : `flex-1 ${btnDisabled()}`}
        >
          Jual & Bayar
        </button>
      </div>
    </div>
  );
}

function Label({ tileId, secs, prefix }: { tileId: number; secs: number | null; prefix: string }) {
  const tile = BOARD[tileId];
  return (
    <span className="inline-flex items-center gap-2 text-base font-bold text-white">
      <span className="text-white/55">{prefix}:</span>
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

type Tone = "emerald" | "amber" | "rose" | "sky" | "ghost";
function btn(tone: Tone): string {
  const base = "rounded-xl px-5 py-3 text-base font-bold active:scale-95 transition text-center shadow-lg";
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
