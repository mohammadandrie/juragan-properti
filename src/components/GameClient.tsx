"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ClientGameState, GameAction } from "@/lib/types";
import PlayerPanel from "./hud/PlayerPanel";
import ActionPanel from "./hud/ActionPanel";
import PropertyInspector from "./hud/PropertyInspector";
import PropertyListPanel from "./hud/PropertyListPanel";
import QuizOverlay from "./hud/QuizOverlay";
import LobbyOverlay from "./hud/LobbyOverlay";
import { EventBanner, CardReveal } from "./hud/Banners";
import CanvasBoundary from "./three/CanvasBoundary";
import type { CameraMode } from "./three/CameraRig";
import { sfx, setMuted } from "@/lib/sfx";

const Board3D = dynamic(() => import("./three/Board3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0F172A] text-amber-300/80 animate-pulse">
      Menyiapkan papan…
    </div>
  ),
});

// Total jeda sebelum pion mulai jalan (selaras START_DELAY Pawn3D = 2.0s).
// Dadu spin ~1s + jeda baca angka ~1s. Karena handleDiceSettled dipanggil
// SETELAH dadu settle (~1s), maka holdUntil yang ditambahkan = sisa 1s.
const READ_MS = 1000;
function moveStepsMs(steps: number): number {
  return Math.min(Math.abs(steps), 12) * 300 + 600;
}
function totalMoveMs(steps: number): number {
  return READ_MS + moveStepsMs(steps);
}

