-- Connection grace is separate from game versions and ordinary turn timing.
create table galactic_private.connection_leases (
  game_id uuid not null,
  player_id uuid not null,
  session_id uuid not null,
  status text not null default 'online' check (status in ('online','left')),
  last_seen timestamptz not null default now(),
  primary key (game_id, player_id, session_id),
  foreign key (game_id, player_id) references public.game_players(game_id, player_id)
);
alter table galactic_private.connection_leases enable row level security;
revoke all on galactic_private.connection_leases from public, anon, authenticated;
create index connection_leases_seen on galactic_private.connection_leases(game_id, player_id, last_seen desc);

create function public.galactic_connections(p_game uuid) returns jsonb
language sql security definer set search_path=public,galactic_private,pg_temp as $$
  select coalesce(jsonb_object_agg(p.player_id::text,
    jsonb_build_object(
      'status', case when live.player_id is not null or (latest.player_id is null and g.started_at>now()-interval '30 seconds') then 'online' when latest.status='left' then 'left' else 'disconnected' end,
      'lastSeen', floor(extract(epoch from coalesce(latest.last_seen,g.started_at))*1000),
      'deadline', case when live.player_id is not null or (latest.player_id is null and g.started_at>now()-interval '30 seconds') then null else
        floor(extract(epoch from (coalesce(latest.last_seen,g.started_at) +
          case when latest.status='left' then interval '2 minutes' else interval '5 minutes 30 seconds' end))*1000) end
    )), '{}'::jsonb)
  from game_players p join games g on g.id=p.game_id
  left join lateral (select l.* from connection_leases l where l.game_id=p.game_id and l.player_id=p.player_id order by l.last_seen desc limit 1) latest on true
  left join lateral (select l.player_id from connection_leases l where l.game_id=p.game_id and l.player_id=p.player_id and l.status='online' and l.last_seen>now()-interval '30 seconds' limit 1) live on true
  where p.game_id=p_game and not p.is_ai and not p.bankrupt
$$;

create function public.galactic_connection(p_game uuid,p_user uuid,p_session uuid,p_status text default 'online') returns jsonb
language plpgsql security definer set search_path=public,galactic_private,pg_temp as $$
begin
  if p_status not in ('online','left') then raise exception 'Invalid connection status.';end if;
  if not exists(select 1 from game_players where game_id=p_game and user_id=p_user and player_id=p_user and not is_ai) then raise exception 'Match membership required.';end if;
  perform pg_advisory_xact_lock(hashtextextended('galactic-connection:'||p_game::text,0));
  insert into connection_leases(game_id,player_id,session_id,status,last_seen)
    values(p_game,p_user,p_session,p_status,now())
    on conflict(game_id,player_id,session_id) do update set status=excluded.status,last_seen=excluded.last_seen;
  return public.galactic_connections(p_game);
end$$;

-- Serialize reconnects with automatic actions so a returned player keeps control.
alter function public.galactic_commit(uuid,jsonb,integer,jsonb,jsonb) rename to galactic_commit_core;
create function public.galactic_commit(p_game uuid,p_action jsonb,p_expected integer,p_state jsonb,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path=public,galactic_private,pg_temp as $$
declare c jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('galactic-connection:'||p_game::text,0));
  if coalesce((p_action->>'connectionTimeout')::boolean,false) then
    c:=public.galactic_connections(p_game)->(p_action->>'player');
    if c is null or c->>'status'='online' or (c->>'deadline')::numeric>extract(epoch from now())*1000 then
      return (select snapshot from game_state where game_id=p_game);
    end if;
  end if;
  return public.galactic_commit_core(p_game,p_action,p_expected,p_state,p_snapshot);
end$$;

revoke all on function public.galactic_connections(uuid) from public,anon,authenticated;
revoke all on function public.galactic_connection(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.galactic_commit(uuid,jsonb,integer,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.galactic_commit_core(uuid,jsonb,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.galactic_connections(uuid) to service_role;
grant execute on function public.galactic_connection(uuid,uuid,uuid,text) to service_role;
grant execute on function public.galactic_commit(uuid,jsonb,integer,jsonb,jsonb) to service_role;
grant execute on function public.galactic_commit_core(uuid,jsonb,integer,jsonb,jsonb) to service_role;
