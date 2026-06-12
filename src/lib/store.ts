import { Redis } from "@upstash/redis";
import { GameState } from "./types";

// Produksi: Upstash Redis (via integrasi Vercel Marketplace).
// Development: penyimpanan in-memory (tidak persisten antar restart).
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const g = globalThis as unknown as { __games?: Map<string, GameState> };
if (!g.__games) g.__games = new Map();

const TTL_SECONDS = 60 * 60 * 24; // room kedaluwarsa 24 jam

export const usingRedis = redis !== null;

export async function getGame(code: string): Promise<GameState | null> {
  const key = code.toUpperCase();
  if (redis) {
    return (await redis.get<GameState>(`game:${key}`)) ?? null;
  }
  return g.__games!.get(key) ?? null;
}

export async function saveGame(state: GameState): Promise<void> {
  state.version++;
  state.updatedAt = Date.now();
  if (redis) {
    await redis.set(`game:${state.code}`, state, { ex: TTL_SECONDS });
    return;
  }
  g.__games!.set(state.code, state);
}
