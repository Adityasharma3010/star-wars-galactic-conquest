import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import OriginalTheme from '../../src/components/OriginalTheme.jsx';
import { loadThemePlayer } from '../../src/services/originalTheme.js';
vi.mock('../../src/services/originalTheme.js', async (original) => ({
  ...(await original()),
  loadThemePlayer: vi.fn(),
}));
afterEach(cleanup);

it('does not create or play a late-loading official player after the intro is skipped', async () => {
  let ready;
  vi.mocked(loadThemePlayer).mockReturnValue(
    new Promise((resolve) => {
      ready = resolve;
    }),
  );
  const Player = vi.fn();
  const view = render(<OriginalTheme playing audible volume={0.5} />);
  view.unmount();
  await act(async () => ready({ Player }));
  expect(Player).not.toHaveBeenCalled();
});

it('uses the original recording, respects mute/volume, and destroys playback on exit', async () => {
  let options;
  const frame = document.createElement('iframe');
  const player = {
    setVolume: vi.fn(),
    unMute: vi.fn(),
    mute: vi.fn(),
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    destroy: vi.fn(),
    getIframe: () => frame,
    getPlayerState: () => 1,
  };
  vi.mocked(loadThemePlayer).mockResolvedValue({
    Player: class {
      constructor(host, config) {
        options = config;
        host.append(frame);
        return player;
      }
    },
  });
  const view = render(<OriginalTheme playing audible volume={0.5} />);
  await act(async () => {});
  act(() => options.events.onReady({ target: player }));
  expect(options.videoId).toBe('e9lapdvLSGw');
  expect(frame.title).toContain('Original Star Wars Main Title');
  expect(player.playVideo).toHaveBeenCalled();
  expect(player.setVolume).toHaveBeenLastCalledWith(50);
  act(() => options.events.onStateChange({ data: 1 }));
  expect(screen.getByText('Main Title · playing')).toBeInTheDocument();
  expect(document.querySelector('aside.original-theme-panel')).not.toBeVisible();
  view.rerender(<OriginalTheme playing audible={false} volume={0.2} />);
  expect(player.mute).toHaveBeenCalled();
  expect(player.setVolume).toHaveBeenLastCalledWith(20);
  const visibility = vi.spyOn(document, 'visibilityState', 'get');
  visibility.mockReturnValue('hidden');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(player.pauseVideo).toHaveBeenCalled();
  visibility.mockReturnValue('visible');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(player.playVideo.mock.calls.length).toBeGreaterThan(1);
  visibility.mockRestore();
  view.unmount();
  expect(player.destroy).toHaveBeenCalledOnce();
});
