import { GameState, GameAction, Player, PawnKind } from "../types";
import { BOARD } from "../board";
import {
  pushLog,
  currentPlayer,
  alivePlayers,
  transfer,
  forcePay,
  ownedTiles,
  declareBankrupt,
  checkWinner,
  netWorth,
} from "./helpers";
import { rollDice } from "./core";
import { answerQuiz, maybeExpireQuiz, maybeTriggerEvent, tickEvents } from "./quizEvent";
import { JAIL_FINE, END_AUTO_MS, TAKEOVER_MULT, buyCost, sellValue, fmtMoney } from "../money";
import { offerUpgrade } from "./core";

export * from "./helpers";
export * from "./core";
export * from "./quizEvent";

const PAWNS: PawnKind[] = ["default", "bajaj", "pinisi", "komodo", "garuda", "ojek"];

// Jalankan aksi pemain. Return pesan error, atau null jika sukses.
export function applyAction(g: GameState, p: Player, action: GameAction): string | null {
  // timer-based settle dicek di setiap aksi
  maybeExpireGame(g);
  maybeExpireQuiz(g);
  maybeExpirePhase(g);

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

    case "setTimeLimit": {
      if (g.phase !== "lobby") return "Batas waktu hanya bisa diatur di lobby.";
      if (g.players[0]?.id !== p.id) return "Hanya host yang bisa mengatur batas waktu.";
      const ok = [0, 20, 30, 45];
      if (!ok.includes(action.minutes)) return "Pilihan batas waktu tidak valid.";
      g.timeLimitMin = action.minutes;
      return null;
    }

    case "start": {
      if (g.phase !== "lobby") return "Permainan sudah dimulai.";
      if (g.players[0]?.id !== p.id) return "Hanya host yang bisa memulai.";
      if (g.players.length < 2) return "Minimal 2 pemain.";
      g.phase = "playing";
      g.canRoll = true;
      g.phaseDeadline = null;
      g.endsAt = g.timeLimitMin > 0 ? Date.now() + g.timeLimitMin * 60_000 : null;
      pushLog(
        g,
        g.timeLimitMin > 0
          ? `🚀 Permainan dimulai. Batas waktu ${g.timeLimitMin} menit. Pemenang ditentukan oleh kekayaan tertinggi.`
          : "🚀 Permainan dimulai. Berlangsung hingga hanya tersisa satu pemain."
      );
      return null;
    }

    case "roll": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!g.canRoll) return "Bukan saatnya lempar dadu.";
      if (hasPending(g)) return "Selesaikan dulu interaksi berjalan.";
      rollDice(g);
      return null;
    }

    case "buyLevel": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pb = g.pendingBuy;
      if (!pb || pb.playerId !== p.id) return "Tidak ada properti yang ditawarkan.";
      const tile = BOARD[pb.tile];
      const level = Math.max(1, Math.min(action.level, pb.maxLevel));
      const cost = buyCost(tile.price ?? 0, level);
      if (p.money < cost) return "Uangmu tidak cukup.";
      transfer(g, p, null, cost);
      g.ownership[tile.id] = { owner: p.id, level, totalInvestment: cost };
      g.pendingBuy = null;
      g.phaseDeadline = null;
      pushLog(
        g,
        `🏠 ${p.name} membeli ${tile.name}${level > 1 ? ` level ${level}` : ""} seharga ${fmtMoney(cost)}!`
      );
      return null;
    }

    case "skipBuy": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pb = g.pendingBuy;
      if (!pb || pb.playerId !== p.id) return "Tidak ada properti yang ditawarkan.";
      g.pendingBuy = null;
      g.phaseDeadline = null;
      pushLog(g, `🤷 ${p.name} melewatkan penawaran ${BOARD[pb.tile].name}.`);
      return null;
    }

    case "upgrade": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pu = g.pendingUpgrade;
      if (!pu || pu.playerId !== p.id) return "Tidak ada upgrade yang ditawarkan.";
      const own = g.ownership[pu.tile];
      if (!own || own.owner !== p.id) return "Bukan propertimu.";
      if (p.money < pu.cost) return "Uangmu tidak cukup.";
      transfer(g, p, null, pu.cost);
      own.level = pu.toLevel;
      own.totalInvestment += pu.cost;
      g.pendingUpgrade = null;
      g.phaseDeadline = null;
      pushLog(
        g,
        own.level === 5
          ? `🏨 ${p.name} membangun gedung mewah di ${BOARD[pu.tile].name}!`
          : `🏗️ ${p.name} upgrade ${BOARD[pu.tile].name} ke level ${own.level} (${fmtMoney(pu.cost)}).`
      );
      return null;
    }

    case "skipUpgrade": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!g.pendingUpgrade || g.pendingUpgrade.playerId !== p.id) return "Tidak ada upgrade.";
      g.pendingUpgrade = null;
      g.phaseDeadline = null;
      return null;
    }

    case "payRentCash": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pr = g.pendingRent;
      if (!pr || pr.playerId !== p.id) return "Tidak ada sewa yang harus dibayar.";
      if (p.money < pr.amount) return "Uangmu tidak cukup — jual aset atau pinjam bank.";
      settleRent(g, p, pr.amount, pr.ownerId, pr.tile);
      return null;
    }

    case "bankLoan": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pr = g.pendingRent;
      if (!pr || pr.playerId !== p.id) return "Tidak ada sewa yang harus dibayar.";
      if (p.hasUsedBankLoan) return "Pinjaman bank sudah dipakai.";
      if (p.money >= pr.amount) return "Kamu masih punya cukup uang tunai.";
      const loan = pr.amount - p.money;
      p.hasUsedBankLoan = true;
      transfer(g, null, p, loan);
      pushLog(g, `🏦 ${p.name} meminjam ${fmtMoney(loan)} dari bank (kuota pinjaman habis).`);
      settleRent(g, p, pr.amount, pr.ownerId, pr.tile);
      return null;
    }

    case "sellAndPay": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pr = g.pendingRent;
      if (!pr || pr.playerId !== p.id) return "Tidak ada sewa yang harus dibayar.";
      for (const tileId of action.tiles) {
        const own = g.ownership[tileId];
        if (own?.owner !== p.id) continue;
        const refund = sellValue(own.totalInvestment);
        delete g.ownership[tileId];
        transfer(g, null, p, refund);
        pushLog(g, `📉 ${p.name} menjual ${BOARD[tileId].name} (${fmtMoney(refund)}).`);
      }
      if (p.money < pr.amount) return "Masih kurang — jual aset lain atau pinjam bank.";
      settleRent(g, p, pr.amount, pr.ownerId, pr.tile);
      return null;
    }

    case "sell": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (hasPending(g)) return "Selesaikan dulu interaksi berjalan.";
      const own = g.ownership[action.tile];
      if (own?.owner !== p.id) return "Bukan propertimu.";
      const refund = sellValue(own.totalInvestment);
      delete g.ownership[action.tile];
      transfer(g, null, p, refund);
      pushLog(g, `📉 ${p.name} menjual ${BOARD[action.tile].name} ke bank (${fmtMoney(refund)}).`);
      return null;
    }

    case "answerQuiz":
      return answerQuiz(g, p, action.choice);

    case "payJail": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (!p.inJail) return "Kamu tidak di penjara.";
      forcePay(g, p, JAIL_FINE, null);
      if (!p.bankrupt) {
        p.inJail = false;
        p.jailTurns = 0;
        pushLog(g, `💸 ${p.name} membayar denda ${fmtMoney(JAIL_FINE)} dan keluar dari Penjara.`);
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
      pushLog(g, `🎟️ ${p.name} menggunakan Kartu Bebas Penjara.`);
      return null;
    }

    case "surrender": {
      if (g.phase !== "playing") return "Permainan belum berjalan.";
      if (p.bankrupt || p.surrendered) return "Kamu sudah keluar dari permainan.";
      p.surrendered = true;
      // lepas semua aset ke bank
      for (const id of ownedTiles(g, p)) delete g.ownership[id];
      pushLog(g, `🏳️ ${p.name} menyerah dari permainan.`);
      // jika yang menyerah sedang giliran, lanjutkan
      const wasMyTurn = currentPlayer(g).id === p.id;
      checkWinner(g);
      if (g.phase === "playing" && wasMyTurn) {
        g.pendingBuy = null;
        g.pendingRent = null;
        g.pendingUpgrade = null;
        g.quiz = null;
        advanceTurn(g);
      }
      return null;
    }

    case "emote": {
      const ok = ["😂", "🔥", "😭", "👍", "😡", "🤑"];
      if (!ok.includes(action.icon)) return "Emote tidak dikenal.";
      p.emote = { icon: action.icon, at: Date.now() };
      return null;
    }

    case "resume": {
      // batalkan status AFK (route sudah menghapus p.afk sebelum ini); beri
      // tenggat baru agar pemain punya waktu penuh sebelum diambil alih lagi.
      if (g.phase !== "playing") return "Permainan belum berjalan.";
      if (currentPlayer(g).id === p.id && g.canRoll) {
        g.phaseDeadline = Date.now() + 30_000;
      }
      return null;
    }

    case "takeover": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      const pr = g.pendingRent;
      if (!pr || pr.playerId !== p.id) return "Tidak ada properti yang bisa diambil alih.";
      const own = g.ownership[pr.tile];
      if (!own || own.owner === p.id) return "Properti tidak dapat diambil alih.";
      const owner = g.players.find((q) => q.id === own.owner);
      if (!owner || owner.bankrupt || owner.surrendered) return "Pemilik tidak aktif.";
      const cost = Math.round(own.totalInvestment * TAKEOVER_MULT);
      if (p.money < cost) return `Saldo tidak cukup untuk ambil alih (butuh ${fmtMoney(cost)}).`;
      transfer(g, p, owner, cost);
      g.ownership[pr.tile] = {
        owner: p.id,
        level: own.level,
        // totalInvestment baru = harga ambil alih (basis sewa & jual selanjutnya)
        totalInvestment: cost,
      };
      g.pendingRent = null;
      g.phaseDeadline = null;
      pushLog(
        g,
        `🤝 ${p.name} mengambil alih ${BOARD[pr.tile].name} dari ${owner.name} dengan harga ${fmtMoney(cost)}.`
      );
      // Tawarkan upgrade kalau memenuhi syarat (selaras dgn mendarat di kota sendiri)
      offerUpgrade(g, p, pr.tile);
      return null;
    }

    case "endTurn": {
      const err = mustBeTurn(g, p);
      if (err) return err;
      if (g.canRoll) return "Lempar dadu dulu.";
      if (hasPending(g)) return "Selesaikan dulu interaksi berjalan.";
      advanceTurn(g);
      return null;
    }

    default:
      return "Aksi tidak dikenal.";
  }
}

