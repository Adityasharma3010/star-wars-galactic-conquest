import { mapText } from '../services/mapText.js';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion } from 'motion/react';
import { Dices, ArrowRight, ChevronRight, LockKeyhole, Sparkles } from 'lucide-react';
import { BOARD } from '../game/rules/data.js';
import { boardFor, isClassic } from '../game/maps.js';
import { BattleStation, Emblem } from '../components/Art.jsx';
import BoardTile from './BoardTile.jsx';
import PlayerToken, { tokenCoordinates } from './PlayerToken.jsx';
import Dice from './Dice.jsx';
import OwnershipLegend from './OwnershipLegend.jsx';
import ConnectionGrace from '../components/ConnectionGrace.jsx';
import { useGameStore } from '../stores/gameStore.js';
gsap.registerPlugin(useGSAP);
export default function Board() {
  const {
      game,
      selected,
      select,
      dispatch,
      settings,
      busy,
      online,
      onlinePlayer,
      open,
      matchAway,
    } = useGameStore(),
    p = game.players[game.turn],
    ref = useRef(),
    [visual, setVisual] = useState({}),
    [moving, setMoving] = useState(false),
    [expanded, setExpanded] = useState(false);
  const reduced =
    settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      for (const position of path)
        tl.to(el, {
          ...tokenCoordinates(position, index),
          duration: 0.26,
          ease: 'power1.inOut',
        });
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
      dependencies: [game.version],
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
      <div className="galactic-board" ref={ref} data-testid="game-board">
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
          <div className="center-coordinate">
            OUTER RIM // SECTOR 07.24{' '}
            <span>
              HOLOMAP ACTIVE <i />
            </span>
          </div>
          <div className="star-field" />
          <div className="orbit-line orbit-one" />
          <div className="orbit-line orbit-two" />
          {!classic && <BattleStation />}
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
                <Emblem size={22} />
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
            <PlayerToken key={p.id} player={p} index={i} position={visual[p.id]} />
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
