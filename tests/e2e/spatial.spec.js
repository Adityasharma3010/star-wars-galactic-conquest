import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
import { tokensFor, boardFor } from '../../src/game/maps.js';
test.setTimeout(120000);

const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state);
async function load(page, mapId, { purchase = false, reduced = true } = {}) {
  const game = createGame(
    tokensFor(mapId)
      .slice(0, 4)
      .map((token, index) => ({
        id: index ? `rival-${index}` : 'you',
        name: index ? `Rival ${index}` : 'Spatial Pilot',
        character: token.id,
        color: token.color,
        faction: token.faction,
        ai: false,
      })),
    { id: `spatial-${mapId}`, mapId },
  );
  game.ownership[1] = { owner: 'you', level: 2, mortgaged: false };
  game.ownership[3] = { owner: purchase ? 'rival-1' : 'you', level: 0, mortgaged: false };
  if (purchase) {
    delete game.ownership[3];
    game.phase = 'purchase';
    game.pendingProperty = 3;
    game.players[0].position = 3;
  }
  await page.addInitScript(
    ({ game, reduced }) => {
      if (!localStorage.getItem('galactic-conquest-v1'))
        localStorage.setItem(
          'galactic-conquest-v1',
          JSON.stringify({
            version: 1,
            state: {
              game,
              playing: true,
              boardView: '2d',
              selected: 3,
              selectedMap: game.rules.mapId,
              profile: { name: 'Spatial Pilot', character: game.players[0].character },
              settings: { mute: true, reducedMotion: reduced },
            },
          }),
        );
    },
    { game, reduced },
  );
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toBeVisible();
  return game;
}
async function spatial(page) {
  await page.getByRole('button', { name: '3D view', exact: true }).click();
  await expect(page.getByTestId('board-3d')).toHaveAttribute('data-ready', 'true', {
    timeout: 25000,
  });
}

for (const mapId of ['galactic-conquest', 'india'])
  test(`${mapId}: clicking dice in 2D and the 3D scene commits one legal roll`, async ({
    page,
  }) => {
    const initial = await load(page, mapId);
    for (const view of ['2d', '3d']) {
      if (view === '3d') {
        await page.evaluate(
          (game) =>
            localStorage.setItem(
              'galactic-conquest-v1',
              JSON.stringify({
                version: 1,
                state: {
                  game,
                  playing: true,
                  boardView: '3d',
                  selected: 3,
                  settings: { mute: true, reducedMotion: true },
                },
              }),
            ),
          initial,
        );
        await page.reload();
        await expect(page.getByTestId('board-3d')).toHaveAttribute('data-ready', 'true', {
          timeout: 25000,
        });
      }
      await page.evaluate(() => {
        const original = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = (array) =>
          array instanceof Uint32Array && array.length === 1
            ? array.fill(Math.floor(0.81 * 4294967296))
            : original(array);
      });
      if (view === '2d') {
        const dice = page.getByRole('button', { name: 'Roll by clicking dice' });
        await dice.focus();
        await page.keyboard.press('Enter');
      } else {
        await page.getByRole('button', { name: 'Top view of 3D board' }).click();
        await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-camera-view', 'top');
        const box = await page.getByTestId('three-canvas').boundingBox();
        const point = await page.locator('.spatial-renderer').evaluate((node) => ({
          x: Number(node.dataset.diceX),
          y: Number(node.dataset.diceY),
        }));
        const x = box.x + point.x,
          y = box.y + point.y;
        await page.mouse.click(x, y);
        await expect.poll(async () => (await saved(page)).game.version).toBe(initial.version + 1);
        await page.mouse.click(x, y);
      }
      await expect.poll(async () => (await saved(page)).game.version).toBe(initial.version + 1);
      expect((await saved(page)).game.dice).toEqual([5, 5]);
      await expect(page.getByRole('button', { name: 'Roll by clicking dice' })).toBeDisabled();
    }
  });

