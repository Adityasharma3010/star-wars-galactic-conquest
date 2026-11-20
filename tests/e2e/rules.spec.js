import { test, expect } from '@playwright/test';

test('custom local settings survive closing and refreshing, launch exactly, and reset only on request', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByRole('button', { name: 'Custom', exact: true }).click();
  await page.getByLabel('STARTING CREDITS').fill('2345');
  await page.getByLabel('ROUND LIMIT').fill('12');
  await page.getByLabel('AI DIFFICULTY').selectOption('expert');
  await page.getByRole('checkbox', { name: /Enable trading/ }).uncheck();
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('2345');
  await page.reload();
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect(page.getByLabel('ROUND LIMIT')).toHaveValue('12');
  await expect(page.getByLabel('AI DIFFICULTY')).toHaveValue('expert');
  await expect(page.getByRole('checkbox', { name: /Enable trading/ })).not.toBeChecked();
  await page.screenshot({ path: 'test-results/custom-rules-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  const game = await page.evaluate(
    () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game,
  );
  expect(game.rules.startingCredits).toBe(2345);
  expect(game.rules.roundLimit).toBe(12);
  expect(game.rules.trading).toBe(false);
  expect(game.players.filter((p) => p.ai).every((p) => p.difficulty === 'expert')).toBe(true);
  await page.getByRole('button', { name: 'New game', exact: true }).first().click();
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('2345');
  await page.getByRole('button', { name: 'Reset rules' }).click();
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('1500');
  await expect(page.getByLabel('ROUND LIMIT')).toHaveValue('0');
  await expect(page.getByRole('checkbox', { name: /Enable trading/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test('multiplayer rule drafts survive polling and refresh, apply explicitly, and preserve edits made during a save', async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Find a game', exact: true }).click();
  await page.getByLabel('YOUR CALLSIGN').fill('Rules Pilot');
  await page.getByLabel('ROOM NAME').fill('QA persistent settings');
  await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(page.locator('.room-code > strong')).toBeVisible({ timeout: 20000 });
  await page.locator('.lobby-rules summary').click();
  await page.getByLabel('STARTING CREDITS').fill('2789');
  await page.getByLabel('ROOM CAPACITY').selectOption('6');
  await page.waitForTimeout(11500);
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('2789');
  await expect(page.getByLabel('ROOM CAPACITY')).toHaveValue('6');
  await page.reload();
  await page.getByRole('button', { name: 'Find a game', exact: true }).click();
  await expect(page.locator('.room-code > strong')).toBeVisible({ timeout: 20000 });
  await page.locator('.lobby-rules summary').click();
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('2789');
  await expect(page.getByLabel('ROOM CAPACITY')).toHaveValue('6');
  await page.getByRole('button', { name: 'Save room rules & reset readiness' }).click();
  await expect(page.locator('.rule-draft-status')).toContainText('These rules are applied', {
    timeout: 20000,
  });
  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.lobbyRoom,
  );
  const remote = await page.evaluate(
    async (id) =>
      await (await import('/src/services/supabase.js')).serverCall('room', { roomId: id }),
    id,
  );
  expect(remote.rules.startingCredits).toBe(2789);
  expect(remote.room.max_players).toBe(6);
  await page.route('**/functions/v1/galactic-api', async (route) => {
    if (route.request().postDataJSON()?.command === 'configureRoom')
      await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.getByLabel('STARTING CREDITS').fill('2900');
  await page.getByRole('button', { name: 'Save room rules & reset readiness' }).click();
  await page.getByLabel('STARTING CREDITS').fill('3200');
  await expect(page.getByRole('button', { name: 'Save room rules & reset readiness' })).toBeEnabled(
    { timeout: 20000 },
  );
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('3200');
  await expect(page.locator('.rule-draft-status')).toContainText('Draft retained');
  await page.screenshot({ path: 'test-results/room-rules-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset rules' }).click();
  await expect(page.getByLabel('STARTING CREDITS')).toHaveValue('1500');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/room-rules-mobile.png', fullPage: true });
});
