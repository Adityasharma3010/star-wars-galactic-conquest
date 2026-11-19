import { Component,useEffect,useState } from 'react';
import { AnimatePresence,motion } from 'motion/react';
import { Settings,Volume2,VolumeX,ChevronDown,ArrowRight,Plus,CircleHelp,Globe2,X,ShieldCheck,ArrowRightLeft,WifiOff,LogOut,Radio } from 'lucide-react';
import Board from '../board/Board.jsx';
import { PlayersPanel,PropertyPanel,ActivityPanel } from '../components/Panels.jsx';
import { Emblem,TokenArt } from '../components/Art.jsx';
import EventPresentation from '../components/EventPresentation.jsx';
import Dialogs from '../pages/Dialogs.jsx';
import { useGameStore } from '../stores/gameStore.js';
import { chooseAction } from '../game/ai/commander.js';
import { timeoutAction } from '../game/engine/timeouts.js';
import { automationPlayer,HEARTBEAT_INTERVAL } from '../game/engine/connections.js';
import { setAtmosphere,playSound,restoreSounds } from '../services/audio.js';
import { CHARACTERS,THEME } from '../game/rules/data.js';
import { subscribeGame,serverCall,supabase,cloudProfile } from '../services/supabase.js';
import { prepareLeaveSignal,leaveMatch } from '../services/matchConnection.js';

