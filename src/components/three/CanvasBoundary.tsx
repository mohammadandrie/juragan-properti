"use client";

import { Component, ReactNode } from "react";

// Error boundary khusus board 3D: kalau WebGL/three.js gagal, tampilkan
// pesan + tombol reload, BUKAN layar putih kosong.
export default class CanvasBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; msg: string }
> {
  state = { failed: false, msg: "" };

  static getDerivedStateFromError(err: unknown) {
    return { failed: true, msg: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown) {
    console.error("[CanvasBoundary] board 3D crash:", err);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#060b14] p-6 text-center">
          <p className="text-lg font-semibold text-amber-300">Papan 3D gagal dimuat 😵</p>
          <p className="max-w-sm text-sm text-amber-200/60">
            WebGL kemungkinan tidak aktif / context hilang di browser ini.
          </p>
          <button
            onClick={() => this.setState({ failed: false, msg: "" })}
            className="rounded-xl bg-amber-400 px-5 py-2 font-semibold text-slate-900 hover:bg-amber-300"
          >
            Muat ulang papan
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
