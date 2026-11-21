import { mapText } from '../services/mapText.js';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, LockKeyhole, Sparkles, Box, LayoutGrid } from 'lucide-react';
import { boardFor, isClassic } from '../game/maps.js';
import { Emblem } from '../components/Art.jsx';
import BoardTile from './BoardTile.jsx';
import PlayerToken, { tokenCoordinates } from './PlayerToken.jsx';
import TurnConsole from './TurnConsole.jsx';
import OwnershipLegend from './OwnershipLegend.jsx';
import BoardScene from './BoardScene.jsx';
import usePointerLight from '../hooks/usePointerLight.js';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { useGameStore } from '../stores/gameStore.js';
const Board3D = lazy(() => import('./Board3D.jsx'));
gsap.registerPlugin(useGSAP);
export default function Board() {
  const { game, selected, select, online, open } = useGameStore(),
    p = game.players[game.turn],
    wrapperRef = useRef(),
    ref = useRef(),
    [moving, setMoving] = useState(false),
    [expanded, setExpanded] = useState(false);
  const reduced = useMotionPreference();
  const boardView = useGameStore((state) => state.boardView);
  const setBoardView = useGameStore((state) => state.setBoardView);
  const [viewNotice, setViewNotice] = useState('');
  const seenMovement = useRef(game.version);
  useEffect(() => setMoving(false), [boardView]);
  usePointerLight(ref, reduced || boardView === '3d');
  const previous = useRef(game);
  useGSAP(
    () => {
      if (reduced || boardView !== '2d' || !ref.current) return;
      gsap.from('.board-tile', {
        opacity: 0,
        y: 9,
        scale: 0.94,
        duration: 0.55,
        stagger: 0.012,
        ease: 'power2.out',
      });
      gsap.from('.turn-console', {
        opacity: 0,
        y: 18,
        duration: 0.65,
        delay: 0.25,
        ease: 'power3.out',
      });
    },
    { scope: wrapperRef, dependencies: [game.id, reduced, boardView], revertOnUpdate: true },
  );
  useGSAP(
    () => {
      const before = previous.current;
      previous.current = game;
      if (
        reduced ||
        boardView !== '2d' ||
        !ref.current ||
        before.id !== game.id ||
        before.version === game.version
      )
        return;
      for (const [id, owned] of Object.entries(game.ownership)) {
        const old = before.ownership[id];
        const tile = ref.current.querySelector(`[data-tile="${id}"]`);
        if (!tile) continue;
        if (old?.owner !== owned.owner) {
          gsap.fromTo(
            tile.querySelector('.tile-pulse'),
            { opacity: 1, scale: 0.85 },
            { opacity: 0, scale: 1.22, duration: 1.2, ease: 'power2.out' },
          );
          gsap.from(tile.querySelector('.owner-sigil'), {
            scale: 0,
            rotate: -30,
            duration: 0.55,
            ease: 'back.out(2)',
          });
        }
        if (old?.level !== owned.level && owned.level)
          gsap.from(tile.querySelector('.development'), {
            y: -14,
            scale: 0.6,
            opacity: 0,
            duration: 0.65,
            ease: 'back.out(1.5)',
          });
      }
      if (before.turn !== game.turn)
        gsap.from('.turn-banner', { opacity: 0, x: -12, duration: 0.45, ease: 'power2.out' });
    },
    { scope: wrapperRef, dependencies: [game.version], revertOnUpdate: true },
  );
  const BOARD = boardFor(game),
    classic = isClassic(game);
  useGSAP(
    () => {
      const m = game.movement;
      const fresh = seenMovement.current !== game.version;
      seenMovement.current = game.version;
      if (!m || reduced || boardView !== '2d' || !fresh || !ref.current) {
        setMoving(false);
        return;
      }
      const el = ref.current.querySelector(`[data-token="${m.player}"]`),
        index = game.players.filter((p) => !p.bankrupt).findIndex((p) => p.id === m.player);
      if (!el) return;
      setMoving(true);
      const tl = gsap.timeline({
        onComplete: () => setMoving(false),
      });
      tl.set(el, tokenCoordinates(m.from, index));
      tl.to(el, {
        scale: 1.15,
        duration: 0.15,
      });
      const path =
        m.path ||
        Array.from(
          {
            length: m.steps,
          },
          (_, i) => (m.from + (m.back ? -(i + 1) : i + 1) + 80) % 40,
        );
      let stepAt = tl.duration();
      for (const position of path) {
        tl.to(
          el,
          {
            ...tokenCoordinates(position, index),
            duration: 0.26,
            ease: 'power1.inOut',
          },
          stepAt,
        );
        const trace = ref.current.querySelector(`[data-tile="${position}"] .tile-trace`);
        if (trace) {
          tl.fromTo(trace, { opacity: 0 }, { opacity: 1, duration: 0.12 }, stepAt);
          tl.to(trace, { opacity: 0, duration: 0.45 }, stepAt + 0.12);
        }
        stepAt += 0.26;
      }
      const destination = game.players.find((p) => p.id === m.player)?.position;
      if (path.at(-1) !== destination)
        tl.to(el, {
          ...tokenCoordinates(destination, index),
          duration: 0.6,
          ease: 'power2.inOut',
        });
      tl.to(el, {
        scale: 1,
        duration: 0.2,
      });
      return () => {
        tl.kill();
        setMoving(false);
      };
    },
    {
      scope: wrapperRef,
      dependencies: [game.version, reduced, boardView],
      revertOnUpdate: true,
    },
  );
  useEffect(() => {
    if (game.phase === 'finished') open('victory');
  }, [game.phase, open]);
  return (
    <div
      className={'board-wrap ' + (expanded ? 'board-expanded' : '')}
      ref={wrapperRef}
      data-board-view={boardView}
    >
      <div className="board-view-bar board-topline">
        <span>
          <i />
          ROUND {String(game.round).padStart(2, '0')}
          <small>{online ? 'LIVE MATCH' : 'YOUR GAME TABLE'}</small>
        </span>
        <div className="board-view-actions">
          <div role="group" aria-label="Board view">
            <button
              aria-pressed={boardView === '2d'}
              onClick={() => {
                setViewNotice('');
                setBoardView('2d');
              }}
            >
              <LayoutGrid size={14} />
              2D view
            </button>
            <button
              aria-pressed={boardView === '3d'}
              onClick={() => {
                setViewNotice('');
                setBoardView('3d');
              }}
            >
              <Box size={14} />
              3D view
            </button>
          </div>
          <button
            className="board-expand"
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Close focus view' : 'Expand board'}
          </button>
        </div>
      </div>
      {viewNotice && (
        <p className="board-view-notice" role="status">
          {viewNotice}
        </p>
      )}
      {boardView === '3d' ? (
        <Suspense
          fallback={
            <div className="spatial-loading-placeholder">
              <span className="spatial-loader-ring" />
              Preparing the 3D table…
              <TurnConsole />
            </div>
          }
        >
          <Board3D
            game={game}
            selected={selected}
            onSelect={select}
            moving={moving}
            onMoving={setMoving}
            onUnavailable={() => {
              setMoving(false);
              setBoardView('2d');
              setViewNotice(
                'The 3D view is unavailable in this browser. Your match continues in 2D.',
              );
            }}
          />
        </Suspense>
      ) : (
        <div
          className="galactic-board"
          ref={ref}
          data-testid="game-board"
          style={{ '--active-player': p.color }}
        >
          {BOARD.map((t) => (
            <BoardTile
              key={t.id}
              tile={t}
              ownership={game.ownership[t.id]}
              players={game.players}
              rules={game.rules}
              pot={game.pot}
              selected={selected === t.id}
              onSelect={select}
            />
          ))}
          <div className="board-center">
            <BoardScene
              game={game}
              selected={selected}
              onSelect={select}
              onInspect={(id) => {
                select(id);
                open('deed');
              }}
              reduced={reduced}
            />
            <div className="center-title">
              <span className="eyebrow gold">{mapText('THE GALAXY IS YOURS')}</span>
              <h1>
                {classic ? 'INDIA' : 'GALACTIC'}
                <br />
                <span>{classic ? 'CITY CAPITALS' : 'CONQUEST'}</span>
              </h1>
              <p>{mapText('Build your empire. Rewrite your destiny.')}</p>
            </div>
            <div className="center-rule">
              <Emblem size={23} />
              <span>FORTUNE FAVORS THE BOLD</span>
            </div>
            <TurnConsole moving={moving} />
            <div className="center-bottom">
              <span>
                <Sparkles size={11} />
                {mapText('AGE OF REBELLION')}
              </span>
              <span>
                {game.inventory.outposts}
                {mapText('OUTPOSTS \xB7')}
                {game.inventory.bases}
                {mapText('BASES')}
              </span>
            </div>
          </div>
          {game.players
            .filter((p) => !p.bankrupt)
            .map((p, i) => (
              <PlayerToken key={p.id} player={p} index={i} />
            ))}
        </div>
      )}
      <OwnershipLegend />
      <div className="board-footnote">
        <span>
          <LockKeyhole size={11} />{' '}
          {online
            ? 'Server-authoritative game state'
            : 'Saved on this device · Solo & pass-and-play'}
        </span>
        <span>
          {mapText('Click any world to explore its deed')}
          <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}
