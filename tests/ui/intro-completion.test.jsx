import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameStore } from '../../src/stores/gameStore.js';
import { createGame } from '../../src/game/engine/game.js';
import MatchOpening from '../../src/components/MatchOpening.jsx';

vi.mock('motion/react', async (original) => ({
  ...(await original()),
  useReducedMotion: () => false,
}));
vi.mock('../../src/components/OriginalTheme.jsx', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('starts the match when the crawl animation completes and restores page scrolling', async () => {
  vi.useFakeTimers();
  const game = createGame([
    { id: 'you', name: 'Nova', ai: false },
    { id: 'rival', name: 'Orion', ai: true },
  ]);
  useGameStore.setState({
    game,
    playing: true,
    intro: { gameId: game.id },
    settings: { mute: true, reducedMotion: false },
  });
  render(<MatchOpening />);
  await act(async () => vi.advanceTimersByTime(5100));
  const crawl = document.querySelector('.opening-crawl');
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: 'opening-crawl' });
  act(() => crawl.dispatchEvent(event));
  expect(useGameStore.getState().intro).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
  await useGameStore.getState().dispatch('ROLL');
  expect(useGameStore.getState().game.version).toBe(1);
});

it('ends promptly after the last line clears the horizon instead of leaving empty space', async () => {
  vi.useFakeTimers();
  const game = createGame([
    { id: 'you', name: 'Nova' },
    { id: 'rival', name: 'Orion' },
  ]);
  useGameStore.setState({
    game,
    playing: true,
    intro: { gameId: game.id },
    settings: { mute: true, reducedMotion: false },
  });
  render(<MatchOpening />);
  await act(async () => vi.advanceTimersByTime(5100));
  const lastLine = document.querySelector('.opening-crawl').lastElementChild;
  vi.spyOn(lastLine, 'getBoundingClientRect').mockReturnValue({ bottom: 20 });
  await act(async () => vi.advanceTimersByTime(150));
  expect(useGameStore.getState().intro).toBeNull();
});
