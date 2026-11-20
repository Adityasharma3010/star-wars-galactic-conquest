import { describe, it, expect } from 'vitest';
import { createGame, transition, rent, wealth } from '../../src/game/engine/game.js';
import { BOARD } from '../../src/game/rules/data.js';
import { CARDS } from '../../src/game/cards/decks.js';
import { seededRandom } from '../../src/game/engine/random.js';
import { chooseAction } from '../../src/game/ai/commander.js';
const players = [
  { id: 'a', name: 'Luke', ai: false },
  { id: 'b', name: 'Vader', ai: true, difficulty: 'expert' },
  { id: 'c', name: 'Leia', ai: true, difficulty: 'hard' },
];
const game = () => createGame(players, {}, seededRandom(14));
let seq = 0;
const act = (s, type, payload = {}, player = s.players[s.turn].id, rng = seededRandom(2)) =>
  transition(s, { id: `test-${++seq}`, type, payload, player, version: s.version }, rng);
const roll = (s, d1, d2) => {
  let i = 0;
  return act(s, 'ROLL', {}, undefined, () => ([d1, d2][i++ % 2] - 1) / 6 + 0.01);
};
const end = (s) => act(s, 'END');
const owned = (s, id, owner = 'a', level = 0, mortgaged = false) => {
  s.ownership[id] = { owner, level, mortgaged };
};
describe('board & setup', () => {
  it('has exactly the required 40 spaces', () => {
    expect(BOARD).toHaveLength(40);
    for (const [type, n] of [
      ['property', 22],
      ['transport', 4],
      ['utility', 2],
      ['force', 3],
      ['galactic', 3],
      ['tax', 2],
    ])
      expect(BOARD.filter((t) => t.type === type)).toHaveLength(n);
    expect(new Set(BOARD.map((t) => t.id)).size).toBe(40);
    expect(new Set(BOARD.filter((t) => t.group).map((t) => t.group)).size).toBe(8);
  });
  it('starts with 1500 and keeps transitions immutable', () => {
    const s = game(),
      n = roll(s, 1, 2);
    expect(s.players[0].position).toBe(0);
    expect(n.players[0].position).toBe(3);
    expect(s.players[0].credits).toBe(1500);
  });
  it('enforces turn ownership and stale versions', () => {
    const s = game();
    expect(() => act(s, 'ROLL', {}, 'b')).toThrow('not your turn');
    expect(() => transition(s, { id: 'x', type: 'ROLL', player: 'a', version: 99 })).toThrow(
      'state changed',
    );
  });
  it('makes action IDs idempotent', () => {
    const s = game(),
      a = { id: 'same', type: 'ROLL', player: 'a' },
      n = transition(s, a, seededRandom(4));
    expect(transition(n, a)).toBe(n);
  });
});
describe('dice, movement & detention', () => {
  it('awards starting bonus on crossing', () => {
    const s = game();
    s.players[0].position = 38;
    const n = roll(s, 2, 3);
    expect(n.players[0].credits).toBeGreaterThanOrEqual(1700);
  });
  it('awards extra turn for doubles', () => {
    const s = game();
    s.players[0].position = 18;
    const n = end(roll(s, 1, 1));
    expect(n.turn).toBe(0);
    expect(n.phase).toBe('roll');
  });
  it('sends three consecutive doubles to detention', () => {
    let s = game();
    s.players[0].position = 18;
    s = end(roll(s, 1, 1));
    s = roll(s, 1, 1);
    if (s.phase === 'purchase') s = act(s, 'BUY');
    s = end(s);
    s = roll(s, 1, 1);
    expect(s.players[0].detained).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.extraTurn).toBe(false);
  });
  it('distinguishes visiting from detention', () => {
    let s = game();
    s.players[0].position = 7;
    s = roll(s, 1, 2);
    expect(s.players[0].detained).toBe(false);
    s.phase = 'roll';
    s.players[0].position = 27;
    s = roll(s, 1, 2);
    expect(s.players[0].detained).toBe(true);
  });
  it('releases on doubles without extra roll', () => {
    const s = game();
    s.players[0].position = 10;
    s.players[0].detained = true;
    const n = roll(s, 2, 2);
    expect(n.players[0].detained).toBe(false);
    expect(n.players[0].position).toBe(14);
    expect(n.extraTurn).toBe(false);
  });
  it('moves after the third failed detention roll', () => {
    const s = game();
    s.players[0].position = 10;
    s.players[0].detained = true;
    s.players[0].jailAttempts = 2;
    const n = roll(s, 1, 2);
    expect(n.players[0].detained).toBe(false);
    expect(n.players[0].credits).toBe(1450);
    expect(n.players[0].position).toBe(13);
  });
  it('redeems an escape card and returns it to the discard', () => {
    const s = game();
    s.players[0].detained = true;
    s.players[0].cards = ['f4'];
    const n = act(s, 'RELEASE', { card: 'f4' });
    expect(n.players[0].cards).toHaveLength(0);
    expect(n.discards.force).toContain('f4');
  });
});
describe('economy', () => {
  it('purchases atomically and updates ownership', () => {
    const n = act(roll(game(), 1, 2), 'BUY');
    expect(n.ownership[3].owner).toBe('a');
    expect(n.players[0].credits).toBe(1440);
    expect(n.phase).toBe('end');
  });
  it('rejects unaffordable purchases', () => {
    const s = game();
    s.players[0].credits = 10;
    expect(() => act(roll(s, 1, 2), 'BUY')).toThrow('Not enough');
  });
  it('collects rent from the visiting player', () => {
    const s = game();
    owned(s, 3, 'b');
    const n = roll(s, 1, 2);
    expect(n.players[0].credits).toBe(1496);
    expect(n.players[1].credits).toBe(1504);
  });
  it('doubles full group undeveloped rent', () => {
    const s = game();
    owned(s, 1, 'b');
    owned(s, 3, 'b');
    expect(rent(s, BOARD[3])).toBe(8);
  });
  it('uses transport and dice based utility rent', () => {
    const s = game();
    owned(s, 5);
    owned(s, 15);
    expect(rent(s, BOARD[5])).toBe(50);
    owned(s, 12);
    expect(rent(s, BOARD[12], 9)).toBe(36);
    owned(s, 28);
    expect(rent(s, BOARD[12], 9)).toBe(90);
  });
  it('charges taxes and supports the Free Orbit house rule', () => {
    const s = game();
    s.rules.freeParking = true;
    s.players[0].position = 1;
    const n = roll(s, 1, 2);
    expect(n.players[0].credits).toBe(1300);
    expect(n.pot).toBe(200);
    n.phase = 'roll';
    n.players[0].position = 17;
    const after = roll(n, 1, 2);
    expect(after.pot).toBe(0);
    expect(after.players[0].credits).toBe(1500);
  });
  it('prevents teammate rent', () => {
    const s = game();
    s.rules.teams = true;
    s.players[0].team = 'Rebels';
    s.players[1].team = 'Rebels';
    owned(s, 3, 'b');
    expect(roll(s, 1, 2).players[0].credits).toBe(1500);
  });
  it('requires complete groups and even development', () => {
    let s = game();
    owned(s, 1);
    expect(() => act(s, 'BUILD', { property: 1 })).toThrow('complete');
    owned(s, 3);
    s = act(s, 'BUILD', { property: 1 });
    expect(s.ownership[1].level).toBe(1);
    expect(() => act(s, 'BUILD', { property: 1 })).toThrow('evenly');
    s = act(s, 'BUILD', { property: 3 });
    expect(s.inventory.outposts).toBe(30);
  });
  it('upgrades a planetary base and returns four outposts', () => {
    const s = game();
    owned(s, 1, 'a', 4);
    owned(s, 3, 'a', 4);
    s.inventory.outposts = 24;
    const n = act(s, 'BUILD', { property: 1 });
    expect(n.ownership[1].level).toBe(5);
    expect(n.inventory.outposts).toBe(28);
    expect(n.inventory.bases).toBe(11);
    expect(rent(n, BOARD[1])).toBe(250);
  });
  it('enforces bank inventory limits', () => {
    const s = game();
    owned(s, 1);
    owned(s, 3);
    s.inventory.outposts = 0;
    expect(() => act(s, 'BUILD', { property: 1 })).toThrow('No outposts');
  });
  it('mortgages and redeems with interest, suspending rent', () => {
    const s = game();
    owned(s, 3);
    const n = act(s, 'MORTGAGE', { property: 3 });
    expect(n.players[0].credits).toBe(1530);
    expect(rent(n, BOARD[3])).toBe(0);
    const r = act(n, 'UNMORTGAGE', { property: 3 });
    expect(r.players[0].credits).toBe(1497);
  });
  it('prevents mortgaging developed groups', () => {
    const s = game();
    owned(s, 1, 'a', 1);
    owned(s, 3);
    expect(() => act(s, 'MORTGAGE', { property: 3 })).toThrow('Sell all');
  });
  it('resells developments for half price', () => {
    const s = game();
    owned(s, 1, 'a', 1);
    owned(s, 3, 'a', 1);
    const n = act(s, 'SELL', { property: 1 });
    expect(n.players[0].credits).toBe(1525);
    expect(n.ownership[1].level).toBe(0);
  });
});
describe('auctions & trades', () => {
  it('opens an auction and assigns property to the final bidder', () => {
    let s = act(roll(game(), 1, 2), 'DECLINE');
    s = act(s, 'BID', { amount: 50 }, 'b');
    expect(() => act(s, 'BID', { amount: 51 }, 'a')).toThrow('increase by 10');
    s = act(s, 'PASS', {}, 'a');
    s = act(s, 'PASS', {}, 'c');
    expect(s.phase).toBe('end');
    expect(s.ownership[3].owner).toBe('b');
    expect(s.players[1].credits).toBe(1450);
  });
  it('keeps property with bank when all pass', () => {
    let s = act(roll(game(), 1, 2), 'DECLINE');
    for (const p of players) s = act(s, 'PASS', {}, p.id);
    expect(s.auction).toBe(null);
    expect(s.ownership[3]).toBeUndefined();
  });
  it('completes a trade once, with validated cash and cards', () => {
    let s = game();
    owned(s, 1);
    owned(s, 3, 'b');
    s.players[0].cards = ['f4'];
    s = act(s, 'TRADE_OFFER', { to: 'b', give: [1], take: [3], cash: 50, giveCards: ['f4'] });
    const id = s.trades[0].id;
    s = act(s, 'TRADE_ACCEPT', { trade: id }, 'b');
    expect(s.ownership[1].owner).toBe('b');
    expect(s.ownership[3].owner).toBe('a');
    expect(s.players[1].cards).toContain('f4');
    expect(s.players[0].credits).toBe(1450);
    expect(() => act(s, 'TRADE_ACCEPT', { trade: id }, 'b')).toThrow('no longer');
  });
  it('rejects trading another player’s property and negative cash', () => {
    const s = game();
    owned(s, 1, 'b');
    expect(() => act(s, 'TRADE_OFFER', { to: 'b', give: [1] })).toThrow('no longer owned');
    expect(() => act(s, 'TRADE_OFFER', { to: 'b', cash: -50 })).toThrow('positive');
  });
  it('revalidates traded assets after an offer', () => {
    let s = game();
    owned(s, 1);
    s = act(s, 'TRADE_OFFER', { to: 'b', give: [1] });
    s.ownership[1].owner = 'c';
    expect(() => act(s, 'TRADE_ACCEPT', { trade: s.trades[0].id }, 'b')).toThrow('no longer owned');
  });
});
describe('cards, debt & victory', () => {
  it('has real functional effects for every card', () => {
    expect(CARDS).toHaveLength(24);
    for (const c of CARDS) {
      let s = game();
      const location = c.deck === 'force' ? 7 : 2;
      s.players[0].position = location - 3;
      s.decks[c.deck] = [c.id];
      const n = roll(s, 1, 2);
      expect(n.events.some((e) => e.text.includes(c.title))).toBe(true);
      expect(n.phase).not.toBe('roll');
    }
  });
  it('retains escape cards and draws other cards without replacement', () => {
    const s = game();
    s.players[0].position = 4;
    s.decks.force = ['f4', 'f1'];
    const n = roll(s, 1, 2);
    expect(n.players[0].cards).toContain('f4');
    expect(n.decks.force).toEqual(['f1']);
    expect(n.discards.force).not.toContain('f4');
  });
  it('creates payable debt without negative balances', () => {
    const s = game();
    s.players[0].credits = 1;
    owned(s, 3, 'b');
    owned(s, 1);
    const n = roll(s, 1, 2);
    expect(n.phase).toBe('debt');
    expect(n.debt.amount).toBe(3);
    expect(n.players[0].credits).toBe(0);
    const m = act(n, 'MORTGAGE', { property: 1 });
    const r = act(m, 'SETTLE');
    expect(r.debt).toBeNull();
    expect(r.phase).toBe('end');
    expect(r.players[0].credits).toBe(27);
  });
  it('transfers assets to creditor and determines victory', () => {
    let s = createGame(players.slice(0, 2), {}, seededRandom(4));
    s.players[0].credits = 0;
    owned(s, 3, 'b');
    owned(s, 1);
    s = roll(s, 1, 2);
    s = act(s, 'BANKRUPT');
    expect(s.players[0].bankrupt).toBe(true);
    expect(s.ownership[1].owner).toBe('b');
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('b');
  });
  it('allows a non-active debtor to settle a collect-from-all card', () => {
    const s = game();
    s.players[0].position = 4;
    s.decks.force = ['f11'];
    s.players[1].credits = 0;
    owned(s, 39, 'b');
    let n = roll(s, 1, 2);
    expect(n.debt.payer).toBe('b');
    n = act(n, 'MORTGAGE', { property: 39 }, 'b');
    n = act(n, 'SETTLE', {}, 'b');
    expect(n.debt).toBeNull();
    expect(n.players[0].credits).toBe(1600);
  });
});
describe('AI', () => {
  it('handles debt legally by mortgaging before bankruptcy', () => {
    const s = game();
    s.turn = 1;
    s.debt = { payer: 'b', amount: 100, creditor: 'a', resume: 'end' };
    s.phase = 'debt';
    s.players[1].credits = 0;
    owned(s, 39, 'b');
    expect(chooseAction(s, s.players[1]).type).toBe('MORTGAGE');
  });
  it('plays deterministic full games without illegal actions', () => {
    for (const seed of [3, 13, 81]) {
      let s = createGame(
        players.map((p) => ({ ...p, ai: true })),
        {},
        seededRandom(seed),
      );
      const rng = seededRandom(seed);
      let actions = 0;
      while (s.phase !== 'finished' && actions < 6000) {
        let p;
        if (s.debt) p = s.players.find((p) => p.id === s.debt.payer);
        else if (s.auction)
          p = s.players.find(
            (p) => !p.bankrupt && !s.auction.passed.includes(p.id) && p.id !== s.auction.bidder,
          );
        else p = s.players[s.turn];
        if (!p) throw new Error('Auction stalled');
        const a = chooseAction(s, p);
        if (!a) throw new Error(`AI stalled in ${s.phase}`);
        s = act(s, a.type, a.payload, a.player, rng);
        expect(s.players.every((p) => p.credits >= 0)).toBe(true);
        actions++;
      }
      expect(s.phase).toBe('finished');
      expect(s.winner).toBeTruthy();
    }
  }, 60000);
});
