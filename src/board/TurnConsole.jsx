import { motion } from 'motion/react';
import { Dices, ArrowRight, ChevronRight } from 'lucide-react';
import { boardFor, tokensFor } from '../game/maps.js';
import { mapText } from '../services/mapText.js';
import { useGameStore } from '../stores/gameStore.js';
import { TokenArt } from '../components/Art.jsx';
import ConnectionGrace from '../components/ConnectionGrace.jsx';
import Dice from './Dice.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { canRoll } from './rollPermission.js';

export default function TurnConsole({ moving = false, spatial = false }) {
  const { game, dispatch, busy, online, onlinePlayer, open, matchAway } = useGameStore();
  const reduced = useMotionPreference(),
    player = game.players[game.turn];
  const spectator = online && !onlinePlayer;
  const pending = boardFor(game)[game.pendingProperty];
  const canAct =
    !spectator &&
    !matchAway &&
    !moving &&
    !busy &&
    (!online || player.id === onlinePlayer) &&
    !player.ai;
  const canSettle = Boolean(
    game.debt &&
    (online
      ? game.debt.payer === onlinePlayer
      : !game.players.find((p) => p.id === game.debt.payer)?.ai),
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
                : 'Waiting for ' + game.players.find((p) => p.id === game.debt.payer)?.name
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
    <div className={'turn-console ' + (spatial ? 'spatial-console' : '')}>
      <div className="turn-banner">
        <span className="mini-avatar" style={{ color: player.color }}>
          <TokenArt
            character={tokensFor(game).find((token) => token.id === player.character)}
            size={24}
          />
        </span>
        <div>
          <span className="eyebrow">
            {mapText(
              player.ai
                ? 'AI COMMANDER'
                : online && player.id !== onlinePlayer
                  ? 'COMMANDER ON TURN'
                  : 'YOUR TURN',
            )}
          </span>
          <h3>
            {player.name}
            <small>
              {player.detained
                ? mapText('In detention')
                : game.phase === 'purchase'
                  ? `Discover ${pending?.name}`
                  : game.phase === 'auction'
                    ? mapText('A new world is up for auction')
                    : game.phase === 'debt'
                      ? 'Resolve the outstanding payment'
                      : 'Your next move changes everything.'}
            </small>
          </h3>
        </div>
        <ConnectionGrace
          player={game.debt ? game.players.find((p) => p.id === game.debt.payer) : player}
        />
        <span className="turn-marker">
          {String(game.turn + 1).padStart(2, '0')} / {String(game.players.length).padStart(2, '0')}
        </span>
      </div>
      <div className="roll-row">
        <Dice
          values={game.dice}
          version={game.version}
          rolling={game.lastActionType === 'ROLL'}
          reduced={reduced}
          canRoll={canRoll(useGameStore.getState(), moving)}
          onRoll={() => {
            if (canRoll(useGameStore.getState(), moving)) dispatch('ROLL');
          }}
        />
        <motion.button
          whileTap={reduced ? undefined : { scale: 0.95 }}
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
                ? 'Spectating · ' + player.name + '’s turn'
                : player.ai && !['auction', 'debt', 'finished'].includes(game.phase)
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
      {player.detained && game.phase === 'roll' && canAct && (
        <div className="detention-actions">
          <button className="text-button" onClick={() => dispatch('RELEASE')}>
            {mapText('Pay 50 credits to escape')}
          </button>
          {player.cards[0] && (
            <button
              className="text-button"
              onClick={() => dispatch('RELEASE', { card: player.cards[0] })}
            >
              Use escape card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
