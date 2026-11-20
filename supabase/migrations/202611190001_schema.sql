-- Additive game schema. Stop on any name conflict; do not overwrite another application.
create schema galactic_private;

revoke all on schema galactic_private
from
  public,
  anon,
  authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Commander' check (length(display_name) between 1 and 24),
  avatar_path text,
  character text not null default 'luke',
  faction text not null default 'Rebel Alliance',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  preferences jsonb not null default '{}' check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id),
  recipient_id uuid not null references profiles (id),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create unique index pending_friend_pair on friend_requests (sender_id, recipient_id)
where
  status = 'pending';

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  friend_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.blocked_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  blocked_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, blocked_id),
  check (user_id <> blocked_id)
);

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (length(name) between 1 and 50),
  host_id uuid not null references profiles (id),
  is_private boolean not null default false,
  max_players smallint not null default 8 check (max_players between 2 and 8),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'closed')),
  created_at timestamptz not null default now()
);

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms (id) on delete cascade,
  user_id uuid not null references profiles (id),
  display_name text not null,
  character text not null default 'luke',
  faction text not null default 'Rebel Alliance',
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.room_settings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references game_rooms (id) on delete cascade,
  rules jsonb not null default '{}' check (jsonb_typeof(rules) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  recipient_id uuid not null references profiles (id),
  expires_at timestamptz not null default now() + interval '1 day',
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references game_rooms (id),
  status text not null default 'active' check (status in ('active', 'finished')),
  rules jsonb not null check (jsonb_typeof(rules) = 'object'),
  winner_id uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.game_players (
  id uuid not null default gen_random_uuid() unique,
  game_id uuid not null references games (id),
  player_id uuid not null,
  user_id uuid references profiles (id),
  display_name text not null,
  character text not null,
  faction text not null,
  color text not null,
  is_ai boolean not null default false,
  team text,
  position smallint not null default 0 check (position between 0 and 39),
  detained boolean not null default false,
  bankrupt boolean not null default false,
  turn_order smallint not null check (turn_order between 0 and 7),
  primary key (game_id, player_id),
  unique (game_id, turn_order),
  check (
    is_ai
    or user_id is not null
  )
);

create table public.game_state (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references games (id),
  version integer not null default 0 check (version >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now()
);

create table galactic_private.engine_state (
  game_id uuid primary key references public.games (id),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table galactic_private.actions (
  id uuid primary key,
  game_id uuid not null references public.games (id),
  actor_id uuid not null,
  action_type text not null,
  payload jsonb not null,
  version integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, version)
);

create table galactic_private.rate_limits (
  user_id uuid primary key,
  window_start timestamptz not null,
  hits integer not null default 1
);

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  event_key text not null,
  event_type text not null,
  description text not null,
  round integer not null,
  version integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, event_key)
);

create table public.turn_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  player_id uuid not null,
  sequence integer not null,
  round integer not null,
  dice smallint[] not null check (array_length(dice, 1) = 2),
  position smallint not null check (position between 0 and 39),
  credits integer not null check (credits >= 0),
  created_at timestamptz not null default now(),
  unique (game_id, sequence),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  user_id uuid not null references profiles (id),
  won boolean not null,
  final_wealth integer not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table public.player_wallets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  player_id uuid not null,
  credits integer not null check (credits >= 0),
  updated_at timestamptz not null default now(),
  unique (game_id, player_id),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  player_id uuid not null,
  action_id uuid not null,
  delta integer not null,
  balance integer not null check (balance >= 0),
  kind text not null,
  created_at timestamptz not null default now(),
  unique (action_id, player_id),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  board_index smallint not null unique check (board_index between 0 and 39),
  name text not null,
  kind text not null check (kind in ('property', 'transport', 'utility')),
  color_group text,
  description text,
  price integer not null check (price > 0),
  rent_schedule integer[],
  mortgage_value integer not null check (mortgage_value > 0),
  development_cost integer check (development_cost >= 0),
  source_url text,
  artwork_path text
);

