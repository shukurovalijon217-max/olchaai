import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Reel } from "@workspace/api-client-react";
import { Maximize2, X, Play, Pause } from "lucide-react";

interface PipState {
  video: Reel;
  startTime: number;
}

interface PipCtx {
  pip: PipState | null;
  openPip: (video: Reel, startTime: number) => void;
  closePip: () => void;
  expandPip: (() => void) | null;
  setExpandHandler: (fn: (() => void) | null) => void;
}

const PipContext = createContext<PipCtx>({
  pip: null,
  openPip: () => {},
  closePip: () => {},
  expandPip: null,
  setExpandHandler: () => {},
});

export function usePip() { return useContext(PipContext); }

/* ─────────────────────────────────────────────────────── */
/* GlobalMiniPlayer — YouTube-style persistent PiP         */
/* ─────────────────────────────────────────────────────── */
const W = 204;
const H = 120;
const EDGE_SNAP = 72;

function GlobalMiniPlayer({ pip, onClose, onExpand }: {
  pip: PipState; onClose: () => void; onExpand: () => void;
}) {
  const vRef  = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [playing,   setPlaying]   = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [side,      setSide]      = useState<"left"|"right">("right");

  /* start video at saved time */
  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    v.currentTime = pip.startTime;
    v.play().catch(() => {});
  }, [pip.startTime, pip.video.id]);

  const toggle = useCallback(() => {
    const v = vRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }, []);

  /* Safe-area inset for bottom */
  const safePad = 110;

  /* Initial position — bottom-right */
  const initX = window.innerWidth  - W - 14;
  const initY = window.innerHeight - H - safePad;
  const posRef = useRef({ x: initX, y: initY });

  /* Drag-end: snap to edge if near left/right */
  const handleDragEnd = useCallback((_: unknown, info: { point: { x: number; y: number } }) => {
    const px = info.point.x;
    const sw = window.innerWidth;
    if (px < EDGE_SNAP || px > sw - EDGE_SNAP) {
      setSide(px < sw / 2 ? "left" : "right");
      setCollapsed(true);
    }
  }, []);

  /* ── COLLAPSED tab ── */
  if (collapsed) {
    const edgeStyle: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      transform: "translateY(-50%)",
      ...(side === "right" ? { right: 0 } : { left: 0 }),
      zIndex: 9999,
      width: 48,
      height: 72,
      borderRadius: side === "right" ? "12px 0 0 12px" : "0 12px 12px 0",
      overflow: "hidden",
      cursor: "pointer",
      boxShadow: "0 4px 24px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(0,229,255,0.35)",
      background: "#08001a",
    };
    return createPortal(
      <motion.div
        initial={{ opacity: 0, x: side === "right" ? 60 : -60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: side === "right" ? 60 : -60 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        style={edgeStyle}
        onClick={() => setCollapsed(false)}
      >
        {pip.video.thumbnailUrl
          ? <img src={pip.video.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(#0d0030,#000)" }} />}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <Play style={{ width: 14, height: 14, fill: "white", color: "white" }} />
          <div style={{ width: 2, height: 20, borderRadius: 2, background: "linear-gradient(to bottom, #00e5ff, #a855f7)", opacity: 0.9 }} />
        </div>
        {/* Neon accent */}
        <div style={{
          position: "absolute", inset: 0,
          boxShadow: "inset 0 0 0 1.5px rgba(0,229,255,0.4)",
          borderRadius: "inherit", pointerEvents: "none",
        }} />
      </motion.div>,
      document.body
    );
  }

  /* ── FULL mini-player ── */
  return createPortal(
    <motion.div
      ref={dragRef}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      initial={{ scale: 0.65, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 22, stiffness: 310 }}
      onDragEnd={handleDragEnd}
      style={{
        position: "fixed",
        bottom: safePad,
        right: 14,
        width: W,
        height: H,
        borderRadius: 14,
        overflow: "hidden",
        zIndex: 9999,
        boxShadow: "0 8px 40px rgba(0,0,0,0.82), 0 0 0 1.5px rgba(0,229,255,0.28)",
        touchAction: "none",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {/* Video */}
      {pip.video.videoUrl
        ? <video ref={vRef} src={pip.video.videoUrl} playsInline loop
            style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)} />
        : pip.video.thumbnailUrl
        ? <img src={pip.video.thumbnailUrl} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", background: "#050010" }} />}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Top controls — stopPropagation prevents drag starting on buttons ── */}
      <div
        style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between" }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Expand */}
        <motion.button
          whileTap={{ scale: 0.78 }}
          onClick={e => { e.stopPropagation(); onExpand(); }}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Maximize2 style={{ width: 11, height: 11, color: "rgba(255,255,255,0.9)" }} />
        </motion.button>
        {/* Close */}
        <motion.button
          whileTap={{ scale: 0.78 }}
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <X style={{ width: 11, height: 11, color: "rgba(255,255,255,0.9)" }} />
        </motion.button>
      </div>

      {/* ── Center play/pause tap area ── */}
      <div
        style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); toggle(); }}
      >
        <AnimatePresence>
          {!playing && (
            <motion.div key="pip-play"
              initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.4 }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <Play style={{ width: 13, height: 13, fill: "white", color: "white", marginLeft: 2 }} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {playing && (
            <motion.div key="pip-pause"
              initial={{ opacity: 0 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}>
              <Pause style={{ width: 0 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px 5px" }}>
        <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pip.video.caption || "Video"}
        </p>
      </div>

      {/* Neon bottom line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg,#00e5ff,#a855f7)",
        pointerEvents: "none",
      }} />
    </motion.div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────── */
/* PipProvider                                             */
/* ─────────────────────────────────────────────────────── */
export function PipProvider({ children }: { children: ReactNode }) {
  const [pip,         setPip]         = useState<PipState | null>(null);
  const [expandFn,    setExpandFn]    = useState<(() => void) | null>(null);

  const openPip = useCallback((video: Reel, startTime: number) => {
    setPip({ video, startTime });
  }, []);

  const closePip = useCallback(() => setPip(null), []);

  const setExpandHandler = useCallback((fn: (() => void) | null) => {
    setExpandFn(() => fn);
  }, []);

  return (
    <PipContext.Provider value={{ pip, openPip, closePip, expandPip: expandFn, setExpandHandler }}>
      {children}
      <AnimatePresence>
        {pip && (
          <GlobalMiniPlayer
            key={pip.video.id}
            pip={pip}
            onClose={closePip}
            onExpand={() => { expandFn?.(); closePip(); }}
          />
        )}
      </AnimatePresence>
    </PipContext.Provider>
  );
}
