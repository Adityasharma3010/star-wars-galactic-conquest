import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { playSound } from '../services/audio.js';
import { useGameStore } from '../stores/gameStore.js';
export default function Countdown({ deadline, auction = false }) {
  const [now, setNow] = useState(Date.now());
  const seconds = Math.max(0, Math.ceil(((deadline || now) - now) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (auction && seconds > 0 && seconds <= 5)
      playSound('countdown', useGameStore.getState().settings);
  }, [seconds, auction]);
  if (!deadline) return null;
  return (
    <span
      className={`countdown ${seconds < 10 ? 'urgent' : ''}`}
      role="timer"
      aria-label={auction ? 'Auction countdown' : 'Turn countdown'}
    >
      <Timer size={13} />
      {seconds}s
    </span>
  );
}
