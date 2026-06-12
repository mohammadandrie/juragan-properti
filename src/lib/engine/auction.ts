import { GameState, Player } from "../types";
import { BOARD } from "../board";
import { pushLog, alivePlayers, transfer } from "./helpers";

export const AUCTION_TIME_MS = 15_000;
export const MIN_INCREMENT = 10;

// Mulai lelang ketika pemain skip beli
export function startAuction(g: GameState, tileId: number) {
  g.pendingBuy = null;
  g.auction = {
    tile: tileId,
    highBid: 0,
    highBidder: null,
    deadline: Date.now() + AUCTION_TIME_MS,
    passed: [],
  };
  pushLog(g, `🔨 ${BOARD[tileId].name} dilelang! Bid dimulai dari Rp ${MIN_INCREMENT}jt.`);
}

export function placeBid(g: GameState, p: Player, amount: number): string | null {
  const a = g.auction;
  if (!a) return "Tidak ada lelang berjalan.";
  if (p.bankrupt) return "Kamu sudah bangkrut.";
  if (a.passed.includes(p.id)) return "Kamu sudah menyerah di lelang ini.";
  if (amount < a.highBid + MIN_INCREMENT) return `Bid minimal Rp ${a.highBid + MIN_INCREMENT}jt.`;
  if (amount > p.money) return "Uangmu tidak cukup.";

  a.highBid = amount;
  a.highBidder = p.id;
  a.deadline = Date.now() + AUCTION_TIME_MS; // reset timer tiap bid baru
  pushLog(g, `🔨 ${p.name} bid Rp ${amount}jt!`);
  return null;
}

export function passAuction(g: GameState, p: Player): string | null {
  const a = g.auction;
  if (!a) return "Tidak ada lelang berjalan.";
  if (!a.passed.includes(p.id)) {
    a.passed.push(p.id);
    pushLog(g, `🙅 ${p.name} mundur dari lelang.`);
  }
  maybeSettleAuction(g);
  return null;
}

// Selesaikan lelang jika waktu habis atau semua (kecuali bidder tertinggi) menyerah
export function maybeSettleAuction(g: GameState, now = Date.now()) {
  const a = g.auction;
  if (!a) return;
  const alive = alivePlayers(g);
  const stillIn = alive.filter((p) => !a.passed.includes(p.id));
  const everyonePassedExceptHigh =
    stillIn.length <= (a.highBidder ? 1 : 0) ||
    (stillIn.length === 1 && stillIn[0].id === a.highBidder);
  const timeUp = now >= a.deadline;

  if (!timeUp && !everyonePassedExceptHigh) return;

  if (a.highBidder) {
    const winner = g.players.find((p) => p.id === a.highBidder)!;
    transfer(g, winner, null, a.highBid);
    g.ownership[a.tile] = { owner: winner.id, houses: 0 };
    pushLog(g, `🏆 ${winner.name} memenangkan lelang ${BOARD[a.tile].name} seharga Rp ${a.highBid}jt!`);
  } else {
    pushLog(g, `🔨 Tidak ada penawar. ${BOARD[a.tile].name} tetap milik bank.`);
  }
  g.auction = null;
}
