import { mkdir, writeFile } from 'node:fs/promises';
const names = ['mars', 'earth_daymap', 'earth_nightmap', 'jupiter', 'moon', 'earth_clouds'];
const root = new URL('../public/images/space-surfaces/', import.meta.url);
await mkdir(root, { recursive: true });
for (const name of names) {
  const source = 'https://www.solarsystemscope.com/textures/download/2k_' + name + '.jpg';
  const response = await fetch(source);
  if (!response.ok || !response.headers.get('content-type')?.includes('image'))
    throw new Error('Texture download failed: ' + name);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Expected JPEG: ' + name);
  await writeFile(new URL(name + '.jpg', root), bytes);
  console.log(name + ': ' + bytes.length + ' bytes');
}
await writeFile(
  new URL('CREDITS.md', root),
  '# Planet surface materials\n\nEquirectangular textures by **Solar System Scope / INOVE**, [source collection](https://www.solarsystemscope.com/textures/), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). These are adapted NASA-based solar-system materials, colorized and combined with original procedural masks for fictional game worlds. They are not official Star Wars planet maps.\n\n' +
    names
      .map(
        (name) =>
          '- ' + name + ': https://www.solarsystemscope.com/textures/download/2k_' + name + '.jpg',
      )
      .join('\n') +
    '\n',
);
