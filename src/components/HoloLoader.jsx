import { Emblem } from './Art.jsx';

export default function HoloLoader({ label = 'Establishing hololink…', compact = false }) {
  return (
    <div className={'holo-loader ' + (compact ? 'compact' : '')} role="status" aria-live="polite">
      <span className="holo-loader-scope">
        <Emblem size={compact ? 20 : 34} />
      </span>
      <span>
        {label}
        <i className="holo-loader-dots" aria-hidden="true">
          <b />
          <b />
          <b />
        </i>
      </span>
    </div>
  );
}