function hasPending(g: GameState): boolean {
  return (
    g.pendingBuy !== null ||
    g.pendingRent !== null ||
    g.pendingUpgrade !== null ||
    g.quiz !== null
  );
}

// Bayar sewa ke pemilik & bereskan fase. Pemanggil sudah memastikan uang cukup.
function settleRent(g: GameState, p: Player, amount: number, ownerId: string, tile: number) {
  const owner = g.players.find((q) => q.id === ownerId);
  transfer(g, p, owner ?? null, amount);
  g.pendingRent = null;
  g.phaseDeadline = null;
  pushLog(g, `🏠 ${p.name} bayar sewa ${fmtMoney(amount)} ke ${owner?.name ?? "bank"} (${BOARD[tile].name}).`);
}

function mustBeTurn(g: GameState, p: Player): string | null {
  if (g.phase !== "playing") return "Permainan belum berjalan.";
  if (currentPlayer(g).id !== p.id) return "Bukan giliranmu.";
  if (p.bankrupt) return "Kamu sudah bangkrut.";
  if (p.surrendered) return "Kamu sudah menyerah.";
  return null;
}

// Batas durasi game tercapai: akhiri dengan pemenang = kekayaan tertinggi.
export function maybeExpireGame(g: GameState, now = Date.now()) {
  if (g.phase !== "playing" || g.endsAt === null || now < g.endsAt) return;
  endByNetWorth(g, "⏰ Waktu habis!");
}

