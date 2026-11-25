import CommandHeader from '../components/CommandHeader.jsx';
import RouteTransmission from '../components/RouteTransmission.jsx';
import GameMoment from '../components/GameMoment.jsx';
import MatchMusic from '../components/MatchMusic.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { Component, useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Plus,
  CircleHelp,
  Globe2,
  X,
  ShieldCheck,
  ArrowRightLeft,
  WifiOff,
  LogOut,
  Radio,
} from 'lucide-react';
import Board from '../board/Board.jsx';
import { PlayersPanel, PropertyPanel, ActivityPanel } from '../components/Panels.jsx';
import { Emblem } from '../components/Art.jsx';
import EventPresentation from '../components/EventPresentation.jsx';
import Dialogs from '../pages/Dialogs.jsx';
import WelcomeScreen from '../pages/WelcomeScreen.jsx';
import MapSelection from '../pages/MapSelection.jsx';
import MatchOpening from '../components/MatchOpening.jsx';
import MissionTransmission from '../components/MissionTransmission.jsx';
import { useGameStore } from '../stores/gameStore.js';
import { chooseAction } from '../game/ai/commander.js';
import { timeoutAction } from '../game/engine/timeouts.js';
import { automationPlayer, HEARTBEAT_INTERVAL } from '../game/engine/connections.js';
import { setAtmosphere, playSound, restoreSounds } from '../services/audio.js';
import { THEME } from '../game/rules/data.js';
import { isClassic } from '../game/maps.js';
import { subscribeGame, serverCall, supabase, cloudProfile } from '../services/supabase.js';
import { prepareLeaveSignal, leaveMatch } from '../services/matchConnection.js';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <div className="fatal-error">
          <Emblem size={50} />
          <h1>Command link interrupted</h1>
          <p>{this.state.error.message}</p>
          <button className="button gold-button" onClick={() => location.reload()}>
            Reload your saved match
          </button>
        </div>
      );
    return this.props.children;
  }
}
function GameApp() {
  const route = useLocation();
  const navigate = useNavigate();
  const previousRoute = useRef({ path: route.pathname, gameId: null });
  const {
    game,
    online,
    onlinePlayer,
    dispatch,
    open,
    settings,
    error,
    clearError,
    modal,
    commit,
    matchAway,
    eventQueue,
    playing,
    returnHome,
    intro,
  } = useGameStore();
  const [connected, setConnected] = useState(true);
  const classic =
    isClassic(
      modal === 'newGame' || modal === 'rooms'
        ? useGameStore.getState().selectedMap
        : playing
          ? game
          : useGameStore.getState().selectedMap,
    ) &&
    (playing || modal === 'newGame' || modal === 'rooms');
  const spectator = online && !onlinePlayer;
  useEffect(() => {
    const gameId = playing && game ? game.id : null;
    const previous = previousRoute.current;
    previousRoute.current = { path: route.pathname, gameId };
    if (gameId && gameId !== previous.gameId) {
      navigate('/match/' + encodeURIComponent(gameId), {
        replace: route.pathname.startsWith('/match/'),
      });
    } else if (
      gameId &&
      route.pathname !== previous.path &&
      !route.pathname.startsWith('/match/')
    ) {
      returnHome();
    } else if (!gameId && route.pathname.startsWith('/match/')) {
      navigate('/', { replace: true });
    }
  }, [playing, game?.id, route.pathname, navigate, returnHome]);
  useEffect(() => {
    document.title = route.pathname.startsWith('/maps')
      ? 'Choose a map · Galactic Conquest'
      : playing
        ? 'Command deck · Galactic Conquest'
        : 'Star Wars · Galactic Conquest';
    window.scrollTo({ top: 0 });
  }, [route.pathname, playing]);
  useEffect(() => {
    if (!supabase) return;
    const originalProfile = useGameStore.getState().profile;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session || data.session.user.is_anonymous) return;
        const saved = await cloudProfile();
        if (saved && useGameStore.getState().profile === originalProfile)
          useGameStore.setState({
            profile: {
              name: saved.profile.display_name,
              character: saved.profile.character,
              faction: saved.profile.faction,
            },
            settings: { ...useGameStore.getState().settings, ...saved.settings },
          });
      })
      .catch((e) => useGameStore.setState({ error: e.message }));
  }, []);
  useEffect(() => {
    restoreSounds().catch(() => {});
  }, []);
  useEffect(() => {
    if (
      !playing ||
      !game ||
      intro ||
      online ||
      game.phase === 'finished' ||
      eventQueue.length ||
      useGameStore.getState().staging
    )
      return;
    const p = automationPlayer(game);
    if (!p) return;
    const delay =
      (game.movement ? game.movement.steps * 260 + 1300 : 1200) + (game.lastCard ? 6000 : 0);
    const timer = setTimeout(() => {
      const current = useGameStore.getState().game;
      const action = chooseAction(current, p);
      if (action) dispatch(action.type, action.payload, action.player);
    }, delay);
    return () => clearTimeout(timer);
  }, [game?.version, online, dispatch, game?.phase, eventQueue.length, playing, intro]);
  useEffect(() => {
    if (!playing || !game || intro || eventQueue.length || spectator) return;
    if (game.phase === 'auction' && !modal) open('auction');
    if (
      game.debt &&
      !modal &&
      (online
        ? game.debt.payer === onlinePlayer
        : !game.players.find((p) => p.id === game.debt.payer)?.ai)
    )
      open('debt');
  }, [
    game?.phase,
    game?.debt?.payer,
    eventQueue.length,
    modal,
    open,
    playing,
    online,
    onlinePlayer,
    intro,
  ]);
  useEffect(() => {
    if (!playing || !game || !online || !supabase || matchAway || game.phase === 'finished') return;
    let cleanup,
      disposed = false,
      lastPoll = 0,
      leaveSignal = () => {};
    const acceptConnections = (connections) => {
      if (!disposed && connections) useGameStore.setState({ connections });
    };
    const heartbeat = async () => {
      try {
        const d = await serverCall('connection', { gameId: game.id });
        acceptConnections(d.connections);
        if (!disposed) setConnected(true);
      } catch {
        if (!disposed) setConnected(false);
      }
    };
    const prepare = () =>
      prepareLeaveSignal(game.id)
        .then((fn) => {
          if (!disposed) leaveSignal = fn;
        })
        .catch(() => {});
    subscribeGame(
      game.id,
      (state) => {
        const current = useGameStore.getState();
        if (!disposed && current.playing && current.online && current.game?.id === game.id)
          commit(state);
      },
      (presence) => {
        if (!disposed) useGameStore.setState({ presence });
      },
      acceptConnections,
      spectator,
    )
      .then((fn) => {
        if (disposed) fn();
        else cleanup = fn;
      })
      .catch((e) => {
        if (!disposed) useGameStore.setState({ error: e.message });
      });
    if (!spectator) {
      heartbeat();
      prepare();
    }
    const heartbeatTimer = spectator ? null : setInterval(heartbeat, HEARTBEAT_INTERVAL);
    const pollTimer = setInterval(async () => {
      const current = useGameStore.getState();
      if (!current.game || !current.playing || current.game.phase === 'finished') return;
      const urgent = Boolean(
        automationPlayer(current.game, current.connections) || current.game.auction,
      );
      if (!urgent && Date.now() - lastPoll < 8000) return;
      lastPoll = Date.now();
      try {
        const d = await serverCall('snapshot', { gameId: game.id });
        if (
          disposed ||
          !useGameStore.getState().playing ||
          !useGameStore.getState().online ||
          useGameStore.getState().game?.id !== game.id
        )
          return;
        acceptConnections(d.connections);
        if (d.state.version > useGameStore.getState().game.version) commit(d.state);
        setConnected(true);
      } catch {
        if (!disposed) setConnected(false);
      }
    }, 2000);
    const onHide = () => leaveSignal();
    const onOnline = () => {
      if (!spectator) {
        heartbeat();
        prepare();
      }
    };
    const onOffline = () => setConnected(false);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(prepare, 0);
    });
    return () => {
      disposed = true;
      cleanup?.();
      subscription.unsubscribe();
      clearInterval(heartbeatTimer);
      clearInterval(pollTimer);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [online, game?.id, commit, matchAway, game?.phase === 'finished', playing, spectator]);
  useEffect(() => {
    if (new URLSearchParams(route.search).has('room')) open('rooms');
  }, [open, route.search]);
  useEffect(() => {
    const apply = () => {
      const current = useGameStore.getState();
      setAtmosphere({
        ...current.settings,
        ambience:
          current.settings.ambience &&
          current.playing &&
          !current.intro &&
          !current.matchAway &&
          current.game?.phase !== 'finished',
      });
    };
    document.addEventListener('pointerdown', apply);
    apply();
    return () => document.removeEventListener('pointerdown', apply);
  }, [settings, playing, intro, matchAway, game?.phase === 'finished']);
  useEffect(() => {
    if (online || !playing || !game) return;
    const timer = setInterval(() => {
      const state = useGameStore.getState();
      const action = timeoutAction(state.game);
      if (action && !state.busy) dispatch(action.type, action.payload, action.player);
    }, 1000);
    return () => clearInterval(timer);
  }, [online, dispatch, playing]);
  const exit = async () => {
    useGameStore.setState({ matchAway: true, busy: true, eventQueue: [], modal: null });
    try {
      const d = await leaveMatch(game.id);
      useGameStore.setState({ connections: d.connections });
    } catch (e) {
      useGameStore.setState({ matchAway: false, error: e.message });
    } finally {
      useGameStore.setState({ busy: false });
    }
  };
  const resume = async () => {
    if (!game || useGameStore.getState().busy) return;
    useGameStore.setState({ busy: true });
    try {
      const d = await serverCall('snapshot', { gameId: game.id });
      commit(d.state);
      useGameStore.setState({
        matchAway: false,
        playing: true,
        ...(d.role === 'spectator' ? { onlinePlayer: null, onlineRole: 'spectator' } : {}),
        connections: d.connections,
        error: null,
      });
    } catch (e) {
      useGameStore.setState({ error: e.message });
    } finally {
      useGameStore.setState({ busy: false });
    }
  };
  const motionReduced = useMotionPreference();
  return (
    <div
      className={
        'app-shell command-room ' +
        (motionReduced ? ' motion-reduced ' : ' motion-enabled ') +
        (settings.reducedMotion ? 'reduce-motion' : '') +
        (!playing ? ' welcome-screen' : '') +
        (playing && !intro ? ' in-match' : '') +
        (classic ? ' classic-theme' : '')
      }
      style={{ '--gold': settings.accent || '#e5bd73' }}
      onClick={(e) => {
        if (
          e.target.closest('button') &&
          !e.target.closest('[data-audio-preview]') &&
          !e.target.closest('[data-opening-control]')
        )
          playSound('click', settings);
      }}
    >
      <CommandHeader classic={classic} connected={connected} />
      <RouteTransmission />
      <GameMoment />
      <main inert={Boolean(modal)}>
        <Routes>
          <Route path="/" element={<WelcomeScreen onResumeOnline={resume} />} />
          <Route path="/maps" element={<Navigate to="/maps/star-wars" replace />} />
          <Route path="/maps/:category" element={<MapSelection />} />
          <Route
            path="/match/:gameId"
            element={
              <MatchRoute>
                {playing && game ? (
                  intro ? (
                    <MatchOpening />
                  ) : (
                    <>
                      <div className="mission-heading">
                        <div>
                          <div className="breadcrumb">
                            COMMAND DECK <span>/</span>{' '}
                            {online ? 'MULTIPLAYER' : 'SOLO & LOCAL PLAY'}
                          </div>
                          <h2>
                            {classic ? 'Your India match begins here' : 'Your conquest begins here'}
                            <span>.</span>
                          </h2>
                          <p>
                            {classic
                              ? 'Explore capital cities. Build houses and hotels. Outlast your rivals.'
                              : 'Explore iconic worlds. Build your empire. Rule the galaxy.'}
                          </p>
                        </div>
                        <div className="bottom-toolbar">
                          <button disabled={spectator} onClick={() => open('trade')}>
                            <ArrowRightLeft size={15} /> Trade
                          </button>
                          <button onClick={() => open('deed')}>
                            <Globe2 size={15} /> Property deed
                          </button>
                          <button onClick={() => open('rules')}>
                            <CircleHelp size={15} /> Rules
                          </button>
                        </div>
                        <div className="mission-actions">
                          <MatchMusic active={!matchAway && game.phase !== 'finished'} />
                          <span className="connection-badge">
                            {online ? (
                              matchAway ? (
                                <>
                                  <Radio size={12} /> SEAT RESERVED
                                </>
                              ) : connected ? (
                                <>
                                  <i className="status-dot" /> ONLINE
                                </>
                              ) : (
                                <>
                                  <WifiOff size={12} /> RECONNECTING
                                </>
                              )
                            ) : (
                              <>
                                <i className="status-dot" /> SOLO & AI READY
                              </>
                            )}
                          </span>
                          {online && !spectator && !matchAway && game.phase !== 'finished' && (
                            <button className="button leave-match-button" onClick={exit}>
                              <LogOut size={14} /> Leave match
                            </button>
                          )}
                          <button
                            className="button new-game-button"
                            onClick={() => open('newGame')}
                          >
                            <Plus size={15} /> New game
                          </button>
                        </div>
                        {spectator && (
                          <div className="spectator-banner" role="status">
                            <Radio size={20} />
                            <div>
                              <strong>You are spectating</strong>
                              <p>
                                {game.phase === 'finished'
                                  ? 'This match has ended. Join the next waiting room to play.'
                                  : 'Watch this match. You can join as a player when the next match opens.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {online && matchAway && (
                        <div className="match-away-banner">
                          <Radio size={24} />
                          <div>
                            <strong>Your squadron is waiting.</strong>
                            <p>Your seat is reserved for two minutes. Return to resume control.</p>
                          </div>
                          <button
                            className="button gold-button"
                            disabled={useGameStore.getState().busy}
                            onClick={resume}
                          >
                            Rejoin match <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                      <div className="game-layout">
                        <PlayersPanel />
                        <Board />
                        <aside className="right-panel">
                          <PropertyPanel />
                          <ActivityPanel />
                        </aside>
                      </div>
                    </>
                  )
                ) : (
                  <Navigate to="/" replace />
                )}
              </MatchRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer inert={Boolean(modal)}>
        <span>
          <Emblem size={15} /> {classic ? 'INDIA / CITY CAPITALS' : THEME.title}
          <i />A NON-COMMERCIAL FAN PROJECT
        </span>
        <span>
          {classic
            ? 'Indian capitals · Classic rules'
            : 'Star Wars worlds · Original game interface'}
        </span>
        <button onClick={() => open('settings')}>
          About & credits <ArrowRight size={11} />
        </button>
      </footer>
      <Dialogs />
      {playing && !intro && (
        <>
          <EventPresentation />
          <MissionTransmission />
        </>
      )}
      <AnimatePresence>
        {error && !modal && (
          <motion.div
            className="error-toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
          >
            <ShieldCheck size={19} />
            <p>{error}</p>
            <button className="icon-button" aria-label="Dismiss error" onClick={clearError}>
              <X size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}

function MatchRoute({ children }) {
  const { gameId } = useParams();
  const game = useGameStore((state) => state.game);
  const playing = useGameStore((state) => state.playing);
  if (playing && game && game.id !== gameId)
    return <Navigate to={'/match/' + encodeURIComponent(game.id)} replace />;
  return children;
}
