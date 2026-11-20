import { it, expect, vi } from 'vitest';

it('cancels music that finishes loading after the intro is skipped and fades active playback on exit', async () => {
  vi.resetModules();
  let resolveAudio;
  const start = vi.fn(),
    stop = vi.fn(),
    fade = vi.fn();
  const ctx = {
    resume: async () => {},
    currentTime: 1,
    destination: {},
    decodeAudioData: async () => ({}),
    createBufferSource: () => ({ connect() {}, start, stop }),
    createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime: fade } }),
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return ctx;
      }
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((resolve) => {
          resolveAudio = resolve;
        }),
    ),
  );
  const { playOpeningMusic } = await import('../../src/services/starWarsAudio.js');
  let cancelled = false;
  const pending = playOpeningMusic({}, () => cancelled);
  await Promise.resolve();
  cancelled = true;
  resolveAudio({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  await pending;
  expect(start).not.toHaveBeenCalled();
  const end = await playOpeningMusic({});
  expect(start).toHaveBeenCalledOnce();
  end();
  end();
  expect(fade).toHaveBeenCalledWith(0, 1, 0.06);
  expect(stop).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
