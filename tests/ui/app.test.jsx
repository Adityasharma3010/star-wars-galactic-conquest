import React from 'react';
import { beforeAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import App from '../../src/app/App.jsx';
import { useGameStore } from '../../src/stores/gameStore.js';
beforeAll(() => {
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
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
    expect(screen.getByRole('heading', { name: 'THE GALAXY AWAITS.' })).toBeVisible();
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
});
