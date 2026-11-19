import { useEffect,useState } from 'react';
import { WifiOff,LogOut,Radio } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { connectionStatus } from '../game/engine/connections.js';

export default function ConnectionGrace({player}) {
  const {connections,online}=useGameStore();
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval);},[]);
  if(!online||!player||player.ai)return null;
  const status=connectionStatus(connections?.[player.id],now);
  if(!status||status.status==='online')return null;
  const seconds=Math.max(0,Math.ceil((status.deadline-now)/1000));
  const left=status.status==='left';
  return <span className={'connection-grace '+(!seconds?'autopilot':'')} title={seconds?player.name+(left?' left the match. Their seat is reserved for two minutes.':' lost their connection. Their seat is reserved for five minutes.'):'Temporary AI is keeping this seat in play. Reconnecting returns control.'}>
    {seconds?left?<LogOut size={14}/>:<WifiOff size={14}/>:<Radio size={14}/>}
    <span>{seconds?left?'REJOIN WINDOW':'RECONNECT WINDOW':'AUTOPILOT'}{seconds>0&&<strong role="timer" aria-label={left?'Rejoin countdown':'Reconnect countdown'}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong>}</span>
  </span>;
}
