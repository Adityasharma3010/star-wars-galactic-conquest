import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
export default function Dice({
  values,
  version,
  reduced,
  rolling = true,
  onRoll,
  canRoll = false,
  solid = false,
}) {
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
  const Container = onRoll ? 'button' : 'div';
  return (
    <Container
      className={'dice-pair ' + (onRoll ? 'dice-roll-control' : '')}
      ref={ref}
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
      {values.map((v, i) => (
        <div className={'die ' + (solid ? 'die-solid' : '')} key={i}>
          {solid
            ? Object.entries({
                front: v,
                back: 7 - v,
                top: [0, 2, 6, 1, 6, 1, 5][v],
                bottom: 7 - [0, 2, 6, 1, 6, 1, 5][v],
                right: [0, 3, 3, 5, 2, 3, 3][v],
                left: 7 - [0, 3, 3, 5, 2, 3, 3][v],
              }).map(([face, value]) => (
                <div className={'die-face face-' + face} key={face}>
                  {Array.from({ length: 9 }, (_, n) => (
                    <i key={n} className={patterns[value]?.includes(n) ? 'pip' : ''} />
                  ))}
                </div>
              ))
            : Array.from({ length: 9 }, (_, n) => (
                <i className={patterns[v]?.includes(n) ? 'pip' : ''} key={n} />
              ))}
        </div>
      ))}
    </Container>
  );
}
