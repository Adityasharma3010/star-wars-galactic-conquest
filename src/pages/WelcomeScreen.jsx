import {
  ArrowRight,
  Globe2,
  Dices,
  Shield,
  Radio,
  Play,
  BookOpen,
  Map,
  Crosshair,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore.js';
import { PlanetArt, Emblem } from '../components/Art.jsx';
import GalaxyBackdrop from '../components/GalaxyBackdrop.jsx';
import { boardFor, mapFor } from '../game/maps.js';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import useMotionPreference from '../hooks/useMotionPreference.js';
import usePointerLight from '../hooks/usePointerLight.js';

export default function WelcomeScreen({ onResumeOnline }) {
  const ref = useRef();
  const reduced = useMotionPreference();
  usePointerLight(ref, reduced);
  useGSAP(
    () => {
      if (reduced) return;
      gsap.from('.welcome-edition, .welcome-intro h1, .welcome-intro p', {
        opacity: 0,
        y: 22,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });
      gsap.from('.welcome-choice', {
        opacity: 0,
        x: -22,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.25,
        ease: 'power3.out',
      });
      gsap.from('.welcome-worlds > div', {
        opacity: 0,
        y: 28,
        rotate: 3,
        duration: 0.9,
        stagger: 0.12,
        delay: 0.3,
        ease: 'power3.out',
      });
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );
  const map = mapFor(useGameStore((state) => state.selectedMap)),
    BOARD = boardFor(map.id);
  const { game, online, open, resumeSaved, busy } = useGameStore();
  return (
    <section className="welcome-menu" aria-labelledby="welcome-title" ref={ref}>
      <GalaxyBackdrop />
      <div className="welcome-command-status">
        <span>
          <i /> GALACTIC COMMAND ONLINE
        </span>
        <span>SECTOR 01 / OUTER RIM</span>
      </div>
      <div className="welcome-hero">
        <div className="welcome-intro">
          <span className="welcome-edition">
            <Emblem size={20} /> A STAR WARS STRATEGY EXPERIENCE
          </span>
          <h1 id="welcome-title">
            THE GALAXY
            <br />
            <span>AWAITS.</span>
          </h1>
          <p>
            Claim iconic worlds. Build your empire.
            <br />
            Choose your squadron and begin your conquest.
          </p>
        </div>
        <div className="welcome-theater">
          <div className="welcome-target" aria-hidden="true">
            <div className="welcome-target-orbit orbit-a" />
            <div className="welcome-target-orbit orbit-b" />
            <Crosshair size={40} />
            <span>DS-01 / BATTLE STATION</span>
            <i />
          </div>
          <Link to={'/maps/' + map.category} className="welcome-map-link">
            <Map size={21} />
            <span>
              <small>ACTIVE MAP / {map.category === 'default' ? 'DEFAULT' : 'STAR WARS'}</small>
              <strong>{map.name}</strong>
            </span>
            <ArrowRight size={20} />
          </Link>
          <div className="welcome-worlds">
            {[1, 11, 21].map((id) => (
              <div key={id}>
                <PlanetArt tile={BOARD[id]} />
                <span>{BOARD[id].name}</span>
              </div>
            ))}
          </div>
          <span className="welcome-theater-note">22 WORLDS / 40 SECTORS / ONE DESTINY</span>
          <div className="welcome-mission-note">
            <span>EVERY MOVE MATTERS</span>
            <p>
              A daring deal. An unexpected alliance.
              <br />A galaxy waiting for your next move.
            </p>
          </div>
        </div>
        <div className="welcome-command-menu">
          {game && (
            <div className="welcome-resume">
              <Radio size={25} />
              <div>
                <span className="eyebrow gold">
                  {game.phase === 'finished' ? 'YOUR LAST CONQUEST' : 'YOUR SAVED CONQUEST'}
                </span>
                <strong>
                  {online
                    ? 'Online squadron'
                    : game.players.filter((p) => !p.ai).length > 1
                      ? 'Pass & play'
                      : 'Solo conquest'}
                  <small>
                    Round {game.round} · {game.players.length} commanders
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
                <Play size={15} />
              </button>
            </div>
          )}
          <div className="welcome-choices">
            <button
              className="welcome-choice local-choice"
              disabled={busy}
              onClick={() => open('newGame')}
            >
              <Dices size={29} />
              <span>
                <small>01 / BEGIN A CONQUEST</small>
                <strong>Play locally</strong>
                <p>Challenge AI commanders or share one device with friends.</p>
              </span>
              <ArrowRight size={22} />
            </button>
            <button
              className="welcome-choice online-choice"
              disabled={busy}
              onClick={() => open('rooms')}
            >
              <Globe2 size={29} />
              <span>
                <small>02 / ASSEMBLE YOUR SQUADRON</small>
                <strong>Online multiplayer</strong>
                <p>Create a room, join an open conquest, or use an invite code.</p>
              </span>
              <ArrowRight size={22} />
            </button>
            <Link to="/maps/star-wars" className="welcome-choice map-choice">
              <Map size={29} />
              <span>
                <small>03 / CHART A NEW COURSE</small>
                <strong>Choose maps</strong>
                <p>Explore Star Wars worlds and Indian city capitals.</p>
              </span>
              <ArrowRight size={22} />
            </Link>
          </div>
        </div>
      </div>
      <div className="welcome-footer">
        <span>
          <Shield size={13} /> 40 sectors · 24 events · One ruler
        </span>
        <button className="text-button" onClick={() => open('rules')}>
          <BookOpen size={14} /> Learn to conquer <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}
