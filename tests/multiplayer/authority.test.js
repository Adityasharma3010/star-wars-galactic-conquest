import { describe,it,expect } from 'vitest';
import { validateAction,publicState,safeRules } from '../../supabase/functions/galactic-api/authority.js';
import { createGame } from '../../src/game/engine/game.js';
import { commitAction } from '../../supabase/functions/galactic-api/commit.js';
const id='00000000-0000-4000-8000-000000000001';
describe('server action boundary',()=>{
 it('uses the authenticated actor instead of the submitted player',()=>{const a=validateAction({id,type:'ROLL',player:'cheater',version:2,payload:{dice:[6,6]}},'authenticated-user',2);expect(a.player).toBe('authenticated-user');expect(a).not.toHaveProperty('dice');});
 it('rejects invalid action IDs, stale snapshots and unknown actions',()=>{expect(()=>validateAction({id:'abc',type:'ROLL',version:0},'u',0)).toThrow();expect(()=>validateAction({id,type:'ROLL',version:99},'u',0)).toThrow();expect(()=>validateAction({id,type:'SET_CREDITS',version:0},'u',0)).toThrow();});
 it('redacts future card order and internal payment queues',()=>{const s=createGame([{id:'a'},{id:'b'}]);const redacted=publicState(s);expect(redacted).not.toHaveProperty('decks');expect(redacted).not.toHaveProperty('processed');expect(redacted).not.toHaveProperty('payments');expect(s.decks.force).toHaveLength(12);});
 it('validates custom rule ranges',()=>{expect(()=>safeRules({startingCredits:-1})).toThrow();expect(safeRules({startingCredits:2000,trading:false}).startingCredits).toBe(2000);});
 it('never awards a hypothetical purchase when the RPC returns unchanged ownership',async()=>{const state=createGame([{id:'a',ai:false},{id:'b',ai:false}]);state.phase='purchase';state.pendingProperty=1;const result=await commitAction(state,{id:'retry-id',type:'BUY',player:'a',version:0,payload:{}},()=>.5,async()=>publicState(state));expect(result.recipients).toEqual([]);expect(result.snapshot.ownership).toEqual({});expect(result.snapshot.players[0].credits).toBe(1500);});
});
