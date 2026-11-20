-- Read-only spectators and strict reconnect deadlines. Existing match history is retained.
create table public.game_spectators (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.game_spectators enable row level security;

revoke all on public.game_spectators
from
  public,
  anon,
  authenticated;

grant
select
  on public.game_spectators to authenticated;

create policy own_spectator_access on public.game_spectators for
select
  to authenticated using (user_id = auth.uid ());

create function public.galactic_game_viewer (g uuid) returns boolean language sql stable security definer
set
  search_path = public,
  pg_temp as $$
select
  public.galactic_game_member (g)
  or exists (
    select
      1
    from
      public.game_spectators
    where
      game_id = g
      and user_id = auth.uid ()
  )
$$;

revoke all on function public.galactic_game_viewer (uuid)
from
  public,
  anon;

grant
execute on function public.galactic_game_viewer (uuid) to authenticated;

create policy spectator_game_read on public.games for
select
  to authenticated using (public.galactic_game_viewer (id));

create policy spectator_snapshot_read on public.game_state for
select
  to authenticated using (public.galactic_game_viewer (game_id));

create policy public_playing_rooms on public.game_rooms for
select
  to authenticated using (
    not is_private
    and status = 'playing'
  );

create policy spectator_realtime_read on realtime.messages for
select
  to authenticated using (
    realtime.topic () ~ '^game:[0-9a-f-]{36}$'
    and public.galactic_game_viewer (
      substring(
        realtime.topic ()
        from
          6
      )::uuid
    )
  );

create function public.galactic_watch_room (p_user uuid, p_code text) returns jsonb language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare r public.game_rooms;

g uuid;

begin
select
  * into r
from
  public.game_rooms
where
  code = p_code
for update;

if r.id is null then raise exception 'Room not found.';

end if;

if r.status = 'waiting' then raise exception 'This room is still accepting players.';

end if;

if exists (
  select
    1
  from
    public.blocked_players
  where
    (
      user_id = r.host_id
      and blocked_id = p_user
    )
    or (
      user_id = p_user
      and blocked_id = r.host_id
    )
) then raise exception 'Room is unavailable.';

end if;

select
  id into g
from
  public.games
where
  room_id = r.id;

if g is null then raise exception 'Match not found.';

end if;

insert into
  public.game_spectators (game_id, user_id)
values
  (g, p_user)
on conflict do nothing;

return jsonb_build_object(
  'room',
  to_jsonb(r),
  'players',
  (
    select
      coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    from
      public.room_players p
    where
      room_id = r.id
  ),
  'game',
  g,
  'rules',
  (
    select
      rules
    from
      public.room_settings
    where
      room_id = r.id
  ),
  'role',
  'spectator'
);

end
$$;

revoke all on function public.galactic_watch_room (uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_watch_room (uuid, text) to service_role;

alter function public.galactic_connection (uuid, uuid, uuid, text)
rename to galactic_connection_core;

create function public.galactic_connection (
  p_game uuid,
  p_user uuid,
  p_session uuid,
  p_status text default 'online'
) returns jsonb language plpgsql security definer
set
  search_path = public,
  galactic_private,
  pg_temp as $$
declare c jsonb;

finished boolean;

begin perform pg_advisory_xact_lock(
  hashtextextended ('galactic-connection:' || p_game::text, 0)
);

if not exists (
  select
    1
  from
    public.game_players
  where
    game_id = p_game
    and user_id = p_user
    and player_id = p_user
    and not is_ai
    and not bankrupt
) then raise exception 'An active player seat is required.';

end if;

select
  status = 'finished' into finished
from
  public.games
where
  id = p_game;

c := public.galactic_connections (p_game) -> p_user::text;

if not finished
and c ->> 'status' <> 'online'
and (c ->> 'deadline')::numeric <= extract(
  epoch
  from
    now()
) * 1000 then raise exception 'Rejoin period expired. You may spectate.';

end if;

if p_status = 'left'
and c ->> 'status' = 'left' then return public.galactic_connections (p_game);

end if;

return public.galactic_connection_core (p_game, p_user, p_session, p_status);

end
$$;

revoke all on function public.galactic_connection (uuid, uuid, uuid, text),
public.galactic_connection_core (uuid, uuid, uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_connection (uuid, uuid, uuid, text) to service_role;

-- One lock protects the complete expiration batch from a concurrent reconnect.
create or replace function public.galactic_commit (
  p_game uuid,
  p_action jsonb,
  p_expected integer,
  p_state jsonb,
  p_snapshot jsonb
) returns jsonb language plpgsql security definer
set
  search_path = public,
  galactic_private,
  pg_temp as $$
declare c jsonb;

player text;

ids jsonb;

begin perform pg_advisory_xact_lock(
  hashtextextended ('galactic-connection:' || p_game::text, 0)
);

if coalesce(
  (p_action ->> 'connectionTimeout')::boolean,
  false
) then if p_action ->> 'type' <> 'FORFEIT' then raise exception 'Expired seats must forfeit, not become AI.';

end if;

ids := coalesce(
  p_action -> 'payload' -> 'players',
  jsonb_build_array(p_action ->> 'player')
);

if jsonb_typeof(ids) <> 'array'
or jsonb_array_length(ids) < 1
or jsonb_array_length(ids) > 8 then raise exception 'Invalid expiration batch.';

end if;

for player in
select
  jsonb_array_elements_text(ids) loop c := public.galactic_connections (p_game) -> player;

if c is null
or c ->> 'status' = 'online'
or (c ->> 'deadline')::numeric > extract(
  epoch
  from
    now()
) * 1000 then return (
  select
    snapshot
  from
    public.game_state
  where
    game_id = p_game
);

end if;

end loop;

end if;

return public.galactic_commit_core (p_game, p_action, p_expected, p_state, p_snapshot);

end
$$;

revoke all on function public.galactic_commit (uuid, jsonb, integer, jsonb, jsonb)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_commit (uuid, jsonb, integer, jsonb, jsonb) to service_role;

-- Configure a newly created room in the same transaction, including its map and tax basis.
create function public.galactic_create_configured_room (
  p_user uuid,
  p_code text,
  p_name text,
  p_private boolean,
  p_profile jsonb,
  p_rules jsonb,
  p_max integer
) returns jsonb language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare created jsonb;

rid uuid;

begin created := public.galactic_create_room (p_user, p_code, p_name, p_private, p_profile);

rid := (created -> 'room' ->> 'id')::uuid;

perform public.galactic_configure_room (rid, p_user, p_rules, p_max);

return jsonb_build_object(
  'room',
  (
    select
      to_jsonb(r)
    from
      public.game_rooms r
    where
      id = rid
  ),
  'players',
  created -> 'players',
  'rules',
  p_rules
);

end
$$;

revoke all on function public.galactic_create_configured_room (uuid, text, text, boolean, jsonb, jsonb, integer)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_create_configured_room (uuid, text, text, boolean, jsonb, jsonb, integer) to service_role;

alter table public.game_rooms
add column next_room_id uuid references public.game_rooms (id);

create function public.galactic_next_room (
  p_game uuid,
  p_user uuid,
  p_code text,
  p_profile jsonb
) returns jsonb language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare previous public.game_rooms;

created jsonb;

next_id uuid;

config jsonb;

begin if not exists (
  select
    1
  from
    public.games
  where
    id = p_game
    and status = 'finished'
) then raise exception 'Wait for the current match to finish.';

end if;

if not exists (
  select
    1
  from
    public.game_players
  where
    game_id = p_game
    and user_id = p_user
)
and not exists (
  select
    1
  from
    public.game_spectators
  where
    game_id = p_game
    and user_id = p_user
) then raise exception 'Match access required.';

end if;

select
  r.* into previous
from
  public.game_rooms r
  join public.games g on g.room_id = r.id
where
  g.id = p_game
for update of
  r;

if previous.next_room_id is null then
select
  rules into config
from
  public.room_settings
where
  room_id = previous.id;

created := public.galactic_create_configured_room (
  p_user,
  p_code,
  previous.name,
  previous.is_private,
  p_profile,
  config,
  previous.max_players
);

next_id := (created -> 'room' ->> 'id')::uuid;

update public.game_rooms
set
  next_room_id = next_id
where
  id = previous.id;

return created;

end if;

select
  code into p_code
from
  public.game_rooms
where
  id = previous.next_room_id;

if (
  select
    status
  from
    public.game_rooms
  where
    id = previous.next_room_id
) <> 'waiting' then raise exception 'The next match already started. Join its room to spectate.';

end if;

return public.galactic_join_room (p_user, p_code, p_profile);

end
$$;

revoke all on function public.galactic_next_room (uuid, uuid, text, jsonb)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_next_room (uuid, uuid, text, jsonb) to service_role;
