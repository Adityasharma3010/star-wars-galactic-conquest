import { test, expect } from '@playwright/test';

test('cinematic menu and routed map categories stay readable and launch the existing map', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'THE GALAXY AWAITS.' })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.galaxy-reference-scene img')
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/galaxy-menu-desktop.png', fullPage: true });
  await page.getByRole('link', { name: /03.*Choose maps/ }).click();
  await expect(page).toHaveURL(/\/maps\/star-wars$/);
  await expect(page.getByRole('heading', { name: 'Galactic Conquest', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Map categories' })
    .getByRole('link', { name: /Default/ })
    .click();
  await expect(page).toHaveURL(/\/maps\/default$/);
  await expect(page.getByRole('heading', { name: 'India', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Play locally/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'India', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/default-map-category.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Map categories' })
    .getByRole('link', { name: /Star Wars/ })
    .click();
  await page.screenshot({ path: 'test-results/star-wars-map-category.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/maps-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Play locally/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const fields = [...document.querySelectorAll('.field-row > .field')];
        const boxes = ['COMMANDERS', 'AI DIFFICULTY'].map((name) =>
          fields
            .find((field) => field.querySelector('span')?.textContent === name)
            ?.querySelector('[role="combobox"]')
            ?.getBoundingClientRect(),
        );
        return boxes.every(Boolean)
          ? Math.max(Math.abs(boxes[0].y - boxes[1].y), Math.abs(boxes[0].height - boxes[1].height))
          : Infinity;
      }),
    )
    .toBeLessThan(1);
  await page.screenshot({ path: 'test-results/setup-alignment-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await expect(page).toHaveURL(/\/match\/[a-zA-Z0-9-]+$/);
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/maps\/star-wars$/);
  await expect(page.getByTestId('game-board')).toHaveCount(0);
  await page.getByRole('link', { name: 'Main menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('intro automatically enters the match as its final story line clears the horizon and stops the theme', async ({
  page,
}) => {
  test.setTimeout(110000);
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toBeVisible();
  await expect(page.locator('.opening-crawl')).toBeAttached({ timeout: 15000 });
  await expect(page.locator('.original-theme-panel')).toBeHidden();
  const began = Date.now();
  await expect(page.getByTestId('game-board')).toBeVisible({ timeout: 65000 });
  expect(Date.now() - began).toBeLessThan(64000);
  await expect(page.locator('.original-theme-panel iframe')).toHaveCount(0);
  await expect(page.locator('.match-radio')).toHaveAttribute('data-playback', 'playing', {
    timeout: 20000,
  });
  await expect(page.getByRole('button', { name: 'Roll dice', exact: true })).toBeEnabled();
});

test('map routes recover invalid URLs and the main menu fits tablet and mobile', async ({
  page,
}) => {
  await page.goto('/maps/unknown');
  await expect(page).toHaveURL(/\/maps\/star-wars$/);
  await page.goto('/match/not-a-saved-game');
  await expect(page).toHaveURL(/\/$/);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await expect(page.getByRole('button', { name: /Play locally/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose maps', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/galaxy-menu-${width}.png`, fullPage: true });
  }
});
