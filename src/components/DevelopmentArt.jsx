export default function DevelopmentArt({ base = false }) {
  return (
    <svg
      className="development-art"
      viewBox="0 0 64 45"
      role="img"
      aria-label={base ? 'Planetary base' : 'Outpost'}
    >
      <ellipse cx="32" cy="39" rx="29" ry="5" fill="#030a13" opacity=".7" />
      {base ? (
        <>
          <path
            d="m6 20 25-12 27 12v18L31 44 6 35z"
            fill="#b7c4ce"
            stroke="#344653"
            strokeWidth="2"
          />
          <path d="m6 20 25 10 27-10-27-12z" fill="#dce4e8" />
          <path d="M31 30v14l27-6V20z" fill="#6f8798" />
          <path d="m12 23 14 6v11l-14-6z" fill="#162938" />
          <path d="m36 29 15-5v7l-15 4z" fill="#83d7e6" />
          <path d="m31 8 1-7m0 2 10 3-10 2" stroke="#a0dbe3" strokeWidth="2" />
          <path d="m43 19-11 5-12-5 12-5z" fill="#8b9eaa" />
        </>
      ) : (
        <>
          <path d="M8 27h48v11L30 43 8 37z" fill="#9d917e" stroke="#2c3b46" strokeWidth="2" />
          <path d="M12 28c0-27 40-27 40 0z" fill="#e2d5bc" stroke="#3e4e5b" strokeWidth="2" />
          <path d="M30 11c9 4 14 9 15 17h7c0-13-9-23-22-17z" fill="#b2a58f" />
          <path d="M25 31a7 7 0 0 1 14 0v10l-14 1z" fill="#132839" />
          <path d="M15 21h8m16 0h7" stroke="#70d6e2" strokeWidth="3" />
          <path d="M48 12v17m-3-16 9-3" stroke="#b4d7df" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
