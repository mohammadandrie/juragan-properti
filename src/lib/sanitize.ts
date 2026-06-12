import { GameState, ClientGameState } from "./types";

export function sanitize(state: GameState, token: string | null): ClientGameState {
  const you = token ? state.players.find((p) => p.token === token)?.id ?? null : null;
  return {
    ...state,
    players: state.players.map(({ token: _token, ...rest }) => rest),
    you,
  };
}
