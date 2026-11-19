# Game architecture

The application uses React 19, Vite, JavaScript/JSX, Tailwind v4, Zustand, GSAP with `@gsap/react`, Motion and Lucide. There are no application TypeScript files.

`src/game/engine/game.js` is independent of React. `createGame` creates a state; `transition` validates an action and returns a cloned successor, or throws. Injected randomness permits deterministic rule tests. The action ID/version boundary rejects duplicates and stale state. `timeouts.js` chooses legal inactivity actions. `src/game/ai/commander.js` implements four cash-reserve and valuation policies. Board, character, faction and lore configuration is centralized in `src/game/rules/data.js`; card definitions are in `src/game/cards/decks.js`.

Zustand persists local matches, settings, profile, history and online recovery references. Online clients dispatch to `galactic-api`; they do not run economic transitions. Realtime supplies committed snapshots, room events, chat and private match Presence. Snapshot polling recovers missed updates and drives AI/deadlines. Lower-version snapshots are ignored. Local mode runs the same engine with cryptographic browser randomness.

The Supabase Edge Function authenticates the access token with Supabase Auth, validates inputs/origins and rate limits the caller. It replaces submitted actor IDs with the authenticated identity, generates secure randomness and reads the hidden engine through service-only RPCs. Trusted AI actions and timeout actions use the same transition function.

`galactic_commit` locks the game revision, checks expected version and persistent action idempotency, and updates wallets, transactions, ownership, developments, mortgages, trades/items/history, auctions/bids, cards, events, turns and match results in one PostgreSQL transaction. It then publishes a redacted snapshot. Private deck order, discards, payment queues and processed IDs never appear in the client snapshot. Economy/progression tables have no client write policies.

Readiness, friendship acceptance, lobby configuration and host transfer are serialized by service-only functions. Profiles/settings use own-user RLS. Public room discovery excludes private codes; direct room and match access requires membership. Chat reads enforce membership, team boundaries and player blocks. The global channel uses a null match reference with no team. Reports are private to the reporter and trusted moderation access.

The 40 tiles are rendered independently. Tokens derive screen coordinates from tile indices; GSAP moves them tile by tile at roughly 260 ms per sector. Animations visualize committed state and can be interrupted without changing the engine. Motion manages dialogs, menus, hover and log entries. Reduced motion skips movement sequences. Board focus mode expands the board; mobile focus allows panning inside the view.

The game uses official Databank location reference images, with original SVG tokens, buildings and fallbacks. Creator-licensed saber/blaster/droid recordings are bundled in `public/audio`; Web Audio plays excerpts and atmospheric loops. Only public URL/publishable-key variables are bundled by Vite. LAN origins on the development ports can be enabled explicitly; authentication and action/RLS controls remain mandatory.

Deployment copies shared engine JavaScript into the Edge Function via `npm run backend:sync`. SQL migrations remain versioned. Vercel's SPA rewrite serves the Vite build and supports room invite URLs. Production origin/auth configuration must be updated to the actual hosted URL.
