export const MAP_CATEGORIES = [
  {
    id: 'star-wars',
    name: 'Star Wars',
    description: 'Iconic worlds, chosen allegiances and a galaxy to conquer.',
  },
  {
    id: 'default',
    name: 'Default',
    description: 'Classic Monopoly boards, houses, hotels and familiar city streets.',
  },
];

export const GAME_MAPS = [
  {
    id: 'galactic-conquest',
    category: 'star-wars',
    name: 'Galactic Conquest',
    sectors: 40,
    worlds: 22,
    events: 24,
    theme: 'star-wars',
    intro: true,
  },
  {
    id: 'india',
    category: 'default',
    name: 'India',
    sectors: 40,
    worlds: 22,
    events: 24,
    theme: 'default',
    intro: false,
  },
];
import { BOARD, GROUPS, CHARACTERS } from './rules/data.js';
import { INDIA_BOARD, INDIA_GROUPS, CLASSIC_TOKENS } from './rules/india.js';
export function mapFor(value) {
  const id = typeof value === 'string' ? value : value?.rules?.mapId || value?.mapId;
  return GAME_MAPS.find((map) => map.id === id) || GAME_MAPS[0];
}
export const boardFor = (value) => (mapFor(value).id === 'india' ? INDIA_BOARD : BOARD);
export const groupsFor = (value) => (mapFor(value).id === 'india' ? INDIA_GROUPS : GROUPS);
export const tokensFor = (value) =>
  mapFor(value).theme === 'default' ? CLASSIC_TOKENS : CHARACTERS;
export const isClassic = (value) => mapFor(value).theme === 'default';
