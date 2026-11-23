import { test, expect } from '@playwright/test';
import { selectChoice } from './helpers.js';
import { createGame } from '../../src/game/engine/game.js';
import { CLASSIC_TOKENS } from '../../src/game/rules/india.js';

test('India setup preserves custom tax settings, uses pill colors and launches without an opening crawl', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/maps/default');
  await expect(page.getByRole('heading', { name: 'India', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect(page.locator('.character-grid .color-pill')).toHaveCount(8);
  await expect(page.getByLabel('ALLEGIANCE')).toHaveCount(0);
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await selectChoice(page, 'INCOME TAX BASIS', 'wealth');
  await page.getByLabel('STARTING RUPEES').fill('2345');
  await page.getByLabel('Close dialog').click();
  await page.reload();
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect(page.getByLabel('STARTING RUPEES')).toHaveValue('2345');
  await expect(page.getByLabel('INCOME TAX BASIS')).toHaveAttribute('data-value', 'wealth');
  await page.getByRole('button', { name: 'Reset rules' }).click();
  await expect(page.getByLabel('INCOME TAX BASIS')).toHaveAttribute('data-value', 'cash');
  await selectChoice(page, 'INCOME TAX BASIS', 'wealth');
  await page.getByRole('button', { name: 'Launch match' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toHaveCount(0);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game,
  );
  expect(saved.rules).toMatchObject({ mapId: 'india', taxBasis: 'wealth' });
  expect(
    saved.players.every(
      (player) => player.character.startsWith('pill-') && player.faction === 'Classic',
    ),
  ).toBe(true);
  await expect(page.locator('[data-tile]')).toHaveCount(40);
  await expect(page.locator('[data-tile="4"]')).toContainText('10% WEALTH');
  await expect(page.locator('[data-tile="38"]')).toContainText('₹');
  await expect
    .poll(() =>
      page
        .locator('.board-tile.property img')
        .evaluateAll(
          (images) =>
            images.length === 22 &&
            images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/india-board-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('India ownership, houses, deed and trades stay readable at desktop, tablet and mobile sizes', async ({
  page,
}) => {
  const game = createGame(
    CLASSIC_TOKENS.slice(0, 2).map((token, i) => ({
      id: i ? 'friend' : 'you',
      name: i ? 'City Rival' : 'India Player',
      character: token.id,
      color: token.color,
      faction: 'Classic',
      ai: false,
    })),
    { id: 'india-visual-qa', mapId: 'india', now: Date.now() },
  );
  game.ownership[1] = { owner: 'you', level: 2, mortgaged: false };
  game.ownership[3] = { owner: 'you', level: 2, mortgaged: false };
  game.ownership[6] = { owner: 'friend', level: 0, mortgaged: false };
  game.phase = 'end';
  await page.addInitScript(
    (game) =>
      localStorage.setItem(
        'galactic-conquest-v1',
        JSON.stringify({
          version: 1,
          state: {
            game,
            playing: true,
            online: false,
            selectedMap: 'india',
            selected: 1,
            profile: { name: 'India Player', character: 'pill-blue', faction: 'Classic' },
            settings: { mute: true, reducedMotion: true },
          },
        }),
      ),
    game,
  );
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.locator('[data-tile="1"] .development')).toHaveAttribute(
    'aria-label',
    '2 houses',
  );
  await expect(page.locator('.property-panel')).toContainText('Shimla');
  await expect(page.locator('.property-panel')).toContainText('₹');
  await page.getByRole('button', { name: 'Propose a trade', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('₹');
  await page.screenshot({ path: 'test-results/india-trade.png', fullPage: true });
  await page.getByLabel('Close dialog').click();
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/india-board-${width}.png`, fullPage: true });
  }
});
