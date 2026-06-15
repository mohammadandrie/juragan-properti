"use client";

import { PawnKind } from "@/lib/types";

// Avatar kartun low-poly bergaya CSS/SVG. Tema "juragan properti" Indonesia:
// pengusaha, juragan, developer, kontraktor. Dipetakan dari PawnKind agar tiap
// pemain konsisten dengan pionnya. Tanpa aset eksternal, ringan.

export type AvatarTheme = "pengusaha" | "juragan" | "developer" | "kontraktor" | "ibu" | "ojek";

const PAWN_THEME: Record<PawnKind, AvatarTheme> = {
  default: "pengusaha",
  komodo: "juragan",
  pinisi: "ibu",
  garuda: "developer",
  bajaj: "ojek",
  ojek: "kontraktor",
};

// elemen tambahan per tema (topi/atribut)
function ThemeProps({ theme, color }: { theme: AvatarTheme; color: string }) {
  switch (theme) {
    case "kontraktor": // helm proyek kuning
      return (
        <>
          <path d="M16 17 Q32 6 48 17 L48 20 L16 20 Z" fill="#f59e0b" />
          <rect x="14" y="19" width="36" height="3" rx="1.5" fill="#d97706" />
          <rect x="30" y="8" width="4" height="6" rx="1" fill="#d97706" />
        </>
      );
    case "developer": // helm + dasi
      return (
        <>
          <path d="M17 18 Q32 8 47 18 L47 21 L17 21 Z" fill="#38bdf8" />
          <rect x="15" y="20" width="34" height="3" rx="1.5" fill="#0ea5e9" />
        </>
      );
    case "juragan": // peci hitam
      return <path d="M18 18 Q32 9 46 18 L46 20 L18 20 Z" fill="#1e293b" />;
    case "ibu": // kerudung
      return (
        <path
          d="M14 30 Q14 12 32 12 Q50 12 50 30 L50 40 Q44 30 32 30 Q20 30 14 40 Z"
          fill={color}
          opacity={0.9}
        />
      );
    case "ojek": // helm full
      return (
        <>
          <path d="M16 28 Q16 12 32 12 Q48 12 48 28 L48 30 L16 30 Z" fill="#16a34a" />
          <rect x="20" y="24" width="24" height="6" rx="2" fill="#0f172a" opacity={0.6} />
        </>
      );
    case "pengusaha": // rambut klimis + dasi
    default:
      return <path d="M18 20 Q32 10 46 20 L46 23 Q32 16 18 23 Z" fill="#334155" />;
  }
}

export default function Avatar({
  pawn,
  color,
  size = 56,
  className = "",
}: {
  pawn: PawnKind;
  color: string;
  size?: number;
  className?: string;
}) {
  const theme = PAWN_THEME[pawn] ?? "pengusaha";
  const showFace = theme !== "ibu" && theme !== "ojek";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={{ display: "block" }}
      aria-hidden
    >
      {/* lingkar latar */}
      <circle cx="32" cy="32" r="31" fill={`${color}22`} stroke={`${color}aa`} strokeWidth="2" />
      {/* badan/bahu */}
      <path d="M14 60 Q14 44 32 44 Q50 44 50 60 Z" fill={color} />
      {/* leher */}
      <rect x="28" y="38" width="8" height="8" rx="3" fill="#f1c9a5" />
      {/* kepala */}
      {showFace && <circle cx="32" cy="30" r="13" fill="#f6d5b5" />}
      {showFace && (
        <>
          {/* mata */}
          <circle cx="27" cy="30" r="1.8" fill="#1e293b" />
          <circle cx="37" cy="30" r="1.8" fill="#1e293b" />
          {/* senyum */}
          <path d="M27 35 Q32 39 37 35" stroke="#9a5b3b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* atribut tema */}
      <ThemeProps theme={theme} color={color} />
      {/* dasi untuk pengusaha/developer/juragan */}
      {(theme === "pengusaha" || theme === "developer" || theme === "juragan") && (
        <path d="M32 44 L29 50 L32 58 L35 50 Z" fill="#dc2626" />
      )}
    </svg>
  );
}
