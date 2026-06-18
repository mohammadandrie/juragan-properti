"use client";

import { useEffect, useState } from "react";
import { ClientGameState, GameAction } from "@/lib/types";
import { QUIZ_QUESTIONS } from "@/lib/quiz";
import { QUIZ_REWARD, QUIZ_PENALTY, fmtMoney } from "@/lib/money";

const TOPIC_LABEL = { geografi: "🗺️ Geografi", budaya: "🎭 Budaya", umum: "📚 Umum" };

// Papan kuis ala kuis TV: turun dari atas, timer drum-roll, pilihan A-D.
export default function QuizOverlay({
  state,
  me,
  act,
}: {
  state: ClientGameState;
  me: { id: string } | null;
  act: (a: GameAction) => void;
}) {
  const q = state.quiz;
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => setPicked(null), [q?.questionIdx]);

  if (!q) return null;
  const question = QUIZ_QUESTIONS[q.questionIdx];
  const player = state.players.find((p) => p.id === q.playerId);
  const isMine = me?.id === q.playerId;
  const secsLeft = Math.max(0, Math.ceil((q.deadline - now) / 1000));
  const urgent = secsLeft <= 5;
  // setelah pemain memilih, perlihatkan hasil. TAPI jika salah, jawaban yang
  // benar TIDAK dibocorkan — hanya pilihan pemain yang ditandai merah.
  const revealed = picked !== null;
  const pickedCorrect = revealed && picked === question.answer;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-[dropIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)] px-4">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-violet-950 to-indigo-950 shadow-[0_0_80px_-10px_rgba(139,92,246,0.6)] ring-1 ring-violet-400/30">
          {/* header */}
          <div className="flex items-center justify-between bg-violet-500/20 px-5 py-3">
            <span className="text-sm font-black tracking-widest text-violet-300">🧠 CERDAS CERMAT</span>
            <span className="text-xs font-semibold text-violet-300/80">{TOPIC_LABEL[question.topic]}</span>
          </div>

          <div className="p-5">
            <p className="text-center text-xs text-violet-300/70">
              {isMine ? "Giliranmu menjawab!" : `${player?.name} sedang menjawab…`} · benar +{fmtMoney(QUIZ_REWARD)} · salah −{fmtMoney(QUIZ_PENALTY)}
            </p>

            <p className="mt-3 text-center text-lg font-bold text-white">{question.q}</p>

            {/* timer bar */}
            <div className="mx-auto mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-200 ${urgent ? "bg-rose-500" : "bg-violet-400"}`}
                style={{ width: `${(secsLeft / 15) * 100}%` }}
              />
            </div>
            <p className={`mt-1 text-center text-2xl font-black tabular-nums ${urgent ? "text-rose-400 animate-pulse" : "text-white/80"}`}>
              {secsLeft}
            </p>

            {/* pilihan */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {question.choices.map((c, i) => {
                const isAnswer = i === question.answer;
                const isPicked = picked === i;
                let style = "bg-white/10 text-white hover:bg-white/20";
                if (revealed) {
                  // hijau hanya jika pemain MEMANG memilih jawaban benar
                  if (isPicked && pickedCorrect) style = "bg-emerald-500 text-emerald-950 ring-2 ring-emerald-300";
                  else if (isPicked) style = "bg-rose-600 text-white ring-2 ring-rose-300";
                  else style = "bg-white/5 text-white/50";
                } else if (isPicked) {
                  style = "bg-amber-400 text-amber-950 scale-105";
                }
                return (
                  <button
                    key={i}
                    disabled={!isMine || picked !== null}
                    onClick={() => {
                      setPicked(i);
                      act({ type: "answerQuiz", choice: i });
                    }}
                    className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition active:scale-95 disabled:hover:bg-white/10 ${style}`}
                  >
                    <span className="mr-2 font-black text-violet-300">{["A", "B", "C", "D"][i]}.</span>
                    {c}
                    {revealed && isPicked && pickedCorrect && <span className="ml-2">✓</span>}
                    {revealed && isPicked && !pickedCorrect && <span className="ml-2">✗</span>}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <p
                className={`mt-3 text-center text-base font-black ${
                  pickedCorrect ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {pickedCorrect
                  ? `🎉 Benar! +${fmtMoney(QUIZ_REWARD)}`
                  : `❌ Salah · −${fmtMoney(QUIZ_PENALTY)}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
