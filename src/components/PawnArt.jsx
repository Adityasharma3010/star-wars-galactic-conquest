import { useId } from 'react';

export default function PawnArt({
  color = 'currentColor',
  name = 'Player',
  size = 40,
  look = 'right',
  className = '',
}) {
  const id = 'pawn-' + useId().replace(/[^a-z0-9]/gi, '');
  const dx = look === 'left' ? -2 : look === 'right' ? 2 : 0;
  const dy = look === 'up' ? -2 : look === 'down' ? 2 : 0;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={'pawn-art ' + className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={name + ' colored token'}
      style={{ color }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity=".17" />
          <stop offset=".62" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity=".15" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="31" r="27" fill="currentColor" />
      <circle cx="32" cy="31" r="27" fill={'url(#' + id + ')'} />
      <path d="M9 19a27 27 0 0 1 46 0c-12 6-34 6-46 0" fill="white" opacity=".1" />
      <ellipse cx="31" cy="40" rx="9" ry="10" fill="#fffdf5" />
      <ellipse cx="47" cy="38" rx="8" ry="9" fill="#fffdf5" />
      <circle cx={31 + dx} cy={41 + dy} r="4" fill="#263441" />
      <circle cx={47 + dx} cy={39 + dy} r="3.6" fill="#263441" />
      <circle cx={32 + dx} cy={39 + dy} r="1.1" fill="white" />
      <circle cx={48 + dx} cy={37 + dy} r="1" fill="white" />
    </svg>
  );
}
