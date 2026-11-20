import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { selectChoice } from './helpers.js';
async function listen(page) {
  await page.addInitScript(() => {
    window.matchAudio = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this instanceof HTMLAudioElement && !window.matchAudio.includes(this))
        window.matchAudio.push(this);
      return play.apply(this, args);
    };
  });
}
async function launch(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Play locally/ }).click();
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByTestId('game-board')).toBeVisible();
}
test('holographic choices work by keyboard and quiet music crossfades into the next song', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await listen(page);
  await launch(page);
  await expect(page.locator('.match-radio')).toHaveAttribute('data-playback', 'playing', {
    timeout: 20000,
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.matchAudio.some(
          (audio) => !audio.paused && audio.currentTime > 0.2 && audio.volume > 0,
        ),
      ),
    )
    .toBe(true);
  const level = await page.evaluate(() =>
    Math.max(...window.matchAudio.map((audio) => audio.volume)),
  );
  expect(level).toBeLessThanOrEqual(0.07);
  await page.waitForTimeout(2400);
  await page.evaluate(() => {
    const playing = window.matchAudio.find((audio) => !audio.paused);
    playing.currentTime = playing.duration - 2;
  });
  await expect(page.locator('.match-radio')).toHaveAttribute('data-track', 'decoherence', {
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'Choose background music' }).click();
  await page.getByRole('combobox', { name: 'MUSIC SOURCE', exact: true }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.screenshot({ path: 'test-results/holographic-music-select.png', fullPage: true });
  await expect(page.getByRole('combobox', { name: 'MUSIC SOURCE', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByRole('combobox', { name: 'MUSIC SOURCE', exact: true }).press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('combobox', { name: 'BACKGROUND TRACK', exact: true }).focus();
  await page.getByRole('combobox', { name: 'BACKGROUND TRACK', exact: true }).press('End');
  await page.getByRole('combobox', { name: 'BACKGROUND TRACK', exact: true }).press('Enter');
  await expect(
    page.getByRole('combobox', { name: 'BACKGROUND TRACK', exact: true }),
  ).toHaveAttribute('data-value', 'ephemera');
  await expect(page.locator('.match-radio')).toHaveAttribute('data-track', 'ephemera', {
    timeout: 20000,
  });
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Pause background music' }).click();
  await expect
    .poll(() => page.evaluate(() => window.matchAudio.every((audio) => audio.paused)))
    .toBe(true);
  await page.getByRole('button', { name: 'Play background music' }).click();
  await expect(page.locator('.match-radio')).toHaveAttribute('data-playback', 'playing', {
    timeout: 20000,
  });
  expect(errors).toEqual([]);
});
test('personal songs persist privately and replace only match music, with no playback during the intro', async ({
  page,
}) => {
  test.setTimeout(120000);
  const sent = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') sent.push(request.postData() || '');
  });
  await listen(page);
  await launch(page);
  await page.getByRole('button', { name: 'Choose background music' }).click();
  const buffer = await readFile('public/audio/droid.mp3');
  await page
    .getByLabel('Personal background songs')
    .setInputFiles({ name: 'personal-orbit.mp3', mimeType: 'audio/mpeg', buffer });
  await expect(page.getByText(/Your songs are ready/)).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('combobox', { name: 'MUSIC SOURCE', exact: true })).toHaveAttribute(
    'data-value',
    'personal',
  );
  await expect(page.locator('.match-radio')).toContainText('personal-orbit');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.matchAudio.some((audio) => audio.src.startsWith('blob:') && !audio.paused),
      ),
    )
    .toBe(true);
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state,
  );
  expect(stored.settings.effectsVolume).toBe(0.8);
  expect(stored.settings.introMusic).not.toBe(false);
  expect(JSON.stringify(stored.settings)).not.toContain('personal-orbit');
  expect(sent.some((body) => body.includes('personal-orbit'))).toBe(false);
  await page.screenshot({ path: 'test-results/personal-music-settings.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.match-radio')).toContainText('personal-orbit', { timeout: 20000 });
  await expect(page.locator('.match-radio')).toHaveAttribute('data-playback', 'playing', {
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'New game', exact: true }).first().click();
  await page.getByRole('button', { name: 'Launch conquest' }).click();
  await expect(page.getByRole('dialog', { name: 'Opening crawl' })).toBeVisible();
  expect(await page.evaluate(() => window.matchAudio.every((audio) => audio.paused))).toBe(true);
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.locator('.match-radio')).toContainText('personal-orbit');
  await page.getByRole('button', { name: 'Choose background music' }).click();
  await page.getByRole('button', { name: 'Remove personal song personal-orbit' }).click();
  await expect(page.locator('.personal-music-row')).toHaveCount(0);
  await selectChoice(page, 'MUSIC SOURCE', 'builtin');
  await expect(page.locator('.match-radio')).toHaveAttribute('data-track', 'space-ambience', {
    timeout: 20000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'BACKGROUND TRACK', exact: true }).click();
  const box = await page.getByRole('listbox').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/music-mobile-select.png', fullPage: true });
});
