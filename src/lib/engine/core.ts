import { GameState, Player } from "../types";
import { BOARD, GAJI_LEWAT_MULAI } from "../board";
import { CHANCE_CARDS, CHEST_CARDS } from "../cards";
import { QUIZ_QUESTIONS } from "../quiz";
import { pushLog, currentPlayer, baseRent, rentMultiplier, forcePay, transfer } from "./helpers";

export const QUIZ_TIME_MS = 15_000;

function rng(max: number): number {
  // acak server-side
  return Math.floor(Math.random() * max);
}

export function rollDice(g: GameState): void {
  const p = currentPlayer(g);
  const d1 = rng(6) + 1;
  const d2 = rng(6) + 1;
  g.lastDice = [d1, d2];
  const isDouble = d1 === d2;

  if (p.inJail) {
    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      pushLog(g, `🎲 ${p.name} lempar dobel ${d1}, bebas dari penjara!`);
      movePlayer(g, p, d1 + d2);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        forcePay(g, p, 50, null);
        if (!p.bankrupt) {
          p.inJail = false;
          p.jailTurns = 0;
          pushLog(g, `💸 ${p.name} bayar denda 50jt setelah 3 giliran, lalu jalan.`);
          movePlayer(g, p, d1 + d2);
        }
      } else {
        pushLog(g, `🚔 ${p.name} gagal dobel, tetap di penjara (${p.jailTurns}/3).`);
      }
    }
    g.canRoll = false;
    return;
  }

  if (isDouble) {
    g.doublesCount++;
    if (g.doublesCount >= 3) {
      sendToJail(g, p);
      pushLog(g, `🚨 ${p.name} dobel 3x beruntun — ngebut! Masuk penjara.`);
      g.canRoll = false;
      g.doublesCount = 0;
      return;
    }
  } else {
    g.doublesCount = 0;
  }

  movePlayer(g, p, d1 + d2);
  // dobel boleh lempar lagi (kecuali sedang ada interaksi pending)
  g.canRoll = isDouble && !p.bankrupt && g.pendingBuy === null && g.quiz === null && !p.inJail;
}

export function sendToJail(g: GameState, p: Player) {
  p.pos = 10;
  p.inJail = true;
  p.jailTurns = 0;
}

export function movePlayer(g: GameState, p: Player, steps: number) {
  const from = p.pos;
  p.pos = (p.pos + steps + 40) % 40;
  if (steps > 0 && p.pos < from) {
    transfer(g, null, p, GAJI_LEWAT_MULAI);
    pushLog(g, `💰 ${p.name} lewat MULAI, gaji Rp ${GAJI_LEWAT_MULAI}jt.`);
  }
  landOn(g, p);
}

export function landOn(g: GameState, p: Player) {
  const tile = BOARD[p.pos];
  const diceSum = g.lastDice ? g.lastDice[0] + g.lastDice[1] : 7;

  switch (tile.type) {
    case "property":
    case "airport":
    case "utility": {
      const own = g.ownership[tile.id];
      if (!own) {
        if (p.money >= (tile.price ?? 0)) {
          g.pendingBuy = tile.id;
        } else {
          pushLog(g, `🤷 ${p.name} tidak mampu beli ${tile.name}.`);
        }
      } else if (own.owner !== p.id) {
        const mult = rentMultiplier(g, tile.id);
        const rent = Math.round(baseRent(g, tile.id, diceSum) * mult);
        const owner = g.players.find((q) => q.id === own.owner)!;
        if (rent === 0 && mult === 0) {
          pushLog(g, `🛵 Promo ojol! ${p.name} numpang gratis di ${tile.name}.`);
        } else if (rent > 0) {
          forcePay(g, p, rent, owner);
          pushLog(g, `🏠 ${p.name} bayar sewa Rp ${rent}jt ke ${owner.name} (${tile.name}${mult > 1 ? `, event x${mult}` : ""}).`);
        }
      }
      break;
    }
    case "tax":
      forcePay(g, p, tile.taxAmount ?? 0, null);
      pushLog(g, `💸 ${p.name} kena ${tile.name} Rp ${tile.taxAmount}jt.`);
      break;
    case "gotojail":
      sendToJail(g, p);
      pushLog(g, `👮 ${p.name} tertangkap! Masuk penjara.`);
      g.canRoll = false;
      break;
    case "chance":
      drawCard(g, p, "chance");
      break;
    case "chest":
      drawCard(g, p, "chest");
      break;
    case "quiz": {
      // ambil soal berikut dari deck
      if (g.quizDeck.length === 0) {
        g.quizDeck = QUIZ_QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
      }
      const qIdx = g.quizDeck.pop()!;
      g.quiz = { playerId: p.id, questionIdx: qIdx, deadline: Date.now() + QUIZ_TIME_MS };
      pushLog(g, `🧠 ${p.name} masuk Cerdas Cermat!`);
      break;
    }
    default:
      break;
  }
}

export function drawCard(g: GameState, p: Player, deck: "chance" | "chest") {
  const cards = deck === "chance" ? CHANCE_CARDS : CHEST_CARDS;
  const deckArr = deck === "chance" ? g.chanceDeck : g.chestDeck;
  if (deckArr.length === 0) {
    const fresh = cards.map((_, i) => i).sort(() => Math.random() - 0.5);
    deckArr.push(...fresh);
  }
  const idx = deckArr.pop()!;
  const card = cards[idx];
  g.lastCard = { text: card.text, icon: card.icon, at: Date.now() };
  pushLog(g, `${card.icon} ${p.name}: ${card.text}`);

  const e = card.effect;
  switch (e.kind) {
    case "money":
      if (e.amount >= 0) transfer(g, null, p, e.amount);
      else forcePay(g, p, -e.amount, null);
      break;
    case "moveTo":
      movePlayer(g, p, (e.tile - p.pos + 40) % 40);
      break;
    case "moveBack":
      p.pos = (p.pos - e.steps + 40) % 40;
      landOn(g, p);
      break;
    case "gotojail":
      sendToJail(g, p);
      g.canRoll = false;
      break;
    case "jailcard":
      p.jailCards++;
      break;
    case "collectFromAll":
      for (const q of g.players) {
        if (q.id !== p.id && !q.bankrupt) forcePay(g, q, e.amount, p);
      }
      break;
    case "payToAll":
      for (const q of g.players) {
        if (q.id !== p.id && !q.bankrupt) forcePay(g, p, e.amount, q);
      }
      break;
  }
}
