import React, { useEffect, useRef, useCallback } from 'react';

/**
 * TechBackground — canvas interativo de rede de partículas que segue o mouse.
 * Projetado para ficar como uma camada de posição absoluta atrás do conteúdo do chat.
 * Respeita totalmente as preferências de movimento reduzido e se adapta aos temas claro/escuro.
 */
const TechBackground = ({ isDark = false }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef([]);

  const PARTICLE_COUNT = 180;
  const CONNECTION_DIST = 130;
  const MOUSE_REPEL_DIST = 110;
  const MOUSE_ATTRACT_DIST = 220;
  const SPEED = 0.35;

  const getThemeColors = useCallback(() => {
    if (isDark) {
      return {
        particle: 'rgba(224, 8, 46,',   // vermelho voll
        line: 'rgba(224, 8, 46,',
        mouseDot: '#E0082E',
        glow: 'rgba(224, 8, 46, 0.12)',
      };
    }
    return {
      particle: 'rgba(176, 0, 24,',    // ligeiramente mais escuro no tema claro
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

      // Atualiza as posições das partículas
      for (const p of particles) {
        // Interação com o mouse: atrai perto, repele muito perto
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_REPEL_DIST && dist > 0) {
          // Repulsão suave
          const force = (MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST;
          p.vx -= (dx / dist) * force * 0.25;
          p.vy -= (dy / dist) * force * 0.25;
        } else if (dist < MOUSE_ATTRACT_DIST && dist > MOUSE_REPEL_DIST) {
          // Atração suave
          const force = (MOUSE_ATTRACT_DIST - dist) / MOUSE_ATTRACT_DIST;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }

        // Amortecimento
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Limita a velocidade
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > SPEED * 3) {
          p.vx = (p.vx / spd) * SPEED * 3;
          p.vy = (p.vy / spd) * SPEED * 3;
        }

        // Movimenta
        p.x += p.vx;
        p.y += p.vy;

        // Atravessa as bordas
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }

      // Desenha as conexões
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

      // Desenha o brilho do cursor do mouse
      if (mouse.x > -1000) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_ATTRACT_DIST * 0.6);
        grad.addColorStop(0, colors.glow.replace('0.12', '0.18').replace('0.06', '0.10'));
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MOUSE_ATTRACT_DIST * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        }

      // Desenha as partículas
      for (const p of particles) {
        // A proximidade com o mouse aumenta o brilho
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

    // Respeita a preferência de movimento reduzido (prefers-reduced-motion)
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
        opacity: 0.35,
      }}
      aria-hidden="true"
    />
  );
};

export default TechBackground;
