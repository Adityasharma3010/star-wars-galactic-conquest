import { mapText } from '../services/mapText.js';
import HoloSelect from '../components/HoloSelect.jsx';
import MapPicker, { MapPreview } from '../components/MapPicker.jsx';
import TokenPicker from '../components/TokenPicker.jsx';
import { copyText } from '../utils/clipboard.js';
import { useEffect, useRef, useState } from 'react';
import { Copy, Plus, Dices, Check, RefreshCw, ArrowRight, Globe2, Users } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import {
  backendConfigured,
  serverCall,
  supabase,
  roomList,
  ensureOnlineSession,
  inviteUrl,
} from '../services/supabase.js';
import { DEFAULT_RULES, FACTIONS } from '../game/rules/data.js';
import { tokensFor, isClassic, mapFor } from '../game/maps.js';
import HoloLoader from '../components/HoloLoader.jsx';
const Field = ({ label, children }) => (
  <label className="field">
    <span>{mapText(label)}</span>
    {children}
  </label>
);
export { default as RuleFields } from '../components/RuleFields.jsx';
import RuleFields from '../components/RuleFields.jsx';
export default function MultiplayerLobby() {
  const selectedMap = useGameStore((state) => state.selectedMap);
  const { profile, updateProfile, attachOnline, open, lobbyRoom } = useGameStore();
  const [rooms, setRooms] = useState([]),
    [room, setRoom] = useState(null),
    [players, setPlayers] = useState([]),
    [user, setUser] = useState(null),
    [callsign, setCallsign] = useState(profile.name),
    [nameEdited, setNameEdited] = useState(false),
    [code, setCode] = useState(new URLSearchParams(location.search).get('room') || ''),
    [name, setName] = useState(selectedMap === 'india' ? 'India match' : 'My galactic conquest'),
    [privateRoom, setPrivate] = useState(useGameStore.getState().roomIntent === 'private'),
    [savedRules, setSavedRules] = useState({
      ...DEFAULT_RULES,
      mapId: selectedMap,
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [friends, setFriends] = useState([]),
    [invite, setInvite] = useState('');
  const nameDirty = useRef(false);
  const acceptedRoom = useRef(null);
  const authenticatedUser = useRef(null);
  const drafts = useGameStore((state) => state.ruleDrafts);
  const updateDraft = useGameStore((state) => state.updateRuleDraft);
  const draftKey = room?.id || lobbyRoom || 'room-template:' + selectedMap;
  const draft = drafts[draftKey] || {
    rules: room ? savedRules : { ...DEFAULT_RULES, mapId: selectedMap },
    max: room?.max_players || 8,
    aiCount: 2,
  };
  const host = Boolean(room && room.host_id === user?.id);
  const rules = room && !host ? savedRules : draft.rules || savedRules,
    max = draft.max || 8,
    aiCount = draft.aiCount ?? 2;
  const CHARACTERS = tokensFor(rules);
  const setRules = (rules) =>
    updateDraft(draftKey, {
      ...draft,
      rules,
    });
  const setMax = (max) =>
    updateDraft(draftKey, {
      ...draft,
      max,
    });
  const setAI = (aiCount) =>
    updateDraft(draftKey, {
      ...draft,
      aiCount,
    });
  const resetRules = () =>
    updateDraft(draftKey, {
      rules: {
        ...DEFAULT_RULES,
        mapId: rules.mapId || selectedMap,
      },
      max: 8,
      aiCount: 2,
    });
  const unsavedRules = Boolean(
    room &&
    host &&
    (rules.mapId !== savedRules.mapId ||
      max !== room.max_players ||
      Object.keys(DEFAULT_RULES).some((key) => rules[key] !== savedRules[key])),
  );
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const accept = (d) => {
    const seat = d.players.find((player) => player.user_id === authenticatedUser.current);
    const firstVisit = acceptedRoom.current !== d.room.id;
    acceptedRoom.current = d.room.id;
    setRoom(d.room);
    setPlayers(d.players);
    if (d.rules)
      setSavedRules({
        ...DEFAULT_RULES,
        ...d.rules,
      });
    if (!useGameStore.getState().ruleDrafts[d.room.id])
      updateDraft(d.room.id, {
        rules: {
          ...DEFAULT_RULES,
          ...d.rules,
        },
        max: d.room.max_players,
        aiCount: 2,
      });
    const state = useGameStore.getState();
    const serverMap = d.rules?.mapId || 'galactic-conquest';
    const isHost = d.room.host_id === authenticatedUser.current;
    const displayMap = isHost ? state.ruleDrafts[d.room.id]?.rules?.mapId || serverMap : serverMap;
    const tokens = tokensFor(serverMap);
    const currentCharacter = firstVisit && seat ? seat.character : state.profile.character;
    const currentFaction = firstVisit && seat ? seat.faction : state.profile.faction;
    const fallback =
      tokens[
        Math.max(
          0,
          d.players.findIndex((p) => p.user_id === authenticatedUser.current),
        ) % tokens.length
      ];
    useGameStore.setState({
      lobbyRoom: d.room.id,
      selectedMap: displayMap,
      profile: {
        ...state.profile,
        character: tokens.some((token) => token.id === currentCharacter)
          ? currentCharacter
          : fallback.id,
        faction: isClassic(serverMap)
          ? 'Classic'
          : FACTIONS.includes(currentFaction)
            ? currentFaction
            : FACTIONS[0],
      },
    });
  };
  const refresh = async () => {
    const u = (await supabase.auth.getSession()).data.session?.user;
    if (u) setRooms(await roomList());
  };
  const ensure = async () => {
    const name = callsign.trim();
    if (!name) throw new Error('Choose a callsign of 1–24 characters.');
    const chosen = {
      ...useGameStore.getState().profile,
      name,
      character: CHARACTERS.some((token) => token.id === useGameStore.getState().profile.character)
        ? useGameStore.getState().profile.character
        : CHARACTERS[0].id,
      faction: isClassic(rules) ? 'Classic' : useGameStore.getState().profile.faction,
    };
    const u = await ensureOnlineSession(chosen);
    authenticatedUser.current = u.id;
    useGameStore.setState({
      profile: chosen,
    });
    setUser(u);
    return u;
  };
  const enter = async (value) => {
    await ensure();
    const d = await serverCall('joinRoom', {
      code: value,
      profile: useGameStore.getState().profile,
    });
    await inspect(d.room.id);
  };
  const inspect = async (id) => {
    const d = await serverCall('room', {
      roomId: id,
    });
    if (d.game) {
      const s = await serverCall('snapshot', {
        gameId: d.game,
      });
      attachOnline(
        s.state,
        s.role === 'spectator' ? null : (await supabase.auth.getUser()).data.user.id,
        s.connections,
      );
    } else accept(d);
  };
  useEffect(() => {
    if (!backendConfigured) return;
    run(async () => {
      const u = (await supabase.auth.getUser()).data.user;
      authenticatedUser.current = u?.id;
      setUser(u);
      if (!u) return;
      const { data: commander } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', u.id)
        .single();
      if (commander && !nameDirty.current) {
        setCallsign(commander.display_name);
        useGameStore.setState({
          profile: {
            ...useGameStore.getState().profile,
            name: commander.display_name,
          },
        });
      }
      await refresh();
      if (lobbyRoom) await inspect(lobbyRoom);
      const { data } = await supabase
        .from('friendships')
        .select('friend_id,profiles!friendships_friend_id_fkey(display_name)')
        .eq('user_id', u.id);
      setFriends(data || []);
    });
  }, []);
  useEffect(() => {
    if (!nameEdited) setCallsign(profile.name);
  }, [profile.name, nameEdited]);
  useEffect(() => {
    if (!room || !supabase) return;
    let stopped = false;
    const update = () => {
      if (stopped) return;
      inspect(room.id).catch((e) => {
        setError(e.message);
        if (e.message.includes('membership')) {
          setRoom(null);
          useGameStore.setState({
            lobbyRoom: null,
          });
        }
      });
    };
    const ch = supabase
      .channel(`lobby:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${room.id}`,
        },
        update,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`,
        },
        update,
      )
      .subscribe();
    const timer = setInterval(update, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [room?.id]);
  if (!backendConfigured)
    return (
      <p className="notice">
        {mapText('No Supabase project is connected yet. Solo and pass & play are available.')}
      </p>
    );
  const you = players.find((player) => player.user_id === user?.id);
  const unsavedName = Boolean(room && callsign.trim() !== you?.display_name);
  const changeMap = (id) => {
    if (room) setRules({ ...rules, mapId: id });
    useGameStore.getState().chooseMap(id);
  };
  const saveRoom = () =>
    run(async () =>
      accept(
        await serverCall('configureRoom', {
          roomId: room.id,
          rules,
          maxPlayers: max,
        }),
      ),
    );
  const capacity = (
    <Field label="ROOM CAPACITY">
      <HoloSelect
        value={host || !room ? max : room.max_players}
        disabled={Boolean(room && !host)}
        onChange={(e) => setMax(+e.target.value)}
      >
        {[2, 3, 4, 5, 6, 7, 8]
          .filter((n) => n >= players.length)
          .map((n) => (
            <option key={n} value={n}>
              {n} players
            </option>
          ))}
      </HoloSelect>
    </Field>
  );
  const ruleEditor = (
    <details className="lobby-rules setup-rule-disclosure">
      <summary>
        <Dices size={17} />
        <span>
          {host || !room ? 'Configure match rules' : 'Match rules'}
          <small>Economy, trading, teams & development</small>
        </span>
      </summary>
      <fieldset disabled={Boolean(room && !host)} className="room-rule-fields">
        <RuleFields
          rules={rules}
          setRules={setRules}
          onReset={host || !room ? resetRules : undefined}
        />
      </fieldset>
    </details>
  );
  const callsignField = (
    <Field label="YOUR CALLSIGN">
      <input
        maxLength={24}
        value={callsign}
        onChange={(e) => {
          setCallsign(e.target.value);
          setNameEdited(true);
          nameDirty.current = true;
        }}
      />
    </Field>
  );
  return (
    <div className={room ? 'unified-lobby' : 'unified-room-browser'}>
      {busy && <HoloLoader compact label="Synchronizing your squadron…" />}
      {room ? (
        <>
          <div className="waiting-room-heading">
            <h3>{room.name}</h3>
            <span>
              <Users size={15} />
              Waiting for players
            </span>
          </div>
          <div className="waiting-room-columns">
            <section className="room-social-column" aria-label="Room and players">
              <h3>Share this game</h3>
              <div className="room-code">
                <span className="eyebrow">ROOM CODE</span>
                <strong>{room.code}</strong>
                <button
                  className="button"
                  onClick={async () => setCopied(await copyText(inviteUrl(room.code)))}
                >
                  <Copy size={14} />
                  {copied ? 'Copied' : 'Copy invite'}
                </button>
              </div>
              <input
                className="invite-link"
                aria-label="Room invite link"
                value={inviteUrl(room.code)}
                readOnly
              />
              <div className="lobby-section-heading">
                <h3>Players</h3>
                <small>
                  {players.length} / {room.max_players} seats
                </small>
              </div>
              <div className="room-players">
                {players.map((p, i) => {
                  const token =
                    tokensFor(savedRules).find((token) => token.id === p.character) ||
                    tokensFor(savedRules)[i % tokensFor(savedRules).length];
                  return (
                    <div key={p.id}>
                      <i className="room-player-color" style={{ background: token.color }} />
                      <strong>
                        {p.display_name}
                        <span>
                          {token.name}
                          {savedRules.teams ? ` · Team ${(i % 2) + 1}` : ''}
                        </span>
                      </strong>
                      <small>
                        {p.is_ready ? 'READY' : 'NOT READY'}
                        {p.user_id === room.host_id ? ' · HOST' : ''}
                      </small>
                      {host && p.user_id !== user.id && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await serverCall('kick', { roomId: room.id, playerId: p.user_id });
                              await inspect(room.id);
                            })
                          }
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {friends.length > 0 && (
                <div className="field-row">
                  <Field label="INVITE A FRIEND">
                    <HoloSelect value={invite} onChange={(e) => setInvite(e.target.value)}>
                      <option value="">{mapText('Choose commander')}</option>
                      {friends.map((f) => (
                        <option key={f.friend_id} value={f.friend_id}>
                          {f.profiles?.display_name}
                        </option>
                      ))}
                    </HoloSelect>
                  </Field>
                  <button
                    className="button"
                    disabled={!invite || busy}
                    onClick={() =>
                      run(async () => {
                        await serverCall('invite', { roomId: room.id, recipient: invite });
                        setError('Invitation sent.');
                      })
                    }
                  >
                    Invite
                  </button>
                </div>
              )}
              <button
                className="text-button full leave-waiting-room"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await serverCall('leaveRoom', { roomId: room.id });
                    setRoom(null);
                    useGameStore.setState({ lobbyRoom: null });
                    await refresh();
                  })
                }
              >
                Leave room
              </button>
            </section>
            <section className="room-appearance-column setup-appearance" aria-label="Your player">
              <TokenPicker
                mapId={rules.mapId}
                value={profile.character}
                disabled={busy || you?.is_ready || unsavedRules}
                onChange={(character) => updateProfile({ character })}
              />
              {callsignField}
              <button
                className="button"
                disabled={busy || !callsign.trim() || !unsavedName}
                onClick={() =>
                  run(async () => {
                    const chosen = { ...useGameStore.getState().profile, name: callsign.trim() };
                    const data = await serverCall('setCallsign', {
                      roomId: room.id,
                      profile: chosen,
                    });
                    useGameStore.setState({ profile: chosen });
                    setNameEdited(false);
                    nameDirty.current = false;
                    accept(data);
                  })
                }
              >
                Save callsign
              </button>
              {unsavedName && (
                <p className="muted">Save your callsign before confirming readiness.</p>
              )}
              <Field label={isClassic(rules) ? 'YOUR TOKEN COLOR' : 'YOUR ONLINE CHARACTER'}>
                <HoloSelect
                  value={
                    CHARACTERS.some((c) => c.id === profile.character)
                      ? profile.character
                      : CHARACTERS[0].id
                  }
                  disabled={busy || you?.is_ready || unsavedRules}
                  onChange={(e) => updateProfile({ character: e.target.value })}
                >
                  {CHARACTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </HoloSelect>
              </Field>
              {!isClassic(rules) && (
                <Field label="YOUR ONLINE ALLEGIANCE">
                  <HoloSelect
                    disabled={busy || you?.is_ready || unsavedRules}
                    value={profile.faction}
                    onChange={(e) => updateProfile({ faction: e.target.value })}
                  >
                    {FACTIONS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </HoloSelect>
                </Field>
              )}
            </section>
            <section
              className="room-settings-column setup-configuration"
              aria-label="Game settings"
            >
              <h3>Game settings</h3>
              <MapPicker value={rules.mapId} onChange={changeMap} disabled={!host || busy} />
              {capacity}
              {host && (
                <Field label="AI COMMANDERS">
                  <HoloSelect
                    value={Math.min(aiCount, max - players.length)}
                    onChange={(e) => setAI(+e.target.value)}
                  >
                    {Array.from({ length: max - players.length + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} AI
                      </option>
                    ))}
                  </HoloSelect>
                </Field>
              )}
              <div className="setup-summary">
                <div>
                  <span>{mapText('Starting credits')}</span>
                  <strong>
                    {mapText('◈ ')}
                    {rules.startingCredits}
                  </strong>
                </div>
                <div>
                  <span>Match type</span>
                  <strong>{rules.teams ? 'Teams' : 'Individual'}</strong>
                </div>
              </div>
              {ruleEditor}
              {host ? (
                <>
                  <p className="rule-draft-status" role="status">
                    {unsavedRules
                      ? 'Draft retained on this device. Save to apply it to the room.'
                      : 'These rules are applied to the room.'}{' '}
                    Saving resets every player’s readiness.
                  </p>
                  <button className="button full" disabled={busy} onClick={saveRoom}>
                    Save room rules & reset readiness
                  </button>
                </>
              ) : (
                <p className="muted">The host chooses the map and rules for everyone.</p>
              )}
            </section>
          </div>
          <div className="lobby-start-actions">
            <span className="muted">
              {unsavedRules
                ? 'Save your map and rules before getting ready.'
                : you?.is_ready
                  ? 'You’re ready. Waiting for the other players.'
                  : 'Choose your appearance, then get ready.'}
            </span>
            <div className="button-row">
              <button
                className="button"
                disabled={busy || unsavedName || unsavedRules}
                onClick={() =>
                  run(async () =>
                    accept(
                      await serverCall('ready', {
                        roomId: room.id,
                        character: profile.character,
                        faction: profile.faction,
                      }),
                    ),
                  )
                }
              >
                Toggle ready
                <Check size={14} />
              </button>
              {host && (
                <button
                  className="button gold-button"
                  disabled={
                    busy ||
                    unsavedName ||
                    unsavedRules ||
                    players.some((p) => !p.is_ready) ||
                    players.length + Math.min(aiCount, room.max_players - players.length) < 2
                  }
                  onClick={() =>
                    run(async () => {
                      const d = await serverCall('startRoom', {
                        roomId: room.id,
                        aiCount: Math.min(aiCount, room.max_players - players.length),
                      });
                      attachOnline(d.state, user.id, d.connections);
                    })
                  }
                >
                  Start match
                  <Dices size={16} />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="room-browser-columns">
          <section className="room-browser-column">
            <div className="guest-join-notice">
              <p>Choose the name your friends will see.</p>
              {callsignField}
            </div>
            <div className="rooms-header">
              <h3>All rooms</h3>
              <button
                className="icon-button"
                aria-label="Refresh room list"
                onClick={() => run(refresh)}
              >
                <RefreshCw size={17} />
              </button>
            </div>
            <div className="room-browser">
              {rooms.length ? (
                rooms.map((r) => (
                  <button key={r.id} onClick={() => run(() => enter(r.code))}>
                    <Globe2 size={22} />
                    <span>
                      {r.name}
                      <small>
                        {r.code} · UP TO {r.max_players} PLAYERS
                      </small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))
              ) : (
                <div className="room-browser-empty">
                  <Users size={28} />
                  <strong>No open rooms yet</strong>
                  <p>Create a table and invite your friends.</p>
                </div>
              )}
            </div>
            <form
              className="join-code"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => enter(code));
              }}
            >
              <input
                aria-label="Room invite code"
                placeholder="Enter invite code"
                required
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="button" disabled={busy}>
                Join room
                <ArrowRight size={14} />
              </button>
            </form>
            <button className="text-button full" onClick={() => open('account')}>
              Manage your online account
            </button>
          </section>
          <section className="create-room setup-configuration">
            <h3>Host a new room</h3>
            <div className="create-room-map-preview">
              <MapPreview mapId={selectedMap} />
              <span>
                <strong>{mapFor(selectedMap).name}</strong>
                <small>40 spaces · 22 properties</small>
              </span>
            </div>
            <MapPicker value={selectedMap} onChange={changeMap} />
            <Field label="ROOM NAME">
              <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            {capacity}
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={privateRoom}
                onChange={(e) => setPrivate(e.target.checked)}
              />
              Private · invite code required
            </label>
            {ruleEditor}
            <button
              className="button gold-button full"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await ensure();
                  accept(
                    await serverCall('createRoom', {
                      name,
                      isPrivate: privateRoom,
                      profile: useGameStore.getState().profile,
                      rules,
                      maxPlayers: max,
                    }),
                  );
                })
              }
            >
              Create room
              <Plus size={16} />
            </button>
          </section>
        </div>
      )}
      {error && (
        <p className="form-status" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
