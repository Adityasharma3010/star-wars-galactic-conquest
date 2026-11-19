import { supabase,serverCall,matchSessionId,pauseMatchRequests,resumeMatchRequests,flushMatchRequests } from './supabase.js';

// Prepare while the page is active; pagehide must not wait for token refresh.
export async function prepareLeaveSignal(gameId) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)return ()=>{};
  const url=import.meta.env.VITE_SUPABASE_URL+'/functions/v1/galactic-api';
  const headers={'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token};
  const body=JSON.stringify({command:'connection',gameId,sessionId:matchSessionId(),status:'left'});
  return ()=>{fetch(url,{method:'POST',headers,body,keepalive:true}).catch(()=>{});};
}
export async function leaveMatch(gameId) {
  pauseMatchRequests(gameId);
  try{await flushMatchRequests(gameId);return await serverCall('connection',{gameId,status:'left'});}
  finally{resumeMatchRequests(gameId);}
}
