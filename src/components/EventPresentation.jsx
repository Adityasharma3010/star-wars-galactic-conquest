import { useEffect,useRef,useState } from 'react';
import { ArrowRight,ShieldAlert,Coins,Navigation,Radio,Sparkles,KeyRound,Building2 } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BOARD } from '../game/rules/data.js';
import { PlanetArt,Emblem } from './Art.jsx';
import Modal from './Modal.jsx';
import { playSound } from '../services/audio.js';

export function Starfighter({className=''}) {
  return <svg className={className} viewBox="0 0 320 180" fill="none" aria-hidden="true"><path d="m160 12 15 95 91 45-9 9-82-21-15 27-15-27-82 21-9-9 91-45z" fill="#b8cbd1" stroke="#e9f4f6" strokeWidth="2"/><path d="m150 103 10-52 10 52-10 25z" fill="#162937"/><path d="m59 146 50-33m152 33-50-33M87 123l-4-60m154 60 4-60" stroke="#e3d0a0" strokeWidth="5"/><path d="M82 169v-19m157 19v-19M150 145v16m20-16v16" stroke="#74d6ff" strokeWidth="6" strokeLinecap="round"/></svg>;
}
function JediCrest(){return <svg viewBox="0 0 150 160" fill="none" aria-hidden="true"><path d="M75 18v111M75 18l-6 86h12z" fill="currentColor"/><path d="M64 66C43 42 26 55 26 76c0 39 28 61 49 65-36-29-42-52-30-68l19 12m22-19c21-24 38-11 38 10 0 39-28 61-49 65 36-29 42-52 30-68L86 85" fill="currentColor"/><path d="m75 4 5 10-5 11-5-11z" fill="#efffff"/></svg>;}
function ImperialCrest(){return <svg viewBox="0 0 150 150" fill="none" aria-hidden="true"><circle cx="75" cy="75" r="58" stroke="currentColor" strokeWidth="8"/><circle cx="75" cy="75" r="28" stroke="currentColor" strokeWidth="12"/>{Array.from({length:6},(_,i)=><path key={i} d="M65 17h20v34H65z" fill="currentColor" transform={'rotate('+i*60+' 75 75)'}/>)}<circle cx="75" cy="75" r="13" fill="currentColor"/></svg>;}
function EventScene({card}) {
  const force=card.deck==='force',imperial=['detention'].includes(card.effect)||card.title.toLowerCase().includes('imperial');
  const tile=card.effect==='move'&&card.target?BOARD[card.target]:BOARD[force?14:1];
  return <div className={'event-scene '+(force?'force-scene':'galactic-scene')+(imperial?' imperial-scene':'')} aria-label={force?'Animated Jedi holocron and lightsabers':'Animated starfighter and galactic transmission'}>
    <div className="event-nebula"/><div className="event-star-trails">{Array.from({length:24},(_,i)=><i key={i} style={{'--angle':i*137.5+'deg','--delay':i%8*.12+'s','--distance':80+i%5*25+'px'}}/>)}</div>
    <span className="scene-coordinate">{force?'JEDI ARCHIVES':'GALACTIC TRANSMISSION'} / {imperial?'IMPERIAL SECTOR':'AGE OF REBELLION'}</span>
    {force?<><div className="saber-beam saber-left"/><div className="saber-beam saber-right"/><div className="holocron-rings"><i/><i/><i/></div><div className="holocron-emblem">{imperial?<ImperialCrest/>:<JediCrest/>}</div><div className="holocron-base"/></>:<><div className="transmission-planet"><PlanetArt tile={tile} large/></div><div className="transmission-grid"/><div className="transmission-radar"><i/><i/><i/></div><Starfighter className="event-starfighter"/><div className="transmission-signal"><Radio size={15}/> INCOMING HOLOTRANSMISSION</div></>}
    <div className="scene-caption">{force?imperial?'THE EMPIRE HAS FOUND YOU':'THE FORCE WILL GUIDE YOU':'A SIGNAL FROM ACROSS THE GALAXY'}<span>{force?'HOLOCRON DECRYPTED':'TRANSMISSION RECEIVED'}</span></div>
  </div>;
}
export default function EventPresentation() {
  const {eventQueue,dismissEvent,modal}=useGameStore(),event=eventQueue[0];
  const [now,setNow]=useState(Date.now());
  const played=useRef(null);
  useEffect(()=>{if(!event)return;setNow(Date.now());const timeout=setTimeout(()=>setNow(Date.now()),Math.max(0,event.readyAt-Date.now()));return()=>clearTimeout(timeout);},[event?.id,event?.readyAt]);
  const visible=Boolean(event&&!modal&&now>=event.readyAt);
  useEffect(()=>{if(visible&&played.current!==event.id){played.current=event.id;playSound('card',useGameStore.getState().settings);}},[visible,event?.id]);
  if(!event||modal||now<event.readyAt)return null;
  const {card,player}=event,force=card.deck==='force';
  const Icon=card.effect==='detention'?ShieldAlert:card.effect==='escape'?KeyRound:card.effect==='repairs'?Building2:['move','back','nearest'].includes(card.effect)?Navigation:Coins;
  return <Modal open title={force?'A disturbance in the Force':'A message from the galaxy'} subtitle={player.name+' · '+(force?'Force Event':'Galactic Event')} variant={force?'force-event':'galactic-event'} wide onClose={dismissEvent}>
    <EventScene key={event.id} card={card}/><div className="event-briefing"><div className="event-type"><Icon size={20}/><span>{force?'THE FORCE':'GALACTIC COMMS'}<small>MISSION UPDATE</small></span><Emblem size={34}/></div><h3>{card.title}</h3><p>{card.description}</p><button className="button gold-button full" onClick={dismissEvent}>Continue mission <ArrowRight size={18}/></button><span className="event-footer"><Sparkles size={12}/> Your mission log records this event.</span></div>
  </Modal>;
}
