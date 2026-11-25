import TurnConsole from './TurnConsole.jsx';
import OwnershipLegend from './OwnershipLegend.jsx';
import { boardFor, isClassic } from '../game/maps.js';

export default function BoardCenter({ game, moving }) {
  const offer = game.phase === 'purchase' ? boardFor(game)[game.pendingProperty] : null;
  const coin = isClassic(game) ? '₹' : '◈';
  return (
    <div className="board-center clean-center">
      {offer && (
        <div className="offer-card" style={{ '--c': offer.color || '#8fb4cc' }}>
          <small>{isClassic(game) ? 'CITY FOR SALE' : 'WORLD AVAILABLE'}</small>
          <strong>{offer.name}</strong>
          <span>
            <b>
              {coin} {offer.price}
            </b>
            {offer.rents && <em>Rent {coin + ' ' + offer.rents[0]}</em>}
          </span>
        </div>
      )}
      <TurnConsole moving={moving} clean />
      <OwnershipLegend />
      <div className="center-activity" aria-label="Recent match activity">
        {game.events
          .slice(-4)
          .reverse()
          .map((event) => (
            <p key={event.id}>{event.text}</p>
          ))}
      </div>
    </div>
  );
}