create table public.property_ownership (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  property_id uuid not null references properties (id),
  player_id uuid not null,
  acquired_at timestamptz not null default now(),
  unique (game_id, property_id),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.property_development (
  id uuid primary key default gen_random_uuid(),
  ownership_id uuid not null unique references property_ownership (id) on delete cascade,
  game_id uuid not null references games (id),
  level smallint not null default 0 check (level between 0 and 5),
  updated_at timestamptz not null default now()
);

create table public.mortgages (
  id uuid primary key default gen_random_uuid(),
  ownership_id uuid not null unique references property_ownership (id) on delete cascade,
  game_id uuid not null references games (id),
  principal integer not null check (principal > 0),
  interest numeric not null check (interest between 0 and 1),
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key,
  game_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  cash_offered integer not null check (cash_offered >= 0),
  cash_requested integer not null check (cash_requested >= 0),
  status text not null check (
    status in (
      'pending',
      'accepted',
      'declined',
      'cancelled',
      'countered',
      'expired'
    )
  ),
  expires_round integer not null,
  created_at timestamptz not null default now(),
  foreign key (game_id, sender_id) references game_players (game_id, player_id),
  foreign key (game_id, recipient_id) references game_players (game_id, player_id),
  check (sender_id <> recipient_id)
);

create table public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades (id) on delete cascade,
  direction text not null check (direction in ('give', 'take')),
  property_id uuid references properties (id),
  card_key text,
  check ((property_id is null) <> (card_key is null))
);

create table public.trade_history (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  trade_id uuid not null unique references trades (id),
  completed_round integer not null,
  created_at timestamptz not null default now()
);

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  property_id uuid not null references properties (id),
  starting_version integer not null,
  current_bid integer not null default 0 check (current_bid >= 0),
  bidder_id uuid,
  status text not null default 'open' check (status in ('open', 'closed')),
  deadline timestamptz,
  unique (game_id, starting_version)
);

create table public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  auction_id uuid not null references auctions (id),
  player_id uuid not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.card_decks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('force', 'galactic')),
  title text not null
);

create table public.card_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  deck_id uuid not null references card_decks (id),
  title text not null,
  description text not null,
  effect_type text not null,
  effect_value integer,
  target text,
  retainable boolean not null default false,
  artwork_path text
);

create table public.player_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  player_id uuid not null,
  card_id uuid not null references card_definitions (id),
  unique (game_id, card_id),
  foreign key (game_id, player_id) references game_players (game_id, player_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id),
  sender_id uuid not null references profiles (id),
  team text,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create table public.player_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id),
  reported_id uuid not null references profiles (id),
  game_id uuid references games (id),
  reason text not null check (length(reason) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.player_statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id),
  matches integer not null default 0 check (matches >= 0),
  wins integer not null default 0 check (wins >= 0),
  total_wealth bigint not null default 0 check (total_wealth >= 0),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null
);

create table public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  achievement_id uuid not null references achievements (id),
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.cosmetic_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  kind text not null check (
    kind in ('token', 'board', 'decoration', 'avatar')
  ),
  unlock_achievement uuid references achievements (id),
  asset_path text
);

create table public.player_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  cosmetic_id uuid not null references cosmetic_items (id),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, cosmetic_id)
);

create index room_players_user on room_players (user_id);

create index rooms_waiting on game_rooms (status, is_private, created_at desc);

create index game_players_user on game_players (user_id, game_id);

create index game_events_latest on game_events (game_id, created_at desc);

create index chat_latest on chat_messages (game_id, created_at desc);

create index wallet_player on player_wallets (player_id);

create index ownership_player on property_ownership (game_id, player_id);

create index friendship_friend on friendships (friend_id);

create index friend_request_recipient on friend_requests (recipient_id, status);

