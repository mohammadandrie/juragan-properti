"use client";

import { useEffect, useRef, useState } from "react";

// Angka yang beranimasi count-up/down; hijau saat naik, merah saat turun.
export default function MoneyCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (display === value) return;
    setFlash(value > display ? "up" : "down");
    const from = display;
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const k = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (value - from) * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else setTimeout(() => setFlash(null), 400);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt =
    Math.abs(display) >= 1000
      ? `Rp ${(display / 1000).toFixed(display % 1000 === 0 ? 0 : 2).replace(".", ",")} M`
      : `Rp ${display}jt`;

  return (
    <span
      className={`tabular-nums transition-colors duration-300 ${
        flash === "up" ? "text-emerald-300" : flash === "down" ? "text-rose-400" : ""
      } ${className ?? ""}`}
    >
      {fmt}
    </span>
  );
}
