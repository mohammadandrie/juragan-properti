import { GameState, Player } from "../types";
import { BOARD, tilesInGroup, AIRPORT_RENT } from "../board";
import { eventById } from "../events";

export function alivePlayers(g: GameState): Player[] {
  return g.players.filter((p) => !p.bankrupt);
}

export function currentPlayer(g: GameState): Player {
  return g.players[g.currentPlayer];
}

export function pushLog(g: GameState, msg: string) {
  g.log.push(msg);
  if (g.log.length > 60) g.log.splice(0, g.log.length - 60);
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
  if (!owner || owner.bankrupt) return 0;

  if (tile.type === "property") {
    const rent = tile.rent![own.houses];
    // tanah kosong tapi 1 grup lengkap = sewa 2x (aturan klasik)
    if (own.houses === 0) {
      const complete = tilesInGroup(tile.group!).every(
        (t) => g.ownership[t.id]?.owner === own.owner
      );
      if (complete) return rent * 2;
    }
    return rent;
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
    return diceSum * (n === 2 ? 10 : 4);
  }
  return 0;
}

// Transfer uang antar pemain; from/to null = bank
export function transfer(g: GameState, from: Player | null, to: Player | null, amount: number) {
  if (from) from.money -= amount;
  if (to) to.money += amount;
}

// Pemain bangkrut: lepas semua properti, cek pemenang
export function declareBankrupt(g: GameState, p: Player) {
  p.bankrupt = true;
  for (const [id, own] of Object.entries(g.ownership)) {
    if (own.owner === p.id) delete g.ownership[Number(id)];
  }
  pushLog(g, `💀 ${p.name} bangkrut!`);
  const alive = alivePlayers(g);
  if (alive.length === 1) {
    g.winner = alive[0].id;
    g.phase = "ended";
    pushLog(g, `🏆 ${alive[0].name} memenangkan permainan!`);
  }
}

// Paksa bayar; kalau uang kurang, jual aset otomatis lalu bangkrut bila tetap kurang
export function forcePay(g: GameState, p: Player, amount: number, to: Player | null) {
  // jual rumah dulu, lalu properti, sampai cukup
  while (p.money < amount) {
    const ownedIds = Object.entries(g.ownership)
      .filter(([, o]) => o.owner === p.id)
      .map(([id]) => Number(id));
    if (ownedIds.length === 0) break;
    // prioritas: jual rumah termahal, lalu properti termurah
    const withHouses = ownedIds.filter((id) => g.ownership[id].houses > 0);
    if (withHouses.length > 0) {
      const id = withHouses[0];
      g.ownership[id].houses--;
      p.money += Math.floor((BOARD[id].houseCost ?? 0) / 2);
      pushLog(g, `🏚️ ${p.name} terpaksa menjual rumah di ${BOARD[id].name}.`);
    } else {
      const id = ownedIds[0];
      delete g.ownership[id];
      p.money += Math.floor((BOARD[id].price ?? 0) / 2);
      pushLog(g, `📉 ${p.name} terpaksa menjual ${BOARD[id].name}.`);
    }
  }
  if (p.money >= amount) {
    transfer(g, p, to, amount);
  } else {
    // serahkan semua sisa uang lalu bangkrut
    if (to) to.money += Math.max(p.money, 0);
    p.money = 0;
    declareBankrupt(g, p);
  }
}
