-- Waiting-room callsigns are changed under the same lock as match start.
create function public.galactic_set_callsign (p_room uuid, p_user uuid, p_profile jsonb) returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
declare r game_rooms;

n text := trim(coalesce(p_profile ->> 'name', ''));

begin
select
  * into r
from
  game_rooms
where
  id = p_room
for update;

if r.id is null
or r.status <> 'waiting' then raise exception 'Names can be changed in a waiting room.';

end if;

if length(n) not between 1 and 24 then raise exception 'Choose a callsign of 1–24 characters.';

end if;

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

update room_players
set
  display_name = n,
  character = p_profile ->> 'character',
  faction = p_profile ->> 'faction',
  is_ready = false
where
  room_id = p_room
  and user_id = p_user;

end
$$;

-- Reject a stale roster if a name/character/faction changed during start.
alter function public.galactic_start_match (uuid, uuid, jsonb, jsonb)
rename to galactic_start_match_core;

create function public.galactic_start_match (
  p_room uuid,
  p_actor uuid,
  p_state jsonb,
  p_snapshot jsonb
) returns jsonb language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin perform 1
from
  game_rooms
where
  id = p_room
for update;

if exists (
  select
    1
  from
    room_players rp
    left join lateral (
      select
        value
      from
        jsonb_array_elements(p_state -> 'players')
      where
        value ->> 'id' = rp.user_id::text
        and not coalesce((value ->> 'ai')::boolean, false)
    ) p on true
  where
    rp.room_id = p_room
    and (
      p.value is null
      or p.value ->> 'name' is distinct from rp.display_name
      or p.value ->> 'character' is distinct from rp.character
      or p.value ->> 'faction' is distinct from rp.faction
    )
) then raise exception 'Room roster changed. Refresh and start again.';

end if;

return public.galactic_start_match_core (p_room, p_actor, p_state, p_snapshot);

end
$$;

revoke all on function public.galactic_set_callsign (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated;

revoke all on function public.galactic_start_match (uuid, uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated;

revoke all on function public.galactic_start_match_core (uuid, uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated;

grant
execute on function public.galactic_set_callsign (uuid, uuid, jsonb) to service_role;

grant
execute on function public.galactic_start_match (uuid, uuid, jsonb, jsonb) to service_role;

grant
execute on function public.galactic_start_match_core (uuid, uuid, jsonb, jsonb) to service_role;
