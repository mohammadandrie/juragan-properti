import { GameState, Player } from "../types";
import { BOARD, QUIZ_REWARD, QUIZ_PENALTY } from "../board";
import { QUIZ_QUESTIONS } from "../quiz";
import { VIRAL_EVENTS, eventById, EVENT_EVERY_N_ROUNDS } from "../events";
import { pushLog, alivePlayers, transfer, forcePay } from "./helpers";

// ---- Kuis ----
export function answerQuiz(g: GameState, p: Player, choice: number): string | null {
  const q = g.quiz;
  if (!q) return "Tidak ada kuis berjalan.";
  if (q.playerId !== p.id) return "Bukan kuismu.";
  const question = QUIZ_QUESTIONS[q.questionIdx];
  g.quiz = null;

  if (choice === question.answer) {
    transfer(g, null, p, QUIZ_REWARD);
    pushLog(g, `🎉 ${p.name} jawab benar! Hadiah Rp ${QUIZ_REWARD}jt.`);
  } else {
    forcePay(g, p, QUIZ_PENALTY, null);
    pushLog(g, `❌ ${p.name} salah. Jawaban: ${question.choices[question.answer]}. Denda Rp ${QUIZ_PENALTY}jt.`);
  }
  return null;
}

// Kuis hangus jika melewati deadline (dianggap salah)
export function maybeExpireQuiz(g: GameState, now = Date.now()) {
  const q = g.quiz;
  if (!q || now < q.deadline) return;
  const p = g.players.find((x) => x.id === q.playerId)!;
  const question = QUIZ_QUESTIONS[q.questionIdx];
  g.quiz = null;
  forcePay(g, p, QUIZ_PENALTY, null);
  pushLog(g, `⏰ Waktu habis! Jawaban: ${question.choices[question.answer]}. ${p.name} denda Rp ${QUIZ_PENALTY}jt.`);
}

// ---- Event viral ----
// Dipanggil setiap kali putaran kembali ke pemain pertama
export function maybeTriggerEvent(g: GameState) {
  if (g.roundCount === 0 || g.roundCount % EVENT_EVERY_N_ROUNDS !== 0) return;
  // jangan dobel di putaran sama
  if (g.lastEvent && g.lastEvent.at === g.roundCount) return;

  const ev = VIRAL_EVENTS[Math.floor(Math.random() * VIRAL_EVENTS.length)];
  let targetTile: number | undefined;

  switch (ev.effect.kind) {
    case "moneyAll":
      for (const p of alivePlayers(g)) {
        if (ev.effect.amount >= 0) transfer(g, null, p, ev.effect.amount);
        else forcePay(g, p, -ev.effect.amount, null);
      }
      break;
    case "moneyRichest": {
      const richest = alivePlayers(g).reduce((a, b) => (a.money >= b.money ? a : b));
      const cut = Math.floor((richest.money * ev.effect.pct) / 100);
      richest.money -= cut;
      pushLog(g, `📉 ${richest.name} kena potong Rp ${cut}jt!`);
      break;
    }
    case "bonusOwner": {
      // pilih properti yang ada pemiliknya secara acak
      const ownedIds = Object.keys(g.ownership).map(Number);
      if (ownedIds.length === 0) return; // tidak ada target, batal
      targetTile = ownedIds[Math.floor(Math.random() * ownedIds.length)];
      const own = g.ownership[targetTile];
      const owner = g.players.find((p) => p.id === own.owner)!;
      const amt = ev.effect.amount;
      if (amt >= 0) {
        transfer(g, null, owner, amt);
        pushLog(g, `${ev.icon} ${owner.name} dapat Rp ${amt}jt dari ${BOARD[targetTile].name}!`);
      } else {
        forcePay(g, owner, -amt, null);
        pushLog(g, `${ev.icon} ${owner.name} bayar Rp ${-amt}jt untuk ${BOARD[targetTile].name}.`);
      }
      break;
    }
    case "rentMultiplier":
    case "rentFree":
      g.activeEvents.push({ eventId: ev.id, remainingRounds: ev.rounds });
      break;
  }

  g.lastEvent = { eventId: ev.id, tile: targetTile, at: g.roundCount };
  pushLog(g, `📣 EVENT: ${ev.title} — ${ev.desc}`);
}

// Kurangi durasi event aktif tiap putaran baru
export function tickEvents(g: GameState) {
  for (const ae of g.activeEvents) ae.remainingRounds--;
  const expired = g.activeEvents.filter((ae) => ae.remainingRounds < 0);
  for (const ae of expired) {
    const ev = eventById(ae.eventId);
    if (ev) pushLog(g, `📴 Event "${ev.title}" berakhir.`);
  }
  g.activeEvents = g.activeEvents.filter((ae) => ae.remainingRounds >= 0);
}
