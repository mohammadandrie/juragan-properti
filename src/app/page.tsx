"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Terjadi kesalahan.");
    localStorage.setItem(`jp:${data.code}`, data.token);
    router.push(`/game/${data.code}`);
  }

  async function joinRoom() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/game/${code.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Terjadi kesalahan.");
    localStorage.setItem(`jp:${data.code}`, data.token);
    router.push(`/game/${data.code}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060b14] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.1),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(52,211,153,0.07),transparent_55%)] p-4">
      <div className="w-full max-w-md">
        <p className="text-center text-6xl">🏙️</p>
        <h1 className="mt-2 text-center text-5xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">JURAGAN</span>
        </h1>
        <h2 className="text-center text-3xl font-black tracking-[0.3em] text-emerald-400">PROPERTI</h2>
        <p className="mt-2 text-center text-xs text-white/50">
          Permainan papan strategi · 2–4 pemain · dukungan bot
        </p>

        <div className="mt-8 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Nama kamu…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold text-white placeholder:text-white/30 placeholder:font-normal focus:border-amber-400/60 focus:bg-white/10 outline-none transition"
          />

          <button
            onClick={createRoom}
            disabled={busy || !name.trim()}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-lg font-black text-amber-950 shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)] hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-40 disabled:hover:scale-100"
          >
            🎲 Buat Room
          </button>

          <div className="flex items-center gap-3 text-white/30 text-sm">
            <div className="h-px flex-1 bg-white/10" />
            atau gabung
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="KODE"
              className="w-32 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center font-mono text-lg font-black tracking-widest text-amber-300 placeholder:text-white/30 focus:border-amber-400/60 outline-none transition"
            />
            <button
              onClick={joinRoom}
              disabled={busy || !name.trim() || code.trim().length < 5}
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-black text-white shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)] hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-40 disabled:hover:scale-100"
            >
              Gabung
            </button>
          </div>

          {error && (
            <p className="rounded-2xl bg-red-500/15 px-4 py-2.5 text-center text-sm text-red-300 ring-1 ring-red-400/30">
              {error}
            </p>
          )}
        </div>

        <p className="mt-10 text-center text-[10px] text-white/30">
          Harga properti diurutkan berdasar UMR provinsi Indonesia.
        </p>
      </div>
    </main>
  );
}
