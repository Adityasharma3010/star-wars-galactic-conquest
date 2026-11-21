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

The cinematic command room includes a framed command header, animated navigation, a photographic hologram, orbital lighting and larger launch controls. The board's sector controls browse each color group and open the selected deed. Token movement lights the route, property claims pulse, buildings reveal, and balances count to their committed value. Money transfers leave short light trails; event briefings, auctions and victory screens have their own effects. India keeps warmer materials, city imagery and classic effects. The operating system and in-game reduced-motion setting stop ambient effects and shorten transitions.

Choose **2D view** or **3D view** above the board during any match. Star Wars 3D is a planetary command table with 22 modeled worlds, textured desert/ice/ocean/forest/lava/city surfaces, atmosphere, rotation and a larger selected-world model. India has a raised geographic outline and 22 selectable capital markers, photographic tiles, colored pills and classic buildings. Drag to orbit, scroll/pinch or use zoom, Top view, Focus selected world and Reset camera. Click a tile or city marker to inspect it, or use **Explore all 40 spaces** for keyboard-accessible selection. Player hover and ownership filters work in both views. Expand board opens a larger focus view.

Click the displayed dice to roll, or focus them and press Enter/Space. The actual cubes inside the 3D scene are also clickable. These shortcuts use the same turn, spectator, AI, movement and syncing checks as the Roll button; they cannot roll during another player's turn or a different phase.

Your view is saved only on this browser. Changing it never changes room rules, the shared match or another player's view. Both views use the same controls and server-authoritative results. Three.js loads only after selecting 3D, and the six planet material images load only for Star Wars 3D (about 3.8 MiB total, shared between all worlds). Idle rendering is capped at 30 fps and movement uses up to 60 fps. If WebGL is unavailable or lost, the match returns safely to 2D. Planets use original geometry/shaders with adapted, licensed solar-system textures; they are stylized fictional worlds rather than official Star Wars models. India uses public-domain Natural Earth geographic data. See the asset credits for sources and licenses.

- Opening screen: cinematic official Star Wars Databank imagery with a starfield, subtle scene motion and reduced-motion support. Choose local or online play; saved local games resume explicitly.
- Map picker: React Router pages at `/maps/star-wars` and `/maps/default`. Galactic Conquest is the Star Wars map. India is playable under Default with 22 real capital-city photos, rupees, eight colored pill tokens, houses/hotels, Chance/Community Chest and classic audio. Default maps have no factions or Star Wars opening. See [India map details](INDIA_MAP.md).
- New matches use `/match/:gameId`. Star Wars matches have a skippable crawl featuring commander names and chosen factions. The original Main Title streams through its YouTube player, whose panel is hidden at the owner's request. The match starts automatically when the final story line clears the horizon, and intro playback is destroyed. Browser autoplay restrictions can show a Play theme control. India starts directly on the board.
- Dropdowns: holographic lists with mouse/touch selection, arrow/Home/End/Enter keys, type-ahead, and Escape dismissal.
- Custom settings: grouped controls, retained local/room drafts and an explicit Reset rules action. Room rules apply only on Save; background updates preserve edits.
- New game: character, allegiance, 2–8 commanders, human/AI slots, difficulty and classic/quick/teams/custom rules.
- Find a game: authenticated public rooms, private codes, invite links, editable guest/registered callsigns, synchronized readiness, host settings, AI filling and refresh recovery.
- Board: switch independently between 2D and 3D; roll, acquire/auction, manage developments and mortgages, negotiate trades and counteroffers, resolve detention/debt and view results.
- Profile: cloud statistics/history, friends, invitations, rankings and device cosmetics.
- Comms: match/team/global messages, mute, block and report.
- Settings: included saber/blaster/droid effects, separate intro/ambient/background volumes, and reduced motion. Galactic radio plays a quiet three-track ambient playlist with smooth transitions; choose ordered/shuffled playlists or loop a song. Add up to five personal songs (50 MB each), saved only on this browser, for match background music.
- Force/Galactic Events: animated holocron/saber and starfighter transmission briefings, with readable effects and a Continue mission action for the recipient. Other commanders receive a noninteractive transmission. See [the complete 24-event guide](FORCE_AND_GALACTIC_EVENTS.md).
- Online timing: ordinary turns are untimed; network loss grants five minutes after heartbeat detection, leaving grants two minutes. Rejoin returns control. Auction bids reset their closing countdown to ten seconds.
- Expired human seats are eliminated and return their assets to the bank; no replacement bot is added. A sole survivor wins, while simultaneous expiry of every player ends without a winner. Late visitors can watch, and join a linked waiting room for the next match after this one finishes.
- Imperial/Income Tax always charges 10% of cash by default. Custom Rules may choose 10% of total wealth instead. Fractional tax payments round up; old flat-tax values are ignored.

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
