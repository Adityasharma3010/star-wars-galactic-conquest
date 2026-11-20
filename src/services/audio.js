import {
  playSound as starSound,
  setAtmosphere as starAtmosphere,
  preloadAudio,
} from './starWarsAudio.js';
import { playClassicSound } from './classicAudio.js';
import { useGameStore } from '../stores/gameStore.js';
import { isClassic } from '../game/maps.js';
const classic = () => {
  const state = useGameStore.getState();
  return isClassic(state.playing ? state.game : state.selectedMap);
};
export const playSound = (kind, settings) =>
  classic() ? playClassicSound(kind, settings) : starSound(kind, settings);
export const setAtmosphere = (settings) =>
  starAtmosphere(classic() ? { ...settings, ambience: false } : settings);
export const restoreSounds = () => (classic() ? Promise.resolve() : preloadAudio());
