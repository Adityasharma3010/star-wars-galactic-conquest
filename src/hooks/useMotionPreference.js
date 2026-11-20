import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore.js';

export default function useMotionPreference() {
  const setting = useGameStore((state) => state.settings.reducedMotion);
  const [system, setSystem] = useState(() =>
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setSystem(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return Boolean(setting || system);
}
