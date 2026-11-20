import { useEffect, useMemo, useRef, useState } from 'react';
import { Music2, Pause, Play, SkipForward, Upload, Trash2 } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { createMusicMixer } from '../services/matchMusic.js';
import {
  MATCH_TRACKS,
  listPersonalMusic,
  addPersonalMusic,
  removePersonalMusic,
  personalMusicUrl,
  releaseMusicUrls,
} from '../services/musicLibrary.js';
import HoloSelect from './HoloSelect.jsx';
import HoloLoader from './HoloLoader.jsx';

export default function MatchMusic({ active }) {
  const { settings, musicPreferences, personalMusic, setPersonalMusic, updateSettings, open } =
    useGameStore();
  const [state, setState] = useState({ status: 'idle' });
  const mixer = useRef();
  const tracks = useMemo(() => {
    const source = musicPreferences.source === 'personal' ? personalMusic : MATCH_TRACKS;
    return musicPreferences.selection === 'playlist'
      ? source
      : source.filter((track) => track.id === musicPreferences.selection);
  }, [musicPreferences.source, musicPreferences.selection, personalMusic]);
  useEffect(() => {
    let disposed = false;
    listPersonalMusic()
      .then((list) => {
        if (!disposed) setPersonalMusic(list);
      })
      .catch(() => {});
    mixer.current = createMusicMixer({
      resolve: (track) => track.src || personalMusicUrl(track.id),
      onState: (status) => {
        if (!disposed) setState(status);
      },
    });
    const unlock = () => mixer.current.play();
    document.addEventListener('pointerdown', unlock);
    return () => {
      disposed = true;
      document.removeEventListener('pointerdown', unlock);
      mixer.current.dispose();
      releaseMusicUrls();
    };
  }, []);
  useEffect(() => {
    mixer.current.configure({
      active: Boolean(active && settings.matchMusic !== false),
      muted: settings.mute,
      volume: (settings.volume ?? 0.45) * (settings.matchMusicVolume ?? 0.14),
      tracks,
      shuffle: musicPreferences.shuffle,
    });
  }, [
    active,
    settings.matchMusic,
    settings.mute,
    settings.volume,
    settings.matchMusicVolume,
    tracks,
    musicPreferences.shuffle,
  ]);
  const enabled = settings.matchMusic !== false && !settings.mute;
  const canPause = enabled && ['playing', 'loading'].includes(state.status);
  return (
    <div className="match-radio" data-playback={state.status} data-track={state.track?.id || ''}>
      <button
        aria-label={canPause ? 'Pause background music' : 'Play background music'}
        disabled={!active || !tracks.length}
        data-audio-preview
        onClick={() => {
          if (canPause) updateSettings({ matchMusic: false });
          else updateSettings({ matchMusic: true, mute: false });
          if (!canPause) setTimeout(() => mixer.current?.play(), 0);
        }}
      >
        {canPause ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        className="match-radio-title"
        aria-label="Choose background music"
        onClick={() => open('settings')}
      >
        <Music2 size={15} />
        <span>
          <small>GALACTIC RADIO</small>
          <strong>
            {state.track?.title ||
              (musicPreferences.source === 'personal' && !personalMusic.length
                ? 'Add your music'
                : tracks[0]?.title || 'Choose a track')}
          </strong>
        </span>
      </button>
      <button
        aria-label="Next background song"
        disabled={!active || !enabled || !tracks.length}
        data-audio-preview
        onClick={() => mixer.current.next()}
      >
        <SkipForward size={14} />
      </button>
      {(state.status === 'error' || state.status === 'blocked') && (
        <span className="music-playback-note" role="status">
          {state.message}
        </span>
      )}
    </div>
  );
}

export function MusicSettings() {
  const {
    settings,
    updateSettings,
    musicPreferences,
    updateMusicPreferences,
    personalMusic,
    setPersonalMusic,
  } = useGameStore();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const input = useRef();
  useEffect(() => {
    let disposed = false;
    listPersonalMusic()
      .then((list) => {
        if (!disposed) setPersonalMusic(list);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, []);
  const list = musicPreferences.source === 'personal' ? personalMusic : MATCH_TRACKS;
  return (
    <section className="music-settings">
      <div className="music-section-heading">
        <Music2 size={21} />
        <div>
          <h4>Galactic radio</h4>
          <p>Quiet music for your match. Separate from the opening and sound effects.</p>
        </div>
      </div>
      <label className="toggle-row">
        <span>Match background music</span>
        <input
          type="checkbox"
          checked={settings.matchMusic !== false}
          onChange={(event) => updateSettings({ matchMusic: event.target.checked })}
        />
      </label>
      <label className="field">
        <span>BACKGROUND VOLUME · {Math.round((settings.matchMusicVolume ?? 0.14) * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step=".02"
          value={settings.matchMusicVolume ?? 0.14}
          onChange={(event) => updateSettings({ matchMusicVolume: +event.target.value })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>MUSIC SOURCE</span>
          <HoloSelect
            value={musicPreferences.source}
            onChange={(event) =>
              updateMusicPreferences({ source: event.target.value, selection: 'playlist' })
            }
          >
            <option value="builtin">Galactic playlist</option>
            <option value="personal">My personal songs</option>
          </HoloSelect>
        </label>
        <label className="field">
          <span>PLAY ORDER</span>
          <HoloSelect
            value={musicPreferences.shuffle ? 'shuffle' : 'order'}
            onChange={(event) =>
              updateMusicPreferences({ shuffle: event.target.value === 'shuffle' })
            }
          >
            <option value="order">Play in order</option>
            <option value="shuffle">Shuffle songs</option>
          </HoloSelect>
        </label>
      </div>
      <label className="field">
        <span>BACKGROUND TRACK</span>
        <HoloSelect
          value={musicPreferences.selection}
          onChange={(event) => updateMusicPreferences({ selection: event.target.value })}
        >
          <option value="playlist">Loop the playlist</option>
          {list.map((track) => (
            <option value={track.id} key={track.id}>
              {track.title}
            </option>
          ))}
        </HoloSelect>
      </label>
      <p className="music-helper">
        Songs fade gently into the next. Choosing one song loops that track.
      </p>
      <div className="personal-music-box">
        <div>
          <strong>Your music, your device.</strong>
          <p>
            Add up to five songs, 50 MB each. Files stay in this browser and are never uploaded or
            shared with other players.
          </p>
        </div>
        <input
          ref={input}
          className="personal-music-input"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
          multiple
          aria-label="Personal background songs"
          onChange={async (event) => {
            const files = [...event.target.files];
            setBusy(true);
            setMessage('');
            try {
              for (const file of files) await addPersonalMusic(file);
              setPersonalMusic(await listPersonalMusic());
              updateMusicPreferences({ source: 'personal', selection: 'playlist' });
              updateSettings({ matchMusic: true });
              setMessage('Your songs are ready for this match and future visits on this browser.');
            } catch (error) {
              setPersonalMusic(await listPersonalMusic().catch(() => personalMusic));
              setMessage(error.message);
            } finally {
              setBusy(false);
              if (input.current) input.current.value = '';
            }
          }}
        />
        <button className="button" disabled={busy} onClick={() => input.current.click()}>
          <Upload size={15} />
          Add personal songs
        </button>
        {busy && <HoloLoader compact label="Saving your music on this device…" />}
        {message && (
          <p className="music-helper" role="status">
            {message}
          </p>
        )}
        {personalMusic.map((track) => (
          <div className="personal-music-row" key={track.id}>
            <span>
              {track.title}
              <small>{(track.size / 1024 / 1024).toFixed(1)} MB · on this device</small>
            </span>
            <button
              className="icon-button"
              aria-label={'Remove personal song ' + track.title}
              onClick={async () => {
                try {
                  await removePersonalMusic(track.id);
                  setPersonalMusic(await listPersonalMusic());
                  if (musicPreferences.selection === track.id)
                    updateMusicPreferences({ selection: 'playlist' });
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className="music-credits">
        Galactic playlist:{' '}
        <a href="https://creatorchords.com/music/space-ambience/" target="_blank" rel="noreferrer">
          Space Ambience — Alexander Nakarada
        </a>
        ;{' '}
        <a href="https://www.scottbuckley.com.au/library/" target="_blank" rel="noreferrer">
          Decoherence & Ephemera — Scott Buckley
        </a>
        .{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Playback uses fades for the game.
      </p>
    </section>
  );
}
