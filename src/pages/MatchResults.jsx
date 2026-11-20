import { mapText } from '../services/mapText.js';
import { boardFor } from '../game/maps.js';
import { motion } from 'motion/react';
import { Trophy, ArrowRight } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BOARD } from '../game/rules/data.js';
import { wealth } from '../game/engine/game.js';
import { serverCall } from '../services/supabase.js';
export default function MatchResults() {
  const BOARD = boardFor(useGameStore.getState().game);
  const { game, open, onlinePlayer } = useGameStore();
  if (game.phase !== 'finished')
    return <p className="notice">{mapText('The conquest continues.')}</p>;
  const winner = game.players.find((p) => p.id === game.winner);
  const winners = game.winningTeam
    ? game.players.filter((p) => p.team === game.winningTeam)
    : winner
      ? [winner]
      : [];
  const ids = new Set(winners.map((p) => p.id)),
    viewer = useGameStore.getState().online ? onlinePlayer : game.players[0].id;
  const owned = BOARD.filter((t) => ids.has(game.ownership[t.id]?.owner));
  return (
    <div className="victory-screen">
      {useGameStore.getState().online && (
        <button
          className="button gold-button"
          onClick={async () => {
            try {
              const next = await serverCall('nextRoom', {
                gameId: game.id,
                profile: useGameStore.getState().profile,
              });
              useGameStore.setState({
                lobbyRoom: next.room.id,
                playing: false,
                modal: 'rooms',
                error: null,
              });
            } catch (error) {
              useGameStore.setState({
                error: error.message,
              });
            }
          }}
        >
          Join next match <ArrowRight size={16} />
        </button>
      )}
      <motion.div
        initial={{
          scale: 0.6,
          rotate: -10,
        }}
        animate={{
          scale: 1,
          rotate: 0,
        }}
      >
        <Trophy size={80} />
      </motion.div>
      <span className="eyebrow gold">{mapText('THE GALAXY HAS A NEW RULER')}</span>
      <h3>{game.winningTeam || winner?.name || 'No remaining players'}</h3>
      <p>
        {!viewer ? 'MATCH COMPLETE' : ids.has(viewer) ? 'VICTORY' : 'DEFEAT'}
        {mapText('\xB7 Conquest concluded after')}
        {game.round} rounds.
      </p>
      <div className="profile-stats">
        <div>
          <strong>
            {mapText('\u25C8 ')}
            {winners.reduce((n, p) => n + wealth(game, p), 0).toLocaleString()}
          </strong>
          <small>{game.winningTeam ? 'TEAM WEALTH' : 'FINAL WEALTH'}</small>
        </div>
        <div>
          <strong>{owned.length}</strong>
          <small>{mapText('WORLDS OWNED')}</small>
        </div>
      </div>
      <div className="results-worlds">
        {owned.map((t) => (
          <span
            key={t.id}
            style={{
              borderColor: t.color || '#789bac',
            }}
          >
            {t.name}
          </span>
        ))}
      </div>
      <div className="rent-table results-table">
        {[...game.players]
          .sort((a, b) => wealth(game, b) - wealth(game, a))
          .map((p) => (
            <div key={p.id}>
              <span
                style={{
                  color: p.color,
                }}
              >
                {p.name}
                {ids.has(p.id) ? ' · WINNER' : p.bankrupt ? ' · ELIMINATED' : ''}
              </span>
              <strong>
                {mapText('\u25C8 ')}
                {wealth(game, p).toLocaleString()}
              </strong>
            </div>
          ))}
      </div>
      <button className="button gold-button full" onClick={() => open('newGame')}>
        {mapText('Conquer another galaxy')}
        <ArrowRight size={16} />
      </button>
      <button className="text-button full" onClick={() => open('history')}>
        View match history
      </button>
    </div>
  );
}
