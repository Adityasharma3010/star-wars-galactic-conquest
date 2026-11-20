import { describe, it, expect } from 'vitest';
import { restoreSession } from '../../src/game/restoreSession.js';
import { createGame } from '../../src/game/engine/game.js';
const players = [
  { id: 'you', ai: false },
  { id: 'player-1', ai: true },
];
describe('startup session restoration', () => {
  it('has an empty welcome session on a fresh visit', () => {
    expect(restoreSession({}, {})).toMatchObject({ game: null, playing: false });
  });
  it('discards the old unplayed preview while retaining profile and settings', () => {
    const game = createGame([
      { id: 'you' },
      ...['ai-vader', 'ai-leia', 'ai-han'].map((id) => ({ id, ai: true })),
    ]);
    const restored = restoreSession(
      { game, profile: { name: 'Sky Pilot' }, settings: { accent: '#97ccad' } },
      {},
    );
    expect(restored).toMatchObject({
      game: null,
      playing: false,
      profile: { name: 'Sky Pilot' },
      settings: { accent: '#97ccad' },
    });
  });
  it('retains real local saves for an explicit resume', () => {
    const game = createGame(players);
    game.version = 3;
    const restored = restoreSession({ game, online: false }, {});
    expect(restored.game).toBe(game);
    expect(restored.playing).toBe(false);
  });
  it('recovers active online matches but leaves reserved and completed ones on the menu', () => {
    const game = createGame(players);
    expect(restoreSession({ game, online: true }, {}).playing).toBe(true);
    expect(restoreSession({ game, online: true, matchAway: true }, {}).playing).toBe(false);
    game.phase = 'finished';
    expect(restoreSession({ game, online: true }, {}).playing).toBe(false);
  });
});
