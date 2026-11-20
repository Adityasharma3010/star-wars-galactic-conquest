import { boardFor } from '../maps.js';
import { groupTiles, ownsGroup, transition } from '../engine/game.js';
const profiles = {
  easy: { reserve: 80, ratio: 0.75 },
  medium: { reserve: 180, ratio: 1 },
  hard: { reserve: 240, ratio: 1.25 },
  expert: { reserve: 300, ratio: 1.5 },
};
export function chooseAction(s, p) {
  const BOARD = boardFor(s);
  const policy = profiles[p.difficulty || s.rules.difficulty] || profiles.medium,
    owned = BOARD.filter((t) => s.ownership[t.id]?.owner === p.id);
  const pack = (type, payload = {}) => ({ type, player: p.id, payload });
  if (s.debt) {
    if (s.debt.payer !== p.id) return null;
    if (p.credits >= s.debt.amount) return pack('SETTLE');
    const sell = owned
      .filter(
        (t) =>
          s.ownership[t.id].level > 0 &&
          (s.ownership[t.id].level < 5 || s.inventory.outposts >= 4) &&
          s.ownership[t.id].level ===
            Math.max(...groupTiles(t).map((x) => s.ownership[x.id]?.level || 0)),
      )
      .sort((a, b) => s.ownership[b.id].level - s.ownership[a.id].level)[0];
    if (sell) return pack('SELL', { property: sell.id });
    const mortgage =
      s.rules.mortgages === false
        ? null
        : owned
            .filter(
              (t) =>
                !s.ownership[t.id].mortgaged &&
                (!t.group || groupTiles(t).every((x) => !s.ownership[x.id]?.level)),
            )
            .sort((a, b) => a.price - b.price)[0];
    return mortgage ? pack('MORTGAGE', { property: mortgage.id }) : pack('BANKRUPT');
  }
  if (s.phase === 'auction') {
    if (s.auction.passed.includes(p.id) || s.auction.bidder === p.id) return null;
    const t = BOARD[s.auction.property],
      amount = s.auction.bid + 10,
      close = t.group && groupTiles(t).some((x) => s.ownership[x.id]?.owner === p.id);
    return amount <=
      Math.min(p.credits - policy.reserve, t.price * policy.ratio * (close ? 1.4 : 1))
      ? pack('BID', { amount })
      : pack('PASS');
  }
  const offer = s.trades.find((t) => t.to === p.id && t.status === 'pending');
  if (offer) {
    const value = (ids) => ids.reduce((v, id) => v + BOARD[id].price, 0);
    if (value(offer.give) + offer.cash < value(offer.take) + offer.requestCash)
      return pack('TRADE_DECLINE', { trade: offer.id });
    try {
      transition(
        s,
        {
          id: 'ai-offer-check:' + offer.id + ':' + s.version,
          type: 'TRADE_ACCEPT',
          player: p.id,
          payload: { trade: offer.id },
          version: s.version,
        },
        () => 0.5,
      );
    } catch {
      return pack('TRADE_DECLINE', { trade: offer.id });
    }
    return pack('TRADE_ACCEPT', { trade: offer.id });
  }
  if (s.players[s.turn].id !== p.id) return null;
  if (s.phase === 'roll') {
    if (p.detained && p.cards.length) return pack('RELEASE', { card: p.cards[0] });
    return pack('ROLL');
  }
  if (s.phase === 'purchase') {
    const t = BOARD[s.pendingProperty];
    return pack(
      p.credits >= t.price + policy.reserve ||
        (t.group &&
          groupTiles(t).filter((x) => s.ownership[x.id]?.owner === p.id).length ===
            groupTiles(t).length - 1 &&
          p.credits >= t.price)
        ? 'BUY'
        : 'DECLINE',
    );
  }
  if (s.phase === 'end') {
    const redeem = owned.find(
      (t) => s.ownership[t.id].mortgaged && p.credits > t.mortgage * 1.1 + policy.reserve + 250,
    );
    if (redeem) return pack('UNMORTGAGE', { property: redeem.id });
    const develop = owned.find(
      (t) =>
        t.type === 'property' &&
        ownsGroup(s, p, t) &&
        groupTiles(t).every((x) => !s.ownership[x.id].mortgaged) &&
        s.ownership[t.id].level < 5 &&
        s.ownership[t.id].level ===
          Math.min(...groupTiles(t).map((x) => s.ownership[x.id].level)) &&
        p.credits > t.buildCost + policy.reserve &&
        (s.ownership[t.id].level === 4 ? s.inventory.bases > 0 : s.inventory.outposts > 0),
    );
    if (develop && p.difficulty !== 'easy') return pack('BUILD', { property: develop.id });
    if (
      s.rules.trading &&
      p.difficulty !== 'easy' &&
      !s.trades.some((t) => t.from === p.id && t.expires >= s.round)
    ) {
      const missing = BOARD.find(
        (t) =>
          t.group &&
          s.ownership[t.id] &&
          s.ownership[t.id].owner !== p.id &&
          groupTiles(t).filter((x) => s.ownership[x.id]?.owner === p.id).length ===
            groupTiles(t).length - 1 &&
          groupTiles(t).every((x) => !s.ownership[x.id]?.level) &&
          p.credits >= Math.ceil(t.price * 1.5) + policy.reserve,
      );
      if (missing)
        return pack('TRADE_OFFER', {
          to: s.ownership[missing.id].owner,
          give: [],
          take: [missing.id],
          cash: Math.ceil(missing.price * 1.5),
        });
    }
    return pack('END');
  }
  return null;
}
