import { mkdir,writeFile } from 'node:fs/promises';
import { createGame,transition } from '../src/game/engine/game.js';
import { publicState } from '../supabase/functions/galactic-api/authority.js';
const a='90000000-0000-4000-8000-000000000001',b='90000000-0000-4000-8000-000000000002',outsider='90000000-0000-4000-8000-000000000003',game='90000000-0000-4000-8000-000000000004';
const ps=[{id:a,name:'Database QA Host',character:'luke',faction:'Rebel Alliance',color:'#79b0dc',ai:false},{id:b,name:'Database QA Guest',character:'vader',faction:'Galactic Empire',color:'#dd7777',ai:false}];
const state=createGame(ps,{id:game,now:Date.now()},()=>.3);
const action={id:'90000000-0000-4000-8000-000000000005',player:a,type:'ROLL',payload:{},version:0,now:Date.now()};
const next=transition(state,action,()=>.3);
const json=value=>`$json$${JSON.stringify(value)}$json$::jsonb`;
const sql=`-- Disposable fixtures in one transaction. No test data survives rollback.
begin;
insert into auth.users(id,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('${a}','authenticated','authenticated','{}','{}',now(),now()),('${b}','authenticated','authenticated','{}','{}',now(),now()),('${outsider}','authenticated','authenticated','{}','{}',now(),now());
create temp table qa_room as select (public.galactic_create_room('${a}','QAZ9X2','Rollback database QA',true,'{"name":"QA Host","character":"luke","faction":"Rebel Alliance"}')->'room'->>'id')::uuid as id;
select public.galactic_join_room('${b}','QAZ9X2','{"name":"QA Guest","character":"luke","faction":"Galactic Empire"}');
select public.galactic_ready((select id from qa_room),'${a}','luke');
do $$begin
 begin perform public.galactic_ready((select id from qa_room),'${b}','luke');raise exception 'QA FAIL duplicate readiness accepted';exception when others then if SQLERRM like 'QA FAIL%' then raise;end if;if SQLERRM not like '%Character already%' then raise;end if;end;
 if (select is_ready from room_players where user_id='${b}' and room_id=(select id from qa_room)) then raise exception 'QA FAIL failed readiness wrote state';end if;
end$$;
select public.galactic_ready((select id from qa_room),'${b}','vader');
select public.galactic_start_match((select id from qa_room),'${a}',${json(state)},${json(publicState(state))});
select public.galactic_commit('${game}',${json(action)},0,${json(next)},${json(publicState(next))});
do $$declare result jsonb;begin
 result:=public.galactic_commit('${game}',${json(action)},0,${json(next)},${json(publicState(next))});
 if (result->>'version')::integer<>1 or (select count(*) from galactic_private.actions where game_id='${game}')<>1 then raise exception 'QA FAIL duplicate action';end if;
 begin perform public.galactic_commit('${game}',jsonb_set(${json(action)},'{id}','"90000000-0000-4000-8000-000000000006"'),0,${json(next)},${json(publicState(next))});raise exception 'QA FAIL stale commit accepted';exception when others then if SQLERRM like 'QA FAIL%' then raise;end if;if SQLERRM not like '%Game state changed%' then raise;end if;end;
end$$;
create temp table qa_friend as select id from (insert_dummy_placeholder) q;
rollback;
`;
const friendship=`create temp table qa_friend(id uuid);
with request as (insert into friend_requests(sender_id,recipient_id) values('${a}','${b}') returning id) insert into qa_friend select id from request;
select public.galactic_friend_response((select id from qa_friend),'${b}',true);
do $$begin
 if (select count(*) from friendships where (user_id='${a}' and friend_id='${b}') or (user_id='${b}' and friend_id='${a}'))<>2 then raise exception 'QA FAIL non-atomic friendship';end if;
 begin perform public.galactic_friend_response((select id from qa_friend),'${b}',true);raise exception 'QA FAIL duplicate friend response';exception when others then if SQLERRM like 'QA FAIL%' then raise;end if;if SQLERRM not like '%unavailable%' then raise;end if;end;
end$$;
set local role authenticated;
set local request.jwt.claims='{"sub":"${a}","role":"authenticated"}';
do $$declare changed integer;begin
 if (select count(*) from game_state where game_id='${game}')<>1 then raise exception 'QA FAIL member snapshot denied';end if;
 if (select count(*) from player_wallets where game_id='${game}')<>2 then raise exception 'QA FAIL member wallets denied';end if;
 begin update player_wallets set credits=999999 where game_id='${game}';get diagnostics changed=row_count;if changed<>0 then raise exception 'QA FAIL wallet write accepted';end if;exception when insufficient_privilege then null;end;
 begin perform public.galactic_engine('${game}');raise exception 'QA FAIL private engine RPC allowed';exception when insufficient_privilege then null;end;
 begin perform public.galactic_ready('${game}','${a}','luke');raise exception 'QA FAIL readiness RPC allowed';exception when insufficient_privilege then null;end;
 if has_schema_privilege('authenticated','galactic_private','USAGE') then raise exception 'QA FAIL private schema allowed';end if;
end$$;
set local request.jwt.claims='{"sub":"${outsider}","role":"authenticated"}';
do $$begin
 if exists(select 1 from game_state where game_id='${game}') or exists(select 1 from player_wallets where game_id='${game}') or exists(select 1 from game_rooms where code='QAZ9X2') then raise exception 'QA FAIL outsider read';end if;
end$$;
reset role;
select 'PASS: RLS member/outsider reads, denied writes/RPCs, readiness, idempotency, stale commits and atomic friendship; all fixtures rolled back' as verification;
rollback;`;
await mkdir('tests/database',{recursive:true});
await writeFile('tests/database/security.sql',sql.replace('create temp table qa_friend as select id from (insert_dummy_placeholder) q;\nrollback;',()=>friendship));
console.log('Rollback-only remote database tests generated.');
