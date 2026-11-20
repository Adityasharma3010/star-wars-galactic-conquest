import { writeFile } from 'node:fs/promises';

// Original, quiet plucked instrumental for Default boards. No sampled recordings.
const rate = 22050,
  beat = 0.6,
  duration = beat * 64;
const samples = new Float64Array(Math.ceil(rate * duration));
const chords = [
  [48, 55, 60, 64],
  [45, 52, 57, 60],
  [41, 48, 53, 57],
  [43, 50, 55, 59],
];
const add = (midi, start, length, volume) => {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  for (let i = 0; i < rate * length; i++) {
    const t = i / rate,
      index = Math.round(start * rate) + i;
    const envelope = Math.min(t / 0.012, 1) * Math.exp(-3.2 * t);
    const signal =
      Math.sin(2 * Math.PI * frequency * t) + 0.22 * Math.sin(4 * Math.PI * frequency * t);
    samples[index % samples.length] += signal * envelope * volume;
  }
};
for (let bar = 0; bar < 16; bar++) {
  const notes = chords[bar % chords.length];
  add(notes[0] - 12, bar * 4 * beat, 3, 0.12);
  for (let step = 0; step < 8; step++)
    add(notes[[0, 1, 2, 1, 3, 2, 1, 2][step]] + 12, (bar * 4 + step / 2) * beat, 2.4, 0.07);
}
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples.length * 2, 40);
samples.forEach((value, index) =>
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2),
);
await writeFile('public/audio/music/city-evening.wav', wav);
console.log('Generated original City Evening instrumental.');
