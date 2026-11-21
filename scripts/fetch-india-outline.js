import { writeFile } from 'node:fs/promises';
const source =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const response = await fetch(source);
if (!response.ok) throw new Error('Natural Earth download failed: ' + response.status);
const collection = await response.json();
const country = collection.features.find((feature) => feature.properties.ADMIN === 'India');
if (!country || !['Polygon', 'MultiPolygon'].includes(country.geometry.type))
  throw new Error('India geometry missing');
await writeFile(
  new URL('../src/assets/indiaOutline.json', import.meta.url),
  JSON.stringify({ source, license: 'Natural Earth public domain', geometry: country.geometry }) +
    '\n',
);
console.log('Saved the Natural Earth India outline.');
