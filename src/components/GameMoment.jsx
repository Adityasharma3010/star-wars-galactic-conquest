import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, ShieldCheck } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { boardFor, isClassic } from '../game/maps.js';
import { PlanetArt } from './Art.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';

export default function GameMoment() {
  const { game, playing, intro, modal } = useGameStore(),
    reduced = useMotionPreference();
  const previous = useRef(game),
    [moment, setMoment] = useState(null),
    [transfers, setTransfers] = useState([]);
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    if (!playing || intro || !game || !before || before.id !== game.id || reduced) {
      setMoment(null);
      setTransfers([]);
      return;
    }
    if (before.version === game.version) return;
    const board = boardFor(game),
      classic = isClassic(game);
    const claimed = board.find(
      (tile) =>
        game.ownership[tile.id]?.owner &&
        game.ownership[tile.id]?.owner !== before.ownership[tile.id]?.owner,
    );
    const built = board.find(
      (tile) => (game.ownership[tile.id]?.level || 0) > (before.ownership[tile.id]?.level || 0),
    );
    if (claimed || built) {
      const tile = built || claimed,
        owned = game.ownership[tile.id],
        owner = game.players.find((player) => player.id === owned.owner);
      setMoment({
        id: game.version,
        tile,
        owner,
        built: Boolean(built),
        title: built
          ? classic
            ? owned.level === 5
              ? 'HOTEL RAISED'
              : 'HOUSE RAISED'
            : owned.level === 5
              ? 'BASE DEPLOYED'
              : 'OUTPOST DEPLOYED'
          : 'PROPERTY SECURED',
      });
    }
    const changes = game.players.map((player) => ({
      player,
      delta: player.credits - (before.players.find((old) => old.id === player.id)?.credits || 0),
    }));
    const payer = changes.find((change) => change.delta < 0),
      receiver = changes.find((change) => change.delta > 0);
    const origin =
      payer && document.querySelector(`[data-player-card="${payer.player.id}"] .commander-stats`);
    const destination = receiver
      ? document.querySelector(`[data-player-card="${receiver.player.id}"] .commander-stats`)
      : document.querySelector('.board-wrap');
    if (origin && destination) {
      const from = origin.getBoundingClientRect(),
        to = destination.getBoundingClientRect();
      setTransfers([
        {
          id: game.version,
          x1: from.x + from.width / 2,
          y1: from.y + from.height / 2,
          x2: to.x + to.width / 2,
          y2: to.y + Math.min(to.height / 2, 200),
          color: receiver?.player.color || '#f7cd7a',
        },
      ]);
    }
    const timer = setTimeout(() => {
      setMoment(null);
      setTransfers([]);
    }, 1500);
    return () => clearTimeout(timer);
  }, [game?.id, game?.version, playing, intro, reduced]);
  if (!playing || intro || reduced) return null;
  return (
    <>
      <AnimatePresence>
        {moment && !modal && (
          <motion.div
            key={moment.id}
            className="game-moment"
            style={{ '--moment-color': moment.owner.color }}
            initial={{ opacity: 0, y: 25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.03 }}
            transition={{ duration: 0.3 }}
            aria-live="polite"
          >
            <PlanetArt tile={moment.tile} />
            <span className="moment-orbit" aria-hidden="true" />
            <div>
              <small>
                {moment.built ? <Building2 size={12} /> : <ShieldCheck size={12} />}
                {moment.title}
              </small>
              <strong>{moment.tile.name}</strong>
              <p>
                {moment.owner.name} expands their {isClassic(game) ? 'portfolio' : 'empire'}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!reduced && transfers.length > 0 && (
        <svg className="credit-transfers" aria-hidden="true">
          {transfers.map((transfer) => (
            <g key={transfer.id} style={{ color: transfer.color }}>
              <path
                className="credit-transfer-path"
                d={`M${transfer.x1},${transfer.y1} Q${(transfer.x1 + transfer.x2) / 2},${Math.min(transfer.y1, transfer.y2) - 80} ${transfer.x2},${transfer.y2}`}
              />
              <circle cx={transfer.x1} cy={transfer.y1} r="5" />
              <circle cx={transfer.x2} cy={transfer.y2} r="5" />
            </g>
          ))}
        </svg>
      )}
    </>
  );
}
