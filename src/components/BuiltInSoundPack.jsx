import { SOUND_PACK } from '../services/starWarsAudio.js';
import { playSound } from '../services/audio.js';
import { isClassic } from '../game/maps.js';
import { useGameStore } from '../stores/gameStore.js';
export default function BuiltInSoundPack() {
  const settings = useGameStore((s) => s.settings);
  const classic = isClassic(
    useGameStore.getState().playing
      ? useGameStore.getState().game
      : useGameStore.getState().selectedMap,
  );
  if (classic)
    return (
      <div className="sound-pack">
        <h4>Classic sound effects</h4>
        <p className="muted">Soft button taps, dice rolls, card shuffles and coin chimes.</p>
        {['click', 'roll', 'card', 'purchase', 'build', 'victory'].map((kind) => (
          <div className="sound-row" key={kind}>
            <span>{kind}</span>
            <button
              className="button"
              data-audio-preview
              onClick={() => playSound(kind, { ...settings, mute: false })}
            >
              Preview
            </button>
          </div>
        ))}
      </div>
    );
  return (
    <div className="sound-pack">
      <h4>Star Wars sound pack</h4>
      <p className="muted">
        Saber, blaster, and R2-D2-style recordings are included and ready to play.
      </p>
      {SOUND_PACK.map((sound) => (
        <div className="sound-row" key={sound.kind}>
          <span>
            {sound.label}
            <small>{sound.source}</small>
          </span>
          <button
            data-audio-preview
            className="button"
            onClick={() => playSound(sound.kind, { ...settings, mute: false })}
          >
            Preview
          </button>
        </div>
      ))}
      <p className="audio-attribution">
        Saber design: Bruna Mattos, João Gilberto Tenório & Taiane Ketily. Blaster: MikeE63. Droid:
        Ashe Kirk / OwlStorm.{' '}
        <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer">
          Credits & licenses
        </a>
      </p>
    </div>
  );
}
