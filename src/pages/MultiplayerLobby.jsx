import HoloSelect from '../components/HoloSelect.jsx';
import { copyText } from '../utils/clipboard.js';
import { useEffect, useRef, useState } from 'react';
import { Copy, Plus, Dices, Check, RefreshCw, ArrowRight, Globe2 } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import {
  backendConfigured,
  serverCall,
  supabase,
  roomList,
  ensureOnlineSession,
  inviteUrl,
} from '../services/supabase.js';
import { CHARACTERS, DEFAULT_RULES, FACTIONS } from '../game/rules/data.js';
import HoloLoader from '../components/HoloLoader.jsx';
const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
export { default as RuleFields } from '../components/RuleFields.jsx';
import RuleFields from '../components/RuleFields.jsx';
export default function MultiplayerLobby() {
  const { profile, updateProfile, attachOnline, open, lobbyRoom } = useGameStore();
  const [rooms, setRooms] = useState([]),
    [room, setRoom] = useState(null),
    [players, setPlayers] = useState([]),
    [user, setUser] = useState(null),
    [callsign, setCallsign] = useState(profile.name),
    [nameEdited, setNameEdited] = useState(false),
    [code, setCode] = useState(new URLSearchParams(location.search).get('room') || ''),
    [name, setName] = useState('My galactic conquest'),
    [privateRoom, setPrivate] = useState(false),
    [savedRules, setSavedRules] = useState({ ...DEFAULT_RULES }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [friends, setFriends] = useState([]),
    [invite, setInvite] = useState('');
  const nameDirty = useRef(false);
  const drafts = useGameStore((state) => state.ruleDrafts);
  const updateDraft = useGameStore((state) => state.updateRuleDraft);
  const draftKey = room?.id || lobbyRoom || 'room-template';
  const draft = drafts[draftKey] || { rules: savedRules, max: room?.max_players || 8, aiCount: 2 };
  const rules = draft.rules || savedRules,
    max = draft.max || 8,
    aiCount = draft.aiCount ?? 2;
  const setRules = (rules) => updateDraft(draftKey, { ...draft, rules });
  const setMax = (max) => updateDraft(draftKey, { ...draft, max });
  const setAI = (aiCount) => updateDraft(draftKey, { ...draft, aiCount });
  const resetRules = () =>
    updateDraft(draftKey, { rules: { ...DEFAULT_RULES }, max: 8, aiCount: 2 });
  const unsavedRules = Boolean(
    room &&
    (max !== room.max_players ||
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
    setRoom(d.room);
    setPlayers(d.players);
    if (d.rules) setSavedRules({ ...DEFAULT_RULES, ...d.rules });
    if (!useGameStore.getState().ruleDrafts[d.room.id])
      updateDraft(d.room.id, {
        rules: { ...DEFAULT_RULES, ...d.rules },
        max: d.room.max_players,
        aiCount: 2,
      });
    useGameStore.setState({ lobbyRoom: d.room.id });
  };
  const refresh = async () => {
    const u = (await supabase.auth.getSession()).data.session?.user;
    if (u) setRooms(await roomList());
  };
  const ensure = async () => {
    const name = callsign.trim();
    if (!name) throw new Error('Choose a callsign of 1–24 characters.');
    const chosen = { ...useGameStore.getState().profile, name };
    const u = await ensureOnlineSession(chosen);
    useGameStore.setState({ profile: chosen });
    setUser(u);
    return u;
  };
  const enter = async (value) => {
    await ensure();
    const d = await serverCall('joinRoom', {
      code: value,
      profile: useGameStore.getState().profile,
    });
    if (d.room.status === 'waiting') accept(d);
    else await inspect(d.room.id);
  };
  const inspect = async (id) => {
    const d = await serverCall('room', { roomId: id });
    if (d.game) {
      const s = await serverCall('snapshot', { gameId: d.game });
      attachOnline(s.state, (await supabase.auth.getUser()).data.user.id, s.connections);
    } else accept(d);
  };
  useEffect(() => {
    if (!backendConfigured) return;
    run(async () => {
      const u = (await supabase.auth.getUser()).data.user;
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
          profile: { ...useGameStore.getState().profile, name: commander.display_name },
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
          useGameStore.setState({ lobbyRoom: null });
        }
      });
    };
    const ch = supabase
      .channel(`lobby:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        update,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` },
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
        No Supabase project is connected yet. Solo and pass & play are available.
      </p>
    );
  const host = room?.host_id === user?.id;
  const you = players.find((player) => player.user_id === user?.id);
  const unsavedName = Boolean(room && callsign.trim() !== you?.display_name);
  return (
    <div>
      {busy && <HoloLoader compact label="Synchronizing your squadron…" />}
      {!room && (
        <div className="guest-join-notice">
          <p>Choose the callsign your squadron will see.</p>
          <Field label="YOUR CALLSIGN">
            <input
              value={callsign}
              maxLength={24}
              onChange={(e) => {
                setCallsign(e.target.value);
                setNameEdited(true);
                nameDirty.current = true;
              }}
            />
          </Field>
        </div>
      )}
      {room ? (
        <>
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
          <button
            className="button"
            disabled={busy || !callsign.trim() || !unsavedName}
            onClick={() =>
              run(async () => {
                const chosen = { ...useGameStore.getState().profile, name: callsign.trim() };
                const data = await serverCall('setCallsign', { roomId: room.id, profile: chosen });
                useGameStore.setState({ profile: chosen });
                setNameEdited(false);
                nameDirty.current = false;
                accept(data);
              })
            }
          >
            Save callsign
          </button>
          {unsavedName && <p className="muted">Save your callsign before confirming readiness.</p>}
          <div className="room-code">
            <span className="eyebrow">ROOM CODE</span>
            <strong>{room.code}</strong>
            <button
              className="button"
              onClick={async () => {
                setCopied(await copyText(inviteUrl(room.code)));
              }}
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
          <div className="room-players">
            {players.map((p, i) => (
              <div key={p.id}>
                <span>
                  {p.character}
                  {rules.teams ? ` · ${i % 2 ? 'Imperial' : 'Rebel'} Squadron` : ''}
                </span>
                <strong>{p.display_name}</strong>
                <small>
                  {p.is_ready ? 'READY' : 'NOT READY'} {p.user_id === room.host_id ? '· HOST' : ''}
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
            ))}
          </div>
          <Field label="YOUR ONLINE CHARACTER">
            <HoloSelect
              disabled={busy || you?.is_ready}
              value={profile.character}
              onChange={(e) => updateProfile({ character: e.target.value })}
            >
              {CHARACTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </HoloSelect>
          </Field>
          <Field label="YOUR ONLINE ALLEGIANCE">
            <HoloSelect
              disabled={busy || you?.is_ready}
              value={profile.faction}
              onChange={(e) => updateProfile({ faction: e.target.value })}
            >
              {FACTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </HoloSelect>
          </Field>
          <p className="muted">
            {players.length} / {room.max_players} seats · {savedRules.startingCredits} starting
            credits · Untimed turns · {savedRules.teams ? 'Teams' : 'Individual'}
          </p>
          {host && (
            <>
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
              <details className="lobby-rules">
                <summary>
                  <Dices size={17} />
                  <span>
                    Configure match rules
                    <small>
                      {unsavedRules ? 'You have unapplied changes' : 'Your room configuration'}
                    </small>
                  </span>
                </summary>
                <Field label="ROOM CAPACITY">
                  <HoloSelect value={max} onChange={(e) => setMax(+e.target.value)}>
                    {[2, 3, 4, 5, 6, 7, 8]
                      .filter((n) => n >= players.length)
                      .map((n) => (
                        <option key={n} value={n}>
                          {n} players
                        </option>
                      ))}
                  </HoloSelect>
                </Field>
                <RuleFields rules={rules} setRules={setRules} onReset={resetRules} />
                <p className="rule-draft-status" role="status">
                  {unsavedRules
                    ? 'Draft retained on this device. Save to apply it to the room.'
                    : 'These rules are applied to the room.'}{' '}
                  Saving resets every commander’s readiness.
                </p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () =>
                      accept(
                        await serverCall('configureRoom', {
                          roomId: room.id,
                          rules,
                          maxPlayers: max,
                        }),
                      ),
                    )
                  }
                >
                  Save room rules & reset readiness
                </button>
              </details>
            </>
          )}
          <div className="button-row">
            <button
              className="button"
              disabled={busy || unsavedName}
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
              Toggle ready <Check size={14} />
            </button>
            {host && (
              <button
                className="button gold-button"
                disabled={
                  busy ||
                  unsavedName ||
                  unsavedRules ||
                  players.some((p) => !p.is_ready) ||
                  players.length + aiCount < 2
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
                Start match <Dices size={16} />
              </button>
            )}
          </div>
          {friends.length > 0 && (
            <div className="field-row">
              <Field label="INVITE A FRIEND">
                <HoloSelect value={invite} onChange={(e) => setInvite(e.target.value)}>
                  <option value="">Choose commander</option>
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
            className="text-button full"
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
        </>
      ) : (
        <>
          <div className="rooms-header">
            <p>Find your next conquest.</p>
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
                      {r.code} · UP TO {r.max_players} COMMANDERS
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))
            ) : (
              <p className="muted">No public rooms are waiting. Create the first one.</p>
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
              Join room <ArrowRight size={14} />
            </button>
          </form>
          <div className="create-room">
            <h4>Host a new room</h4>
            <Field label="ROOM NAME">
              <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={privateRoom}
                onChange={(e) => setPrivate(e.target.checked)}
              />{' '}
              Private · invite code required
            </label>
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
                    }),
                  );
                })
              }
            >
              Create room <Plus size={16} />
            </button>
          </div>
          <button className="text-button full" onClick={() => open('account')}>
            Manage your online account
          </button>
        </>
      )}
      {error && (
        <p className="form-status" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
