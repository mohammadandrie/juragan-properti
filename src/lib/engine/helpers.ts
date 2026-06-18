import { GameState, Player } from "../types";
import { BOARD, AIRPORT_RENT, UTILITY_RENT } from "../board";
import { eventById } from "../events";
import { rentForLevel } from "../money";

export function alivePlayers(g: GameState): Player[] {
  return g.players.filter((p) => !p.bankrupt && !p.surrendered);
}

export function currentPlayer(g: GameState): Player {
  return g.players[g.currentPlayer];
}

export function pushLog(g: GameState, msg: string) {
  g.log.push(msg);
  if (g.log.length > 60) g.log.splice(0, g.log.length - 60);
}

// Notifikasi singkat aksi pemain → ditampilkan sebagai toast di klien.
export function pushNotice(g: GameState, icon: string, text: string, tone: "good" | "bad" | "info") {
  g.lastNotice = { icon, text, tone, at: Date.now() };
}

// Multiplier sewa dari event viral aktif; 0 = sewa gratis
export function rentMultiplier(g: GameState, tileId: number): number {
  let mult = 1;
  const tile = BOARD[tileId];
  for (const ae of g.activeEvents) {
    const ev = eventById(ae.eventId);
    if (!ev) continue;
    if (ev.effect.kind === "rentFree") return 0;
    if (ev.effect.kind === "rentMultiplier") {
      if (ev.effect.group === "all" || ev.effect.group === tile.group) {
        mult *= ev.effect.mult;
      }
    }
  }
  return mult;
}

// Hitung sewa petak (sebelum multiplier event)
export function baseRent(g: GameState, tileId: number, diceSum: number): number {
  const tile = BOARD[tileId];
  const own = g.ownership[tileId];
  if (!own) return 0;
  const owner = g.players.find((p) => p.id === own.owner);
  if (!owner || owner.bankrupt || owner.surrendered) return 0;

  if (tile.type === "property") {
    return rentForLevel(tile.price ?? 0, own.level);
  }
  if (tile.type === "airport") {
    const n = BOARD.filter(
      (t) => t.type === "airport" && g.ownership[t.id]?.owner === own.owner
    ).length;
    return AIRPORT_RENT[n - 1] ?? 0;
  }
  if (tile.type === "utility") {
    const n = BOARD.filter(
      (t) => t.type === "utility" && g.ownership[t.id]?.owner === own.owner
    ).length;
    const base = UTILITY_RENT[n - 1] ?? UTILITY_RENT[0];
    // sedikit variasi berdasar dadu (4%-12% ekstra)
    return Math.round(base * (1 + diceSum / 100));
  }
  return 0;
}

// Sewa final termasuk multiplier event
export function rentDue(g: GameState, tileId: number, diceSum: number): number {
  const mult = rentMultiplier(g, tileId);
  return Math.round(baseRent(g, tileId, diceSum) * mult);
}

// Transfer uang antar pemain; from/to null = bank
export function transfer(g: GameState, from: Player | null, to: Player | null, amount: number) {
  if (from) from.money -= amount;
  if (to) to.money += amount;
}

// Lepas satu aset ke bank (reset penuh)
export function releaseTile(g: GameState, tileId: number) {
  delete g.ownership[tileId];
}

// Daftar id aset milik pemain
export function ownedTiles(g: GameState, p: Player): number[] {
  return Object.entries(g.ownership)
    .filter(([, o]) => o.owner === p.id)
    .map(([id]) => Number(id));
}

// Total nilai jual semua aset pemain (50% investasi)
export function totalSellValue(g: GameState, p: Player): number {
  return ownedTiles(g, p).reduce((sum, id) => {
    const inv = g.ownership[id].totalInvestment;
    return sum + Math.floor(inv / 2 / 10_000) * 10_000;
  }, 0);
}

// Kekayaan bersih: uang tunai + nilai investasi penuh semua aset.
export function netWorth(g: GameState, p: Player): number {
  const assets = ownedTiles(g, p).reduce((s, id) => s + g.ownership[id].totalInvestment, 0);
  return p.money + assets;
}

// Pemain bangkrut: lepas semua properti, cek pemenang
export function declareBankrupt(g: GameState, p: Player) {
  p.bankrupt = true;
  for (const [id, own] of Object.entries(g.ownership)) {
    if (own.owner === p.id) delete g.ownership[Number(id)];
  }
  pushLog(g, `💀 ${p.name} dinyatakan bangkrut dan keluar dari permainan.`);
  checkWinner(g);
}

export function checkWinner(g: GameState) {
  const alive = alivePlayers(g);
  if (alive.length === 1) {
    g.winner = alive[0].id;
    g.phase = "ended";
    pushLog(g, `🏆 ${alive[0].name} memenangkan permainan sebagai pemain terakhir yang bertahan.`);
  }
}

// Paksa bayar; kalau uang kurang, jual aset otomatis lalu bangkrut bila tetap kurang.
// Dipakai untuk pajak/kartu/event (bukan sewa kota lawan yang punya UI sendiri).
export function forcePay(g: GameState, p: Player, amount: number, to: Player | null) {
  while (p.money < amount) {
    const ids = ownedTiles(g, p);
    if (ids.length === 0) break;
    // jual aset termurah dulu
    ids.sort((a, b) => g.ownership[a].totalInvestment - g.ownership[b].totalInvestment);
    const id = ids[0];
    const refund = Math.floor(g.ownership[id].totalInvestment / 2 / 10_000) * 10_000;
    delete g.ownership[id];
    p.money += refund;
    pushLog(g, `📉 ${p.name} terpaksa menjual ${BOARD[id].name} untuk membayar kewajiban.`);
  }
  if (p.money >= amount) {
    transfer(g, p, to, amount);
  } else {
    if (to) to.money += Math.max(p.money, 0);
    p.money = 0;
    declareBankrupt(g, p);
  }
}
