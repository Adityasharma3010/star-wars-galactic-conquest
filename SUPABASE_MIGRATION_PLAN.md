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

## Follow-up migration ready for approval

The first three migrations are applied. The dry run for `202611190004_lobby_transactions.sql` passed on 19 November 2026.

The fourth migration serializes character readiness, friend acceptance, host changes and lobby rule edits; syncs room callsigns to profiles; maintains auction deadlines; awards team results correctly; and enables global chat with the same blocking controls. It introduces service-only functions and triggers. It relaxes the chat match reference to allow a global channel, replacing only this application's named chat read policy while preserving team and member restrictions. No data is deleted and no unrelated object is changed. Source: `supabase/migrations/202611190004_lobby_transactions.sql`.

After approval: apply this migration, redeploy the JavaScript Edge Function, and verify readiness races, social transactions, RLS and real online play.
