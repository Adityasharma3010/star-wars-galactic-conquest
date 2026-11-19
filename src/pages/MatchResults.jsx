import { motion } from 'motion/react';
import { Trophy,ArrowRight } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { BOARD } from '../game/rules/data.js';
import { wealth } from '../game/engine/game.js';
export default function MatchResults(){
 const {game,open,onlinePlayer}=useGameStore();
 if(game.phase!=='finished')return <p className="notice">The conquest continues.</p>;
 const winner=game.players.find(p=>p.id===game.winner);
 const winners=game.winningTeam?game.players.filter(p=>p.team===game.winningTeam):[winner];
 const ids=new Set(winners.map(p=>p.id)),viewer=onlinePlayer||game.players[0].id;
 const owned=BOARD.filter(t=>ids.has(game.ownership[t.id]?.owner));
 return <div className="victory-screen"><motion.div initial={{scale:.6,rotate:-10}} animate={{scale:1,rotate:0}}><Trophy size={80}/></motion.div><span className="eyebrow gold">THE GALAXY HAS A NEW RULER</span><h3>{game.winningTeam||winner.name}</h3><p>{ids.has(viewer)?'VICTORY':'DEFEAT'} · Conquest concluded after {game.round} rounds.</p><div className="profile-stats"><div><strong>◈ {winners.reduce((n,p)=>n+wealth(game,p),0).toLocaleString()}</strong><small>{game.winningTeam?'TEAM WEALTH':'FINAL WEALTH'}</small></div><div><strong>{owned.length}</strong><small>WORLDS OWNED</small></div></div><div className="results-worlds">{owned.map(t=><span key={t.id} style={{borderColor:t.color||'#789bac'}}>{t.name}</span>)}</div><div className="rent-table results-table">{[...game.players].sort((a,b)=>wealth(game,b)-wealth(game,a)).map(p=><div key={p.id}><span style={{color:p.color}}>{p.name}{ids.has(p.id)?' · WINNER':p.bankrupt?' · ELIMINATED':''}</span><strong>◈ {wealth(game,p).toLocaleString()}</strong></div>)}</div><button className="button gold-button full" onClick={()=>open('newGame')}>Conquer another galaxy <ArrowRight size={16}/></button><button className="text-button full" onClick={()=>open('history')}>View match history</button></div>;
}
