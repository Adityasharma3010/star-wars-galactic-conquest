import { describe, it, expect } from 'vitest';
import { createGame, transition, incomeTax } from '../../src/game/engine/game.js';
import { boardFor, tokensFor } from '../../src/game/maps.js';
import { cardsFor } from '../../src/game/cards/decks.js';
const players = [
  { id: 'a', name: 'A', ai: false },
  { id: 'b', name: 'B', ai: false },
];
const roll = (game) => {
  let n = 0;
  return transition(
    game,
    { id: crypto.randomUUID(), type: 'ROLL', player: 'a', version: game.version, payload: {} },
    () => [0.01, 0.18][n++ % 2],
  );
};
describe('India map and fixed percentage tax', () => {
  it('has 22 distinct capitals, classic railways, tokens and both complete event decks', () => {
    const game = createGame(players, { mapId: 'india' }),
      board = boardFor(game),
      cities = board.filter((tile) => tile.type === 'property');
    expect(cities).toHaveLength(22);
    expect(new Set(cities.map((city) => city.name)).size).toBe(22);
    expect(board[0].name).toBe('GO');
    expect(board[4].name).toBe('Income Tax');
    expect(board[39].name).toBe('New Delhi');
    expect(tokensFor(game).map((token) => token.id)).toContain('pill-blue');
    expect(cardsFor(game)).toHaveLength(24);
    expect(cardsFor(game).some((card) => /force|rebel|imperial/i.test(card.title))).toBe(false);
  });
  it('charges 10% of cash, ignores legacy flat settings, and rounds up', () => {
    const game = createGame(players, { incomeTax: 1000 });
    game.players[0].credits = 1531;
    game.players[0].position = 1;
    game.ownership[39] = { owner: 'a', level: 5, mortgaged: false };
    expect(incomeTax(game, game.players[0])).toBe(154);
    expect(roll(game).players[0].credits).toBe(1377);
  });
  it('uses net worth only when custom wealth tax is selected and enters debt if cash is insufficient', () => {
    const game = createGame(players, { mapId: 'india', taxBasis: 'wealth' });
    game.players[0].position = 1;
    game.players[0].credits = 10;
    game.ownership[39] = { owner: 'a', level: 5, mortgaged: false };
    expect(incomeTax(game, game.players[0])).toBe(141);
    const next = roll(game);
    expect(next.debt).toMatchObject({ payer: 'a', amount: 131 });
  });
  it('applies the percentage on both maps while leaving Luxury Tax separate', () => {
    for (const mapId of ['india', 'galactic-conquest']) {
      const game = createGame(players, { mapId });
      game.players[0].position = 1;
      expect(roll(game).players[0].credits).toBe(1350);
    }
  });
});
