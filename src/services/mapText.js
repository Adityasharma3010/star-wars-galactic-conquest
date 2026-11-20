import { useGameStore } from '../stores/gameStore.js';
import { isClassic } from '../game/maps.js';
export function mapText(text) {
  const state = useGameStore.getState();
  const context = ['newGame', 'rooms'].includes(state.modal)
    ? state.selectedMap
    : state.playing
      ? state.game
      : state.selectedMap;
  if (!isClassic(context)) return text;
  const words = [
    ['◈', '₹'],
    ['credits', 'rupees'],
    ['Credits', 'Rupees'],
    ['CREDITS', 'RUPEES'],
    ['CR', '₹'],
    ['GALACTIC COMMAND / SECURE CHANNEL', 'INDIA / GAME ROOM'],
    ['GALACTIC RADIO', 'BACKGROUND MUSIC'],
    ['Galactic radio', 'Background music'],
    ['Galactic playlist', 'Classic playlist'],
    ['Galactic negotiations', 'Property negotiations'],
    ['OUTER RIM EXCHANGE', 'PROPERTY EXCHANGE'],
    ['SECURE HOLOLINK', 'PRIVATE ROOM'],
    ['Imperial Tax', 'Income Tax'],
    ['Force and Galactic Events', 'Chance and Community Chest'],
    ['GALACTIC ECONOMY', 'CLASSIC ECONOMY'],
    ['Galactic economy', 'Classic economy'],
    ['Planetary development', 'Property development'],
    ['planetary base', 'hotel'],
    ['Planetary base', 'Hotel'],
    ['PLANETARY BASE', 'HOTEL'],
    ['outposts', 'houses'],
    ['outpost', 'house'],
    ['OUTPOSTS', 'HOUSES'],
    ['OUTPOST', 'HOUSE'],
    ['Outpost / base cost', 'House / hotel cost'],
    ['Outpost', 'House'],
    ['BASES', 'HOTELS'],
    ['bases', 'hotels'],
    ['Hyperspace', 'GO'],
    ['HYPERSPACE', 'GO'],
    ['Free Orbit', 'Free Parking'],
    ['detention', 'jail'],
    ['DETENTION', 'JAIL'],
    ['Detention', 'Jail'],
    ['WORLDS', 'CITIES'],
    ['worlds', 'cities'],
    ['world', 'city'],
    ['Worlds', 'Cities'],
    ['YOUR EMPIRE', 'YOUR PROPERTIES'],
    ['EMPIRE', 'PROPERTIES'],
    ['galactic empire', 'property portfolio'],
    ['commander', 'player'],
    ['Commander', 'Player'],
    ['COMMANDERS', 'PLAYERS'],
    ['conquest', 'match'],
    ['Conquest', 'Match'],
    ['galaxy', 'board'],
    ['GALAXY', 'BOARD'],
    ['AGE OF REBELLION', 'INDIAN CITY CAPITALS'],
  ];
  for (const [from, to] of words) text = text.replaceAll(from, to);
  return text;
}
