import { MusicSettings } from '../components/MatchMusic.jsx';
import HoloSelect from '../components/HoloSelect.jsx';
import { useEffect, useState } from 'react';
import Social from './Social.jsx';
import Victory from './MatchResults.jsx';
import Profile, { MatchHistory } from './CommanderProfile.jsx';
import Rooms, { RuleFields } from './MultiplayerLobby.jsx';
import Countdown from '../components/Countdown.jsx';
import SoundPack from '../components/BuiltInSoundPack.jsx';
import Cosmetics from './Cosmetics.jsx';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  Bot,
  Users,
  Globe2,
  Crown,
  Shield,
  Sparkles,
  Dices,
  Coins,
  ArrowRightLeft,
  LockKeyhole,
  Trophy,
  Plus,
  Radio,
  RefreshCw,
  Mail,
  LogOut,
  Search,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BOARD, CHARACTERS, FACTIONS, DEFAULT_RULES, GROUPS, THEME } from '../game/rules/data.js';
import { wealth, ownsGroup } from '../game/engine/game.js';
import { PlanetArt, TokenArt, Emblem } from '../components/Art.jsx';
import Modal from '../components/Modal.jsx';
import HoloLoader from '../components/HoloLoader.jsx';
import { specialDescription } from '../components/Panels.jsx';
import {
  authenticate,
  backendConfigured,
  guestAuth,
  roomList,
  serverCall,
  supabase,
  syncProfile,
  cloudProfile,
} from '../services/supabase.js';

