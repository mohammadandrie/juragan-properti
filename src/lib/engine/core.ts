import { GameState, Player } from "../types";
import { BOARD } from "../board";
import { CHANCE_CARDS, CHEST_CARDS } from "../cards";
import { QUIZ_QUESTIONS } from "../quiz";
import {
  SALARY_PASS_START,
  JAIL_FINE,
  upgradeCost,
  maxBuyLevel,
  BUY_MS,
  RENT_MS,
  UPGRADE_MS,
  fmtMoney,
} from "../money";
import {
  pushLog,
  currentPlayer,
  rentDue,
  rentMultiplier,
  forcePay,
  transfer,
} from "./helpers";

export const QUIZ_TIME_MS = 15_000;

function rng(max: number): number {
  return Math.floor(Math.random() * max);
}

export function rollDice(g: GameState): void {
  const p = currentPlayer(g);
  const d1 = rng(6) + 1;
  const d2 = rng(6) + 1;
  g.lastDice = [d1, d2];
  g.phaseDeadline = null;
  g.destTile = null;
  const isDouble = d1 === d2;

  if (p.inJail) {
    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      pushLog(g, `🎲 ${p.name} melempar dobel ${d1}-${d1}. Bebas dari Penjara.`);
      movePlayer(g, p, d1 + d2);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        forcePay(g, p, JAIL_FINE, null);
        if (!p.bankrupt) {
          p.inJail = false;
          p.jailTurns = 0;
          pushLog(g, `💸 ${p.name} membayar denda setelah 3 giliran di Penjara, lalu jalan.`);
          movePlayer(g, p, d1 + d2);
        }
      } else {
        pushLog(g, `🚔 ${p.name} gagal melempar dobel. Tetap di Penjara (${p.jailTurns}/3).`);
      }
    }
    g.canRoll = false;
    return;
  }

  if (isDouble) {
    g.doublesCount++;
    if (g.doublesCount >= 3) {
      sendToJail(g, p);
      pushLog(g, `🚨 ${p.name} melempar dobel tiga kali beruntun. Masuk Penjara.`);
      g.canRoll = false;
      g.doublesCount = 0;
      return;
    }
  } else {
    g.doublesCount = 0;
  }

  movePlayer(g, p, d1 + d2);
  // dobel boleh lempar lagi (kecuali sedang ada interaksi pending)
  g.canRoll =
    isDouble &&
    !p.bankrupt &&
    g.pendingBuy === null &&
    g.pendingRent === null &&
    g.pendingUpgrade === null &&
    g.quiz === null &&
    !p.inJail;
  if (g.canRoll) g.phaseDeadline = Date.now() + 30_000;
}

export function sendToJail(g: GameState, p: Player) {
  p.pos = 10;
  p.inJail = true;
  p.jailTurns = 0;
}

