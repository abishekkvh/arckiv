import { useEffect, useRef } from 'react';

export default function SpatialBackground({ density = 20, particleSize = 1.2, speed = 0.4 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Skip on low-end or mobile devices to save CPU
    const isLowEnd = (navigator.hardwareConcurrency ?? 4) < 4 || window.innerWidth < 768;
    const effectiveDensity = isLowEnd ? Math.min(density, 10) : density;
    const drawConnections = !isLowEnd;

    let mouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0 };

    const handleMouseMove = (e) => {
      mouse.vx = e.clientX - mouse.lastX;
      mouse.vy = e.clientY - mouse.lastY;
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // Create particles
    let particles = [];
    const count = Math.min(Math.floor((width * height) / 25000), effectiveDensity);

    function initParticles() {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          baseRadius: Math.random() * particleSize + 0.6,
          radius: Math.random() * particleSize + 0.6,
          alpha: Math.random() * 0.35 + 0.15,
          color: i % 3 === 0 ? 'rgba(37, 99, 235, ' : 'rgba(148, 163, 184, '
        });
      }
    }

    initParticles();

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) render();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    function render() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Movement
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce on boundaries
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Mouse proximity interaction
        const dx = mouse.x - p1.x;
        const dy = mouse.y - p1.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14400) { // 120^2
          const dist = Math.sqrt(distSq);
          const angle = Math.atan2(dy, dx);
          p1.x -= Math.cos(angle) * 0.8;
          p1.y -= Math.sin(angle) * 0.8;
          p1.radius = p1.baseRadius * 1.5;
        } else {
          p1.radius += (p1.baseRadius - p1.radius) * 0.1;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color + p1.alpha + ')';
        ctx.fill();

        // Connect near neighbors only if enabled
        if (drawConnections) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dxNodes = p1.x - p2.x;
            const dyNodes = p1.y - p2.y;
            const distSqNodes = dxNodes * dxNodes + dyNodes * dyNodes;
            if (distSqNodes < 12100) { // 110^2
              const distNodes = Math.sqrt(distSqNodes);
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              const lineAlpha = (1 - distNodes / 110) * 0.12;
              ctx.strokeStyle = `rgba(37, 99, 235, ${lineAlpha})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [density, particleSize, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
