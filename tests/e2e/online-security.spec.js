import { test, expect } from '@playwright/test';
test('real private-room isolation, readiness race, forged actions, counteroffers, auction race and scoped chat', async ({
  browser,
}) => {
  test.setTimeout(240000);
  const contexts = await Promise.all(
    [0, 1, 2].map(() => browser.newContext({ viewport: { width: 1440, height: 900 } })),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [host, guest, outsider] = pages;
  const errors = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  const call = (page, command, payload = {}) =>
    page.evaluate(
      async ({ command, payload }) => {
        const { serverCall } = await import('/src/services/supabase.js');
        try {
          return { ok: true, data: await serverCall(command, payload) };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
      { command, payload },
    );
  const db = (page, table, columns) =>
    page.evaluate(
      async ({ table, columns }) => {
        const { supabase } = await import('/src/services/supabase.js');
        const { data, error } = await supabase.from(table).select(columns);
        if (error) throw error;
        return data;
      },
      { table, columns },
    );
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    await p.goto('/');
    await p.locator('.profile-button').click();
    await p.getByLabel('CALLSIGN').fill(`Security Pilot ${i + 1}`);
    await p.getByRole('button', { name: 'Save profile', exact: true }).click();
    await p.getByRole('button', { name: 'Online account' }).click();
    await p.getByRole('button', { name: 'Continue as online guest' }).click();
    await expect(p.getByText('Guest session started.')).toBeVisible({ timeout: 25000 });
    await p.getByLabel('Close dialog').click();
  }
  const profiles = await Promise.all(
    pages.map((p) =>
      p.evaluate(async () => {
        const { supabase } = await import('/src/services/supabase.js');
        return (await supabase.auth.getUser()).data.user.id;
      }),
    ),
  );
  const made = await call(host, 'createRoom', {
    name: 'QA private security conquest',
    isPrivate: true,
    profile: { name: 'Security Pilot 1', character: 'luke', faction: 'Rebel Alliance' },
  });
  expect(made.ok).toBe(true);
  const room = made.data.room;
  expect((await db(outsider, 'game_rooms', 'id,code')).some((r) => r.id === room.id)).toBe(false);
  expect((await call(outsider, 'room', { roomId: room.id })).ok).toBe(false);
  const joined = await call(guest, 'joinRoom', {
    code: room.code,
    profile: { name: 'Security Pilot 2', character: 'luke', faction: 'Galactic Empire' },
  });
  expect(joined.ok).toBe(true);
  expect(
    (await call(guest, 'configureRoom', { roomId: room.id, rules: { teams: true }, maxPlayers: 4 }))
      .ok,
  ).toBe(false);
  expect(
    (
      await call(host, 'configureRoom', {
        roomId: room.id,
        rules: { teams: true, turnDuration: 300 },
        maxPlayers: 4,
      })
    ).ok,
  ).toBe(true);
  const race = await Promise.all([
    call(host, 'ready', { roomId: room.id, character: 'luke' }),
    call(guest, 'ready', { roomId: room.id, character: 'luke' }),
  ]);
  expect(race.filter((r) => r.ok)).toHaveLength(1);
  expect(race.filter((r) => !r.ok)[0].error).toMatch(/Character already/);
  const loser = race[0].ok ? guest : host;
  expect((await call(loser, 'ready', { roomId: room.id, character: 'vader' })).ok).toBe(true);
  expect((await call(host, 'friendRequest', { recipient: profiles[1] })).ok).toBe(true);
  const requests = await db(guest, 'friend_requests', 'id,sender_id,status');
  const request = requests.find((r) => r.sender_id === profiles[0] && r.status === 'pending');
  expect(request).toBeTruthy();
  expect((await call(guest, 'friendResponse', { requestId: request.id, accept: true })).ok).toBe(
    true,
  );
  expect((await call(guest, 'friendResponse', { requestId: request.id, accept: true })).ok).toBe(
    false,
  );
  expect((await call(host, 'invite', { roomId: room.id, recipient: profiles[1] })).ok).toBe(true);
  expect(
    (await call(guest, 'invitations')).data.invitations.some(
      (i) => i.game_rooms.code === room.code,
    ),
  ).toBe(true);
  const started = await call(host, 'startRoom', { roomId: room.id, aiCount: 0 });
  expect(started.ok).toBe(true);
  let state = started.data.state;
  const gameId = state.id;
  expect((await db(outsider, 'game_state', 'game_id')).some((s) => s.game_id === gameId)).toBe(
    false,
  );
  const action = (
    p,
    type,
    payload = {},
    version = state.version,
    id = crypto.randomUUID(),
    player = profiles[0],
  ) => call(p, 'action', { gameId, action: { id, type, payload, version, player } });
  expect(
    (await action(guest, 'ROLL', {}, state.version, crypto.randomUUID(), profiles[0])).ok,
  ).toBe(false);
  const rollId = crypto.randomUUID(),
    version = state.version;
  const rolls = await Promise.all([
    action(host, 'ROLL', { dice: [6, 6], credits: 999999 }, version, rollId),
    action(host, 'ROLL', {}, version),
  ]);
  expect(rolls.filter((r) => r.ok)).toHaveLength(1);
  state = rolls.find((r) => r.ok).data.state;
  expect(state.version).toBe(version + 1);
  expect(state.players[0].credits).toBeLessThan(10000);
  const duplicate = rolls[0].ok
    ? await action(host, 'ROLL', {}, version, rollId)
    : await call(host, 'snapshot', { gameId });
  expect(duplicate.ok).toBe(true);
  expect(duplicate.data.state.version).toBe(state.version);
  if (state.phase === 'purchase') {
    const r = await action(host, 'BUY');
    expect(r.ok).toBe(true);
    state = r.data.state;
  }
  expect(state.phase).toBe('end');
  let r = await action(host, 'TRADE_OFFER', { to: profiles[1], cash: 10 });
  expect(r.ok).toBe(true);
  state = r.data.state;
  const trade = state.trades.at(-1).id;
  r = await action(guest, 'TRADE_COUNTER', { trade, cash: 15 });
  expect(r.ok).toBe(true);
  state = r.data.state;
  expect(state.trades.find((t) => t.id === trade).status).toBe('countered');
  const before = state.players.map((p) => p.credits);
  r = await action(host, 'TRADE_ACCEPT', { trade: state.trades.at(-1).id });
  expect(r.ok).toBe(true);
  state = r.data.state;
  expect(state.players[0].credits).toBe(before[0] + 15);
  expect(state.players[1].credits).toBe(before[1] - 15);
  for (let n = 0; n < 12 && state.phase !== 'purchase'; n++) {
    const page = state.players[state.turn].id === profiles[0] ? host : guest;
    r = await action(page, state.phase === 'end' ? 'END' : 'ROLL');
    expect(r.ok).toBe(true);
    state = r.data.state;
  }
  expect(state.phase).toBe('purchase');
  const actor = state.players[state.turn].id === profiles[0] ? host : guest,
    property = state.pendingProperty;
  r = await action(actor, 'DECLINE');
  expect(r.ok).toBe(true);
  state = r.data.state;
  const bids = await Promise.all([
    action(host, 'BID', { amount: 10 }),
    action(guest, 'BID', { amount: 10 }),
  ]);
  expect(bids.filter((r) => r.ok)).toHaveLength(1);
  state = bids.find((r) => r.ok).data.state;
  const winning = state.auction.bidder;
  const losing = winning === profiles[0] ? guest : host;
  r = await action(losing, 'PASS');
  expect(r.ok).toBe(true);
  state = r.data.state;
  expect(state.auction).toBeNull();
  expect(state.ownership[property].owner).toBe(winning);
  expect(
    (await call(host, 'chat', { gameId, text: 'QA team-only transmission', team: true })).ok,
  ).toBe(true);
  expect(
    (await db(guest, 'chat_messages', 'body')).some((m) => m.body === 'QA team-only transmission'),
  ).toBe(false);
  expect((await call(host, 'chat', { text: 'QA global security transmission' })).ok).toBe(true);
  expect(
    (await db(outsider, 'chat_messages', 'body')).some(
      (m) => m.body === 'QA global security transmission',
    ),
  ).toBe(true);
  const denied = await guest.evaluate(async (gameId) => {
    const { supabase } = await import('/src/services/supabase.js');
    const r = await supabase
      .from('player_wallets')
      .update({ credits: 999999 })
      .eq('game_id', gameId)
      .select();
    return { error: Boolean(r.error), rows: r.data?.length || 0 };
  }, gameId);
  expect(denied.error || denied.rows === 0).toBe(true);
  const hidden = await guest.evaluate(async () => {
    const { supabase } = await import('/src/services/supabase.js');
    return Boolean((await supabase.rpc('galactic_engine', { p_game: crypto.randomUUID() })).error);
  });
  expect(hidden).toBe(true);
  expect(errors).toEqual([]);
  await Promise.all(contexts.map((c) => c.close()));
});
