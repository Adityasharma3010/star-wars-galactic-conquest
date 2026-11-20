import { afterEach, expect, it, vi } from 'vitest';
import { createMusicMixer } from '../../src/services/matchMusic.js';
afterEach(() => vi.useRealTimers());
function fixture(resolve) {
  const audio = [];
  const createAudio = () => {
    const item = {
      src: '',
      volume: 0,
      duration: 100,
      currentTime: 0,
      paused: true,
      ended: false,
      play: vi.fn(async () => {
        item.paused = false;
      }),
      pause: vi.fn(() => {
        item.paused = true;
      }),
      removeAttribute() {},
      load() {},
    };
    audio.push(item);
    return item;
  };
  const state = vi.fn();
  const mixer = createMusicMixer({ createAudio, resolve, onState: state, fadeMs: 200 });
  const config = {
    active: true,
    muted: false,
    volume: 0.08,
    shuffle: false,
    tracks: [
      { id: 'a', src: 'a.mp3', title: 'A' },
      { id: 'b', src: 'b.mp3', title: 'B' },
    ],
  };
  return { audio, state, mixer, config };
}
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
it('crossfades playlist boundaries and preserves the track across routine state updates', async () => {
  vi.useFakeTimers();
  const { audio, mixer, config, state } = fixture();
  mixer.configure(config);
  await flush();
  vi.advanceTimersByTime(240);
  expect(audio[0].volume).toBeCloseTo(0.08);
  mixer.configure({ ...config });
  await flush();
  expect(audio[0].play).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(240);
  audio[0].currentTime = 99.9;
  audio[0].ontimeupdate();
  await flush();
  vi.advanceTimersByTime(240);
  expect(state).toHaveBeenLastCalledWith({ status: 'playing', track: config.tracks[1] });
  expect(audio[0].paused).toBe(true);
  expect(audio[1].volume).toBeCloseTo(0.08);
  mixer.dispose();
  expect(audio[1].paused).toBe(true);
});
it('cancels a pending song before it can start when the match or intro changes', async () => {
  let ready;
  const { audio, mixer, config } = fixture(
    () =>
      new Promise((resolve) => {
        ready = resolve;
      }),
  );
  mixer.configure(config);
  mixer.configure({ ...config, active: false });
  ready('a.mp3');
  await flush();
  expect(audio).toHaveLength(0);
  mixer.dispose();
});
it('honors a source chosen while muted and starts that source when unmuted', async () => {
  vi.useFakeTimers();
  const { audio, mixer, config } = fixture();
  mixer.configure(config);
  await flush();
  vi.advanceTimersByTime(240);
  const personal = {
    ...config,
    muted: true,
    tracks: [{ id: 'personal', src: 'blob:personal', title: 'Personal' }],
  };
  mixer.configure(personal);
  mixer.configure({ ...personal, muted: false });
  await flush();
  vi.advanceTimersByTime(240);
  expect(audio.at(-1).src).toBe('blob:personal');
  expect(audio.at(-1).volume).toBeCloseTo(0.08);
  mixer.dispose();
});
