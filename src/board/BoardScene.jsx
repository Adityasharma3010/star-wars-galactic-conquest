import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, Compass, ArrowUpRight, Radio } from 'lucide-react';
import { PlanetArt } from '../components/Art.jsx';
import { boardFor, groupsFor, isClassic } from '../game/maps.js';

export default function BoardScene({ game, selected, onSelect, onInspect, reduced }) {
  const board = boardFor(game),
    classic = isClassic(game);
  const tile =
    board[selected]?.type === 'property'
      ? board[selected]
      : board[game.players[game.turn].position]?.type === 'property'
        ? board[game.players[game.turn].position]
        : board[1];
  const group = groupsFor(game).find((group) => group.id === tile.group);
  const destinations = groupsFor(game).map((group) =>
    board.find((tile) => tile.group === group.id),
  );
  const owner = game.players.find((player) => player.id === game.ownership[tile.id]?.owner);
  const event = game.events.at(-1);
  return (
    <>
      <div
        className={'board-scene ' + (classic ? 'city-scene' : 'galactic-scene')}
        aria-hidden="true"
        style={{ '--scene-color': tile.color }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={tile.id}
            className="scene-landscape"
            initial={reduced ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.65 }}
          >
            <PlanetArt tile={tile} large />
          </motion.div>
        </AnimatePresence>
        <div className="scene-vignette" />
        <div className="scene-energy" />
        <div className="scene-grid" />
        <div className="scene-orbit orbit-outer">
          <i />
        </div>
        <div className="scene-orbit orbit-inner">
          <i />
        </div>
        <div className="scene-horizon" />
        <div className="scene-sparkles">
          {Array.from({ length: 16 }, (_, index) => (
            <i
              key={index}
              style={{
                '--i': index,
                left: `${(index * 43 + 11) % 100}%`,
                top: `${(index * 29 + 7) % 80}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="scene-status">
        <span>
          <i />
          {classic ? 'YOUR JOURNEY' : 'GALACTIC UPLINK'}
        </span>
        <span>
          {classic ? 'CITY ATLAS' : 'LIVE HOLOMAP'} / {String(tile.id).padStart(2, '0')}
        </span>
      </div>
      <div className="scene-destination" style={{ '--destination-color': tile.color }}>
        {classic ? <Compass size={17} /> : <Crosshair size={17} />}
        <div>
          <small>{group?.name}</small>
          <strong>{tile.name}</strong>
        </div>
        <span>{owner ? owner.name : 'UNCLAIMED'}</span>
        <button onClick={() => onInspect(tile.id)} aria-label={'Inspect ' + tile.name}>
          <ArrowUpRight size={16} />
        </button>
      </div>
      <nav
        className="scene-destinations"
        aria-label={classic ? 'Explore city groups' : 'Explore galactic sectors'}
      >
        {destinations.map((destination) => (
          <button
            key={destination.id}
            aria-label={'Explore ' + destination.name}
            aria-pressed={destination.id === tile.id}
            onClick={() => onSelect(destination.id)}
            style={{ '--sector-color': destination.color }}
          >
            <i />
            <span>{destination.name}</span>
          </button>
        ))}
      </nav>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={event?.id}
          className="scene-dispatch"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <Radio size={11} />
          <span>{event?.text || 'Your next move writes the story.'}</span>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
