import { Check } from 'lucide-react';
import { tokensFor, isClassic } from '../game/maps.js';
import { TokenArt } from './Art.jsx';
import { MapPreview } from './MapPicker.jsx';

export default function TokenPicker({ mapId, value, onChange, disabled = false }) {
  const tokens = tokensFor(mapId);
  const selected = tokens.find((token) => token.id === value) || tokens[0];
  const classic = isClassic(mapId);
  return (
    <div className="player-appearance">
      <div className="appearance-stage">
        <MapPreview mapId={mapId} />
        <div className="appearance-token" style={{ color: selected.color }}>
          <TokenArt character={selected} size={96} />
        </div>
      </div>
      <div className="appearance-heading">
        <small>{classic ? 'YOUR TOKEN COLOR' : 'YOUR CHARACTER'}</small>
        <strong>{selected.name}</strong>
      </div>
      <div className="character-grid" role="group" aria-label="Player appearance">
        {tokens.map((token) => (
          <button
            type="button"
            key={token.id}
            className={selected.id === token.id ? 'selected' : ''}
            style={{ color: token.color }}
            aria-label={`Select ${token.name}`}
            aria-pressed={selected.id === token.id}
            disabled={disabled}
            onClick={() => onChange(token.id)}
          >
            <TokenArt character={token} size={40} />
            <span>{classic ? token.name : token.name.split(' ').slice(-1)[0]}</span>
            {selected.id === token.id && <Check size={12} />}
          </button>
        ))}
      </div>
    </div>
  );
}
