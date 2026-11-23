import { mapText } from '../services/mapText.js';
import HoloSelect from './HoloSelect.jsx';
import { Coins, Navigation, Shield, Building2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { isClassic } from '../game/maps.js';
const numbers = {
  startingCredits: ['STARTING CREDITS', 100, 10000, 'Each commander’s initial reserve.'],
  startBonus: ['HYPERSPACE BONUS', 0, 1000, 'Collect when passing Hyperspace.'],
  incomeTax: ['IMPERIAL TAX', 0, 1000, 'Payment on the Imperial Tax tile.'],
  luxuryTax: ['LUXURY TAX', 0, 1000, 'Payment on the Luxury Tax tile.'],
  roundLimit: ['ROUND LIMIT', 0, 1000, '0 keeps the conquest unlimited.'],
  outposts: ['OUTPOST INVENTORY', 0, 64, 'Shared supply for every commander.'],
  bases: ['BASE INVENTORY', 0, 24, 'Planetary bases available to build.'],
};
const switches = {
  auctions: ['Auction declined worlds', 'Unclaimed worlds go to the highest bidder.'],
  freeParking: ['Free Orbit tax pool', 'Taxes accumulate for the next visitor.'],
  trading: ['Enable trading', 'Negotiate worlds, credits, and escape cards.'],
  mortgages: ['Enable mortgages', 'Raise credits against undeveloped worlds.'],
  teams: ['Alternate team assignment', 'Commanders share a team victory.'],
  noTeamRent: ['No rent between teammates', 'Travel through allied worlds freely.'],
  sharedProperties: [
    'Team ownership completes color groups',
    'Allied worlds count toward development.',
  ],
  duplicateCharacters: [
    'Allow duplicate characters',
    'Multiple commanders may use the same token.',
  ],
};
export default function RuleFields({ rules, setRules, onReset, showDifficulty = true }) {
  const classic = isClassic(rules);
  const number = (key) => {
    const [label, min, max, help] = numbers[key];
    return (
      <label className="field rule-number" key={key}>
        <span>{mapText(label)}</span>
        <input
          type="number"
          min={min}
          max={max}
          value={rules[key]}
          onChange={(e) =>
            setRules({
              ...rules,
              [key]: +e.target.value,
            })
          }
        />
        <small>{mapText(help)}</small>
      </label>
    );
  };
  const toggle = (key) => (
    <label className="rule-switch" key={key}>
      <span>
        <strong>{mapText(switches[key][0])}</strong>
        <small>{mapText(switches[key][1])}</small>
      </span>
      <input
        type="checkbox"
        checked={rules[key]}
        onChange={(e) =>
          setRules({
            ...rules,
            [key]: e.target.checked,
          })
        }
      />
    </label>
  );
  return (
    <div className="rule-editor">
      <div className="rule-editor-heading">
        <SlidersHorizontal size={18} />
        <div>
          <strong>{mapText('Your galaxy. Your rules.')}</strong>
          <small>Custom settings stay on this device until you reset them.</small>
        </div>
        {onReset && (
          <button type="button" className="text-button rule-reset" onClick={onReset}>
            <RotateCcw size={13} />
            Reset rules
          </button>
        )}
      </div>
      <section className="rule-section">
        <h4>
          <Coins size={15} />
          {mapText('Galactic economy')}
        </h4>
        <div className="rule-number-grid">
          {['startingCredits', 'startBonus', 'luxuryTax'].map(number)}
          <label className="field rule-number">
            <span>{classic ? 'INCOME TAX BASIS' : 'IMPERIAL TAX BASIS'}</span>
            <HoloSelect
              value={rules.taxBasis || 'cash'}
              onChange={(event) =>
                setRules({
                  ...rules,
                  taxBasis: event.target.value,
                })
              }
            >
              <option value="cash">10% of cash</option>
              <option value="wealth">10% of total wealth</option>
            </HoloSelect>
            <small>The rate is always 10%. Fractional payments round up.</small>
          </label>
        </div>
        {toggle('freeParking')}
      </section>
      <section className="rule-section">
        <h4>
          <Navigation size={15} />
          {mapText('Conquest & negotiation')}
        </h4>
        {number('roundLimit')}
        {['auctions', 'trading', 'mortgages'].map(toggle)}
        <div className="rule-timing-note">
          Turns are untimed. Each auction bid extends bidding by 10 seconds.
        </div>
      </section>
      <section className="rule-section">
        <h4>
          <Shield size={15} />
          {mapText('Teams & commanders')}
        </h4>
        {['teams', 'noTeamRent', 'sharedProperties', 'duplicateCharacters'].map(toggle)}
        {showDifficulty && (
          <label className="field rule-number">
            <span>AI DIFFICULTY</span>
            <HoloSelect
              value={rules.difficulty}
              onChange={(e) =>
                setRules({
                  ...rules,
                  difficulty: e.target.value,
                })
              }
            >
              {['easy', 'medium', 'hard', 'expert'].map((d) => (
                <option key={d} value={d}>
                  {d[0].toUpperCase() + d.slice(1)}
                </option>
              ))}
            </HoloSelect>
          </label>
        )}
      </section>
      <section className="rule-section">
        <h4>
          <Building2 size={15} />
          Planetary development
        </h4>
        <div className="rule-number-grid">{['outposts', 'bases'].map(number)}</div>
      </section>
    </div>
  );
}
