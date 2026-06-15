import { NextRequest, NextResponse } from "next/server";
import { getGame, saveGame } from "@/lib/store";
import { sanitize } from "@/lib/sanitize";
import { applyAction, settle, newPlayer } from "@/lib/room";
import { GameAction } from "@/lib/types";
import { BOT_PROFILES } from "@/lib/bots";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/game/[code]/action">) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const action = body.action as GameAction | undefined;

  if (!token || !action?.type) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const state = await getGame(code);
  if (!state) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  const player = state.players.find((p) => p.token === token);
  if (!player) {
    return NextResponse.json({ error: "Kamu bukan pemain di room ini." }, { status: 403 });
  }

  // input manusia nyata -> batalkan status AFK (bot berhenti mengambil alih)
  if (player.afk) player.afk = false;

  const err = applyAction(state, player, action);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  // addBot divalidasi engine; pembuatan pemainnya di sini
  if (action.type === "addBot") {
    const taken = state.players.filter((p) => p.bot).map((p) => p.bot);
    if (taken.includes(action.persona)) {
      return NextResponse.json({ error: `${BOT_PROFILES[action.persona].name} sudah ada di room.` }, { status: 400 });
    }
    const bot = newPlayer("", state.players.length, action.persona);
    state.players.push(bot);
    state.log.push(`🤖 ${bot.name} bergabung.`);
  }

  settle(state);
  await saveGame(state);
  return NextResponse.json(sanitize(state, token));
}