create index transaction_game on transactions (game_id, created_at);

create index trades_game on trades (game_id, status);

create index bids_auction on auction_bids (auction_id, created_at);

create index match_user on match_history (user_id, created_at desc);

create function public.galactic_room_member (r uuid) returns boolean language sql stable security definer
set
  search_path = public,
  pg_temp as $$
select
  exists (
    select
      1
    from
      room_players
    where
      room_id = r
      and user_id = auth.uid ()
  )
$$;

create function public.galactic_game_member (g uuid) returns boolean language sql stable security definer
set
  search_path = public,
  pg_temp as $$
select
  exists (
    select
      1
    from
      game_players
    where
      game_id = g
      and user_id = auth.uid ()
  )
$$;

create function public.galactic_profile_created () returns trigger language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
insert into
  profiles (id)
values
  (new.id);

insert into
  player_statistics (user_id)
values
  (new.id);

insert into
  player_settings (user_id)
values
  (new.id);

return new;

end
$$;

create trigger galactic_auth_profile
after insert on auth.users for each row
execute function galactic_profile_created ();

revoke all on function galactic_profile_created ()
from
  public,
  anon,
  authenticated;

revoke all on function galactic_room_member (uuid),
galactic_game_member (uuid)
from
  public,
  anon;

grant
execute on function galactic_room_member (uuid),
galactic_game_member (uuid) to authenticated;

-- Default deny every table. Game state, economy, and progression writes belong only to trusted RPCs.
do $$
declare t text;

begin for t in
select
  tablename
from
  pg_tables
where
  schemaname = 'public'
  and tablename in (
    'profiles',
    'player_settings',
    'friend_requests',
    'friendships',
    'blocked_players',
    'game_rooms',
    'room_players',
    'room_settings',
    'room_invitations',
    'games',
    'game_players',
    'game_state',
    'game_events',
    'turn_history',
    'match_history',
    'player_wallets',
    'transactions',
    'properties',
    'property_ownership',
    'property_development',
    'mortgages',
    'trades',
    'trade_items',
    'trade_history',
    'auctions',
    'auction_bids',
    'card_decks',
    'card_definitions',
    'player_cards',
    'chat_messages',
    'player_reports',
    'player_statistics',
    'achievements',
    'player_achievements',
    'cosmetic_items',
    'player_cosmetics'
  ) loop
execute format(
  'alter table public.%I enable row level security',
  t
);

end loop;

end
$$;

create policy profile_read on profiles for
select
  to authenticated using (true);

create policy profile_edit on profiles
for update
  to authenticated using (id = auth.uid ())
with
  check (id = auth.uid ());

create policy settings_own on player_settings for all to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy rooms_visible on game_rooms for
select
  to authenticated using (
    (
      not is_private
      and status = 'waiting'
    )
    or galactic_room_member (id)
  );

create policy room_members on room_players for
select
  to authenticated using (galactic_room_member (room_id));

create policy room_rules on room_settings for
select
  to authenticated using (galactic_room_member (room_id));

create policy invitations_recipient on room_invitations for
select
  to authenticated using (
    recipient_id = auth.uid ()
    or sender_id = auth.uid ()
  );

create policy game_visible on games for
select
  to authenticated using (galactic_game_member (id));

do $$
declare t text;

begin foreach t in array array[
  'game_players',
  'game_state',
  'game_events',
  'turn_history',
  'player_wallets',
  'transactions',
  'property_ownership',
  'property_development',
  'mortgages',
  'trades',
  'trade_history',
  'auctions',
  'auction_bids',
  'player_cards'
] loop
execute format(
  'create policy member_read on public.%I for select to authenticated using(public.galactic_game_member(game_id))',
  t
);

end loop;

end
$$;

create policy trade_items_read on trade_items for
select
  to authenticated using (
    exists (
      select
        1
      from
        trades t
      where
        t.id = trade_id
        and galactic_game_member (t.game_id)
    )
  );

