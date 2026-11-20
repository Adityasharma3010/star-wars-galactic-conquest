import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
import { tokensFor, boardFor } from '../../src/game/maps.js';

async function load(page, mapId = 'galactic-conquest', purchase = false) {
  const tokens = tokensFor(mapId);
  const game = createGame(
    tokens.slice(0, 2).map((token, index) => ({
      id: index ? 'rival' : 'you',
      name: index ? 'Rival' : 'Motion Pilot',
      character: token.id,
      color: token.color,
      faction: token.faction,
      ai: false,
    })),
    { id: 'experience-test-' + mapId, mapId },
  );
  if (purchase) {
    game.phase = 'purchase';
    game.pendingProperty = 3;
    game.players[0].position = 3;
  }
  await page.addInitScript((game) => {
    if (!localStorage.getItem('galactic-conquest-v1'))
      localStorage.setItem(
        'galactic-conquest-v1',
        JSON.stringify({
          version: 1,
          state: {
            game,
            playing: true,
            online: false,
            selected: 3,
            selectedMap: game.rules.mapId,
            profile: { name: 'Motion Pilot' },
            settings: { mute: true, reducedMotion: false },
          },
        }),
      );
  }, game);
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.locator('[data-tile="3"]')).toHaveCSS('opacity', '1');
  return game;
}

test('a purchase animates the claimed property and cash without changing its committed result', async ({
  page,
}) => {
  const game = await load(page, 'galactic-conquest', true);
  // Record the short effect while it runs; remote browser latency can outlast it.
  await page.evaluate(() => {
    const began = performance.now();
    window.purchasePulse = 0;
    const sample = () => {
      const pulse = document.querySelector('[data-tile="3"] .tile-pulse');
      if (pulse)
        window.purchasePulse = Math.max(
          window.purchasePulse,
          Number(getComputedStyle(pulse).opacity),
        );
      if (performance.now() - began < 5000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole('button', { name: 'Acquire Jakku', exact: true }).click();
  await expect(page.locator('[data-tile="3"] .owner-sigil')).toBeVisible();
  await expect(page.locator('.balance-change.loss')).toContainText('60');
  await expect.poll(() => page.evaluate(() => window.purchasePulse)).toBeGreaterThan(0);
  await expect(page.locator('.commander-stats .animated-balance').first()).toHaveAttribute(
    'aria-label',
    '1,440',
  );
  await expect(page.locator('.commander-stats .animated-balance > span').first()).toHaveText(
    '1,440',
  );
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game,
  );
  expect(state.version).toBe(game.version + 1);
  expect(state.ownership[3].owner).toBe('you');
  expect(state.players[0].credits).toBe(1440);
  await expect(page.locator('.balance-change')).toHaveCount(0, { timeout: 3000 });
});

for (const mapId of ['galactic-conquest', 'india']) {
  test(`${mapId} has a real interactive sector scene, live motion and a working reduced-motion setting`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await load(page, mapId);
    const board = boardFor(mapId);
    await page.getByRole('button', { name: 'Explore ' + board[21].name, exact: true }).click();
    await expect(page.locator('.scene-destination')).toContainText(board[21].name);
    await expect(page.locator('.property-panel')).toContainText(board[21].name);
    await expect
      .poll(() =>
        page
          .locator('.scene-landscape img')
          .last()
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await expect(page.locator('.active-token .token-aura')).toHaveCSS(
      'animation-name',
      'token-beacon',
    );
    await page.getByRole('button', { name: 'Inspect ' + board[21].name, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(board[21].name);
    await page.getByLabel('Close dialog').click();
    await page.getByLabel('Open settings').click();
    await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
    await page.getByLabel('Close dialog').click();
    await expect(page.locator('.app-shell')).toHaveClass(/motion-reduced/);
    await expect(page.locator('.active-token .token-aura')).toHaveCSS('animation-name', 'none');
    await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
