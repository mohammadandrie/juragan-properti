import { GameState, GameAction, Player, PawnKind } from "../types";
import { BOARD, tilesInGroup, DENDA_PENJARA } from "../board";
import { pushLog, currentPlayer, alivePlayers, transfer, forcePay } from "./helpers";
import { rollDice, movePlayer } from "./core";
import { startAuction, placeBid, passAuction, maybeSettleAuction } from "./auction";
import { answerQuiz, maybeExpireQuiz, maybeTriggerEvent, tickEvents } from "./quizEvent";

export * from "./helpers";
export * from "./core";
export * from "./auction";
export * from "./quizEvent";

const PAWNS: PawnKind[] = ["default", "bajaj", "pinisi", "komodo", "garuda", "ojek"];

// Jalankan aksi pemain. Return pesan error, atau null jika sukses.
export function applyAction(g: GameState, p: Player, action: GameAction): string | null {
  // timer-based settle dicek di setiap aksi
  maybeExpireQuiz(g);
  maybeSettleAuction(g);

  if (g.phase === "ended" && action.type !== "emote") return "Permainan sudah berakhir.";

  switch (action.type) {
    case "setPawn": {
      if (g.phase !== "lobby") return "Pion hanya bisa diganti di lobby.";
      if (!PAWNS.includes(action.pawn)) return "Pion tidak dikenal.";
      const taken = g.players.some((q) => q.id !== p.id && q.pawn === action.pawn && action.pawn !== "default");
      if (taken) return "Pion itu sudah dipakai pemain lain.";
      p.pawn = action.pawn;
      if (action.color) p.color = action.color;
      return null;
    }

    case "addBot": {
      if (g.phase !== "lobby") return "Bot hanya bisa ditambah di lobby.";
      if (g.players[0]?.id !== p.id) return "Hanya host yang bisa menambah bot.";
      if (g.players.length >= 4) return "Room penuh.";
      return null; // pembuatan bot dilakukan caller (butuh id generator)
    }

    case "start": {
      if (g.phase !== "lobby") return "Permainan sudah dimulai.";
      if (g.players[0]?.id !== p.id) return "Hanya host yang bisa memulai.";
      if (g.players.length < 2) return "Minimal 2 pemain.";
      g.phase = "playing";
      g.canRoll = true;
      pushLog(g, "🚀 Permainan dimulai. Selamat jadi juragan!");
      return null;
    }

    case "roll": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!g.canRoll) return "Bukan saatnya lempar dadu.";
      if (g.pendingBuy !== null || g.auction || g.quiz) return "Selesaikan dulu interaksi berjalan.";
      rollDice(g);
      return null;
    }

    case "buy": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (g.pendingBuy === null) return "Tidak ada properti yang ditawarkan.";
      const tile = BOARD[g.pendingBuy];
      if (p.money < (tile.price ?? 0)) return "Uangmu tidak cukup.";
      transfer(g, p, null, tile.price ?? 0);
      g.ownership[tile.id] = { owner: p.id, houses: 0 };
      g.pendingBuy = null;
      pushLog(g, `🏠 ${p.name} membeli ${tile.name} seharga Rp ${tile.price}jt!`);
      return null;
    }

    case "skip": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (g.pendingBuy === null) return "Tidak ada properti yang ditawarkan.";
      startAuction(g, g.pendingBuy);
      return null;
    }

    case "bid":
      return placeBid(g, p, action.amount);

    case "passAuction":
      return passAuction(g, p);

    case "answerQuiz":
      return answerQuiz(g, p, action.choice);

    case "build": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const tile = BOARD[action.tile];
      if (!tile || tile.type !== "property") return "Petak tidak valid.";
      const own = g.ownership[tile.id];
      if (own?.owner !== p.id) return "Bukan propertimu.";
      if (own.houses >= 5) return "Sudah hotel.";
      const group = tilesInGroup(tile.group!);
      if (!group.every((t) => g.ownership[t.id]?.owner === p.id)) return "Grup warna belum lengkap.";
      const minH = Math.min(...group.map((t) => g.ownership[t.id].houses));
      if (own.houses > minH) return "Bangun merata dulu di grup ini.";
      if (p.money < (tile.houseCost ?? 0)) return "Uangmu tidak cukup.";
      transfer(g, p, null, tile.houseCost ?? 0);
      own.houses++;
      pushLog(g, own.houses === 5 ? `🏨 ${p.name} membangun HOTEL di ${tile.name}!` : `🏗️ ${p.name} membangun rumah ke-${own.houses} di ${tile.name}.`);
      return null;
    }

    case "sell": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const own = g.ownership[action.tile];
      if (own?.owner !== p.id) return "Bukan propertimu.";
      const tile = BOARD[action.tile];
      if (own.houses > 0) {
        const group = tilesInGroup(tile.group!);
        const maxH = Math.max(...group.map((t) => g.ownership[t.id].houses));
        if (own.houses < maxH) return "Jual merata dari yang tertinggi.";
        own.houses--;
        transfer(g, null, p, Math.floor((tile.houseCost ?? 0) / 2));
        pushLog(g, `🏚️ ${p.name} menjual bangunan di ${tile.name}.`);
      } else {
        delete g.ownership[action.tile];
        transfer(g, null, p, Math.floor((tile.price ?? 0) / 2));
        pushLog(g, `📉 ${p.name} menjual ${tile.name} ke bank.`);
      }
      return null;
    }

    case "payJail": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!p.inJail) return "Kamu tidak di penjara.";
      forcePay(g, p, DENDA_PENJARA, null);
      if (!p.bankrupt) {
        p.inJail = false;
        p.jailTurns = 0;
        pushLog(g, `💸 ${p.name} bayar denda Rp ${DENDA_PENJARA}jt, bebas!`);
      }
      return null;
    }

    case "useJailCard": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!p.inJail) return "Kamu tidak di penjara.";
      if (p.jailCards <= 0) return "Tidak punya kartu bebas penjara.";
      p.jailCards--;
      p.inJail = false;
      p.jailTurns = 0;
      pushLog(g, `🎟️ ${p.name} pakai Kartu Bebas Penjara!`);
      return null;
    }

    case "emote": {
      const ok = ["😂", "🔥", "😭", "👍", "😡", "🤑"];
      if (!ok.includes(action.icon)) return "Emote tidak dikenal.";
      p.emote = { icon: action.icon, at: Date.now() };
      return null;
    }

    case "endTurn": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (g.canRoll) return "Lempar dadu dulu.";
      if (g.pendingBuy !== null || g.auction || g.quiz) return "Selesaikan dulu interaksi berjalan.";
      advanceTurn(g);
      return null;
    }

    default:
      return "Aksi tidak dikenal.";
  }
}

function mustBeTurn(g: GameState, p: Player): string | null {
  if (g.phase !== "playing") return "Permainan belum berjalan.";
  if (currentPlayer(g).id !== p.id) return "Bukan giliranmu.";
  if (p.bankrupt) return "Kamu sudah bangkrut.";
  return null;
}

export function advanceTurn(g: GameState) {
  const alive = alivePlayers(g);
  if (alive.length <= 1) return;
  let next = g.currentPlayer;
  do {
    next = (next + 1) % g.players.length;
  } while (g.players[next].bankrupt);

  // putaran baru jika index melingkar ke awal
  if (next <= g.currentPlayer) {
    g.roundCount++;
    tickEvents(g);
    maybeTriggerEvent(g);
  }
  g.currentPlayer = next;
  g.canRoll = true;
  g.doublesCount = 0;
  g.lastCard = null;
}
