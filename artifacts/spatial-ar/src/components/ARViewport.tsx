import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAREngine } from "../hooks/useAREngine";
import { PermissionGate } from "./PermissionGate";
import { StatusHUD } from "./StatusHUD";
import type { HitInfo } from "../engine/UIScene";

// ── WebGL fallback ─────────────────────────────────────────────────────────

function WebGLFallback() {
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,60,90,0.4) 0%, #000 70%)" }} />
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div key={i} className="absolute h-px w-full"
          style={{ top: `${i * 6.25}%`, background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.05),transparent)" }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.1 }} />
      ))}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-6 text-center px-8 max-w-sm">
        <motion.div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ border: "2px solid rgba(0,229,255,0.3)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ border: "1px solid rgba(0,229,255,0.6)" }}>
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.8 1.8M5 14.5l-1.8 1.8m0 0l1.8 1.8M3.2 16.3a11.955 11.955 0 003.8 2.7M20.8 16.3a11.954 11.954 0 01-3.8 2.7" />
            </svg>
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">OlCha Spatial AR Engine</h2>
          <p className="text-xs font-mono text-cyan-400/50 uppercase tracking-widest mb-3">WebGL · Hologram Interface</p>
          <p className="text-sm text-white/40 leading-relaxed">
            Ushbu muhit WebGL2 ni qo'llab-quvvatlamaydi. Chrome yoki Safari brauzerida to'liq tajribani ko'ring.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full text-xs font-mono">
          {[["Three.js","0.176"],["WebRTC","API"],["GLSL Shaders","Custom"],["60 FPS","Target"]].map(([k,v]) => (
            <div key={k} className="flex justify-between px-3 py-2 rounded-lg"
              style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.08)" }}>
              <span className="text-white/30">{k}</span>
              <span className="text-cyan-400/60">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/15 font-mono">OlCha Super Social Platform · Spatial Module v1.0</p>
      </motion.div>
    </div>
  );
}

// ── Hit Toast ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  menu: "rgba(0,229,255,0.15)",
  post: "rgba(255,107,157,0.12)",
  profile: "rgba(167,139,250,0.12)",
};
const TYPE_BORDER: Record<string, string> = {
  menu: "rgba(0,229,255,0.4)",
  post: "rgba(255,107,157,0.4)",
  profile: "rgba(167,139,250,0.4)",
};
const TYPE_ICON: Record<string, string> = { menu: "◈", post: "◉", profile: "◎" };

function HitToast({ hit }: { hit: HitInfo }) {
  return (
    <motion.div
      key={hit.id + hit.type}
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="absolute bottom-24 left-1/2 z-25 -translate-x-1/2 max-w-xs w-full px-4"
    >
      <div className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{ background: TYPE_COLORS[hit.type] ?? "rgba(0,229,255,0.12)", border: `1px solid ${TYPE_BORDER[hit.type] ?? "rgba(0,229,255,0.35)"}`, backdropFilter: "blur(12px)" }}>
        {/* Shimmer */}
        <motion.div className="absolute inset-0"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />
        <span className="text-xl mt-0.5 shrink-0"
          style={{ color: TYPE_BORDER[hit.type] ?? "rgba(0,229,255,0.85)" }}>
          {TYPE_ICON[hit.type]}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5"
            style={{ color: TYPE_BORDER[hit.type] }}>
            {hit.type === "menu" ? "Menyu bosildi" : hit.type === "post" ? "Post" : "Profil"}
          </p>
          <p className="text-white/80 text-xs leading-snug line-clamp-2">{hit.label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Interaction tips ───────────────────────────────────────────────────────────

function InteractionTips({ isMobile }: { isMobile: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
    >
      <p className="text-[10px] font-mono text-white/20 text-center tracking-wider">
        {isMobile
          ? "3D elementlarga tegib, animatsiyani ko'ring"
          : "3D elementlarga bosib, animatsiyani ko'ring  ·  sichqonchani harakatlantiring →"}
      </p>
    </motion.div>
  );
}

// ── Main Viewport ─────────────────────────────────────────────────────────────

export function ARViewport() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { state, requestAR, skipToDemo } = useAREngine(videoRef, canvasRef, overlayRef);

  if (!state.webglAvailable) return <WebGLFallback />;

  const showOverlay = state.ready && state.permission !== "idle" && state.permission !== "requesting";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">

      {/* Camera video background */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: state.mode === "ar" ? 1 : 0, transition: "opacity 1s ease" }}
        playsInline muted autoPlay />

      {/* Demo background gradient */}
      <AnimatePresence>
        {state.mode === "demo" && (
          <motion.div key="demoback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,60,90,0.5) 0%, rgba(0,10,25,0.95) 70%, #000 100%)" }} />
        )}
      </AnimatePresence>

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(0,229,255,0.022) 40px)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(0,229,255,0.014) 40px)" }} />

      {/* Three.js WebGL canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />

      {/* Interaction capture overlay — sits above canvas, below HUD/gates */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10"
        style={{ pointerEvents: showOverlay ? "auto" : "none", cursor: "crosshair" }}
      />

      {/* Status HUD */}
      {state.ready && (
        <StatusHUD stats={state.stats} mode={state.mode} permission={state.permission} />
      )}

      {/* Permission gate */}
      <PermissionGate
        permission={state.permission}
        isMobile={state.isMobile}
        onGrant={requestAR}
        onSkip={skipToDemo}
      />

      {/* Hit toast */}
      <AnimatePresence>
        {state.lastHit && <HitToast hit={state.lastHit} />}
      </AnimatePresence>

      {/* Interaction tips */}
      {showOverlay && <InteractionTips isMobile={state.isMobile} />}

      {/* Boot animation */}
      <AnimatePresence>
        {!state.ready && state.permission !== "idle" && state.permission !== "requesting" && (
          <motion.div key="boot" initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black">
            <div className="text-center space-y-3">
              <motion.div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 mx-auto"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <p className="text-xs text-cyan-400/60 font-mono tracking-widest">BOOT SEQUENCE</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR mode vignette */}
      {state.mode === "ar" && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 120px rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.08)" }} />
      )}
    </div>
  );
}
