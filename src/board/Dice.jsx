import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
export default function Dice({ values, version, reduced, rolling = true }) {
  const ref = useRef();
  const previous = useRef(version);
  useGSAP(
    () => {
      const fresh = previous.current !== version;
      previous.current = version;
      if (reduced || !rolling || !fresh) return;
      gsap.fromTo(
        '.die',
        { rotate: 0, y: -8 },
        { rotate: 360, y: 0, stagger: 0.08, duration: 0.65, ease: 'bounce.out' },
      );
    },
    { scope: ref, dependencies: [version, reduced], revertOnUpdate: true },
  );
  const patterns = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <div className="dice-pair" ref={ref} aria-label={`Dice: ${values.join(' and ')}`}>
      {values.map((v, i) => (
        <div className="die" key={i}>
          {Array.from({ length: 9 }, (_, n) => (
            <i className={patterns[v]?.includes(n) ? 'pip' : ''} key={n} />
          ))}
        </div>
      ))}
    </div>
  );
}
