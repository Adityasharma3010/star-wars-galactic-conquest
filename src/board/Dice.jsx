import { useEffect, useRef, useState } from 'react';
import { createDiceScene } from './diceScene.js';

const PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Two real 3D dice (WebGL). Falls back to flat pips when WebGL is unavailable. */
export default function Dice({
  values,
  version,
  reduced,
  rolling = true,
  onRoll,
  canRoll = false,
  classic = false,
}) {
  const canvas = useRef(null);
  const holder = useRef(null);
  const scene = useRef(null);
  const previous = useRef(version);
  const latest = useRef({ values, reduced });
  const [fallback, setFallback] = useState(false);
  latest.current = { values, reduced };

  useEffect(() => {
    if (!canvas.current) return;
    let instance;
    try {
      instance = createDiceScene(canvas.current, { classic, reduced: latest.current.reduced });
    } catch {
      setFallback(true);
      return;
    }
    scene.current = instance;
    const box = holder.current;
    const fit = () => instance.resize(box.clientWidth, box.clientHeight);
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();
    instance.setValues(latest.current.values, false);
    return () => {
      observer.disconnect();
      instance.dispose();
      scene.current = null;
    };
  }, [classic]);

  useEffect(() => {
    const fresh = previous.current !== version;
    previous.current = version;
    scene.current?.setValues(values, fresh && rolling && !reduced);
  }, [values[0], values[1], version, rolling, reduced]);

  const Container = onRoll ? 'button' : 'div';
  return (
    <Container
      className={'dice-pair dice-3d ' + (onRoll ? 'dice-roll-control' : '')}
      type={onRoll ? 'button' : undefined}
      disabled={onRoll ? !canRoll : undefined}
      onClick={
        onRoll
          ? () => {
              if (canRoll) onRoll();
            }
          : undefined
      }
      aria-label={onRoll ? 'Roll by clicking dice' : `Dice: ${values.join(' and ')}`}
      aria-description={`Dice values: ${values.join(' and ')}`}
      title={onRoll && canRoll ? 'Click the dice to roll' : undefined}
    >
      <span className="dice-stage" ref={holder}>
        {fallback ? (
          values.map((v, i) => (
            <span className="die" key={i}>
              {Array.from({ length: 9 }, (_, n) => (
                <i className={PATTERNS[v]?.includes(n) ? 'pip' : ''} key={n} />
              ))}
            </span>
          ))
        ) : (
          <canvas ref={canvas} className="dice-canvas" />
        )}
      </span>
    </Container>
  );
}
