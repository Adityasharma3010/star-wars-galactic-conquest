export function canRoll(state, moving = false) {
  const player = state.game?.players[state.game.turn];
  return Boolean(
    player &&
    state.game.phase === 'roll' &&
    !player.ai &&
    !player.bankrupt &&
    !state.intro &&
    !state.busy &&
    !state.matchAway &&
    !moving &&
    (!state.online || state.onlinePlayer === player.id),
  );
}
