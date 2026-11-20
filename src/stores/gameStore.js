import { randomId } from '../utils/ids.js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createGame, transition, wealth } from '../game/engine/game.js';
import { restoreSession } from '../game/restoreSession.js';
import { leaveMatch } from '../services/matchConnection.js';
import { canAcceptMission, missionRecipient } from '../game/missions.js';
import { getCard } from '../game/cards/decks.js';
import { mapFor } from '../game/maps.js';
import { secureRandom } from '../game/engine/random.js';
import { serverCall, syncProfile, syncSettings } from '../services/supabase.js';
import { playSound } from '../services/audio.js';
export const useGameStore = create(
  persist(
    (set, get) => ({
      eventQueue: [],
      intro: null,
      introducedGames: [],
      ruleDrafts: {},
      musicPreferences: { source: 'builtin', selection: 'playlist', shuffle: false },
      personalMusic: [],
      updateMusicPreferences: (patch) =>
        set((state) => ({ musicPreferences: { ...state.musicPreferences, ...patch } })),
      setPersonalMusic: (personalMusic) => set({ personalMusic }),
      updateRuleDraft: (key, patch) =>
        set((state) => ({
          ruleDrafts: { ...state.ruleDrafts, [key]: { ...state.ruleDrafts[key], ...patch } },
        })),
      observedEvent: null,
      connections: {},
      matchAway: false,
      game: null,
      playing: false,
      online: false,
      onlinePlayer: null,
      onlineRole: 'player',
      selectedMap: 'galactic-conquest',
      chooseMap: (selectedMap) => set({ selectedMap }),
      lobbyRoom: null,
      selected: 1,
      error: null,
      busy: false,
      modal: null,
      tab: 'events',
      messages: [],
      history: [],
      profile: { name: 'Commander', character: 'luke', faction: 'Rebel Alliance' },
      settings: {
        mute: false,
        volume: 0.45,
        effectsVolume: 0.8,
        ambientVolume: 0.25,
        musicVolume: 0.2,
        matchMusic: true,
        matchMusicVolume: 0.14,
        ambience: false,
        music: false,
        reducedMotion: false,
      },
      finishIntro: () => set({ intro: null }),
      clearTransmission: () => set({ observedEvent: null }),
      resumeSaved: () => {
        if (get().game) set({ playing: true, modal: null, error: null });
      },
      returnHome: async () => {
        const state = get();
        set({ playing: false, modal: null, eventQueue: [], intro: null, observedEvent: null });
        if (state.online && state.onlineRole !== 'spectator' && state.game?.phase !== 'finished') {
          set({ busy: true, matchAway: true });
          try {
            const d = await leaveMatch(state.game.id);
            set({ connections: d.connections });
          } catch (e) {
            set({ playing: true, matchAway: false, error: e.message });
          } finally {
            set({ busy: false });
          }
        }
      },
      dismissEvent: () => set((s) => ({ eventQueue: s.eventQueue.slice(1) })),
      select: (id) => set({ selected: id }),
      open: (modal) => set({ modal, error: null }),
      close: () => set({ modal: null, error: null }),
      clearError: () => set({ error: null }),
      updateProfile: (patch) => {
        const profile = { ...get().profile, ...patch };
        set({ profile });
        syncProfile(profile).catch((e) => set({ error: e.message }));
      },
      updateSettings: (patch) => {
        const settings = { ...get().settings, ...patch };
        set({ settings });
        syncSettings(settings).catch((e) => set({ error: e.message }));
      },
      start: async (players, rules) => {
        if (get().online && get().game?.phase !== 'finished')
          await leaveMatch(get().game.id).catch(() => {});
        try {
          const game = createGame(
            players,
            { ...rules, now: Date.now(), id: randomId() },
            secureRandom,
          );
          set({
            game,
            intro: mapFor(game).intro ? { gameId: game.id } : null,
            introducedGames: [...get().introducedGames, game.id].slice(-24),
            playing: true,
            eventQueue: [],
            connections: {},
            matchAway: false,
            online: false,
            onlinePlayer: null,
            onlineRole: 'player',
            messages: [],
            selected: 1,
            modal: null,
            error: null,
            busy: false,
          });
        } catch (e) {
          set({ error: e.message });
        }
      },
      commit: (game) => {
        const old = get().game;
        if (!old) {
          set({ game });
          return;
        }
        if (get().online && old.id === game.id && game.version < old.version) return;
        if (game.version !== old.version && game.lastActionType === 'ROLL')
          playSound('roll', get().settings);
        if (
          game.events?.some((e) => e.type === 'purchase' && !old.events.some((x) => x.id === e.id))
        )
          playSound('purchase', get().settings);
        if (game.events?.some((e) => e.type === 'build' && !old.events.some((x) => x.id === e.id)))
          playSound('build', get().settings);
        if (game.events?.some((e) => e.type === 'money' && !old.events.some((x) => x.id === e.id)))
          playSound('money', get().settings);
        let history = get().history;
        if (game.phase === 'finished' && old.phase !== 'finished') {
          playSound('victory', get().settings);
          history = [
            {
              id: randomId(),
              mapId: game.rules.mapId,
              date: new Date().toISOString(),
              winner: game.players.find((p) => p.id === game.winner)?.name,
              rounds: game.round,
              players: game.players.map((p) => ({
                name: p.name,
                wealth: wealth(game, p),
                won:
                  p.id === game.winner ||
                  Boolean(game.rules.teams && game.winningTeam && p.team === game.winningTeam),
              })),
              local: !get().online,
            },
            ...history,
          ].slice(0, 50);
        }
        const draws = game.events.filter(
          (e) => e.type === 'card' && !old.events.some((x) => x.id === e.id),
        );
        const cards = draws
          .map((e) => ({
            id: game.id + ':' + e.id,
            card: getCard(e.cardId, game) || game.lastCard,
            player: missionRecipient(game, e),
            interactive: canAcceptMission(game, e, get().online, get().onlinePlayer),
            readyAt: Date.now() + (game.movement ? game.movement.steps * 260 + 400 : 0),
          }))
          .filter((e) => e.card);
        const lostSeat =
          get().online &&
          get().onlinePlayer &&
          game.players.find((player) => player.id === get().onlinePlayer)?.bankrupt;
        set({
          game,
          history,
          ...(lostSeat ? { onlinePlayer: null, onlineRole: 'spectator', matchAway: false } : {}),
          eventQueue: [...get().eventQueue, ...cards.filter((card) => card.interactive)],
          observedEvent: cards.findLast((card) => !card.interactive) || get().observedEvent,
        });
      },
      dispatch: async (type, payload = {}, player) => {
        const { game, online, settings, busy, matchAway } = get();
        if (
          !game ||
          !get().playing ||
          get().intro ||
          busy ||
          matchAway ||
          (online && get().onlineRole === 'spectator')
        )
          return;
        set({ error: null });
        const actor =
          player || get().onlinePlayer || game.debt?.payer || game.players[game.turn].id;
        const action = {
          id: randomId(),
          version: game.version,
          player: actor,
          type,
          payload,
          now: Date.now(),
        };
        try {
          let next;
          if (online) {
            set({ busy: true });
            const data = await serverCall('action', { gameId: game.id, action });
            next = data.state;
          } else next = transition(game, action, secureRandom);
          get().commit(next);
          if (next.movement)
            set({ selected: next.players.find((p) => p.id === next.movement.player).position });
        } catch (e) {
          set({ error: e.message });
        } finally {
          set({ busy: false });
        }
      },
      attachOnline: (game, player, connections = {}) => {
        if (get().playing && get().online && !get().matchAway && get().game?.id === game.id) {
          get().commit(game);
          set({ connections, onlinePlayer: player, onlineRole: player ? 'player' : 'spectator' });
          return;
        }
        set({
          intro:
            player &&
            mapFor(game).intro &&
            !get().introducedGames.includes(game.id) &&
            game.phase !== 'finished' &&
            (game.version === 0 || Date.now() - (game.rules.now || 0) < 120000)
              ? { gameId: game.id }
              : null,
          introducedGames: [...new Set([...get().introducedGames, game.id])].slice(-24),
          observedEvent: null,
          game,
          playing: true,
          connections,
          eventQueue: [],
          matchAway: false,
          online: true,
          onlinePlayer: player,
          onlineRole: player ? 'player' : 'spectator',
          selectedMap: game.rules.mapId || 'galactic-conquest',
          modal: null,
          busy: false,
          messages: [],
        });
      },
      message: async (text, scope = 'match') => {
        const value = text.trim();
        if (!value || value.length > 300) return;
        if (get().online) {
          try {
            await serverCall('chat', {
              gameId: scope === 'global' ? null : get().game.id,
              text: value,
              team: scope === 'team',
            });
          } catch (e) {
            set({ error: e.message });
          }
        } else
          set({
            messages: [
              ...get().messages,
              {
                id: randomId(),
                name: get().profile.name,
                text: value,
                time: new Date().toISOString(),
              },
            ].slice(-100),
          });
      },
    }),
    {
      name: 'galactic-conquest-v1',
      version: 1,
      merge: restoreSession,
      partialize: (s) => ({
        game: s.game,
        selected: s.selected,
        profile: s.profile,
        settings: s.settings,
        messages: s.messages,
        history: s.history,
        online: s.online,
        onlinePlayer: s.onlinePlayer,
        lobbyRoom: s.lobbyRoom,
        selectedMap: s.selectedMap,
        onlineRole: s.onlineRole,
        matchAway: s.matchAway,
        introducedGames: s.introducedGames,
        ruleDrafts: s.ruleDrafts,
        musicPreferences: s.musicPreferences,
        personalMusic: s.personalMusic,
      }),
    },
  ),
);
