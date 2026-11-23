import { mapText } from '../services/mapText.js';
import { boardFor, groupsFor, tokensFor, isClassic, mapFor } from '../game/maps.js';
import { MusicSettings } from '../components/MatchMusic.jsx';
import HoloSelect from '../components/HoloSelect.jsx';
import MapPicker from '../components/MapPicker.jsx';
import TokenPicker from '../components/TokenPicker.jsx';
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
  ChevronDown,
  ArrowLeft,
  Save,
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
  syncSettings,
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
      <span>{mapText(label)}</span>
      {children}
    </label>
  );
}
export function NewGame() {
  const selectedMap = useGameStore((state) => state.selectedMap);
  return <LocalSetup key={selectedMap} selectedMap={selectedMap} />;
}
function LocalSetup({ selectedMap }) {
  const classic = isClassic(selectedMap),
    characters = tokensFor(selectedMap);
  const draftKey = classic ? 'local:india' : 'local';
  const draft = useGameStore.getState().ruleDrafts[draftKey];
  const { profile, start, open, chooseMap } = useGameStore();
  const [mode, setMode] = useState(draft?.mode || 'solo');
  const [character, setCharacter] = useState(() =>
    characters.some((c) => c.id === (draft?.character || profile.character))
      ? draft?.character || profile.character
      : characters[0].id,
  );
  const [faction, setFaction] = useState(
    classic
      ? 'Classic'
      : draft?.faction || (FACTIONS.includes(profile.faction) ? profile.faction : FACTIONS[0]),
  );
  const [name, setName] = useState(draft?.name || profile.name);
  const [count, setCount] = useState(draft?.count || 4);
  const [rules, setRules] = useState({
    ...DEFAULT_RULES,
    ...draft?.rules,
    difficulty: draft?.rules?.difficulty || draft?.difficulty || 'medium',
    mapId: selectedMap,
  });
  const [humans, setHumans] = useState(draft?.humans || 1);
  const persistDraft = () =>
    useGameStore.getState().updateRuleDraft(draftKey, {
      rules,
      mode,
      count,
      humans,
      difficulty: rules.difficulty,
      name,
      character,
      faction,
    });
  useEffect(persistDraft, [draftKey, rules, mode, count, humans, name, character, faction]);
  const selected = characters.find((c) => c.id === character) || characters[0];
  const launch = () => {
    const chars = [selected, ...characters.filter((c) => c.id !== character)].slice(0, count);
    const teams = mode === 'teams' || rules.teams;
    const ps = chars.map((c, i) => ({
      id: i === 0 ? 'you' : `player-${i}`,
      name: i === 0 ? name.trim() || 'Commander' : i < humans ? `Commander ${i + 1}` : c.name,
      character: c.id,
      color: c.color,
      faction: i === 0 ? faction : c.faction,
      ai: i >= humans,
      difficulty: rules.difficulty,
      team: teams
        ? classic
          ? `Team ${(i % 2) + 1}`
          : i % 2 === 0
            ? 'Rebel Squadron'
            : 'Imperial Squadron'
        : null,
    }));
    useGameStore.getState().updateProfile({ name: name.trim() || 'Commander', character, faction });
    start(ps, {
      ...rules,
      mapId: selectedMap,
      teams,
      startingCredits: mode === 'quick' ? 1000 : rules.startingCredits,
      roundLimit: mode === 'quick' ? 20 : rules.roundLimit,
    });
  };
  return (
    <div className="new-game unified-setup">
      <div className="setup-columns">
        <section className="setup-appearance" aria-label="Your player">
          <TokenPicker mapId={selectedMap} value={character} onChange={setCharacter} />
          <Field label="COMMANDER NAME">
            <input
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your callsign"
            />
          </Field>
          {!classic && (
            <Field label="ALLEGIANCE">
              <HoloSelect value={faction} onChange={(e) => setFaction(e.target.value)}>
                {FACTIONS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </HoloSelect>
            </Field>
          )}
        </section>
        <section className="setup-configuration" aria-label="Game settings">
          <h3>Game settings</h3>
          <MapPicker value={selectedMap} onChange={chooseMap} />
          <div className="setup-mode-label">HOW DO YOU WANT TO PLAY?</div>
          <div className="mode-tabs">
            {[
              ['solo', Bot, 'Solo vs AI'],
              ['local', Users, 'Pass & play'],
              ['teams', Shield, 'Teams'],
              ['quick', Sparkles, 'Quick'],
              ['custom', Dices, 'Custom'],
            ].map(([id, Icon, label]) => (
              <button
                type="button"
                key={id}
                className={mode === id ? 'selected' : ''}
                aria-pressed={mode === id}
                onClick={() => {
                  setMode(id);
                  setHumans(id === 'local' ? 2 : 1);
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
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
            <Field label="AI DIFFICULTY">
              <HoloSelect
                value={rules.difficulty}
                onChange={(e) => setRules({ ...rules, difficulty: e.target.value })}
              >
                {['easy', 'medium', 'hard', 'expert'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </HoloSelect>
            </Field>
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
              <Coins size={15} />
              <span>{mapText('Starting credits')}</span>
              <strong>
                {mapText('◈ ')}
                {mode === 'quick' ? 1000 : rules.startingCredits}
              </strong>
            </div>
            <div>
              <Dices size={15} />
              <span>Round limit</span>
              <strong>{mode === 'quick' ? 20 : rules.roundLimit || 'Unlimited'}</strong>
            </div>
          </div>
          <details
            className="setup-rule-disclosure"
            key={mode}
            open={mode === 'custom' ? true : undefined}
          >
            <summary>
              <Dices size={16} />
              <span>
                Gameplay rules<small>Economy, trading, teams & development</small>
              </span>
              <ChevronDown size={15} />
            </summary>
            {mode === 'quick' && (
              <p className="muted">
                {mapText('Quick matches use 1,000 starting credits and a 20-round limit.')}
              </p>
            )}
            <RuleFields
              rules={rules}
              setRules={setRules}
              showDifficulty={false}
              onReset={() => setRules({ ...DEFAULT_RULES, mapId: selectedMap })}
            />
          </details>
          <p className="muted setup-note">Progress saves automatically on this device.</p>
          <button className="text-button online-link" onClick={() => open('rooms')}>
            Online multiplayer
            <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="dialog-actions setup-actions">
        <button className="button" onClick={() => useGameStore.getState().back()}>
          <ArrowLeft size={15} />
          Back
        </button>
        <button
          className="button"
          onClick={() => {
            persistDraft();
            useGameStore.getState().close();
          }}
        >
          <Save size={15} />
          Save setup
        </button>
        <button className="button gold-button" onClick={launch}>
          {mapText('Launch conquest')}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Deed() {
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
  const { game, selected, dispatch, close, online, onlinePlayer } = useGameStore(),
    t = BOARD[selected],
    o = game.ownership[selected],
    p = game.players[game.turn],
    group = GROUPS.find((g) => g.id === t.group);
  return (
    <div className="deed-modal">
      <div className="deed-art">
        <PlanetArt tile={t} large />
        <span
          className="eyebrow"
          style={{
            color: t.color,
          }}
        >
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
              <strong>
                {mapText('\u25C8 ')}
                {t.price}
              </strong>
            </div>
            {t.rents ? (
              t.rents.map((v, i) => (
                <div key={i} className={o?.level === i ? 'current' : ''}>
                  <span>
                    {mapText(
                      [
                        'Base rent',
                        'With 1 outpost',
                        'With 2 outposts',
                        'With 3 outposts',
                        'With 4 outposts',
                        'With planetary base',
                      ][i],
                    )}
                  </span>
                  <strong>
                    {mapText('\u25C8 ')}
                    {v}
                  </strong>
                </div>
              ))
            ) : t.type === 'transport' ? (
              [25, 50, 100, 200].map((v, i) => (
                <div key={i}>
                  <span>
                    {i + 1} transport{i ? 's' : ''}
                  </span>
                  <strong>
                    {mapText('\u25C8 ')}
                    {v}
                  </strong>
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
              <strong>
                {mapText('\u25C8 ')}
                {t.mortgage}
              </strong>
            </div>
            {t.buildCost && (
              <div>
                <span>Development cost</span>
                <strong>
                  {mapText('\u25C8 ')}
                  {t.buildCost}
                </strong>
              </div>
            )}
          </div>
          {t.type === 'property' && (
            <p className="muted">
              {mapText(
                'Undeveloped rent doubles when the full color group is owned. Develop evenly. Mortgaged worlds collect no rent.',
              )}
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
                {mapText(' Acquire for \u25C8 ')}
                {t.price}
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
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
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
      <div
        className="trade-person"
        style={{
          color: p.color,
        }}
      >
        <TokenArt character={CHARACTERS.find((c) => c.id === p.character)} size={35} />
        <strong>{p.name}</strong>
        <span>
          {mapText('\u25C8 ')}
          {p.credits}
        </span>
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
            <i
              style={{
                background: t.color || '#8b9dac',
              }}
            />
            <span className="trade-world-name">
              {t.name}
              <small>
                {game.ownership[t.id]?.mortgaged
                  ? 'MORTGAGED WORLD'
                  : GROUPS.find((g) => g.id === t.group)?.name || 'TRANSPORT & INFRASTRUCTURE'}
              </small>
            </span>
            <span>
              {mapText('\u25C8 ')}
              {t.price}
            </span>
          </label>
        ))}
        {!Object.values(game.ownership).some((o) => o.owner === p.id) && (
          <p className="muted">{mapText('No worlds owned yet.')}</p>
        )}
        {p.cards.map((id) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={cardList.includes(id)}
              onChange={() => toggle(cardList, setCards, id)}
            />
            {mapText('Detention escape card')}
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
          <span className="eyebrow gold">{mapText('OUTER RIM EXCHANGE')}</span>
          <p>{mapText('Worlds. Credits. An alliance worth making.')}</p>
        </div>
        <span className="hololink-status">
          <i /> {mapText('SECURE HOLOLINK')}
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
            {
              trade: counter,
              to,
              give,
              take,
              cash,
              requestCash,
              giveCards,
              takeCards,
            },
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
                {t.give.map((id) => BOARD[id].name).join(', ') || 'No worlds'}
                {mapText(' + \u25C8 ')}
                {t.cash}
                <br />
                for {t.take.map((id) => BOARD[id].name).join(', ') || 'No worlds'}
                {mapText(' + \u25C8')} {t.requestCash}
              </p>
              {t.status === 'pending' &&
                (online ? t.to === onlinePlayer : !game.players.find((p) => p.id === t.to).ai) && (
                  <div className="button-row">
                    <button
                      className="button"
                      onClick={() =>
                        dispatch(
                          'TRADE_ACCEPT',
                          {
                            trade: t.id,
                          },
                          t.to,
                        )
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="button"
                      onClick={() =>
                        dispatch(
                          'TRADE_DECLINE',
                          {
                            trade: t.id,
                          },
                          t.to,
                        )
                      }
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
                  onClick={() =>
                    dispatch(
                      'TRADE_CANCEL',
                      {
                        trade: t.id,
                      },
                      t.from,
                    )
                  }
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
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
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
          <p>
            {mapText('Listed value \u25C8 ')}
            {t.price}
          </p>
        </div>
      </div>
      <div className="auction-bid">
        <Countdown deadline={a.deadline} auction />
        <small>CURRENT BID</small>
        <motion.strong
          key={a.bid}
          className="auction-amount"
          initial={
            useGameStore.getState().settings.reducedMotion
              ? false
              : { opacity: 0.4, y: 12, scale: 0.9 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          {mapText('\u25C8 ')}
          {a.bid}
        </motion.strong>
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
      <Field label={mapText(`YOUR BID · AVAILABLE ◈ ${p?.credits || 0}`)}>
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
          onClick={() =>
            dispatch(
              'BID',
              {
                amount,
              },
              bidder,
            )
          }
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
        {mapText(
          ' Minimum increment: 10 credits. Each bid resets the closing countdown to 10 seconds. The last bidder wins when everyone else passes. ',
        )}
      </p>
      <div className="auction-status">
        {game.players
          .filter((p) => !p.bankrupt)
          .map((p) => (
            <span
              key={p.id}
              style={{
                color: p.color,
              }}
            >
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
              <strong>
                {mapText('\u25C8 ')}
                {b.amount}
              </strong>
            </div>
          ))}
      </div>
    </div>
  );
}
export function Debt() {
  const BOARD = boardFor(useGameStore.getState().game),
    GROUPS = groupsFor(useGameStore.getState().game),
    CHARACTERS = tokensFor(useGameStore.getState().game);
  const { game, dispatch } = useGameStore(),
    d = game.debt;
  if (!d) return <Notice>{mapText('Your debt is settled. Continue the conquest.')}</Notice>;
  const p = game.players.find((p) => p.id === d.payer);
  return (
    <div>
      <Notice>
        {p.name}
        {mapText(' owes \u25C8 ')}
        {d.amount} to {game.players.find((p) => p.id === d.creditor)?.name || 'the bank'}
        {mapText('. Sell developments or mortgage undeveloped worlds to raise credits.')}
      </Notice>
      <div className="debt-balance">
        <Coins size={24} />
        <strong>
          {mapText('\u25C8 ')}
          {p.credits}
        </strong>
        <span>
          {mapText('AVAILABLE / \u25C8 ')}
          {d.amount} REQUIRED
        </span>
      </div>
      <div className="debt-properties">
        {BOARD.filter((t) => game.ownership[t.id]?.owner === p.id).map((t) => (
          <div key={t.id}>
            <span>{t.name}</span>
            {game.ownership[t.id].level > 0 ? (
              <button
                className="button"
                onClick={() =>
                  dispatch(
                    'SELL',
                    {
                      property: t.id,
                    },
                    p.id,
                  )
                }
              >
                Sell development +{t.buildCost / 2}
              </button>
            ) : (
              <button
                className="button"
                disabled={game.ownership[t.id].mortgaged}
                onClick={() =>
                  dispatch(
                    'MORTGAGE',
                    {
                      property: t.id,
                    },
                    p.id,
                  )
                }
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
          onChange={(e) =>
            updateSettings({
              introMusic: e.target.checked,
            })
          }
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
          onChange={(e) =>
            updateSettings({
              mute: e.target.checked,
            })
          }
        />
      </label>
      <Field label={`MASTER VOLUME · ${Math.round(settings.volume * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.volume}
          onChange={(e) =>
            updateSettings({
              volume: +e.target.value,
            })
          }
        />
      </Field>
      <Field label={`EFFECTS VOLUME · ${Math.round(settings.effectsVolume * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.effectsVolume}
          onChange={(e) =>
            updateSettings({
              effectsVolume: +e.target.value,
            })
          }
        />
      </Field>
      <label className="toggle-row">
        <span>Space ambience</span>
        <input
          type="checkbox"
          checked={Boolean(settings.ambience)}
          onChange={(e) =>
            updateSettings({
              ambience: e.target.checked,
            })
          }
        />
      </label>
      <Field label="AMBIENT VOLUME">
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.ambientVolume ?? 0.25}
          onChange={(e) =>
            updateSettings({
              ambientVolume: +e.target.value,
            })
          }
        />
      </Field>
      <Field label="INTRO MUSIC VOLUME">
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={settings.musicVolume ?? 0.2}
          onChange={(e) =>
            updateSettings({
              musicVolume: +e.target.value,
            })
          }
        />
      </Field>
      <SoundPack />
      <h4>Accessibility</h4>
      <label className="toggle-row">
        <span>Reduce motion</span>
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(e) =>
            updateSettings({
              reducedMotion: e.target.checked,
            })
          }
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
      <p className="muted">
        Planet surface textures:{' '}
        <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
          Solar System Scope / INOVE
        </a>
        , adapted under{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . India map outline:{' '}
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth, public domain
        </a>
        .
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
          {mapText('A galaxy. A thousand worlds. One ruler.')}
          <br />
          <span>{mapText('Outlast your rivals by building the greatest galactic empire.')}</span>
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
        [
          '09',
          'Tax & online seats',
          'Imperial Tax always charges 10% of cash. Custom Rules may choose 10% of total wealth instead. Disconnecting gives five minutes to rejoin; leaving gives two minutes. Expired players are eliminated without a replacement bot. Late visitors watch and can join the next waiting room after the match.',
        ],
      ].map(([n, title, text]) => (
        <article key={n}>
          <span>{n}</span>
          <div>
            <h3>{mapText(title)}</h3>
            <p>{mapText(text)}</p>
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
              settings: {
                ...useGameStore.getState().settings,
                ...saved.settings,
              },
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
          {mapText(
            'Online accounts require a configured Supabase project. Local play and your device profile are available now.',
          )}
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
                await serverCall('connection', {
                  gameId: state.game.id,
                  status: 'left',
                }).catch(() => {});
              await supabase.auth.signOut();
              useGameStore.setState({
                matchAway: state.online,
              });
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
                const next = {
                  ...useGameStore.getState().profile,
                  name: guestName.trim(),
                };
                await syncProfile(next);
                useGameStore.setState({
                  profile: next,
                });
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
  newGame: ['Set up your game', 'Your board, your player, your rules.', true],
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
  rooms: ['Play with friends', 'Join a room or set up your own table.', true],
};
export default function Dialogs() {
  const { modal, close, back, error, modalHistory, playing } = useGameStore();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    setSaveError('');
  }, [modal]);
  const savePreferences = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await syncSettings(useGameStore.getState().settings);
      if (useGameStore.getState().modal === modal) close();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };
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
      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}
      {Content && modal !== 'newGame' && (
        <div className="dialog-actions">
          <button className="button" onClick={back} disabled={saving}>
            <ArrowLeft size={15} />
            {modalHistory.length ? 'Back' : playing ? 'Back to game' : 'Back'}
          </button>
          {['settings', 'cosmetics'].includes(modal) && (
            <button className="button gold-button" onClick={savePreferences} disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save & close'}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
