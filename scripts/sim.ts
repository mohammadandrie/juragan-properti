// Simulasi cepat: 3 bot main sampai ada pemenang (atau 500 iterasi).
// Jalankan: npx tsx scripts/sim.ts
import { newGame, newPlayer, settle, applyAction } from "../src/lib/room";
import { decideBotAction } from "../src/lib/bots";

let won = 0;
for (let run = 0; run < 5; run++) {
  const g = newGame("HostBot");
  g.players[0].bot = "jago"; // host juga bot supaya full otomatis
  g.players.push(newPlayer("", 1, "hemat"));
  g.players.push(newPlayer("", 2, "untung"));
  g.phase = "playing";
  g.canRoll = true;

  let iter = 0;
  while (g.phase === "playing" && iter++ < 2000) {
    // paksa settle tanpa delay
    g.updatedAt = 0;
    // percepat timer lelang/kuis
    if (g.auction) g.auction.deadline = Date.now() - 1;
    if (g.quiz) g.quiz.deadline = g.quiz.deadline; // bot jawab sendiri
    settle(g);
    // safety: jika tidak ada bot yang bisa bertindak (harusnya tidak terjadi), break
    const anyAction = g.players.some((p) => p.bot && !p.bankrupt && decideBotAction(g, p));
    if (!anyAction && g.phase === "playing") {
      console.log("STUCK pada iterasi", iter, JSON.stringify({
        cur: g.currentPlayer, canRoll: g.canRoll, pendingBuy: g.pendingBuy,
        auction: !!g.auction, quiz: !!g.quiz,
      }));
      break;
    }
  }
  const aliveCount = g.players.filter((p) => !p.bankrupt).length;
  console.log(`Run ${run + 1}: phase=${g.phase} iter=${iter} round=${g.roundCount} alive=${aliveCount} winner=${g.players.find((p) => p.id === g.winner)?.name ?? "-"}`);
  if (g.phase === "ended") won++;
}
console.log(`Selesai: ${won}/5 simulasi mencapai pemenang.`);
