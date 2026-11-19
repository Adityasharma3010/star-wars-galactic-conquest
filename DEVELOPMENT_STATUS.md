# Development and verification status

Updated 19 November 2026.

## Implemented milestones

| Milestone | Result |
| --- | --- |
| Visual foundation | 40 independently interactive tiles; official Databank world/vehicle imagery; original character tokens and outpost/base art; readable perimeter cards; top-left Hyperspace; ownership colors/sigils/filters and hover location. Player-number badges are removed. |
| Local rules | Dice/doubles/movement/bonus, purchase/rent, auctions, even development and inventory, mortgages, detention, all 24 cards, trades/counteroffers, debt, bankruptcy, classic/team victory and limited quick games. |
| AI | Four legal decision policies; buying/bidding/development/finance/debt/card strategy and group-completing offers; deterministic complete-game tests. |
| Remote Supabase | Dedicated project configured; five approved migrations applied; RLS/Realtime/Storage/auth/RPCs verified; JavaScript Edge Function deployed with per-document connection grace and reconnect commit protection. |
| Online play | Real guests, public/private rooms, invitations, ready/host settings, mixed AI/human matches, authoritative economy and versioned actions, scoped chat, Presence and refresh recovery. |
| Social and progression | Cloud profiles/settings/history/statistics, friends/search/acceptance, recently played, invitations, rankings, mute/block/report, first-world/victory achievements and device accent packs. |
| Polish | Animated Jedi holocron/saber and starfighter transmission events; holographic dialogs, image-backed trade manifests and readable briefings. GSAP dice/token movement, paced AI, reduced motion and included saber/blaster/droid recordings. Ordinary turns are untimed; disconnections receive five minutes, leaving receives two minutes, auction bids close after ten seconds. |
| Hosting | Production Vercel deployment is publicly accessible at https://star-wars-galactic-conquest.vercel.app. Supabase production origins/auth redirects are configured; actual hosted multiplayer, invite recovery, images and built-in audio passed. |

## Passed checks

- **21 Playwright browser tests passed** in six minutes. The suite includes the original 17 gameplay/LAN/online/social/visual checks plus Force and Galactic event presentations, trade manifests/actions and actual disconnect/leave/rejoin timers. Desktop and mobile visuals, a complete online team match, security/races, image loading and refresh recovery passed.
- **66 Vitest unit tests passed**, covering the classic rule engine, four AI policies and complete games, auctions/counteroffers/team ownership, custom-rule validation, role/version/input protection, LAN filtering, committed achievements, grace boundaries, temporary control and event queuing without duplicate effects.
- **Four additional hosted browser runs passed** on the public Vercel alias: fresh guest invite/start/roll, independent-session sync/chat/refresh, all 26 images with ownership/building markers and desktop/mobile overflow, and actual decoding/preview of all three installed audio recordings. These repeat selected checks from the 17-test suite against production.
- Production Vite build passed. All application sources are JavaScript/JSX; schema/functions are SQL/JavaScript.
- Actual remote inspection: 36/36 public tables use RLS, 80 public indexes, 39 public policies, 28 assets, 24 cards, six Realtime tables, four buckets and five approved migrations. The new private connection table has RLS and no client access.
- Rollback-only database verification passed authorization, denied writes/RPCs/private schema, readiness/friendship atomicity, commit idempotency and stale-state checks.
- Connection fixtures passed multiple live tabs, both grace periods, expiry, outsider rejection and a reconnect cancelling a pending automatic action. Both the original and connection security fixtures rolled back.

## Failures investigated and resolved

Initial online fetch failures inside the network sandbox passed with permitted network access. The obsolete unconfigured-room assertion was updated by restoring its explanatory UI text. SQL fixture dollar-quoting was corrected and rerun successfully. A stopped development server was restarted. A trade-dialog closing-brace error was fixed and the production build passed. The full-match test now uses an explicit short round limit, reads the signed-in user's statistics rather than an arbitrary ranking row, and verifies recovery through the actual room UI. Its final browser run passed.

## Scope and limits

Official Databank images are owner-requested reference imagery, not a royalty-free asset license. Included audio is creator-licensed Star Wars effect recreation, not asserted film soundtrack/extract licensing. Skins are non-monetized device accent packs, with settings persisted to signed-in profiles. A staffed moderation console, unattended all-clients-offline game scheduler, and real email-inbox confirmation cycle are not claimed. Guest identity cannot be recovered after its credentials are cleared. These limits are documented without fabricated deployments or test results.
