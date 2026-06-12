// Juragan Properti — tipe inti game.
// Semua uang dalam juta rupiah (100 = Rp 100jt).

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
  umr?: number; // UMP/UMK riil (rupiah) — dasar urutan harga, ditampilkan sebagai trivia
  price?: number;
  group?: ColorGroup;
  rent?: number[]; // [tanah, 1-4 rumah, hotel]
  houseCost?: number;
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
  emote: { icon: string; at: number } | null;
}

export interface Ownership {
  owner: string;
  houses: number; // 0-4 rumah, 5 = hotel
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

// ---- Lelang ----
export interface Auction {
  tile: number;
  highBid: number;
  highBidder: string | null; // player id
  deadline: number; // epoch ms
  passed: string[]; // player id yang menyerah
}

// ---- State utama ----
export interface GameState {
  code: string;
  phase: "lobby" | "playing" | "ended";
  players: Player[];
  currentPlayer: number;
  canRoll: boolean;
  pendingBuy: number | null;
  auction: Auction | null;
  quiz: PendingQuiz | null;
  activeEvents: ActiveEvent[];
  lastEvent: { eventId: string; tile?: number; at: number } | null;
  lastDice: [number, number] | null;
  lastCard: { text: string; icon: string; at: number } | null;
  doublesCount: number;
  roundCount: number; // berapa kali giliran kembali ke pemain pertama
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
  | { type: "buy" }
  | { type: "skip" } // skip beli -> mulai lelang
  | { type: "bid"; amount: number }
  | { type: "passAuction" }
  | { type: "answerQuiz"; choice: number }
  | { type: "build"; tile: number }
  | { type: "sell"; tile: number }
  | { type: "payJail" }
  | { type: "useJailCard" }
  | { type: "emote"; icon: string }
  | { type: "endTurn" };

// State untuk klien: token di-strip, plus id pemain peminta
export interface ClientGameState extends Omit<GameState, "players"> {
  players: Omit<Player, "token">[];
  you: string | null;
}
