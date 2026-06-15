import { motion, useAnimation } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

interface NexusLogoProps {
  ringSize?: number;
  showText?: boolean;
  fontSize?: string;
  letterSpacing?: string;
}

function ellipsePoint(cx: number, cy: number, rx: number, ry: number, t: number) {
  const a = t * 2 * Math.PI;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

const SPARKS = [0, 1, 2, 3, 4, 5, 6].map(i => ({
  id: i,
  t: (i / 7 + 0.05) % 1,
  delay: i * 0.42,
  dur: 3.0 + (i % 3) * 0.45,
  color: i % 3 === 0
    ? "rgba(255,215,0,0.95)"
    : i % 3 === 1
    ? "rgba(255,240,140,0.88)"
    : "rgba(200,160,30,0.85)",
  size: i % 2 === 0 ? 1 : 0.7,
}));

export default function NexusLogo({
  ringSize = 48,
  showText = true,
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
}: NexusLogoProps) {
  const S = ringSize;
  const uid = `olcha_${S}`;

  const SCX = 50, SCY = 43, SR = 26;
  const RCX = 50, RCY = 50, RRX = 44, RRY = 13, RSW = 9;
  const backClipY = RCY;
  const frontClipMaxY = RCY + 5;

  /* ── Click animation controllers ─────────────────────── */
  const slowRingCtrl  = useAnimation(); // continuous slow spin
  const fastRingCtrl  = useAnimation(); // click burst fast spin
  const burstCtrl     = useAnimation(); // radial glow burst
  const [spinning, setSpinning] = useState(false);

  /* Start continuous slow rotation on mount */
  useEffect(() => {
    slowRingCtrl.start({
      rotate: [0, 360],
      transition: { duration: 9, repeat: Infinity, ease: "linear" },
    });
  }, [slowRingCtrl]);

  const handleClick = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);

    await Promise.all([
      /* Fast ring: appear + spin 360° + fade */
      fastRingCtrl.start({
        rotate: [0, 360],
        opacity: [0, 1, 0.9, 0],
        scale: [0.85, 1.12, 1.05, 1.15],
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
      }),
      /* Radial glow burst */
      burstCtrl.start({
        opacity: [0, 1, 0.5, 0],
        scale:   [0.4, 1.6, 2.2, 3.0],
        transition: { duration: 0.85, ease: "easeOut" },
      }),
    ]);

    fastRingCtrl.set({ rotate: 0, opacity: 0, scale: 1 });
    setSpinning(false);
  }, [spinning, fastRingCtrl, burstCtrl]);

  /* CSS ring thickness */
  const ringThick = Math.max(2, S * 0.09);
  const ringInset = -S * 0.07;
  const ringMask  = `radial-gradient(farthest-side, transparent calc(100% - ${ringThick}px), black 0)`;

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center",
        gap: S * 0.18, userSelect: "none", cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", width: S, height: S, flexShrink: 0 }}>

        {/* ── Red ambient glow (sphere) ──────────────────────── */}
        <motion.div
          animate={{ opacity: [0.2, 0.75, 0.2], scale: [0.75, 1.22, 0.75] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: -S * 0.3, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(220,10,0,0.45) 0%, rgba(160,5,0,0.18) 45%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }}
        />

        {/* ── Gold ring ambient glow ──────────────────────────── */}
        <motion.div
          animate={{ opacity: [0.08, 0.38, 0.08] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(ellipse 95% 28% at 50% 54%, rgba(255,210,50,0.32) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }}
        />

        {/* ══ CLICK BURST GLOW ══════════════════════════════════ */}
        <motion.div
          animate={burstCtrl}
          initial={{ opacity: 0, scale: 0.4 }}
          style={{
            position: "absolute",
            inset: -S * 0.25,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,215,80,0.85) 0%, rgba(220,60,255,0.35) 38%, rgba(0,200,255,0.15) 65%, transparent 80%)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* ══ SLOW-ROTATING CSS RING (silver-gold, continuous) ══ */}
        <motion.div
          animate={slowRingCtrl}
          style={{
            position: "absolute",
            inset: ringInset,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, #7a6a20, #ffd700, #ffffff, #e8c060, #c0c0c0, #ffd700, #ffffff, #c8a040, #7a6a20)",
            WebkitMask: ringMask,
            mask: ringMask,
            pointerEvents: "none",
            zIndex: 4,
            filter: "brightness(1.3) blur(0.2px)",
            opacity: 0.85,
          }}
        />

        {/* ══ FAST SPIN RING (click-activated) ═════════════════ */}
        <motion.div
          animate={fastRingCtrl}
          initial={{ opacity: 0, rotate: 0, scale: 1 }}
          style={{
            position: "absolute",
            inset: ringInset - S * 0.04,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,215,0,0) 30deg, rgba(255,255,255,0.9) 90deg, rgba(255,215,0,1) 150deg, rgba(200,150,255,0.8) 210deg, rgba(255,255,255,0.9) 270deg, rgba(255,215,0,1) 330deg, transparent 360deg)",
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThick * 1.5}px), black 0)`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThick * 1.5}px), black 0)`,
            pointerEvents: "none",
            zIndex: 5,
            filter: `brightness(2.2) blur(0.5px) drop-shadow(0 0 ${S * 0.06}px rgba(255,215,0,0.9))`,
          }}
        />

        {/* ══ MAIN SVG ══════════════════════════════════════════ */}
        <svg
          width={S} height={S} viewBox="0 0 100 100"
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", zIndex: 1 }}
        >
          <defs>
            {/* ── Red sphere gradient (enhanced deep red + bright top) ── */}
            <radialGradient id={`${uid}_sg`} cx="28%" cy="20%" r="74%">
              <stop offset="0%"   stopColor="#ff9090" />
              <stop offset="10%"  stopColor="#ff2828" />
              <stop offset="32%"  stopColor="#cc0808" />
              <stop offset="62%"  stopColor="#8a0303" />
              <stop offset="100%" stopColor="#1a0000" />
            </radialGradient>

            {/* ── Sphere glass highlight ── */}
            <radialGradient id={`${uid}_sh`} cx="24%" cy="17%" r="56%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.92)" />
              <stop offset="30%"  stopColor="rgba(255,255,255,0.28)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* ── Sphere shimmer sweep (moves across surface) ── */}
            <radialGradient id={`${uid}_ssw`} cx="65%" cy="30%" r="42%">
              <stop offset="0%"   stopColor="rgba(255,200,180,0.65)" />
              <stop offset="60%"  stopColor="rgba(255,120,100,0.15)" />
              <stop offset="100%" stopColor="rgba(255,80,60,0)" />
            </radialGradient>

            {/* ── Silver-gold ring back arc ── */}
            <linearGradient id={`${uid}_rb`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#080808" />
              <stop offset="20%"  stopColor="#2a2008" />
              <stop offset="42%"  stopColor="#6a5015" />
              <stop offset="50%"  stopColor="#7a6218" />
              <stop offset="58%"  stopColor="#6a5015" />
              <stop offset="80%"  stopColor="#2a2008" />
              <stop offset="100%" stopColor="#080808" />
            </linearGradient>

            {/* ── Silver-gold ring front arc (mixed shimmer) ── */}
            <linearGradient id={`${uid}_rf`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#1a1a1a" />
              <stop offset="7%"   stopColor="#7a7a50" />
              <stop offset="17%"  stopColor="#c8a000" />
              <stop offset="27%"  stopColor="#eacc60" />
              <stop offset="37%"  stopColor="#f8f0c0" />
              <stop offset="50%"  stopColor="#ffffff" />
              <stop offset="63%"  stopColor="#f0e080" />
              <stop offset="73%"  stopColor="#d0aa20" />
              <stop offset="83%"  stopColor="#b0b080" />
              <stop offset="93%"  stopColor="#808080" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>

            {/* ── White shimmer sweep on ring ── */}
            <linearGradient id={`${uid}_rs`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
              <stop offset="45%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="50%"  stopColor="rgba(255,255,255,0.88)" />
              <stop offset="55%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* ── Gold shimmer sweep ── */}
            <linearGradient id={`${uid}_rs2`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,215,0,0)" />
              <stop offset="36%"  stopColor="rgba(255,215,0,0)" />
              <stop offset="50%"  stopColor="rgba(255,215,0,0.72)" />
              <stop offset="64%"  stopColor="rgba(255,215,0,0)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </linearGradient>

            {/* ── Outer decorative gold ring ── */}
            <linearGradient id={`${uid}_or`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(120,100,20,0)" />
              <stop offset="25%"  stopColor="rgba(255,210,50,0.6)" />
              <stop offset="50%"  stopColor="rgba(255,240,110,0.82)" />
              <stop offset="75%"  stopColor="rgba(255,210,50,0.6)" />
              <stop offset="100%" stopColor="rgba(120,100,20,0)" />
            </linearGradient>

            {/* ── Clip: bottom half (behind sphere) ── */}
            <clipPath id={`${uid}_bc`}>
              <rect x="-20" y={backClipY} width="140" height="70" />
            </clipPath>

            {/* ── Clip: top half (in front of sphere) ── */}
            <clipPath id={`${uid}_fc`}>
              <rect x="-20" y="-20" width="140" height={frontClipMaxY + 20} />
            </clipPath>
          </defs>

          {/* ── BACK ARC (behind sphere) ────────────────────── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3.5} ry={RRY + 3.5}
            fill="none" stroke="rgba(60,50,8,0.28)" strokeWidth={RSW + 7}
            clipPath={`url(#${uid}_bc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rb)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_bc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX - RSW / 2 - 1.2} ry={Math.max(1, RRY - 3.5)}
            fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={0.8}
            clipPath={`url(#${uid}_bc)`} />

          {/* ── SPHERE ──────────────────────────────────────── */}
          {/* Shadow under sphere */}
          <ellipse cx={SCX + 1.5} cy={SCY + SR * 0.85} rx={SR * 0.7} ry={SR * 0.16}
            fill="rgba(0,0,0,0.32)" />

          {/* Main sphere */}
          <circle cx={SCX} cy={SCY} r={SR} fill={`url(#${uid}_sg)`} />

          {/* Animated shimmer sweep across sphere surface */}
          <motion.circle
            cx={SCX} cy={SCY} r={SR}
            fill={`url(#${uid}_ssw)`}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />

          {/* Sphere glass highlight */}
          <ellipse
            cx={SCX - SR * 0.18} cy={SCY - SR * 0.18}
            rx={SR * 0.35} ry={SR * 0.24}
            fill={`url(#${uid}_sh)`}
          />

          {/* Sphere rim edge glow */}
          <circle cx={SCX} cy={SCY} r={SR}
            fill="none" stroke="rgba(255,100,60,0.16)" strokeWidth={2.5} />

          {/* Sphere secondary specular dot */}
          <ellipse
            cx={SCX + SR * 0.44} cy={SCY - SR * 0.35}
            rx={SR * 0.09} ry={SR * 0.06}
            fill="rgba(255,255,255,0.38)"
          />

          {/* Sphere pulsing inner red glow */}
          <motion.circle
            cx={SCX} cy={SCY} r={SR}
            fill="none" stroke="rgba(255,60,30,0.22)" strokeWidth={5}
            animate={{ opacity: [0.08, 0.45, 0.08], scale: [0.88, 1.0, 0.88] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${SCX}px ${SCY}px` }}
          />

          {/* ── FRONT ARC (in front of sphere) ──────────────── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3.5} ry={RRY + 3.5}
            fill="none" stroke="rgba(180,155,60,0.22)" strokeWidth={RSW + 7}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX + RSW * 0.55} ry={RRY + RSW * 0.42}
            fill="none" stroke={`url(#${uid}_or)`} strokeWidth={1.6}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rf)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX - RSW / 2 - 1.2} ry={Math.max(1, RRY - 3.5)}
            fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={0.8}
            clipPath={`url(#${uid}_fc)`} />

          {/* White shimmer on ring */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }} />

          {/* Gold shimmer on ring */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs2)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} />

          {/* Bright top-arc highlight on ring */}
          <motion.ellipse cx={RCX} cy={RCY - RRY + 1.5} rx={14} ry={4}
            fill="rgba(255,255,255,0.55)"
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0.22, 0.8, 0.22] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut" }} />

          {/* Wide gold glow pulse on ring */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke="rgba(255,215,60,0.18)" strokeWidth={RSW + 6}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.65, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 3.2 }} />
        </svg>

        {/* ══ ORBITING GOLD SPARKLES ════════════════════════════ */}
        {SPARKS.map(sp => {
          const scale = S / 100;
          const p1 = ellipsePoint(RCX, RCY, RRX, RRY, sp.t);
          const p2 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.33) % 1);
          const p3 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.67) % 1);
          const sz = S * 0.058 * sp.size;
          const o = sz / 2;

          return (
            <motion.div
              key={sp.id}
              style={{
                position: "absolute",
                width: sz, height: sz,
                borderRadius: "50%",
                background: sp.color,
                boxShadow: `0 0 ${sz * 1.6}px ${sz * 1.1}px ${sp.color}`,
                pointerEvents: "none",
                zIndex: 2,
              }}
              animate={{
                left: [p1.x * scale - o, p2.x * scale - o, p3.x * scale - o, p1.x * scale - o],
                top:  [p1.y * scale - o, p2.y * scale - o, p3.y * scale - o, p1.y * scale - o],
                opacity: [0, 1, 0.65, 0.2, 1, 0],
                scale:   [0, 1.6, 0.65, 1.4, 0],
              }}
              transition={{
                duration: sp.dur,
                repeat: Infinity,
                delay: sp.delay,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* ── OlCha text ─────────────────────────────────────── */}
      {showText && (
        <motion.span
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing,
            fontWeight: 400,
            fontSize,
            background: "linear-gradient(180deg, #d4a96a 0%, #f5c860 26%, #ffe88a 44%, #c07830 65%, #6a3a18 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1,
          }}
        >
          OlCha
        </motion.span>
      )}
    </div>
  );
}
