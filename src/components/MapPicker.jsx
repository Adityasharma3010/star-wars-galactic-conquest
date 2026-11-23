import { useId, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Map } from 'lucide-react';
import { boardFor, GAME_MAPS, mapFor } from '../game/maps.js';

// Use actual tile order and group colors for a lightweight board preview.
export function MapPreview({ mapId, className = '' }) {
  const map = mapFor(mapId);
  const classic = map.id === 'india';
  return (
    <svg className={`map-preview ${className}`} viewBox="0 0 240 240" aria-hidden="true">
      <rect x="3" y="3" width="234" height="234" rx="14" fill={classic ? '#dedbc7' : '#142b42'} />
      <rect x="26" y="26" width="188" height="188" rx="5" fill={classic ? '#f4efdd' : '#091c30'} />
      {boardFor(mapId).map((tile, index) => {
        const side = Math.floor(index / 10),
          step = index % 10;
        const [x, y] =
          side === 0
            ? [216 - step * 21.3, 216]
            : side === 1
              ? [3, 216 - step * 21.3]
              : side === 2
                ? [3 + step * 21.3, 3]
                : [216, 3 + step * 21.3];
        return (
          <rect
            key={tile.id}
            x={x + 2}
            y={y + 2}
            width="17"
            height="17"
            rx="2"
            fill={tile.color || (classic ? '#879b89' : '#3d678a')}
            opacity={tile.color ? 1 : 0.65}
          />
        );
      })}
      {classic ? (
        <g fill="#4c6957">
          <path d="M80 112 120 88l40 24zM88 116h64v6H88zM91 126h10v29H91zm24 0h10v29h-10zm24 0h10v29h-10zM84 158h72v7H84z" />
          <text x="120" y="190" textAnchor="middle" fontSize="12" letterSpacing="3">
            INDIA
          </text>
        </g>
      ) : (
        <g stroke="#75cbea" fill="none">
          <circle cx="120" cy="113" r="35" fill="#244660" />
          <ellipse cx="120" cy="113" rx="58" ry="13" transform="rotate(-25 120 113)" />
          <circle cx="166" cy="72" r="9" fill="#d9b56f" stroke="none" />
          <circle cx="75" cy="151" r="6" fill="#739aa2" stroke="none" />
          <text
            x="120"
            y="184"
            fill="#b7d9eb"
            stroke="none"
            textAnchor="middle"
            fontSize="9"
            letterSpacing="1.8"
          >
            GALACTIC CONQUEST
          </text>
        </g>
      )}
    </svg>
  );
}

export function MapCards({ value, onChange, disabled = false }) {
  return (
    <div className="board-map-cards" role="group" aria-label="Available board maps">
      {GAME_MAPS.map((map) => (
        <button
          type="button"
          key={map.id}
          className={`board-map-card ${value === map.id ? 'selected' : ''}`}
          aria-pressed={value === map.id}
          disabled={disabled}
          onClick={() => onChange(map.id)}
        >
          <MapPreview mapId={map.id} />
          <span className="board-map-card-name">
            {map.name}
            {value === map.id && <Check size={16} />}
          </span>
          <small>
            {map.id === 'india' ? 'Classic · Indian cities' : 'Star Wars · Holographic worlds'}
          </small>
          <span className="map-card-meta">40 spaces · 2–8 players</span>
        </button>
      ))}
    </div>
  );
}

export default function MapPicker({ value, onChange, disabled = false }) {
  const [browsing, setBrowsing] = useState(false);
  const id = useId();
  const map = mapFor(value);
  return (
    <div className="board-map-setting">
      <div className="board-map-setting-row">
        <Map size={19} />
        <span>
          <strong>Board map</strong>
          <small>{map.name}</small>
        </span>
        {!disabled && (
          <button
            type="button"
            className="text-button"
            aria-expanded={browsing}
            aria-controls={id}
            onClick={() => setBrowsing(!browsing)}
          >
            {browsing ? 'Close maps' : 'Browse maps'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      {browsing && !disabled && (
        <div className="inline-map-picker" id={id}>
          <div className="inline-map-heading">
            <strong>Choose your board</strong>
            <button type="button" className="text-button" onClick={() => setBrowsing(false)}>
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
          <MapCards
            value={map.id}
            onChange={(id) => {
              setBrowsing(false);
              onChange(id);
            }}
          />
        </div>
      )}
    </div>
  );
}
