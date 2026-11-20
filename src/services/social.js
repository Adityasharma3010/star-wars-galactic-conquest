import { requireBackend, serverCall } from './supabase.js';
export async function socialData() {
  const s = requireBackend(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) throw new Error('Sign in to use online social features.');
  const queries = await Promise.all([
    s
      .from('friendships')
      .select('friend_id,profiles!friendships_friend_id_fkey(display_name,character)')
      .eq('user_id', user.id),
    s
      .from('friend_requests')
      .select('id,sender_id,status,profiles!friend_requests_sender_id_fkey(display_name)')
      .eq('recipient_id', user.id)
      .eq('status', 'pending'),
    s
      .from('player_statistics')
      .select('matches,wins,total_wealth,user_id,profiles(display_name)')
      .order('wins', { ascending: false })
      .limit(20),
    s
      .from('blocked_players')
      .select('blocked_id,profiles!blocked_players_blocked_id_fkey(display_name)')
      .eq('user_id', user.id),
  ]);
  for (const q of queries) if (q.error) throw q.error;
  return {
    friends: queries[0].data,
    requests: queries[1].data,
    rankings: queries[2].data,
    blocked: queries[3].data,
    user,
  };
}
export async function searchPlayers(name) {
  const { data, error } = await requireBackend()
    .from('profiles')
    .select('id,display_name,character')
    .ilike('display_name', `%${name.replace(/[,%_]/g, '')}%`)
    .limit(15);
  if (error) throw error;
  return data;
}
export async function blockPlayer(playerId, blocked = true) {
  const s = requireBackend(),
    {
      data: { user },
    } = await s.auth.getUser();
  const result = blocked
    ? await s
        .from('blocked_players')
        .upsert({ user_id: user.id, blocked_id: playerId }, { onConflict: 'user_id,blocked_id' })
    : await s.from('blocked_players').delete().eq('user_id', user.id).eq('blocked_id', playerId);
  if (result.error) throw result.error;
}
