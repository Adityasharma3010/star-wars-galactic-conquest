import { describe, it, expect } from 'vitest';
import { createGame, transition } from '../../src/game/engine/game.js';
import { planStages } from '../../src/game/presentation.js';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const roll = (state, rng) =>
  transition(
    state,
    {
      id: crypto.randomUUID(),
      type: 'ROLL',
      payload: {},
      player: 'a',
      now: 100,
      version: state.version,
    },
    rng,
  );

describe('roll presentation stages', () => {
  it('shows travel first and keeps rent for the final state', () => {
    const start = createGame(players);
    start.ownership[3] = { owner: 'b', level: 0, mortgaged: false };
    const next = roll(start, sequence([0, 0.2])); // 1 + 2 = 3
    const plan = planStages(start, next);
    expect(plan).not.toBeNull();
    const [travel] = plan.stages;
    expect(travel.kind).toBe('travel');
    expect(travel.state.players[0].position).toBe(3);
    expect(travel.state.players[0].credits).toBe(start.players[0].credits);
    expect(next.players[0].credits).toBeLessThan(start.players[0].credits);
    expect(plan.final.players[0].credits).toBe(next.players[0].credits);
    expect(plan.final.movement).toBeNull();
    expect(plan.final.version).toBe(next.version);
    expect(travel.state.version).toBeLessThan(next.version);
    expect(travel.state.version).toBeGreaterThan(start.version);
  });

  it('does not stage unrelated or non-sequential updates', () => {
    const start = createGame(players);
    expect(planStages(start, start)).toBeNull();
    expect(planStages(start, { ...start, version: start.version + 3 })).toBeNull();
    expect(planStages(null, start)).toBeNull();
  });
});
