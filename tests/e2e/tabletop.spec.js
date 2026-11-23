import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
import { tokensFor } from '../../src/game/maps.js';

for (const mapId of ['galactic-conquest', 'india'])
  test(`${mapId}: physical tabletop framing, developed properties and camera focus remain playable`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /THREE.WebGLProgram|shader error/i.test(message.text()))
        errors.push(message.text());
    });
    const game = createGame(
      tokensFor(mapId)
        .slice(0, 4)
        .map((token, index) => ({
          id: index ? `rival-${index}` : 'you',
          name: index ? ['', 'Orion', 'Leia', 'Finn'][index] : 'Nova',
          character: token.id,
          color: token.color,
          faction: token.faction,
          ai: false,
        })),
      { id: `tabletop-${mapId}`, mapId },
    );
    game.players.forEach((player, index) => {
      player.position = [3, 8, 19, 33][index];
    });
    for (const [owner, ids, level] of [
      ['you', [1, 3], 5],
      ['rival-1', [6, 8, 9], 3],
      ['rival-2', [11, 13, 14], 2],
      ['rival-3', [31, 32, 34], 1],
    ])
      for (const id of ids) game.ownership[id] = { owner, level, mortgaged: false };
    await page.addInitScript(
      (game) =>
        localStorage.setItem(
          'galactic-conquest-v1',
          JSON.stringify({
            version: 1,
            state: {
              game,
              playing: true,
              boardView: '3d',
              selected: 9,
              selectedMap: game.rules.mapId,
              settings: { mute: true, reducedMotion: true },
              profile: { name: 'Nova' },
            },
          }),
        ),
      game,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const board = page.getByTestId('board-3d'),
      canvas = page.getByTestId('three-canvas');
    await expect(board).toHaveAttribute('data-ready', 'true', { timeout: 25000 });
    if (mapId === 'galactic-conquest') {
      await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-world-models', '22');
      await expect(page.locator('.spatial-renderer')).toHaveAttribute(
        'data-surface-textures',
        '6',
        { timeout: 20000 },
      );
      await expect(page.locator('.holoworld-label')).toHaveCount(22);
    }
    await expect(page.locator('.spatial-renderer')).toHaveAttribute(
      'data-loaded-photos',
      mapId === 'india' ? '22' : '26',
      { timeout: 45000 },
    );
    await expect(page.locator('.spatial-renderer')).toHaveAttribute(
      'data-development-models',
      '20',
    );
    await canvas.screenshot({ path: `.supabase/tabletop-${mapId}.png` });
    await page.getByRole('button', { name: 'Expand board', exact: true }).click();
    await canvas.screenshot({ path: `.supabase/tabletop-${mapId}-expanded.png` });
    const initial = await canvas.screenshot();
    if (mapId === 'galactic-conquest') {
      const world = page.locator('.holoworld-label[data-world-id="1"]');
      const position = await world.evaluate((node) => ({
        x: Number(node.dataset.modelX),
        y: Number(node.dataset.modelY),
      }));
      const bounds = await canvas.boundingBox();
      await page.mouse.click(bounds.x + position.x, bounds.y + position.y);
      await expect(board).toHaveAttribute('data-selected-tile', '1');
    }
    await page.getByRole('button', { name: 'Focus selected world' }).click();
    await expect(page.locator('.spatial-location-badge strong')).toHaveText(
      mapId === 'india' ? 'Itanagar' : 'Tatooine',
    );
    if (mapId === 'galactic-conquest') {
      await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-camera-view', 'focus');
      await expect
        .poll(() =>
          page
            .locator('.holoworld-label[data-world-id="1"]')
            .evaluate((node) =>
              Math.abs(Number(node.dataset.modelX) - node.parentElement.clientWidth / 2),
            ),
        )
        .toBeLessThan(2);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page
            .locator('.spatial-renderer')
            .evaluate((node) =>
              Math.abs(Number(node.dataset.pixelScaleX) / Number(node.dataset.pixelScaleY) - 1),
            ),
        )
        .toBeLessThan(0.01);
      await canvas.screenshot({ path: '.supabase/tabletop-galactic-conquest-focused-mobile.png' });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    expect((await canvas.screenshot()).equals(initial)).toBe(false);
    await page.getByRole('button', { name: 'Reset 3D camera' }).click();
    await page.getByRole('button', { name: 'Top view of 3D board' }).click();
    await canvas.screenshot({ path: `.supabase/tabletop-${mapId}-top.png` });
    await page.getByRole('button', { name: 'Close focus view' }).click();
    await page.getByRole('button', { name: 'Reset 3D camera' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await canvas.screenshot({ path: `.supabase/tabletop-${mapId}-mobile.png` });
    await page.screenshot({ path: `.supabase/tabletop-${mapId}-mobile-page.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
