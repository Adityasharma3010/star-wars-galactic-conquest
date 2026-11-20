import { useEffect } from 'react';

export default function usePointerLight(ref, reduced) {
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || !window.matchMedia('(pointer: fine)').matches) return;
    let frame;
    const move = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
        const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
        element.style.setProperty('--pointer-x', `${x * 100}%`);
        element.style.setProperty('--pointer-y', `${y * 100}%`);
        element.style.setProperty('--scene-x', `${(x - 0.5) * -12}px`);
        element.style.setProperty('--scene-y', `${(y - 0.5) * -8}px`);
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty('--scene-x', '0px');
      element.style.setProperty('--scene-y', '0px');
    };
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
    };
  }, [ref, reduced]);
}
