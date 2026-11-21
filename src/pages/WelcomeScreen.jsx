import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  Globe2,
  Dices,
  Radio,
  Play,
  BookOpen,
  Map,
  Crosshair,
  ChevronRight,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { PlanetArt, Emblem } from '../components/Art.jsx';
import GalaxyBackdrop from '../components/GalaxyBackdrop.jsx';
import { boardFor, mapFor } from '../game/maps.js';
import { REFERENCE_IMAGES } from '../assets/referenceImages.js';
import INDIA_IMAGES from '../assets/indiaImages.json';
import useMotionPreference from '../hooks/useMotionPreference.js';
import usePointerLight from '../hooks/usePointerLight.js';

gsap.registerPlugin(useGSAP);
export default function WelcomeScreen({ onResumeOnline }) {
  const ref = useRef(),
    reduced = useMotionPreference(),
    [featured, setFeatured] = useState(null);
  const map = mapFor(useGameStore((state) => state.selectedMap)),
    board = boardFor(map.id);
  const { game, online, open, resumeSaved, busy } = useGameStore();
  const classic = map.theme === 'default';
  const photo = featured
    ? classic
      ? INDIA_IMAGES[board[featured].name].image
      : REFERENCE_IMAGES[board[featured].name].image
    : classic
      ? INDIA_IMAGES['New Delhi'].image
      : REFERENCE_IMAGES['millennium-falcon'].image;
  usePointerLight(ref, reduced);
  useGSAP(
    () => {
      if (reduced) return;
      gsap.from('.welcome-edition, .welcome-intro h1, .welcome-intro p', {
        opacity: 0,
        y: 30,
        duration: 1,
        stagger: 0.13,
        ease: 'power3.out',
      });
      gsap.from('.welcome-choice', {
        opacity: 0,
        y: 34,
        rotateX: 8,
        duration: 0.85,
        stagger: 0.11,
        delay: 0.35,
        ease: 'power3.out',
      });
      gsap.from('.welcome-hologram', {
        opacity: 0,
        scale: 0.88,
        rotateY: -10,
        duration: 1.2,
        delay: 0.15,
        ease: 'power3.out',
      });
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );
  return (
    <section className="welcome-menu cinematic-launch" aria-labelledby="welcome-title" ref={ref}>
      <GalaxyBackdrop image={classic ? INDIA_IMAGES['New Delhi'].image : undefined} />
      <div className="launch-room-grid" aria-hidden="true" />
      <div className="launch-light-column" aria-hidden="true" />
      <div className="welcome-command-status">
        <span>
          <i />
          {classic ? 'GAME TABLE ONLINE' : 'GALACTIC COMMAND ONLINE'}
        </span>
        <span>YOUR NEXT CHAPTER STARTS HERE</span>
      </div>
      <div className="welcome-hero">
        <div className="welcome-intro">
          <span className="welcome-edition">
            <Emblem size={19} />
            {classic ? 'AN INDIA STRATEGY EXPERIENCE' : 'A STAR WARS STRATEGY EXPERIENCE'}
          </span>
          <h1 id="welcome-title">
            THE GALAXY
            <br />
            <span>AWAITS.</span>
          </h1>
          <p>
            {classic
              ? 'Great cities. Bold deals. One winner.'
              : 'A daring deal. An unexpected alliance.'}
            <br />
            {classic
              ? 'Build your legacy across Indian capital cities.'
              : 'Your next move could rule the galaxy.'}
          </p>
          <div className="launch-feature-strip">
            <span>
              <Dices size={15} />
              2–8 players
            </span>
            <span>
              <Globe2 size={15} />
              40 spaces
            </span>
            <span>
              <Crosshair size={15} />
              2D + 3D
            </span>
          </div>
          <button className="launch-rule-link" onClick={() => open('rules')}>
            <BookOpen size={14} />
            Learn to conquer
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="welcome-theater">
          <div className="welcome-hologram">
            <div className="hologram-ring ring-one" aria-hidden="true" />
            <div className="hologram-ring ring-two" aria-hidden="true" />
            <div className="hologram-frame">
              <AnimatePresence initial={false}>
                <motion.img
                  key={photo}
                  src={photo}
                  alt={
                    featured
                      ? board[featured].name
                      : classic
                        ? 'Rashtrapati Bhavan, New Delhi'
                        : 'Millennium Falcon, official Star Wars Databank image'
                  }
                  initial={reduced ? false : { opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.7 }}
                />
              </AnimatePresence>
              <div className="hologram-scanline" aria-hidden="true" />
              <div className="hologram-telemetry">
                <span>
                  <i />
                  {classic ? 'CITY ATLAS' : 'HOLO TRANSMISSION'}
                </span>
                <strong>
                  {featured ? board[featured].name : classic ? 'NEW DELHI' : 'MILLENNIUM FALCON'}
                </strong>
                <small>{classic ? 'THE CLASSIC COLLECTION' : 'THE GALACTIC COLLECTION'}</small>
              </div>
              <span className="hologram-corner corner-nw" />
              <span className="hologram-corner corner-se" />
            </div>
            <div className="hologram-pedestal" aria-hidden="true">
              <i />
              <i />
            </div>
          </div>
          <Link to={'/maps/' + map.category} className="welcome-map-link">
            <Map size={21} />
            <span>
              <small>ACTIVE MAP / {classic ? 'DEFAULT' : 'STAR WARS'}</small>
              <strong>{map.name}</strong>
            </span>
            <ArrowRight size={19} />
          </Link>
          <div className="welcome-worlds">
            {[1, 11, 21].map((id) => (
              <button
                key={id}
                aria-label={'Preview ' + board[id].name}
                aria-pressed={featured === id}
                onClick={() => setFeatured(id)}
              >
                <PlanetArt tile={board[id]} />
                <span>{board[id].name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="launch-controls">
        {game && (
          <div className="welcome-resume">
            <Radio size={22} />
            <div>
              <span className="eyebrow gold">
                {game.phase === 'finished' ? 'YOUR LAST CONQUEST' : 'YOUR SAVED CONQUEST'}
              </span>
              <strong>
                {online ? 'Online squadron' : 'Your game table'}
                <small>
                  Round {game.round} · {game.players.length} players
                </small>
              </strong>
            </div>
            <button
              className="button gold-button"
              disabled={busy}
              onClick={online ? onResumeOnline : resumeSaved}
            >
              {busy
                ? 'Reconnecting…'
                : game.phase === 'finished'
                  ? 'View results'
                  : 'Resume saved game'}
              <Play size={14} />
            </button>
          </div>
        )}
        <div className="welcome-choices">
          <button
            className="welcome-choice local-choice"
            disabled={busy}
            onClick={() => open('newGame')}
          >
            <span className="launch-mode-icon">
              <Dices size={30} />
            </span>
            <span>
              <small>01 / BEGIN YOUR CONQUEST</small>
              <strong>Play locally</strong>
              <p>Challenge AI or share a table with friends.</p>
            </span>
            <ArrowRight size={20} />
          </button>
          <button
            className="welcome-choice online-choice"
            disabled={busy}
            onClick={() => open('rooms')}
          >
            <span className="launch-mode-icon">
              <Globe2 size={30} />
            </span>
            <span>
              <small>02 / ASSEMBLE YOUR SQUADRON</small>
              <strong>Online multiplayer</strong>
              <p>Create a room or join your friends.</p>
            </span>
            <ArrowRight size={20} />
          </button>
          <Link to="/maps/star-wars" className="welcome-choice map-choice">
            <span className="launch-mode-icon">
              <Map size={30} />
            </span>
            <span>
              <small>03 / CHOOSE YOUR THEATER</small>
              <strong>Choose maps</strong>
              <p>Star Wars worlds and Indian capital cities.</p>
            </span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
      <div className="welcome-footer">
        <span>
          <i />
          YOUR VIEW. YOUR STRATEGY. ONE SHARED MATCH.
        </span>
        <span>
          ENTER THE COMMAND ROOM
          <ArrowRight size={13} />
        </span>
      </div>
    </section>
  );
}
