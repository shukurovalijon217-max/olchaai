import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GlitchState { x: number; y: number; id: number; }

export function GlitchLayer() {
  const [glitch, setGlitch] = useState<GlitchState | null>(null);
  const [scanY, setScanY] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(performance.now());

  // Moving scan line
  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      const t = (performance.now() - startRef.current) / 1000;
      setScanY((t % 5) / 5);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  // Random glitch events
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => {
        const id = Date.now();
        setGlitch({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 4, id });
        setTimeout(() => {
          setGlitch((g) => (g?.id === id ? null : g));
          // sometimes a second micro-glitch
          if (Math.random() > 0.5) {
            const id2 = Date.now();
            setTimeout(() => setGlitch({ x: (Math.random() - 0.5) * 4, y: 0, id: id2 }), 80);
            setTimeout(() => setGlitch((g) => (g?.id === id2 ? null : g)), 160);
          }
        }, 80 + Math.random() * 180);
        schedule();
      }, 3500 + Math.random() * 9000);
    }
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* ── CRT scanlines ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 48 }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
        }} />
      </div>

      {/* ── Moving cyan scan line ── */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          zIndex: 49, height: 2,
          top: `${scanY * 100}%`,
          background: "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.18) 20%, rgba(0,229,255,0.35) 50%, rgba(0,229,255,0.18) 80%, transparent 100%)",
          boxShadow: "0 0 12px rgba(0,229,255,0.25)",
          transform: "translateZ(0)",
        }}
      />

      {/* ── Vignette ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 47 }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }} />
        {/* Corner darkening */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, transparent 60%, rgba(0,0,0,0.3) 100%)" }} />
      </div>

      {/* ── Glitch flash ── */}
      <AnimatePresence>
        {glitch && (
          <motion.div
            key={glitch.id}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 52, transform: `translate(${glitch.x}px, ${glitch.y}px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.1, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, times: [0, 0.1, 0.5, 0.7, 1] }}
          >
            {/* Red channel shift */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(255,0,60,0.04)",
              transform: `translateX(${glitch.x * 1.5}px)`,
            }} />
            {/* Cyan channel */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,229,255,0.06)",
              transform: `translateX(${-glitch.x * 0.8}px)`,
            }} />
            {/* Horizontal tear line */}
            <div style={{
              position: "absolute", left: 0, right: 0,
              height: 2 + Math.random() * 4,
              top: `${20 + Math.random() * 60}%`,
              background: "rgba(0,229,255,0.5)",
              mixBlendMode: "screen",
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Corner bracket accents ── */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <div key={pos} className="absolute pointer-events-none" style={{
          zIndex: 46,
          top: pos.startsWith("t") ? 16 : "auto",
          bottom: pos.startsWith("b") ? 16 : "auto",
          left: pos.endsWith("l") ? 16 : "auto",
          right: pos.endsWith("r") ? 16 : "auto",
          width: 28, height: 28,
          borderTop: pos.startsWith("t") ? "2px solid rgba(0,229,255,0.4)" : undefined,
          borderBottom: pos.startsWith("b") ? "2px solid rgba(0,229,255,0.4)" : undefined,
          borderLeft: pos.endsWith("l") ? "2px solid rgba(0,229,255,0.4)" : undefined,
          borderRight: pos.endsWith("r") ? "2px solid rgba(0,229,255,0.4)" : undefined,
        }} />
      ))}
    </>
  );
}
