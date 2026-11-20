export function missionRecipient(game, event) {
  const id = event.player || game.movement?.player || game.players[game.turn]?.id;
  return game.players.find((player) => player.id === id);
}
export function canAcceptMission(game, event, online, onlinePlayer) {
  const player = missionRecipient(game, event);
  return Boolean(player && (online ? player.id === onlinePlayer : !player.ai));
}
