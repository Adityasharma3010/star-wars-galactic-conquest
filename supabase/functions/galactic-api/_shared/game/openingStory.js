import { BOARD } from './rules/data.js';

const campaigns = [
  [
    'THE SILENT BLOCKADE',
    'Trade lanes have fallen silent. An unseen fleet waits beyond the shipping routes, and isolated worlds search for commanders willing to break the blockade.',
  ],
  [
    'ECHOES OF THE OUTER RIM',
    'A forgotten transmission has awakened the Outer Rim. Rival powers race to uncover its origin before a distant warning becomes a threat to every inhabited world.',
  ],
  [
    'THE FRACTURED ALLIANCE',
    'An uneasy alliance has collapsed. Without its protection, independent worlds must choose new partners while rival commanders compete to unite the scattered systems.',
  ],
  [
    'SHADOWS OVER HYPERSPACE',
    'Navigation beacons are going dark. With safe passages disappearing, the galaxy depends on a handful of commanders to secure new routes before whole systems vanish from the charts.',
  ],
  [
    'THE LOST CONVOY',
    'A relief convoy has disappeared between the stars. Its final signal points toward disputed territory, where every rescue mission risks becoming a struggle for control.',
  ],
  [
    'A FRONTIER REBORN',
    'Beyond the familiar trade lanes, a new frontier opens. Worlds long overlooked now hold the key to prosperity, and every faction hopes to shape the order that will follow.',
  ],
  [
    'THE EMBER REBELLION',
    'Small acts of resistance have become a movement. Across divided systems, new leaders rise while established powers gather their resources to decide the future of the frontier.',
  ],
  [
    'STORM AT THE GALACTIC CROSSROADS',
    'A gathering conflict threatens the galaxy’s busiest crossroads. Whoever controls these routes will decide which worlds flourish and which are left beyond the reach of help.',
  ],
];
const signals = [
  'A coded distress call slips through the listening posts.',
  'Smugglers carry a warning that no government will acknowledge.',
  'An ancient beacon lights for the first time in generations.',
  'A scout returns with charts that could change the balance of power.',
  'Whispers of a secret pact reach the frontier’s crowded ports.',
  'A sudden shift in the Force draws attention to the coming struggle.',
];
const approaches = [
  'Careful bargains may open doors that fleets cannot. Every new holding brings influence, but every promise creates a rival watching for weakness.',
  'The first expedition could determine the balance of power. Build strongholds, protect your resources, and choose the moment to challenge an opponent.',
  'Diplomacy and daring will matter in equal measure. A trusted ally may secure a passage; an unexpected rival may offer the bargain that changes everything.',
  'Information travels faster than warships. Watch the movements of your rivals, strengthen your position, and turn a narrow opportunity into a lasting advantage.',
  'Fortune favors commanders who can adapt. A quiet world may become a refuge, a busy route a lifeline, and a costly setback the beginning of a comeback.',
  'No single plan can survive every encounter. Manage your supplies, build where you are strongest, and keep a path open when the galaxy turns against you.',
];
const endings = [
  'The stars offer no promises. The next chapter belongs to those brave enough to write it.',
  'Engines ignite, banners rise, and the waiting worlds turn toward their new arrivals.',
  'Beyond the next jump lies a choice that could reshape the frontier. Your command begins now.',
  'Old loyalties will be tested. New legends will emerge. The galaxy awaits your first move.',
  'A thousand possibilities lie along the route ahead. Choose your allies and chart your own destiny.',
  'The final orders have been given. Set your course, trust your instincts, and answer the call.',
];

// Select a stable story without consuming gameplay randomness or changing on refresh.
function storyRandom(id) {
  let seed = 2166136261;
  for (const character of String(id)) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function openingStory(game) {
  const random = storyRandom(game.id);
  const choose = (items) => items[Math.floor(random() * items.length)];
  const [title, conflict] = choose(campaigns);
  const worlds = BOARD.filter((tile) => tile.type === 'property').map((tile) => tile.name);
  const origin = choose(worlds);
  const destination = choose(worlds.filter((world) => world !== origin));
  const commanders = game.players.map((player) => player.name);
  const teams = [...new Set(game.players.map((player) => player.faction).filter(Boolean))];
  const roster = game.players
    .map((player) => player.name + (player.faction ? ' of the ' + player.faction : ''))
    .join(', ');
  return {
    title,
    commanders,
    teams,
    paragraphs: [
      `${conflict} ${choose(signals)} From ${origin} to ${destination}, preparations begin.`,
      `${roster} have answered the call. ${game.rules.teams ? 'Their squadrons must stand together: shared routes, shared risks, and a victory no commander can claim alone.' : 'Each carries a different vision for the galaxy. Their chosen banners rise as allies and rivals prepare to test those visions.'}`,
      `With ${game.rules.startingCredits.toLocaleString()} credits, the commanders set course for Hyperspace. ${choose(approaches)}`,
      `${choose(endings)} May the Force be with you…`,
    ],
  };
}
