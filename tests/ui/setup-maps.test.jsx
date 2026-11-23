import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NewGame } from '../../src/pages/Dialogs.jsx';
import MultiplayerLobby from '../../src/pages/MultiplayerLobby.jsx';
import { useGameStore } from '../../src/stores/gameStore.js';
import { DEFAULT_RULES } from '../../src/game/rules/data.js';
import { tokensFor } from '../../src/game/maps.js';
import { serverCall } from '../../src/services/supabase.js';

const fixture = vi.hoisted(() => ({ user: 'host', remote: null, realtime: null }));
vi.mock('../../src/services/supabase.js', async (original) => ({
  ...(await original()),
  backendConfigured: true,
  syncProfile: vi.fn().mockResolvedValue({}),
  roomList: async () => [],
  ensureOnlineSession: async () => ({ id: fixture.user }),
  serverCall: vi.fn(async (command, body) => {
    if (command === 'configureRoom')
      fixture.remote = {
        ...fixture.remote,
        rules: body.rules,
        room: { ...fixture.remote.room, max_players: body.maxPlayers },
        players: fixture.remote.players.map((player) => ({ ...player, is_ready: false })),
      };
    return structuredClone(fixture.remote);
  }),
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: fixture.user } } }),
      getSession: async () => ({ data: { session: { user: { id: fixture.user } } } }),
    },
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      single: async () => ({
        data: { display_name: fixture.user === 'host' ? 'Pilot' : 'Friend' },
      }),
      then(resolve) {
        resolve({ data: [] });
      },
    }),
    channel: () => ({
      on(_event, _filter, callback) {
        fixture.realtime = callback;
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(serverCall).mockClear();
  fixture.user = 'host';
  fixture.remote = {
    room: { id: 'room-1', host_id: 'host', code: 'MAP123', name: 'Map test', max_players: 4 },
    rules: { ...DEFAULT_RULES, mapId: 'galactic-conquest' },
    players: [
      {
        id: 'seat-1',
        user_id: 'host',
        display_name: 'Pilot',
        character: 'luke',
        faction: 'Rebel Alliance',
        is_ready: true,
      },
      {
        id: 'seat-2',
        user_id: 'guest',
        display_name: 'Friend',
        character: 'vader',
        faction: 'Galactic Empire',
        is_ready: true,
      },
    ],
  };
  useGameStore.setState({
    modal: 'newGame',
    modalHistory: [],
    selectedMap: 'galactic-conquest',
    ruleDrafts: {},
    profile: { name: 'Pilot', character: 'luke', faction: 'Rebel Alliance' },
    game: null,
    playing: false,
    online: false,
    lobbyRoom: null,
    busy: false,
    error: null,
  });
});
afterEach(cleanup);
function chooseMap(name) {
  fireEvent.click(screen.getByRole('button', { name: 'Browse maps' }));
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Available board maps' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}
it('switches maps inside setup, loads valid tokens, and restores each map’s complete draft', () => {
  render(<NewGame />);
  fireEvent.change(screen.getByLabelText('COMMANDER NAME'), { target: { value: 'Star Pilot' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select Darth Vader' }));
  fireEvent.click(screen.getByRole('button', { name: 'Custom', exact: true }));
  fireEvent.change(screen.getByLabelText(/STARTING CREDITS/), { target: { value: '2345' } });
  chooseMap('India');
  expect(screen.getByRole('button', { name: 'Select Red' })).toBeVisible();
  expect(screen.queryByLabelText('ALLEGIANCE')).toBeNull();
  fireEvent.change(screen.getByLabelText('COMMANDER NAME'), { target: { value: 'City Pilot' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select Red' }));
  fireEvent.click(screen.getByRole('button', { name: 'Custom', exact: true }));
  fireEvent.change(screen.getByLabelText(/STARTING RUPEES/), { target: { value: '1800' } });
  chooseMap('Galactic Conquest');
  expect(screen.getByLabelText('COMMANDER NAME')).toHaveValue('Star Pilot');
  expect(screen.getByRole('button', { name: 'Select Darth Vader' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByLabelText(/STARTING CREDITS/)).toHaveValue(2345);
  chooseMap('India');
  expect(screen.getByLabelText('COMMANDER NAME')).toHaveValue('City Pilot');
  expect(screen.getByLabelText(/STARTING RUPEES/)).toHaveValue(1800);
  expect(screen.getByRole('button', { name: 'Select Red' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(useGameStore.getState().game).toBeNull();
});
it('launches the inline-selected map with its own token set and no Star Wars crawl for India', async () => {
  render(<NewGame />);
  chooseMap('India');
  fireEvent.click(screen.getByRole('button', { name: 'Select Red' }));
  fireEvent.click(screen.getByRole('button', { name: 'Launch match' }));
  await waitFor(() => expect(useGameStore.getState().game).not.toBeNull());
  const { game, intro } = useGameStore.getState();
  expect(game.rules.mapId).toBe('india');
  expect(game.players[0].character).toBe('pill-red');
  expect(
    game.players.every((p) => p.character.startsWith('pill-') && p.faction === 'Classic'),
  ).toBe(true);
  expect(intro).toBeNull();
});
it('keeps a host’s map draft through room updates and requires saving before readiness or start', async () => {
  useGameStore.setState({ modal: 'rooms', lobbyRoom: 'room-1' });
  render(<MultiplayerLobby />);
  await screen.findByText('MAP123');
  chooseMap('India');
  expect(screen.getByRole('button', { name: 'Toggle ready' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Start match' })).toBeDisabled();
  expect(fixture.remote.rules.mapId).toBe('galactic-conquest');
  await act(async () => fixture.realtime());
  expect(useGameStore.getState().selectedMap).toBe('india');
  expect(screen.getByText('India')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save room rules & reset readiness' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Toggle ready' })).toBeEnabled());
  expect(serverCall).toHaveBeenCalledWith(
    'configureRoom',
    expect.objectContaining({
      roomId: 'room-1',
      rules: expect.objectContaining({ mapId: 'india' }),
    }),
  );
  expect(fixture.remote.players.every((p) => !p.is_ready)).toBe(true);
  expect(useGameStore.getState().profile.character).toBe(tokensFor('india')[0].id);
});
it('shows guests the saved room map, ignores stale local drafts, and adapts their token after a map change', async () => {
  fixture.user = 'guest';
  useGameStore.setState({
    modal: 'rooms',
    lobbyRoom: 'room-1',
    ruleDrafts: {
      'room-1': { rules: { ...DEFAULT_RULES, mapId: 'india', startingCredits: 3200 }, max: 8 },
    },
  });
  render(<MultiplayerLobby />);
  await screen.findByText('MAP123');
  expect(screen.queryByRole('button', { name: 'Browse maps' })).toBeNull();
  expect(screen.getByText('Galactic Conquest')).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Toggle ready' })).toBeEnabled());
  fixture.remote = {
    ...fixture.remote,
    rules: { ...fixture.remote.rules, mapId: 'india' },
    players: fixture.remote.players.map((p) => ({ ...p, is_ready: false })),
  };
  await act(async () => fixture.realtime());
  await waitFor(() =>
    expect(screen.getByLabelText('YOUR TOKEN COLOR')).toHaveAttribute(
      'data-value',
      tokensFor('india')[1].id,
    ),
  );
  expect(useGameStore.getState().profile.faction).toBe('Classic');
  fireEvent.click(screen.getByRole('button', { name: 'Toggle ready' }));
  await waitFor(() =>
    expect(serverCall).toHaveBeenCalledWith(
      'ready',
      expect.objectContaining({ character: tokensFor('india')[1].id, faction: 'Classic' }),
    ),
  );
});
