import { ArrowRight, Globe2, Dices, Shield, Radio, Play, BookOpen } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BattleStation, PlanetArt } from '../components/Art.jsx';
import { Starfighter } from '../components/EventPresentation.jsx';
import { BOARD } from '../game/rules/data.js';

export default function WelcomeScreen({ onResumeOnline }) {
  const { game, online, open, resumeSaved, busy } = useGameStore();
  return (
    <section className="welcome-menu" aria-labelledby="welcome-title">
      <div className="welcome-hero">
        <div className="welcome-hero-art" aria-hidden="true">
          <div className="welcome-orbit" />
          <div className="welcome-station">
            <BattleStation />
          </div>
          <Starfighter className="welcome-starfighter" />
          <span className="welcome-sector">OUTER RIM / AGE OF REBELLION</span>
        </div>
        <div className="welcome-intro">
          <span className="eyebrow gold">STAR WARS / GALACTIC CONQUEST</span>
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
          <div className="welcome-worlds">
            {[1, 11, 21].map((id) => (
              <div key={id}>
                <PlanetArt tile={BOARD[id]} />
                <span>{BOARD[id].name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
            <small>YOUR GALAXY. YOUR RULES.</small>
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
            <small>ASSEMBLE YOUR SQUADRON</small>
            <strong>Online multiplayer</strong>
            <p>Create a room, join an open conquest, or use an invite code.</p>
          </span>
          <ArrowRight size={22} />
        </button>
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
