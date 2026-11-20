import { selectChoice } from './helpers.js';
import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
import { getCard } from '../../src/game/cards/decks.js';

test('account and profile dialogs fit desktop/mobile and retain usable callsign editing', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('.profile-button').click();
  await expect(page.getByLabel('CALLSIGN')).toBeVisible();
  expect((await page.getByRole('dialog').boundingBox()).width).toBeLessThanOrEqual(591);
  await page.getByLabel('CALLSIGN').fill('Nova Pilot');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('button', { name: 'Profile saved' })).toBeVisible();
  await expect(page.locator('.profile-button')).toContainText('Nova Pilot');
  await page.screenshot({ path: 'test-results/profile-compact.png', fullPage: true });
  await page.getByRole('button', { name: 'Online account' }).click();
  await expect(page.getByLabel('GUEST CALLSIGN')).toHaveValue('Nova Pilot');
  expect((await page.getByRole('dialog').boundingBox()).width).toBeLessThanOrEqual(451);
  await page.screenshot({ path: 'test-results/account-compact.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Continue as online guest' })).toBeVisible();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(10);
  expect(box.x + box.width).toBeLessThanOrEqual(380);
  await page.screenshot({ path: 'test-results/account-compact-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('personalized wide opening plays the original theme with a hidden player, skips cleanly, and does not replay', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByLabel('COMMANDER NAME').fill('Nova Pilot');
  await selectChoice(page, 'ALLEGIANCE', 'Jedi Order');
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toHaveCount(0);
  await expect(page.locator('.opening-title')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'test-results/opening-title.png', fullPage: true });
  await expect(page.locator('.opening-crawl')).toContainText('Nova Pilot of the Jedi Order', {
    timeout: 10000,
  });
  expect(
    await page.locator('.opening-crawl').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('opening-crawl');
  const theme = page.locator('.original-theme-panel');
  await expect(theme.locator('iframe')).toBeAttached({ timeout: 20000 });
  await expect(theme).toBeHidden();
  await expect(theme).not.toHaveAttribute('data-playback', 'loading', { timeout: 20000 });
  const play = page.locator('.original-theme-retry');
  if (await play.count()) await play.click();
  await expect(theme).toHaveAttribute('data-playback', 'playing', { timeout: 30000 });
  await expect(theme.locator('iframe')).toHaveAttribute('src', /e9lapdvLSGw/);
  const crawlSize = await page
    .locator('.opening-crawl')
    .evaluate((el) => ({ width: el.clientWidth, font: parseFloat(getComputedStyle(el).fontSize) }));
  expect(crawlSize.width).toBeGreaterThan(1000);
  expect(crawlSize.font).toBeGreaterThanOrEqual(40);
  await page.waitForTimeout(6500);
  await page.screenshot({ path: 'test-results/opening-crawl.png', fullPage: true });
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.locator('.original-theme-panel iframe')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reduced-motion opening stays readable with a manual entry button on mobile', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByLabel('COMMANDER NAME').fill('Sky Pilot');
  await selectChoice(page, 'ALLEGIANCE', 'Rebel Alliance');
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await expect(page.getByRole('button', { name: 'Enter the galaxy' })).toBeVisible({
    timeout: 10000,
  });
  expect(
    await page.locator('.opening-crawl').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/opening-static-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Enter the galaxy' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
});

test('AI missions are informational and another commander debt does not open human financing', async ({
  page,
}) => {
  // Keep the AI from resolving its debt before the observer assertions finish.
  await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-20T12:00:01Z'));
  const game = createGame([
    { id: 'you', name: 'Nova', character: 'luke', ai: false },
    { id: 'ai', name: 'Vader', character: 'vader', ai: true },
  ]);
  game.phase = 'debt';
  game.debt = { payer: 'ai', amount: 100, creditor: null };
  game.ownership[1] = { owner: 'you', level: 0, mortgaged: false };
  await page.addInitScript(
    (state) => localStorage.setItem('galactic-conquest-v1', JSON.stringify({ state, version: 1 })),
    {
      game,
      playing: true,
      online: false,
      selected: 1,
      settings: { mute: true, reducedMotion: true },
      observedEvent: {
        id: 'observer',
        card: getCard('f1'),
        player: game.players[1],
        readyAt: 0,
      },
    },
  );
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.locator('.mission-transmission')).toContainText('The mission belongs to Vader');
  await expect(page.getByRole('button', { name: 'Continue mission' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Waiting for Vader', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Mortgage', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/observer-transmission.png', fullPage: true });
});
