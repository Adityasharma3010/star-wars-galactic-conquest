import { ArrowRight, BookOpen, Globe2, LockKeyhole, Play, Radio, X } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { TokenArt } from '../components/Art.jsx';
import MapPicker from '../components/MapPicker.jsx';
import { mapFor, tokensFor } from '../game/maps.js';

export default function WelcomeScreen({ onResumeOnline }) {
  const { selectedMap, chooseMap, profile, game, online, open, resumeSaved, busy, discardSession } =
    useGameStore();
  const map = mapFor(selectedMap);
  const character =
    tokensFor(selectedMap).find((token) => token.id === profile.character) ||
    tokensFor(selectedMap)[0];
  return (
    <section className="simple-welcome" aria-labelledby="welcome-title">
      <div className="welcome-dice" aria-hidden="true">
        <div className="menu-die die-gold">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} className={[0, 2, 4, 6, 8].includes(i) ? 'pip' : ''} />
          ))}
        </div>
        <div className="menu-die die-blue">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} className={[0, 2, 6, 8].includes(i) ? 'pip' : ''} />
          ))}
        </div>
      </div>
      <span className="welcome-brand-line">
        {map.id === 'india' ? 'THE CLASSIC COLLECTION' : 'STAR WARS'}
      </span>
      <h1 id="welcome-title">
        {map.id === 'india' ? (
          <>
            MONOPOLY<span>INDIA</span>
          </>
        ) : (
          <>
            GALACTIC<span>CONQUEST</span>
          </>
        )}
      </h1>
      <p className="welcome-tagline">
        {map.id === 'india'
          ? 'Great cities. Bold deals. Your next move.'
          : 'Make your next move a galactic one.'}
      </p>
      <div className="simple-menu-controls">
        <button className="welcome-identity" onClick={() => open('profile')}>
          <span style={{ color: character.color }}>
            <TokenArt character={character} size={38} />
          </span>
          <span>
            <small>Playing as</small>
            <strong>{profile.name}</strong>
          </span>
        </button>
        <button
          className="button gold-button welcome-play"
          disabled={busy}
          onClick={() => open('newGame')}
        >
          <Play size={21} fill="currentColor" />
          Play locally
          <ArrowRight size={20} />
        </button>
        <div className="welcome-secondary">
          <button
            className="button"
            disabled={busy}
            onClick={() => {
              useGameStore.setState({ roomIntent: 'browse' });
              open('rooms');
            }}
          >
            <Globe2 size={16} />
            Online multiplayer
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => {
              useGameStore.setState({ roomIntent: 'private' });
              open('rooms');
            }}
          >
            <LockKeyhole size={16} />
            Create private game
          </button>
        </div>
        <MapPicker value={selectedMap} onChange={chooseMap} />
        {game && (
          <div className="simple-resume">
            <Radio size={18} />
            <span>
              <strong>{online ? 'Online match' : 'Saved game'}</strong>
              <small>
                Round {game.round} · {game.players.length} players
              </small>
            </span>
            <button
              className="text-button"
              disabled={busy}
              onClick={online ? onResumeOnline : resumeSaved}
            >
              {busy
                ? 'Reconnecting…'
                : game.phase === 'finished'
                  ? 'View results'
                  : 'Resume saved game'}
              <ArrowRight size={15} />
            </button>
            <button
              className="icon-button resume-forget"
              disabled={busy}
              aria-label="Forget this saved match"
              title="Forget this saved match"
              onClick={discardSession}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      <button className="text-button welcome-help" onClick={() => open('rules')}>
        <BookOpen size={15} />
        How to play
      </button>
      <p className="simple-welcome-footnote">
        2–8 players<span>·</span>Play with friends or AI<span>·</span>2D & 3D boards
      </p>
    </section>
  );
}
