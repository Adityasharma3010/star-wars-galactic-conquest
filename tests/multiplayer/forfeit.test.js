import { it, expect } from 'vitest';
import { createGame, transition } from '../../src/game/engine/game.js';
const fixture = () =>
  createGame([
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ]);
const remove = (game, players) =>
  transition(game, {
    id: crypto.randomUUID(),
    type: 'FORFEIT',
    connectionTimeout: true,
    player: players[0],
    payload: { players },
    version: game.version,
  });
it('removes expired off-turn seats, returns their assets and cards, and awards the sole survivor', () => {
  const game = fixture();
  game.ownership[1] = { owner: 'b', level: 2, mortgaged: false };
  game.players[1].cards = ['f4'];
  const next = remove(game, ['b', 'c']);
  expect(next.players[1]).toMatchObject({ bankrupt: true, forfeited: true, credits: 0 });
  expect(next.ownership[1]).toBeUndefined();
  expect(next.inventory.outposts).toBe(game.inventory.outposts + 2);
  expect(next.discards.force).toContain('f4');
  expect(next.winner).toBe('a');
  expect(next.phase).toBe('finished');
  expect(next.players[1].ai).not.toBe(true);
});
it('ends without inventing a winner when all players expire together', () => {
  const next = remove(fixture(), ['a', 'b', 'c']);
  expect(next.phase).toBe('finished');
  expect(next.winner).toBeNull();
});
it('advances the turn when the active seat expires and preserves active opponents', () => {
  const next = remove(fixture(), ['a']);
  expect(next.phase).toBe('roll');
  expect(next.players[next.turn].id).toBe('b');
  expect(next.players[1].bankrupt).toBe(false);
});
it('clears a departed debtor and cancels their outstanding trades', () => {
  const game = fixture();
  game.phase = 'debt';
  game.debt = { payer: 'b', creditor: 'a', amount: 99, resume: 'end' };
  game.trades = [{ from: 'b', to: 'a', status: 'pending' }];
  const next = remove(game, ['b']);
  expect(next.debt).toBeNull();
  expect(next.trades[0].status).toBe('cancelled');
});
it('rejects forfeiture without the internal timeout marker and never removes initial AI opponents', () => {
  const game = fixture();
  expect(() => transition(game, { id: 'bad', type: 'FORFEIT', player: 'b' })).toThrow();
  game.players[1].ai = true;
  expect(() => remove(game, ['b'])).toThrow();
});

it('closes an auction safely when its highest bidder expires after the others passed', () => {
  const game = fixture();
  game.phase = 'auction';
  game.pendingProperty = 1;
  game.auction = {
    property: 1,
    bid: 50,
    bidder: 'b',
    passed: ['a', 'c'],
    closesAt: Date.now() + 10000,
  };
  const next = remove(game, ['b']);
  expect(next.auction).toBeNull();
  expect(next.pendingProperty).toBeNull();
  expect(next.ownership[1]).toBeUndefined();
  expect(next.phase).toBe('end');
  expect(next.players[0].credits).toBe(game.players[0].credits);
});
