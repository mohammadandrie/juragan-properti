import { NextRequest, NextResponse } from "next/server";
import { getGame, saveGame } from "@/lib/store";
import { sanitize } from "@/lib/sanitize";
import { settle } from "@/lib/room";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/game/[code]">) {
  const { code } = await ctx.params;
  const state = await getGame(code);
  if (!state) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  // polling juga menjadi "tick" untuk bot & timer lelang/kuis
  const snapshot = JSON.stringify({ ...state, updatedAt: 0 });
  settle(state);
  if (JSON.stringify({ ...state, updatedAt: 0 }) !== snapshot) {
    await saveGame(state);
  }
  const token = req.nextUrl.searchParams.get("token");
  return NextResponse.json(sanitize(state, token));
}
