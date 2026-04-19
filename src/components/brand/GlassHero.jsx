import { useEffect, useRef } from 'react';
import './GlassHero.css';

// Refraction-through-glass hero visual.
// Layered conic/radial gradients + subtle mouse-tracked chroma spot.
export default function GlassHero({ children }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    let targetX = 50, targetY = 50, x = 50, y = 50;

    const onMove = (e) => {
      const rect = host.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
    };
    const tick = () => {
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      host.style.setProperty('--mx', `${x}%`);
      host.style.setProperty('--my', `${y}%`);
      raf = requestAnimationFrame(tick);
    };
    host.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      host.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" ref={hostRef}>
      <div className="hero-prism" aria-hidden="true">
        <div className="prism-ring prism-ring-1" />
        <div className="prism-ring prism-ring-2" />
        <div className="prism-ring prism-ring-3" />
        <div className="prism-grid" />
        <div className="prism-spot" />
        <div className="prism-noise" />
      </div>
      <div className="hero-content">
        {children}
      </div>
    </section>
  );
}
