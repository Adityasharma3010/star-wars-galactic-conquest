import { test, expect } from '@playwright/test';
import { BOARD } from '../../src/game/rules/data.js';
test('complete a real quick team match and persist team results, statistics and victory', async ({
  browser,
}) => {
  test.setTimeout(240000);
  const contexts = await Promise.all([0, 1].map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const invoke = (p, command, payload = {}) =>
    p.evaluate(
      async ({ command, payload }) => {
        const { serverCall } = await import('/src/services/supabase.js');
        return serverCall(command, payload);
      },
      { command, payload },
    );
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const p = pages[i];
    await p.goto('/');
    ids.push(
      await p.evaluate(async (i) => {
        const { guestAuth, syncProfile } = await import('/src/services/supabase.js');
        const d = await guestAuth();
        await syncProfile({
          name: 'Finale Pilot ' + (i + 1),
          character: i ? 'vader' : 'luke',
          faction: i ? 'Galactic Empire' : 'Rebel Alliance',
        });
        return d.user.id;
      }, i),
    );
  }
  const room = (
    await invoke(pages[0], 'createRoom', {
      name: 'QA complete quick teams',
      isPrivate: true,
      profile: { name: 'Finale Pilot 1', character: 'luke' },
    })
  ).room;
  await invoke(pages[1], 'joinRoom', {
    code: room.code,
    profile: { name: 'Finale Pilot 2', character: 'vader' },
  });
  await invoke(pages[0], 'configureRoom', {
    roomId: room.id,
    maxPlayers: 4,
    rules: {
      startingCredits: 100,
      roundLimit: 5,
      incomeTax: 1000,
      luxuryTax: 1000,
      auctions: false,
      teams: true,
      turnDuration: 300,
    },
  });
  await invoke(pages[0], 'ready', { roomId: room.id, character: 'luke' });
  await invoke(pages[1], 'ready', { roomId: room.id, character: 'vader' });
  let state = (await invoke(pages[0], 'startRoom', { roomId: room.id, aiCount: 2 })).state;
  for (let n = 0; n < 90 && state.phase !== 'finished'; n++) {
    const p = state.debt
      ? state.players.find((p) => p.id === state.debt.payer)
      : state.players[state.turn];
    if (p.ai) {
      if (state.animationUntil > Date.now())
        await pages[0].waitForTimeout(state.animationUntil - Date.now() + 150);
      state = (await invoke(pages[0], 'snapshot', { gameId: state.id })).state;
      continue;
    }
    const index = ids.indexOf(p.id);
    const type = state.debt
      ? 'BANKRUPT'
      : state.phase === 'roll'
        ? 'ROLL'
        : state.phase === 'purchase'
          ? p.credits >= BOARD[state.pendingProperty].price
            ? 'BUY'
            : 'DECLINE'
          : 'END';
    state = (
      await invoke(pages[index], 'action', {
        gameId: state.id,
        action: {
          id: crypto.randomUUID(),
          version: state.version,
          type,
          player: p.id,
          payload: {},
        },
      })
    ).state;
  }
  expect(state.phase).toBe('finished');
  expect(state.players.every((p) => p.credits >= 0)).toBe(true);
  for (let i = 0; i < 2; i++) {
    const result = await pages[i].evaluate(async (gameId) => {
      const { supabase } = await import('/src/services/supabase.js');
      const user = (await supabase.auth.getUser()).data.user;
      const h = await supabase
        .from('match_history')
        .select('won,final_wealth')
        .eq('game_id', gameId)
        .single();
      const s = await supabase
        .from('player_statistics')
        .select('matches,wins')
        .eq('user_id', user.id)
        .single();
      if (h.error || s.error) throw h.error || s.error;
      return { match: h.data, statistics: s.data };
    }, state.id);
    expect(result.match.won).toBe(
      state.players.find((p) => p.id === ids[i]).team === state.winningTeam,
    );
    expect(result.statistics.matches).toBe(1);
  }
  await pages[0].getByRole('button', { name: 'Find a game', exact: true }).click();
  await pages[0].getByLabel('Room invite code').fill(room.code);
  await pages[0].getByRole('button', { name: 'Join room', exact: true }).click();
  await expect(pages[0].getByText('THE GALAXY HAS A NEW RULER')).toBeVisible({ timeout: 20000 });
  await expect(
    pages[0].getByRole('heading', { name: state.winningTeam, exact: true }),
  ).toBeVisible();
  await pages[0].screenshot({ path: 'test-results/online-team-victory.png', fullPage: true });
  await Promise.all(contexts.map((c) => c.close()));
});
