export function timeoutAction(state,now=Date.now()) {
  if(state.phase==='finished')return null;
  if(state.auction){
    if(now<state.auction.deadline)return null;
    const p=state.players.find(p=>!p.bankrupt&&!state.auction.passed.includes(p.id)&&p.id!==state.auction.bidder);
    return p?{type:'PASS',player:p.id,payload:{}}:null;
  }
  return null;
}
