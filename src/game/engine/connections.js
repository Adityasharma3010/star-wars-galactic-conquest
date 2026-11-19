export const HEARTBEAT_INTERVAL = 12000;
export const CONNECTION_STALE = 30000;
export const DISCONNECT_GRACE = 300000;
export const LEAVE_GRACE = 120000;

export function connectionStatus(connection,now=Date.now()) {
  if(!connection)return null;
  if(connection.status==='online'&&now-connection.lastSeen<CONNECTION_STALE)return {...connection,deadline:null};
  const left=connection.status==='left';
  return {...connection,status:left?'left':'disconnected',deadline:connection.deadline??connection.lastSeen+(left?LEAVE_GRACE:CONNECTION_STALE+DISCONNECT_GRACE)};
}
export function graceExpired(connection,now=Date.now()) {
  const status=connectionStatus(connection,now);
  return Boolean(status&&status.status!=='online'&&status.deadline<=now);
}
export function automationPlayer(state,connections={},now=Date.now()) {
  if(state.phase==='finished')return null;
  const eligible=p=>p&&!p.bankrupt&&(p.ai||graceExpired(connections[p.id],now));
  if(state.debt)return state.players.find(p=>p.id===state.debt.payer&&eligible(p))||null;
  if(state.auction)return state.players.find(p=>eligible(p)&&!state.auction.passed.includes(p.id)&&p.id!==state.auction.bidder)||null;
  const pending=state.trades.find(t=>t.status==='pending'&&eligible(state.players.find(p=>p.id===t.to)));
  if(pending)return state.players.find(p=>p.id===pending.to);
  return eligible(state.players[state.turn])?state.players[state.turn]:null;
}
