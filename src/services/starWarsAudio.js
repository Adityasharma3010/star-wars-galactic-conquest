const files = {
  saber: '/audio/lightsaber.mp3',
  blaster: '/audio/blaster.mp3',
  droid: '/audio/droid.mp3',
};
const cues = {
  click: ['droid', 0, 0.32, 0.65],
  roll: ['saber', 0, 1.15, 0.85],
  purchase: ['blaster', 0, 1.4, 0.75],
  money: ['droid', 0.18, 0.7, 0.9],
  card: ['saber', 4.2, 0.9, 0.8],
  build: ['saber', 7.0, 1, 0.85],
  move: ['saber', 4.2, 0.18, 0.35],
  countdown: ['droid', 0.1, 0.16, 0.7],
  victory: ['saber', 0, 2.8, 1],
};
let context, loading, bank, atmosphere;
function audioContext() {
  context ||= new (window.AudioContext || window.webkitAudioContext)();
  return context;
}
export function preloadAudio() {
  if (loading) return loading;
  loading = Promise.all(
    Object.entries(files).map(async ([name, url]) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Unable to load ' + url);
      return [name, await r.arrayBuffer()];
    }),
  )
    .then((entries) => Object.fromEntries(entries))
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}
async function buffers() {
  if (bank) return bank;
  const raw = await preloadAudio(),
    ctx = audioContext();
  const entries = await Promise.all(
    Object.entries(raw).map(async ([name, bytes]) => [
      name,
      await ctx.decodeAudioData(bytes.slice(0)),
    ]),
  );
  bank = Object.fromEntries(entries);
  return bank;
}
export async function playSound(kind, settings = {}) {
  if (settings.mute) return;
  try {
    const ctx = audioContext();
    await ctx.resume();
    const clips = await buffers();
    const [name, offset, length, level] = cues[kind] || cues.click;
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = clips[name];
    source.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime,
      duration = Math.min(length, source.buffer.duration - offset);
    if (duration <= 0) return;
    gain.gain.setValueAtTime(
      (settings.volume ?? 0.45) * (settings.effectsVolume ?? 0.8) * level,
      now,
    );
    gain.gain.setTargetAtTime(0, now + Math.max(0.02, duration - 0.05), 0.02);
    source.start(now, offset, duration);
  } catch {
    /* Missing/unsupported audio must not interrupt a committed game action. */
  }
}
export async function setAtmosphere(settings = {}) {
  if (!navigator.userActivation?.hasBeenActive) return;
  try {
    const ctx = audioContext();
    if (!atmosphere) {
      const clips = await buffers();
      if (atmosphere) return;
      atmosphere = { ambient: ctx.createGain(), music: ctx.createGain() };
      for (const channel of ['ambient', 'music']) {
        const source = ctx.createBufferSource();
        source.buffer = clips.saber;
        source.loop = true;
        source.loopStart = channel === 'ambient' ? 1.5 : 10;
        source.loopEnd = channel === 'ambient' ? 3.5 : 13;
        source.playbackRate.value = channel === 'ambient' ? 0.38 : 0.25;
        source.connect(atmosphere[channel]);
        atmosphere[channel].connect(ctx.destination);
        atmosphere[channel].gain.value = 0;
        source.start();
      }
    }
    for (const channel of ['ambient', 'music'])
      atmosphere[channel].gain.setTargetAtTime(
        settings.mute
          ? 0
          : (settings.volume ?? 0.45) *
              (settings[channel === 'ambient' ? 'ambience' : 'music']
                ? (settings[channel + 'Volume'] ?? 0.2)
                : 0) *
              0.14,
        ctx.currentTime,
        0.2,
      );
  } catch {}
}
export const SOUND_PACK = [
  { kind: 'roll', label: 'Dice · lightsaber ignition', source: 'Saber recreation' },
  { kind: 'click', label: 'Buttons · R2-D2 chirp', source: 'Droid recording' },
  { kind: 'purchase', label: 'Acquisition · blaster shot', source: 'Blaster recording' },
  { kind: 'money', label: 'Credits · droid response', source: 'Droid recording' },
  { kind: 'card', label: 'Events · lightsaber sweep', source: 'Saber recreation' },
  { kind: 'countdown', label: 'Auction · droid alert', source: 'Droid recording' },
  { kind: 'victory', label: 'Victory · saber power-up', source: 'Saber recreation' },
];

let openingBuffer, openingLoading;
export async function playOpeningMusic(settings = {}, cancelled = () => false) {
  if (settings.mute || settings.introMusic === false) return () => {};
  try {
    const ctx = audioContext();
    await ctx.resume();
    if (!openingBuffer) {
      openingLoading ||= fetch('/audio/opening.mp3')
        .then(async (response) => {
          if (!response.ok) throw new Error('Opening music unavailable.');
          return ctx.decodeAudioData(await response.arrayBuffer());
        })
        .then((buffer) => {
          openingBuffer = buffer;
          return buffer;
        })
        .catch((error) => {
          openingLoading = null;
          throw error;
        });
      await openingLoading;
    }
    if (cancelled()) return () => {};
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = openingBuffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(
      (settings.volume ?? 0.45) * (settings.musicVolume ?? 0.35),
      ctx.currentTime,
    );
    source.start();
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
      try {
        source.stop(ctx.currentTime + 0.3);
      } catch {}
    };
  } catch {
    return () => {};
  }
}
