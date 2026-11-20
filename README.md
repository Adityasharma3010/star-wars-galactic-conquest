# Star Wars: Galactic Conquest

A playable, non-commercial fan board game with 40 interactive sectors, official Databank location images, original token/building illustrations, local games, four AI difficulties and real Supabase multiplayer. Hyperspace is at the top left. Commander hover reveals their location; ownership badges/filters show holdings, and the board can expand for easier reading.

This project is independent of Lucasfilm, Disney, Hasbro and the official Star Wars products. See [asset credits](ASSET_CREDITS.md).

Play the verified hosted game: **https://monopoly.adityasharma.site**.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev -- --port 5174
```

Open http://localhost:5174. A fresh visit shows the welcome menu. Choose Play locally and explicitly launch a match, or choose Online multiplayer. Local saves wait for Resume saved game; active online matches recover on refresh. The old unplayed automatic bot preview is removed while keeping profiles and settings. Solo and pass-and-play work without backend credentials. For online play, configure the public Supabase values in `.env.local` using `.env.example`. Creating or joining a room starts a guest session automatically; accounts are available from the commander profile. `VITE_PUBLIC_GAME_URL` makes local invitation buttons share a hosted address, which friends can access outside your LAN. Hosted links use the current hostname. Keep `.env.local` and `.env.backend` out of Git.

The custom domain https://monopoly.adityasharma.site is attached to Vercel. See [DOMAIN_SETUP.md](DOMAIN_SETUP.md) for the GoDaddy CNAME and DNS status. The existing Vercel alias stays available while DNS is configured.

## Formatting in VS Code

Open this project folder in VS Code with the Prettier extension (`esbenp.prettier-vscode`). The committed workspace settings select it as the formatter and enable format on save for the entire file. `.prettierrc.json` defines two-space indentation, semicolons, single quotes and LF line endings. SQL/TOML/SVG files are also supported; SQL formatting checks that its lexical tokens and embedded JSON values remain unchanged.

```sh
npm run format
npm run format:check
```

Generated dependencies, build output, private environment files, binary assets and browser traces are excluded from formatting. Reload the VS Code window once if it had cached a formatter before installing these project dependencies.

The linked project is `iheauyxopwcpouogfkvi`, in Mumbai. Its migrations and JavaScript Edge Function are actually deployed; see [the setup report](SUPABASE_SETUP_REPORT.md).

## Play and customize

- Opening screen: choose local or online play; saved local games resume explicitly. New matches have a skippable crawl featuring commander names and chosen factions with included orchestral music.
- Custom settings: grouped controls, retained local/room drafts and an explicit Reset rules action. Room rules apply only on Save; background updates preserve edits.
- New game: character, allegiance, 2–8 commanders, human/AI slots, difficulty and classic/quick/teams/custom rules.
- Find a game: authenticated public rooms, private codes, invite links, editable guest/registered callsigns, synchronized readiness, host settings, AI filling and refresh recovery.
- Board: roll, acquire/auction, manage developments and mortgages, negotiate trades and counteroffers, resolve detention/debt and view results.
- Profile: cloud statistics/history, friends, invitations, rankings and device cosmetics.
- Comms: match/team/global messages, mute, block and report.
- Settings: an included saber/blaster/droid sound pack, volume controls, atmospheric soundscape and reduced motion. No audio import is needed.
- Force/Galactic Events: animated holocron/saber and starfighter transmission briefings, with readable effects and a Continue mission action for the recipient. Other commanders receive a noninteractive transmission.
- Online timing: ordinary turns are untimed; network loss grants five minutes after heartbeat detection, leaving grants two minutes. Rejoin returns control. Auction bids reset their closing countdown to ten seconds.

## Validate

```sh
npm run format:check
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
