import {
  Sparkles,
  Orbit,
  ShieldAlert,
  Radio,
  Zap,
  Rocket,
  LockKeyhole,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import DevelopmentArt from '../components/DevelopmentArt.jsx';
import { PlanetArt } from '../components/Art.jsx';
import { useGameStore } from '../stores/gameStore.js';
import { isClassic } from '../game/maps.js';
const icons = {
  force: Sparkles,
  galactic: Orbit,
  tax: Coins,
  transport: Rocket,
  utility: Zap,
  start: ArrowUpRight,
  detention: LockKeyhole,
  parking: Orbit,
  goDetention: ShieldAlert,
};
export function tilePosition(id) {
  if (id <= 10) return { row: 1, col: 1 + id };
  if (id <= 20) return { row: id - 9, col: 11 };
  if (id <= 30) return { row: 11, col: 31 - id };
  return { row: 41 - id, col: 1 };
}
export default function BoardTile({
  tile,
  ownership,
  players,
  rules = {},
  pot = 0,
  selected,
  onSelect,
}) {
  const hoveredPlayer = useGameStore((s) => s.hoveredPlayer),
    pinnedFilter = useGameStore((s) => s.boardOwnerFilter),
    filter = hoveredPlayer || pinnedFilter,
    hovered = players.find((p) => p.id === hoveredPlayer),
    isLocation = hovered && !hovered.bankrupt && hovered.position === tile.id;
  const activePlayer = useGameStore((state) => state.game.players[state.game.turn]);
  const gamePhase = useGameStore((state) => state.game.phase);
  const turnLocation =
    !hoveredPlayer &&
    gamePhase !== 'finished' &&
    !activePlayer.bankrupt &&
    activePlayer.position === tile.id;
  const pos = tilePosition(tile.id),
    Icon = tile.id === 28 ? Radio : icons[tile.type];
  const owner = players.find((p) => p.id === ownership?.owner);
  const classic = isClassic(rules);
  return (
    <button
      data-tile={tile.id}
      data-edge={
        tile.id <= 10 ? 'top' : tile.id <= 20 ? 'right' : tile.id <= 30 ? 'bottom' : 'left'
      }
      aria-label={`${tile.name}${tile.price ? `, ${tile.price} ${classic ? 'rupees' : 'credits'}` : ''}${owner ? `, owned by ${owner.name}` : ''}`}
      className={`board-tile ${isLocation ? 'player-location' : ''} ${turnLocation ? 'turn-location' : ''} ${tile.id % 10 === 0 ? 'corner' : ''} ${tile.type} ${selected ? 'selected' : ''} ${ownership?.mortgaged ? 'mortgaged' : ''} ${owner ? 'owned' : ''} ${filter ? (ownership?.owner === filter ? 'owner-emphasis' : 'owner-dim') : ''}`}
      style={{
        gridRow: pos.row,
        gridColumn: pos.col,
        '--group': tile.color || '#667991',
        '--owner': owner?.color || 'transparent',
        '--hover-color': hovered?.color || '#e5bd73',
        '--turn-player': activePlayer.color,
      }}
      onClick={() => onSelect(tile.id)}
    >
      {tile.color && <span className="group-stripe" />}
      {owner && (
        <span
          className="ownership-rail"
          style={{ '--holding-color': owner.color }}
          aria-hidden="true"
        />
      )}
      <span className="tile-trace" aria-hidden="true" />
      <span className="tile-pulse" aria-hidden="true" />
      {tile.type === 'property' || tile.type === 'transport' ? (
        <PlanetArt tile={tile} />
      ) : (
        <Icon className="tile-symbol" size={tile.id % 10 === 0 ? 27 : 19} strokeWidth={1.3} />
      )}
      <span className="tile-name">
        {!classic && tile.id === 25 ? 'Blockade Runner' : tile.name}
      </span>
      {isLocation && <span className="hover-location-label">{hovered.name}</span>}
      {(tile.price ||
        ['start', 'tax'].includes(tile.type) ||
        (tile.type === 'parking' && rules.freeParking)) && (
        <span className="tile-price">
          {tile.price
            ? `${classic ? '₹' : '◈'} ${tile.price}`
            : tile.type === 'start'
              ? 'COLLECT ' + (rules.startBonus ?? 200)
              : tile.type === 'tax'
                ? tile.id === 4
                  ? '10% ' + (rules.taxBasis === 'wealth' ? 'WEALTH' : 'CASH')
                  : (classic ? '₹ ' : '◈ ') + (rules.luxuryTax ?? 100)
                : tile.type === 'parking' && rules.freeParking
                  ? 'POOL ' + (classic ? '₹ ' : '◈ ') + pot
                  : tile.label ||
                    (tile.type === 'tax'
                      ? `◈ ${tile.tax}`
                      : tile.type === 'transport'
                        ? 'TRANSPORT'
                        : 'DRAW A CARD')}
        </span>
      )}
      {ownership?.level > 0 && (
        <span
          className="development"
          aria-label={
            ownership.level === 5
              ? classic
                ? 'Hotel'
                : 'Planetary base'
              : ownership.level + (classic ? ' houses' : ' outposts')
          }
        >
          <DevelopmentArt base={ownership.level === 5} classic={classic} />
          {ownership.level < 5 && <b aria-hidden="true">{ownership.level}</b>}
        </span>
      )}
      {owner && (
        <span
          className="owner-sigil"
          style={{ color: owner.color }}
          title={owner.name + ' owns this world'}
          aria-label={owner.name + ' owns this world'}
        >
          <span className="owner-dot" style={{ background: owner.color }} />
          {ownership?.mortgaged && <LockKeyhole size={9} />}
        </span>
      )}
    </button>
  );
}
