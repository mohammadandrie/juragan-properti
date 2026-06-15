// Juragan Properti — tipe inti game.
// Semua uang dalam RUPIAH penuh (1_000_000 = Rp1 jt).

export type TileType =
  | "go"
  | "property"
  | "airport"
  | "utility"
  | "tax"
  | "chance" // Kesempatan
  | "chest" // Dana Umum
  | "quiz" // Cerdas Cermat
  | "jail"
  | "parking"
  | "gotojail";

export type ColorGroup =
  | "g1" // termurah, dekat MULAI
  | "g2"
  | "g3"
  | "g4"
  | "g5"
  | "g6"
  | "g7"
  | "g8"; // termahal, sebelum MULAI

export interface Tile {
  id: number;
  type: TileType;
  name: string;
  umr?: number; // UMP/UMK riil (rupiah) — trivia
  price?: number; // basePrice (rupiah penuh)
  group?: ColorGroup;
  taxAmount?: number;
}

export type PawnKind = "default" | "bajaj" | "pinisi" | "komodo" | "garuda" | "ojek";

export type BotPersona = "jago" | "hemat" | "untung";

export interface Player {
  id: string;
  token: string; // rahasia; di-strip sebelum dikirim ke klien
  name: string;
  color: string;
  pawn: PawnKind;
  bot: BotPersona | null;
  money: number;
  pos: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  bankrupt: boolean;
  surrendered: boolean; // menyerah sukarela
  startPassCount: number; // berapa kali lewat MULAI (membuka level upgrade)
  hasUsedBankLoan: boolean; // pinjaman bank hanya 1x/game
  emote: { icon: string; at: number } | null;
}

export interface Ownership {
  owner: string;
  level: number; // 1-5 (0 = tidak dimiliki / tidak disimpan)
  totalInvestment: number; // total uang yang dikeluarkan (beli + upgrade)
}

// ---- Kartu ----
export type CardEffect =
  | { kind: "money"; amount: number }
  | { kind: "moveTo"; tile: number }
  | { kind: "moveBack"; steps: number }
  | { kind: "gotojail" }
  | { kind: "jailcard" }
  | { kind: "collectFromAll"; amount: number }
  | { kind: "payToAll"; amount: number };

export interface Card {
  text: string;
  icon: string;
  effect: CardEffect;
}

// ---- Event viral ----
export type EventEffect =
  | { kind: "rentMultiplier"; group: ColorGroup | "all"; mult: number } // sewa x N
  | { kind: "rentFree" } // semua bebas sewa
  | { kind: "moneyAll"; amount: number } // semua dapat/bayar
  | { kind: "moneyRichest"; pct: number } // terkaya kena potong %
  | { kind: "bonusOwner"; tile: number; amount: number }; // pemilik petak dapat bonus

export interface ViralEvent {
  id: string;
  title: string;
  desc: string;
  icon: string;
  good: boolean;
  rounds: number; // durasi efek dalam putaran (0 = sekali jalan)
  effect: EventEffect;
}

export interface ActiveEvent {
  eventId: string;
  tile?: number; // petak target (untuk event berbasis lokasi)
  remainingRounds: number;
}

// ---- Kuis ----
export interface QuizQuestion {
  q: string;
  choices: [string, string, string, string];
  answer: number; // index 0-3
  topic: "geografi" | "budaya" | "umum";
}

export interface PendingQuiz {
  playerId: string;
  questionIdx: number;
  deadline: number; // epoch ms
}

// ---- Interaksi pending (mendarat di petak) ----
// Tawaran beli kota kosong — pemain pilih level awal sesuai progress START.
export interface PendingBuy {
  playerId: string;
  tile: number;
  maxLevel: number; // level tertinggi yang boleh dibeli langsung (1-4)
}

// Sewa yang harus dibayar di kota lawan — pilih cash/jual/pinjam.
export interface PendingRent {
  playerId: string;
  tile: number;
  ownerId: string;
  amount: number;
}

// Kesempatan upgrade saat mendarat di kota sendiri.
export interface PendingUpgrade {
  playerId: string;
  tile: number;
  toLevel: number; // level tujuan jika upgrade
  cost: number;
}

// ---- State utama ----
export interface GameState {
  code: string;
  phase: "lobby" | "playing" | "ended";
  players: Player[];
  currentPlayer: number;
  canRoll: boolean;
  pendingBuy: PendingBuy | null;
  pendingRent: PendingRent | null;
  pendingUpgrade: PendingUpgrade | null;
  quiz: PendingQuiz | null;
  // batas waktu fase keputusan aktif (epoch ms); null = tidak ada timer
  phaseDeadline: number | null;
  // info dadu & tujuan untuk visual flow
  destTile: number | null; // petak tujuan yang di-highlight sebelum pion jalan
  activeEvents: ActiveEvent[];
  lastEvent: { eventId: string; tile?: number; at: number } | null;
  lastDice: [number, number] | null;
  lastCard: { text: string; icon: string; at: number } | null;
  doublesCount: number;
  roundCount: number; // berapa kali giliran kembali ke pemain pertama
  nextEventRound: number; // putaran berikutnya event boleh muncul (acak 3-5)
  ownership: Record<number, Ownership>;
  chanceDeck: number[];
  chestDeck: number[];
  quizDeck: number[];
  log: string[];
  winner: string | null;
  version: number;
  updatedAt: number;
}

export type GameAction =
  | { type: "start" }
  | { type: "addBot"; persona: BotPersona }
  | { type: "setPawn"; pawn: PawnKind; color?: string }
  | { type: "roll" }
  | { type: "buyLevel"; level: number } // beli kota kosong di level tertentu
  | { type: "skipBuy" } // tidak beli
  | { type: "upgrade" } // upgrade kota sendiri
  | { type: "skipUpgrade" }
  | { type: "payRentCash" }
  | { type: "bankLoan" } // pinjam bank lalu bayar sewa
  | { type: "sellAndPay"; tiles: number[] } // jual aset lalu bayar sewa
  | { type: "sell"; tile: number } // jual aset bebas (panel properti)
  | { type: "answerQuiz"; choice: number }
  | { type: "payJail" }
  | { type: "useJailCard" }
  | { type: "surrender" }
  | { type: "emote"; icon: string }
  | { type: "endTurn" };

// State untuk klien: token di-strip, plus id pemain peminta
export interface ClientGameState extends Omit<GameState, "players"> {
  players: Omit<Player, "token">[];
  you: string | null;
}
