import React from 'react';
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render as renderView, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/app/App.jsx';
import { useGameStore } from '../../src/stores/gameStore.js';
vi.mock('../../src/components/GalaxyBackdrop.jsx', () => ({ default: () => <div /> }));
beforeAll(() => {
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
const render = (view) => renderView(<MemoryRouter>{view}</MemoryRouter>);
beforeEach(() => {
  useGameStore.setState({
    intro: null,
    introducedGames: [],
    observedEvent: null,
    game: null,
    playing: false,
    online: false,
    matchAway: false,
    modal: null,
    error: null,
    busy: false,
    eventQueue: [],
    connections: {},
    lobbyRoom: null,
    settings: { ...useGameStore.getState().settings, mute: true, reducedMotion: true },
  });
});
afterEach(cleanup);
describe('command deck', () => {
  it('creates no game until the commander explicitly launches one', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'GALACTIC CONQUEST' })).toBeVisible();
    expect(screen.queryByTestId('game-board')).toBeNull();
    expect(useGameStore.getState().game).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Play locally/ }));
    expect(useGameStore.getState().game).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Launch conquest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Skip intro/ })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: /Skip intro/ }));
    await waitFor(() => expect(screen.getByTestId('game-board')).toBeVisible());
    expect(screen.getByTestId('game-board').querySelectorAll('[data-tile]')).toHaveLength(40);
    expect(screen.getByRole('button', { name: 'Roll dice' })).toBeEnabled();
  });
  it('opens and closes settings', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Open settings'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
    expect(screen.getByText('Reduce motion')).toBeVisible();
    fireEvent.click(screen.getByLabelText('Close dialog'));
  });
  it('shows a real character and match setup', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Play locally/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
    expect(screen.getByLabelText('Select Darth Vader')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Launch conquest' })).toBeVisible();
    fireEvent.click(screen.getByLabelText('Close dialog'));
  });
  it('discloses unconfigured multiplayer instead of fabricating rooms', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Find a game' }));
    await waitFor(() =>
      expect(screen.getByText(/No Supabase project is connected yet/)).toBeVisible(),
    );
    fireEvent.click(screen.getByLabelText('Close dialog'));
  });
  it('opens the profile before a match exists', async () => {
    render(<App />);
    fireEvent.click(document.querySelector('.profile-button'));
    await waitFor(() => expect(screen.getByLabelText('CALLSIGN')).toBeVisible());
    expect(screen.getByText('WORLDS THIS MATCH').previousElementSibling).toHaveTextContent('0');
  });
  it('returns to the menu and resumes the same local match', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Play locally/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch conquest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Skip intro/ })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: /Skip intro/ }));
    await waitFor(() => expect(screen.getByTestId('game-board')).toBeVisible());
    const game = useGameStore.getState().game;
    fireEvent.click(screen.getByLabelText('Galactic Conquest main menu'));
    await waitFor(() => expect(screen.queryByTestId('game-board')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Resume saved game' }));
    await waitFor(() => expect(screen.getByTestId('game-board')).toBeVisible());
    expect(useGameStore.getState().game).toBe(game);
  });
  it('keeps the new intro active when replacing a match from its command deck', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Play locally/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch conquest' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Skip intro/ })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: /Skip intro/ }));
    await waitFor(() => expect(screen.getByTestId('game-board')).toBeVisible());
    const oldId = useGameStore.getState().game.id;
    fireEvent.click(screen.getAllByRole('button', { name: 'New game', exact: true })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Launch conquest' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Opening crawl' })).toBeVisible(),
    );
    expect(useGameStore.getState().game.id).not.toBe(oldId);
    expect(useGameStore.getState().playing).toBe(true);
    expect(useGameStore.getState().intro).not.toBeNull();
  });
});
