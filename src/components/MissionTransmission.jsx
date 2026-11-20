import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';

export default function MissionTransmission() {
  const { observedEvent, clearTransmission, modal } = useGameStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!observedEvent) return;
    setReady(false);
    const first = setTimeout(() => setReady(true), Math.max(0, observedEvent.readyAt - Date.now()));
    const last = setTimeout(
      clearTransmission,
      Math.max(0, observedEvent.readyAt - Date.now()) + 6500,
    );
    return () => {
      clearTimeout(first);
      clearTimeout(last);
    };
  }, [observedEvent?.id]);
  if (!observedEvent || !ready || modal) return null;
  return (
    <aside className="mission-transmission" role="status">
      <Radio size={21} />
      <div>
        <span className="eyebrow">
          {observedEvent.player?.name || 'A commander'} / {observedEvent.card.deck.toUpperCase()}{' '}
          MISSION
        </span>
        <strong>{observedEvent.card.title}</strong>
        <p>
          The mission belongs to {observedEvent.player?.name || 'that commander'}. Your flight log
          records the result.
        </p>
      </div>
    </aside>
  );
}
