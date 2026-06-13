import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useAnimation } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

/* ── Persistence keys ─────────────────────────────────────────── */
const POS_KEY = "olcha_fab_xy";
const DOT_KEY = "olcha_fab_dot";

function loadXY() {
  try {
    const s = localStorage.getItem(POS_KEY);
    return s ? JSON.parse(s) : { x: 0, y: 0 };
  } catch { return { x: 0, y: 0 }; }
}

function saveXY(x: number, y: number) {
  try { localStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch {}
}

/* ── Orbit spark positions ───────────────────────────────────── */
const SPARKS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  angle: (i / 6) * 2 * Math.PI,
  delay: i * 0.38,
  warm: i % 2 === 0,
}));

/* ── Main component ───────────────────────────────────────────── */
export default function FloatingAvatar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [isDot, setIsDot] = useState(() => {
    try { return localStorage.getItem(DOT_KEY) === "1"; } catch { return false; }
  });

  /* Drag position */
  const initXY = loadXY();
  const dragX = useMotionValue(initXY.x);
  const dragY = useMotionValue(initXY.y);

  /* 3D tilt on hover */
  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-35, 35], [16, -16]), { stiffness: 360, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-35, 35], [-16, 16]), { stiffness: 360, damping: 22 });

  /* Framer animation controls for sequenced eye anim */
  const bubbleControls = useAnimation();

  /* Drag vs click detection */
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  /* Double-click detection */
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleMouseMove = (e: React.MouseEvent) => {
    const r = tiltRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };
  const resetTilt = () => { mx.set(0); my.set(0); };

  const onDragStart = (_: never, info: { point: { x: number; y: number } }) => {
    didDrag.current = false;
    dragStart.current = { x: info.point.x, y: info.point.y };
  };
  const onDrag = (_: never, info: { offset: { x: number; y: number } }) => {
    if (Math.abs(info.offset.x) > 7 || Math.abs(info.offset.y) > 7) {
      didDrag.current = true;
    }
  };
  const onDragEnd = () => {
    saveXY(dragX.get(), dragY.get());
  };

  /* Eye-close: scaleY squishes like an eyelid closing */
  const closeBubble = useCallback(async () => {
    await bubbleControls.start({
      scaleY: [1, 0.65, 0.22, 0.06, 0],
      scaleX: [1, 1.06, 1.14, 0.88, 0.35],
      opacity: [1, 1, 0.95, 0.7, 0],
      transition: {
        duration: 0.62,
        times: [0, 0.28, 0.55, 0.78, 1],
        ease: "easeIn",
      },
    });
    setIsDot(true);
    try { localStorage.setItem(DOT_KEY, "1"); } catch {}
    /* Reset so bubble is ready when reopened */
    bubbleControls.set({ scaleY: 1, scaleX: 1, opacity: 1 });
  }, [bubbleControls]);

  /* Eye-open: reverse squish */
  const openBubble = useCallback(async () => {
    setIsDot(false);
    try { localStorage.setItem(DOT_KEY, "0"); } catch {}
    await bubbleControls.start({
      scaleY: [0, 0.06, 0.28, 0.72, 1],
      scaleX: [0.3, 0.85, 1.12, 1.05, 1],
      opacity: [0, 0.6, 1, 1, 1],
      transition: {
        duration: 0.52,
        times: [0, 0.18, 0.48, 0.78, 1],
        ease: "easeOut",
      },
    });
  }, [bubbleControls]);

  const handleClick = useCallback(() => {
    if (didDrag.current) { didDrag.current = false; return; }

    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);

    clickTimer.current = setTimeout(() => {
      const n = clickCount.current;
      clickCount.current = 0;

      if (n === 1) {
        /* Single tap */
        if (isDot) {
          openBubble();
        } else {
          setLocation("/profile");
        }
      } else {
        /* Double tap */
        if (!isDot) {
          closeBubble();
        } else {
          openBubble();
        }
      }
    }, 270);
  }, [isDot, openBubble, closeBubble, setLocation]);

  if (!user) return null;

  /* Visual helpers */
  const SIZE = 60;
  const DOT = 18;
  const RING_R = SIZE * 0.62;
  const initials = user.displayName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{
        x: dragX,
        y: dragY,
        position: "fixed",
        right: 16,
        bottom: 170,
        zIndex: 9992,
        touchAction: "none",
        userSelect: "none",
        cursor: "grab",
      }}
      onDragStart={onDragStart as never}
      onDrag={onDrag as never}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      whileTap={{ cursor: "grabbing" }}
    >
      <AnimatePresence mode="wait">
        {/* ═══ DOT STATE ═══════════════════════════════════════════ */}
        {isDot ? (
          <motion.div
            key="dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            style={{
              width: DOT,
              height: DOT,
              borderRadius: "50%",
              cursor: "pointer",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Pulse rings */}
            {[0, 1].map(i => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: -(i * 5 + 3),
                  borderRadius: "50%",
                  border: `1.5px solid rgba(190,60,240,${0.55 - i * 0.18})`,
                  boxShadow: `0 0 ${8 + i * 6}px rgba(170,40,220,${0.45 - i * 0.15})`,
                }}
                animate={{ scale: [1, 1.35 + i * 0.1, 1], opacity: [0.75, 0, 0.75] }}
                transition={{ duration: 1.9 + i * 0.55, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              />
            ))}
            {/* Mini avatar or gradient inside dot */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              background: user.avatarUrl ? undefined : "linear-gradient(135deg, #7c3aed, #db2777)",
            }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: DOT * 0.38, fontWeight: 800, color: "white",
                }} />
              )}
            </div>
            {/* Dot glow core */}
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 32%, #e040fb88, #7b1fa288)",
                boxShadow: "0 0 14px rgba(180,40,240,0.65)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

        ) : (
        /* ═══ BUBBLE STATE ════════════════════════════════════════ */
          <motion.div
            key="bubble"
            ref={tiltRef}
            initial={{ scaleY: 0, scaleX: 0.3, opacity: 0 }}
            exit={{ scaleY: 0, scaleX: 0.3, opacity: 0, transition: { duration: 0.01 } }}
            animate={bubbleControls}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetTilt}
            style={{
              rotateX: rotX,
              rotateY: rotY,
              transformStyle: "preserve-3d",
              width: SIZE,
              height: SIZE,
              position: "relative",
            }}
          >
            {/* ── Outer glow rings (3 concentric) ── */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: -(i * 8 + 5),
                  borderRadius: "50%",
                  border: `${1.5 - i * 0.3}px solid rgba(185,55,245,${0.42 - i * 0.1})`,
                  boxShadow: `0 0 ${12 + i * 9}px rgba(155,35,220,${0.32 - i * 0.08})`,
                  pointerEvents: "none",
                }}
                animate={{
                  scale: [1, 1.04 + i * 0.025, 1],
                  opacity: [0.55 - i * 0.1, 0.9 - i * 0.16, 0.55 - i * 0.1],
                }}
                transition={{
                  duration: 2.3 + i * 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.45,
                }}
              />
            ))}

            {/* ── Rotating conic-gradient shimmer ring ── */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: -2.5,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 0%, rgba(220,70,255,0.6) 22%, rgba(255,255,255,0.2) 35%, transparent 50%, rgba(100,170,255,0.5) 72%, rgba(255,255,255,0.15) 84%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {/* ── Second slow-spinning ring (opposite direction) ── */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: -5,
                borderRadius: "50%",
                background: "conic-gradient(from 120deg, transparent 0%, rgba(180,80,255,0.25) 18%, transparent 36%)",
                pointerEvents: "none",
              }}
            />

            {/* ── Avatar circle ── */}
            <div style={{
              position: "absolute",
              inset: 3,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(210,90,255,0.38)",
              boxShadow: "inset 0 2px 12px rgba(0,0,0,0.55), 0 0 18px rgba(175,55,240,0.38)",
            }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  draggable={false}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg, #6d28d9 0%, #be185d 55%, #db2777 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: SIZE * 0.28, fontWeight: 800, color: "#fff",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                }}>
                  {initials}
                </div>
              )}
            </div>

            {/* ── Glass shine highlight ── */}
            <div style={{
              position: "absolute",
              top: 6,
              left: 7,
              width: "40%",
              height: "36%",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.58) 0%, transparent 72%)",
              pointerEvents: "none",
              zIndex: 10,
            }} />

            {/* ── Online pulse dot ── */}
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [1, 0.65, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#22c55e",
                border: "2.5px solid rgba(0,0,0,0.72)",
                boxShadow: "0 0 10px rgba(34,197,94,0.85)",
                zIndex: 12,
                pointerEvents: "none",
              }}
            />

            {/* ── 9D orbiting sparkle particles ── */}
            {SPARKS.map(sp => (
              <motion.div
                key={sp.id}
                style={{
                  position: "absolute",
                  width: 4.5,
                  height: 4.5,
                  borderRadius: "50%",
                  background: sp.warm ? "#fff8b8" : "#ffffff",
                  boxShadow: sp.warm
                    ? "0 0 7px 4px rgba(255,220,80,0.95)"
                    : "0 0 6px 4px rgba(210,130,255,0.95)",
                  left: "50%",
                  top: "50%",
                  marginLeft: -2.25,
                  marginTop: -2.25,
                  pointerEvents: "none",
                  zIndex: 13,
                }}
                animate={{
                  x: [
                    Math.cos(sp.angle) * RING_R,
                    Math.cos(sp.angle + Math.PI) * RING_R,
                    Math.cos(sp.angle) * RING_R,
                  ],
                  y: [
                    Math.sin(sp.angle) * RING_R,
                    Math.sin(sp.angle + Math.PI) * RING_R,
                    Math.sin(sp.angle) * RING_R,
                  ],
                  opacity: [0, 1, 0.55, 1, 0],
                  scale: [0, 1.6, 0.7, 1.4, 0],
                }}
                transition={{
                  duration: 2.9,
                  repeat: Infinity,
                  delay: sp.delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* ── Ambient color aura ── */}
            <motion.div
              animate={{ opacity: [0.18, 0.42, 0.18], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(160,40,240,0.3) 0%, transparent 65%)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