// Fase keputusan (beli/sewa/upgrade) hangus jika lewat deadline.
export function maybeExpirePhase(g: GameState, now = Date.now()) {
  if (g.phaseDeadline === null || now < g.phaseDeadline) return;

  // sewa hangus = paksa bayar otomatis (jual aset / bangkrut)
  if (g.pendingRent) {
    const pr = g.pendingRent;
    const debtor = g.players.find((q) => q.id === pr.playerId);
    const owner = g.players.find((q) => q.id === pr.ownerId) ?? null;
    g.pendingRent = null;
    g.phaseDeadline = null;
    if (debtor && !debtor.bankrupt) {
      pushLog(g, `⏰ Waktu habis! ${debtor.name} bayar sewa otomatis.`);
      forcePay(g, debtor, pr.amount, owner);
    }
    return;
  }
  // tawaran beli hangus = lewati
  if (g.pendingBuy) {
    const pb = g.pendingBuy;
    g.pendingBuy = null;
    g.phaseDeadline = null;
    pushLog(g, `⏰ ${BOARD[pb.tile].name} dilewatkan (waktu habis).`);
    return;
  }
  // upgrade hangus = lewati saja
  if (g.pendingUpgrade) {
    g.pendingUpgrade = null;
    g.phaseDeadline = null;
    return;
  }
  // tidak ada pending: kalau masih boleh lempar dadu (canRoll) -> ini deadline
  // giliran. Human yang tak lempar = AFK: tandai agar bot mengambil alih
  // (settle akan menjalankannya). Bot tidak butuh ini (di-handle settle).
  // Kalau sudah lempar & selesai (canRoll false) -> auto-end turn.
  g.phaseDeadline = null;
  const cur = currentPlayer(g);
  if (cur.bankrupt || cur.surrendered) return;
  if (g.canRoll && !cur.bot) {
    cur.afk = true; // diambil alih bot mulai giliran ini
    return;
  }
  if (!cur.bot) {
    advanceTurn(g);
  }
}

