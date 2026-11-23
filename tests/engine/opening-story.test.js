// @vitest-environment node
import { expect, it } from 'vitest';
import { createGame } from '../../src/game/engine/game.js';
import { openingStory } from '../../src/game/openingStory.js';

const players = [
  { id: 'you', name: 'Nova', faction: 'Jedi Order', ai: false },
  { id: 'rival', name: 'Orion', faction: 'Galactic Empire', ai: false },
];

it('gives new matches varied stories while keeping a resumed or shared match consistent', () => {
  const stories = Array.from({ length: 64 }, (_, index) =>
    openingStory(createGame(players, { id: `story-${index}` })),
  );
  expect(new Set(stories.map((story) => story.paragraphs.join(' '))).size).toBe(64);
  expect(new Set(stories.map((story) => story.title)).size).toBeGreaterThanOrEqual(6);
  const game = createGame(players, { id: 'shared-story' });
  const before = JSON.stringify(game);
  expect(openingStory(JSON.parse(before))).toEqual(openingStory(game));
  game.players[0].credits -= 200;
  game.players[0].position = 15;
  game.version++;
  expect(openingStory(game)).toEqual(openingStory(JSON.parse(before)));
});

it('uses the actual roster, allegiances, starting balance and team rules', () => {
  const story = openingStory(
    createGame(players, { id: 'teams-story', teams: true, startingCredits: 2345 }),
  );
  expect(story.commanders).toEqual(['Nova', 'Orion']);
  expect(story.teams).toEqual(['Jedi Order', 'Galactic Empire']);
  expect(story.paragraphs.join(' ')).toContain('Nova of the Jedi Order');
  expect(story.paragraphs.join(' ')).toContain('Orion of the Galactic Empire');
  expect(story.paragraphs.join(' ')).toContain('2,345 credits');
  expect(story.paragraphs.join(' ')).toContain('squadrons must stand together');
});