function Notice({ children }) {
  return (
    <div className="notice">
      <Radio size={18} />
      <p>{children}</p>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function NewGame() {
  const { profile, start, game, online, open } = useGameStore(),
    [mode, setMode] = useState(() => useGameStore.getState().ruleDrafts.local?.mode || 'solo'),
    [character, setCharacter] = useState(profile.character),
    [faction, setFaction] = useState(profile.faction),
    [name, setName] = useState(profile.name),
    [count, setCount] = useState(() => useGameStore.getState().ruleDrafts.local?.count || 4),
    [difficulty, setDifficulty] = useState(
      () => useGameStore.getState().ruleDrafts.local?.difficulty || 'medium',
    ),
    [rules, setRules] = useState(() => ({
      ...DEFAULT_RULES,
      ...useGameStore.getState().ruleDrafts.local?.rules,
    })),
    [humans, setHumans] = useState(() => useGameStore.getState().ruleDrafts.local?.humans || 1);
  const [customTab, setCustomTab] = useState('rules');
  useEffect(
    () =>
      useGameStore.getState().updateRuleDraft('local', { rules, mode, count, humans, difficulty }),
    [rules, mode, count, humans, difficulty],
  );
  const selected = CHARACTERS.find((c) => c.id === character);
  const selectedDifficulty = mode === 'custom' ? rules.difficulty : difficulty;
  const launch = () => {
    const chars = [selected, ...CHARACTERS.filter((c) => c.id !== character)].slice(0, count),
      ps = chars.map((c, i) => ({
        id: i === 0 ? 'you' : `player-${i}`,
        name: i === 0 ? name.trim() || 'Commander' : i < humans ? `Commander ${i + 1}` : c.name,
        character: c.id,
        color: c.color,
        faction: i === 0 ? faction : c.faction,
        ai: i >= humans,
        difficulty: selectedDifficulty,
        team:
          mode === 'teams' || (mode === 'custom' && rules.teams)
            ? i % 2 === 0
              ? 'Rebel Squadron'
              : 'Imperial Squadron'
            : null,
      }));
    useGameStore.getState().updateProfile({ name: name.trim() || 'Commander', character, faction });
    start(ps, {
      ...rules,
      teams: mode === 'teams' || (mode === 'custom' && rules.teams),
      difficulty: selectedDifficulty,
      startingCredits: mode === 'quick' ? 1000 : rules.startingCredits,
      roundLimit: mode === 'quick' ? 20 : rules.roundLimit,
    });
  };
  return (
    <div className="new-game">
      <div className="mode-tabs">
        {[
          ['solo', Bot, 'Solo vs AI'],
          ['local', Users, 'Pass & play'],
          ['teams', Shield, 'Teams'],
          ['quick', Sparkles, 'Quick'],
          ['custom', Dices, 'Custom'],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            className={mode === id ? 'selected' : ''}
            onClick={() => {
              setMode(id);
              setHumans(id === 'local' ? 2 : 1);
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {mode === 'custom' && (
        <div className="custom-setup-tabs">
          <button
            className={customTab === 'commander' ? 'selected' : ''}
            onClick={() => setCustomTab('commander')}
          >
            <Users size={14} />
            Commander & roster
          </button>
          <button
            className={customTab === 'rules' ? 'selected' : ''}
            onClick={() => setCustomTab('rules')}
          >
            <Dices size={14} />
            Match rules
          </button>
        </div>
      )}
      <div
        className="setup-grid"
        style={{ display: mode === 'custom' && customTab === 'rules' ? 'none' : undefined }}
      >
        <div>
          <div className="character-preview" style={{ color: selected.color }}>
            <TokenArt character={selected} size={140} />
            <span className="eyebrow">YOUR CHARACTER</span>
            <h3>{selected.name}</h3>
            <small>{selected.faction} · Abstract token</small>
          </div>
          <div className="character-grid">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                className={character === c.id ? 'selected' : ''}
                style={{ color: c.color }}
                onClick={() => setCharacter(c.id)}
                aria-label={`Select ${c.name}`}
              >
                <TokenArt character={c} size={42} />
                <span>{c.name.split(' ').slice(-1)[0]}</span>
                {character === c.id && <Check size={11} />}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-fields">
          <Field label="COMMANDER NAME">
            <input
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your callsign"
            />
          </Field>
          <Field label="ALLEGIANCE">
            <HoloSelect value={faction} onChange={(e) => setFaction(e.target.value)}>
              {FACTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </HoloSelect>
          </Field>
          <div className="field-row">
            <Field label="COMMANDERS">
              <HoloSelect
                value={count}
                onChange={(e) => {
                  setCount(+e.target.value);
                  setHumans(Math.min(humans, +e.target.value));
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} players
                  </option>
                ))}
              </HoloSelect>
            </Field>
            {mode !== 'custom' && (
              <Field label="AI DIFFICULTY">
                <HoloSelect value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  {['easy', 'medium', 'hard', 'expert'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </HoloSelect>
              </Field>
            )}
          </div>
          {mode !== 'solo' && (
            <Field label="HUMAN PLAYERS ON THIS DEVICE">
              <HoloSelect value={humans} onChange={(e) => setHumans(+e.target.value)}>
                {Array.from({ length: count }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1} human{i ? 's' : ''} · {count - i - 1} AI
                  </option>
                ))}
              </HoloSelect>
            </Field>
          )}
          <div className="setup-summary">
            <div>
              <Coins size={14} />
              <span>Starting credits</span>
              <strong>◈ {mode === 'quick' ? 1000 : rules.startingCredits}</strong>
            </div>
            <div>
              <Globe2 size={14} />
              <span>Worlds to acquire</span>
              <strong>22</strong>
            </div>
            <div>
              <Shield size={14} />
              <span>Match type</span>
              <strong>{mode === 'teams' ? '2 teams' : 'Individual'}</strong>
            </div>
          </div>
          <p className="muted setup-note">
            This starts a fresh local match and replaces the current save.{' '}
            {mode === 'teams'
              ? 'Team members do not pay each other rent and share victory.'
              : 'Progress saves automatically on this device.'}
          </p>
          <button className="button gold-button full" onClick={launch}>
            Launch conquest <ArrowRight size={17} />
          </button>
          <button className="text-button full online-link" onClick={() => open('rooms')}>
            Looking for online play? Find a room <ArrowRight size={12} />
          </button>
        </div>
      </div>
      {mode === 'custom' && customTab === 'rules' && (
        <div className="custom-match-rules">
          <RuleFields
            rules={rules}
            setRules={setRules}
            onReset={() => setRules({ ...DEFAULT_RULES })}
          />
          <div className="custom-rule-launch">
            <span>
              ◈ {rules.startingCredits} CR · {count} commanders ·{' '}
              {rules.teams ? 'Teams' : 'Individual'} conquest
            </span>
            <button className="button gold-button" onClick={launch}>
              Launch conquest <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function Deed() {
  const { game, selected, dispatch, close, online, onlinePlayer } = useGameStore(),
    t = BOARD[selected],
    o = game.ownership[selected],
    p = game.players[game.turn],
    group = GROUPS.find((g) => g.id === t.group);
  return (
    <div className="deed-modal">
      <div className="deed-art">
        <PlanetArt tile={t} large />
        <span className="eyebrow" style={{ color: t.color }}>
          {group?.name || t.type}
        </span>
        <h3>{t.name}</h3>
        <p>{t.description || specialDescription(t)}</p>
      </div>
      {t.price && (
        <>
          <div className="rent-table">
            <div>
              <span>Purchase price</span>
              <strong>◈ {t.price}</strong>
            </div>
            {t.rents ? (
              t.rents.map((v, i) => (
                <div key={i} className={o?.level === i ? 'current' : ''}>
                  <span>
                    {
                      [
                        'Base rent',
                        'With 1 outpost',
                        'With 2 outposts',
                        'With 3 outposts',
                        'With 4 outposts',
                        'With planetary base',
                      ][i]
                    }
                  </span>
                  <strong>◈ {v}</strong>
                </div>
              ))
            ) : t.type === 'transport' ? (
              [25, 50, 100, 200].map((v, i) => (
                <div key={i}>
                  <span>
                    {i + 1} transport{i ? 's' : ''}
                  </span>
                  <strong>◈ {v}</strong>
                </div>
              ))
            ) : (
              <>
                <div>
                  <span>One utility</span>
                  <strong>4 × dice total</strong>
                </div>
                <div>
                  <span>Both utilities</span>
                  <strong>10 × dice total</strong>
                </div>
              </>
            )}
            <div>
              <span>Mortgage value</span>
              <strong>◈ {t.mortgage}</strong>
            </div>
            {t.buildCost && (
              <div>
                <span>Development cost</span>
                <strong>◈ {t.buildCost}</strong>
              </div>
            )}
          </div>
          {t.type === 'property' && (
            <p className="muted">
              Undeveloped rent doubles when the full color group is owned. Develop evenly. Mortgaged
              worlds collect no rent.
            </p>
          )}
          {game.phase === 'purchase' &&
            game.pendingProperty === selected &&
            !p.ai &&
            (!online || onlinePlayer === p.id) && (
              <button
                className="button gold-button full"
                onClick={async () => {
                  await dispatch('BUY');
                  if (!useGameStore.getState().error) close();
                }}
              >
                Acquire for ◈ {t.price}
                <ArrowRight size={16} />
              </button>
            )}
        </>
      )}
      {t.eraNote && <p className="era-note">{t.eraNote}</p>}
      {t.source && (
        <a className="source-link" href={t.source} target="_blank" rel="noreferrer">
          Explore the official Star Wars Databank ↗
        </a>
      )}
    </div>
  );
}
export function Trade() {
  const { game, dispatch, online, onlinePlayer } = useGameStore(),
    [draftActor, setDraftActor] = useState(online ? onlinePlayer : game.players[game.turn].id),
    [counter, setCounter] = useState(null),
    me = game.players.find((p) => p.id === draftActor),
    [to, setTo] = useState(game.players.find((p) => p.id !== me.id && !p.bankrupt)?.id),
    [give, setGive] = useState([]),
    [take, setTake] = useState([]),
    [cash, setCash] = useState(0),
    [requestCash, setRequestCash] = useState(0),
    [giveCards, setGiveCards] = useState([]),
    [takeCards, setTakeCards] = useState([]);
  const partner = game.players.find((p) => p.id === to),
    toggle = (list, set, id) =>
      set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const selection = (p, list, set, cardList, setCards) => (
    <div className="trade-side">
      <span className="trade-manifest-label">
        {p.id === me.id ? 'YOUR OFFER' : 'REQUESTED FROM ' + p.name.toUpperCase()}
      </span>
      <div className="trade-person" style={{ color: p.color }}>
        <TokenArt character={CHARACTERS.find((c) => c.id === p.character)} size={35} />
        <strong>{p.name}</strong>
        <span>◈ {p.credits}</span>
      </div>
      <div className="trade-properties">
        {BOARD.filter((t) => game.ownership[t.id]?.owner === p.id).map((t) => (
          <label key={t.id}>
            <input
              type="checkbox"
              checked={list.includes(t.id)}
              onChange={() => toggle(list, set, t.id)}
            />
            <span className="trade-world-image">
              <PlanetArt tile={t} />
            </span>
            <i style={{ background: t.color || '#8b9dac' }} />
            <span className="trade-world-name">
              {t.name}
              <small>
                {game.ownership[t.id]?.mortgaged
                  ? 'MORTGAGED WORLD'
                  : GROUPS.find((g) => g.id === t.group)?.name || 'TRANSPORT & INFRASTRUCTURE'}
              </small>
            </span>
            <span>◈ {t.price}</span>
          </label>
        ))}
        {!Object.values(game.ownership).some((o) => o.owner === p.id) && (
          <p className="muted">No worlds owned yet.</p>
        )}
        {p.cards.map((id) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={cardList.includes(id)}
              onChange={() => toggle(cardList, setCards, id)}
            />
            Detention escape card
          </label>
        ))}
      </div>
      <Field label="CREDITS INCLUDED">
        <input
          type="number"
          min="0"
          max={p.credits}
          value={p.id === me.id ? cash : requestCash}
          onChange={(e) =>
            p.id === me.id ? setCash(+e.target.value) : setRequestCash(+e.target.value)
          }
        />
      </Field>
    </div>
  );
  return (
    <div className="negotiation-deck">
      <div className="trade-banner">
        <Emblem size={34} />
        <div>
          <span className="eyebrow gold">OUTER RIM EXCHANGE</span>
          <p>Worlds. Credits. An alliance worth making.</p>
        </div>
        <span className="hololink-status">
          <i /> SECURE HOLOLINK
        </span>
      </div>
      <Field label="TRADE PARTNER">
        <HoloSelect
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setTake([]);
            setTakeCards([]);
          }}
        >
          {game.players
            .filter((p) => p.id !== me.id && !p.bankrupt)
            .map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
        </HoloSelect>
      </Field>
      <div className="trade-grid">
        {selection(me, give, setGive, giveCards, setGiveCards)}
        <div className="trade-transfer" aria-hidden="true">
          <ArrowRightLeft size={26} />
          <span>NEGOTIATE</span>
        </div>
        {partner && selection(partner, take, setTake, takeCards, setTakeCards)}
      </div>
      <p className="muted">
        Offers expire after three rounds. Developments must be sold before transferring a group. A
        recipient pays 10% interest on transferred mortgages.
      </p>
      <button
        className="button gold-button full"
        disabled={!['roll', 'end'].includes(game.phase)}
        onClick={async () => {
          await dispatch(
            counter ? 'TRADE_COUNTER' : 'TRADE_OFFER',
            { trade: counter, to, give, take, cash, requestCash, giveCards, takeCards },
            me.id,
          );
          if (!useGameStore.getState().error) {
            const actor = online
              ? onlinePlayer
              : useGameStore.getState().game.players[useGameStore.getState().game.turn].id;
            setDraftActor(actor);
            setCounter(null);
            setGive([]);
            setTake([]);
            setCash(0);
            setRequestCash(0);
            setGiveCards([]);
            setTakeCards([]);
            setTo(game.players.find((p) => p.id !== actor && !p.bankrupt)?.id);
          }
        }}
      >
        <ArrowRightLeft size={16} /> {counter ? 'Send counteroffer' : 'Send trade offer'}
      </button>
      <div className="pending-trades">
        <h4>Negotiations</h4>
        {game.trades.length ? (
          [...game.trades].reverse().map((t) => (
            <div className={'trade-offer ' + t.status} key={t.id}>
              <strong>
                {game.players.find((p) => p.id === t.from).name} →{' '}
                {game.players.find((p) => p.id === t.to).name}
              </strong>
              <small>
                {t.status.toUpperCase()} · EXPIRES ROUND {t.expires}
              </small>
              <p>
                {t.give.map((id) => BOARD[id].name).join(', ') || 'No worlds'} + ◈ {t.cash}
                <br />
                for {t.take.map((id) => BOARD[id].name).join(', ') || 'No worlds'} + ◈{' '}
                {t.requestCash}
              </p>
              {t.status === 'pending' &&
                (online ? t.to === onlinePlayer : !game.players.find((p) => p.id === t.to).ai) && (
                  <div className="button-row">
                    <button
                      className="button"
                      onClick={() => dispatch('TRADE_ACCEPT', { trade: t.id }, t.to)}
                    >
                      Accept
                    </button>
                    <button
                      className="button"
                      onClick={() => dispatch('TRADE_DECLINE', { trade: t.id }, t.to)}
                    >
                      Decline
                    </button>
                    <button
                      className="button"
                      onClick={async () => {
                        setDraftActor(t.to);
                        setTo(t.from);
                        setCounter(t.id);
                        setGive(t.take);
                        setTake(t.give);
                        setGiveCards(t.takeCards);
                        setTakeCards(t.giveCards);
                        setCash(t.requestCash);
                        setRequestCash(t.cash);
                      }}
                    >
                      Counter
                    </button>
                  </div>
                )}
              {t.status === 'pending' && t.from === me.id && (
                <button
                  className="text-button"
                  onClick={() => dispatch('TRADE_CANCEL', { trade: t.id }, t.from)}
                >
                  Cancel offer
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="muted">No trade offers this match.</p>
        )}
      </div>
    </div>
  );
}
export function Auction() {
  const { game, dispatch, online, onlinePlayer } = useGameStore(),
    a = game.auction,
    [amount, setAmount] = useState((a?.bid || 0) + 10),
    [bidder, setBidder] = useState(
      onlinePlayer || game.players.find((p) => !p.ai && !p.bankrupt)?.id,
    );
  useEffect(() => setAmount((a?.bid || 0) + 10), [a?.bid]);
  if (!a)
    return <Notice>The auction has concluded. The result is recorded in your flight log.</Notice>;
  const t = BOARD[a.property],
    p = game.players.find((p) => p.id === bidder);
  return (
    <div className="auction-modal">
      <div className="auction-world">
        <PlanetArt tile={t} />
        <div>
          <span className="eyebrow gold">LIVE AUCTION</span>
          <h3>{t.name}</h3>
          <p>Listed value ◈ {t.price}</p>
        </div>
      </div>
      <div className="auction-bid">
        <Countdown deadline={a.deadline} auction />
        <small>CURRENT BID</small>
        <strong>◈ {a.bid}</strong>
        <span>{game.players.find((p) => p.id === a.bidder)?.name || 'Awaiting the first bid'}</span>
      </div>
      {!online && (
        <Field label="BIDDING COMMANDER">
          <HoloSelect value={bidder} onChange={(e) => setBidder(e.target.value)}>
            {game.players
              .filter((p) => !p.ai && !p.bankrupt)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </HoloSelect>
        </Field>
      )}
      <Field label={`YOUR BID · AVAILABLE ◈ ${p?.credits || 0}`}>
        <input
          type="number"
          min={a.bid + 10}
          step="10"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
        />
      </Field>
      <div className="button-row">
        <button
          className="button gold-button"
          disabled={a.passed.includes(bidder)}
          onClick={() => dispatch('BID', { amount }, bidder)}
        >
          Place bid <Coins size={16} />
        </button>
        <button
          className="button"
          disabled={a.passed.includes(bidder) || a.bidder === bidder}
          onClick={() => dispatch('PASS', {}, bidder)}
        >
          {a.passed.includes(bidder) ? 'You passed' : 'Pass auction'}
        </button>
      </div>
      <p className="muted">
        Minimum increment: 10 credits. Each bid resets the closing countdown to 10 seconds. The last
        bidder wins when everyone else passes.
      </p>
      <div className="auction-status">
        {game.players
          .filter((p) => !p.bankrupt)
          .map((p) => (
            <span key={p.id} style={{ color: p.color }}>
              {p.name}
              <small>
                {a.passed.includes(p.id) ? 'PASSED' : a.bidder === p.id ? 'LEADING' : 'BIDDING'}
              </small>
            </span>
          ))}
      </div>
      <div className="rent-table">
        {[...a.bids]
          .reverse()
          .slice(0, 8)
          .map((b, i) => (
            <div key={i}>
              <span>{game.players.find((p) => p.id === b.player).name}</span>
              <strong>◈ {b.amount}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}
export function Debt() {
  const { game, dispatch } = useGameStore(),
    d = game.debt;
  if (!d) return <Notice>Your debt is settled. Continue the conquest.</Notice>;
  const p = game.players.find((p) => p.id === d.payer);
  return (
    <div>
      <Notice>
        {p.name} owes ◈ {d.amount} to{' '}
        {game.players.find((p) => p.id === d.creditor)?.name || 'the bank'}. Sell developments or
        mortgage undeveloped worlds to raise credits.
      </Notice>
      <div className="debt-balance">
        <Coins size={24} />
        <strong>◈ {p.credits}</strong>
        <span>AVAILABLE / ◈ {d.amount} REQUIRED</span>
      </div>
      <div className="debt-properties">
        {BOARD.filter((t) => game.ownership[t.id]?.owner === p.id).map((t) => (
          <div key={t.id}>
            <span>{t.name}</span>
            {game.ownership[t.id].level > 0 ? (
              <button className="button" onClick={() => dispatch('SELL', { property: t.id }, p.id)}>
                Sell development +{t.buildCost / 2}
              </button>
            ) : (
              <button
                className="button"
                disabled={game.ownership[t.id].mortgaged}
                onClick={() => dispatch('MORTGAGE', { property: t.id }, p.id)}
              >
                {game.ownership[t.id].mortgaged ? 'Mortgaged' : `Mortgage +${t.mortgage}`}
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="button gold-button full"
        onClick={() => dispatch('SETTLE', {}, p.id)}
        disabled={p.credits < d.amount}
      >
        Settle debt <Check size={16} />
      </button>
      <button className="button danger-button full" onClick={() => dispatch('BANKRUPT', {}, p.id)}>
        Declare bankruptcy & transfer remaining assets
      </button>
    </div>
  );
}
export function Settings() {
  const { settings, updateSettings } = useGameStore();
  return (
    <div>
      <MusicSettings />
      <h4>Opening & game sounds</h4>
      <label className="toggle-row">
        <span>Opening crawl music</span>
        <input
          type="checkbox"
          checked={settings.introMusic !== false}
          onChange={(e) => updateSettings({ introMusic: e.target.checked })}
        />
      </label>
      <p className="muted">
        Opening music: the original John Williams Main Title through its official YouTube player.
        Playback controls remain available in the intro.
      </p>
      <label className="toggle-row">
        <span>Mute game sounds</span>
        <input
          type="checkbox"
          checked={settings.mute}
          onChange={(e) => updateSettings({ mute: e.target.checked })}
        />
      </label>
      <Field label={`MASTER VOLUME · ${Math.round(settings.volume * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.volume}
          onChange={(e) => updateSettings({ volume: +e.target.value })}
        />
      </Field>
      <Field label={`EFFECTS VOLUME · ${Math.round(settings.effectsVolume * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.effectsVolume}
          onChange={(e) => updateSettings({ effectsVolume: +e.target.value })}
        />
      </Field>
      <label className="toggle-row">
        <span>Space ambience</span>
        <input
          type="checkbox"
          checked={Boolean(settings.ambience)}
          onChange={(e) => updateSettings({ ambience: e.target.checked })}
        />
      </label>
      <Field label="AMBIENT VOLUME">
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.ambientVolume ?? 0.25}
          onChange={(e) => updateSettings({ ambientVolume: +e.target.value })}
        />
      </Field>
      <Field label="INTRO MUSIC VOLUME">
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.musicVolume ?? 0.2}
          onChange={(e) => updateSettings({ musicVolume: +e.target.value })}
        />
      </Field>
      <SoundPack />
      <h4>Accessibility</h4>
      <label className="toggle-row">
        <span>Reduce motion</span>
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
        />
      </label>
      <p className="muted">
        Your operating system’s reduced-motion preference is also respected. All settings save
        automatically.
      </p>
      <h4>About this game</h4>
      <p className="muted">
        {THEME.disclaimer} Location images come from the official Databank. Sound effects are
        credited, creator-made Star Wars recordings. Location names are researched from the official
        Star Wars Databank.
      </p>
    </div>
  );
}
export function Rules() {
  return (
    <div className="rules-content">
      <div className="rules-intro">
        <Emblem size={54} />
        <p>
          A galaxy. A thousand worlds. One ruler.
          <br />
          <span>Outlast your rivals by building the greatest galactic empire.</span>
        </p>
      </div>
      {[
        [
          '01',
          'Explore the galaxy',
          'Start with 1,500 credits. Roll two dice, move around 40 sectors, and collect 200 credits each time you pass Hyperspace. Doubles grant another roll. Three consecutive doubles send you to detention.',
        ],
        [
          '02',
          'Claim your worlds',
          'Buy an unclaimed world at its listed price or decline to open an auction. All commanders may bid, including the player who declined. Increase bids by at least 10 credits.',
        ],
        [
          '03',
          'Collect rent',
          'Landing on an opponent’s world costs rent. Own a full color group to double undeveloped rent. More transports earn higher rent; utilities charge 4× or 10× the dice total.',
        ],
        [
          '04',
          'Build an empire',
          'Own a full color group to develop it evenly. Build up to four outposts, then upgrade to a planetary base. Developments increase rent. The bank has 32 outposts and 12 bases.',
        ],
        [
          '05',
          'Trade & finance',
          'Exchange worlds, credits, and escape cards. Sell group developments before trading or mortgaging. Mortgages return half the purchase price and suspend rent. Redeem with 10% interest.',
        ],
        [
          '06',
          'Escape detention',
          'Roll doubles to escape, pay 50 credits before rolling, or use an escape card. After three failed attempts, pay 50 and move using that roll. Escape doubles do not grant an extra roll.',
        ],
        [
          '07',
          'Expect the unexpected',
          'Force and Galactic Events can move you, award credits, demand payments, or send you to detention. Card effects are applied immediately and recorded in the log.',
        ],
        [
          '08',
          'Survive to rule',
          'Sell developments and mortgage worlds to settle debts. If you declare bankruptcy, remaining assets pass to the creditor or bank. The last commander—or team—standing wins.',
        ],
      ].map(([n, title, text]) => (
        <article key={n}>
          <span>{n}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
export function Account() {
  const { profile, open } = useGameStore();
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [status, setStatus] = useState(''),
    [working, setWorking] = useState(false),
    [user, setUser] = useState(null),
    [guestName, setGuestName] = useState(profile.name);
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setWorking(true);
    try {
      const d = await authenticate(email, password, register);
      setUser(d.session ? d.user : null);
      if (d.session) {
        if (register) await syncProfile(useGameStore.getState().profile);
        else {
          const saved = await cloudProfile();
          if (saved)
            useGameStore.setState({
              profile: {
                name: saved.profile.display_name,
                character: saved.profile.character,
                faction: saved.profile.faction,
              },
              settings: { ...useGameStore.getState().settings, ...saved.settings },
            });
        }
      }
      setStatus(
        register && !d.session
          ? 'Check your inbox to verify your email.'
          : 'You are connected to galactic command.',
      );
    } catch (e) {
      setStatus(e.message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <div>
      {working && <HoloLoader compact label="Establishing a secure command link…" />}
      {!backendConfigured && (
        <Notice>
          Online accounts require a configured Supabase project. Local play and your device profile
          are available now.
        </Notice>
      )}
      {user ? (
        <>
          <p>Signed in as {user.email || 'Guest commander'}.</p>
          <button className="button" onClick={() => open('profile')}>
            Edit your callsign
          </button>
          <button
            className="button"
            onClick={async () => {
              const state = useGameStore.getState();
              if (state.online && state.game.phase !== 'finished')
                await serverCall('connection', { gameId: state.game.id, status: 'left' }).catch(
                  () => {},
                );
              await supabase.auth.signOut();
              useGameStore.setState({ matchAway: state.online });
              setUser(null);
            }}
          >
            Sign out <LogOut size={14} />
          </button>
        </>
      ) : (
        <>
          <div className="mode-tabs">
            <button className={!register ? 'selected' : ''} onClick={() => setRegister(false)}>
              Sign in
            </button>
            <button className={register ? 'selected' : ''} onClick={() => setRegister(true)}>
              Create account
            </button>
          </div>
          <form onSubmit={submit}>
            <Field label="EMAIL">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="PASSWORD">
              <input
                type="password"
                minLength={8}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="button gold-button full" disabled={!backendConfigured || working}>
              {working ? 'Connecting…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
          <Field label="GUEST CALLSIGN">
            <input
              value={guestName}
              maxLength={24}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={working}
            />
          </Field>
          <button
            className="button subtle-button full guest-button"
            disabled={!backendConfigured || working}
            onClick={async () => {
              if (!guestName.trim()) {
                setStatus('Choose a callsign of 1–24 characters.');
                return;
              }
              setWorking(true);
              try {
                const d = await guestAuth();
                const next = { ...useGameStore.getState().profile, name: guestName.trim() };
                await syncProfile(next);
                useGameStore.setState({ profile: next });
                setUser(d.user);
                setStatus('Guest session started.');
              } catch (e) {
                setStatus(e.message);
              } finally {
                setWorking(false);
              }
            }}
          >
            Continue as online guest
          </button>
        </>
      )}
      {status && (
        <p className="form-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
const metadata = {
  social: ['Friends & rankings', 'Connect with commanders across the galaxy.', true],
  cosmetics: ['Command-deck cosmetics', 'Earn your colors across the galaxy.'],
  newGame: ['Launch a new conquest', 'Choose your character, squadron, and rules.', true],
  deed: ['Property deed', 'Every world has a story.'],
  trade: ['Galactic negotiations', 'Build alliances. Make your next great deal.', true],
  auction: ['Claim a new world', 'Competitive bidding across the galaxy.'],
  debt: ['Emergency financing', 'Keep your empire in the fight.'],
  settings: ['Settings', 'Make the galaxy your own.'],
  rules: ['How to conquer the galaxy', 'The commander’s guide to classic play.', true],
  profile: ['Your command profile', 'A record of your galactic journey.'],
  history: ['Match history', 'Every conquest leaves a legacy.'],
  victory: ['Conquest complete', 'Your final mission report.'],
  account: ['Galactic account', 'Connect to your persistent online identity.'],
  rooms: ['Multiplayer command', 'Explore public rooms or invite your squadron.', true],
};
export default function Dialogs() {
  const { modal, close, error } = useGameStore();
  const components = {
    social: Social,
    cosmetics: Cosmetics,
    newGame: NewGame,
    deed: Deed,
    trade: Trade,
    auction: Auction,
    debt: Debt,
    settings: Settings,
    rules: Rules,
    profile: Profile,
    history: MatchHistory,
    victory: Victory,
    account: Account,
    rooms: Rooms,
  };
  const Content = components[modal],
    meta = metadata[modal] || [];
  return (
    <Modal
      open={Boolean(Content)}
      title={meta[0]}
      subtitle={meta[1]}
      wide={meta[2]}
      variant={modal}
      onClose={close}
    >
      {Content && <Content />}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
