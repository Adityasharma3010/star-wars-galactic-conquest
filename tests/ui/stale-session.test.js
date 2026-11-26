import { describe, it, expect } from 'vitest';
import {
  AWAY_SEAT_MS,
  ONLINE_STALE_MS,
  clearedSession,
  isStaleSession,
  pruneStaleSession,
} from '../../src/game/staleSession.js';

const game = { id: 'g1', phase: 'roll', players: [{}, {}], version: 4 };
const NOW = 1_000_000_000;

describe('stale saved sessions', () => {
  it('keeps a match that was left a moment ago so the player can rejoin', () => {
    const state = { game, online: true, matchAway: true, leftAt: NOW - 30_000 };
    expect(isStaleSession(state, NOW)).toBe(false);
  });
  it('drops a left match once the seat window has passed, even if the tab stayed open', () => {
    const state = { game, online: true, matchAway: true, leftAt: NOW - AWAY_SEAT_MS - 1 };
    expect(isStaleSession(state, NOW)).toBe(true);
  });
  it('drops left matches saved without a leave time (older versions)', () => {
    expect(isStaleSession({ game, online: true, matchAway: true }, NOW)).toBe(true);
  });
  it('uses the last server contact, not the last local save, for dropped connections', () => {
    const fresh = { game, online: true, sessionSeenAt: NOW - 60_000 };
    const old = { game, online: true, sessionSeenAt: NOW - ONLINE_STALE_MS - 1 };
    expect(isStaleSession(fresh, NOW)).toBe(false);
    expect(isStaleSession(old, NOW)).toBe(true);
  });
  it('never touches local games and clears every online field when pruning', () => {
    expect(isStaleSession({ game, online: false, matchAway: true }, NOW)).toBe(false);
    const pruned = pruneStaleSession(
      { game, online: true, matchAway: true, profile: { name: 'A' } },
      NOW,
    );
    expect(pruned).toMatchObject({ ...clearedSession(), profile: { name: 'A' } });
  });
});
