import { test, expect } from '@playwright/test';
import { selectChoice } from './helpers.js';

async function changeMap(page, name) {
  await page.getByRole('dialog').getByRole('button', { name: 'Browse maps' }).click();
  await page
    .getByRole('group', { name: 'Available board maps' })
    .getByRole('button', { name: new RegExp(name) })
    .click();
}

test('maps, appearance and rules share one setup and retain per-map drafts on desktop and mobile', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'GALACTIC CONQUEST' })).toBeVisible();
  await page.screenshot({ path: '.supabase/menu-home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Play locally', exact: true }).click();
  await expect
    .poll(async () => (await page.getByRole('dialog').boundingBox()).width)
    .toBeGreaterThan(1000);
  await page.getByLabel('COMMANDER NAME', { exact: true }).fill('Star Pilot');
  await page.getByRole('button', { name: 'Select Darth Vader', exact: true }).click();
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.getByLabel('STARTING CREDITS').fill('2345');
  await page.getByRole('dialog').getByRole('button', { name: 'Browse maps' }).click();
  await page.screenshot({ path: '.supabase/menu-map-picker-desktop.png', fullPage: true });
  await page
    .getByRole('group', { name: 'Available board maps' })
    .getByRole('button', { name: /India/ })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByLabel('ALLEGIANCE')).toHaveCount(0);
  await page.getByLabel('COMMANDER NAME', { exact: true }).fill('City Pilot');
  await page.getByRole('button', { name: 'Select Red', exact: true }).click();
  await changeMap(page, 'Galactic Conquest');
  await expect(page.getByLabel('COMMANDER NAME', { exact: true })).toHaveValue('Star Pilot');
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('2345');
  await expect(page.getByRole('button', { name: 'Select Darth Vader' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: '.supabase/menu-setup-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Save setup' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport();
  expect(
    await page.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: '.supabase/menu-setup-mobile.png', fullPage: true });
  await changeMap(page, 'India');
  await expect(page.getByLabel('COMMANDER NAME', { exact: true })).toHaveValue('City Pilot');
  await expect(page.getByRole('button', { name: 'Select Red' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Save setup' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.screenshot({ path: '.supabase/menu-home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Play locally', exact: true }).click();
  await expect(page.getByLabel('COMMANDER NAME', { exact: true })).toHaveValue('City Pilot');
  await page.getByRole('button', { name: 'Launch match' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a host switches the waiting-room map in place, guests follow after Save, and readiness starts that map', async ({
  browser,
}) => {
  test.setTimeout(150000);
  const contexts = await Promise.all(
    [0, 1].map(() => browser.newContext({ viewport: { width: 1440, height: 900 } })),
  );
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  const errors = [];
  for (const page of [host, guest]) page.on('pageerror', (e) => errors.push(e.message));
  try {
    await host.goto('/');
    await host.getByRole('button', { name: 'Create private game' }).click();
    await expect(host.getByRole('checkbox', { name: /Private/ })).toBeChecked();
    await host.getByLabel('YOUR CALLSIGN', { exact: true }).fill('QA Map Host');
    await host.getByLabel('ROOM NAME', { exact: true }).fill('QA unified map picker');
    await selectChoice(host, 'ROOM CAPACITY', '4');
    await host.screenshot({ path: '.supabase/menu-room-browser-desktop.png', fullPage: true });
    await host.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(host.locator('.room-code > strong')).toBeVisible({ timeout: 20000 });
    expect((await host.getByRole('dialog').boundingBox()).width).toBeGreaterThan(1200);
    const code = await host.locator('.room-code > strong').innerText();
    await guest.goto('/');
    await guest.getByRole('button', { name: 'Online multiplayer', exact: true }).click();
    await guest.getByLabel('YOUR CALLSIGN', { exact: true }).fill('QA Map Guest');
    await guest.getByLabel('Room invite code', { exact: true }).fill(code);
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(guest.locator('.room-code > strong')).toHaveText(code, { timeout: 20000 });
    await expect(
      guest.getByRole('dialog').getByRole('button', { name: 'Browse maps' }),
    ).toHaveCount(0);
    await changeMap(host, 'India');
    await expect(host.getByRole('button', { name: 'Toggle ready' })).toBeDisabled();
    await expect(host.getByRole('button', { name: 'Start match' })).toBeDisabled();
    await expect(guest.getByRole('dialog').locator('.board-map-setting')).toContainText(
      'Galactic Conquest',
    );
    await host.waitForTimeout(6000);
    await expect(host.getByRole('dialog').locator('.board-map-setting')).toContainText('India');
    await host.getByRole('button', { name: 'Save room rules & reset readiness' }).click();
    await expect(host.locator('.rule-draft-status')).toContainText('These rules are applied', {
      timeout: 20000,
    });
    await expect(guest.getByRole('dialog').locator('.board-map-setting')).toContainText('India', {
      timeout: 20000,
    });
    await expect(guest.getByLabel('YOUR TOKEN COLOR')).toHaveAttribute('data-value', /pill-/);
    await expect(
      host.getByRole('button', { name: 'Select Blue', exact: true }).locator('span'),
    ).toBeVisible();
    await selectChoice(host, 'AI PLAYERS', '0');
    await host.screenshot({ path: '.supabase/menu-waiting-room-desktop.png', fullPage: true });
    await host.setViewportSize({ width: 390, height: 844 });
    expect(
      await host.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await expect(host.getByRole('button', { name: 'Toggle ready' })).toBeInViewport();
    await host.screenshot({ path: '.supabase/menu-waiting-room-mobile.png', fullPage: true });
    await host.getByRole('button', { name: 'Toggle ready' }).click();
    await guest.getByRole('button', { name: 'Toggle ready' }).click();
    await expect(host.getByRole('button', { name: 'Start match' })).toBeEnabled({ timeout: 20000 });
    await host.getByRole('button', { name: 'Start match' }).click();
    for (const page of [host, guest]) {
      await expect(page.getByTestId('game-board')).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toHaveCount(0);
      const game = await page.evaluate(
        () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game,
      );
      expect(game.rules.mapId).toBe('india');
      expect(game.players).toHaveLength(2);
      expect(
        game.players.every((p) => p.character.startsWith('pill-') && p.faction === 'Classic'),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
    for (const page of [host, guest])
      await page.getByRole('link', { name: 'Main menu', exact: true }).click();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
