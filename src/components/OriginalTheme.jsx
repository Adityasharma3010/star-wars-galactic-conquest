import { useEffect, useRef, useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { loadThemePlayer, ORIGINAL_THEME } from '../services/originalTheme.js';

export default function OriginalTheme({ playing, audible, volume }) {
  const host = useRef();
  const player = useRef();
  const desired = useRef({ playing, audible, volume });
  desired.current = { playing, audible, volume };
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const applySound = (target) => {
    target.setVolume(Math.round(Math.max(0, Math.min(1, desired.current.volume)) * 100));
    if (desired.current.audible) target.unMute();
    else target.mute();
  };
  useEffect(() => {
    let disposed = false;
    setStatus('loading');
    const mount = document.createElement('div');
    host.current.append(mount);
    loadThemePlayer()
      .then((YT) => {
        if (disposed) return;
        player.current = new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          width: 320,
          height: 200,
          videoId: ORIGINAL_THEME.videoId,
          playerVars: { playsinline: 1, controls: 1, rel: 0, origin: location.origin },
          events: {
            onReady: (event) => {
              if (disposed) return;
              const frame = event.target.getIframe();
              frame.title = 'Original Star Wars Main Title · John Williams';
              frame.referrerPolicy = 'strict-origin-when-cross-origin';
              applySound(event.target);
              setStatus('ready');
              if (desired.current.playing) event.target.playVideo();
            },
            onStateChange: (event) => {
              if (!disposed)
                setStatus(
                  event.data === 1
                    ? 'playing'
                    : event.data === 2
                      ? 'paused'
                      : event.data === 3
                        ? 'buffering'
                        : 'ready',
                );
            },
            onError: () => {
              if (!disposed) setStatus('unavailable');
            },
            onAutoplayBlocked: () => {
              if (!disposed) setStatus('paused');
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setStatus('unavailable');
      });
    return () => {
      disposed = true;
      player.current?.destroy();
      player.current = null;
      mount.remove();
    };
  }, [attempt]);
  useEffect(() => {
    if (!player.current?.getPlayerState) return;
    applySound(player.current);
    if (playing) player.current.playVideo();
    else player.current.pauseVideo();
  }, [playing, audible, volume]);
  return (
    <aside
      className="original-theme-panel"
      data-playback={status}
      aria-label="Original Star Wars theme"
    >
      <div className="original-theme-heading">
        <strong>ORIGINAL STAR WARS THEME</strong>
        <span>{ORIGINAL_THEME.artist}</span>
      </div>
      <div ref={host} className="original-theme-player" />
      <div className="original-theme-actions">
        <span>
          {status === 'playing'
            ? audible
              ? 'Main Title · playing'
              : 'Main Title · muted'
            : status === 'loading' || status === 'buffering'
              ? 'Connecting to the original recording…'
              : status === 'unavailable'
                ? 'This recording is unavailable here.'
                : 'Press play if the theme hasn’t started.'}
        </span>
        {status !== 'playing' && (
          <button
            className="text-button"
            data-opening-control
            disabled={status === 'loading'}
            onClick={() =>
              status === 'unavailable' ? setAttempt(attempt + 1) : player.current?.playVideo?.()
            }
          >
            <Play size={13} />
            {status === 'unavailable' ? 'Retry' : 'Play theme'}
          </button>
        )}
        <a
          href={ORIGINAL_THEME.source}
          target="_blank"
          rel="noreferrer"
          aria-label="Open the official Main Title recording"
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </aside>
  );
}
