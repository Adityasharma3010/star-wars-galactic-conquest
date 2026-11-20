# Remote migration plan

Target: `iheauyxopwcpouogfkvi`, **star-wars-galactic-conquest**, Aditya Org, Mumbai (`ap-south-1`). The project was created for this task with the user's authorization. No existing project was repurposed.

1. Inspect schemas, application tables, functions, policies, auth-user count, and migration history using `supabase/inspect-remote.sql`.
2. Review dry run of the three versioned migrations.
3. Obtain the user's migration approval as requested in the master prompt.
4. Apply migrations with `supabase db push`; never reset the remote database.
5. Deploy `galactic-api`, configure allowed web origins and anonymous authentication, set the frontend publishable key, and run real multi-session and RLS tests.

Migrations:

- `202611190001_schema`: 36 normalized public tables, a private engine schema, constraints and indexes, profile trigger, deny-by-default RLS, member read policies, six Realtime tables, private Presence policies, four Storage buckets and scoped avatar permissions.
- `202611190002_authority`: service-role-only rate limiter, room creation/join, match start, private engine read, and atomic action commit RPCs. Commits check version and idempotency, update normalized economy/history records, then publish a redacted snapshot.
- `202611190003_catalog`: 28 purchasable board assets, 24 original cards, and two achievement definitions.

Changes are additive. Table and function creation intentionally fails on conflicting application names. No unrelated table, data, schema, or policy is dropped or overwritten. Supabase-managed auth, storage, and Realtime objects receive only the explicitly named game trigger/policies/buckets/publication additions.

The service-role key stays in the Edge runtime. Future card order and raw internal engine data stay in `galactic_private`. Clients receive only redacted snapshots and cannot write wallets, ownership, auctions, trade outcomes, or match results directly.

## Fourth migration (approved and applied)

The first three migrations are applied. The dry run for `202611190004_lobby_transactions.sql` passed on 19 November 2026.

The fourth migration serializes character readiness, friend acceptance, host changes and lobby rule edits; syncs room callsigns to profiles; maintains auction deadlines; awards team results correctly; and enables global chat with the same blocking controls. It introduces service-only functions and triggers. It relaxes the chat match reference to allow a global channel, replacing only this application's named chat read policy while preserving team and member restrictions. No data is deleted and no unrelated object is changed. Source: `supabase/migrations/202611190004_lobby_transactions.sql`.

The owner approved it after the dry run. Application, Edge deployment and readiness/social/RLS checks succeeded.

# Sixth migration: waiting-room names (approved and applied)

`supabase/migrations/202611200006_waiting_callsigns.sql` passed the linked CLI dry run on 20 November 2026. It adds a service-only callsign operation that validates room membership, locks the waiting room, saves the chosen name/character/faction and resets readiness. A wrapper around the existing match-start implementation checks that the roster still matches the locked room, preventing a stale name from being used during a concurrent start. Existing games and data are retained. The owner approved this after the dry run. The remote push and Edge deployment succeeded; rollback-only name/readiness/profile/roster/permission checks passed.

# Fifth migration: connection grace (approved and applied)

`supabase/migrations/202611190005_connection_grace.sql` was listed successfully by the linked CLI dry run on 19 November 2026. It does not delete existing game data.

- Add a private, RLS-enabled table of per-tab connection heartbeats. No client can read or edit it directly.
- Add service-only RPCs for heartbeat/leave updates and member connection status.
- Detect missing heartbeats after 30 seconds, then grant five minutes to reconnect. Explicitly leaving grants two minutes. Ordinary turns have no countdown.
- Preserve the seat, identity and holdings. After grace expires, temporary AI can continue; reconnecting returns control to the human.
- Wrap the existing atomic commit RPC with a lock shared by reconnect updates. A reconnect cancels a pending automatic action before it commits. Existing economy, history and version checks remain in the original implementation.
- Separate connection updates from game versions, so heartbeats cannot replay movement or invalidate human actions. Multiple active tabs keep a player connected when one tab closes.

The owner approved this migration after the dry run; application and Edge Function deployment succeeded. Rollback-only connection/race/security fixtures and the real two-player disconnect/leave/rejoin browser checks passed.

# Seventh migration: spectators, expired seats and next matches (approved and applied)

Project: `iheauyxopwcpouogfkvi`. Source: `supabase/migrations/202611200007_spectators_and_forfeits.sql`.

- Add an RLS-protected `game_spectators` membership table. Spectators can read only their own access record, the match metadata and its public snapshot. They gain read access to that match's private Realtime channel, without presence-writing or game-action privileges.
- Add a service-only watch-room RPC. A late visitor is never inserted into the player roster. Existing players can reclaim their active seat only before the established deadline; eliminated players can watch.
- Keep five-minute disconnect and two-minute explicit-leave periods. Reject a reconnect after the deadline. Commit expired-seat eliminations as one transaction protected by the existing reconnect lock; a simultaneous valid reconnect cancels the pending batch.
- Expired human seats leave the active roster and return assets/developments to the bank. Their archived player records and all prior game history remain. No replacement AI is created. A sole remaining participant wins; if everyone expires together, no disconnected player is awarded a fabricated win.
- Add atomic room creation/configuration, so map selection and the fixed 10% tax basis cannot be lost between requests. Add a nullable `next_room_id` link and a service-only next-room operation: after the old game finishes, viewers can join a fresh waiting room. The old room and match history remain intact.
- Expose public active rooms for viewing. Private rooms still require a valid invite code and enforce the existing host-block checks. Unauthenticated clients and outsider accounts gain no match access.

The new SQL was compiled and tested inside a single database transaction that was rolled back. Checks passed: classic room rules, spectator snapshot RLS, unchanged player count, denied write RPC grants, expired reconnect rejection, two-seat atomic elimination, sole-player victory, and a spectator joining the next waiting room. No fixture data or validation DDL was committed.

The owner approved the seventh migration after its linked CLI dry run. `supabase db push --linked --yes` succeeded on 20 November 2026. Remote migration history contains all seven versions. The rollback-only checks passed again against the applied schema, and the updated JavaScript Edge Function was deployed successfully. No remote reset was used.
