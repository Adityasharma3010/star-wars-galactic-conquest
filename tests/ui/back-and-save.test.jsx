import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Dialogs from '../../src/pages/Dialogs.jsx';
import { useGameStore } from '../../src/stores/gameStore.js';
import { syncSettings } from '../../src/services/supabase.js';

vi.mock('../../src/services/supabase.js', async (importOriginal) => ({
  ...(await importOriginal()),
  cloudProfile: async () => null,
  syncSettings: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(syncSettings).mockReset();
  useGameStore.setState({
    modal: null,
    modalHistory: [],
    game: null,
    playing: false,
    error: null,
    settings: { ...useGameStore.getState().settings, mute: true, reducedMotion: true },
  });
});
afterEach(cleanup);

it('Back returns to the previous dialog and closing clears its navigation history', () => {
  const state = useGameStore.getState();
  state.open('profile');
  state.open('history');
  state.back();
  expect(useGameStore.getState().modal).toBe('profile');
  state.close();
  state.open('settings');
  state.back();
  expect(useGameStore.getState().modal).toBeNull();
  expect(useGameStore.getState().modalHistory).toEqual([]);
});

it('Save & close keeps preferences editable after a failure and waits for successful saving', async () => {
  vi.mocked(syncSettings).mockRejectedValueOnce(new Error('Connection interrupted'));
  useGameStore.getState().open('settings');
  render(<Dialogs />);
  fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Connection interrupted'),
  );
  expect(useGameStore.getState().modal).toBe('settings');
  let finish;
  vi.mocked(syncSettings).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save & close' }));
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(useGameStore.getState().modal).toBe('settings');
  await act(async () => finish());
  expect(useGameStore.getState().modal).toBeNull();
  expect(syncSettings).toHaveBeenLastCalledWith(useGameStore.getState().settings);
});