create policy chat_read on chat_messages for
select
  to authenticated using (
    galactic_game_member (game_id)
    and (
      team is null
      or exists (
        select
          1
        from
          game_players p
        where
          p.game_id = chat_messages.game_id
          and p.user_id = auth.uid ()
          and p.team = chat_messages.team
      )
    )
    and not exists (
      select
        1
      from
        blocked_players b
      where
        b.user_id = auth.uid ()
        and b.blocked_id = sender_id
    )
  );

create policy match_own on match_history for
select
  to authenticated using (user_id = auth.uid ());

create policy blocks_own on blocked_players for all to authenticated using (user_id = auth.uid ())
with
  check (user_id = auth.uid ());

create policy friends_own on friendships for
select
  to authenticated using (
    user_id = auth.uid ()
    or friend_id = auth.uid ()
  );

create policy requests_read on friend_requests for
select
  to authenticated using (
    sender_id = auth.uid ()
    or recipient_id = auth.uid ()
  );

create policy requests_send on friend_requests for insert to authenticated
with
  check (
    sender_id = auth.uid ()
    and status = 'pending'
  );

create policy reports_send on player_reports for insert to authenticated
with
  check (
    reporter_id = auth.uid ()
    and status = 'open'
  );

create policy reports_own on player_reports for
select
  to authenticated using (reporter_id = auth.uid ());

do $$
declare t text;

begin foreach t in array array[
  'properties',
  'card_decks',
  'card_definitions',
  'achievements',
  'cosmetic_items',
  'player_statistics'
] loop
execute format(
  'create policy catalog_read on public.%I for select to authenticated using(true)',
  t
);

end loop;

foreach t in array array['player_achievements', 'player_cosmetics'] loop
execute format(
  'create policy own_read on public.%I for select to authenticated using(user_id=auth.uid())',
  t
);

end loop;

end
$$;

grant usage on schema public to authenticated,
service_role;

grant
select
  on all tables in schema public to authenticated;

grant all on all tables in schema public to service_role;

grant
update on profiles to authenticated;

grant insert,
update,
delete on player_settings,
blocked_players to authenticated;

grant insert on friend_requests,
player_reports to authenticated;

grant usage on schema galactic_private to service_role;

grant all on all tables in schema galactic_private to service_role;

alter publication supabase_realtime
add table game_rooms,
room_players,
game_state,
chat_messages,
trades,
auctions;

create policy galactic_private_realtime on realtime.messages for
select
  to authenticated using (
    realtime.topic () ~ '^game:[0-9a-f-]{36}$'
    and galactic_game_member (
      substring(
        realtime.topic ()
        from
          6
      )::uuid
    )
  );

create policy galactic_presence_write on realtime.messages for insert to authenticated
with
  check (
    extension = 'presence'
    and realtime.topic () ~ '^game:[0-9a-f-]{36}$'
    and galactic_game_member (
      substring(
        realtime.topic ()
        from
          6
      )::uuid
    )
  );

insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'player-avatars',
    'player-avatars',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'game-cosmetics',
    'game-cosmetics',
    true,
    5242880,
    array['image/svg+xml', 'image/png', 'image/webp']
  ),
  (
    'board-themes',
    'board-themes',
    true,
    5242880,
    array['image/svg+xml', 'image/png', 'image/webp']
  ),
  (
    'profile-decorations',
    'profile-decorations',
    false,
    5242880,
    array['image/png', 'image/webp']
  );

create policy avatar_read on storage.objects for
select
  to authenticated using (
    bucket_id = 'player-avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

create policy avatar_upload on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'player-avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

create policy avatar_edit on storage.objects
for update
  to authenticated using (
    bucket_id = 'player-avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  )
with
  check (
    bucket_id = 'player-avatars'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

create policy decoration_read on storage.objects for
select
  to authenticated using (
    bucket_id = 'profile-decorations'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );
