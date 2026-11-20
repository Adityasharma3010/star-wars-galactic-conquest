import { describe, it, expect } from 'vitest';
import { createGame, transition, ownsGroup } from '../../src/game/engine/game.js';
import { timeoutAction } from '../../src/game/engine/timeouts.js';
import { BOARD } from '../../src/game/rules/data.js';
import { CARDS } from '../../src/game/cards/decks.js';
const players = [
  { id: 'a', name: 'A', team: 'Rebels' },
  { id: 'b', name: 'B', team: 'Empire' },
  { id: 'c', name: 'C', team: 'Rebels' },
];
const act = (s, type, payload = {}, player = 'a', now = 100) =>
  transition(
    s,
    { id: crypto.randomUUID(), type, payload, player, now, version: s.version },
    () => 0.3,
  );
describe('timers, teams and counteroffers', () => {
  it('creates a recipient counteroffer atomically and revalidates assets', () => {
    let s = createGame(players);
    s.ownership[1] = { owner: 'a', level: 0, mortgaged: false };
    s = act(s, 'TRADE_OFFER', { to: 'b', give: [1], requestCash: 60 });
    const original = s.trades[0].id;
    s = act(s, 'TRADE_COUNTER', { trade: original, take: [1], cash: 40 }, 'b');
    expect(s.trades[0].status).toBe('countered');
    expect(s.trades[1]).toMatchObject({
      from: 'b',
      to: 'a',
      cash: 40,
      take: [1],
      status: 'pending',
    });
    s = act(s, 'TRADE_ACCEPT', { trade: s.trades[1].id });
    expect(s.ownership[1].owner).toBe('b');
    expect(s.players[0].credits).toBe(1540);
    expect(s.players[1].credits).toBe(1460);
  });
  it('preserves the original offer when a counteroffer is invalid', () => {
    let s = createGame(players);
    s = act(s, 'TRADE_OFFER', { to: 'b', cash: 10 });
    expect(() => act(s, 'TRADE_COUNTER', { trade: s.trades[0].id, cash: -5 }, 'b')).toThrow();
    expect(s.trades[0].status).toBe('pending');
  });
  it('closes auctions after timeout and extends the deadline on bids', () => {
    let s = createGame(players);
    s.phase = 'purchase';
    s.pendingProperty = 1;
    s = act(s, 'DECLINE');
    const first = s.auction.deadline;
    s = act(s, 'BID', { amount: 10 }, 'a', 1000);
    expect(s.auction.deadline).toBe(11000);
    expect(s.auction.deadline - first).toBeLessThan(0);
    expect(timeoutAction(s, 1000)).toBeNull();
    while (s.auction) {
      const a = timeoutAction(s, 32000);
      s = act(s, a.type, a.payload, a.player, 32000);
    }
    expect(s.ownership[1].owner).toBe('a');
    expect(s.players[0].credits).toBe(1490);
  });
  it('rejects late bids before timeout processing', () => {
    let s = createGame(players);
    s.phase = 'purchase';
    s.pendingProperty = 1;
    s = act(s, 'DECLINE');
    expect(() => act(s, 'BID', { amount: 20 }, 'b', 40000)).toThrow('closed');
  });
  it('never advances a connected or local player through an ordinary turn timer', () => {
    let s = createGame(players, { now: 1000 });
    s.turnDeadline = 2000;
    for (const phase of ['roll', 'purchase', 'end', 'debt']) {
      s.phase = phase;
      expect(timeoutAction(s, 600000)).toBeNull();
    }
    s.phase = 'end';
    s = act(s, 'END', {}, 'a', 32000);
    expect(s.turn).toBe(1);
    expect(s.turnDeadline).toBeNull();
  });
  it('can complete a color group through optional shared team ownership', () => {
    const s = createGame(players, { teams: true, sharedProperties: true });
    s.ownership[1] = { owner: 'a', level: 0, mortgaged: false };
    s.ownership[3] = { owner: 'c', level: 0, mortgaged: false };
    expect(ownsGroup(s, s.players[0], BOARD[1])).toBe(true);
    const developed = act(s, 'BUILD', { property: 1 });
    expect(developed.ownership[1].level).toBe(1);
    s.rules.sharedProperties = false;
    expect(ownsGroup(s, s.players[0], BOARD[1])).toBe(false);
  });
  it('finishes a limited team match using combined wealth while classic stays open', () => {
    let s = createGame(players, { teams: true, roundLimit: 5 });
    s.round = 5;
    s.turn = 2;
    s.phase = 'end';
    s.players[1].credits = 2500;
    s = act(s, 'END', {}, 'c');
    expect(s.phase).toBe('finished');
    expect(s.winningTeam).toBe('Rebels');
    expect(s.round).toBe(5);
    const classic = createGame(players);
    classic.round = 5;
    classic.turn = 2;
    classic.phase = 'end';
    expect(act(classic, 'END', {}, 'c').phase).toBe('roll');
  });
  it('respects disabled mortgages in the rules and AI debt policy', () => {
    const s = createGame(players, { mortgages: false });
    s.ownership[1] = { owner: 'a', level: 0, mortgaged: false };
    expect(() => act(s, 'MORTGAGE', { property: 1 })).toThrow('disabled');
  });
  it('keeps the dice and card movement in one continuous animation route', () => {
    const s = createGame(players);
    s.decks.force = [CARDS.find((c) => c.deck === 'force' && c.effect === 'move').id];
    s.players[0].position = 4;
    let roll = 0;
    const next = transition(
      s,
      { id: crypto.randomUUID(), type: 'ROLL', player: 'a', version: 0, now: 1000, payload: {} },
      () => [0.01, 0.18][roll++ % 2],
    );
    expect(next.movement.from).toBe(4);
    expect(next.movement.path.slice(0, 3)).toEqual([5, 6, 7]);
    expect(next.movement.path.length).toBeGreaterThan(3);
    expect(next.movement.path.at(-1)).toBe(next.players[0].position);
    expect(next.movement.steps).toBe(next.movement.path.length);
  });
  it('rejects invalid local custom rules before they can create broken balances or clocks', () => {
    for (const rules of [
      { startBonus: -100 },
      { incomeTax: 2.5 },
      { outposts: -1 },
      { teams: 'yes' },
    ])
      expect(() => createGame(players, rules)).toThrow();
  });
});
