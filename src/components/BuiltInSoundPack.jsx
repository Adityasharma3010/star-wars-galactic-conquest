import { SOUND_PACK, playSound } from '../services/starWarsAudio.js';
import { useGameStore } from '../stores/gameStore.js';
export default function BuiltInSoundPack() {
  const settings = useGameStore((s) => s.settings);
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
