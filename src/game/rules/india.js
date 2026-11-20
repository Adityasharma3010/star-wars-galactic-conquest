import { BOARD, GROUPS } from './data.js';

export const INDIA_CITIES = [
  ['Shimla', 'Himachal Pradesh'],
  ['Gangtok', 'Sikkim'],
  ['Shillong', 'Meghalaya'],
  ['Kohima', 'Nagaland'],
  ['Itanagar', 'Arunachal Pradesh'],
  ['Patna', 'Bihar'],
  ['Ranchi', 'Jharkhand'],
  ['Bhubaneswar', 'Odisha'],
  ['Bhopal', 'Madhya Pradesh'],
  ['Raipur', 'Chhattisgarh'],
  ['Lucknow', 'Uttar Pradesh'],
  ['Panaji', 'Goa'],
  ['Gandhinagar', 'Gujarat'],
  ['Jaipur', 'Rajasthan'],
  ['Thiruvananthapuram', 'Kerala'],
  ['Bengaluru', 'Karnataka'],
  ['Chennai', 'Tamil Nadu'],
  ['Hyderabad', 'Telangana'],
  ['Kolkata', 'West Bengal'],
  ['Mumbai', 'Maharashtra'],
  ['Chandigarh', 'Punjab, Haryana and Chandigarh'],
  ['New Delhi', 'India and Delhi'],
];
export const INDIA_GROUPS = GROUPS.map((group, index) => ({
  ...group,
  name: [
    'Hill Capitals',
    'Northeast Capitals',
    'Eastern Capitals',
    'Heartland Capitals',
    'Western Capitals',
    'Southern Capitals',
    'Metropolitan Capitals',
    'Administrative Capitals',
  ][index],
}));
const specials = {
  0: ['GO', 'COLLECT 200'],
  2: ['Community Chest'],
  4: ['Income Tax'],
  5: ['Northern Railway'],
  7: ['Chance'],
  10: ['Jail', 'JUST VISITING'],
  12: ['Electric Company'],
  15: ['Eastern Railway'],
  17: ['Community Chest'],
  20: ['Free Parking', 'TAKE A BREAK'],
  22: ['Chance'],
  25: ['Southern Railway'],
  28: ['Water Works'],
  30: ['Go to Jail', 'GO DIRECTLY TO JAIL'],
  33: ['Community Chest'],
  35: ['Western Railway'],
  36: ['Chance'],
  38: ['Luxury Tax'],
};
let city = 0;
export const INDIA_BOARD = BOARD.map((tile) => {
  if (tile.type !== 'property')
    return {
      ...tile,
      mapId: 'india',
      name: specials[tile.id][0],
      label: specials[tile.id][1],
      tax: tile.id === 4 ? undefined : tile.tax,
    };
  const [name, state] = INDIA_CITIES[city++];
  return {
    ...tile,
    mapId: 'india',
    name,
    state,
    description:
      name +
      ' — capital of ' +
      state +
      '. Collect the complete color group to build houses and a hotel.',
    source: 'https://commons.wikimedia.org/wiki/Category:' + encodeURIComponent(name),
    eraNote: null,
  };
});
export const CLASSIC_TOKENS = [
  ['pill-blue', 'Blue', '#527acb', 'pill'],
  ['pill-red', 'Red', '#cf6558', 'pill'],
  ['pill-green', 'Green', '#579765', 'pill'],
  ['pill-yellow', 'Yellow', '#d6b14b', 'pill'],
  ['pill-purple', 'Purple', '#aa75c1', 'pill'],
  ['pill-orange', 'Orange', '#cf924b', 'pill'],
  ['pill-pink', 'Pink', '#cf81a4', 'pill'],
  ['pill-teal', 'Teal', '#56a8a1', 'pill'],
].map(([id, name, color, symbol]) => ({
  id,
  name,
  color,
  symbol,
  faction: 'Classic',
  available: true,
  owned: true,
}));
