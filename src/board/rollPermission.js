import { useGameStore } from '../stores/gameStore.js';

/** True when the human on this device may roll now, including re-rolling after doubles. */
export function canRoll(state, moving = false) {
  const player = state.game?.players[state.game.turn];
  const phase = state.game?.phase;
  const rollingAgain = phase === 'end' && state.game?.extraTurn && !player?.detained;
  return Boolean(
    player &&
    (phase === 'roll' || rollingAgain) &&
    !player.ai &&
    !player.bankrupt &&
    !state.intro &&
    !state.busy &&
    !state.staging &&
    !state.matchAway &&
    !moving &&
    (!state.online || state.onlinePlayer === player.id),
  );
}

/**
 * One action for "roll": after doubles the engine first needs END and then ROLL, so we send both
 * in order. The player just sees a single "Roll again" button.
 */
export async function takeRoll() {
  const { dispatch, game } = useGameStore.getState();
  if (game.phase === 'end' && game.extraTurn) {
    await dispatch('END');
    const after = useGameStore.getState().game;
    if (after.phase !== 'roll' || after.turn !== game.turn) return;
  }
  await useGameStore.getState().dispatch('ROLL');
}