export default function GameClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [mute, setMute] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("followPawn");
  const [focusTile, setFocusTile] = useState<number | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [highlightTiles, setHighlightTiles] = useState<number[]>([]);
  const [showPropList, setShowPropList] = useState(false);
  const prevCamRef = useRef<CameraMode>("followPawn");
  // Flow gating: dadu mengacak → settle → tampil angka → tahan → pion jalan
  const [diceReady, setDiceReady] = useState(false); // dadu sudah berhenti
  const [holdUntil, setHoldUntil] = useState(0); // angka ditampilkan sampai kapan
  const [moveUntil, setMoveUntil] = useState(0); // pion sedang berjalan sampai kapan
  const pendingMoveStepsRef = useRef(0); // langkah yg akan dijalanin (ref agar tak stale)
  // siapa yg sedang bergerak (untuk kamera & gate)
  const [movingPawnIsLocal, setMovingPawnIsLocal] = useState(false);
  const [, setNowTick] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const prevState = useRef<ClientGameState | null>(null);
  // Cache dadu saat animasi dimulai → gunakan di popup (hindari race condition)
  const displayDiceRef = useRef<[number, number] | null>(null);
  // Visual faces dari geometri dadu (bukan backend value)
  const [visualFaces, setVisualFaces] = useState<[number, number] | null>(null);

  // efek suara + deteksi gerak pion untuk gating
  useEffect(() => {
    const p = prevState.current;
    prevState.current = state;
    if (!state) return;
    // init cache saat state pertama load (user join mid-game)
    if (!p && state.lastDice) {
      displayDiceRef.current = state.lastDice;
    }
    if (!p || p.version >= state.version) return;
    if (JSON.stringify(p.lastDice) !== JSON.stringify(state.lastDice) && state.lastDice) {
      sfx.dice();
      displayDiceRef.current = state.lastDice; // cache dadu saat roll baru
      setVisualFaces(null); // reset visual faces, tunggu update dari geometri
      setDiceReady(false); // mulai animasi baru
      setHoldUntil(0);
    }
    if (state.lastCard && state.lastCard.at !== (p.lastCard?.at ?? 0)) sfx.card();
    if (state.lastEvent && state.lastEvent.at !== (p.lastEvent?.at ?? -1)) sfx.event();
    if (!p.quiz && state.quiz) sfx.quiz();
    if (!p.winner && state.winner) sfx.win();
    const meNow = state.players.find((x) => x.id === state.you);
    const meOld = p.players.find((x) => x.id === state.you);
    if (meNow && meOld) {
      if (meNow.money > meOld.money) sfx.cash();
      if (meNow.money < meOld.money) sfx.pay();
      if (!meOld.inJail && meNow.inJail) sfx.jail();
    }
    const wasMyTurn = p.players[p.currentPlayer]?.id === state.you;
    const isMyTurnNow = state.players[state.currentPlayer]?.id === state.you;
    if (!wasMyTurn && isMyTurnNow && state.phase === "playing") sfx.turn();
    
    // Reset animation gates saat currentPlayer berubah (fix: buttons gk terblokir saat takeover)
    if (p.currentPlayer !== state.currentPlayer) {
      setHoldUntil(0);
      setMoveUntil(0);
      setDiceReady(false);
      displayDiceRef.current = null; // Clear cache so animating = false
    }

    // pion berpindah → catat siapa & berapa langkah, tahan eksekusi pion-jalan
    let maxSteps = 0;
    let localMoved = false;
    for (const pl of state.players) {
      const old = p.players.find((q) => q.id === pl.id);
      if (old && old.pos !== pl.pos) {
        const steps = (pl.pos - old.pos + 40) % 40;
        if (steps > maxSteps) maxSteps = steps;
        if (pl.id === state.you) localMoved = true;
      }
    }
    if (maxSteps > 0) {
      pendingMoveStepsRef.current = maxSteps;
      setMovingPawnIsLocal(localMoved);
      // gerakan tanpa dadu baru (mis. dari kartu moveTo/moveBack):
      // langsung mulai animasi tanpa menunggu callback dadu.
      const diceChanged = JSON.stringify(p.lastDice) !== JSON.stringify(state.lastDice);
      if (!diceChanged) {
        const hold = Date.now() + READ_MS;
        setDiceReady(true);
        setHoldUntil(hold);
        setMoveUntil(hold + moveStepsMs(maxSteps));
      }
    }
  }, [state]);

  // dadu selesai → tampil angka, tahan READ_MS, lalu pion mulai jalan
  function handleDiceSettled() {
    setDiceReady(true);
    const steps = pendingMoveStepsRef.current;
    if (steps > 0) {
      const hold = Date.now() + READ_MS;
      setHoldUntil(hold);
      setMoveUntil(hold + moveStepsMs(steps));
    }
  }

  // tick re-render saat gate beralih fase
  useEffect(() => {
    const targets = [holdUntil, moveUntil].filter((t) => t > Date.now());
    if (targets.length === 0) return;
    const next = Math.min(...targets);
    const t = setTimeout(() => setNowTick((n) => n + 1), next - Date.now() + 30);
    return () => clearTimeout(t);
  }, [holdUntil, moveUntil]);

  const now = Date.now();
  const showingDiceNumber = diceReady; // angka tampil setelah dadu berhenti
  const inHold = diceReady && holdUntil > 0 && now < holdUntil; // jeda baca
  const inMove = moveUntil > now && holdUntil > 0 && now >= holdUntil;
  // selama hold/move/dadu masih spin: tahan reveal interaksi
  const animating =
    (state?.lastDice && !diceReady) || inHold || inMove;

  // jam mundur batas waktu + countdown giliran
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    tokenRef.current = localStorage.getItem(`jp:${code}`);
  }, [code]);

  // bersihkan fokus preview tile saat tak ada lagi keputusan sewa
  useEffect(() => {
    if (state && !state.pendingRent) setFocusTile(null);
  }, [state?.pendingRent]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const token = tokenRef.current;
    const res = await fetch(`/api/game/${code}${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) {
      const data: ClientGameState = await res.json();
      setState((prev) => (prev && prev.version > data.version ? prev : data));
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [refresh]);

  const me = useMemo(() => state?.players.find((p) => p.id === state.you) ?? null, [state]);
  const cur = state ? state.players[state.currentPlayer] : null;
  const myTurn = !!state && !!me && cur?.id === me.id && state.phase === "playing";

  async function act(action: GameAction) {
    setError("");
    const res = await fetch(`/api/game/${code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRef.current, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan.");
      setTimeout(() => setError(""), 3500);
      return;
    }
    setState(data);
  }

  function togglePropList() {
    if (showPropList) {
      setShowPropList(false);
      setHighlightTiles([]);
      setCameraMode(prevCamRef.current);
      // reset kamera ke posisi DEFAULT mode yang dikembalikan (bukan sisa
      // posisi user terakhir) — sesuai permintaan: tutup propertiku = papan
      // kelihatan utuh dari sudut default.
      setResetSignal((s) => s + 1);
    } else {
      prevCamRef.current = cameraMode;
      setShowPropList(true);
      setCameraMode("topDown");
    }
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4">
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-lg font-semibold text-red-300">
          Ruangan <span className="font-mono">{code}</span> tidak ditemukan atau kedaluwarsa.
        </p>
      </main>
    );
  }

  if (!state || !state.players.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <p className="text-xl font-semibold text-amber-300 animate-pulse">Memuat ruangan…</p>
      </main>
    );
  }

  const winner = state.winner ? state.players.find((p) => p.id === state.winner) : null;
  // Use visual faces if available (from geometry), else fall back to cached backend value
  const diceSum = visualFaces ? visualFaces[0] + visualFaces[1] : (displayDiceRef.current ? displayDiceRef.current[0] + displayDiceRef.current[1] : null);

  const remainMs = state.endsAt !== null ? Math.max(0, state.endsAt - clock) : null;
  const remainStr =
    remainMs !== null
      ? `${Math.floor(remainMs / 60000)}:${String(Math.floor((remainMs % 60000) / 1000)).padStart(2, "0")}`
      : null;
  const remainUrgent = remainMs !== null && remainMs <= 60_000;

  const turnSecsLeft =
    myTurn && state.canRoll && state.phaseDeadline !== null
      ? Math.max(0, Math.ceil((state.phaseDeadline - clock) / 1000))
      : null;

  const myTiles = me
    ? Object.entries(state.ownership)
        .filter(([, o]) => o.owner === me.id)
        .map(([id]) => Number(id))
    : [];

  // info penjara: kenapa? (deteksi dari log terakhir yang mengandung 'Penjara')
  const jailReason =
    me?.inJail
      ? state.log.slice().reverse().find((l) => l.includes(me.name) && l.includes("Penjara"))
      : null;

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0F172A]">
      {/* BOARD: isi penuh layar */}
      <section className="absolute inset-0">
        <CanvasBoundary>
          <Board3D
            state={state}
            highlightTiles={highlightTiles}
            onTileClick={(id) => setSelectedTile(id)}
            cameraMode={cameraMode}
            focusTile={focusTile}
            resetSignal={resetSignal}
            onDiceSettled={handleDiceSettled}
            movingPawnIsLocal={movingPawnIsLocal && inMove}
            destActive={showingDiceNumber && (inHold || inMove)}
            onVisualFaces={setVisualFaces}
          />
        </CanvasBoundary>
      </section>

      {/* KIRI ATAS: kartu pemain (tanpa kotak panel besar) */}
      <aside className="pointer-events-none absolute left-2 top-2 z-20 max-h-[calc(100vh-10rem)] w-60 overflow-y-auto">
        <div className="pointer-events-auto">
          <PlayerPanel state={state} act={act} />
        </div>
      </aside>

      {/* ATAS TENGAH: timer + angka dadu (diatur kolom vertikal agar tak bentrok) */}
      {state.phase === "playing" && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
          {remainStr && (
            <div
              className={`rounded-full px-5 py-2 text-xl font-black tabular-nums backdrop-blur ring-1 ${
                remainUrgent
                  ? "bg-rose-500/80 text-white ring-rose-300 animate-pulse"
                  : "bg-black/50 text-amber-300 ring-white/15"
              }`}
            >
              ⏱ {remainStr}
            </div>
          )}
          {/* angka dadu — muncul SETELAH dadu berhenti animasinya. Sum
              didesain sebagai box ke-3 berwarna emas, sejajar dengan kedua
              dadu, agar terlihat sebagai bagian dari hasil lemparan. */}
          {showingDiceNumber && diceSum !== null && displayDiceRef.current && (
            <div className="animate-[dropIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)] text-center">
              <div className="flex items-center justify-center gap-3">
                {displayDiceRef.current.map((d, i) => (
                  <span
                    key={i}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-900 shadow-xl ring-2 ring-amber-300"
                  >
                    {d}
                  </span>
                ))}
                <span className="text-2xl font-black text-white/50">=</span>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-3xl font-black text-amber-950 shadow-xl ring-2 ring-amber-300">
                  {diceSum}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* overlay di atas board */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <EventBanner state={state} />
        {!animating && <CardReveal state={state} />}

        {/* card properti kanan saat tile diklik */}
        {selectedTile !== null && (
          <div className="pointer-events-auto">
            <PropertyInspector
              state={state}
              selected={selectedTile}
              onClose={() => setSelectedTile(null)}
            />
          </div>
        )}

        {/* panel list propertiku */}
        {showPropList && me && (
          <div className="pointer-events-auto">
            <PropertyListPanel
              state={state}
              tiles={myTiles}
              highlightTiles={highlightTiles}
              onHover={(id) => setHighlightTiles(id === null ? [] : [id])}
              onClose={togglePropList}
            />
          </div>
        )}

        {/* kontrol kanan-atas: mode kamera + mute */}
        <div className="pointer-events-auto absolute right-2 top-2 z-30 flex gap-1">
          {(
            [
              ["overview", "🗺 Papan"],
              ["followPawn", "🎯 Pion"],
            ] as [CameraMode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setCameraMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold backdrop-blur ring-1 transition ${
                cameraMode === m
                  ? "bg-amber-400 text-amber-950 ring-amber-300"
                  : "bg-black/50 text-white ring-white/15 hover:bg-black/70"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              const m = !mute;
              setMute(m);
              setMuted(m);
            }}
            className="rounded-lg bg-black/50 px-3 py-1.5 text-base backdrop-blur ring-1 ring-white/15 hover:bg-black/70 transition"
          >
            {mute ? "🔇" : "🔊"}
          </button>
        </div>

        {/* layar menang */}
        {winner && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
            <p className="animate-[dropIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)] text-7xl">🏆</p>
            <p className="mt-3 text-5xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
              {winner.name} MENANG
            </p>
            <p className="mt-2 text-base text-white/70">
              {state.log.slice().reverse().find((l) => l.includes("menang") || l.includes("memenangkan")) ?? ""}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-lg font-black text-amber-950 shadow-lg hover:scale-105 active:scale-95 transition"
            >
              🏠 Kembali ke Beranda
            </button>
          </div>
        )}

        {/* error toast */}
        {error && (
          <p className="absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
            {error}
          </p>
        )}
      </div>

      {/* BAWAH: 2 baris — atas: transaksional, bawah: propertiku+emot persisten */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto">
          <ActionPanel
            state={state}
            myTurn={myTurn}
            me={me}
            act={act}
            onPreviewTile={setFocusTile}
            onSetHighlight={setHighlightTiles}
            animating={!!animating}
            turnSecsLeft={turnSecsLeft}
            onToggleProps={togglePropList}
            propsOpen={showPropList}
            setCameraMode={setCameraMode}
            jailReason={jailReason ?? null}
          />
        </div>
      </footer>

      {!animating && <QuizOverlay state={state} me={me} act={act} />}
      <LobbyOverlay state={state} me={me} act={act} code={code} />
    </main>
  );
}
