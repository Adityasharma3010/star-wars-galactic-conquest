import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Home,
  Map,
  Crosshair,
  Users,
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  ChevronDown,
  Radio,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
import { tokensFor } from '../game/maps.js';
import { CHARACTERS } from '../game/rules/data.js';
import { Emblem, TokenArt } from './Art.jsx';
import useMotionPreference from '../hooks/useMotionPreference.js';

export default function CommandHeader({ classic, connected }) {
  const { game, playing, profile, settings, updateSettings, returnHome, open, online, boardView } =
    useGameStore();
  const reduced = useMotionPreference(),
    route = useLocation(),
    navigate = useNavigate();
  const character = [...CHARACTERS, ...tokensFor('india')].find(
    (token) => token.id === profile.character,
  );
  const tab = (Icon, label, active) => (
    <>
      <Icon size={15} />
      <span>{label}</span>
      {active && (
        <motion.i
          layoutId="command-header-tab"
          className="nav-active-glass"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 27 }}
          aria-hidden="true"
        />
      )}
    </>
  );
  return (
    <motion.header
      className="app-header command-header"
      initial={reduced ? false : { opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <button
        className="brand"
        onClick={() => {
          returnHome();
          navigate('/');
        }}
        aria-label="Galactic Conquest main menu"
      >
        <span className="brand-reactor">
          <i />
          <Emblem size={41} />
        </span>
        <span>
          <small>FAN EDITION / STRATEGY</small>
          <b>{classic ? 'MONOPOLY' : 'STAR WARS'}</b>
          <strong>{classic ? 'INDIA / CITY CAPITALS' : 'GALACTIC CONQUEST'}</strong>
        </span>
      </button>
      <nav aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'selected' : '')}>
          {tab(Home, 'Main menu', route.pathname === '/')}
        </NavLink>
        <NavLink
          to="/maps/star-wars"
          className={route.pathname.startsWith('/maps') ? 'selected' : ''}
        >
          {tab(Map, 'Choose maps', route.pathname.startsWith('/maps'))}
        </NavLink>
        {playing && game && (
          <NavLink
            to={'/match/' + encodeURIComponent(game.id)}
            className={({ isActive }) => (isActive ? 'selected' : '')}
          >
            {tab(Crosshair, 'Command deck', route.pathname.startsWith('/match/'))}
          </NavLink>
        )}
        <button onClick={() => open('rooms')}>{tab(Users, 'Find a game', false)}</button>
        <button onClick={() => open('rules')}>{tab(BookOpen, 'How to play', false)}</button>
      </nav>
      <div className="header-actions">
        {playing && (
          <span className="header-display-status">
            <Radio size={11} />
            {online ? (connected ? 'LIVE' : 'RECONNECTING') : 'LOCAL'}
            <small>{boardView === '3d' ? '3D TABLE' : '2D DISPLAY'}</small>
          </span>
        )}
        <button
          className="icon-button"
          aria-label={settings.mute ? 'Unmute sound' : 'Mute sound'}
          onClick={() => updateSettings({ mute: !settings.mute })}
        >
          {settings.mute ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button className="icon-button" aria-label="Open settings" onClick={() => open('settings')}>
          <Settings size={17} />
        </button>
        <button className="profile-button" onClick={() => open('profile')}>
          <span style={{ color: character?.color }}>
            <TokenArt character={character} size={33} />
          </span>
          <span className="header-profile-name">
            <small>YOUR PROFILE</small>
            {profile.name}
          </span>
          <ChevronDown size={12} />
        </button>
      </div>
      <span className="header-energy-rail" aria-hidden="true">
        <i />
      </span>
    </motion.header>
  );
}
