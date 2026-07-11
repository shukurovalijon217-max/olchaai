import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CyberCard } from "./CyberCard";
import type { OlchaAIPost } from "../hooks/useOlchaAIData";

const CARD_W = 380;
const CARD_H = 520;
const DRAG_THRESHOLD = 75;
const VELOCITY_THRESHOLD = 300;

// Stack depth config: index 0 = active (front), 1 = behind, 2 = furthest back
const STACK = [
  { scale: 1,    y: 0,  opacity: 1    },
  { scale: 0.96, y: 16, opacity: 0.7  },
  { scale: 0.92, y: 32, opacity: 0.42 },
];

interface HoloFeedProps { posts: OlchaAIPost[]; loading: boolean; }

function LoadingSkeleton() {
  return (
    <div style={{
      width: CARD_W, height: CARD_H, borderRadius: 20,
      background: "linear-gradient(145deg, rgba(0,18,44,0.6), rgba(0,8,24,0.8))",
      border: "1px solid rgba(0,229,255,0.15)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <motion.div
        style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.25)", borderTopColor: "rgba(0,229,255,0.9)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <div>
        <p style={{ color: "rgba(0,229,255,0.6)", fontSize: 11, fontFamily: "monospace", textAlign: "center", letterSpacing: "0.12em", margin: 0 }}>
          POSTLAR YUKLANMOQDA…
        </p>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "monospace", textAlign: "center", marginTop: 4, marginBottom: 0 }}>
          OlchaAI · AR Feed
        </p>
      </div>
    </div>
  );
}

export function HoloFeed({ posts, loading }: HoloFeedProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dir, setDir]               = useState<1 | -1>(1); // 1 = going forward/up, -1 = backward/down

  const goNext = () => {
    if (currentIdx < posts.length - 1) { setDir(1);  setCurrentIdx((i) => i + 1); }
  };
  const goPrev = () => {
    if (currentIdx > 0)                { setDir(-1); setCurrentIdx((i) => i - 1); }
  };

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const { y } = info.offset;
    const { y: vy } = info.velocity;
    if (y < -DRAG_THRESHOLD || vy < -VELOCITY_THRESHOLD) goNext();
    else if (y > DRAG_THRESHOLD || vy > VELOCITY_THRESHOLD) goPrev();
  };

  if (loading) {
    return (
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -52%)", zIndex: 10 }}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (posts.length === 0) return null;

  const visiblePosts = posts.slice(currentIdx, currentIdx + 3);

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -52%)", zIndex: 10 }}>
      {/* ── Card deck ── */}
      <div style={{ position: "relative", width: CARD_W, height: CARD_H }}>
        <AnimatePresence mode="popLayout" custom={dir}>
          {visiblePosts.map((post, i) => {
            const isActive = i === 0;
            const cfg      = STACK[i] ?? STACK[STACK.length - 1];

            return (
              <motion.div
                key={post.id}
                custom={dir}
                style={{ position: "absolute", inset: 0, zIndex: 10 - i, originX: 0.5, originY: 1 }}
                initial={
                  isActive
                    ? { y: dir > 0 ? 90 : -90, scale: 0.94, opacity: 0 }
                    : { y: cfg.y, scale: cfg.scale, opacity: 0 }
                }
                animate={{ y: cfg.y, scale: cfg.scale, opacity: cfg.opacity }}
                exit={
                  isActive
                    ? { y: dir > 0 ? -CARD_H * 0.7 : CARD_H * 0.7, opacity: 0, scale: 0.9 }
                    : { opacity: 0, scale: cfg.scale }
                }
                transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
                drag={isActive ? "y" : false}
                dragConstraints={{ top: -220, bottom: 220 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={isActive ? handleDragEnd : undefined}
              >
                <CyberCard post={post} isActive={isActive} stackIndex={i} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Side progress dots ── */}
      <div style={{ position: "absolute", left: -30, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 5 }}>
        {posts.map((_, i) => (
          <motion.div
            key={i}
            style={{
              width: 3, borderRadius: 2, cursor: "pointer",
              background: i === currentIdx ? "rgba(0,229,255,0.95)" : "rgba(0,229,255,0.18)",
            }}
            animate={{ height: i === currentIdx ? 24 : 6 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => { setDir(i > currentIdx ? 1 : -1); setCurrentIdx(i); }}
          />
        ))}
      </div>

      {/* ── Index counter ── */}
      <div style={{
        position: "absolute", right: -52, top: "50%",
        transform: "translateY(-50%) rotate(90deg)",
        fontFamily: "monospace", fontSize: 10,
        color: "rgba(0,229,255,0.5)", letterSpacing: "0.1em", whiteSpace: "nowrap",
      }}>
        {String(currentIdx + 1).padStart(2, "0")} / {String(posts.length).padStart(2, "0")}
      </div>

      {/* ── Nav buttons ── */}
      {currentIdx > 0 && (
        <motion.button
          style={{
            position: "absolute", top: -46, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,8,24,0.75)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(0,229,255,0.25)", borderRadius: 8,
            color: "rgba(0,229,255,0.75)", cursor: "pointer", padding: "6px 22px", fontSize: 13,
          }}
          whileHover={{ y: -2, borderColor: "rgba(0,229,255,0.7)" }}
          whileTap={{ scale: 0.93 }}
          onClick={goPrev}
        >
          ▲
        </motion.button>
      )}
      {currentIdx < posts.length - 1 && (
        <motion.button
          style={{
            position: "absolute", bottom: -46, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,8,24,0.75)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(0,229,255,0.25)", borderRadius: 8,
            color: "rgba(0,229,255,0.75)", cursor: "pointer", padding: "6px 22px", fontSize: 13,
          }}
          whileHover={{ y: 2, borderColor: "rgba(0,229,255,0.7)" }}
          whileTap={{ scale: 0.93 }}
          onClick={goNext}
        >
          ▼
        </motion.button>
      )}
    </div>
  );
}
