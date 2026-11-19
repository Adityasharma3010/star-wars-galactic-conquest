# Star Wars: Galactic Conquest

A playable, non-commercial fan board game with 40 interactive sectors, official Databank location images, original token/building illustrations, local games, four AI difficulties and real Supabase multiplayer. Hyperspace is at the top left. Commander hover reveals their location; ownership badges/filters show holdings, and the board can expand for easier reading.

This project is independent of Lucasfilm, Disney, Hasbro and the official Star Wars products. See [asset credits](ASSET_CREDITS.md).

Play the verified hosted game: **https://star-wars-galactic-conquest.vercel.app**.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev -- --port 5174
```

Open http://localhost:5174. Solo and pass-and-play work without backend credentials. For online play, configure the public Supabase values in `.env.local` using `.env.example`. Creating or joining a room starts a guest session automatically; accounts are available from the commander profile. `VITE_PUBLIC_GAME_URL` makes local invitation buttons share the hosted address, which friends can access outside your LAN. Keep `.env.local` and `.env.backend` out of Git.

The linked project is `iheauyxopwcpouogfkvi`, in Mumbai. Its migrations and JavaScript Edge Function are actually deployed; see [the setup report](SUPABASE_SETUP_REPORT.md).

## Play and customize

- New game: character, allegiance, 2–8 commanders, human/AI slots, difficulty and classic/quick/teams/custom rules.
- Find a game: authenticated public rooms, private codes, invite links, synchronized readiness, host settings, AI filling and refresh recovery.
- Board: roll, acquire/auction, manage developments and mortgages, negotiate trades and counteroffers, resolve detention/debt and view results.
- Profile: cloud statistics/history, friends, invitations, rankings and device cosmetics.
- Comms: match/team/global messages, mute, block and report.
- Settings: an included saber/blaster/droid sound pack, volume controls, atmospheric soundscape and reduced motion. No audio import is needed.

## Validate

```sh
npm test
npm run build
npm run test:e2e
node scripts/generate-db-test.js
npx supabase db query --linked --file tests/database/security.sql
```

Playwright uses installed Microsoft Edge and a running server on port 5174. Set `PLAYWRIGHT_BASE_URL` to test a hosted deployment instead. `GAME_LAN_URL` selects the address used by the invitation test. Online tests contact the real Supabase project and create QA guest accounts/matches. The SQL security test rolls back all its fixtures. See [verification status](DEVELOPMENT_STATUS.md) for what actually passed.

## Deploy

See [deployment instructions](DEPLOYMENT.md). Vercel receives only the Supabase URL and publishable key. Privileged keys remain in the Supabase Edge runtime.

The JavaScript engine must be synchronized before deploying server changes:

```sh
npm run backend:sync
npx supabase functions deploy galactic-api --use-api
```

Do a dry run and obtain the owner's approval before applying further remote migrations. Never reset the remote database.

Architecture: [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md). Rules: [GAME_RULES.md](GAME_RULES.md).
