import { useEffect, useRef } from 'react';
import useMotionPreference from '../hooks/useMotionPreference.js';

export default function VictoryCelebration({ classic }) {
  const ref = useRef(),
    reduced = useMotionPreference();
  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current,
      context = canvas.getContext('2d');
    if (!context) return;
    const box = canvas.getBoundingClientRect(),
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = box.width * scale;
    canvas.height = box.height * scale;
    context.scale(scale, scale);
    const colors = classic
      ? ['#e2b15d', '#71bd8a', '#df8265', '#f4ddb0']
      : ['#f5d28e', '#85dcff', '#adc4ff', '#e9f8ff'];
    const particles = [];
    let frame,
      started = performance.now(),
      previous = started,
      lastBurst = -1;
    const draw = (now) => {
      const elapsed = (now - started) / 1000,
        burst = Math.floor(elapsed / 1.1);
      const step = Math.min(0.05, (now - previous) / 1000) * 60;
      previous = now;
      context.clearRect(0, 0, box.width, box.height);
      if (elapsed < 4.5 && burst !== lastBurst) {
        lastBurst = burst;
        const x = box.width * (0.2 + (burst % 3) * 0.3),
          y = box.height * (0.2 + (burst % 2) * 0.15);
        for (let i = 0; i < 44; i++) {
          const angle = (i / 44) * Math.PI * 2,
            speed = 1.2 + Math.random() * 2.2;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color: colors[i % colors.length],
          });
        }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        particle.vy += 0.025 * step;
        particle.life -= 0.012 * step;
        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        context.globalAlpha = particle.life;
        context.strokeStyle = context.fillStyle = particle.color;
        if (classic) context.fillRect(particle.x, particle.y, 4, 3);
        else {
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(particle.x - particle.vx * 4, particle.y - particle.vy * 4);
          context.stroke();
        }
      }
      if (elapsed < 7 || particles.length) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, box.width, box.height);
    };
  }, [reduced, classic]);
  return <canvas ref={ref} className="victory-celebration" aria-hidden="true" />;
}
