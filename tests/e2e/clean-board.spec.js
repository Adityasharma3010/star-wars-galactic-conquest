import { test, expect } from '@playwright/test';
import { createGame } from '../../src/game/engine/game.js';
import { tokensFor } from '../../src/game/maps.js';

async function load(page, mapId, { crowded = false, reduced = false } = {}) {
  const game = createGame(
    tokensFor(mapId)
      .slice(0, crowded ? 8 : 4)
      .map((token, index) => ({
        id: index ? `rival-${index}` : 'you',
        name: index ? `Pilot ${index}` : 'Nova Pilot',
        character: token.id,
        color: token.color,
        faction: token.faction,
        ai: false,
      })),
    { id: `clean-${mapId}`, mapId },
  );
  game.players.forEach((player, index) => {
    player.position = crowded ? 6 : [6, 15, 24, 35][index];
  });
  for (const [owner, ids] of [
    ['you', [1, 3]],
    ['rival-1', [8, 9]],
  ])
    for (const id of ids)
      game.ownership[id] = { owner, level: owner === 'you' ? 2 : 0, mortgaged: false };
  await page.addInitScript(
    ({ game, reduced }) => {
      localStorage.setItem(
        'galactic-conquest-v1',
        JSON.stringify({
          version: 1,
          state: {
            game,
            playing: true,
            selected: 1,
            selectedMap: game.rules.mapId,
            boardView: '2d',
            settings: { mute: true, reducedMotion: reduced },
            profile: { name: 'Nova Pilot' },
          },
        }),
      );
    },
    { game, reduced },
  );
  await page.goto('/');
  await expect(page.getByTestId('game-board')).toBeVisible();
  return game;
}

for (const mapId of ['galactic-conquest', 'india']) {
  test(`${mapId}: sidebar hover and keyboard focus reveal holdings and position, then restore the pinned filter`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await load(page, mapId);
    const own = page.getByRole('button', { name: "Highlight Nova Pilot's worlds" });
    await own.click();
    await expect(own).toHaveAttribute('aria-pressed', 'true');
    const rival = page.locator('[data-player-card="rival-1"]');
    await rival.hover();
    for (const id of [8, 9])
      await expect(page.locator(`[data-tile="${id}"]`)).toHaveClass(/owner-emphasis/);
    await expect(page.locator('[data-tile="1"]')).toHaveClass(/owner-dim/);
    const position = page.locator('[data-tile="15"]');
    await expect(position).toHaveClass(/player-location/);
    expect(await position.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
    await expect(page.locator('[data-token="rival-1"]')).toHaveClass(/hovered-token/);
    await page.screenshot({ path: `test-results/clean-${mapId}-hover.png`, fullPage: true });
    await page.getByRole('button', { name: '2D view', exact: true }).hover();
    await expect(page.locator('[data-tile="1"]')).toHaveClass(/owner-emphasis/);
    await expect(page.locator('[data-tile="15"]')).not.toHaveClass(/player-location/);
    await rival.focus();
    await expect(position).toHaveClass(/player-location/);
    await page.keyboard.press('Tab');
    await expect(position).not.toHaveClass(/player-location/);
    await page
      .getByRole('button', { name: mapId === 'india' ? 'All cities' : 'All worlds', exact: true })
      .click();
    await expect(page.locator('.owner-emphasis')).toHaveCount(0);
    await expect(page.locator('[data-tile="1"] .development b')).toBeVisible();
    await expect(page.locator('[data-tile="1"] .development b')).toHaveText('2');
    await expect(page.locator('[data-token="you"] .pawn-shell')).toHaveCSS(
      'animation-name',
      'pawn-breathe',
    );
    await expect(page.locator('[data-token="rival-1"] .pawn-shell')).toHaveCSS(
      'animation-name',
      'none',
    );
    await page.getByRole('button', { name: '3D view', exact: true }).click();
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-ready', 'true', {
      timeout: 25000,
    });
    await expect(page.locator('.spatial-renderer')).toHaveAttribute('data-pawn-models', '4');
    await rival.hover();
    await expect(page.getByTestId('board-3d')).toHaveAttribute(
      'data-highlighted-player',
      'rival-1',
    );
    await expect(page.getByTestId('board-3d')).toHaveAttribute('data-owner-filter', 'rival-1');
    await page.screenshot({ path: `test-results/clean-${mapId}-3d-hover.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

  test(`${mapId}: eight tokens share a space and mobile controls remain usable with reduced motion`, async ({
    page,
  }) => {
    await load(page, mapId, { crowded: true, reduced: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.player-token')).toHaveCount(8);
    const boxes = await page.locator('.player-token').evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        // Circular pieces must have distinguishable centers, including on narrow edge tiles.
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(Math.min(a.width, b.width) * 0.65);
      }
    await expect(page.locator('.active-token .pawn-shell')).toHaveCSS('animation-name', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const control = page.getByRole('button', { name: 'Roll dice', exact: true });
    await expect(control).toBeEnabled();
    const version = await page.evaluate(
      () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game.version,
    );
    await page.getByRole('button', { name: 'Save game', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Game saved', exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state.game.version,
      ),
    ).toBe(version);
    await page.screenshot({ path: `test-results/clean-${mapId}-mobile.png`, fullPage: true });
    await control.click();
    await expect(page.getByRole('button', { name: 'Roll by clicking dice' })).toBeDisabled();
  });
}
