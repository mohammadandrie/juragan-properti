import { GameState, GameAction, Player, BotPersona } from "./types";
import { BOARD } from "./board";
import { buyCost, sellValue, TAKEOVER_MULT } from "./money";
import { QUIZ_QUESTIONS } from "./quiz";

export const BOT_PROFILES: Record<BotPersona, { name: string; color: string; pawn: Player["pawn"] }> = {
  jago: { name: "Bang Jago", color: "#ef4444", pawn: "komodo" },
  hemat: { name: "Bu Hemat", color: "#a855f7", pawn: "pinisi" },
  untung: { name: "Si Untung", color: "#f59e0b", pawn: "bajaj" },
};

// Cadangan kas minimal yang bot pertahankan sebelum belanja.
function reserve(persona: BotPersona): number {
  return persona === "hemat" ? 8_000_000 : persona === "jago" ? 2_000_000 : 5_000_000;
}

// Tentukan satu aksi bot untuk state sekarang; null = tidak ada (tunggu).
// Dipanggil berulang oleh tick server sampai giliran bot selesai.
// `bot.bot` null = pemain manusia yang sedang AFK (diambil alih); pakai persona
// default "untung" agar tetap bermain wajar.
export function decideBotAction(g: GameState, bot: Player): GameAction | null {
  const persona = bot.bot ?? "untung";
  const isMyTurn = g.players[g.currentPlayer]?.id === bot.id && g.phase === "playing";

  // --- kuis: jawab (bot lumayan pintar, kadang salah) ---
  if (g.quiz && g.quiz.playerId === bot.id) {
    const q = QUIZ_QUESTIONS[g.quiz.questionIdx];
    const smart = persona === "hemat" ? 0.8 : persona === "jago" ? 0.65 : 0.5;
    const choice = Math.random() < smart ? q.answer : Math.floor(Math.random() * 4);
    return { type: "answerQuiz", choice };
  }

  if (!isMyTurn) return null;

  // --- bayar sewa ---
  if (g.pendingRent && g.pendingRent.playerId === bot.id) {
    const pr = g.pendingRent;
    // pertimbangkan ambil alih jika mampu & properti bernilai strategis (jago saja)
    const own = g.ownership[pr.tile];
    if (own && persona === "jago") {
      const takeoverCost = Math.round(own.totalInvestment * TAKEOVER_MULT);
      if (bot.money - takeoverCost >= reserve(persona) * 0.7) {
        return { type: "takeover" };
      }
    }
    if (bot.money >= pr.amount) return { type: "payRentCash" };
    // kurang uang: jual aset termurah dulu sampai cukup
    const owned = ownedSorted(g, bot);
    const toSell: number[] = [];
    let cash = bot.money;
    for (const id of owned) {
      if (cash >= pr.amount) break;
      toSell.push(id);
      cash += sellValue(g.ownership[id].totalInvestment);
    }
    if (cash >= pr.amount && toSell.length > 0) return { type: "sellAndPay", tiles: toSell };
    // tetap kurang: pinjam bank kalau belum pernah
    if (!bot.hasUsedBankLoan) return { type: "bankLoan" };
    // pasrah: jual semua lalu bayar (forcePay otomatis menuntaskan saat expire),
    // tapi bot tetap coba bayar tunai agar engine memproses kekurangan.
    return { type: "sellAndPay", tiles: owned };
  }

  // --- tawaran beli kota kosong ---
  if (g.pendingBuy && g.pendingBuy.playerId === bot.id) {
    const pb = g.pendingBuy;
    const tile = BOARD[pb.tile];
    const base = tile.price ?? 0;
    // level yang mampu & mau dibeli bot
    const minReserve = reserve(persona);
    let level = 0;
    for (let l = pb.maxLevel; l >= 1; l--) {
      if (bot.money - buyCost(base, l) >= minReserve) {
        level = l;
        break;
      }
    }
    if (level === 0) return { type: "skipBuy" };
    // kepribadian: hemat lebih konservatif soal level
    if (persona === "hemat" && level > 2) level = Math.min(level, 2);
    if (persona === "untung" && Math.random() < 0.3) return { type: "skipBuy" };
    return { type: "buyLevel", level };
  }

  // --- tawaran upgrade kota sendiri ---
  if (g.pendingUpgrade && g.pendingUpgrade.playerId === bot.id) {
    const pu = g.pendingUpgrade;
    const minReserve = reserve(persona);
    const wantUpgrade =
      persona === "jago"
        ? bot.money - pu.cost >= minReserve
        : persona === "hemat"
          ? bot.money - pu.cost >= minReserve * 2
          : bot.money - pu.cost >= minReserve && Math.random() < 0.7;
    return wantUpgrade ? { type: "upgrade" } : { type: "skipUpgrade" };
  }

  // --- penjara ---
  if (bot.inJail && g.canRoll) {
    if (bot.jailCards > 0) return { type: "useJailCard" };
    if (persona === "jago" && bot.money > 5_000_000) return { type: "payJail" };
    // sisanya coba lempar dobel dulu (roll di bawah)
  }

  // --- lempar dadu ---
  if (g.canRoll) return { type: "roll" };

  return { type: "endTurn" };
}

// id aset bot, diurut dari investasi termurah
function ownedSorted(g: GameState, bot: Player): number[] {
  return Object.entries(g.ownership)
    .filter(([, o]) => o.owner === bot.id)
    .map(([id]) => Number(id))
    .sort((a, b) => g.ownership[a].totalInvestment - g.ownership[b].totalInvestment);
}
