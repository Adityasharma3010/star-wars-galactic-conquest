// @vitest-environment node
import { expect, it } from 'vitest';
import { createIndiaAtlas } from '../../src/board/three/worlds.js';
import { boardFor } from '../../src/game/maps.js';
it('makes a finite raised map with all 22 capitals in their geographic directions', () => {
  const board = boardFor('india'),
    resources = new Set();
  const atlas = createIndiaAtlas(board, (resource) => {
    resources.add(resource);
    return resource;
  });
  const pins = atlas.userData.pickables;
  expect(pins).toHaveLength(22);
  const pin = (name) => pins.find((item) => board[item.userData.tileId].name === name);
  expect(pin('New Delhi').position.z).toBeLessThan(pin('Bengaluru').position.z);
  expect(pin('Chennai').position.x).toBeGreaterThan(pin('Mumbai').position.x);
  atlas.traverse((object) => {
    const positions = object.geometry?.attributes.position;
    if (positions) expect([...positions.array].every(Number.isFinite)).toBe(true);
  });
  resources.forEach((resource) => resource.dispose());
});
