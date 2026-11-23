import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GameMoment from '../../src/components/GameMoment.jsx';
import { useGameStore } from '../../src/stores/gameStore.js';
import { createGame, transition } from '../../src/game/engine/game.js';
import { tokensFor } from '../../src/game/maps.js';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  useGameStore.setState({
    game: null,
    playing: true,
    intro: null,
    modal: null,
    online: false,
    onlinePlayer: null,
    settings: { ...useGameStore.getState().settings, mute: true, reducedMotion: false },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function fixture({
  mapId = 'galactic-conquest',
  owner = 'you',
  ai = false,
  built = false,
  online = false,
  viewer = 'you',
} = {}) {
  const game = createGame(
    tokensFor(mapId)
      .slice(0, 2)
      .map((token, index) => ({
        id: index ? 'rival' : 'you',
        name: index ? 'Rival' : 'Nova',
        character: token.id,
        color: token.color,
        faction: token.faction,
        ai: index === 1 && ai,
      })),
    { id: 'moment-' + mapId, mapId },
  );
  game.turn = owner === 'you' ? 0 : 1;
  game.players[game.turn].position = 3;
  game.phase = built ? 'end' : 'purchase';
  game.pendingProperty = built ? null : 3;
  if (built) for (const id of [1, 3]) game.ownership[id] = { owner, level: 0, mortgaged: false };
  useGameStore.setState({ game, online, onlinePlayer: online ? viewer : null });
  const view = render(<GameMoment />);
  const next = transition(
    game,
    {
      id: 'moment-action',
      version: game.version,
      player: owner,
      type: built ? 'BUILD' : 'BUY',
      payload: built ? { property: 3 } : {},
      now: Date.now(),
    },
    () => 0.5,
  );
  return { game, next, view };
}
const commit = (game) => act(() => useGameStore.setState({ game }));

for (const mapId of ['galactic-conquest', 'india']) {
  it(`${mapId}: shows the owner's purchase confirmation and preserves the public event`, () => {
    const { next, view } = fixture({ mapId, online: true });
    commit(next);
    expect(view.container.querySelector('.game-moment')).toHaveTextContent('PROPERTY SECURED');
    expect(next.events.at(-1).type).toBe('purchase');
  });
  it(`${mapId}: another player's purchase stays out of the viewer's large toast`, () => {
    const { next, view } = fixture({ mapId, owner: 'rival', online: true });
    commit(next);
    expect(view.container.querySelector('.game-moment')).toBeNull();
    expect(next.ownership[3].owner).toBe('rival');
    expect(next.events.at(-1).text).toContain('Rival');
  });
  it(`${mapId}: development is shown only to its owner`, () => {
    const own = fixture({ mapId, built: true, online: true });
    commit(own.next);
    expect(own.view.container.querySelector('.game-moment')).toHaveTextContent(
      mapId === 'india' ? 'HOUSE RAISED' : 'OUTPOST DEPLOYED',
    );
    cleanup();
    const other = fixture({ mapId, built: true, owner: 'rival', online: true });
    commit(other.next);
    expect(other.view.container.querySelector('.game-moment')).toBeNull();
  });
}
it('keeps local AI purchases and online spectator confirmations quiet', () => {
  const bot = fixture({ owner: 'rival', ai: true });
  commit(bot.next);
  expect(bot.view.container.querySelector('.game-moment')).toBeNull();
  cleanup();
  const spectator = fixture({ online: true, viewer: null });
  commit(spectator.next);
  expect(spectator.view.container.querySelector('.game-moment')).toBeNull();
});
it('does not replay an old purchase when catching up after missed updates', () => {
  const { next, view } = fixture({ online: true });
  const caughtUp = transition(
    next,
    {
      id: 'next-turn',
      version: next.version,
      player: 'you',
      type: 'END',
      payload: {},
      now: Date.now(),
    },
    () => 0.5,
  );
  commit(caughtUp);
  expect(view.container.querySelector('.game-moment')).toBeNull();
  expect(caughtUp.ownership[3].owner).toBe('you');
});
it('shows an auction win to the winner even when a different player passes to close bidding', () => {
  const { game, view } = fixture({ online: true });
  const auction = {
    ...game,
    phase: 'auction',
    pendingProperty: 3,
    auction: {
      property: 3,
      bid: 50,
      bidder: 'you',
      passed: [],
      bids: [],
      deadline: Date.now() + 10000,
    },
  };
  commit(auction);
  const next = transition(
    auction,
    {
      id: 'close-auction',
      version: auction.version,
      player: 'rival',
      type: 'PASS',
      payload: {},
      now: Date.now(),
    },
    () => 0.5,
  );
  commit(next);
  expect(view.container.querySelector('.game-moment')).toHaveTextContent('PROPERTY SECURED');
});