export function movePlayer(g: GameState, p: Player, steps: number) {
  const from = p.pos;
  p.pos = (p.pos + steps + 40) % 40;
  g.destTile = p.pos; // petak tujuan untuk highlight visual
  if (steps > 0 && p.pos < from) {
    transfer(g, null, p, SALARY_PASS_START);
    p.startPassCount++;
    pushLog(g, `💰 ${p.name} melewati petak MULAI dan menerima gaji.`);
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
        // kota kosong: tawaran beli (pilih level utk property)
        const maxLvl = tile.type === "property" ? maxBuyLevel(p.startPassCount) : 1;
        if (p.money >= (tile.price ?? 0)) {
          g.pendingBuy = { playerId: p.id, tile: tile.id, maxLevel: maxLvl };
          g.phaseDeadline = Date.now() + BUY_MS;
        } else {
          pushLog(g, `🤷 Saldo ${p.name} tidak cukup untuk membeli ${tile.name}.`);
        }
      } else if (own.owner !== p.id) {
        // kota lawan: sewa. Lewati hanya jika pemilik bangkrut/menyerah, atau
        // event "rentFree" aktif. Selain itu WAJIB bayar.
        const owner = g.players.find((q) => q.id === own.owner);
        if (!owner || owner.bankrupt || owner.surrendered) {
          // pemilik sudah tidak aktif, properti otomatis kembali ke bank
          delete g.ownership[tile.id];
          pushLog(g, `🏠 ${p.name} mendarat di ${tile.name}. Pemilik tidak aktif; properti kembali ke bank.`);
        } else {
          const rent = rentDue(g, tile.id, diceSum);
          const mult = rentMultiplier(g, tile.id);
          if (rent <= 0) {
            pushLog(g, `🎟️ ${tile.name}: event sewa gratis sedang berlaku.`);
          } else {
            g.pendingRent = { playerId: p.id, tile: tile.id, ownerId: owner.id, amount: rent };
            g.phaseDeadline = Date.now() + RENT_MS;
            pushLog(
              g,
              `🏠 ${p.name} mendarat di ${tile.name} milik ${owner.name}. Sewa ${mult > 1 ? `(event ×${mult}) ` : ""}wajib dibayar.`
            );
          }
        }
      } else {
        // kota sendiri: mungkin bisa upgrade
        offerUpgrade(g, p, tile.id);
      }
      break;
    }
    case "tax":
      forcePay(g, p, tile.taxAmount ?? 0, null);
      pushLog(g, `💸 ${p.name} membayar ${tile.name} sebesar ${fmtMoney(tile.taxAmount ?? 0)}.`);
      break;
    case "gotojail":
      sendToJail(g, p);
      pushLog(g, `👮 ${p.name} dikirim ke Penjara.`);
      g.canRoll = false;
      break;
    case "chance":
      drawCard(g, p, "chance");
      break;
    case "chest":
      drawCard(g, p, "chest");
      break;
    case "quiz": {
      if (g.quizDeck.length === 0) {
        g.quizDeck = QUIZ_QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
      }
      const qIdx = g.quizDeck.pop()!;
      g.quiz = { playerId: p.id, questionIdx: qIdx, deadline: Date.now() + QUIZ_TIME_MS };
      g.phaseDeadline = Date.now() + QUIZ_TIME_MS;
      pushLog(g, `🧠 ${p.name} masuk Cerdas Cermat!`);
      break;
    }
    case "jail":
      // mendarat di petak Penjara (id 10) = "hanya berkunjung", tidak ditahan
      pushLog(g, `🛂 ${p.name} sedang berkunjung di Penjara.`);
      break;
    case "parking":
      pushLog(g, `🅿️ ${p.name} berhenti di Parkir Bebas.`);
      break;
    default:
      break;
  }
}

// Tawarkan upgrade jika pemain mendarat di kota sendiri & memenuhi syarat.
// - Level < 4: bisa naik 1 tingkat jika sudah cukup lewat START & saldo cukup.
//   (untuk masuk level L, butuh startPassCount >= L-1)
// - Level 4: bisa upgrade ke level 5 (gedung) HANYA di sini.
export function offerUpgrade(g: GameState, p: Player, tileId: number) {
  const tile = BOARD[tileId];
  if (tile.type !== "property") return;
  const own = g.ownership[tileId];
  if (!own || own.owner !== p.id || own.level >= 5) return;

  const toLevel = own.level + 1;
  // syarat lewat START: untuk level 2 butuh 1x, level 3 butuh 2x, level 4 butuh 3x.
  // Level 5 tidak butuh START (cukup mendarat di kota sendiri yang sudah level 4).
  if (toLevel <= 4 && p.startPassCount < toLevel - 1) return;

  const cost = upgradeCost(tile.price ?? 0, toLevel);
  if (p.money < cost) return;

  g.pendingUpgrade = { playerId: p.id, tile: tileId, toLevel, cost };
  g.phaseDeadline = Date.now() + UPGRADE_MS;
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
        if (q.id !== p.id && !q.bankrupt && !q.surrendered) forcePay(g, q, e.amount, p);
      }
      break;
    case "payToAll":
      for (const q of g.players) {
        if (q.id !== p.id && !q.bankrupt && !q.surrendered) forcePay(g, p, e.amount, q);
      }
      break;
  }
}
