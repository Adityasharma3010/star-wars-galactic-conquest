export function restoreSession(saved = {}, current = {}) {
  const candidate = saved.game;
  const valid =
    Array.isArray(candidate?.players) &&
    candidate.players.length >= 2 &&
    typeof candidate.phase === 'string' &&
    Number.isInteger(candidate.version);
  const legacyPreview =
    valid &&
    candidate.id === 'local' &&
    candidate.version === 0 &&
    ['ai-vader', 'ai-leia', 'ai-han'].every((id) => candidate.players.some((p) => p.id === id));
  const game = valid && !legacyPreview ? candidate : null;
  return {
    ...current,
    ...saved,
    boardView: saved.boardView === '3d' ? '3d' : '2d',
    game,
    playing: Boolean(
      game &&
      (saved.playing === true || (saved.online && !saved.matchAway && game.phase !== 'finished')),
    ),
  };
}
