export function timeoutAction(state,now=Date.now()) {
  if(state.phase==='finished')return null;
  if(state.auction){
    if(now<state.auction.deadline)return null;
    const p=state.players.find(p=>!p.bankrupt&&!state.auction.passed.includes(p.id)&&p.id!==state.auction.bidder);
    return p?{type:'PASS',player:p.id,payload:{}}:null;
  }
  if(!state.turnDeadline||now<state.turnDeadline)return null;
  const p=state.players[state.turn];
  if(state.phase==='roll')return {type:'ROLL',player:p.id,payload:{}};
  if(state.phase==='purchase')return {type:'DECLINE',player:p.id,payload:{}};
  if(state.phase==='end')return {type:'END',player:p.id,payload:{}};
  if(state.debt){const debtor=state.players.find(p=>p.id===state.debt.payer);return {type:debtor.credits>=state.debt.amount?'SETTLE':'BANKRUPT',player:debtor.id,payload:{}};}
  return null;
}
