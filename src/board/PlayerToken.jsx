import { useGameStore } from '../stores/gameStore.js';
import PawnArt from '../components/PawnArt.jsx';
import { tilePosition } from './BoardTile.jsx';
export function tokenCoordinates(position, index = 0, count = 1) {
  const pos = tilePosition(position),
    edge = 1.5,
    total = 9 + 2 * edge;
  const center = (cell) =>
    cell === 1 ? edge / 2 : cell === 11 ? edge + 9 + edge / 2 : edge + cell - 1.5;
  const corner = position % 10 === 0;
  const vertical = !corner && (pos.row === 1 || pos.row === 11);
  const columns =
    count === 1
      ? 1
      : corner
        ? Math.min(3, count)
        : vertical
          ? Math.min(2, count)
          : Math.min(4, count);
  const rows = Math.ceil(count / columns);
  const dx = ((index % columns) - (columns - 1) / 2) * (corner ? 0.44 : vertical ? 0.42 : 0.31);
  const dy =
    (Math.floor(index / columns) - (rows - 1) / 2) * (corner ? 0.44 : vertical ? 0.31 : 0.42);
  return {
    left: ((center(pos.col) + dx) / total) * 100 + '%',
    top: ((center(pos.row) + dy) / total) * 100 + '%',
  };
}
export default function PlayerToken({ player, position }) {
  const active = useGameStore(
    (state) =>
      state.game.phase !== 'finished' && state.game.players[state.game.turn].id === player.id,
  );
  const game = useGameStore((state) => state.game),
    hovered = useGameStore((state) => state.hoveredPlayer);
  const at = position ?? player.position;
  const occupants = game.players.filter((pawn) => !pawn.bankrupt && pawn.position === at);
  const slot = Math.max(
    0,
    occupants.findIndex((pawn) => pawn.id === player.id),
  );
  return (
    <div
      className={
        'player-token ' +
        (active ? 'active-token ' : '') +
        (hovered === player.id ? 'hovered-token' : '')
      }
      data-token={player.id}
      aria-label={`${player.name} at space ${player.position}`}
      style={{
        ...tokenCoordinates(at, slot, occupants.length || 1),
        color: player.color,
        '--pawn-density': occupants.length > 4 ? 0.62 : occupants.length > 1 ? 0.8 : 1,
      }}
    >
      <span className="token-aura" aria-hidden="true" />
      <span className="pawn-shell">
        <PawnArt
          name={player.name}
          color={player.color}
          size={32}
          look={at <= 10 ? 'right' : at <= 20 ? 'down' : at <= 30 ? 'left' : 'up'}
        />
      </span>
    </div>
  );
}
