import React, { useEffect, useRef } from 'react';

/** Shades of green (plus a little white) for the celebration */
const COLORS = ['#16834A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#10B981', '#FFFFFF'];
const PIECES = 160;
const DURATION_MS = 4200;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: 'rect' | 'circle';
}

/**
 * One-off green confetti burst over the whole screen (like a birthday celebration),
 * fired from both lower corners. Draws on a canvas that ignores clicks; does nothing
 * for visitors who prefer reduced motion.
 */
export const GreenConfetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const speed = Math.max(9, Math.min(16, h / 55));
    const pieces: Piece[] = Array.from({ length: PIECES }, (_, i) => {
      const fromLeft = i % 2 === 0;
      // Shoot up and inwards from the two bottom corners
      const angle = ((fromLeft ? -60 : -120) + (Math.random() * 30 - 15)) * (Math.PI / 180);
      const v = speed * (0.7 + Math.random() * 0.6);
      return {
        x: fromLeft ? -10 : w + 10,
        y: h * 0.85,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        size: 6 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.7 ? 'rect' : 'circle',
      };
    });

    const start = performance.now();
    let last = start;
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.7);
      last = now;
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = t > DURATION_MS - 900 ? Math.max(0, (DURATION_MS - t) / 900) : 1;
      for (const p of pieces) {
        p.vy += 0.28 * dt; // gravity
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (t < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-full h-full pointer-events-none z-[95]" />;
};
