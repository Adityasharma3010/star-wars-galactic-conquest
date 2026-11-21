import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import useMotionPreference from '../hooks/useMotionPreference.js';
import { useGameStore } from '../stores/gameStore.js';
import { isClassic } from '../game/maps.js';

export default function RouteTransmission() {
  const route = useLocation(),
    reduced = useMotionPreference(),
    previous = useRef(route.pathname);
  const [transition, setTransition] = useState(null);
  const classic = useGameStore((state) =>
    isClassic(state.playing ? state.game : state.selectedMap),
  );
  useEffect(() => {
    if (reduced) {
      previous.current = route.pathname;
      setTransition(null);
      return;
    }
    if (previous.current === route.pathname) return;
    previous.current = route.pathname;
    setTransition({
      id: route.pathname,
      label: route.pathname.startsWith('/match')
        ? classic
          ? 'ENTERING YOUR GAME TABLE'
          : 'ENTERING THE COMMAND DECK'
        : route.pathname.startsWith('/maps')
          ? 'CHARTING YOUR NEXT CONQUEST'
          : classic
            ? 'RETURNING TO THE MAIN MENU'
            : 'RETURNING TO GALACTIC COMMAND',
    });
    const timer = setTimeout(() => setTransition(null), 650);
    return () => clearTimeout(timer);
  }, [route.pathname, reduced]);
  return (
    <AnimatePresence>
      {transition && (
        <motion.div
          key={transition.id}
          className="route-transmission"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="route-warp-rings">
            <i />
            <i />
            <i />
          </div>
          <span>{transition.label}</span>
          {Array.from({ length: 18 }, (_, index) => (
            <i
              className="route-star-streak"
              key={index}
              style={{ '--angle': index * 20 + 'deg', '--delay': (index % 5) * -0.05 + 's' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
