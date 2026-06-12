import { GameState, GameAction, Player, BotPersona } from "./types";
import { BOARD, tilesInGroup } from "./board";
import { MIN_INCREMENT } from "./engine/auction";
import { QUIZ_QUESTIONS } from "./quiz";

export const BOT_PROFILES: Record<BotPersona, { name: string; color: string; pawn: Player["pawn"] }> = {
  jago: { name: "Bang Jago", color: "#ef4444", pawn: "komodo" },
  hemat: { name: "Bu Hemat", color: "#a855f7", pawn: "pinisi" },
  untung: { name: "Si Untung", color: "#f59e0b", pawn: "bajaj" },
};

// Tentukan satu aksi bot untuk state sekarang; null = tidak ada (tunggu).
// Dipanggil berulang oleh tick server sampai giliran bot selesai.
export function decideBotAction(g: GameState, bot: Player): GameAction | null {
  const persona = bot.bot!;
  const isMyTurn = g.players[g.currentPlayer]?.id === bot.id && g.phase === "playing";

  // --- kuis: jawab (bot lumayan pintar, kadang salah) ---
  if (g.quiz && g.quiz.playerId === bot.id) {
    const q = QUIZ_QUESTIONS[g.quiz.questionIdx];
    const smart = persona === "hemat" ? 0.8 : persona === "jago" ? 0.65 : 0.5;
    const choice = Math.random() < smart ? q.answer : Math.floor(Math.random() * 4);
    return { type: "answerQuiz", choice };
  }

  // --- lelang: semua bot boleh ikut, gaya beda ---
  if (g.auction) {
    const a = g.auction;
    if (a.passed.includes(bot.id)) return null;
    if (a.highBidder === bot.id) return null; // sudah tertinggi, tunggu
    const tile = BOARD[a.tile];
    const value = tile.price ?? 100;
    // batas bid per kepribadian
    const cap =
      persona === "jago"
        ? Math.min(value * 1.3, bot.money * 0.7)
        : persona === "hemat"
          ? Math.min(value * 0.6, bot.money * 0.3)
          : Math.min(value * (0.5 + Math.random() * 0.8), bot.money * 0.5);
    const nextBid = a.highBid + MIN_INCREMENT;
    if (nextBid <= cap && nextBid <= bot.money) {
      return { type: "bid", amount: nextBid };
    }
    return { type: "passAuction" };
  }

  if (!isMyTurn) return null;

  // --- penjara ---
  if (bot.inJail && g.canRoll) {
    if (bot.jailCards > 0) return { type: "useJailCard" };
    if (persona === "jago" && bot.money > 200) return { type: "payJail" };
    // sisanya coba lempar dobel dulu (roll di bawah)
  }

  // --- tawaran beli ---
  if (g.pendingBuy !== null) {
    const tile = BOARD[g.pendingBuy];
    const price = tile.price ?? 0;
    const wantBuy =
      persona === "jago"
        ? bot.money >= price // beli hampir apa saja
        : persona === "hemat"
          ? bot.money >= price * 3 // hanya kalau kas tebal
          : Math.random() < 0.6 && bot.money >= price * 1.5;
    return wantBuy ? { type: "buy" } : { type: "skip" };
  }

  // --- lempar dadu ---
  if (g.canRoll) return { type: "roll" };

  // --- bangun rumah sebelum akhiri giliran ---
  const buildTarget = findBuildTarget(g, bot, persona);
  if (buildTarget !== null) return { type: "build", tile: buildTarget };

  return { type: "endTurn" };
}

function findBuildTarget(g: GameState, bot: Player, persona: BotPersona): number | null {
  const reserve = persona === "hemat" ? 400 : persona === "jago" ? 100 : 250;
  for (const t of BOARD) {
    if (t.type !== "property") continue;
    const own = g.ownership[t.id];
    if (own?.owner !== bot.id || own.houses >= 5) continue;
    const group = tilesInGroup(t.group!);
    if (!group.every((x) => g.ownership[x.id]?.owner === bot.id)) continue;
    const minH = Math.min(...group.map((x) => g.ownership[x.id].houses));
    if (own.houses > minH) continue;
    if (bot.money - (t.houseCost ?? 0) < reserve) continue;
    return t.id;
  }
  return null;
}
