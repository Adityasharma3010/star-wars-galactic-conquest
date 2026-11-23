// @vitest-environment node
import { expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { createPiece, createBuildings } from '../../src/board/three/pieces.js';

it('uses a substantial solid pawn with eyes and cast shadows instead of a flat sprite', () => {
  const resources = [];
  const piece = createPiece('#527acb', true, (resource) => {
    resources.push(resource);
    return resource;
  });
  const size = new Box3().setFromObject(piece).getSize(new Vector3());
  expect(size.y).toBeGreaterThan(1);
  expect(size.x).toBeGreaterThan(0.6);
  let sprites = 0,
    solidMeshes = 0,
    shadows = 0;
  piece.traverse((object) => {
    if (object.isSprite) sprites++;
    if (object.isMesh) {
      solidMeshes++;
      if (object.castShadow) shadows++;
    }
  });
  expect(sprites).toBe(0);
  expect(solidMeshes).toBeGreaterThanOrEqual(6);
  expect(shadows).toBeGreaterThanOrEqual(5);
  resources.forEach((resource) => resource.dispose());
});

it('represents four individual houses and replaces them with one solid hotel', () => {
  for (const classic of [true, false]) {
    const resources = [],
      register = (resource) => {
        resources.push(resource);
        return resource;
      };
    const houses = createBuildings(4, classic, register),
      hotel = createBuildings(5, classic, register);
    expect(houses.children).toHaveLength(4);
    expect(hotel.children).toHaveLength(1);
    const houseSize = new Box3().setFromObject(houses, true).getSize(new Vector3());
    const hotelSize = new Box3().setFromObject(hotel, true).getSize(new Vector3());
    expect(houseSize.x).toBeLessThan(classic ? 2 : 1.45);
    expect(hotelSize.y).toBeGreaterThan(houseSize.y);
    let outlines = 0;
    hotel.traverse((object) => {
      if (object.isLineSegments) outlines++;
    });
    expect(outlines).toBe(0);
    resources.forEach((resource) => resource.dispose());
  }
});