// Arm timer auto-end giliran untuk pemain manusia setelah aksinya tuntas
// (tidak ada pending & tidak bisa lempar lagi). Tanpa ini giliran human macet
// karena tombol "Akhiri Giliran" sudah dihapus.
export function armAutoEnd(g: GameState) {
  if (g.phase !== "playing") return;
  const cur = currentPlayer(g);
  if (cur.bot || cur.bankrupt || cur.surrendered) return;
  if (g.canRoll) return; // masih giliran lempar
  if (hasPending(g)) return; // ada keputusan tertunda
  if (g.quiz) return;
  if (g.phaseDeadline === null) {
    g.phaseDeadline = Date.now() + END_AUTO_MS;
  }
}

export function advanceTurn(g: GameState) {
  const alive = alivePlayers(g);
  if (alive.length <= 1) return;
  let next = g.currentPlayer;
  do {
    next = (next + 1) % g.players.length;
  } while (g.players[next].bankrupt || g.players[next].surrendered);

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
  g.destTile = null;
  g.phaseDeadline = Date.now() + 30_000;
}

// Akhiri game: pemenang = kekayaan tertinggi (tunai + total nilai properti).
// `reason` jadi prefix log.
function endByNetWorth(g: GameState, reason = "⏰ Waktu habis!") {
  const alive = alivePlayers(g);
  if (alive.length === 0) return;
  const winner = alive.reduce((a, b) => (netWorth(g, b) > netWorth(g, a) ? b : a));
  g.winner = winner.id;
  g.phase = "ended";
  pushLog(
    g,
    `${reason} ${winner.name} menang dengan total kekayaan ${fmtMoney(netWorth(g, winner))}.`
  );
}

