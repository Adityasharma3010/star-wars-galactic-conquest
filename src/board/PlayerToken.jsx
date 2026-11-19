import { CHARACTERS } from '../game/rules/data.js';
import { TokenArt } from '../components/Art.jsx';
import { tilePosition } from './BoardTile.jsx';
export function tokenCoordinates(position,index=0){const pos=tilePosition(position),edge=1.5,total=9+2*edge;const center=cell=>cell===1?edge/2:cell===11?edge+9+edge/2:edge+cell-1.5;return {left:((center(pos.col)+(index%4-.8)*.17)/total*100)+'%',top:((center(pos.row)+(index>3?-.22:.04))/total*100)+'%'};}
export default function PlayerToken({player,index,position}){return <div className="player-token" data-token={player.id} aria-label={`${player.name} at space ${player.position}`} style={{...tokenCoordinates(position??player.position,index),color:player.color}}><TokenArt character={CHARACTERS.find(c=>c.id===player.character)} size={24}/></div>;}
