// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Euler, Vector3 } from 'three';
import {
  tilePlan,
  piecePosition,
  diceRotation,
  scenePlan,
  scenePiecePosition,
} from '../../src/board/three/layout.js';

describe('the physical board follows the shared 40-space board', () => {
  it('puts Hyperspace at top left and follows the four clockwise edges without overlaps', () => {
    const plans = Array.from({ length: 40 }, (_, id) => tilePlan(id));
    expect(plans[0]).toMatchObject({ x: -10.5, z: -10.5 });
    expect(plans[10]).toMatchObject({ x: 10.5, z: -10.5 });
    expect(plans[20]).toMatchObject({ x: 10.5, z: 10.5 });
    expect(plans[30]).toMatchObject({ x: -10.5, z: 10.5 });
    expect(new Set(plans.map(({ x, z }) => `${x},${z}`)).size).toBe(40);
    for (const [index, plan] of plans.entries()) {
      expect(Math.abs(plan.x) + plan.width / 2).toBeLessThanOrEqual(12);
      expect(Math.abs(plan.z) + plan.depth / 2).toBeLessThanOrEqual(12);
      for (const other of plans.slice(index + 1))
        expect(
          Math.abs(plan.x - other.x) >= (plan.width + other.width) / 2 ||
            Math.abs(plan.z - other.z) >= (plan.depth + other.depth) / 2,
        ).toBe(true);
    }
    for (const invalid of [-1, 40, 2.5, NaN]) expect(() => tilePlan(invalid)).toThrow(RangeError);
  });

  it('keeps eight pieces separated and within even the narrow spaces', () => {
    for (const id of [0, 1, 11, 21, 31]) {
      const plan = tilePlan(id);
      const positions = Array.from({ length: 8 }, (_, index) => piecePosition(id, index));
      for (const [index, position] of positions.entries()) {
        expect(Math.abs(position.x - plan.x) + 0.24).toBeLessThanOrEqual(plan.width / 2);
        expect(Math.abs(position.z - plan.z) + 0.24).toBeLessThanOrEqual(plan.depth / 2);
        for (const other of positions.slice(index + 1))
          expect(Math.hypot(position.x - other.x, position.z - other.z)).toBeGreaterThanOrEqual(
            0.47,
          );
      }
    }
  });
});

it('each committed dice value faces upward after its three-dimensional rotation', () => {
  const faces = [4, 3, 1, 6, 2, 5];
  const normals = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (let value = 1; value <= 6; value++) {
    const rotation = new Euler(...diceRotation(value));
    expect(new Vector3(...normals[faces.indexOf(value)]).applyEuler(rotation).y).toBeCloseTo(1);
  }
});

it('keeps all forty holotable spaces in clockwise order and eight pawns separated within a sector', () => {
  const plans = Array.from({ length: 40 }, (_, id) => scenePlan(id, false));
  expect(new Set(plans.map((plan) => `${plan.x},${plan.z}`)).size).toBe(40);
  expect(plans[0].x).toBeLessThan(0);
  expect(plans[0].z).toBeLessThan(0);
  for (let id = 0; id < 40; id++) {
    const plan = plans[id],
      next = plans[(id + 1) % 40];
    expect(Math.hypot(plan.x, plan.z)).toBeCloseTo(10.8);
    expect(plan.x * next.z - plan.z * next.x).toBeGreaterThan(0);
    const positions = Array.from({ length: 8 }, (_, index) =>
      scenePiecePosition(id, index, 8, false),
    );
    for (const [index, point] of positions.entries()) {
      expect(Math.abs(Math.hypot(point.x, point.z) - 10.8)).toBeLessThan(1.1);
      for (const other of positions.slice(index + 1))
        expect(Math.hypot(point.x - other.x, point.z - other.z)).toBeGreaterThanOrEqual(0.49);
    }
  }
});
