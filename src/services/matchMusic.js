export function createMusicMixer({
  createAudio = () => new Audio(),
  resolve = (track) => track.src,
  onState = () => {},
  fadeMs = 2200,
} = {}) {
  let config = { active: false, muted: false, volume: 0.06, tracks: [], shuffle: false };
  const channels = [];
  const requests = [];
  let current = -1,
    index = -1,
    cursor = 0,
    epoch = 0,
    fading,
    transitioning = false,
    disposed = false;
  const usable = () => !disposed && config.active && !config.muted && config.tracks.length > 0;
  const volume = () => Math.max(0, Math.min(1, config.volume));
  const clearFade = () => {
    clearInterval(fading);
    fading = undefined;
  };
  function fade(target, old, length, finished) {
    clearFade();
    const began = Date.now(),
      from = target.volume,
      previous = old?.volume || 0;
    fading = setInterval(() => {
      const progress = Math.min(1, (Date.now() - began) / Math.max(1, length));
      target.volume = from + (volume() - from) * progress;
      if (old) old.volume = previous * (1 - progress);
      if (progress === 1) {
        clearFade();
        old?.pause();
        finished?.();
      }
    }, 40);
  }
  function pause() {
    epoch++;
    transitioning = false;
    clearFade();
    const starts = channels.map((audio) => audio.volume),
      began = Date.now();
    if (!channels.length) return;
    fading = setInterval(() => {
      const progress = Math.min(1, (Date.now() - began) / 180);
      channels.forEach((audio, n) => {
        audio.volume = starts[n] * (1 - progress);
      });
      if (progress === 1) {
        clearFade();
        channels.forEach((audio) => audio.pause());
      }
    }, 30);
    onState({ status: 'paused', track: config.tracks[index] });
  }
  const nextIndex = () =>
    config.shuffle && config.tracks.length > 1
      ? (cursor + 1 + Math.floor(Math.random() * (config.tracks.length - 1))) % config.tracks.length
      : (cursor + 1) % config.tracks.length;
  async function start(at, resume = false) {
    if (!usable() || transitioning) return;
    const request = ++epoch;
    cursor = at;
    transitioning = true;
    const slot = resume && current >= 0 ? current : current === 0 ? 1 : 0;
    const track = config.tracks[at];
    onState({ status: 'loading', track });
    let audio;
    try {
      const url = await resolve(track);
      if (request !== epoch || !usable()) return;
      audio = channels[slot] ||= createAudio();
      requests[slot] = request;
      if (!resume) {
        audio.pause();
        audio.src = url;
        audio.preload = 'auto';
        audio.volume = 0;
      }
      audio.ontimeupdate = () => {
        if (
          current === slot &&
          usable() &&
          !transitioning &&
          Number.isFinite(audio.duration) &&
          audio.duration - audio.currentTime <= Math.min(fadeMs / 1000, audio.duration / 4)
        )
          start(nextIndex());
      };
      audio.onended = () => {
        if (current === slot && usable() && !transitioning) start(nextIndex());
      };
      await audio.play();
      if (request !== epoch || !usable()) {
        if (requests[slot] === request) audio.pause();
        return;
      }
      const old = !resume && current >= 0 ? channels[current] : null;
      current = slot;
      index = at;
      onState({ status: 'playing', track });
      const length = Number.isFinite(audio.duration)
        ? Math.min(fadeMs, Math.max(40, audio.duration * 250))
        : fadeMs;
      fade(audio, old, resume ? Math.min(350, length) : length, () => {
        transitioning = false;
        if (audio.ended && usable()) start(nextIndex());
      });
    } catch (error) {
      if (request !== epoch || !usable()) return;
      transitioning = false;
      channels.forEach((channel) => channel.pause());
      current = -1;
      index = -1;
      onState({
        status: error.name === 'NotAllowedError' ? 'blocked' : 'error',
        track,
        message:
          error.name === 'NotAllowedError'
            ? 'Tap Play to start your background music.'
            : 'This song could not play. Choose another track or try again.',
      });
    }
  }
  return {
    configure(next) {
      const changed =
        config.tracks.map((track) => track.id).join('|') !==
        next.tracks.map((track) => track.id).join('|');
      const wasUsable = usable();
      config = next;
      if (changed && !usable()) {
        epoch++;
        transitioning = false;
        clearFade();
        channels.forEach((audio) => audio.pause());
        current = -1;
        index = -1;
        cursor = 0;
        onState({ status: 'paused', track: config.tracks[0] });
        return;
      }
      if (!usable()) {
        pause();
        return;
      }
      if (changed) {
        epoch++;
        transitioning = false;
        clearFade();
        start(0);
      } else if (!wasUsable || current < 0) {
        clearFade();
        transitioning = false;
        start(Math.max(0, index), current >= 0);
      } else if (current >= 0 && !transitioning) fade(channels[current], null, 200);
    },
    next() {
      if (usable()) {
        const at = nextIndex();
        epoch++;
        transitioning = false;
        clearFade();
        start(at);
      }
    },
    play() {
      if (usable() && !transitioning && (current < 0 || channels[current]?.paused)) {
        clearFade();
        start(Math.max(0, index), current >= 0);
      }
    },
    dispose() {
      disposed = true;
      epoch++;
      clearFade();
      channels.forEach((audio) => {
        audio.pause();
        audio.ontimeupdate = audio.onended = null;
        audio.removeAttribute('src');
        audio.load();
      });
    },
  };
}
