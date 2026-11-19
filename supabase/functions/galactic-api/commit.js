import { transition } from './_shared/game/engine/game.js';
import { BOARD } from './_shared/game/rules/data.js';
import { publicState } from './authority.js';
export async function commitAction(state,action,random,rpc){
 const next=transition(state,action,random);
 if(next===state)return {snapshot:publicState(state),recipients:[]};
 const snapshot=await rpc('galactic_commit',{p_game:state.id,p_action:action,p_expected:state.version,p_state:next,p_snapshot:publicState(next)});
 // A duplicate RPC may return the current state. Award only actual committed ownership.
 const recipients=snapshot.players.filter(p=>!p.ai&&BOARD.some(t=>t.type==='property'&&snapshot.ownership[t.id]?.owner===p.id&&state.ownership[t.id]?.owner!==p.id));
 return {snapshot,recipients};
}
