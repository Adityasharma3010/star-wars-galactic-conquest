import { mkdir, writeFile } from 'node:fs/promises';
import { BOARD } from '../src/game/rules/data.js';

// Read only the canonical page's reference-image metadata; retain attribution.
const extra = [
  ['death-star', 'https://www.starwars.com/databank/death-star'],
  ['millennium-falcon', 'https://www.starwars.com/databank/millennium-falcon'],
  ['star-destroyer', 'https://www.starwars.com/databank/imperial-star-destroyer'],
  ['blockade-runner', 'https://www.starwars.com/databank/tantive-iv/'],
  ['executor', 'https://www.starwars.com/databank/executor'],
];
const references = [...BOARD.filter((t) => t.source).map((t) => [t.name, t.source]), ...extra];
const images = {};
for (let i = 0; i < references.length; i += 4) {
  const results = await Promise.allSettled(
    references.slice(i, i + 4).map(async ([name, url]) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
      const html = await r.text();
      const meta = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (!meta?.[1]?.startsWith('https://lumiere-a.akamaihd.net/'))
        throw new Error(name + ': no official image metadata');
      return {
        name,
        source: url,
        image: meta[1].replaceAll('&amp;', '&'),
        rights:
          'Star Wars reference image © Lucasfilm Ltd.; official Databank source. Not royalty-free.',
      };
    }),
  );
  for (const result of results) {
    if (result.status === 'fulfilled') {
      images[result.value.name] = result.value;
      console.log('Located official reference image: ' + result.value.name);
    } else console.error(result.reason.message);
  }
}
await writeFile(
  'src/assets/referenceImages.js',
  '// Official reference images selected for the owner-requested non-commercial fan theme.\nexport const REFERENCE_IMAGES = ' +
    JSON.stringify(images, null, 2) +
    ';\n',
);
const sounds = [
  {
    file: 'blaster.mp3',
    url: 'https://cdn.freesound.org/previews/466/466834_8430571-hq.mp3',
    source: 'https://freesound.org/people/MikeE63/sounds/466834/',
    name: 'Enhanced blaster',
    author: 'MikeE63',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    file: 'droid.mp3',
    url: 'https://cdn.freesound.org/previews/404/404759_140737-hq.mp3',
    source: 'https://freesound.org/people/OwlStorm/sounds/404759/',
    name: 'R2-D2-style chirp',
    author: 'Ashe Kirk / OwlStorm / Owlish Media',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    file: 'lightsaber.mp3',
    url: 'https://cdn.freesound.org/previews/848/848168_18522131-hq.mp3',
    source: 'https://freesound.org/people/posdesigndesom/sounds/848168/',
    name: 'Lightsaber recreation',
    author: 'Bruna Mattos, João Gilberto Tenório, Taiane Ketily / posdesigndesom',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
];
await mkdir('public/audio', { recursive: true });
for (const sound of sounds) {
  const r = await fetch(sound.url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(sound.file + ': HTTP ' + r.status);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length < 1000) throw new Error('Invalid sound file');
  await writeFile('public/audio/' + sound.file, bytes);
  console.log('Downloaded licensed recording: ' + sound.name + ' (' + bytes.length + ' bytes)');
}
await writeFile(
  'public/audio/CREDITS.md',
  '# Built-in Star Wars sound effects\n\nCreator-made recreations of familiar Star Wars sounds. No RichUp files or film soundtrack samples.\n\n' +
    sounds
      .map(
        (s) =>
          '- **' +
          s.name +
          '** by ' +
          s.author +
          '. [' +
          s.license +
          '](' +
          s.licenseUrl +
          '). [Original source](' +
          s.source +
          '). The public high-quality preview is bundled; excerpts are played for UI actions.',
      )
      .join('\n'),
);
await writeFile('public/audio/manifest.json', JSON.stringify(sounds, null, 2));
console.log(Object.keys(images).length + ' official location/vehicle reference images recorded.');
