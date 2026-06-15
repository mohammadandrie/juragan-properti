"use client";

import { useEffect, useRef, useState } from "react";

// Log game sebagai teks mengambang yang fade-out, bukan kotak scroll.
export default function FloatingLog({ log }: { log: string[] }) {
  const [visible, setVisible] = useState<{ key: number; text: string }[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const latest = log[log.length - 1];
    if (!latest) return;
    counter.current += 1;
    const key = counter.current;
    setVisible((v) => [...v.slice(-3), { key, text: latest }]);
    const t = setTimeout(() => {
      setVisible((v) => v.filter((x) => x.key !== key));
    }, 5000);
    return () => clearTimeout(t);
  }, [log.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-1 px-4">
      {visible.map((v) => (
        <p
          key={v.key}
          className="animate-[fadeSlide_5s_ease-out_forwards] rounded-full bg-black/40 px-4 py-1 text-center text-[11px] sm:text-xs font-medium text-white/90 backdrop-blur-sm"
        >
          {v.text}
        </p>
      ))}
    </div>
  );
}
