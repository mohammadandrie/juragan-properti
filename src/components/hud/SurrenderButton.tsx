"use client";

import { useState } from "react";
import { GameAction } from "@/lib/types";

// Tombol menyerah + modal konfirmasi. Selalu tersedia selama game berjalan
// untuk pemain yang masih aktif (bukan bot, belum bangkrut/menyerah).
export default function SurrenderButton({
  show,
  act,
}: {
  show: boolean;
  act: (a: GameAction) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  if (!show) return null;

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="absolute bottom-4 right-16 z-20 flex h-11 items-center gap-1.5 rounded-full bg-rose-600/70 px-4 text-xs font-bold text-white backdrop-blur ring-1 ring-rose-300/30 hover:bg-rose-500 active:scale-95 transition"
        title="Menyerah dari permainan"
      >
        🏳️ Menyerah
      </button>

      {confirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-[dropIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] w-full max-w-xs rounded-2xl bg-slate-900 p-5 text-center ring-1 ring-white/15">
            <p className="text-3xl">🏳️</p>
            <p className="mt-2 text-base font-black text-white">Yakin ingin menyerah?</p>
            <p className="mt-1 text-xs text-white/60">
              Semua asetmu dikembalikan ke bank dan kamu keluar dari permainan.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25 active:scale-95 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  act({ type: "surrender" });
                  setConfirm(false);
                }}
                className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-500 active:scale-95 transition"
              >
                Menyerah
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
