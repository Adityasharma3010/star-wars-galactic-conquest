/**
 * Saved-session hygiene (frontend only).
 *
 * The browser keeps the last match so a player can come back to it. For an online match that is only
 * useful while the server still holds the seat: two minutes after leaving on purpose, five after a
 * dropped connection. After that the match has moved on without us, so offering "Resume" just leads
 * to a dead end.
 *
 *  - `leftAt` is when the player pressed Leave / went home (set only while `matchAway`).
 *  - `sessionSeenAt` is the last time the server answered us (heartbeat, snapshot or a new state).
 *    It must NOT be refreshed by ordinary local saves, or an old session would never look old.
 */
export const AWAY_SEAT_MS = 2 * 60 * 1000 + 20 * 1000;
export const ONLINE_STALE_MS = 6 * 60 * 1000;
export const FINISHED_STALE_MS = 12 * 60 * 60 * 1000;

export function isStaleSession(state, now = Date.now()) {
  if (!state?.game || !state.online) return false;
  if (state.matchAway) {
    const left = Number(state.leftAt) || 0;
    // Saved by an older version (no leave time): the seat is long gone.
    return !left || now - left > AWAY_SEAT_MS;
  }
  const seen = Number(state.sessionSeenAt) || 0;
  if (!seen) return false;
  const limit = state.game.phase === 'finished' ? FINISHED_STALE_MS : ONLINE_STALE_MS;
  return now - seen > limit;
}

export const clearedSession = () => ({
  game: null,
  playing: false,
  online: false,
  matchAway: false,
  leftAt: null,
  sessionSeenAt: 0,
  onlinePlayer: null,
  onlineRole: 'player',
  connections: {},
  eventQueue: [],
  observedEvent: null,
  messages: [],
  intro: null,
  modal: null,
  staging: false,
  stagedFinal: null,
});

export function pruneStaleSession(state, now = Date.now()) {
  return isStaleSession(state, now) ? { ...state, ...clearedSession() } : state;
}
