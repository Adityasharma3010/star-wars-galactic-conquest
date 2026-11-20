import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import useMotionPreference from '../hooks/useMotionPreference.js';

export default function AnimatedBalance({ value }) {
  const reduced = useMotionPreference();
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  const [change, setChange] = useState(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value || reduced) {
      setDisplay(value);
      setChange(null);
      return;
    }
    const began = performance.now();
    let frame;
    setChange({ amount: value - from, id: began });
    const count = (now) => {
      const progress = Math.min(1, (now - began) / 550);
      setDisplay(Math.round(from + (value - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(count);
    };
    frame = requestAnimationFrame(count);
    const timer = setTimeout(() => setChange(null), 1300);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [value, reduced]);
  return (
    <span className="animated-balance" aria-label={value.toLocaleString()}>
      <span aria-hidden="true">{display.toLocaleString()}</span>
      <AnimatePresence>
        {change && (
          <motion.span
            key={change.id}
            className={'balance-change ' + (change.amount > 0 ? 'gain' : 'loss')}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -5, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            aria-hidden="true"
          >
            {change.amount > 0 ? '+' : '−'}
            {Math.abs(change.amount).toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
