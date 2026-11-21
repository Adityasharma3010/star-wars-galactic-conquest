import { mapText } from '../services/mapText.js';
import AnimatedBalance from './AnimatedBalance.jsx';
import { boardFor, groupsFor, tokensFor, isClassic } from '../game/maps.js';
import HoloSelect from './HoloSelect.jsx';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Crown,
  Coins,
  Globe2,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ArrowRightLeft,
  Building2,
  LockKeyhole,
  Send,
  ChevronRight,
  Layers,
  History,
  Trophy,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BOARD, CHARACTERS, GROUPS } from '../game/rules/data.js';
import { wealth, rent, ownsGroup } from '../game/engine/game.js';
import { loadChat, supabase, serverCall } from '../services/supabase.js';
import { blockPlayer } from '../services/social.js';
import { PlanetArt, TokenArt, Emblem } from './Art.jsx';
import ConnectionGrace from './ConnectionGrace.jsx';
export function PlayersPanel() {
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
  const { game, open, selected, select, online, onlinePlayer, presence } = useGameStore();
  const current = game.players[game.turn];
  const [focus, setFocus] = useState(null);
  const selectedPlayer =
    game.players.find((p) => p.id === focus) ||
    game.players.find((p) => p.id === onlinePlayer) ||
    game.players[0];
  const properties = BOARD.filter((t) => game.ownership[t.id]?.owner === selectedPlayer.id);
  return (
    <aside className="players-panel">
      <div className="panel-heading">
        <span>{mapText('COMMANDERS')}</span>
        <span className="count-pill">
          {game.players.filter((p) => !p.bankrupt).length} / {game.players.length}
        </span>
      </div>
      <div className="player-list">
        {game.players
          .filter((p) => !p.forfeited)
          .map((p, i) => (
            <motion.button
              key={p.id}
              data-player-card={p.id}
              className={`commander-card ${p.id === current.id ? 'active' : ''} ${p.bankrupt ? 'eliminated' : ''}`}
              whileHover={{
                x: 2,
              }}
              onClick={() => {
                setFocus(p.id);
                useGameStore.setState({
                  boardOwnerFilter: p.id,
                });
              }}
              onMouseEnter={() =>
                useGameStore.setState({
                  hoveredPlayer: p.id,
                })
              }
              onMouseLeave={() =>
                useGameStore.setState({
                  hoveredPlayer: null,
                })
              }
              onFocus={() =>
                useGameStore.setState({
                  hoveredPlayer: p.id,
                })
              }
              onBlur={() =>
                useGameStore.setState({
                  hoveredPlayer: null,
                })
              }
              title={`Current location: ${BOARD[p.position].name}`}
              style={{
                '--player': p.color,
              }}
            >
              <div className="commander-top">
                <span
                  className="avatar"
                  style={{
                    color: p.color,
                  }}
                >
                  <TokenArt character={CHARACTERS.find((c) => c.id === p.character)} size={42} />
                </span>
                <span className="commander-name">
                  {p.name}
                  <small>
                    {p.ai ? (
                      <>
                        <Bot size={10} /> {p.difficulty} AI
                      </>
                    ) : (
                      <>
                        <i className="status-dot" />{' '}
                        {online
                          ? p.id === onlinePlayer
                            ? 'You'
                            : presence?.[p.id]
                              ? 'Online'
                              : 'Reconnecting'
                          : game.players.filter((x) => !x.ai).length > 1
                            ? 'Local commander'
                            : 'You'}
                        {i === 0 && <Crown size={10} />}
                      </>
                    )}
                  </small>
                </span>
                {p.id === current.id && (
                  <span className="active-arrow">
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>
              <div className="commander-stats">
                <span>
                  <Coins size={12} />
                  <strong>
                    <AnimatedBalance value={p.credits} />
                  </strong>
                  <small>{mapText('CR')}</small>
                </span>
                <span>
                  <Globe2 size={12} />
                  {Object.values(game.ownership).filter((o) => o.owner === p.id).length}
                  <small>{mapText('WORLDS')}</small>
                </span>
              </div>
              <ConnectionGrace player={p} />
              {p.id === current.id && (
                <div className="current-turn-line">
                  <span>
                    {p.bankrupt ? 'ELIMINATED' : p.detained ? 'IN DETENTION' : 'CURRENT TURN'}
                  </span>
                  <i />
                </div>
              )}
            </motion.button>
          ))}
      </div>
      <div className="portfolio">
        <div className="panel-heading">
          <span>
            {mapText(
              selectedPlayer.id === (onlinePlayer || game.players[0].id)
                ? 'YOUR EMPIRE'
                : `${selectedPlayer.name.split(' ')[0].toUpperCase()}’S EMPIRE`,
            )}
          </span>
          <Layers size={14} />
        </div>
        <div className="empire-value">
          <small>TOTAL NET WORTH</small>
          <strong>
            {mapText(' \u25C8 ')}
            {wealth(game, selectedPlayer).toLocaleString()}
            {!isClassic(game) && <span> CR</span>}
          </strong>
        </div>
        <div className="group-progress">
          {GROUPS.map((g) => (
            <span
              key={g.id}
              title={`${g.name}: ${properties.filter((t) => t.group === g.id).length} owned`}
              style={{
                '--group': g.color,
              }}
            >
              {BOARD.filter((t) => t.group === g.id).map((t) => (
                <i
                  key={t.id}
                  className={game.ownership[t.id]?.owner === selectedPlayer.id ? 'owned' : ''}
                />
              ))}
            </span>
          ))}
        </div>
        {properties.length ? (
          <div className="owned-worlds">
            {properties.map((t) => (
              <button
                key={t.id}
                onClick={() => select(t.id)}
                className={selected === t.id ? 'selected' : ''}
              >
                <i
                  style={{
                    background: t.color || '#788b9d',
                  }}
                />
                {t.name}
                <span>
                  {game.ownership[t.id].mortgaged ? (
                    <LockKeyhole size={11} />
                  ) : game.ownership[t.id].level ? (
                    <Building2 size={11} />
                  ) : (
                    <ArrowUpRight size={11} />
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-portfolio">
            {mapText('Every empire begins with a single world.')}
            <br />
            Roll the dice to discover yours.
          </p>
        )}
        <button
          className="button subtle-button full"
          disabled={online && !onlinePlayer}
          onClick={() => open('trade')}
        >
          <ArrowRightLeft size={14} /> Propose a trade
        </button>
      </div>
      <div className="sidebar-bottom">
        <Emblem size={29} />
        <p>
          Choose your allegiance.
          <br />
          <span>Forge your own destiny.</span>
        </p>
      </div>
    </aside>
  );
}
export function PropertyPanel() {
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
  const { game, selected, dispatch, open, online, onlinePlayer } = useGameStore();
  const tile = {
      ...BOARD[selected],
      tax:
        BOARD[selected].type === 'tax'
          ? selected === 4
            ? '10% of ' + (game.rules.taxBasis === 'wealth' ? 'total wealth' : 'cash')
            : game.rules.luxuryTax
          : BOARD[selected].tax,
    },
    o = game.ownership[selected],
    owner = game.players.find((p) => p.id === o?.owner),
    current = game.players[game.turn],
    manager = game.players.find((p) => p.id === (game.debt?.payer || current.id)),
    mine =
      o?.owner === manager?.id &&
      (online ? manager.id === onlinePlayer : !manager.ai) &&
      ['roll', 'end', 'debt'].includes(game.phase);
  const group = GROUPS.find((g) => g.id === tile.group);
  return (
    <div className="property-panel">
      <div className="panel-heading">
        <span>SECTOR INTELLIGENCE</span>
        <button
          className="icon-button"
          aria-label="Open complete property deed"
          onClick={() => open('deed')}
        >
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div
        className="property-hero"
        style={{
          '--planet': tile.planetColor || '#77a9b5',
        }}
      >
        {tile.type === 'property' ? <PlanetArt tile={tile} large /> : <Emblem size={110} />}
        <span className="sector-tag">SECTOR {String(tile.id).padStart(2, '0')}</span>
        <span className="property-owner-tag">{owner ? owner.name : 'UNCLAIMED'}</span>
        <div className="property-hero-title">
          <span
            className="eyebrow"
            style={{
              color: tile.color || '#85b5be',
            }}
          >
            {group?.name || tile.type.toUpperCase()}
          </span>
          <h2>{tile.name}</h2>
        </div>
      </div>
      <div className="property-body">
        <p>{tile.description || specialDescription(tile)}</p>
        {tile.price ? (
          <>
            <div className="deed-stats">
              <div>
                <small>ACQUISITION</small>
                <strong>
                  {mapText('\u25C8 ')}
                  {tile.price}
                </strong>
              </div>
              <div>
                <small>{o ? 'CURRENT RENT' : 'BASE RENT'}</small>
                <strong>
                  {mapText(' \u25C8')}{' '}
                  {o
                    ? rent(game, tile, game.dice[0] + game.dice[1])
                    : tile.rents?.[0] || (tile.type === 'utility' ? '4× dice' : 25)}
                </strong>
              </div>
            </div>
            <div className="deed-detail">
              <span>
                <LockKeyhole size={12} /> Mortgage value
              </span>
              <strong>
                {mapText('\u25C8 ')}
                {tile.mortgage}
              </strong>
            </div>
            {tile.buildCost && (
              <div className="deed-detail">
                <span>
                  <Building2 size={12} />
                  {mapText('Outpost / base cost')}
                </span>
                <strong>
                  {mapText('\u25C8 ')}
                  {tile.buildCost}
                </strong>
              </div>
            )}
            <button className="button subtle-button full" onClick={() => open('deed')}>
              View property deed <ArrowRight size={14} />
            </button>
            {mine && (
              <div className="property-management">
                {tile.type === 'property' && (
                  <>
                    <button
                      className="button"
                      disabled={game.phase === 'debt'}
                      onClick={() =>
                        dispatch('BUILD', {
                          property: tile.id,
                        })
                      }
                    >
                      <Plus size={13} /> Develop
                    </button>
                    {o.level > 0 && (
                      <button
                        className="button"
                        onClick={() =>
                          dispatch('SELL', {
                            property: tile.id,
                          })
                        }
                      >
                        {mapText('Sell outpost')}
                      </button>
                    )}
                  </>
                )}
                <button
                  className="button"
                  disabled={game.phase === 'debt' && o.mortgaged}
                  onClick={() =>
                    dispatch(o.mortgaged ? 'UNMORTGAGE' : 'MORTGAGE', {
                      property: tile.id,
                    })
                  }
                >
                  {o.mortgaged ? 'Redeem' : 'Mortgage'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="deed-detail">
            <span>Space effect</span>
            <strong>
              {tile.type === 'tax'
                ? selected === 4
                  ? `Pay ${tile.tax}`
                  : mapText(`Pay ◈ ${tile.tax}`)
                : tile.type === 'start'
                  ? mapText(`Collect ◈ ${game.rules.startBonus}`)
                  : 'See game rules'}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
export function specialDescription(t) {
  if (t.id === 4)
    return (
      'Pay 10% of ' +
      (useGameStore.getState().game?.rules?.taxBasis === 'wealth'
        ? 'total wealth (cash, property value and buildings)'
        : 'your current cash') +
      '. Rounded up to a whole game currency unit.'
    );
  if (t.mapId === 'india')
    return {
      force: 'Draw a Chance card and follow its instructions.',
      galactic: 'Draw a Community Chest card and follow its instructions.',
      transport: 'Railway rent increases with the number of railways owned.',
      utility: 'Pay 4× the dice total, or 10× if the owner has both utilities.',
      detention: 'Visiting is free. Leave Jail with doubles, a release card, or a 50 payment.',
      goDetention: 'Go directly to Jail without collecting the GO bonus.',
      parking: 'Rest here. Collect the tax pot only if the custom rule is enabled.',
      start: 'Collect the configured bonus when passing GO.',
      tax: 'Pay the configured Luxury Tax to the bank.',
    }[t.type];
  return {
    force: 'An unexpected turn in the Force. Draw an event card and follow its instructions.',
    galactic: 'Dispatches from across the galaxy bring opportunities and challenges.',
    transport: 'Connect the galaxy. Owning more transports increases the rent collected.',
    utility: 'Keep the galaxy connected. Rent is determined by the dice and your utility network.',
    start: 'The beginning of every journey. Collect the starting bonus when you pass.',
    detention:
      'Visiting commanders are safe. Detained commanders must roll doubles, pay 50 credits, or use an escape card.',
    goDetention:
      'Imperial authorities intercept your ship. Go directly to detention without collecting the starting bonus.',
    parking: 'A peaceful orbit. Rest here; collect the tax pool only if the house rule is enabled.',
    tax: 'The Empire demands its share. Pay the configured tax to the bank.',
  }[t.type];
}
export function ActivityPanel() {
  const { game, tab, open, messages, message, online, onlinePlayer, settings, updateSettings } =
    useGameStore();
  const [activeTab, setActiveTab] = useState('events'),
    [text, setText] = useState(''),
    [scope, setScope] = useState('match'),
    [report, setReport] = useState(null),
    [reason, setReason] = useState('');
  useEffect(() => {
    if (!online) return;
    const refresh = () =>
      loadChat(game.id, scope)
        .then((messages) =>
          useGameStore.setState({
            messages,
          }),
        )
        .catch((e) =>
          useGameStore.setState({
            error: e.message,
          }),
        );
    refresh();
    const ch = supabase
      .channel('comms:' + game.id + ':' + scope)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        refresh,
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [game.id, scope, online]);
  return (
    <div className="activity-panel">
      <div className="activity-tabs">
        <button
          className={activeTab === 'events' ? 'selected' : ''}
          onClick={() => setActiveTab('events')}
        >
          <History size={13} /> Flight log
        </button>
        <button
          className={activeTab === 'chat' ? 'selected' : ''}
          onClick={() => setActiveTab('chat')}
        >
          <Radio size={13} /> Comms <span>{messages.length}</span>
        </button>
      </div>
      {activeTab === 'chat' && online && (
        <label className="comms-scope">
          Channel
          <HoloSelect
            aria-label="Chat channel"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="match">Match</option>
            {game.rules.teams && <option value="team">Team</option>}
            <option value="global">Global</option>
          </HoloSelect>
        </label>
      )}
      <div className="activity-content" role="log" aria-live="polite">
        {activeTab === 'events' ? (
          [...game.events]
            .reverse()
            .slice(0, 18)
            .map((e, i) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className={`log-entry ${e.type}`}
                key={e.id}
              >
                <span className="log-icon">
                  {e.type === 'money' ? (
                    <Coins size={12} />
                  ) : e.type === 'purchase' ? (
                    <Globe2 size={12} />
                  ) : e.type === 'card' ? (
                    <Sparkles size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </span>
                <p>
                  {e.text}
                  <small>ROUND {String(e.turn).padStart(2, '0')}</small>
                </p>
              </motion.div>
            ))
        ) : messages.length ? (
          [...messages]
            .reverse()
            .filter((m) => !settings.mutedPlayers?.includes(m.sender))
            .map((m) => (
              <div className="chat-message" key={m.id}>
                <strong>{m.name || 'Commander'}</strong>
                <p>{m.text}</p>
                {online && m.sender !== onlinePlayer && (
                  <div className="message-controls">
                    <button
                      onClick={() =>
                        updateSettings({
                          mutedPlayers: [...new Set([...(settings.mutedPlayers || []), m.sender])],
                        })
                      }
                    >
                      Mute
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await blockPlayer(m.sender);
                          updateSettings({
                            mutedPlayers: [
                              ...new Set([...(settings.mutedPlayers || []), m.sender]),
                            ],
                          });
                        } catch (e) {
                          useGameStore.setState({
                            error: e.message,
                          });
                        }
                      }}
                    >
                      Block
                    </button>
                    <button onClick={() => setReport(m)}>Report</button>
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="comms-empty">
            <Radio size={24} />
            <p>All frequencies are quiet.</p>
            <small>
              {useGameStore.getState().online
                ? 'Send a transmission to your room.'
                : 'Local messages are saved on this device.'}
            </small>
          </div>
        )}
      </div>
      {activeTab === 'chat' && (
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            message(text, scope);
            setText('');
          }}
        >
          <input
            aria-label="Chat message"
            disabled={online && !onlinePlayer}
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a transmission…"
          />
          <button
            className="icon-button"
            aria-label="Send message"
            disabled={!text.trim() || (online && !onlinePlayer)}
          >
            <Send size={15} />
          </button>
        </form>
      )}
      {report && (
        <form
          className="report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await serverCall('report', {
                playerId: report.sender,
                gameId: scope === 'global' ? null : game.id,
                reason,
              });
              setReport(null);
              setReason('');
            } catch (error) {
              useGameStore.setState({
                error: error.message,
              });
            }
          }}
        >
          <label>
            Report {report.name}
            <textarea
              aria-label="Report reason"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="button">Submit report</button>
          <button type="button" className="text-button" onClick={() => setReport(null)}>
            Cancel
          </button>
        </form>
      )}
      <div className="log-footer">
        <i className="status-dot" />{' '}
        {useGameStore.getState().online ? 'SECURE ROOM CHANNEL' : 'LOCAL COMMAND CHANNEL'}
      </div>
    </div>
  );
}
