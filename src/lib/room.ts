import { GameState, Player, PawnKind, BotPersona } from "./types";
import { BOT_PROFILES, decideBotAction } from "./bots";
import { applyAction, maybeSettleAuction, maybeExpireQuiz, currentPlayer, advanceTurn } from "./engine";

const START_MONEY = 1500;
export const PLAYER_COLORS = ["#22d3ee", "#f43f5e", "#a3e635", "#fbbf24"];

function randomId(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function newPlayer(name: string, idx: number, bot: BotPersona | null = null): Player {
  const profile = bot ? BOT_PROFILES[bot] : null;
  return {
    id: randomId(10),
    token: bot ? "" : crypto.randomUUID(),
    name: profile?.name ?? name,
    color: profile?.color ?? PLAYER_COLORS[idx % PLAYER_COLORS.length],
    pawn: profile?.pawn ?? "default",
    bot,
    money: START_MONEY,
    pos: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    bankrupt: false,
    emote: null,
  };
}

export function newGame(hostName: string): GameState {
  const host = newPlayer(hostName, 0);
  return {
    code: randomId(5),
    phase: "lobby",
    players: [host],
    currentPlayer: 0,
    canRoll: false,
    pendingBuy: null,
    auction: null,
    quiz: null,
    activeEvents: [],
    lastEvent: null,
    lastDice: null,
    lastCard: null,
    doublesCount: 0,
    roundCount: 0,
    ownership: {},
    chanceDeck: [],
    chestDeck: [],
    quizDeck: [],
    log: [],
    winner: null,
    version: 0,
    updatedAt: Date.now(),
  };
}

// Jalankan bot & timer sampai state "diam" (menunggu manusia).
// Dipanggil setiap kali ada request (action/polling) — serverless friendly.
export function settle(g: GameState): void {
  if (g.phase !== "playing") return;
  for (let guard = 0; guard < 50; guard++) {
    maybeExpireQuiz(g);
    maybeSettleAuction(g);
    if (g.phase !== "playing") return;

    // pemain giliran bangkrut (mis. kalah bayar sewa di gilirannya) -> lompati
    if (g.players[g.currentPlayer]?.bankrupt) {
      advanceTurn(g);
      continue;
    }

    // cari bot yang punya aksi: pemain giliran, peserta lelang, atau penjawab kuis
    let acted = false;
    for (const p of g.players) {
      if (!p.bot || p.bankrupt) continue;
      const action = decideBotAction(g, p);
      if (!action) continue;
      // delay alami: bot baru bertindak jika state sudah >1.2 dtk tidak berubah
      if (Date.now() - g.updatedAt < 1200 && !isUrgent(g)) return;
      const err = applyAction(g, p, action);
      if (!err) {
        g.updatedAt = Date.now();
        acted = true;
        break;
      }
    }
    if (!acted) return;
  }
}

// lelang/kuis yang sudah lewat deadline harus segera dibereskan tanpa delay bot
function isUrgent(g: GameState): boolean {
  const now = Date.now();
  if (g.auction && now >= g.auction.deadline) return true;
  if (g.quiz && now >= g.quiz.deadline) return true;
  return false;
}

export { applyAction, currentPlayer };
