import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useGameStore } from '../stores/gameStore.js';
import { openingStory } from '../game/openingStory.js';
import OriginalTheme from './OriginalTheme.jsx';
import HoloLoader from './HoloLoader.jsx';

export default function MatchOpening() {
  const { game, intro, finishIntro, settings } = useGameStore();
  const reduced = useReducedMotion() || settings.reducedMotion;
  const [phase, setPhase] = useState('loading');
  const [music, setMusic] = useState(!settings.mute && settings.introMusic !== false);
  const [loadTheme, setLoadTheme] = useState(!settings.mute && settings.introMusic !== false);
  const root = useRef();
  const crawl = useRef();
  useLayoutEffect(() => {
    if (phase !== 'crawl' || !crawl.current || reduced) return;
    const text = crawl.current;
    text.style.setProperty('--crawl-end', -(text.offsetHeight + window.innerHeight * 1.8) + 'px');
    const check = () => {
      const last = text.lastElementChild;
      if (
        document.visibilityState !== 'hidden' &&
        last?.getBoundingClientRect().bottom <= Math.max(40, window.innerHeight * 0.12)
      )
        finishIntro();
    };
    // End when the final line clears the visible horizon, rather than waiting on an unrelated timer.
    const timer = setInterval(check, 150);
    const duration = parseFloat(getComputedStyle(text).animationDuration) || 59.5;
    const fallback = setTimeout(finishIntro, duration * 1000 + 500);
    window.addEventListener('resize', check);
    return () => {
      clearInterval(timer);
      clearTimeout(fallback);
      window.removeEventListener('resize', check);
    };
  }, [phase, reduced, finishIntro]);
  useEffect(() => {
    if (!intro) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector('.opening-skip')?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [intro?.gameId]);
  useEffect(() => {
    if (!intro) return;
    setPhase('loading');
    const timers = [
      setTimeout(() => setPhase('prologue'), 700),
      setTimeout(() => setPhase('title'), 2900),
      setTimeout(() => setPhase('crawl'), 5100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [intro?.gameId, reduced, finishIntro]);
  if (!intro || !game) return null;
  const story = openingStory(game);
  return (
    <section
      ref={root}
      className={'match-opening opening-phase-' + phase + (reduced ? ' opening-reduced' : '')}
      aria-label="Opening crawl"
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape') finishIntro();
        if (event.key === 'Tab') {
          const buttons = [
            ...root.current.querySelectorAll('button:not([disabled]),a[href],iframe'),
          ].filter((element) => element.getClientRects().length > 0);
          if (event.shiftKey && document.activeElement === buttons[0]) {
            event.preventDefault();
            buttons.at(-1).focus();
          } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
            event.preventDefault();
            buttons[0].focus();
          }
        }
      }}
    >
      <div className="opening-stars" aria-hidden="true" />
      <div className="opening-controls">
        <button
          className="text-button"
          data-opening-control
          onClick={() => {
            if (!music) {
              setLoadTheme(true);
              if (settings.mute) useGameStore.getState().updateSettings({ mute: false });
            }
            setMusic(!music);
          }}
          aria-label={music ? 'Mute opening music' : 'Play opening music'}
        >
          {music ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="button opening-skip" data-opening-control onClick={finishIntro}>
          Skip intro <ArrowRight size={15} />
        </button>
      </div>
      {phase === 'loading' && <HoloLoader label="Preparing your squadron…" />}
      {phase === 'prologue' && (
        <p className="opening-prologue">A long time ago in a galaxy far, far away…</p>
      )}
      {phase === 'title' && (
        <div className="opening-title">
          <span>STAR WARS</span>
          <h1>
            GALACTIC
            <br />
            CONQUEST
          </h1>
        </div>
      )}
      {phase === 'crawl' && (
        <div className="opening-perspective">
          <div
            ref={crawl}
            className="opening-crawl"
            onAnimationEnd={(event) => {
              if (
                !reduced &&
                event.target === event.currentTarget &&
                event.animationName === 'opening-crawl'
              )
                finishIntro();
            }}
          >
            <span className="opening-episode">A GALACTIC CHRONICLE</span>
            <h2>{story.title}</h2>
            {story.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
      {reduced && phase === 'crawl' && (
        <button
          className="button gold-button opening-enter"
          data-opening-control
          onClick={finishIntro}
        >
          Enter the galaxy <ArrowRight size={17} />
        </button>
      )}
      <div className="opening-roster">
        <span>{story.commanders.join(' · ')}</span>
        {story.teams.length > 0 && <small>{story.teams.join(' / ')}</small>}
      </div>
      {loadTheme && (
        <OriginalTheme
          playing={phase === 'title' || phase === 'crawl'}
          audible={music && !settings.mute}
          volume={(settings.volume ?? 0.45) * (settings.musicVolume ?? 0.2)}
        />
      )}
    </section>
  );
}
