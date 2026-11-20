import { CHARACTERS } from '../game/rules/data.js';
import { tokensFor } from '../game/maps.js';
import { useGameStore } from '../stores/gameStore.js';
import { TokenArt } from '../components/Art.jsx';
import { tilePosition } from './BoardTile.jsx';
export function tokenCoordinates(position, index = 0) {
  const pos = tilePosition(position),
    edge = 1.5,
    total = 9 + 2 * edge;
  const center = (cell) =>
    cell === 1 ? edge / 2 : cell === 11 ? edge + 9 + edge / 2 : edge + cell - 1.5;
  return {
    left: ((center(pos.col) + ((index % 4) - 0.8) * 0.17) / total) * 100 + '%',
    top: ((center(pos.row) + (index > 3 ? -0.22 : 0.04)) / total) * 100 + '%',
  };
}
export default function PlayerToken({ player, index, position }) {
  const active = useGameStore((state) => state.game.players[state.game.turn].id === player.id);
  return (
    <div
      className={'player-token ' + (active ? 'active-token' : '')}
      data-token={player.id}
      aria-label={`${player.name} at space ${player.position}`}
      style={{ ...tokenCoordinates(position ?? player.position, index), color: player.color }}
    >
      <span className="token-aura" aria-hidden="true" />
      <TokenArt
        character={
          tokensFor(useGameStore.getState().game).find((c) => c.id === player.character) || {
            ...tokensFor(useGameStore.getState().game)[0],
            color: player.color,
          }
        }
        size={24}
      />
    </div>
  );
}
