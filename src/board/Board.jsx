import { mapText } from '../services/mapText.js';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion } from 'motion/react';
import { Dices, ArrowRight, ChevronRight, LockKeyhole, Sparkles } from 'lucide-react';
import { boardFor, isClassic, tokensFor } from '../game/maps.js';
import { TokenArt, Emblem } from '../components/Art.jsx';
import BoardTile from './BoardTile.jsx';
import PlayerToken, { tokenCoordinates } from './PlayerToken.jsx';
import Dice from './Dice.jsx';
import OwnershipLegend from './OwnershipLegend.jsx';
import ConnectionGrace from '../components/ConnectionGrace.jsx';
import BoardScene from './BoardScene.jsx';
import usePointerLight from '../hooks/usePointerLight.js';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { useGameStore } from '../stores/gameStore.js';
gsap.registerPlugin(useGSAP);
export default function Board() {
  const { game, selected, select, dispatch, busy, online, onlinePlayer, open, matchAway } =
      useGameStore(),
    p = game.players[game.turn],
    ref = useRef(),
    [moving, setMoving] = useState(false),
    [expanded, setExpanded] = useState(false);
  const reduced = useMotionPreference();
  usePointerLight(ref, reduced);
  const previous = useRef(game);
  useGSAP(
    () => {
      if (reduced) return;
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
    { scope: ref, dependencies: [game.id, reduced], revertOnUpdate: true },
  );
  useGSAP(
    () => {
      const before = previous.current;
      previous.current = game;
      if (reduced || before.id !== game.id || before.version === game.version) return;
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
    { scope: ref, dependencies: [game.version], revertOnUpdate: true },
  );
  const BOARD = boardFor(game),
    classic = isClassic(game),
    spectator = online && !onlinePlayer;
  useGSAP(
    () => {
      const m = game.movement;
      if (!m || reduced) {
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
      scope: ref,
      dependencies: [game.version, reduced],
      revertOnUpdate: true,
    },
  );
  useEffect(() => {
    if (game.phase === 'finished') open('victory');
  }, [game.phase, open]);
  const canAct =
    !spectator && !matchAway && !moving && !busy && (!online || p.id === onlinePlayer) && !p.ai;
  const pending = BOARD[game.pendingProperty];
  const canSettle = Boolean(
    game.debt &&
    (online
      ? game.debt.payer === onlinePlayer
      : !game.players.find((x) => x.id === game.debt.payer)?.ai),
  );
  const main =
    game.phase === 'roll'
      ? 'Roll dice'
      : game.phase === 'purchase'
        ? `Acquire ${pending?.name}`
        : game.phase === 'end'
          ? game.extraTurn
            ? 'Continue · doubles'
            : 'End turn'
          : game.phase === 'auction'
            ? 'Join auction'
            : game.phase === 'debt'
              ? canSettle
                ? 'Settle debt'
                : 'Waiting for ' + game.players.find((x) => x.id === game.debt.payer)?.name
              : 'View results';
  const act = () => {
    if (game.phase === 'roll') dispatch('ROLL');
    else if (game.phase === 'purchase') dispatch('BUY');
    else if (game.phase === 'end') dispatch('END');
    else if (game.phase === 'auction') open('auction');
    else if (game.phase === 'debt' && canSettle) open('debt');
    else open('victory');
  };
  return (
    <div className={'board-wrap ' + (expanded ? 'board-expanded' : '')}>
      <div className="board-topline">
        <span>
          <i className="status-dot" /> {online ? 'LIVE MATCH' : 'LOCAL MATCH'} <b> / </b>{' '}
          {game.rules.teams ? 'TEAMS' : 'CLASSIC RULES'}
        </span>
        <span>
          ROUND <strong>{String(game.round).padStart(2, '0')}</strong>
          <span className="topline-divider" />
          <button
            className="board-expand"
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Close focus view' : 'Expand board'}
          </button>
        </span>
      </div>
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
          <div className="turn-console">
            <div className="turn-banner">
              <span
                className="mini-avatar"
                style={{
                  color: p.color,
                }}
              >
                <TokenArt
                  character={tokensFor(game).find((token) => token.id === p.character)}
                  size={24}
                />
              </span>
              <div>
                <span className="eyebrow">
                  {p.ai
                    ? 'AI COMMANDER'
                    : online && p.id !== onlinePlayer
                      ? 'COMMANDER ON TURN'
                      : 'YOUR TURN'}
                </span>
                <h3>
                  {p.name}
                  <small>
                    {p.detained
                      ? 'In detention'
                      : game.phase === 'purchase'
                        ? `Discover ${pending?.name}`
                        : game.phase === 'auction'
                          ? 'A new world is up for auction'
                          : game.phase === 'debt'
                            ? 'Resolve the outstanding payment'
                            : 'Your next move changes everything.'}
                  </small>
                </h3>
              </div>
              <ConnectionGrace
                player={game.debt ? game.players.find((p) => p.id === game.debt.payer) : p}
              />
              <span className="turn-marker">
                {String(game.turn + 1).padStart(2, '0')} /{' '}
                {String(game.players.length).padStart(2, '0')}
              </span>
            </div>
            <div className="roll-row">
              <Dice
                values={game.dice}
                version={game.version}
                rolling={game.lastActionType === 'ROLL'}
                reduced={reduced}
              />
              <motion.button
                whileTap={{
                  scale: 0.97,
                }}
                className="button gold-button roll-button"
                disabled={
                  (!canAct && !['auction', 'debt', 'finished'].includes(game.phase)) ||
                  (game.phase === 'debt' && !canSettle) ||
                  matchAway ||
                  spectator ||
                  moving ||
                  busy
                }
                onClick={act}
              >
                {moving
                  ? 'Travelling…'
                  : busy
                    ? 'Syncing…'
                    : spectator
                      ? 'Spectating · ' + p.name + '’s turn'
                      : p.ai && !['auction', 'debt', 'finished'].includes(game.phase)
                        ? 'Commander is thinking…'
                        : main}
                {game.phase === 'roll' ? <Dices size={19} /> : <ArrowRight size={18} />}
              </motion.button>
            </div>
            {game.phase === 'purchase' && canAct && (
              <button className="text-button decline" onClick={() => dispatch('DECLINE')}>
                {game.rules.auctions ? 'Decline & open auction' : 'Leave with the bank'}{' '}
                <ChevronRight size={13} />
              </button>
            )}
            {p.detained && game.phase === 'roll' && canAct && (
              <div className="detention-actions">
                <button className="text-button" onClick={() => dispatch('RELEASE')}>
                  {mapText(' Pay 50 credits to escape ')}
                </button>
                {p.cards[0] && (
                  <button
                    className="text-button"
                    onClick={() =>
                      dispatch('RELEASE', {
                        card: p.cards[0],
                      })
                    }
                  >
                    Use escape card
                  </button>
                )}
              </div>
            )}
          </div>
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
