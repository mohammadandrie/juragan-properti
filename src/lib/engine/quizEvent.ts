import { GameState, Player } from "../types";
import { BOARD } from "../board";
import { QUIZ_REWARD, QUIZ_PENALTY, fmtMoney } from "../money";
import { QUIZ_QUESTIONS } from "../quiz";
import { VIRAL_EVENTS, eventById, scheduleNextEvent, randomEventDuration } from "../events";
import { pushLog, pushNotice, alivePlayers, transfer, forcePay } from "./helpers";

// ---- Kuis ----
export function answerQuiz(g: GameState, p: Player, choice: number): string | null {
  const q = g.quiz;
  if (!q) return "Tidak ada kuis berjalan.";
  if (q.playerId !== p.id) return "Bukan kuismu.";
  const question = QUIZ_QUESTIONS[q.questionIdx];
  g.quiz = null;
  g.phaseDeadline = null;

  if (choice === question.answer) {
    transfer(g, null, p, QUIZ_REWARD);
    pushLog(g, `🎉 ${p.name} jawab benar! Hadiah ${fmtMoney(QUIZ_REWARD)}.`);
    pushNotice(g, "🎉", `${p.name} jawab benar Cerdas Cermat! +${fmtMoney(QUIZ_REWARD)}`, "good");
  } else {
    forcePay(g, p, QUIZ_PENALTY, null);
    // Sengaja TIDAK menyebut jawaban benar — pemain lain tak boleh tahu.
    pushLog(g, `❌ ${p.name} salah menjawab Cerdas Cermat. Denda ${fmtMoney(QUIZ_PENALTY)}.`);
    pushNotice(g, "❌", `${p.name} salah menjawab Cerdas Cermat. −${fmtMoney(QUIZ_PENALTY)}`, "bad");
  }
  return null;
}

// Kuis hangus jika melewati deadline (dianggap salah)
export function maybeExpireQuiz(g: GameState, now = Date.now()) {
  const q = g.quiz;
  if (!q || now < q.deadline) return;
  const p = g.players.find((x) => x.id === q.playerId)!;
  g.quiz = null;
  g.phaseDeadline = null;
  forcePay(g, p, QUIZ_PENALTY, null);
  // Tanpa membocorkan jawaban benar.
  pushLog(g, `⏰ Waktu habis! ${p.name} tidak menjawab. Denda ${fmtMoney(QUIZ_PENALTY)}.`);
  pushNotice(g, "⏰", `${p.name} kehabisan waktu Cerdas Cermat. −${fmtMoney(QUIZ_PENALTY)}`, "bad");
}

// ---- Event viral ----
// Dipanggil setiap kali putaran kembali ke pemain pertama.
// Jadwal acak 3-5 putaran; maksimal 1 event aktif sekaligus.
export function maybeTriggerEvent(g: GameState) {
  if (g.roundCount === 0) return;
  // belum waktunya event berikutnya
  if (g.roundCount < g.nextEventRound) return;
  // sudah ada event berdurasi yang masih aktif -> tunda, jangan dobel
  if (g.activeEvents.length > 0) {
    g.nextEventRound = scheduleNextEvent(g.roundCount);
    return;
  }

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
      pushLog(g, `📉 ${richest.name} kena potong ${fmtMoney(cut)}!`);
      break;
    }
    case "bonusOwner": {
      // pilih properti yang ada pemiliknya secara acak
      const ownedIds = Object.keys(g.ownership).map(Number);
      if (ownedIds.length === 0) {
        // tidak ada target -> batal, coba lagi putaran berikutnya
        g.nextEventRound = scheduleNextEvent(g.roundCount);
        return;
      }
      targetTile = ownedIds[Math.floor(Math.random() * ownedIds.length)];
      const own = g.ownership[targetTile];
      const owner = g.players.find((p) => p.id === own.owner)!;
      const amt = ev.effect.amount;
      if (amt >= 0) {
        transfer(g, null, owner, amt);
        pushLog(g, `${ev.icon} ${owner.name} dapat ${fmtMoney(amt)} dari ${BOARD[targetTile].name}!`);
      } else {
        forcePay(g, owner, -amt, null);
        pushLog(g, `${ev.icon} ${owner.name} bayar ${fmtMoney(-amt)} untuk ${BOARD[targetTile].name}.`);
      }
      break;
    }
    case "rentMultiplier":
    case "rentFree":
      // durasi acak 2-3 putaran (abaikan ev.rounds statis)
      g.activeEvents.push({ eventId: ev.id, remainingRounds: randomEventDuration() });
      break;
  }

  g.lastEvent = { eventId: ev.id, tile: targetTile, at: g.roundCount };
  g.nextEventRound = scheduleNextEvent(g.roundCount);
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
