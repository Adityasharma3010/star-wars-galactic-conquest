import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
test('fresh visits show the menu and create a match only after launch', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'GALACTIC CONQUEST' })).toBeVisible();
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Browse maps' })).toBeVisible();
  await page.screenshot({ path: 'test-results/welcome-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/welcome-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect(page.getByRole('button', { name: 'Launch conquest' })).toBeVisible();
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.locator('[data-token]')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
test('local saves return to the menu and resume without losing progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await page.getByLabel('Galactic Conquest main menu').click();
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume saved game' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
});
test('the old automatic bot preview is removed without clearing the callsign', async ({ page }) => {
  const game = createGame([
    { id: 'you', name: 'Sky Pilot', character: 'luke', ai: false },
    ...['ai-vader', 'ai-leia', 'ai-han'].map((id, i) => ({
      id,
      name: 'Old Bot ' + i,
      character: ['vader', 'leia', 'han'][i],
      ai: true,
    })),
  ]);
  await page.addInitScript(
    (state) => localStorage.setItem('galactic-conquest-v1', JSON.stringify({ state, version: 1 })),
    {
      game,
      online: false,
      profile: { name: 'Sky Pilot', character: 'luke', faction: 'Rebel Alliance' },
      settings: { mute: true, reducedMotion: true },
    },
  );
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume saved game' })).toHaveCount(0);
  await expect(page.locator('.profile-button')).toContainText('Sky Pilot');
  await page.locator('.profile-button').click();
  await expect(page.getByLabel('CALLSIGN')).toHaveValue('Sky Pilot');
});
