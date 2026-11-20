import { writeFile } from 'node:fs/promises';
import { createGame, transition } from '../src/game/engine/game.js';
import { publicState } from '../supabase/functions/galactic-api/authority.js';
const a = '91000000-0000-4000-8000-000000000001',
  b = '91000000-0000-4000-8000-000000000002',
  outsider = '91000000-0000-4000-8000-000000000003',
  g = '91000000-0000-4000-8000-000000000004';
const one = '91000000-0000-4000-8000-000000000011',
  two = '91000000-0000-4000-8000-000000000012';
const state = createGame(
  [
    {
      id: a,
      name: 'QA Host',
      character: 'luke',
      faction: 'Rebel Alliance',
      color: '#79b0dc',
      ai: false,
    },
    {
      id: b,
      name: 'QA Guest',
      character: 'vader',
      faction: 'Galactic Empire',
      color: '#dd7777',
      ai: false,
    },
  ],
  { id: g, now: Date.now() },
  () => 0.3,
);
const action = {
  id: '91000000-0000-4000-8000-000000000005',
  player: a,
  type: 'ROLL',
  payload: {},
  version: 0,
  now: Date.now(),
  connectionTimeout: true,
};
const next = transition(state, action, () => 0.3),
  json = (v) => '$json$' + JSON.stringify(v) + '$json$::jsonb';
const sql = `-- Connection fixtures and automatic-action race checks; all data rolls back.
begin;
insert into auth.users(id,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('${a}','authenticated','authenticated','{}','{}',now(),now()),('${b}','authenticated','authenticated','{}','{}',now(),now()),('${outsider}','authenticated','authenticated','{}','{}',now(),now());
create temp table qa_connection_room as select (public.galactic_create_room('${a}','QACN22','Rollback connection QA',true,'{"name":"QA Host","character":"luke","faction":"Rebel Alliance"}')->'room'->>'id')::uuid as id;
select public.galactic_join_room('${b}','QACN22','{"name":"QA Guest","character":"vader","faction":"Galactic Empire"}');
select public.galactic_ready((select id from qa_connection_room),'${a}','luke');
select public.galactic_ready((select id from qa_connection_room),'${b}','vader');
select public.galactic_start_match((select id from qa_connection_room),'${a}',${json(state)},${json(publicState(state))});
do $$declare c jsonb;result jsonb;begin
 perform public.galactic_connection('${g}','${a}','${one}','online');
 perform public.galactic_connection('${g}','${a}','${two}','online');
 c:=public.galactic_connection('${g}','${a}','${one}','left')->'${a}';
 if c->>'status'<>'online' or c->'deadline'<>'null'::jsonb then raise exception 'QA FAIL one closing tab interrupted another active tab';end if;
 c:=public.galactic_connection('${g}','${a}','${two}','left')->'${a}';
 if c->>'status'<>'left' or (c->>'deadline')::numeric-(c->>'lastSeen')::numeric<>120000 then raise exception 'QA FAIL leave grace is not two minutes';end if;
 update galactic_private.connection_leases set status='online',last_seen=now()-interval '31 seconds' where game_id='${g}' and player_id='${a}';
 c:=public.galactic_connections('${g}')->'${a}';
 if c->>'status'<>'disconnected' or (c->>'deadline')::numeric-(c->>'lastSeen')::numeric<>330000 then raise exception 'QA FAIL disconnect grace is not five minutes after detection';end if;
 result:=public.galactic_commit('${g}',${json(action)},0,${json(next)},${json(publicState(next))});
 if result->>'version'<>'0' then raise exception 'QA FAIL automatic action ran before grace expired';end if;
 update galactic_private.connection_leases set last_seen=now()-interval '6 minutes' where game_id='${g}' and player_id='${a}';
 perform public.galactic_connection('${g}','${a}','${one}','online');
 result:=public.galactic_commit('${g}',${json(action)},0,${json(next)},${json(publicState(next))});
 if result->>'version'<>'0' then raise exception 'QA FAIL stale automatic action overrode a reconnect';end if;
 update galactic_private.connection_leases set last_seen=now()-interval '6 minutes' where game_id='${g}' and player_id='${a}';
 result:=public.galactic_commit('${g}',${json(action)},0,${json(next)},${json(publicState(next))});
 if result->>'version'<>'1' then raise exception 'QA FAIL expired grace failed to allow temporary control';end if;
 if (select count(*) from galactic_private.actions where game_id='${g}')<>1 then raise exception 'QA FAIL denied automatic actions wrote game history';end if;
 begin perform public.galactic_connection('${g}','${outsider}','${one}','online');raise exception 'QA FAIL outsider heartbeat accepted';exception when others then if SQLERRM like 'QA FAIL%' then raise;end if;if SQLERRM not like '%membership%' then raise;end if;end;
end$$;
set local role authenticated;
do $$begin
 if has_schema_privilege('authenticated','galactic_private','USAGE') then raise exception 'QA FAIL private lease access';end if;
 if has_function_privilege('authenticated','public.galactic_connection(uuid,uuid,uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.galactic_connections(uuid)','EXECUTE') or has_function_privilege('authenticated','public.galactic_commit_core(uuid,jsonb,integer,jsonb,jsonb)','EXECUTE') then raise exception 'QA FAIL connection authority RPC exposed';end if;
end$$;
reset role;
select 'PASS: live tabs, two-minute leave, five-minute disconnect, reconnect commit guard, expiry and private authorization; fixtures rolled back' as verification;
rollback;
`;
await writeFile('tests/database/connections.sql', sql);
console.log('Generated rollback-only connection security and grace checks.');
