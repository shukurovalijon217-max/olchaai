import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useAnimation,
} from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useDockedState } from "@/hooks/useDockedState";

/* ── Storage ──────────────────────────────────────────────────── */
const POS_KEY = "olcha_fab_xy";
const DOT_KEY = "olcha_fab_dot";

function loadXY() {
  try {
    const s = localStorage.getItem(POS_KEY);
    if (s) {
      const p = JSON.parse(s) as { x: number; y: number };
      if (
        typeof p.x === "number" && typeof p.y === "number" &&
        p.x >= -120 && p.x <= 0 &&
        p.y >= -350 && p.y <= 80
      ) return p;
    }
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

/* ── Orbit sparks ─────────────────────────────────────────────── */
const SPARKS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  angle: (i / 6) * 2 * Math.PI,
  delay: i * 0.4,
  warm: i % 2 === 0,
}));

const SIZE     = 44;
const DOT_SIZE = 20;
const RING_R   = SIZE * 0.60;

/* ── Component ────────────────────────────────────────────────── */
export default function FloatingAvatar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { edged, dock } = useDockedState("right");

  const [isDot, setIsDot] = useState(() => {
    try { return localStorage.getItem(DOT_KEY) !== "0"; } catch { return true; }
  });

  /* Drag position */
  const initXY = loadXY();
  const dragX = useMotionValue(initXY.x);
  const dragY = useMotionValue(initXY.y);

  /* Reset position when restored from edge */
  useEffect(() => {
    if (!edged) {
      const { x, y } = loadXY();
      dragX.set(x);
      dragY.set(y);
    }
  }, [edged, dragX, dragY]);

  /* 3-D tilt */
  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-35, 35], [14, -14]), { stiffness: 360, damping: 24 });
  const rotY = useSpring(useTransform(mx, [-35, 35], [-14, 14]), { stiffness: 360, damping: 24 });

  /* Bubble animation controls */
  const controls = useAnimation();

  useEffect(() => {
    if (!isDot) {
      controls.start({
        scaleY: [0, 0.1, 0.4, 0.82, 1],
        scaleX: [0.25, 0.9, 1.15, 1.05, 1],
        opacity: [0, 0.55, 1, 1, 1],
        transition: {
          duration: 0.54,
          times: [0, 0.18, 0.46, 0.76, 1],
          ease: "easeOut",
        },
      });
    }
  }, [isDot, controls]);

  /* Drag click detection */
  const didDrag    = useRef(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const r = tiltRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };
  const resetTilt = () => { mx.set(0); my.set(0); };

  const onDrag = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (Math.abs(info.offset.x) > 7 || Math.abs(info.offset.y) > 7) didDrag.current = true;
  };

  const onDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    /* Swipe right → dock all floating elements */
    if (info.offset.x > 36) {
      dock();
      return;
    }
    /* Clamp x ≤ 0 on snap-back */
    if (dragX.get() > 0) dragX.set(0);
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: dragX.get(), y: dragY.get() })); } catch {}
  };

  /* Close: eye-close squish → dot */
  const closeBubble = useCallback(async () => {
    await controls.start({
      scaleY: [1, 0.62, 0.2, 0.05, 0],
      scaleX: [1, 1.07, 1.16, 0.85, 0.3],
      opacity: [1, 1, 0.92, 0.65, 0],
      transition: { duration: 0.6, times: [0, 0.25, 0.55, 0.8, 1], ease: "easeIn" },
    });
    controls.set({ scaleY: 0, scaleX: 0.25, opacity: 0 });
    setIsDot(true);
    try { localStorage.setItem(DOT_KEY, "1"); } catch {}
  }, [controls]);

  const openBubble = useCallback(() => {
    setIsDot(false);
    try { localStorage.setItem(DOT_KEY, "0"); } catch {}
  }, []);

  const handleClick = useCallback(() => {
    if (didDrag.current) { didDrag.current = false; return; }

    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);

    clickTimer.current = setTimeout(() => {
      const n = clickCount.current;
      clickCount.current = 0;

      if (n === 1) {
        if (isDot) openBubble();
        else setLocation("/profile");
      } else {
        if (isDot) openBubble();
        else closeBubble();
      }
    }, 270);
  }, [isDot, openBubble, closeBubble, setLocation]);

  if (!user) return null;
  /* When docked, the shared DockEdgeTab in Layout renders the glass tab */
  if (edged) return null;

  const initials = user.displayName
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: -120, right: 0, top: -350, bottom: 80 }}
      style={{
        x: dragX,
        y: dragY,
        position: "fixed",
        right: 16,
        bottom: 184,
        zIndex: 9992,
        touchAction: "none",
        userSelect: "none",
        cursor: "grab",
      }}
      onDrag={onDrag as never}
      onDragEnd={onDragEnd as never}
      onClick={handleClick}
      whileTap={{ cursor: "grabbing" } as never}
    >
      <AnimatePresence mode="wait">

        {/* ══ DOT (minimized) ══════════════════════════════════════ */}
        {isDot ? (
          <motion.div
            key="dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            style={{
              width: DOT_SIZE, height: DOT_SIZE,
              borderRadius: "50%",
              cursor: "pointer",
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              style={{
                position: "absolute", inset: -3, borderRadius: "50%",
                border: "1px solid rgba(185,55,245,0.40)",
              }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 28%, #ff6b6b 0%, #e53e3e 35%, #c53030 65%, #742a2a 100%)",
              boxShadow: "inset -2px 2px 5px rgba(0,0,0,0.4), inset 1px -1px 3px rgba(255,255,255,0.15)",
            }} />
            <div style={{
              position: "absolute", top: "14%", left: "18%",
              width: "38%", height: "32%",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,255,255,0.65) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <motion.div
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                boxShadow: "0 0 14px rgba(229,62,62,0.8)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

        ) : (
        /* ══ FULL BUBBLE ═════════════════════════════════════════ */
          <motion.div
            key="bubble"
            ref={tiltRef}
            initial={{ scaleY: 0, scaleX: 0.25, opacity: 0 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
            animate={controls}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetTilt}
            style={{
              rotateX: rotX,
              rotateY: rotY,
              transformStyle: "preserve-3d",
              width: SIZE, height: SIZE,
              position: "relative",
              cursor: "pointer",
            }}
          >
            {/* Glow rings × 3 */}
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                style={{
                  position: "absolute",
                  inset: -(i * 8 + 5),
                  borderRadius: "50%",
                  border: `${1.5 - i * 0.3}px solid rgba(180,50,245,${0.42 - i * 0.1})`,
                  boxShadow: `0 0 ${12 + i * 10}px rgba(155,30,220,${0.32 - i * 0.08})`,
                  pointerEvents: "none",
                }}
                animate={{
                  scale: [1, 1.05 + i * 0.025, 1],
                  opacity: [0.5 - i * 0.1, 0.88 - i * 0.16, 0.5 - i * 0.1],
                }}
                transition={{ duration: 2.3 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.45 }}
              />
            ))}

            {/* Rotating conic shimmer (forward) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: -2.5, borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, rgba(215,65,255,0.65) 22%, rgba(255,255,255,0.22) 34%, transparent 50%, rgba(95,165,255,0.5) 72%, rgba(255,255,255,0.16) 84%, transparent 100%)",
                pointerEvents: "none",
              }}
            />
            {/* Rotating conic shimmer (reverse) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: -5, borderRadius: "50%",
                background: "conic-gradient(from 100deg, transparent 0%, rgba(175,75,255,0.28) 20%, transparent 38%)",
                pointerEvents: "none",
              }}
            />

            {/* Avatar */}
            <div style={{
              position: "absolute", inset: 3, borderRadius: "50%", overflow: "hidden",
              border: "2px solid rgba(210,85,255,0.38)",
              boxShadow: "inset 0 2px 12px rgba(0,0,0,0.58), 0 0 20px rgba(170,50,240,0.4)",
            }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg,#6d28d9 0%,#be185d 55%,#db2777 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: SIZE * 0.28, fontWeight: 800, color: "#fff",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                }}>
                  {initials}
                </div>
              )}
            </div>

            {/* Glass shine */}
            <div style={{
              position: "absolute", top: 6, left: 7,
              width: "40%", height: "36%",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.6) 0%, transparent 70%)",
              pointerEvents: "none", zIndex: 10,
            }} />

            {/* Online pulse */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", bottom: 4, right: 4,
                width: 12, height: 12, borderRadius: "50%",
                background: "#22c55e",
                border: "2.5px solid rgba(0,0,0,0.75)",
                boxShadow: "0 0 12px rgba(34,197,94,0.88)",
                zIndex: 12, pointerEvents: "none",
              }}
            />

            {/* Orbiting sparks */}
            {SPARKS.map(sp => (
              <motion.div key={sp.id}
                style={{
                  position: "absolute",
                  width: 5, height: 5,
                  borderRadius: "50%",
                  background: sp.warm ? "#fff8c0" : "#ffffff",
                  boxShadow: sp.warm
                    ? "0 0 7px 4px rgba(255,220,80,0.95)"
                    : "0 0 7px 4px rgba(210,120,255,0.95)",
                  left: "50%", top: "50%",
                  marginLeft: -2.5, marginTop: -2.5,
                  pointerEvents: "none", zIndex: 13,
                }}
                animate={{
                  x: [Math.cos(sp.angle) * RING_R, Math.cos(sp.angle + Math.PI) * RING_R, Math.cos(sp.angle) * RING_R],
                  y: [Math.sin(sp.angle) * RING_R, Math.sin(sp.angle + Math.PI) * RING_R, Math.sin(sp.angle) * RING_R],
                  opacity: [0, 1, 0.5, 1, 0],
                  scale: [0, 1.6, 0.7, 1.5, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: sp.delay, ease: "easeInOut" }}
              />
            ))}

            {/* Ambient purple aura */}
            <motion.div
              animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.82, 1.18, 0.82] }}
              transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              style={{
                position: "absolute", inset: -22, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(155,35,240,0.32) 0%, transparent 65%)",
                pointerEvents: "none", zIndex: -1,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
