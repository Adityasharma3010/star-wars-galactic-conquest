create function public.galactic_rate_limit(p_user uuid) returns void language plpgsql security definer set search_path=public,galactic_private,pg_temp as $$declare r galactic_private.rate_limits;begin
 insert into galactic_private.rate_limits(user_id,window_start,hits) values(p_user,now(),1) on conflict(user_id) do update set hits=case when rate_limits.window_start<now()-interval '1 minute' then 1 else rate_limits.hits+1 end,window_start=case when rate_limits.window_start<now()-interval '1 minute' then now() else rate_limits.window_start end returning * into r;
 if r.hits>100 then raise exception 'Too many requests. Please wait.';end if;
end$$;
create function public.galactic_create_room(p_user uuid,p_code text,p_name text,p_private boolean,p_profile jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare r game_rooms;begin
 insert into game_rooms(code,name,host_id,is_private) values(p_code,p_name,p_user,p_private) returning * into r;
 insert into room_settings(room_id) values(r.id);
 insert into room_players(room_id,user_id,display_name,character,faction) values(r.id,p_user,p_profile->>'name',p_profile->>'character',p_profile->>'faction');
 return jsonb_build_object('room',to_jsonb(r),'players',(select jsonb_agg(to_jsonb(p)) from room_players p where room_id=r.id));
end$$;
create function public.galactic_join_room(p_user uuid,p_code text,p_profile jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare r game_rooms;begin
 select * into r from game_rooms where code=p_code for update;
 if r.id is null then raise exception 'Room not found.';end if;
 if exists(select 1 from blocked_players b where (b.user_id=r.host_id and b.blocked_id=p_user) or (b.user_id=p_user and b.blocked_id=r.host_id)) then raise exception 'Room is unavailable.';end if;
 if exists(select 1 from room_players where room_id=r.id and user_id=p_user) then return jsonb_build_object('room',to_jsonb(r),'players',(select jsonb_agg(to_jsonb(p)) from room_players p where room_id=r.id));end if;
 if r.status<>'waiting' then raise exception 'This match has already started.';end if;
 if (select count(*) from room_players where room_id=r.id)>=r.max_players then raise exception 'Room is full.';end if;
 insert into room_players(room_id,user_id,display_name,character,faction) values(r.id,p_user,p_profile->>'name',p_profile->>'character',p_profile->>'faction');
 return jsonb_build_object('room',to_jsonb(r),'players',(select jsonb_agg(to_jsonb(p)) from room_players p where room_id=r.id));
end$$;
create function public.galactic_engine(p_game uuid) returns jsonb language sql security definer set search_path=public,galactic_private,pg_temp as $$select state from galactic_private.engine_state where game_id=p_game$$;
create function public.galactic_start_match(p_room uuid,p_actor uuid,p_state jsonb,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path=public,galactic_private,pg_temp as $$declare r game_rooms;p jsonb;g uuid:=(p_state->>'id')::uuid;i integer:=0;begin
 select * into r from game_rooms where id=p_room for update;
 if r.host_id<>p_actor or r.status<>'waiting' then raise exception 'Only the host can start a waiting room.';end if;
 if exists(select 1 from room_players where room_id=p_room and not is_ready) then raise exception 'All commanders must be ready.';end if;
 if jsonb_array_length(p_state->'players') not between 2 and 8 then raise exception 'A game needs 2–8 players.';end if;
 insert into games(id,room_id,rules) values(g,p_room,p_state->'rules');
 for p in select value from jsonb_array_elements(p_state->'players') loop
  insert into game_players(game_id,player_id,user_id,display_name,character,faction,color,is_ai,team,turn_order) values(g,(p->>'id')::uuid,case when (p->>'ai')::boolean then null else (p->>'id')::uuid end,p->>'name',p->>'character',p->>'faction',p->>'color',(p->>'ai')::boolean,p->>'team',i);
  insert into player_wallets(game_id,player_id,credits) values(g,(p->>'id')::uuid,(p->>'credits')::integer);i:=i+1;
 end loop;
 insert into galactic_private.engine_state(game_id,state) values(g,p_state);
 insert into game_state(game_id,snapshot) values(g,p_snapshot);
 update game_rooms set status='playing' where id=p_room;
 return p_snapshot;
end$$;
create function public.galactic_commit(p_game uuid,p_action jsonb,p_expected integer,p_state jsonb,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path=public,galactic_private,pg_temp as $$
declare old_state jsonb;current_version integer;v integer:=(p_state->>'version')::integer;p jsonb;e jsonb;t jsonb;k text;o jsonb;prop uuid;own_id uuid;auction_id uuid;balance_before integer;idx integer;did_finish boolean;action_id uuid:=(p_action->>'id')::uuid;begin
 select version into current_version from game_state where game_id=p_game for update;
 if current_version is null then raise exception 'Game not found.';end if;
 if exists(select 1 from galactic_private.actions where id=action_id and game_id=p_game) then return (select snapshot from game_state where game_id=p_game);end if;
 if current_version<>p_expected or v<>p_expected+1 then raise exception 'Game state changed. Try again.';end if;
 select state into old_state from galactic_private.engine_state where game_id=p_game;
 did_finish:=(p_state->>'phase'='finished') and (old_state->>'phase'<>'finished');
 insert into galactic_private.actions(id,game_id,actor_id,action_type,payload,version) values(action_id,p_game,(p_action->>'player')::uuid,p_action->>'type',coalesce(p_action->'payload','{}'),v);
 for p in select value from jsonb_array_elements(p_state->'players') loop
  select credits into balance_before from player_wallets where game_id=p_game and player_id=(p->>'id')::uuid;
  update player_wallets set credits=(p->>'credits')::integer,updated_at=now() where game_id=p_game and player_id=(p->>'id')::uuid;
  if balance_before<>(p->>'credits')::integer then insert into transactions(game_id,player_id,action_id,delta,balance,kind) values(p_game,(p->>'id')::uuid,action_id,(p->>'credits')::integer-balance_before,(p->>'credits')::integer,p_action->>'type');end if;
  update game_players set position=(p->>'position')::smallint,detained=(p->>'detained')::boolean,bankrupt=(p->>'bankrupt')::boolean where game_id=p_game and player_id=(p->>'id')::uuid;
 end loop;
 delete from property_ownership where game_id=p_game and property_id not in(select id from properties where (p_state->'ownership')?board_index::text);
 for k,o in select * from jsonb_each(p_state->'ownership') loop
  select id into prop from properties where board_index=k::integer;
  insert into property_ownership(game_id,property_id,player_id) values(p_game,prop,(o->>'owner')::uuid) on conflict(game_id,property_id) do update set player_id=excluded.player_id returning id into own_id;
  insert into property_development(ownership_id,game_id,level) values(own_id,p_game,(o->>'level')::smallint) on conflict(ownership_id) do update set level=excluded.level,updated_at=now();
  if (o->>'mortgaged')::boolean then insert into mortgages(ownership_id,game_id,principal,interest) values(own_id,p_game,(select mortgage_value from properties where id=prop),(p_state->'rules'->>'mortgageInterest')::numeric) on conflict(ownership_id) do nothing;else delete from mortgages where ownership_id=own_id;end if;
 end loop;
 for e in select value from jsonb_array_elements(p_state->'events') loop
  insert into game_events(game_id,event_key,event_type,description,round,version) values(p_game,e->>'id',e->>'type',e->>'text',(e->>'turn')::integer,v) on conflict(game_id,event_key) do nothing;
 end loop;
 idx:=0;for e in select value from jsonb_array_elements(p_state->'history') loop
  insert into turn_history(game_id,player_id,sequence,round,dice,position,credits) values(p_game,(e->>'player')::uuid,idx,(e->>'round')::integer,array[(e->'dice'->>0)::smallint,(e->'dice'->>1)::smallint],(e->>'position')::smallint,(e->>'credits')::integer) on conflict(game_id,sequence) do nothing;idx:=idx+1;
 end loop;
 delete from player_cards where game_id=p_game;
 for p in select value from jsonb_array_elements(p_state->'players') loop for k in select jsonb_array_elements_text(p->'cards') loop insert into player_cards(game_id,player_id,card_id) values(p_game,(p->>'id')::uuid,(select id from card_definitions where key=k));end loop;end loop;
 for t in select value from jsonb_array_elements(p_state->'trades') loop
  insert into trades(id,game_id,sender_id,recipient_id,cash_offered,cash_requested,status,expires_round) values((t->>'id')::uuid,p_game,(t->>'from')::uuid,(t->>'to')::uuid,(t->>'cash')::integer,(t->>'requestCash')::integer,t->>'status',(t->>'expires')::integer) on conflict(id) do update set status=excluded.status;
  delete from trade_items where trade_id=(t->>'id')::uuid;
  for k in select jsonb_array_elements_text(t->'give') loop insert into trade_items(trade_id,direction,property_id) values((t->>'id')::uuid,'give',(select id from properties where board_index=k::integer));end loop;
  for k in select jsonb_array_elements_text(t->'take') loop insert into trade_items(trade_id,direction,property_id) values((t->>'id')::uuid,'take',(select id from properties where board_index=k::integer));end loop;
  for k in select jsonb_array_elements_text(t->'giveCards') loop insert into trade_items(trade_id,direction,card_key) values((t->>'id')::uuid,'give',k);end loop;
  for k in select jsonb_array_elements_text(t->'takeCards') loop insert into trade_items(trade_id,direction,card_key) values((t->>'id')::uuid,'take',k);end loop;
  if t->>'status'='accepted' then insert into trade_history(game_id,trade_id,completed_round) values(p_game,(t->>'id')::uuid,(p_state->>'round')::integer) on conflict(trade_id) do nothing;end if;
 end loop;
 if p_state->'auction'<>'null'::jsonb then
  t:=p_state->'auction';select id into prop from properties where board_index=(t->>'property')::integer;
  select id into auction_id from auctions where game_id=p_game and status='open';
  if auction_id is null then insert into auctions(game_id,property_id,starting_version,current_bid,bidder_id,deadline) values(p_game,prop,v,(t->>'bid')::integer,(t->>'bidder')::uuid,to_timestamp((t->>'deadline')::numeric/1000)) returning id into auction_id;else update auctions set current_bid=(t->>'bid')::integer,bidder_id=(t->>'bidder')::uuid where id=auction_id;end if;
  if p_action->>'type'='BID' then insert into auction_bids(game_id,auction_id,player_id,amount) values(p_game,auction_id,(p_action->>'player')::uuid,(p_action->'payload'->>'amount')::integer);end if;
 else update auctions set status='closed' where game_id=p_game and status='open';end if;
 update galactic_private.engine_state set state=p_state,updated_at=now() where game_id=p_game;
 update game_state set version=v,snapshot=p_snapshot,updated_at=now() where game_id=p_game;
 if did_finish then
  update games set status='finished',winner_id=(p_state->>'winner')::uuid,finished_at=now() where id=p_game;
  update game_rooms set status='closed' where id=(select room_id from games where id=p_game);
  for p in select value from jsonb_array_elements(p_state->'players') loop
   if not (p->>'ai')::boolean then
    balance_before:=(p->>'credits')::integer+coalesce((select sum(case when (item.value->>'mortgaged')::boolean then pr.price/2 else pr.price end+(item.value->>'level')::integer*coalesce(pr.development_cost,0)) from jsonb_each(p_state->'ownership') item join properties pr on pr.board_index=item.key::integer where item.value->>'owner'=p->>'id'),0);
    insert into match_history(game_id,user_id,won,final_wealth) values(p_game,(p->>'id')::uuid,p->>'id'=p_state->>'winner',balance_before) on conflict(game_id,user_id) do nothing;
    update player_statistics set matches=matches+1,wins=wins+case when p->>'id'=p_state->>'winner' then 1 else 0 end,total_wealth=total_wealth+balance_before,updated_at=now() where user_id=(p->>'id')::uuid;
    if p->>'id'=p_state->>'winner' then insert into player_achievements(user_id,achievement_id) select (p->>'id')::uuid,id from achievements where key='first-victory' on conflict(user_id,achievement_id) do nothing;end if;
   end if;
  end loop;
 end if;
 return p_snapshot;
end$$;
-- No authenticated or anonymous caller may invoke authority functions directly.
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('galactic_rate_limit','galactic_create_room','galactic_join_room','galactic_engine','galactic_start_match','galactic_commit') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end$$;
