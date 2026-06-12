import { NextRequest, NextResponse } from "next/server";
import { getGame, saveGame } from "@/lib/store";
import { newPlayer } from "@/lib/room";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/game/[code]/join">) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 20);
  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  }

  const state = await getGame(code);
  if (!state) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  if (state.phase !== "lobby") {
    return NextResponse.json({ error: "Permainan sudah dimulai." }, { status: 400 });
  }
  if (state.players.length >= 4) {
    return NextResponse.json({ error: "Room penuh (maks 4 pemain)." }, { status: 400 });
  }
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Nama itu sudah dipakai di room ini." }, { status: 400 });
  }

  const player = newPlayer(name, state.players.length);
  state.players.push(player);
  state.log.push(`👋 ${player.name} bergabung.`);
  await saveGame(state);
  return NextResponse.json({ code: state.code, token: player.token });
}
