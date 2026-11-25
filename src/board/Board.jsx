import { mapText } from '../services/mapText.js';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, LockKeyhole, Box, LayoutGrid, Save, Check } from 'lucide-react';
import { boardFor } from '../game/maps.js';
import BoardTile from './BoardTile.jsx';
import PlayerToken, { tokenCoordinates } from './PlayerToken.jsx';
import TurnConsole from './TurnConsole.jsx';
import OwnershipLegend from './OwnershipLegend.jsx';
import BoardCenter from './BoardCenter.jsx';
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
    [expanded, setExpanded] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  const reduced = useMotionPreference();
  const boardView = useGameStore((state) => state.boardView);
  const setBoardView = useGameStore((state) => state.setBoardView);
  const [viewNotice, setViewNotice] = useState('');
  const seenMovement = useRef(game.version);
  useEffect(() => {
    useGameStore.setState({ presentationActive: true });
    return () => useGameStore.setState({ presentationActive: false });
  }, []);
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
  const BOARD = boardFor(game);
  useGSAP(
    () => {
      const m = game.movement;
      const fresh = seenMovement.current !== game.version;
      seenMovement.current = game.version;
      if (!m || reduced || boardView !== '2d' || !fresh || !ref.current) {
        setMoving(false);
        return;
      }
      const el = ref.current.querySelector(`[data-token="${m.player}"]`);
      const coordinates = (position) => {
        const occupants = game.players.filter(
          (player) => !player.bankrupt && (player.position === position || player.id === m.player),
        );
        return tokenCoordinates(
          position,
          Math.max(
            0,
            occupants.findIndex((player) => player.id === m.player),
          ),
          occupants.length,
        );
      };
      if (!el) return;
      setMoving(true);
      const tl = gsap.timeline({
        onComplete: () => setMoving(false),
      });
      tl.set(el, coordinates(m.from));
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
            ...coordinates(position),
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
          ...coordinates(destination),
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
      className={'board-wrap clean-board ' + (expanded ? 'board-expanded' : '')}
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
          <BoardCenter game={game} moving={moving} />
          {game.players
            .filter((p) => !p.bankrupt)
            .map((p) => (
              <PlayerToken key={p.id} player={p} />
            ))}
        </div>
      )}
      {boardView === '3d' && <OwnershipLegend />}
      <div className="board-footnote">
        <span>
          <LockKeyhole size={11} />{' '}
          {online
            ? 'Server-authoritative game state'
            : 'Saved on this device · Solo & pass-and-play'}
        </span>
        {!online && (
          <button
            className="board-save"
            aria-label={saved ? 'Game saved' : 'Save game'}
            onClick={() => {
              try {
                // Persist the current snapshot through the same middleware as automatic saves.
                useGameStore.setState({ game: useGameStore.getState().game });
                setSaved(true);
              } catch {
                useGameStore.setState({
                  error:
                    'This device could not save the match. Free some browser storage and try again.',
                });
              }
            }}
          >
            {saved ? <Check size={12} /> : <Save size={12} />}
            <span aria-live="polite">{saved ? 'Game saved' : 'Save game'}</span>
          </button>
        )}
        <span>
          {mapText('Click any world to explore its deed')}
          <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}
