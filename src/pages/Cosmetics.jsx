import { useState } from 'react';
import { Check, LockKeyhole, Sparkles } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { Emblem } from '../components/Art.jsx';
const cosmetics = [
  { id: 'gold', name: 'Galactic Gold', color: '#e5bd73', wins: 0 },
  { id: 'cyan', name: 'Holographic Cyan', color: '#75c7d7', wins: 0 },
  { id: 'rebel', name: 'Rebel Red', color: '#df8282', wins: 1 },
  { id: 'jedi', name: 'Jedi Green', color: '#97ccad', wins: 3 },
];
export default function Cosmetics() {
  const { settings, updateSettings, history, profile } = useGameStore();
  const wins = history.filter((h) => h.players.find((p) => p.name === profile.name)?.won).length;
  return (
    <div>
      <p className="muted">
        Original command-deck accent packs. Earn additional colors through completed matches. No
        payments or licensed character artwork.
      </p>
      <div className="cosmetic-grid">
        {cosmetics.map((c) => (
          <button
            key={c.id}
            disabled={wins < c.wins}
            onClick={() => updateSettings({ accent: c.color, cosmetic: c.id })}
            style={{ color: c.color }}
            className={settings.cosmetic === c.id ? 'selected' : ''}
          >
            <Emblem size={63} />
            <strong>{c.name}</strong>
            <small>
              {wins < c.wins ? (
                <>
                  <LockKeyhole size={11} /> {c.wins} victories to unlock
                </>
              ) : settings.cosmetic === c.id ? (
                <>
                  <Check size={11} /> Equipped
                </>
              ) : (
                <>
                  <Sparkles size={11} /> Available · Equip
                </>
              )}
            </small>
          </button>
        ))}
      </div>
      <p className="muted">Your cosmetic selection saves on this device.</p>
    </div>
  );
}