for (const mapId of ['galactic-conquest', 'india'])
  test(`${mapId}: real 3D images, orbit/picking, owner highlighting, independent view persistence`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await load(page, mapId);
    const before = (await saved(page)).game;
    await spatial(page);
    await expect(page.getByTestId('board-3d')).toHaveAttribute(
      'data-presentation',
      mapId === 'india' ? 'tabletop' : 'holochess',
    );
    await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-physical-tiles', '40');
    await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-pawn-models', '4');
    await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-development-models', '2');
    await expect(page.locator('.spatial-renderer')).toHaveAttribute(
      'data-loaded-photos',
      mapId === 'india' ? '22' : '26',
      { timeout: 45000 },
    );
    const board = boardFor(mapId),
      canvas = page.getByTestId('three-canvas');
    expect((await canvas.boundingBox()).height).toBeGreaterThan(300);
    await page.getByRole('button', { name: 'Top view of 3D board' }).click();
    await page.locator('.spatial-directory summary').click();
    await page
      .locator('.spatial-directory')
      .getByRole('button', { name: board[1].name, exact: true })
      .click();
    await expect(page.locator('.spatial-location-badge strong')).toHaveText(board[1].name);
    const point = await page.locator('.spatial-location-badge').evaluate((node) => {
      return { x: parseFloat(node.style.left), y: parseFloat(node.style.top) };
    });
    await page
      .locator('.spatial-directory')
      .getByRole('button', { name: board[39].name, exact: true })
      .click();
    await page.locator('.spatial-directory summary').click();
    await canvas.scrollIntoViewIfNeeded();
    const currentBounds = await canvas.boundingBox();
    await page.mouse.click(currentBounds.x + point.x, currentBounds.y + point.y);
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-selected-tile', '1');
    await page.getByRole('button', { name: `Open ${board[1].name} deed` }).click();
    await expect(page.getByRole('dialog')).toContainText(board[1].name);
    await page.getByLabel('Close dialog').click();
    const top = await canvas.screenshot();
    await page.getByRole('button', { name: 'Zoom in on 3D board' }).click();
    expect((await canvas.screenshot()).equals(top)).toBe(false);
    await page.getByRole('button', { name: 'Reset 3D camera' }).click();
    const reset = await canvas.screenshot(),
      bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2 - 25, {
      steps: 12,
    });
    await page.mouse.up();
    expect((await canvas.screenshot()).equals(reset)).toBe(false);
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-selected-tile', '1');
    await page.locator('[data-player-card="rival-1"]').hover();
    await expect(page.locator('.spatial-hover')).toContainText(`Rival 1 · ${board[0].name}`);
    await page.getByRole('button', { name: "Highlight Spatial Pilot's worlds" }).click();
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-owner-filter', 'you');
    await page.getByRole('button', { name: '2D view', exact: true }).click();
    await expect(page.getByTestId('game-board')).toBeVisible();
    await expect(page.locator('[data-tile="1"]')).toHaveClass(/owner-emphasis/);
    expect((await saved(page)).game).toEqual(before);
    await spatial(page);
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-ready', 'true', {
      timeout: 25000,
    });
    expect((await saved(page)).boardView).toBe('3d');
    expect((await saved(page)).game).toEqual(before);
    await expect(page.locator('.opening-sequence')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

test('3D purchase and development commit once; repeated switches and context loss preserve the match', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const game = await load(page, 'galactic-conquest', { purchase: true, reduced: false });
  await spatial(page);
  await page.getByRole('button', { name: 'Acquire Jakku', exact: true }).click();
  await expect.poll(async () => (await saved(page)).game.ownership[3]?.owner).toBe('you');
  let committed = (await saved(page)).game;
  expect(committed.version).toBe(game.version + 1);
  expect(committed.players[0].credits).toBe(1440);
  await page.getByRole('button', { name: 'Develop', exact: true }).click();
  await expect.poll(async () => (await saved(page)).game.ownership[3].level).toBe(1);
  committed = (await saved(page)).game;
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: '2D view', exact: true }).click();
    await expect(page.locator('[data-tile="3"] .development')).toBeVisible();
    await spatial(page);
    expect((await saved(page)).game).toEqual(committed);
  }
  await page
    .getByTestId('three-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: '3D view is unavailable' }),
  ).toBeVisible();
  expect((await saved(page)).game).toEqual(committed);
  expect(errors).toEqual([]);
});

test('3D can be switched during a roll without replaying or duplicating the committed move', async ({
  page,
}) => {
  await load(page, 'india', { reduced: false });
  await spatial(page);
  // Keep the actual Roll control deterministic without reaching into the app store.
  await page.evaluate(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) =>
      array instanceof Uint32Array && array.length === 1
        ? array.fill(Math.floor(0.81 * 4294967296))
        : original(array);
  });
  await page.getByRole('button', { name: 'Roll dice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Travelling…' })).toBeVisible();
  const committed = (await saved(page)).game;
  expect(committed.dice).toEqual([5, 5]);
  await page.getByRole('button', { name: '2D view', exact: true }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Travelling…' })).toHaveCount(0);
  await spatial(page);
  await expect(page.getByRole('button', { name: 'Travelling…' })).toHaveCount(0);
  expect((await saved(page)).game).toEqual(committed);
});

test('the 3D table and roll controls fit laptop, tablet and mobile; focus view enlarges the table', async ({
  page,
}) => {
  await load(page, 'galactic-conquest');
  await spatial(page);
  for (const [width, height] of [
    [1366, 768],
    [820, 1180],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const canvas = await page.getByTestId('three-canvas').boundingBox();
    const button = await page.getByRole('button', { name: 'Roll dice', exact: true }).boundingBox();
    expect(canvas.width).toBeGreaterThan(300);
    expect(canvas.height).toBeGreaterThanOrEqual(250);
    await page.screenshot({ path: `test-results/spatial-layout-${width}.png`, fullPage: true });
    expect(button.y + button.height).toBeLessThan(width < 700 ? height - 48 : height);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  const normal = await page.getByTestId('three-canvas').boundingBox();
  await page.getByRole('button', { name: 'Expand board' }).click();
  await expect(page.locator('.board-expanded')).toBeVisible();
  const expanded = await page.getByTestId('three-canvas').boundingBox();
  expect(expanded.width).toBeGreaterThan(normal.width + 200);
  expect(expanded.height).toBeGreaterThan(normal.height + 100);
  await page.getByRole('button', { name: 'Close focus view' }).click();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
});

test('a browser without WebGL keeps the game playable in 2D', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...args);
    };
  });
  await load(page, 'india');
  const before = (await saved(page)).game;
  await page.getByRole('button', { name: '3D view', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '3D view is unavailable' }),
  ).toBeVisible();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
  expect((await saved(page)).game).toEqual(before);
});
