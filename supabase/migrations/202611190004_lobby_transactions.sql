-- Follow-up hardening of the approved game schema: serialize readiness and social acceptance.
create function public.galactic_ready (p_room uuid, p_user uuid, p_character text) returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare r game_rooms;

p room_players;

duplicates boolean;

begin
select
  * into r
from
  game_rooms
where
  id = p_room
for update;

if r.status <> 'waiting' then raise exception 'Match already started.';

end if;

select
  * into p
from
  room_players
where
  room_id = p_room
  and user_id = p_user;

if p.id is null then raise exception 'Room membership required.';

end if;

select
  coalesce((rules ->> 'duplicateCharacters')::boolean, false) into duplicates
from
  room_settings
where
  room_id = p_room;

if not p.is_ready
and not duplicates
and exists (
  select
    1
  from
    room_players
  where
    room_id = p_room
    and user_id <> p_user
    and is_ready
    and character = p_character
) then raise exception 'Character already selected by another commander.';

end if;

update room_players
set
  is_ready = not p.is_ready,
  character = p_character
where
  id = p.id;

end
$$;

create function public.galactic_friend_response (p_request uuid, p_user uuid, p_accept boolean) returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare f friend_requests;

begin
select
  * into f
from
  friend_requests
where
  id = p_request
for update;

if f.recipient_id <> p_user
or f.status <> 'pending'
or f.id is null then raise exception 'Request is unavailable.';

end if;

update friend_requests
set
  status = case
    when p_accept then 'accepted'
    else 'declined'
  end
where
  id = p_request;

if p_accept then
insert into
  friendships (user_id, friend_id)
values
  (p_user, f.sender_id),
  (f.sender_id, p_user)
on conflict (user_id, friend_id) do nothing;

end if;

end
$$;

revoke all on function galactic_ready (uuid, uuid, text),
galactic_friend_response (uuid, uuid, boolean)
from
  public,
  anon,
  authenticated;

grant
execute on function galactic_ready (uuid, uuid, text),
galactic_friend_response (uuid, uuid, boolean) to service_role;

-- Keep the persistent profile aligned with the callsign selected on room entry.
create function public.galactic_room_profile () returns trigger language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
update profiles
set
  display_name = new.display_name,
  character = new.character,
  faction = new.faction,
  updated_at = now()
where
  id = new.user_id;

return new;

end
$$;

create trigger galactic_room_profile_sync
after insert or update of character,
display_name,
faction on room_players for each row
execute function galactic_room_profile ();

revoke all on function galactic_room_profile ()
from
  public,
  anon,
  authenticated;

create function public.galactic_configure_room (
  p_room uuid,
  p_user uuid,
  p_rules jsonb,
  p_max integer
) returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare r game_rooms;

begin
select
  * into r
from
  game_rooms
where
  id = p_room
for update;

if r.id is null
or r.host_id <> p_user
or r.status <> 'waiting' then raise exception 'Only the host can configure a waiting room.';

end if;

if p_max not between 2 and 8
or p_max < (
  select
    count(*)
  from
    room_players
  where
    room_id = p_room
) then raise exception 'Invalid player capacity.';

end if;

update room_settings
set
  rules = p_rules,
  updated_at = now()
where
  room_id = p_room;

update game_rooms
set
  max_players = p_max
where
  id = p_room;

update room_players
set
  is_ready = false
where
  room_id = p_room;

end
$$;

create function public.galactic_leave_room (p_room uuid, p_user uuid) returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare r game_rooms;

next_host uuid;

begin
select
  * into r
from
  game_rooms
where
  id = p_room
for update;

if not exists (
  select
    1
  from
    room_players
  where
    room_id = p_room
    and user_id = p_user
) then raise exception 'Room membership required.';

end if;

if r.status = 'playing' then return;

end if;

delete from room_players
where
  room_id = p_room
  and user_id = p_user;

if r.host_id = p_user then
select
  user_id into next_host
from
  room_players
where
  room_id = p_room
order by
  joined_at
limit
  1;

if next_host is null then
update game_rooms
set
  status = 'closed'
where
  id = p_room;

else
update game_rooms
set
  host_id = next_host
where
  id = p_room;

end if;

end if;

end
$$;

revoke all on function galactic_configure_room (uuid, uuid, jsonb, integer),
galactic_leave_room (uuid, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function galactic_configure_room (uuid, uuid, jsonb, integer),
galactic_leave_room (uuid, uuid) to service_role;

-- A null match identifies the moderated global channel. Team and member restrictions remain.
alter table public.chat_messages
alter column game_id
drop not null;

drop policy chat_read on public.chat_messages;

create policy chat_read on public.chat_messages for
select
  to authenticated using (
    (
      game_id is null
      or galactic_game_member (game_id)
    )
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

alter table public.chat_messages
add constraint global_chat_no_team check (
  game_id is not null
  or team is null
);

create index global_chat_latest on public.chat_messages (created_at desc)
where
  game_id is null;

-- Final team results and progression are derived from the committed private engine state.
create function public.galactic_progression () returns trigger language plpgsql security definer
set
  search_path = public,
  galactic_private,
  pg_temp as $$
declare s jsonb;

p jsonb;

victories integer;

begin
select
  state into s
from
  galactic_private.engine_state
where
  game_id = new.game_id;

select
  value into p
from
  jsonb_array_elements(s -> 'players')
where
  value ->> 'id' = new.user_id::text;

if coalesce((s -> 'rules' ->> 'teams')::boolean, false)
and s ->> 'winningTeam' is not null then
update match_history
set
  won = (p ->> 'team' = s ->> 'winningTeam')
where
  id = new.id;

end if;

select
  count(*) into victories
from
  match_history
where
  user_id = new.user_id
  and won;

update player_statistics
set
  wins = victories
where
  user_id = new.user_id;

if victories > 0 then
insert into
  player_achievements (user_id, achievement_id)
select
  new.user_id,
  id
from
  achievements
where
  key = 'first-victory'
on conflict do nothing;

end if;

insert into
  player_achievements (user_id, achievement_id)
select
  new.user_id,
  id
from
  achievements
where
  key = 'first-match'
on conflict do nothing;

return new;

end
$$;

create constraint trigger galactic_match_progression
after insert on match_history
deferrable initially deferred for each row
execute function galactic_progression ();

revoke all on function galactic_progression ()
from
  public,
  anon,
  authenticated;

-- Match commits can extend the auction countdown after a bid.
create function public.galactic_auction_deadline () returns trigger language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin if new.snapshot -> 'auction' <> 'null'::jsonb then
update auctions
set
  deadline = to_timestamp(
    (new.snapshot -> 'auction' ->> 'deadline')::numeric / 1000
  )
where
  game_id = new.game_id
  and status = 'open';

end if;

return new;

end
$$;

create trigger galactic_auction_clock
after update on game_state for each row
execute function galactic_auction_deadline ();

revoke all on function galactic_auction_deadline ()
from
  public,
  anon,
  authenticated;
