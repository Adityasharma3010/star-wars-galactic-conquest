# Supabase setup report

Verified 19 November 2026. Project **star-wars-galactic-conquest**, reference `iheauyxopwcpouogfkvi`, organization **Aditya Org**, Mumbai (`ap-south-1`). [Dashboard](https://supabase.com/dashboard/project/iheauyxopwcpouogfkvi).

The project was created with the owner's authorization. Before migration it contained no public application tables, functions, policies, migration history or auth users. No unrelated application was modified.

## Applied migrations

All four remote pushes succeeded after their dry runs and the owner's approvals:

1. `202611190001_schema.sql` — normalized tables, constraints, indexes, RLS, profile trigger, Realtime and Storage.
2. `202611190002_authority.sql` — trusted room/start/engine/commit/rate RPCs and transactional normalized economy/history.
3. `202611190003_catalog.sql` — 28 purchasable assets, 24 cards and achievement definitions.
4. `202611190004_lobby_transactions.sql` — atomic readiness/friend acceptance/lobby edits/host leave, profile sync, auction deadlines, team progression and moderated global chat.

The remote migration history contains all four versions. No remote reset was used.

## Verified schema

**36 public tables, all 36 with RLS; 80 public indexes; 39 public policies.** The private engine, action and rate-limit tables are in `galactic_private`.

Public tables: `profiles`, `player_settings`, `friendships`, `friend_requests`, `blocked_players`, `game_rooms`, `room_players`, `room_settings`, `room_invitations`, `games`, `game_players`, `game_state`, `game_events`, `turn_history`, `match_history`, `player_wallets`, `transactions`, `properties`, `property_ownership`, `property_development`, `mortgages`, `trades`, `trade_items`, `trade_history`, `auctions`, `auction_bids`, `card_decks`, `card_definitions`, `player_cards`, `chat_messages`, `player_reports`, `player_statistics`, `achievements`, `player_achievements`, `cosmetic_items`, `player_cosmetics`.

Service-only authority RPCs: `galactic_rate_limit`, `galactic_create_room`, `galactic_join_room`, `galactic_start_match`, `galactic_engine`, `galactic_commit`, `galactic_ready`, `galactic_friend_response`, `galactic_configure_room`, `galactic_leave_room`. Membership helpers and narrowly scoped profile/progression/auction triggers are also installed. Client-side authenticated/anonymous callers cannot execute the authority RPCs or access the private schema.

Database lint found no schema errors. The verification scripts are `supabase/verify-remote.sql` and `tests/database/security.sql`.

## Deployed backend

The JavaScript Edge Function **`galactic-api`** was deployed successfully through the Supabase API, including the synchronized pure engine, AI, action validation, origin validation and committed-state achievement safeguards. It authenticates every request using Supabase Auth, replaces supplied actor IDs and uses trusted randomness. The gateway JWT flag is disabled for publishable-key compatibility; the handler still verifies each user access token with Supabase Auth.

The Edge runtime receives the service-role credential from Supabase. No privileged key is stored in a Vite variable or committed file. The frontend has only the public URL and publishable key. The generated database password and local CLI/deployment credentials remain in ignored local configuration.

## Authentication, Realtime and Storage

Guest/anonymous auth and email signup/confirmation are enabled. Private match Presence is membership-authorized. RLS-secured Postgres Changes are enabled for `game_rooms`, `room_players`, `game_state`, `trades`, `auctions`, `chat_messages`.

Buckets, each limited to 5 MiB: `player-avatars` (private), `game-cosmetics` (public), `board-themes` (public), `profile-decorations` (private). User avatar access is scoped to the authenticated user's folder; theme/cosmetic publication is controlled. Official Star Wars reference images are linked from the Databank CDN; unauthorized artwork was not uploaded into these buckets.

`ALLOW_LAN_ORIGINS=true` enables authenticated requests from private IPv4 addresses on development ports 5173/5174. Unrelated public hosts and other ports remain rejected. LAN guest join, readiness, start and dice rolling were verified through `http://192.168.1.14:5174/` with two independent sessions.

## Actual verification

Rollback-only SQL fixtures passed member versus outsider reads, denied wallet writes, denied private/authority access, atomic readiness and friendship, duplicate commit idempotency and stale-version rejection. All fixtures rolled back.

Real browser sessions passed public/private room creation and joining, same-character readiness races, host-only configuration, forged actor rejection, concurrent dice/bid protection, counteroffers, purchases/auction ownership, match/team/global chat isolation, invitations, refresh recovery and a complete five-round team match. Final team results and each user's statistics were checked remotely; the actual victory screen was displayed.

## Operational requirements

`ALLOWED_ORIGINS` includes the verified production address https://star-wars-galactic-conquest.vercel.app and the intended localhost development origins. Auth site URL and redirect configuration were pushed successfully to that production address. Hosted guests, room invitations, readiness, starting, dice, chat and recovery passed in independent browser sessions; publishing details are in `DEPLOYMENT.md`. Email confirmation is configured, but a complete real inbox verification cycle is not claimed. Owner mail delivery and moderation operations need launch-specific configuration. Client polling drives AI/deadline processing; a match with every client offline remains saved until a client returns. See `ASSET_CREDITS.md` for the distinction between creator-licensed audio and official reference-image rights.
