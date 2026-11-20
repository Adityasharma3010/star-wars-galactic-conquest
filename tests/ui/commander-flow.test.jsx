import React from 'react';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createGame, transition } from '../../src/game/engine/game.js';
import { useGameStore } from '../../src/stores/gameStore.js';
import MatchOpening from '../../src/components/MatchOpening.jsx';
import EventPresentation from '../../src/components/EventPresentation.jsx';
import MissionTransmission from '../../src/components/MissionTransmission.jsx';
import { PropertyPanel } from '../../src/components/Panels.jsx';
import { Account } from '../../src/pages/Dialogs.jsx';
import { openingStory } from '../../src/game/openingStory.js';
import { authenticate } from '../../src/services/supabase.js';

vi.mock('../../src/services/supabase.js', async (importOriginal) => ({
  ...(await importOriginal()),
  backendConfigured: true,
  authenticate: vi.fn(),
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));
const players = [
  { id: 'you', name: 'Nova', character: 'luke', faction: 'Jedi Order', ai: false },
  { id: 'rival', name: 'Orion', character: 'vader', faction: 'Galactic Empire', ai: false },
];
beforeAll(() => {
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
beforeEach(() =>
  useGameStore.setState({
    game: createGame(players),
    intro: null,
    introducedGames: [],
    playing: true,
    modal: null,
    eventQueue: [],
    observedEvent: null,
    online: false,
    onlinePlayer: null,
    selected: 1,
    settings: { mute: true, reducedMotion: true },
  }),
);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('personalizes the story with selected allegiances and pauses gameplay until skipped', async () => {
  await useGameStore.getState().start(players, { teams: true });
  const game = useGameStore.getState().game;
  expect(openingStory(game).paragraphs.join(' ')).toContain('Nova of the Jedi Order');
  expect(openingStory(game).teams).toEqual(['Jedi Order', 'Galactic Empire']);
  render(<MatchOpening />);
  expect(screen.getByRole('dialog', { name: 'Opening crawl' })).toBeVisible();
  await useGameStore.getState().dispatch('ROLL');
  expect(useGameStore.getState().game.version).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: /Skip intro/ }));
  await useGameStore.getState().dispatch('ROLL');
  expect(useGameStore.getState().game.version).toBe(1);
  expect(useGameStore.getState().introducedGames).toContain(game.id);
});

it('offers a readable static crawl and an explicit entry button with reduced motion', async () => {
  vi.useFakeTimers();
  useGameStore.setState({ intro: { gameId: 'local' } });
  render(<MatchOpening />);
  await act(async () => vi.advanceTimersByTime(5200));
  expect(screen.getByText(/Nova of the Jedi Order/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Enter the galaxy' }));
  expect(useGameStore.getState().intro).toBeNull();
});

it('preserves an active online intro when concurrent lobby notifications attach the same match', () => {
  const game = createGame(players, { id: 'online-qa' });
  useGameStore.getState().attachOnline(game, 'you');
  const intro = useGameStore.getState().intro;
  expect(intro).not.toBeNull();
  useGameStore.getState().attachOnline(game, 'you');
  expect(useGameStore.getState().intro).toBe(intro);
  useGameStore.getState().finishIntro();
  useGameStore.getState().attachOnline(game, 'you');
  expect(useGameStore.getState().intro).toBeNull();
});

function draw() {
  const game = createGame(players);
  game.players[0].position = 4;
  game.decks.force = ['f1'];
  let n = 0;
  return [
    game,
    transition(
      game,
      { id: 'mission', type: 'ROLL', player: 'you', version: 0, payload: {}, now: 1000 },
      () => [0.01, 0.18][n++ % 2],
    ),
  ];
}
it('gives an interactive mission only to its online recipient and sends an observer transmission', async () => {
  const [old, next] = draw();
  useGameStore.setState({ game: old, online: true, onlinePlayer: 'rival' });
  useGameStore.getState().commit(next);
  expect(useGameStore.getState().eventQueue).toHaveLength(0);
  const observed = useGameStore.getState().observedEvent;
  useGameStore.setState({ observedEvent: { ...observed, readyAt: 0 } });
  vi.useFakeTimers();
  render(
    <>
      <EventPresentation />
      <MissionTransmission />
    </>,
  );
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('status')).toHaveTextContent('Nova');
  expect(screen.queryByRole('button', { name: /Continue mission/ })).toBeNull();
  cleanup();
  vi.useRealTimers();
  useGameStore.setState({ game: old, onlinePlayer: 'you', observedEvent: null });
  useGameStore.getState().commit(next);
  const [event] = useGameStore.getState().eventQueue;
  useGameStore.setState({ eventQueue: [{ ...event, readyAt: 0 }] });
  render(<EventPresentation />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Continue mission' })).toBeVisible(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Continue mission' }));
  expect(useGameStore.getState().game.players[0].credits).toBe(next.players[0].credits);
});

it('does not require a human to accept an AI mission', () => {
  const [old, next] = draw();
  old.players[0].ai = next.players[0].ai = true;
  useGameStore.setState({ game: old });
  useGameStore.getState().commit(next);
  expect(useGameStore.getState().eventQueue).toHaveLength(0);
  expect(useGameStore.getState().observedEvent.player.id).toBe('you');
});

it('scopes property financing to the debtor and disables spending while in debt', () => {
  const game = createGame(players);
  game.phase = 'debt';
  game.debt = { payer: 'rival', amount: 100, creditor: null };
  game.ownership[1] = { owner: 'you', level: 0, mortgaged: false };
  useGameStore.setState({ game, online: true, onlinePlayer: 'you' });
  render(<PropertyPanel />);
  expect(screen.queryByRole('button', { name: 'Mortgage' })).toBeNull();
  act(() =>
    useGameStore.setState({
      game: { ...game, ownership: { 1: { owner: 'rival', level: 0, mortgaged: true } } },
      onlinePlayer: 'rival',
    }),
  );
  expect(screen.getByRole('button', { name: 'Redeem' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Develop' })).toBeDisabled();
});

it('does not show an unverified registration as a signed-in account', async () => {
  vi.mocked(authenticate).mockResolvedValue({ user: { id: 'unverified' }, session: null });
  render(<Account />);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'qa@example.com' } });
  fireEvent.change(screen.getByLabelText('PASSWORD'), { target: { value: 'testing-password' } });
  await act(async () => fireEvent.submit(document.querySelector('form')));
  expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  expect(screen.getByText(/Check your inbox/)).toBeVisible();
});
