let context;
export async function playClassicSound(kind, settings = {}) {
  if (settings.mute) return;
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    await context.resume();
    const volume = (settings.volume ?? 0.45) * (settings.effectsVolume ?? 0.8) * 0.16;
    if (['roll', 'card', 'click', 'move'].includes(kind)) {
      const length = kind === 'roll' ? 0.65 : kind === 'card' ? 0.35 : 0.06;
      const buffer = context.createBuffer(1, context.sampleRate * length, context.sampleRate),
        data = buffer.getChannelData(0);
      for (let n = 0; n < data.length; n++)
        data[n] =
          (Math.random() * 2 - 1) *
          Math.exp((-6 * n) / data.length) *
          (kind === 'roll' ? Math.abs(Math.sin((n / context.sampleRate) * 26)) : 1);
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'card' ? 1400 : 650;
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      return;
    }
    const notes =
      kind === 'victory'
        ? [523, 659, 784, 1046]
        : kind === 'purchase'
          ? [440, 660]
          : kind === 'build'
            ? [330, 440]
            : [740, 980];
    notes.forEach((frequency, index) => {
      const tone = context.createOscillator(),
        gain = context.createGain(),
        time = context.currentTime + index * 0.12;
      tone.type = 'sine';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.start(time);
      tone.stop(time + 0.3);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    });
  } catch {}
}
