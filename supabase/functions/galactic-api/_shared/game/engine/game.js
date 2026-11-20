import { BOARD, DEFAULT_RULES } from '../rules/data.js';
import { cardsFor, getCard } from '../cards/decks.js';
import { boardFor, mapFor, isClassic, GAME_MAPS } from '../maps.js';
import { dice, shuffled } from './random.js';

const fail = (message) => {
  throw new Error(message);
};
const active = (s) => s.players[s.turn];
const byId = (s, id) => s.players.find((p) => p.id === id);
const own = (s, id) => s.ownership[id];
export const groupTiles = (tile) =>
  boardFor(tile.mapId).filter((t) => t.type === 'property' && t.group === tile.group);
export const ownsGroup = (s, p, t) =>
  groupTiles(t).every(
    (x) =>
      own(s, x.id)?.owner === p.id ||
      (s.rules.teams &&
        s.rules.sharedProperties &&
        p.team &&
        byId(s, own(s, x.id)?.owner)?.team === p.team),
  );
export function wealth(s, p) {
  return (
    p.credits +
    boardFor(s).reduce(
      (n, t) =>
        n +
        (own(s, t.id)?.owner === p.id
          ? (own(s, t.id).mortgaged ? t.price / 2 : t.price) +
            (own(s, t.id).level || 0) * (t.buildCost || 0)
          : 0),
      0,
    )
  );
}
function log(s, text, type = 'info', details = {}) {
  if (isClassic(s))
    text = text
      .replaceAll('credits', 'rupees')
      .replaceAll('Hyperspace', 'GO')
      .replaceAll('detention', 'jail')
      .replaceAll('Galactic Conquest', 'India')
      .replaceAll('world', 'city')
      .replaceAll('outpost', 'house')
      .replaceAll('planetary base', 'hotel')
      .replaceAll('Free Orbit', 'Free Parking');
  s.eventSequence = (s.eventSequence || 0) + 1;
  s.events.push({ id: `event-${s.eventSequence}`, text, type, turn: s.round, ...details });
  if (s.events.length > 120) s.events.shift();
}
function checkWin(s) {
  const alive = s.players.filter((p) => !p.bankrupt);
  if (!alive.length) {
    s.phase = 'finished';
    s.winner = null;
    s.winningTeam = null;
    log(s, 'The match ended with no active players.', 'finished');
    return;
  }
  const teams = new Set(alive.map((p) => p.team || p.id));
  if (alive.length === 1 || (s.rules.teams && teams.size === 1)) {
    s.phase = 'finished';
    s.winner = alive[0]?.id;
    s.winningTeam = alive[0]?.team;
    log(s, `${alive[0]?.name} wins Galactic Conquest!`, 'victory');
  }
}
function roundLimitVictory(s) {
  if (!s.rules.roundLimit || s.round <= s.rules.roundLimit) return;
  const eligible = s.players.filter((p) => !p.bankrupt);
  const score = (p) =>
    s.rules.teams && p.team
      ? s.players.filter((x) => x.team === p.team).reduce((n, x) => n + wealth(s, x), 0)
      : wealth(s, p);
  const winner = [...eligible].sort((a, b) => score(b) - score(a))[0];
  s.phase = 'finished';
  s.round = s.rules.roundLimit;
  s.winner = winner.id;
  s.winningTeam = s.rules.teams ? winner.team : null;
  log(
    s,
    `${winner.team || winner.name} wins at the round limit with ${score(winner)} credits of wealth.`,
    'victory',
  );
}
function detention(s, p) {
  p.position = 10;
  p.detained = true;
  p.jailAttempts = 0;
  s.doubles = 0;
  s.extraTurn = false;
  log(s, `${p.name} was sent to detention.`, 'detention');
}
function movement(s, p, steps, back = false) {
  const previous = s.movement?.player === p.id ? s.movement : null;
  const path = Array.from(
    { length: steps },
    (_, i) => (p.position + (back ? -(i + 1) : i + 1) + 80) % 40,
  );
  s.movement = {
    player: p.id,
    from: previous?.from ?? p.position,
    steps: (previous?.steps || 0) + steps,
    back,
    path: [...(previous?.path || []), ...path],
  };
  if (!back && p.position + steps >= 40) {
    const bonus = Math.floor((p.position + steps) / 40) * s.rules.startBonus;
    p.credits += bonus;
    log(s, `${p.name} passed Hyperspace. +${bonus} credits.`, 'money');
  }
  p.position = (p.position + (back ? -steps : steps) + 80) % 40;
}
function queuePay(s, payer, creditor, amount) {
  if (amount > 0) s.payments.push({ payer, creditor, amount: Math.ceil(amount) });
}
function payQueue(s) {
  while (s.payments.length && !s.debt) {
    const q = s.payments.shift(),
      p = byId(s, q.payer);
    if (!p || p.bankrupt) continue;
    const c = q.creditor ? byId(s, q.creditor) : null;
    const paid = Math.min(p.credits, q.amount);
    p.credits -= paid;
    if (c && !c.bankrupt) c.credits += paid;
    else if (s.rules.freeParking) s.pot += paid;
    log(s, `${p.name} paid ${paid} credits${c ? ` to ${c.name}` : ''}.`, 'money');
    if (paid < q.amount) {
      s.debt = { payer: p.id, creditor: q.creditor, amount: q.amount - paid, resume: s.phase };
      s.phase = 'debt';
      log(s, `${p.name} needs ${q.amount - paid} credits to settle a debt.`, 'warning');
    }
  }
}
export function rent(s, t, roll = 7, multiplier = 1) {
  const BOARD = boardFor(s);
  const o = own(s, t.id);
  if (!o || o.mortgaged) return 0;
  const p = byId(s, o.owner);
  if (t.type === 'transport') {
    const count = BOARD.filter(
      (x) => x.type === 'transport' && own(s, x.id)?.owner === p.id,
    ).length;
    return 25 * 2 ** (count - 1) * multiplier;
  }
  if (t.type === 'utility') {
    const count = BOARD.filter((x) => x.type === 'utility' && own(s, x.id)?.owner === p.id).length;
    return roll * (count === 2 ? 10 : 4) * multiplier;
  }
  return t.rents[o.level || 0] * (!o.level && ownsGroup(s, p, t) ? 2 : 1) * multiplier;
}
function draw(s, p, deck, rng) {
  if (!s.decks[deck].length) {
    s.decks[deck] = shuffled(s.discards[deck], rng);
    s.discards[deck] = [];
  }
  const c = getCard(s.decks[deck].shift(), s);
  if (!c) return;
  const returnCard = () => s.discards[deck].push(c.id);
  s.lastCard = c;
  log(s, `${p.name} drew “${c.title}”.`, 'card', { cardId: c.id, player: p.id });
  if (c.effect === 'escape') p.cards.push(c.id);
  else returnCard();
  switch (c.effect) {
    case 'credits':
      if (c.value >= 0) p.credits += c.value;
      else queuePay(s, p.id, null, -c.value);
      break;
    case 'detention':
      detention(s, p);
      break;
    case 'move': {
      const steps = (c.target - p.position + 40) % 40;
      movement(s, p, steps);
      land(s, p, rng);
      break;
    }
    case 'back':
      movement(s, p, c.value, true);
      land(s, p, rng);
      break;
    case 'nearest': {
      let steps = 1;
      while (boardFor(s)[(p.position + steps) % 40].type !== c.target) steps++;
      movement(s, p, steps);
      land(s, p, rng, c.value);
      break;
    }
    case 'repairs': {
      let amount = 0;
      Object.values(s.ownership)
        .filter((o) => o.owner === p.id)
        .forEach((o) => (amount += o.level === 5 ? c.target : o.level * c.value));
      queuePay(s, p.id, null, amount);
      break;
    }
    case 'collect':
      s.players
        .filter((x) => x.id !== p.id && !x.bankrupt)
        .forEach((x) => queuePay(s, x.id, p.id, c.value));
      break;
    case 'payAll':
      s.players
        .filter((x) => x.id !== p.id && !x.bankrupt)
        .forEach((x) => queuePay(s, p.id, x.id, c.value));
      break;
  }
}
function land(s, p, rng, multiplier = 1) {
  const t = boardFor(s)[p.position];
  log(s, `${p.name} arrived at ${t.name}.`, 'move');
  s.phase = 'end';
  if (t.price) {
    const o = own(s, t.id);
    if (!o) {
      s.pendingProperty = t.id;
      s.phase = 'purchase';
    } else if (o.owner !== p.id) {
      const creditor = byId(s, o.owner);
      if (!(s.rules.teams && s.rules.noTeamRent && p.team && creditor.team === p.team))
        queuePay(s, p.id, o.owner, rent(s, t, s.dice[0] + s.dice[1], multiplier));
    }
  } else if (t.type === 'tax')
    queuePay(s, p.id, null, t.id === 4 ? incomeTax(s, p) : s.rules.luxuryTax);
  else if (t.type === 'goDetention') detention(s, p);
  else if (t.type === 'parking' && s.rules.freeParking) {
    p.credits += s.pot;
    log(s, `${p.name} collected ${s.pot} from Free Orbit.`, 'money');
    s.pot = 0;
  } else if (t.type === 'force' || t.type === 'galactic') draw(s, p, t.type, rng);
  payQueue(s);
}
export function createGame(players, rules = {}, rng = () => 0.5) {
  if (players.length < 2 || players.length > 8) fail('A match needs 2–8 players.');
  if (new Set(players.map((p) => p.id)).size !== players.length) fail('Player IDs must be unique.');
  const config = { ...DEFAULT_RULES, ...rules };
  if (!GAME_MAPS.some((map) => map.id === config.mapId)) fail('Unknown map.');
  if (!['cash', 'wealth'].includes(config.taxBasis)) fail('Tax basis must be cash or wealth.');
  if (
    !Number.isInteger(config.startingCredits) ||
    config.startingCredits < 100 ||
    config.startingCredits > 10000
  )
    fail('Starting credits must be 100–10000.');
  for (const [key, min, max] of [
    ['startBonus', 0, 1000],
    ['incomeTax', 0, 1000],
    ['luxuryTax', 0, 1000],
    ['outposts', 0, 64],
    ['bases', 0, 24],
    ['roundLimit', 0, 1000],
  ])
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max)
      fail(`${key} must be an integer between ${min} and ${max}.`);
  for (const key of [
    'auctions',
    'freeParking',
    'trading',
    'mortgages',
    'teams',
    'noTeamRent',
    'sharedProperties',
    'duplicateCharacters',
  ])
    if (typeof config[key] !== 'boolean') fail(`${key} must be enabled or disabled.`);
  const s = {
    id: rules.id || 'local',
    version: 0,
    players: players.map((p) => ({
      ...p,
      credits: config.startingCredits,
      position: 0,
      cards: [],
      detained: false,
      jailAttempts: 0,
      bankrupt: false,
    })),
    rules: config,
    turn: 0,
    round: 1,
    turnDeadline: null,
    phase: 'roll',
    dice: [1, 1],
    doubles: 0,
    extraTurn: false,
    ownership: {},
    pendingProperty: null,
    auction: null,
    trades: [],
    tradeHistory: [],
    debt: null,
    payments: [],
    pot: 0,
    inventory: { outposts: config.outposts, bases: config.bases },
    decks: {
      force: shuffled(
        cardsFor(config)
          .filter((c) => c.deck === 'force')
          .map((c) => c.id),
        rng,
      ),
      galactic: shuffled(
        cardsFor(config)
          .filter((c) => c.deck === 'galactic')
          .map((c) => c.id),
        rng,
      ),
    },
    discards: { force: [], galactic: [] },
    events: [],
    history: [],
    processed: [],
    movement: null,
    lastCard: null,
    winner: null,
  };
  log(
    s,
    isClassic(s)
      ? 'The India match begins. All players receive their starting balance.'
      : 'The galaxy is yours to conquer. All commanders receive starting credits.',
    'start',
  );
  return s;
}
function transferLegal(s, ids, p) {
  const BOARD = boardFor(s);
  for (const id of ids) {
    const o = own(s, id),
      t = BOARD[id];
    if (!t || !o || o.owner !== p.id) fail('An offered property is no longer owned.');
    if (t.type === 'property' && groupTiles(t).some((x) => own(s, x.id)?.level > 0))
      fail('Sell developments in the group before trading.');
  }
}
function expireTrades(s) {
  s.trades.forEach((t) => {
    if (t.status === 'pending' && s.round > t.expires) t.status = 'expired';
  });
}
function offerTrade(s, p, a, id) {
  if (!s.rules.trading || !['roll', 'end'].includes(s.phase)) fail('Trading is unavailable now.');
  const other = byId(s, a.to);
  if (!other || other.id === p.id || other.bankrupt) fail('Choose an active trading partner.');
  const give = [...new Set(a.give || [])],
    take = [...new Set(a.take || [])],
    giveCards = [...new Set(a.giveCards || [])],
    takeCards = [...new Set(a.takeCards || [])];
  transferLegal(s, give, p);
  transferLegal(s, take, other);
  const cash = Number(a.cash || 0),
    requestCash = Number(a.requestCash || 0);
  if (
    !Number.isInteger(cash) ||
    cash < 0 ||
    cash > p.credits ||
    !Number.isInteger(requestCash) ||
    requestCash < 0 ||
    requestCash > other.credits
  )
    fail('Trade credits must be affordable, positive integers.');
  if (
    giveCards.some((id) => !p.cards.includes(id)) ||
    takeCards.some((id) => !other.cards.includes(id))
  )
    fail('Escape cards must be owned.');
  s.trades.push({
    id,
    from: p.id,
    to: other.id,
    give,
    take,
    cash,
    requestCash,
    giveCards,
    takeCards,
    status: 'pending',
    expires: s.round + 3,
  });
  log(s, `${p.name} offered a trade to ${other.name}.`, 'trade');
}
export function transition(state, action, rng = () => 0.5) {
  const BOARD = boardFor(state);
  if (!action?.id || typeof action.id !== 'string') fail('Action ID is required.');
  if (state.processed.includes(action.id)) return state;
  if (action.version !== undefined && action.version !== state.version)
    fail('Game state changed. Try again.');
  if (state.phase === 'finished') fail('This match is over.');
  const s = structuredClone(state),
    p = byId(s, action.player),
    current = active(s);
  if (!p || p.bankrupt) fail('Player is not active.');
  if (action.type === 'FORFEIT') {
    if (!action.connectionTimeout || p.ai) fail('Only an expired human connection can forfeit.');
    const leaving = [...new Set(action.payload?.players || [p.id])];
    if (
      !leaving.length ||
      leaving.some((id) => !byId(s, id) || byId(s, id).ai || byId(s, id).bankrupt)
    )
      fail('Invalid expired players.');
    for (const id of leaving) {
      const p = byId(s, id);
      for (const [id, owned] of Object.entries(s.ownership)) {
        if (owned.owner !== p.id) continue;
        if (owned.level === 5) s.inventory.bases++;
        else s.inventory.outposts += owned.level || 0;
        delete s.ownership[id];
      }
      p.cards.forEach((id) => s.discards[getCard(id, s).deck].push(id));
      p.cards = [];
      p.credits = 0;
      p.bankrupt = true;
      p.forfeited = true;
      p.eliminationReason = 'Rejoin period expired';
      s.trades
        .filter((trade) => trade.status === 'pending' && (trade.from === p.id || trade.to === p.id))
        .forEach((trade) => (trade.status = 'cancelled'));
      s.payments = s.payments
        .filter((payment) => payment.payer !== p.id)
        .map((payment) => (payment.creditor === p.id ? { ...payment, creditor: null } : payment));
      if (s.debt?.payer === p.id) {
        s.phase = s.debt.resume === 'jailRelease' ? 'end' : s.debt.resume;
        s.debt = null;
      } else if (s.debt?.creditor === p.id) s.debt.creditor = null;
      if (s.auction) {
        if (!s.auction.passed.includes(p.id)) s.auction.passed.push(p.id);
        if (s.auction.bidder === p.id) {
          s.auction.bidder = null;
          s.auction.bid = 0;
        }
      }
      log(s, p.name + ' was eliminated after their rejoin period expired.', 'forfeit', {
        player: p.id,
      });
    }
    settleAuction(s);
    checkWin(s);
    if (s.phase !== 'finished' && leaving.includes(current.id)) {
      let turn = s.turn;
      do {
        turn = (turn + 1) % s.players.length;
        if (turn === 0) s.round++;
      } while (s.players[turn].bankrupt);
      s.turn = turn;
      s.extraTurn = false;
      s.doubles = 0;
      if (!s.auction && !s.debt) {
        s.phase = 'roll';
        s.pendingProperty = null;
      }
    }
    if (s.phase !== 'finished') payQueue(s);
    s.movement = null;
    s.lastCard = null;
    s.version++;
    s.processed.push(action.id);
    s.lastActionType = 'FORFEIT';
    return s;
  }
  const a = action.payload || {};
  const publicActions = [
    'BID',
    'PASS',
    'TRADE_ACCEPT',
    'TRADE_DECLINE',
    'TRADE_CANCEL',
    'TRADE_COUNTER',
  ];
  const debtManagement = ['MORTGAGE', 'SELL', 'SETTLE', 'BANKRUPT'];
  const allowedActor = s.debt && debtManagement.includes(action.type) ? s.debt.payer : current.id;
  if (!publicActions.includes(action.type) && p.id !== allowedActor) fail('It is not your turn.');
  if (s.phase === 'auction' && !['BID', 'PASS'].includes(action.type))
    fail('Finish the auction first.');
  if (s.debt && !debtManagement.includes(action.type)) fail('Settle the outstanding debt first.');
  s.movement = null;
  s.lastCard = null;
  switch (action.type) {
    case 'ROLL': {
      if (s.phase !== 'roll') fail('You cannot roll right now.');
      s.dice = dice(rng);
      const sum = s.dice[0] + s.dice[1],
        double = s.dice[0] === s.dice[1];
      s.extraTurn = double;
      if (p.detained) {
        s.extraTurn = false;
        if (double) {
          p.detained = false;
          p.jailAttempts = 0;
          log(s, `${p.name} rolled doubles and escaped detention.`, 'detention');
        } else {
          p.jailAttempts++;
          if (p.jailAttempts < 3) {
            s.phase = 'end';
            log(s, `${p.name} remains in detention (${p.jailAttempts}/3).`, 'detention');
            break;
          }
          queuePay(s, p.id, null, 50);
          s.phase = 'jailRelease';
          s.releaseSteps = sum;
          payQueue(s);
          if (s.debt) break;
          p.detained = false;
          p.jailAttempts = 0;
        }
      } else if (double) {
        s.doubles++;
        if (s.doubles === 3) {
          detention(s, p);
          s.phase = 'end';
          break;
        }
      } else s.doubles = 0;
      movement(s, p, sum);
      land(s, p, rng);
      break;
    }
    case 'RELEASE': {
      if (s.phase !== 'roll' || !p.detained) fail('You are not awaiting a detention decision.');
      if (a.card) {
        const index = p.cards.indexOf(a.card);
        if (index < 0) fail('Escape card not owned.');
        p.cards.splice(index, 1);
        s.discards[getCard(a.card).deck].push(a.card);
      } else {
        if (p.credits < 50) fail('Not enough credits for the fine.');
        queuePay(s, p.id, null, 50);
        payQueue(s);
      }
      p.detained = false;
      p.jailAttempts = 0;
      log(s, `${p.name} left detention.`, 'detention');
      break;
    }
    case 'BUY': {
      if (s.phase !== 'purchase') fail('There is no property to buy.');
      const t = BOARD[s.pendingProperty];
      if (own(s, t.id)) fail('This property is owned.');
      if (p.credits < t.price) fail('Not enough credits.');
      p.credits -= t.price;
      s.ownership[t.id] = { owner: p.id, level: 0, mortgaged: false };
      s.pendingProperty = null;
      s.phase = 'end';
      log(s, `${p.name} acquired ${t.name} for ${t.price} credits.`, 'purchase');
      break;
    }
    case 'DECLINE': {
      if (s.phase !== 'purchase') fail('There is no property to decline.');
      if (s.rules.auctions) {
        s.auction = {
          property: s.pendingProperty,
          bid: 0,
          bidder: null,
          passed: [],
          bids: [],
          deadline: (action.now || 0) + 30000,
        };
        s.phase = 'auction';
        log(s, `Auction opened for ${BOARD[s.pendingProperty].name}.`, 'auction');
      } else {
        s.phase = 'end';
        s.pendingProperty = null;
      }
      break;
    }
    case 'BID': {
      if (!s.auction || s.phase !== 'auction') fail('No active auction.');
      if (s.auction.passed.includes(p.id)) fail('You have passed.');
      if (action.now > s.auction.deadline) fail('Auction bidding has closed.');
      const amount = Number(a.amount);
      if (!Number.isInteger(amount) || amount < s.auction.bid + 10 || amount > p.credits)
        fail('Bid must increase by 10 and be affordable.');
      s.auction.bid = amount;
      s.auction.bidder = p.id;
      s.auction.deadline = (action.now || 0) + 10000;
      s.auction.bids.push({ player: p.id, amount });
      log(s, `${p.name} bid ${amount} credits.`, 'auction');
      break;
    }
    case 'PASS': {
      if (s.phase !== 'auction' || !s.auction) fail('No active auction.');
      if (s.auction.bidder === p.id) fail('The leading bidder cannot pass.');
      if (!s.auction.passed.includes(p.id)) s.auction.passed.push(p.id);
      break;
    }
    case 'END': {
      if (s.phase !== 'end') fail('Finish your current action first.');
      s.history.push({
        player: p.id,
        round: s.round,
        dice: s.dice,
        position: p.position,
        credits: p.credits,
      });
      if (s.extraTurn && !p.detained) {
        s.phase = 'roll';
        s.extraTurn = false;
        log(s, `${p.name} rolled doubles. Roll again.`, 'dice');
      } else {
        s.doubles = 0;
        s.extraTurn = false;
        let i = s.turn;
        do {
          i = (i + 1) % s.players.length;
          if (i === 0) s.round++;
        } while (s.players[i].bankrupt);
        s.turn = i;
        s.phase = 'roll';
        log(s, `${active(s).name}’s turn.`, 'turn');
      }
      expireTrades(s);
      break;
    }
    case 'BUILD': {
      if (!['roll', 'end'].includes(s.phase)) fail('Develop between rolls.');
      const t = BOARD[a.property],
        o = own(s, a.property);
      if (!t || t.type !== 'property' || o?.owner !== p.id || !ownsGroup(s, p, t))
        fail('Own the complete color group to develop.');
      const group = groupTiles(t).map((x) => own(s, x.id));
      if (group.some((x) => x.mortgaged)) fail('Unmortgage the entire group first.');
      if (o.level === 5 || o.level > Math.min(...group.map((x) => x.level)))
        fail('Develop evenly across the group.');
      if (p.credits < t.buildCost) fail('Not enough credits.');
      if (o.level === 4) {
        if (s.inventory.bases < 1) fail('No planetary bases remain.');
        s.inventory.bases--;
        s.inventory.outposts += 4;
      } else {
        if (s.inventory.outposts < 1) fail('No outposts remain.');
        s.inventory.outposts--;
      }
      p.credits -= t.buildCost;
      o.level++;
      log(
        s,
        `${p.name} developed ${t.name} (${o.level === 5 ? 'planetary base' : `${o.level} outposts`}).`,
        'build',
      );
      break;
    }
    case 'SELL': {
      if (!['roll', 'end', 'debt'].includes(s.phase)) fail('Cannot sell developments now.');
      const t = BOARD[a.property],
        o = own(s, a.property);
      if (!t || o?.owner !== p.id || !o.level) fail('No development to sell.');
      if (o.level < Math.max(...groupTiles(t).map((x) => own(s, x.id)?.level || 0)))
        fail('Sell developments evenly.');
      if (o.level === 5) {
        if (s.inventory.outposts < 4) fail('The bank needs four outposts to downgrade a base.');
        s.inventory.bases++;
        s.inventory.outposts -= 4;
      } else s.inventory.outposts++;
      o.level--;
      p.credits += t.buildCost / 2;
      log(s, `${p.name} sold a development on ${t.name}.`, 'money');
      break;
    }
    case 'MORTGAGE': {
      if (s.rules.mortgages === false) fail('Mortgages are disabled for this match.');
      if (!['roll', 'end', 'debt'].includes(s.phase)) fail('Cannot mortgage now.');
      const t = BOARD[a.property],
        o = own(s, a.property);
      if (!t || o?.owner !== p.id || o.mortgaged) fail('Property cannot be mortgaged.');
      if (t.type === 'property' && groupTiles(t).some((x) => own(s, x.id)?.level > 0))
        fail('Sell all group developments first.');
      o.mortgaged = true;
      p.credits += t.mortgage;
      log(s, `${p.name} mortgaged ${t.name}. +${t.mortgage} credits.`, 'mortgage');
      break;
    }
    case 'UNMORTGAGE': {
      if (!['roll', 'end'].includes(s.phase)) fail('Cannot unmortgage now.');
      const t = BOARD[a.property],
        o = own(s, a.property),
        cost = Math.ceil((t?.mortgage || 0) * (1 + s.rules.mortgageInterest));
      if (o?.owner !== p.id || !o.mortgaged) fail('No mortgage to redeem.');
      if (p.credits < cost) fail('Not enough credits.');
      p.credits -= cost;
      o.mortgaged = false;
      log(s, `${p.name} redeemed ${t.name} for ${cost}.`, 'mortgage');
      break;
    }
    case 'SETTLE': {
      if (!s.debt || s.debt.payer !== p.id) fail('You have no debt to settle.');
      if (p.credits < s.debt.amount) fail('Raise more credits before settling.');
      const d = s.debt;
      p.credits -= d.amount;
      if (d.creditor && !byId(s, d.creditor).bankrupt) byId(s, d.creditor).credits += d.amount;
      else if (s.rules.freeParking) s.pot += d.amount;
      s.debt = null;
      s.phase = d.resume;
      log(s, `${p.name} settled the outstanding debt.`, 'money');
      payQueue(s);
      if (!s.debt && s.phase === 'jailRelease') {
        p.detained = false;
        p.jailAttempts = 0;
        movement(s, p, s.releaseSteps);
        land(s, p, rng);
      }
      break;
    }
    case 'BANKRUPT': {
      if (!s.debt || s.debt.payer !== p.id) fail('Bankruptcy requires an unpaid debt.');
      const d = s.debt,
        creditor = d.creditor ? byId(s, d.creditor) : null;
      for (const [id, o] of Object.entries(s.ownership)) {
        if (o.owner !== p.id) continue;
        const t = BOARD[Number(id)];
        if (o.level === 5) s.inventory.bases++;
        else s.inventory.outposts += o.level;
        const proceeds = ((o.level || 0) * (t.buildCost || 0)) / 2;
        if (creditor && !creditor.bankrupt) {
          creditor.credits += proceeds;
          o.owner = creditor.id;
          o.level = 0;
        } else delete s.ownership[id];
      }
      if (creditor && !creditor.bankrupt) {
        creditor.credits += p.credits;
        creditor.cards.push(...p.cards);
      } else p.cards.forEach((id) => s.discards[getCard(id).deck].push(id));
      p.credits = 0;
      p.cards = [];
      p.bankrupt = true;
      s.debt = null;
      s.phase = d.resume === 'jailRelease' ? 'end' : d.resume;
      s.payments = s.payments.filter((q) => q.payer !== p.id);
      log(s, `${p.name} declared bankruptcy.`, 'warning');
      payQueue(s);
      if (!s.debt) {
        checkWin(s);
        if (s.phase !== 'finished' && current.id === p.id) {
          s.phase = 'end';
          s.extraTurn = false;
          let i = s.turn;
          do {
            i = (i + 1) % s.players.length;
            if (i === 0) s.round++;
          } while (s.players[i].bankrupt);
          s.turn = i;
          s.phase = 'roll';
          s.doubles = 0;
        }
      }
      break;
    }
    case 'TRADE_OFFER': {
      offerTrade(s, p, a, action.id);
      break;
    }
    case 'TRADE_ACCEPT': {
      const t = s.trades.find((t) => t.id === a.trade);
      if (!t || t.status !== 'pending' || t.to !== p.id || s.round > t.expires)
        fail('Trade is no longer available.');
      const sender = byId(s, t.from);
      if (sender.bankrupt) fail('Trading player was eliminated.');
      transferLegal(s, t.give, sender);
      transferLegal(s, t.take, p);
      if (
        t.giveCards.some((id) => !sender.cards.includes(id)) ||
        t.takeCards.some((id) => !p.cards.includes(id))
      )
        fail('An offered card is no longer owned.');
      const fee = (ids) =>
        ids.reduce(
          (n, id) =>
            n +
            (own(s, id).mortgaged ? Math.ceil(BOARD[id].mortgage * s.rules.mortgageInterest) : 0),
          0,
        );
      if (sender.credits < t.cash + fee(t.take) || p.credits < t.requestCash + fee(t.give))
        fail('Credits changed; this trade is unaffordable.');
      sender.credits += t.requestCash - t.cash - fee(t.take);
      p.credits += t.cash - t.requestCash - fee(t.give);
      t.give.forEach((id) => (own(s, id).owner = p.id));
      t.take.forEach((id) => (own(s, id).owner = sender.id));
      sender.cards = sender.cards.filter((id) => !t.giveCards.includes(id)).concat(t.takeCards);
      p.cards = p.cards.filter((id) => !t.takeCards.includes(id)).concat(t.giveCards);
      t.status = 'accepted';
      s.tradeHistory.push({ ...t, round: s.round });
      log(s, `${sender.name} and ${p.name} completed a trade.`, 'trade');
      break;
    }
    case 'TRADE_DECLINE':
    case 'TRADE_CANCEL': {
      const t = s.trades.find((t) => t.id === a.trade);
      if (
        !t ||
        t.status !== 'pending' ||
        (action.type === 'TRADE_CANCEL' ? t.from !== p.id : t.to !== p.id)
      )
        fail('Trade action is unauthorized.');
      t.status =
        action.type === 'TRADE_CANCEL'
          ? 'cancelled'
          : action.type === 'TRADE_COUNTER'
            ? 'countered'
            : 'declined';
      log(s, `${p.name} ${t.status} a trade.`, 'trade');
      break;
    }
    case 'TRADE_COUNTER': {
      const previous = s.trades.find((t) => t.id === a.trade);
      if (
        !previous ||
        previous.status !== 'pending' ||
        previous.to !== p.id ||
        s.round > previous.expires
      )
        fail('Trade action is unauthorized.');
      offerTrade(s, p, { ...a, to: previous.from }, action.id);
      previous.status = 'countered';
      break;
    }
    default:
      fail('Unknown game action.');
  }
  settleAuction(s);
  if (action.type === 'END') roundLimitVictory(s);
  s.turnDeadline = null;
  s.animationUntil =
    (action.now || 0) +
    (s.movement ? s.movement.steps * 260 + 1200 : 650) +
    (s.lastCard ? 6000 : 0);
  s.lastActionType = action.type;
  s.version++;
  s.processed.push(action.id);
  if (s.processed.length > 500) s.processed.shift();
  return s;
}

export function incomeTax(state, player) {
  return Math.ceil(
    Math.max(0, state.rules.taxBasis === 'wealth' ? wealth(state, player) : player.credits) * 0.1,
  );
}

function settleAuction(state) {
  if (!state.auction) return;
  const auction = state.auction,
    eligible = state.players.filter(
      (player) => !player.bankrupt && !auction.passed.includes(player.id),
    );
  if (
    (auction.bidder && eligible.every((player) => player.id === auction.bidder)) ||
    !eligible.length
  ) {
    if (auction.bidder) {
      const winner = byId(state, auction.bidder);
      winner.credits -= auction.bid;
      state.ownership[auction.property] = { owner: winner.id, level: 0, mortgaged: false };
      log(
        state,
        `${winner.name} won ${boardFor(state)[auction.property].name} for ${auction.bid}.`,
        'purchase',
      );
    } else log(state, 'All players passed. The property remains with the bank.', 'auction');
    state.auction = null;
    state.pendingProperty = null;
    state.phase = 'end';
  }
}
