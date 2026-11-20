export function openingStory(game) {
  const commanders = game.players.map((player) => player.name);
  const teams = [...new Set(game.players.map((player) => player.faction).filter(Boolean))];
  return {
    title: game.rules.teams ? 'SQUADRONS OF DESTINY' : 'A NEW CONQUEST',
    commanders,
    teams,
    paragraphs: [
      'Across the galaxy, a fragile peace gives way to a new struggle. From the dunes of Tatooine to the frozen plains of Hoth, the fate of countless worlds hangs in the balance.',
      `${game.players.map((player) => player.name + (player.faction ? ' of the ' + player.faction : '')).join(', ')} have answered the call. Their chosen banners rise as commanders prepare to forge alliances, test their courage, and build an empire of their own.`,
      `With ${game.rules.startingCredits.toLocaleString()} credits and an uncharted route before them, each commander sets course for Hyperspace. Worlds await discovery. Fortunes await the bold.`,
      'The conquest begins now. May the Force be with you…',
    ],
  };
}
