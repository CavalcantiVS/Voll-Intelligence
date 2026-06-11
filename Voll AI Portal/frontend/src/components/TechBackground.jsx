import React, { useEffect, useRef, useCallback } from 'react';

/**
 * TechBackground — interactive particle-network canvas that follows the mouse.
 * Designed to sit as an absolute-positioned layer behind chat content.
 * Fully respects reduced-motion preferences and adapts to light/dark themes.
 */
const TechBackground = ({ isDark = false }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef([]);

  const PARTICLE_COUNT = 110;
  const CONNECTION_DIST = 130;
  const MOUSE_REPEL_DIST = 110;
  const MOUSE_ATTRACT_DIST = 220;
  const SPEED = 0.35;

  const getThemeColors = useCallback(() => {
    if (isDark) {
      return {
        particle: 'rgba(224, 8, 46,',   // voll-red
        line: 'rgba(224, 8, 46,',
        mouseDot: '#E0082E',
        glow: 'rgba(224, 8, 46, 0.12)',
      };
    }
    return {
      particle: 'rgba(176, 0, 24,',    // slightly deeper in light
      line: 'rgba(176, 0, 24,',
      mouseDot: '#B00018',
      glow: 'rgba(224, 8, 46, 0.06)',
    };
  }, [isDark]);

  const initParticles = useCallback((w, h) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r: Math.random() * 1.8 + 0.8,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { offsetWidth: w, offsetHeight: h } = parent;
      canvas.width = w;
      canvas.height = h;
      initParticles(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    canvas.parentElement.addEventListener('mousemove', onMouseMove);
    canvas.parentElement.addEventListener('mouseleave', onMouseLeave);

    const colors = getThemeColors();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const mouse = mouseRef.current;
      const particles = particlesRef.current;

      // Update particle positions
      for (const p of particles) {
        // Mouse interaction: attract nearby, repel very close
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_REPEL_DIST && dist > 0) {
          // Soft repulsion
          const force = (MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST;
          p.vx -= (dx / dist) * force * 0.25;
          p.vy -= (dy / dist) * force * 0.25;
        } else if (dist < MOUSE_ATTRACT_DIST && dist > MOUSE_REPEL_DIST) {
          // Gentle attraction
          const force = (MOUSE_ATTRACT_DIST - dist) / MOUSE_ATTRACT_DIST;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }

        // Damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Clamp speed
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > SPEED * 3) {
          p.vx = (p.vx / spd) * SPEED * 3;
          p.vy = (p.vy / spd) * SPEED * 3;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            const alpha = (1 - d / CONNECTION_DIST) * 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `${colors.line} ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw mouse cursor glow
      if (mouse.x > -1000) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_ATTRACT_DIST * 0.6);
        grad.addColorStop(0, colors.glow.replace('0.12', '0.18').replace('0.06', '0.10'));
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MOUSE_ATTRACT_DIST * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        }

      // Draw particles
      for (const p of particles) {
        // Proximity to mouse boosts glow
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nearMouse = dist < MOUSE_ATTRACT_DIST;
        const alpha = nearMouse ? 0.8 : 0.35;
        const radius = nearMouse ? p.r * 1.6 : p.r;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${colors.particle} ${alpha})`;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animFrameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      canvas.parentElement?.removeEventListener('mousemove', onMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [initParticles, getThemeColors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.75,
      }}
      aria-hidden="true"
    />
  );
};

export default TechBackground;
