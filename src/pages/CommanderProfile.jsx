import { useEffect, useRef, useState } from 'react';
import { Trophy, Mail, Check } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { CHARACTERS } from '../game/rules/data.js';
import { CLASSIC_TOKENS } from '../game/rules/india.js';
import { isClassic } from '../game/maps.js';
import { TokenArt } from '../components/Art.jsx';
import { cloudProfile, syncProfile } from '../services/supabase.js';
import HoloLoader from '../components/HoloLoader.jsx';
export default function CommanderProfile() {
  const { profile, history, game, open, onlinePlayer } = useGameStore();
  const [name, setName] = useState(profile.name),
    [saved, setSaved] = useState(false),
    [cloud, setCloud] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const edited = useRef(false);
  useEffect(() => {
    cloudProfile()
      .then((data) => {
        setCloud(data);
        if (data && !edited.current) {
          setName(data.profile.display_name);
          useGameStore.setState({
            profile: { ...useGameStore.getState().profile, name: data.profile.display_name },
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const character =
      [...CHARACTERS, ...CLASSIC_TOKENS].find((c) => c.id === profile.character) || CHARACTERS[0],
    localWins = history.filter((h) => h.players.find((p) => p.name === profile.name)?.won).length;
  return (
    <div>
      <div className="profile-preview" style={{ color: character.color }}>
        <TokenArt character={character} size={100} />
        <h3>{profile.name}</h3>
        {character.symbol !== 'pill' && <span>{profile.faction}</span>}
        <small>{cloud ? 'ONLINE COMMANDER PROFILE' : 'LOCAL COMMANDER PROFILE'}</small>
      </div>
      {loading && <HoloLoader compact label="Scanning command archives…" />}
      <div className="profile-stats">
        <div>
          <strong>{cloud?.statistics.matches ?? history.length}</strong>
          <small>{cloud ? 'ONLINE MATCHES' : 'MATCHES'}</small>
        </div>
        <div>
          <strong>{cloud?.statistics.wins ?? localWins}</strong>
          <small>VICTORIES</small>
        </div>
        <div>
          <strong>
            {
              Object.values(game?.ownership || {}).filter(
                (o) => o.owner === (onlinePlayer || 'you'),
              ).length
            }
          </strong>
          <small>WORLDS THIS MATCH</small>
        </div>
      </div>
      <label className="field">
        <span>CALLSIGN</span>
        <input
          maxLength={24}
          value={name}
          onChange={(e) => {
            edited.current = true;
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button
        className="button gold-button full"
        disabled={saving}
        onClick={async () => {
          if (!name.trim()) {
            setError('Choose a callsign of 1–24 characters.');
            return;
          }
          const next = { ...profile, name: name.trim() };
          setSaving(true);
          setError('');
          try {
            await syncProfile(next);
            useGameStore.setState({ profile: next });
            setSaved(true);
          } catch (e) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? 'Saving profile…' : saved ? 'Profile saved' : 'Save profile'}
        <Check size={16} />
      </button>
      {saving && <HoloLoader compact label="Transmitting your callsign…" />}
      {cloud?.achievements.length > 0 && (
        <>
          <h4>Achievements</h4>
          {cloud.achievements.map((a, i) => (
            <p className="muted" key={i}>
              <Trophy size={13} /> {a.achievements.title} · {a.achievements.description}
            </p>
          ))}
        </>
      )}
      <div className="button-row profile-links">
        <button className="button" onClick={() => open('social')}>
          Friends & rankings
        </button>
        <button className="button" onClick={() => open('cosmetics')}>
          Cosmetics
        </button>
      </div>
      <div className="button-row profile-links">
        <button className="button" onClick={() => open('history')}>
          <Trophy size={14} /> Match history
        </button>
        <button className="button" onClick={() => open('account')}>
          <Mail size={14} /> Online account
        </button>
      </div>
      {error && (
        <p className="form-status" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
export function MatchHistory() {
  const { history } = useGameStore(),
    [cloud, setCloud] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    cloudProfile()
      .then(setCloud)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div>
      {cloud && (
        <>
          <h4>Persistent online history</h4>
          {cloud.matches.length ? (
            cloud.matches.map((h) => (
              <div className="history-match" key={h.game_id}>
                <Trophy size={24} />
                <div>
                  <h3>{h.won ? 'Victory' : 'Defeat'}</h3>
                  <p>
                    {new Date(h.created_at).toLocaleDateString()} · Final wealth{' '}
                    {isClassic(h.games) ? '₹' : '◈'} {h.final_wealth.toLocaleString()}
                  </p>
                  <small>Match {h.game_id.slice(0, 8)}</small>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Completed online matches appear here.</p>
          )}
        </>
      )}
      <h4>Matches on this device</h4>
      {history.length ? (
        history.map((h) => (
          <div className="history-match" key={h.id}>
            <Trophy size={24} />
            <div>
              <h3>{h.winner ? `${h.winner} won` : 'No remaining players'}</h3>
              <p>
                {new Date(h.date).toLocaleDateString()} · {h.rounds} rounds ·{' '}
                {h.local ? 'Local match' : 'Online match'}
              </p>
              {h.players.map((p, i) => (
                <small key={i}>
                  {p.name}: {isClassic(h) ? '₹' : '◈'} {p.wealth.toLocaleString()}
                  {p.won ? ' · WINNER' : ''}
                </small>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="notice">
          Completed matches appear here. Finish your first conquest to record a result.
        </p>
      )}
      {error && (
        <p className="form-status" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
