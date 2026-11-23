import { useGameStore } from '../stores/gameStore.js';
import { isClassic } from '../game/maps.js';
import PawnArt from '../components/PawnArt.jsx';
export default function OwnershipLegend() {
  const { game, online, onlinePlayer, boardOwnerFilter } = useGameStore();
  return (
    <div className="ownership-legend" aria-label="Board ownership filters">
      <button
        className={!boardOwnerFilter ? 'selected' : ''}
        aria-pressed={!boardOwnerFilter}
        onClick={() => useGameStore.setState({ boardOwnerFilter: null })}
      >
        {isClassic(game) ? 'All cities' : 'All worlds'}
      </button>
      {game.players
        .filter((p) => !p.forfeited)
        .map((p, i) => (
          <button
            key={p.id}
            style={{ '--player': p.color }}
            className={boardOwnerFilter === p.id ? 'selected' : ''}
            aria-pressed={boardOwnerFilter === p.id}
            onClick={() =>
              useGameStore.setState({ boardOwnerFilter: boardOwnerFilter === p.id ? null : p.id })
            }
            aria-label={`Highlight ${p.name}'s worlds`}
          >
            <PawnArt name={p.name} color={p.color} size={21} />
            <span>
              {online
                ? p.id === onlinePlayer
                  ? 'You'
                  : p.name.split(' ')[0]
                : i === 0
                  ? 'You'
                  : p.name.split(' ')[0]}
            </span>
            <b>{Object.values(game.ownership).filter((o) => o.owner === p.id).length}</b>
          </button>
        ))}
    </div>
  );
}