class ErrorBoundary extends Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  render(){if(this.state.error)return <div className="fatal-error"><Emblem size={50}/><h1>Command link interrupted</h1><p>{this.state.error.message}</p><button className="button gold-button" onClick={()=>location.reload()}>Reload your saved match</button></div>;return this.props.children;}
}
function GameApp() {
  const {game,online,onlinePlayer,dispatch,open,profile,settings,updateSettings,error,clearError,modal,commit,matchAway,eventQueue}=useGameStore();
  const [connected,setConnected]=useState(true);
  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(async({data})=>{
      if(!data.session||data.session.user.is_anonymous)return;
      const saved=await cloudProfile();
      if(saved)useGameStore.setState({profile:{name:saved.profile.display_name,character:saved.profile.character,faction:saved.profile.faction},settings:{...useGameStore.getState().settings,...saved.settings}});
    }).catch(e=>useGameStore.setState({error:e.message}));
  },[]);
  useEffect(()=>{restoreSounds().catch(()=>{});},[]);
  useEffect(()=>{
    if(online||game.phase==='finished'||eventQueue.length)return;
    const p=automationPlayer(game);
    if(!p)return;
    const delay=game.movement?game.movement.steps*260+1300:1200;
    const timer=setTimeout(()=>{
      const current=useGameStore.getState().game;
      const action=chooseAction(current,p);
      if(action)dispatch(action.type,action.payload,action.player);
    },delay);
    return()=>clearTimeout(timer);
  },[game.version,online,dispatch,game.phase,eventQueue.length]);
  useEffect(()=>{
    if(eventQueue.length)return;
    if(game.phase==='auction'&&!modal)open('auction');
    if(game.debt&&!modal)open('debt');
  },[game.phase,game.debt?.payer,eventQueue.length,modal,open]);
  useEffect(()=>{
    if(!online||!supabase||matchAway||game.phase==='finished')return;
    let cleanup,disposed=false,lastPoll=0,leaveSignal=()=>{};
    const acceptConnections=connections=>{if(!disposed&&connections)useGameStore.setState({connections});};
    const heartbeat=async()=>{
      try{const d=await serverCall('connection',{gameId:game.id});acceptConnections(d.connections);if(!disposed)setConnected(true);}
      catch{if(!disposed)setConnected(false);}
    };
    const prepare=()=>prepareLeaveSignal(game.id).then(fn=>{if(!disposed)leaveSignal=fn;}).catch(()=>{});
    subscribeGame(game.id,state=>{if(!disposed)commit(state);},presence=>{if(!disposed)useGameStore.setState({presence});},acceptConnections)
      .then(fn=>{if(disposed)fn();else cleanup=fn;}).catch(e=>{if(!disposed)useGameStore.setState({error:e.message});});
    heartbeat();prepare();
    const heartbeatTimer=setInterval(heartbeat,HEARTBEAT_INTERVAL);
    const pollTimer=setInterval(async()=>{
      const current=useGameStore.getState();
      if(current.game.phase==='finished')return;
      const urgent=Boolean(automationPlayer(current.game,current.connections)||current.game.auction);
      if(!urgent&&Date.now()-lastPoll<8000)return;
      lastPoll=Date.now();
      try{
        const d=await serverCall('snapshot',{gameId:game.id});
        if(disposed)return;
        acceptConnections(d.connections);
        if(d.state.version>useGameStore.getState().game.version)commit(d.state);
        setConnected(true);
      }catch{if(!disposed)setConnected(false);}
    },2000);
    const onHide=()=>leaveSignal();
    const onOnline=()=>{heartbeat();prepare();};
    const onOffline=()=>setConnected(false);
    window.addEventListener('pagehide',onHide);
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(prepare,0);});
    return()=>{
      disposed=true;cleanup?.();subscription.unsubscribe();clearInterval(heartbeatTimer);clearInterval(pollTimer);
      window.removeEventListener('pagehide',onHide);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);
    };
  },[online,game.id,commit,matchAway,game.phase==='finished']);
  useEffect(()=>{if(new URLSearchParams(location.search).has('room'))open('rooms');},[open]);
  useEffect(()=>{
    const apply=()=>setAtmosphere(useGameStore.getState().settings);
    document.addEventListener('pointerdown',apply);apply();
    return()=>document.removeEventListener('pointerdown',apply);
  },[settings]);
  useEffect(()=>{
    if(online)return;
    const timer=setInterval(()=>{
      const state=useGameStore.getState();
      const action=timeoutAction(state.game);
      if(action&&!state.busy)dispatch(action.type,action.payload,action.player);
    },1000);
    return()=>clearInterval(timer);
  },[online,dispatch]);
  const exit=async()=>{
    useGameStore.setState({matchAway:true,busy:true,eventQueue:[],modal:null});
    try{const d=await leaveMatch(game.id);useGameStore.setState({connections:d.connections});}
    catch(e){useGameStore.setState({matchAway:false,error:e.message});}
    finally{useGameStore.setState({busy:false});}
  };
  const resume=async()=>{
    try{const d=await serverCall('snapshot',{gameId:game.id});commit(d.state);useGameStore.setState({matchAway:false,connections:d.connections,error:null});}
    catch(e){useGameStore.setState({error:e.message});}
  };
  const character=CHARACTERS.find(c=>c.id===profile.character);
  return <div className={'app-shell '+(settings.reducedMotion?'reduce-motion':'')} style={{'--gold':settings.accent||'#e5bd73'}} onClick={e=>{if(e.target.closest('button')&&!e.target.closest('[data-audio-preview]'))playSound('click',settings);}}>
    <header className="app-header">
      <button className="brand" onClick={()=>open('newGame')} aria-label="Galactic Conquest main menu"><Emblem size={39}/><span><b>STAR WARS</b><strong>GALACTIC CONQUEST</strong></span><small>FAN EDITION</small></button>
      <nav><button className="selected" onClick={()=>useGameStore.getState().close()}>Command deck</button><button onClick={()=>open('rooms')}>Find a game</button><button onClick={()=>open('rules')}>How to play <CircleHelp size={13}/></button></nav>
      <div className="header-actions"><button className="icon-button" aria-label={settings.mute?'Unmute sound':'Mute sound'} onClick={()=>updateSettings({mute:!settings.mute})}>{settings.mute?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button className="icon-button" aria-label="Open settings" onClick={()=>open('settings')}><Settings size={17}/></button><span className="header-separator"/><button className="profile-button" onClick={()=>open('profile')}><span style={{color:character?.color}}><TokenArt character={character} size={33}/></span>{profile.name}<ChevronDown size={12}/></button></div>
    </header>
    <main><div className="mission-heading"><div><div className="breadcrumb">COMMAND DECK <span>/</span> {online?'MULTIPLAYER':'SOLO & LOCAL PLAY'}</div><h2>Your conquest begins here<span>.</span></h2><p>Explore iconic worlds. Build your empire. Rule the galaxy.</p></div><div className="mission-actions">
      <span className="connection-badge">{online?matchAway?<><Radio size={12}/> SEAT RESERVED</>:connected?<><i className="status-dot"/> ONLINE</>:<><WifiOff size={12}/> RECONNECTING</>:<><i className="status-dot"/> SOLO & AI READY</>}</span>
      {online&&!matchAway&&game.phase!=='finished'&&<button className="button leave-match-button" onClick={exit}><LogOut size={14}/> Leave match</button>}
      <button className="button new-game-button" onClick={()=>open('newGame')}><Plus size={15}/> New game</button>
    </div></div>
    {online&&matchAway&&<div className="match-away-banner"><Radio size={24}/><div><strong>Your squadron is waiting.</strong><p>Your seat is reserved for two minutes. Return to resume control.</p></div><button className="button gold-button" disabled={useGameStore.getState().busy} onClick={resume}>Rejoin match <ArrowRight size={16}/></button></div>}
    <div className="game-layout"><PlayersPanel/><Board/><aside className="right-panel"><PropertyPanel/><ActivityPanel/></aside></div>
    <div className="bottom-toolbar"><button onClick={()=>open('trade')}><ArrowRightLeft size={15}/> Trade</button><button onClick={()=>open('deed')}><Globe2 size={15}/> Property deed</button><button onClick={()=>open('rules')}><CircleHelp size={15}/> Rules</button><button onClick={()=>open('newGame')}><Plus size={15}/> New game</button></div></main>
    <footer><span><Emblem size={15}/> {THEME.title}<i/>A NON-COMMERCIAL FAN PROJECT</span><span>Star Wars worlds · Original game interface</span><button onClick={()=>open('settings')}>About & credits <ArrowRight size={11}/></button></footer>
    <Dialogs/><EventPresentation/>
    <AnimatePresence>{error&&!modal&&<motion.div className="error-toast" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} role="alert"><ShieldCheck size={19}/><p>{error}</p><button className="icon-button" aria-label="Dismiss error" onClick={clearError}><X size={17}/></button></motion.div>}</AnimatePresence>
  </div>;
}
export default function App(){return <ErrorBoundary><GameApp/></ErrorBoundary>;}
