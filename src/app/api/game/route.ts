import { NextRequest, NextResponse } from "next/server";
import { newGame } from "@/lib/room";
import { saveGame, getGame } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 20);
  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  }

  for (let i = 0; i < 5; i++) {
    const state = newGame(name);
    if (await getGame(state.code)) continue;
    await saveGame(state);
    return NextResponse.json({ code: state.code, token: state.players[0].token });
  }
  return NextResponse.json({ error: "Gagal membuat room, coba lagi." }, { status: 500 });
}
