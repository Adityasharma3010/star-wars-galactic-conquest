import { test, expect } from '@playwright/test';

test('Back returns through profile subdialogs and settings Save & close persists changes', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.profile-button').click();
  await page.getByRole('button', { name: 'Match history', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your command profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Reduce motion', { exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  const save = page.getByRole('button', { name: 'Save & close' });
  await expect(save).toBeInViewport();
  await page.screenshot({ path: 'test-results/settings-back-save-mobile.png', fullPage: true });
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByLabel('Reduce motion', { exact: true })).toBeChecked();
});

test('setup Back and Save setup keep the map page and retain the full draft without starting a match', async ({
  page,
}) => {
  await page.goto('/maps/default');
  await page.getByRole('button', { name: 'Play locally', exact: true }).click();
  await page.getByLabel('COMMANDER NAME', { exact: true }).fill('Saved Pilot');
  await page.getByRole('button', { name: 'Select Red', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const save = page.getByRole('button', { name: 'Save setup', exact: true });
  expect(
    await page.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(save).toBeInViewport();
  await page.screenshot({ path: 'test-results/setup-back-save-mobile.png', fullPage: true });
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/maps\/default$/);
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Play locally', exact: true }).click();
  await expect(page.getByLabel('COMMANDER NAME', { exact: true })).toHaveValue('Saved Pilot');
  await expect(page.getByRole('button', { name: 'Select Red', exact: true })).toHaveClass(
    /selected/,
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
