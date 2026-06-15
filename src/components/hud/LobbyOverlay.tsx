"use client";

import { ClientGameState, GameAction, PawnKind, BotPersona } from "@/lib/types";

const PAWN_LIST: { kind: PawnKind; icon: string; label: string }[] = [
  { kind: "default", icon: "♟️", label: "Klasik" },
  { kind: "bajaj", icon: "🛺", label: "Bajaj" },
  { kind: "pinisi", icon: "⛵", label: "Pinisi" },
  { kind: "komodo", icon: "🦎", label: "Komodo" },
  { kind: "garuda", icon: "🦅", label: "Garuda" },
  { kind: "ojek", icon: "🏍️", label: "Ojek" },
];

const COLORS = ["#22d3ee", "#f43f5e", "#a3e635", "#fbbf24", "#a78bfa", "#fb923c"];

const BOTS: { persona: BotPersona; icon: string; name: string; desc: string }[] = [
  { persona: "jago", icon: "😤", name: "Bang Jago", desc: "Agresif, rajin upgrade" },
  { persona: "hemat", icon: "🧮", name: "Bu Hemat", desc: "Pelit, nabung terus" },
  { persona: "untung", icon: "🍀", name: "Si Untung", desc: "Random, santai" },
];

// Overlay lobby: pilih pion + warna, host bisa tambah bot & mulai.
export default function LobbyOverlay({
  state,
  me,
  act,
  code,
}: {
  state: ClientGameState;
  me: { id: string; pawn: PawnKind; color: string } | null;
  act: (a: GameAction) => void;
  code: string;
}) {
  if (state.phase !== "lobby") return null;
  const isHost = me && state.players[0]?.id === me.id;
  const takenPawns = new Set(state.players.filter((p) => p.id !== me?.id).map((p) => p.pawn));

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-md p-4">
      <div className="w-full max-w-xl">
        <h2 className="text-center text-2xl font-black text-white drop-shadow">Lobby</h2>
        <p className="mt-1 text-center text-sm text-white/70">
          Kode room:{" "}
          <button
            onClick={() => navigator.clipboard?.writeText(code)}
            className="rounded-lg bg-white/10 px-2 py-0.5 font-mono text-lg font-black tracking-widest text-amber-300 hover:bg-white/20"
            title="Klik untuk salin"
          >
            {code}
          </button>
        </p>

        {/* daftar pemain */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
              <span className="text-lg">{PAWN_LIST.find((x) => x.kind === p.pawn)?.icon}</span>
              <span className="text-sm font-bold text-white">
                {p.name}
                {p.id === me?.id && " (kamu)"}
                {p.bot && " 🤖"}
              </span>
              <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            </div>
          ))}
          {Array.from({ length: 4 - state.players.length }).map((_, i) => (
            <div key={i} className="rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/40">
              menunggu…
            </div>
          ))}
        </div>

        {/* pilih pion */}
        {me && (
          <>
            <p className="mt-5 text-center text-xs font-bold uppercase tracking-widest text-white/60">Pilih pionmu</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PAWN_LIST.map((pw) => {
                const taken = takenPawns.has(pw.kind) && pw.kind !== "default";
                const selected = me.pawn === pw.kind;
                return (
                  <button
                    key={pw.kind}
                    disabled={taken}
                    onClick={() => act({ type: "setPawn", pawn: pw.kind })}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 transition active:scale-95 ${
                      selected
                        ? "bg-amber-400/20 ring-2 ring-amber-400 scale-105"
                        : taken
                          ? "bg-white/5 opacity-30"
                          : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <span className="text-2xl">{pw.icon}</span>
                    <span className="text-[10px] font-bold text-white/80">{pw.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-white/60">Warna</p>
            <div className="mt-2 flex justify-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => act({ type: "setPawn", pawn: me.pawn, color: c })}
                  className={`h-8 w-8 rounded-full transition active:scale-90 ${
                    me.color === c ? "ring-[3px] ring-white scale-110" : "ring-1 ring-white/30 hover:scale-105"
                  }`}
                  style={{ background: c, boxShadow: `0 0 12px ${c}88` }}
                />
              ))}
            </div>
          </>
        )}

        {/* bot (host) */}
        {isHost && state.players.length < 4 && (
          <>
            <p className="mt-5 text-center text-xs font-bold uppercase tracking-widest text-white/60">Tambah bot</p>
            <div className="mt-2 flex justify-center gap-2">
              {BOTS.filter((b) => !state.players.some((p) => p.bot === b.persona)).map((b) => (
                <button
                  key={b.persona}
                  onClick={() => act({ type: "addBot", persona: b.persona })}
                  className="flex flex-col items-center rounded-2xl bg-white/10 px-4 py-2 hover:bg-white/20 active:scale-95 transition"
                  title={b.desc}
                >
                  <span className="text-xl">{b.icon}</span>
                  <span className="text-[10px] font-bold text-white/80">{b.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* mulai */}
        <div className="mt-6 flex justify-center">
          {isHost ? (
            <button
              onClick={() => act({ type: "start" })}
              disabled={state.players.length < 2}
              className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-10 py-3 text-lg font-black text-amber-950 shadow-[0_0_40px_-5px_rgba(251,191,36,0.6)] hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100"
            >
              🚀 MULAI ({state.players.length}/4)
            </button>
          ) : me ? (
            <p className="text-sm text-white/60">Menunggu host memulai…</p>
          ) : (
            <p className="text-sm text-amber-300/90">Kamu menonton. Gabung lewat halaman utama dengan kode di atas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
