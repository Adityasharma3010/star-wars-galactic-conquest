import { test, expect } from '@playwright/test';
test('friends search, request acceptance, rankings and block/unblock render with real profiles', async ({
  browser,
}) => {
  test.setTimeout(100000);
  const contexts = await Promise.all([0, 1].map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const suffix = Date.now().toString().slice(-5),
    names = ['Squad Alpha ' + suffix, 'Squad Beta ' + suffix];
  for (let i = 0; i < 2; i++) {
    const p = pages[i];
    await p.goto('/');
    await p.locator('.profile-button').click();
    await p.getByLabel('CALLSIGN').fill(names[i]);
    await p.getByRole('button', { name: 'Save profile', exact: true }).click();
    await p.getByRole('button', { name: 'Online account' }).click();
    await p.getByRole('button', { name: 'Continue as online guest' }).click();
    await expect(p.getByText('Guest session started.')).toBeVisible({ timeout: 20000 });
    await p.getByLabel('Close dialog').click();
    await p.locator('.profile-button').click();
    await p.getByRole('button', { name: 'Friends & rankings' }).click();
  }
  const [host, guest] = pages;
  await host.getByLabel('Search commander callsign').fill(names[1]);
  await host.getByRole('button', { name: 'Search', exact: true }).click();
  await host
    .locator('.social-player')
    .filter({ hasText: names[1] })
    .getByRole('button', { name: 'Add friend' })
    .click();
  await expect(host.getByText('Friend request sent.')).toBeVisible();
  await guest.getByRole('button', { name: 'Refresh social data' }).click();
  await guest
    .locator('.social-player')
    .filter({ hasText: names[0] })
    .getByRole('button', { name: 'Accept', exact: true })
    .click();
  await expect(guest.getByRole('button', { name: 'Create an invite' })).toBeVisible();
  await host.getByRole('button', { name: 'Refresh social data' }).click();
  await host.getByLabel('Block ' + names[1]).click();
  await host.getByRole('button', { name: 'Blocked', exact: true }).click();
  await expect(host.getByRole('button', { name: 'Unblock', exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Unblock', exact: true }).click();
  await expect(host.getByText(/No blocked commanders/)).toBeVisible();
  await host.getByRole('button', { name: 'Rankings', exact: true }).click();
  await expect(host.getByText('Rankings are based on completed online matches.')).toBeVisible();
  await host.screenshot({ path: 'test-results/social-rankings.png', fullPage: true });
  await Promise.all(contexts.map((c) => c.close()));
});
