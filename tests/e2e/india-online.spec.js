import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { selectChoice } from './helpers.js';

test('India multiplayer retains reconnect grace, gives late visitors read-only access and removes expired seats without bots', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    [0, 1, 2].map(() => browser.newContext({ viewport: { width: 1440, height: 900 } })),
  );
  const [host, guest, viewer] = await Promise.all(contexts.map((context) => context.newPage()));
  const errors = [];
  const call = (page, command, payload) =>
    page.evaluate(
      async ({ command, payload }) => {
        const { serverCall } = await import('/src/services/supabase.js');
        try {
          return { ok: true, data: await serverCall(command, payload) };
        } catch (error) {
          return { ok: false, error: error.message };
        }
      },
      { command, payload },
    );
  const saved = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('galactic-conquest-v1')).state);
  try {
    for (const [page, name] of [
      [host, 'QA India Host'],
      [guest, 'QA India Guest'],
      [viewer, 'QA India Viewer'],
    ]) {
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/maps/default');
      await page.getByRole('button', { name: /Online multiplayer/ }).click();
      await page.getByLabel('YOUR CALLSIGN').fill(name);
    }
    await host.getByLabel('ROOM NAME').fill('QA India spectators');
    await host.getByRole('checkbox', { name: /Private/ }).check();
    await host.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(host.locator('.room-code > strong')).toBeVisible({ timeout: 20000 });
    const code = await host.locator('.room-code > strong').innerText();
    await guest.getByLabel('Room invite code').fill(code);
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(guest.locator('.room-code > strong')).toHaveText(code, { timeout: 20000 });
    await expect(guest.getByLabel('YOUR ONLINE ALLEGIANCE')).toHaveCount(0);
    await selectChoice(guest, 'YOUR TOKEN COLOR', 'pill-red');
    await selectChoice(host, 'AI PLAYERS', '0');
    await host.getByRole('button', { name: 'Toggle ready' }).click();
    await guest.getByRole('button', { name: 'Toggle ready' }).click();
    await expect(host.getByRole('button', { name: 'Start match' })).toBeEnabled({ timeout: 20000 });
    await host.getByRole('button', { name: 'Start match' }).click();
    await expect(host.getByTestId('game-board')).toBeVisible();
    await expect(guest.getByTestId('game-board')).toBeVisible({ timeout: 20000 });
    const initial = (await saved(host)).game;
    expect(initial.rules).toMatchObject({ mapId: 'india', taxBasis: 'cash' });
    expect(initial.players).toHaveLength(2);
    expect(initial.players.some((player) => player.ai)).toBe(false);
    await viewer.getByLabel('Room invite code').fill(code);
    await viewer.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(viewer.locator('.spectator-banner')).toBeVisible({ timeout: 20000 });
    await expect(viewer.locator('[data-token]')).toHaveCount(2);
    await expect(viewer.locator('.turn-console .gold-button')).toBeDisabled();
    expect((await saved(viewer)).onlineRole).toBe('spectator');
    const forged = await call(viewer, 'action', {
      gameId: initial.id,
      action: {
        id: crypto.randomUUID(),
        type: 'ROLL',
        version: initial.version,
        player: initial.players[0].id,
      },
    });
    expect(forged.ok).toBe(false);
    const chat = await call(viewer, 'chat', {
      gameId: initial.id,
      text: 'Spectator must not send game chat',
    });
    expect(chat.ok).toBe(false);
    await viewer.reload();
    await expect(viewer.locator('.spectator-banner')).toBeVisible({ timeout: 20000 });
    await host.getByRole('button', { name: 'Roll dice', exact: true }).click();
    await expect
      .poll(async () => (await saved(viewer)).game.version)
      .toBeGreaterThan(initial.version);
    await expect(host.getByRole('button', { name: 'Travelling…' })).toHaveCount(0, {
      timeout: 12000,
    });
    const mission = host.getByRole('button', { name: 'Continue mission' });
    if (await mission.count()) await mission.click();
    await guest.getByRole('link', { name: 'Main menu', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Resume saved game' })).toBeVisible();
    const left = (await call(host, 'snapshot', { gameId: initial.id })).data.connections[
      initial.players[1].id
    ];
    expect(left.status).toBe('left');
    expect(left.deadline - left.lastSeen).toBe(120000);
    await guest.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(guest.getByTestId('game-board')).toBeVisible();
    expect((await saved(guest)).onlineRole).toBe('player');
    await guest.getByRole('link', { name: 'Main menu', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Resume saved game' })).toBeVisible();

    // Fast-forward only the human lease in this newly created, named QA match.
    const secret = await readFile('.env.backend', 'utf8');
    const address = new URL((await readFile('supabase/.temp/pooler-url', 'utf8')).trim());
    if (!address.hostname.endsWith('.supabase.com')) throw new Error('Unexpected database host');
    address.password = secret
      .match(/^SUPABASE_DB_PASSWORD=(.+)$/m)[1]
      .trim()
      .replace(/^['"]|['"]$/g, '');
    const client = new pg.Client({
      connectionString: address.toString(),
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      const result = await client.query(
        "update galactic_private.connection_leases l set last_seen=now()-interval '121 seconds' where l.game_id=$1 and l.player_id=$2 and l.status='left' and exists(select 1 from public.games g join public.game_rooms r on r.id=g.room_id where g.id=l.game_id and r.name='QA India spectators')",
        [initial.id, initial.players[1].id],
      );
      expect(result.rowCount).toBeGreaterThan(0);
    } finally {
      await client.end();
    }
    const ended = await call(host, 'snapshot', { gameId: initial.id });
    expect(ended.ok).toBe(true);
    expect(ended.data.state).toMatchObject({ phase: 'finished', winner: initial.players[0].id });
    expect(ended.data.state.players[1]).toMatchObject({
      forfeited: true,
      bankrupt: true,
      ai: false,
    });
    await expect(host.locator('.commander-card')).toHaveCount(1, { timeout: 20000 });
    await expect(viewer.getByRole('button', { name: 'Join next match' })).toBeVisible({
      timeout: 20000,
    });
    await viewer.getByRole('button', { name: 'Join next match' }).click();
    await expect(viewer.locator('.room-code > strong')).toBeVisible({ timeout: 20000 });
    const nextCode = await viewer.locator('.room-code > strong').innerText();
    await host.getByRole('button', { name: 'Join next match' }).click();
    await expect(host.locator('.room-code > strong')).toHaveText(nextCode, { timeout: 20000 });
    await guest.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(guest.locator('.spectator-banner')).toBeVisible({ timeout: 20000 });
    expect((await saved(guest)).onlineRole).toBe('spectator');
    await viewer.screenshot({ path: 'test-results/india-next-waiting-room.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
