import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Plus, Minus, Compass, ArrowUpRight, Crosshair } from 'lucide-react';
import { boardFor, isClassic, tokensFor } from '../game/maps.js';
import { useGameStore } from '../stores/gameStore.js';
import { TokenArt } from '../components/Art.jsx';
import { createTable } from './three/table.js';
import TurnConsole from './TurnConsole.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { canRoll } from './rollPermission.js';

export default function Board3D({ game, selected, onSelect, onMoving, moving, onUnavailable }) {
  const ref = useRef(),
    badges = useRef(),
    table = useRef();
  const movingRef = useRef(moving);
  movingRef.current = moving;
  const [ready, setReady] = useState(false),
    [hover, setHover] = useState(null),
    [anchor, setAnchor] = useState(null);
  const reduced = useMotionPreference(),
    board = boardFor(game),
    classic = isClassic(game);
  const open = useGameStore((state) => state.open);
  const hoveredPlayer = useGameStore((state) => state.hoveredPlayer);
  const ownerFilter = useGameStore((state) => state.boardOwnerFilter);
  useEffect(() => {
    let mounted = true;
    try {
      table.current = createTable(ref.current, game, {
        reduced,
        onSelect,
        mayRoll: () => canRoll(useGameStore.getState(), movingRef.current),
        onRoll: () => {
          const state = useGameStore.getState();
          if (canRoll(state, movingRef.current)) state.dispatch('ROLL');
        },
        onHover: (id) => {
          if (mounted) setHover(id);
        },
        onMoving: (value) => {
          if (mounted) onMoving(value);
        },
        onReady: () => {
          if (mounted) setReady(true);
        },
        onError: () => {
          if (mounted) onUnavailable();
        },
        onProject: (position) => {
          if (mounted) setAnchor(position);
        },
        badgeFor: (player) =>
          badges.current?.querySelector(`[data-badge="${player.id}"] svg`)?.outerHTML,
      });
      table.current.select(selected);
    } catch {
      onUnavailable();
    }
    return () => {
      mounted = false;
      table.current?.dispose();
      table.current = null;
    };
  }, [game.id]);
  useEffect(() => {
    table.current?.update(game);
  }, [game.version]);
  useEffect(() => {
    table.current?.select(selected);
  }, [selected]);
  useEffect(() => {
    table.current?.reduced(reduced);
  }, [reduced]);
  useEffect(() => {
    table.current?.highlight(hoveredPlayer, ownerFilter);
  }, [hoveredPlayer, ownerFilter, ready, game.version]);
  const tile = board[selected],
    owner = game.players.find((player) => player.id === game.ownership[selected]?.owner);
  return (
    <section
      className={'spatial-board ' + (classic ? 'spatial-classic' : '')}
      data-testid="board-3d"
      data-ready={ready}
      data-selected-tile={selected}
      data-highlighted-player={hoveredPlayer || ''}
      data-owner-filter={ownerFilter || ''}
      data-presentation={classic ? 'travel-atlas' : 'planetarium'}
    >
      <div className="spatial-tools">
        <span>
          <i />
          {classic ? 'INDIA CAPITAL ATLAS' : 'PLANETARY COMMAND TABLE'}
          <small>Drag to orbit · Scroll or pinch to zoom</small>
        </span>
        <div>
          <button
            aria-label="Focus selected world"
            onClick={() => table.current?.camera('projection')}
          >
            <Crosshair size={15} />
          </button>
          <button aria-label="Zoom in on 3D board" onClick={() => table.current?.zoom(0.88)}>
            <Plus size={15} />
          </button>
          <button aria-label="Zoom out of 3D board" onClick={() => table.current?.zoom(1.13)}>
            <Minus size={15} />
          </button>
          <button aria-label="Top view of 3D board" onClick={() => table.current?.camera('top')}>
            <Compass size={15} />
          </button>
          <button aria-label="Reset 3D camera" onClick={() => table.current?.camera('reset')}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="spatial-stage">
        <div className="spatial-renderer" ref={ref} />
        {!ready && (
          <div className="spatial-loading">
            <span className="spatial-loader-ring" />
            <strong>{classic ? 'Opening the city atlas…' : 'Projecting the galaxy…'}</strong>
          </div>
        )}
        {anchor?.visible && ready && (
          <div
            className="spatial-location-badge"
            style={{ left: anchor.x, top: anchor.y, '--location-color': tile.color || '#b9dcea' }}
          >
            <small>{owner ? owner.name : 'UNCLAIMED'}</small>
            <strong>{tile.name}</strong>
            <button aria-label={'Open ' + tile.name + ' deed'} onClick={() => open('deed')}>
              <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        {(hover !== null || hoveredPlayer) && (
          <div className="spatial-hover" aria-live="polite">
            {hoveredPlayer
              ? (() => {
                  const player = game.players.find((player) => player.id === hoveredPlayer);
                  return player ? `${player.name} · ${board[player.position].name}` : '';
                })()
              : `${board[hover].name}${board[hover].price ? ` · ${classic ? '₹' : '◈'} ${board[hover].price}` : ''}`}
          </div>
        )}
      </div>
      <div className="spatial-action-dock">
        <TurnConsole moving={moving} spatial />
      </div>
      <details className="spatial-directory">
        <summary>Explore all 40 spaces</summary>
        <div>
          {board.map((tile) => (
            <button
              key={tile.id}
              aria-pressed={tile.id === selected}
              onClick={() => onSelect(tile.id)}
              style={{ '--sector-color': tile.color }}
            >
              <i />
              {tile.name}
            </button>
          ))}
        </div>
      </details>
      <div className="spatial-badges" ref={badges} aria-hidden="true">
        {game.players.map((player) => (
          <div key={player.id} data-badge={player.id}>
            <TokenArt
              character={tokensFor(game).find((token) => token.id === player.character)}
              size={64}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
