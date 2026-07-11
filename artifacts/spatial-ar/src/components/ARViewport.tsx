import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAREngine } from "../hooks/useAREngine";
import { useOlchaAIData, useOlchaAIProfiles } from "../hooks/useOlchaAIData";
import { PermissionGate } from "./PermissionGate";
import { StatusHUD } from "./StatusHUD";
import { ParticleField } from "./ParticleField";
import { GlitchLayer } from "./GlitchLayer";
import { HoloFeed } from "./HoloFeed";
import { HoloMenu } from "./HoloMenu";
import { ProfileOrbit } from "./ProfileOrbit";

// ── Cyberpunk HUD bars ────────────────────────────────────────────────────────

function TopHUD() {
  return (
    <div
      style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 44, zIndex: 30, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        background: "linear-gradient(180deg, rgba(0,8,24,0.7) 0%, transparent 100%)",
      }}
    >
      {/* Left: OlchaAI brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.div
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }}
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <span style={{ color: "rgba(0,229,255,0.9)", fontFamily: "monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.18em" }}>
          OLCHA
        </span>
        <span style={{ color: "rgba(0,229,255,0.35)", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em" }}>
          · SPATIAL AR v2
        </span>
      </div>

      {/* Center: system status */}
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        {[
          { label: "AR ENGINE", ok: true },
          { label: "HOLOGRAM", ok: true },
          { label: "FEED", ok: true },
        ].map(({ label, ok }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#00ff88" : "#ff4466", boxShadow: `0 0 5px ${ok ? "#00ff88" : "#ff4466"}` }} />
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Right: time */}
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(0,229,255,0.4)", letterSpacing: "0.08em" }}>
        {new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

// ── Holographic depth lines ───────────────────────────────────────────────────

function DepthLines() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      {/* Perspective grid floor */}
      <svg
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: "40%" }}
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
      >
        {/* Horizontal lines */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
          <line
            key={`h${i}`}
            x1={500 - 500 * t} y1={300 * (1 - (1 - t) ** 1.5)}
            x2={500 + 500 * t} y2={300 * (1 - (1 - t) ** 1.5)}
            stroke="rgba(0,229,255,0.06)" strokeWidth="1"
          />
        ))}
        {/* Vertical lines (perspective) */}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v, i) => (
          <line
            key={`v${i}`}
            x1={500} y1={0}
            x2={500 + v * 125} y2={300}
            stroke="rgba(0,229,255,0.04)" strokeWidth="1"
          />
        ))}
      </svg>

      {/* Horizon glow */}
      <div style={{
        position: "absolute",
        bottom: "38%", left: 0, right: 0,
        height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.2) 30%, rgba(160,80,255,0.15) 70%, transparent 100%)",
        boxShadow: "0 0 20px rgba(0,229,255,0.12)",
      }} />
    </div>
  );
}

// ── Main Viewport ─────────────────────────────────────────────────────────────

export function ARViewport() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { state, requestAR, skipToDemo } = useAREngine(videoRef, canvasRef, overlayRef);
  const { posts, loading } = useOlchaAIData();
  const profiles = useOlchaAIProfiles();

  return (
    <div
      style={{
        position: "relative", width: "100vw", height: "100vh",
        overflow: "hidden", background: "#000510",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Layer 0: Camera video (AR mode) ── */}
      <video
        ref={videoRef}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", zIndex: 0,
          opacity: state.mode === "ar" ? 0.45 : 0,
          transition: "opacity 1.2s ease",
        }}
        playsInline muted autoPlay
      />

      {/* ── Layer 1: Deep space background gradient ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: state.mode === "ar"
          ? "radial-gradient(ellipse at 50% 30%, rgba(0,40,70,0.3) 0%, rgba(0,0,0,0.6) 100%)"
          : "radial-gradient(ellipse at 30% 35%, rgba(0,30,60,0.9) 0%, rgba(0,8,24,0.97) 50%, #000510 100%)",
        transition: "background 1s ease",
      }} />

      {/* ── Layer 2: Three.js WebGL canvas (background hologram wireframes) ── */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}
      />

      {/* ── Layer 3: Canvas 2D particles ── */}
      <ParticleField />

      {/* ── Layer 4: Perspective depth grid ── */}
      <DepthLines />

      {/* ── Layer 5: Main interactive UI ── */}
      <div
        ref={overlayRef}
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: state.ready ? "auto" : "none" }}
      >
        {/* Post Feed - center stage */}
        <HoloFeed posts={posts} loading={loading} />

        {/* Circular menu - bottom center */}
        <HoloMenu />

        {/* Profile bubbles - right side */}
        <ProfileOrbit profiles={profiles} />
      </div>

      {/* ── Layer 6: Glitch + scanlines overlay ── */}
      <GlitchLayer />

      {/* ── Layer 7: Status HUD ── */}
      {state.ready && (
        <StatusHUD stats={state.stats} mode={state.mode} permission={state.permission} />
      )}

      {/* ── Layer 8: Top HUD bar ── */}
      <TopHUD />

      {/* ── Layer 9: AR mode neon vignette ── */}
      {state.mode === "ar" && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
          style={{
            position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none",
            boxShadow: "inset 0 0 100px rgba(0,229,255,0.07), inset 0 0 200px rgba(0,229,255,0.03)",
            border: "1px solid rgba(0,229,255,0.06)",
          }}
        />
      )}

      {/* ── Layer 10: Permission gate ── */}
      <PermissionGate
        permission={state.permission}
        isMobile={state.isMobile}
        onGrant={requestAR}
        onSkip={skipToDemo}
      />

      {/* ── Boot loader ── */}
      <AnimatePresence>
        {!state.ready && (
          <motion.div
            key="boot"
            initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{ position: "absolute", inset: 0, zIndex: 60, background: "#000510", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}
          >
            <motion.div
              style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.25)", borderTopColor: "#00e5ff" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "rgba(0,229,255,0.7)", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                OlchaAI AR Engine
              </p>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "monospace", margin: "6px 0 0", letterSpacing: "0.1em" }}>
                Hologram interface yuklanmoqda…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
