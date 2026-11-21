// @vitest-environment node
import { expect, it } from 'vitest';
import { canRoll } from '../../src/board/rollPermission.js';
const state = {
  game: { phase: 'roll', turn: 0, players: [{ id: 'you', ai: false }] },
  online: false,
};
it('allows local human and the online player whose turn it is', () => {
  expect(canRoll(state)).toBe(true);
  expect(canRoll({ ...state, online: true, onlinePlayer: 'you' })).toBe(true);
});
it.each(['busy', 'intro', 'matchAway'])('blocks clicking dice while %s', (key) => {
  expect(canRoll({ ...state, [key]: true })).toBe(false);
});
it('blocks spectators, opponents, movement, AI, and other phases', () => {
  expect(canRoll({ ...state, online: true, onlinePlayer: null })).toBe(false);
  expect(canRoll({ ...state, online: true, onlinePlayer: 'opponent' })).toBe(false);
  expect(canRoll(state, true)).toBe(false);
  expect(canRoll({ ...state, game: { ...state.game, phase: 'end' } })).toBe(false);
  expect(canRoll({ ...state, game: { ...state.game, players: [{ id: 'you', ai: true }] } })).toBe(
    false,
  );
});
