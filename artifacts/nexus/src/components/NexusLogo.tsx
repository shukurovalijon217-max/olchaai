import { motion, useAnimation } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

interface NexusLogoProps {
  ringSize?: number;
  showText?: boolean;
  fontSize?: string;
  letterSpacing?: string;
  showBackground?: boolean;
}

function ellipsePoint(cx: number, cy: number, rx: number, ry: number, t: number) {
  const a = t * 2 * Math.PI;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

const STARS = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  x: 7 + ((i * 37 + 13) % 86),
  y: 7 + ((i * 53 + 7) % 86),
  r: 0.4 + (i % 4) * 0.3,
  op: 0.22 + (i % 5) * 0.16,
  delay: (i * 0.31) % 3.4,
  dur: 1.5 + (i % 4) * 0.85,
}));

const SPARKS = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  t: (i / 9 + 0.055) % 1,
  delay: i * 0.35,
  dur: 3.0 + (i % 3) * 0.55,
  color: i % 3 === 0
    ? "rgba(255,220,80,0.95)"
    : i % 3 === 1
    ? "rgba(255,252,200,0.88)"
    : "rgba(200,170,55,0.82)",
  size: i % 2 === 0 ? 1.12 : 0.72,
}));

export default function NexusLogo({
  ringSize = 48,
  showText = true,
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
  showBackground = true,
}: NexusLogoProps) {
  const S = ringSize;
  const uid = `olcha_v2_${S}`;

  const SCX = 50, SCY = 43, SR = 24;
  const RCX = 50, RCY = 50, RRX = 44, RRY = 12, RSW = 8;
  const backClipY = RCY;
  const frontClipMaxY = RCY + 4;

  const slowRingCtrl = useAnimation();
  const burstCtrl    = useAnimation();
  const raysCtrl     = useAnimation();
  const ring1Ctrl    = useAnimation();
  const ring2Ctrl    = useAnimation();
  const ring3Ctrl    = useAnimation();
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    slowRingCtrl.start({
      rotate: [0, 360],
      transition: { duration: 10, repeat: Infinity, ease: "linear" },
    });
  }, [slowRingCtrl]);

  const handleClick = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    await Promise.all([
      burstCtrl.start({
        opacity: [0, 1, 0.65, 0],
        scale:   [0.18, 1.7, 2.6, 3.6],
        transition: { duration: 0.88, ease: "easeOut" },
      }),
      raysCtrl.start({
        opacity: [0, 1, 0.72, 0],
        scale:   [0.35, 1.25, 1.75, 2.3],
        rotate:  [0, 24],
        transition: { duration: 0.9, ease: "easeOut" },
      }),
      ring1Ctrl.start({
        opacity: [0, 0.95, 0],
        scale:   [0.35, 1.5, 2.4],
        transition: { duration: 0.72, ease: "easeOut" },
      }),
      ring2Ctrl.start({
        opacity: [0, 0.72, 0],
        scale:   [0.35, 1.9, 2.9],
        transition: { duration: 0.88, ease: "easeOut", delay: 0.07 },
      }),
      ring3Ctrl.start({
        opacity: [0, 0.5, 0],
        scale:   [0.35, 2.4, 3.6],
        transition: { duration: 1.0, ease: "easeOut", delay: 0.14 },
      }),
    ]);
    burstCtrl.set({ opacity: 0, scale: 0.18 });
    raysCtrl.set({ opacity: 0, scale: 0.35, rotate: 0 });
    ring1Ctrl.set({ opacity: 0, scale: 0.35 });
    ring2Ctrl.set({ opacity: 0, scale: 0.35 });
    ring3Ctrl.set({ opacity: 0, scale: 0.35 });
    setSpinning(false);
  }, [spinning, burstCtrl, raysCtrl, ring1Ctrl, ring2Ctrl, ring3Ctrl]);

  const ringThick = Math.max(1.8, S * 0.085);
  const ringInset = -S * 0.065;
  const ringMask  = `radial-gradient(farthest-side, transparent calc(100% - ${ringThick}px), black 0)`;

  return (
    <div
      onClick={handleClick}
      style={{ display: "flex", alignItems: "center", gap: S * 0.18, userSelect: "none", cursor: "pointer" }}
    >
      <div style={{ position: "relative", width: S, height: S, flexShrink: 0 }}>

        {/* ══ KOINOT FONI (COSMOS BACKGROUND) ══════════════════ */}
        {showBackground && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
            background: "radial-gradient(circle at 36% 30%, #09001f 0%, #000614 46%, #000008 100%)",
            zIndex: 0,
          }}>
            {/* Nebula 1 — binafsha/violet */}
            <motion.div
              animate={{ opacity: [0.14, 0.46, 0.14], scale: [0.83, 1.17, 0.83] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse 68% 50% at 26% 36%, rgba(95,12,185,0.62) 0%, transparent 68%)",
              }}
            />
            {/* Nebula 2 — ko'k/blue */}
            <motion.div
              animate={{ opacity: [0.07, 0.32, 0.07], scale: [1.14, 0.86, 1.14] }}
              transition={{ duration: 6.0, repeat: Infinity, ease: "easeInOut", delay: 1.9 }}
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse 55% 54% at 70% 65%, rgba(12,52,172,0.5) 0%, transparent 70%)",
              }}
            />
            {/* Nebula 3 — qizil ekvator */}
            <motion.div
              animate={{ opacity: [0.05, 0.24, 0.05] }}
              transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 3.0 }}
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse 82% 28% at 50% 80%, rgba(205,10,5,0.3) 0%, transparent 60%)",
              }}
            />
            {/* Nebula 4 — oltin shimmer */}
            <motion.div
              animate={{ opacity: [0.04, 0.18, 0.04] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse 60% 20% at 50% 50%, rgba(200,140,20,0.22) 0%, transparent 70%)",
              }}
            />
            {/* Yulduzlar / Star field */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
              {STARS.map(st => (
                <motion.circle
                  key={st.id} cx={st.x} cy={st.y} r={st.r}
                  fill="white"
                  animate={{ opacity: [st.op * 0.3, st.op, st.op * 0.22] }}
                  transition={{ duration: st.dur, repeat: Infinity, ease: "easeInOut", delay: st.delay }}
                />
              ))}
            </svg>
          </div>
        )}

        {/* ══ QIZIL SFERA ATROFI — RED SPHERE AMBIENT GLOW ═════ */}
        <motion.div
          animate={{ opacity: [0.2, 0.78, 0.2], scale: [0.7, 1.22, 0.7] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: -S * 0.3, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(238,12,5,0.52) 0%, rgba(168,5,0,0.22) 40%, transparent 65%)",
            pointerEvents: "none", zIndex: 1,
          }}
        />

        {/* ══ PORTLOVCHI NUR — CLICK EXPLOSION ════════════════ */}

        {/* Markaziy yorug'lik / Central flash */}
        <motion.div animate={burstCtrl} initial={{ opacity: 0, scale: 0.18 }}
          style={{
            position: "absolute", inset: -S * 0.35, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,235,110,1) 0%, rgba(255,120,18,0.72) 20%, rgba(235,45,255,0.38) 50%, transparent 70%)",
            pointerEvents: "none", zIndex: 14,
          }}
        />

        {/* 8 nurli yulduz / 8-ray star burst */}
        <motion.div animate={raysCtrl} initial={{ opacity: 0, scale: 0.35 }}
          style={{
            position: "absolute", inset: -S * 0.22, borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,235,105,0.92) 2deg, transparent 4deg, transparent 41deg, rgba(255,205,82,0.78) 43deg, transparent 45deg, transparent 86deg, rgba(255,245,135,0.9) 88deg, transparent 90deg, transparent 131deg, rgba(255,212,92,0.72) 133deg, transparent 135deg, transparent 176deg, rgba(255,235,105,0.88) 178deg, transparent 180deg, transparent 221deg, rgba(255,205,82,0.75) 223deg, transparent 225deg, transparent 266deg, rgba(255,245,135,0.84) 268deg, transparent 270deg, transparent 311deg, rgba(255,220,98,0.8) 313deg, transparent 315deg, transparent 356deg, rgba(255,235,105,0.62) 358deg, transparent 360deg)",
            pointerEvents: "none", zIndex: 13,
          }}
        />

        {/* Kengayuvchi halqa 1 — oltin */}
        <motion.div animate={ring1Ctrl} initial={{ opacity: 0, scale: 0.35 }}
          style={{
            position: "absolute", inset: -S * 0.1, borderRadius: "50%",
            border: `${Math.max(1, S * 0.026)}px solid rgba(255,215,60,0.92)`,
            pointerEvents: "none", zIndex: 12, boxSizing: "border-box",
          }}
        />
        {/* Kengayuvchi halqa 2 — to'q oltin */}
        <motion.div animate={ring2Ctrl} initial={{ opacity: 0, scale: 0.35 }}
          style={{
            position: "absolute", inset: -S * 0.1, borderRadius: "50%",
            border: `${Math.max(1, S * 0.019)}px solid rgba(255,155,28,0.72)`,
            pointerEvents: "none", zIndex: 11, boxSizing: "border-box",
          }}
        />
        {/* Kengayuvchi halqa 3 — binafsha */}
        <motion.div animate={ring3Ctrl} initial={{ opacity: 0, scale: 0.35 }}
          style={{
            position: "absolute", inset: -S * 0.1, borderRadius: "50%",
            border: `${Math.max(1, S * 0.013)}px solid rgba(195,75,255,0.52)`,
            pointerEvents: "none", zIndex: 10, boxSizing: "border-box",
          }}
        />

        {/* ══ AYLANUVCHI KUMUSH-OLTIN HALQA ════════════════════ */}
        <motion.div animate={slowRingCtrl}
          style={{
            position: "absolute", inset: ringInset, borderRadius: "50%",
            background: "conic-gradient(from 0deg, #483a0c, #b48e18, #ffd700, #ffffff, #ffe870, #c09500, #c0c0c0, #ffd700, #ffffff, #deb828, #7c6815, #483a0c)",
            WebkitMask: ringMask, mask: ringMask,
            pointerEvents: "none", zIndex: 4,
            filter: "brightness(1.5) blur(0.12px)",
            opacity: 0.94,
          }}
        />
        {/* Kumush-oltin halqa shimmer */}
        <motion.div
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          style={{
            position: "absolute", inset: ringInset, borderRadius: "50%",
            background: "conic-gradient(from 112deg, transparent 0deg, rgba(255,255,255,0.98) 7deg, transparent 14deg, transparent 292deg, rgba(255,242,132,0.78) 299deg, transparent 306deg)",
            WebkitMask: ringMask, mask: ringMask,
            pointerEvents: "none", zIndex: 5,
          }}
        />
        {/* Ikkinchi shimmer — kechroq */}
        <motion.div
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 4.2 }}
          style={{
            position: "absolute", inset: ringInset, borderRadius: "50%",
            background: "conic-gradient(from 248deg, transparent 0deg, rgba(255,230,100,0.88) 8deg, transparent 16deg)",
            WebkitMask: ringMask, mask: ringMask,
            pointerEvents: "none", zIndex: 5,
          }}
        />

        {/* ══ ASOSIY SVG ════════════════════════════════════════ */}
        <svg width={S} height={S} viewBox="0 0 100 100"
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", zIndex: 2 }}>
          <defs>
            {/* Qizil sfera gradienti */}
            <radialGradient id={`${uid}_sg`} cx="27%" cy="19%" r="76%">
              <stop offset="0%"   stopColor="#ffa0a0" />
              <stop offset="7%"   stopColor="#ff2828" />
              <stop offset="26%"  stopColor="#cc0606" />
              <stop offset="52%"  stopColor="#8a0202" />
              <stop offset="100%" stopColor="#150000" />
            </radialGradient>
            {/* Shisha yaltiroqlik */}
            <radialGradient id={`${uid}_sh`} cx="23%" cy="16%" r="58%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.96)" />
              <stop offset="28%"  stopColor="rgba(255,255,255,0.34)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            {/* Sfera shimmer süpürgisi */}
            <radialGradient id={`${uid}_ssw`} cx="63%" cy="27%" r="46%">
              <stop offset="0%"   stopColor="rgba(255,185,165,0.7)" />
              <stop offset="58%"  stopColor="rgba(255,100,80,0.18)" />
              <stop offset="100%" stopColor="rgba(255,60,40,0)" />
            </radialGradient>
            {/* Halqa orqa (qora-to'q oltin) */}
            <linearGradient id={`${uid}_rb`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#050505" />
              <stop offset="20%"  stopColor="#161208" />
              <stop offset="40%"  stopColor="#3c2c0e" />
              <stop offset="50%"  stopColor="#4a3812" />
              <stop offset="60%"  stopColor="#3c2c0e" />
              <stop offset="80%"  stopColor="#161208" />
              <stop offset="100%" stopColor="#050505" />
            </linearGradient>
            {/* Halqa old (kumush-oltin) */}
            <linearGradient id={`${uid}_rf`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#161616" />
              <stop offset="5%"   stopColor="#646050" />
              <stop offset="15%"  stopColor="#c49400" />
              <stop offset="25%"  stopColor="#e8c840" />
              <stop offset="37%"  stopColor="#f8f0c0" />
              <stop offset="50%"  stopColor="#ffffff" />
              <stop offset="63%"  stopColor="#f0e070" />
              <stop offset="75%"  stopColor="#cca420" />
              <stop offset="85%"  stopColor="#a8a870" />
              <stop offset="95%"  stopColor="#747474" />
              <stop offset="100%" stopColor="#161616" />
            </linearGradient>
            {/* Oq shimmer */}
            <linearGradient id={`${uid}_rs`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
              <stop offset="46%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="50%"  stopColor="rgba(255,255,255,0.95)" />
              <stop offset="54%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {/* Oltin shimmer */}
            <linearGradient id={`${uid}_rs2`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,215,0,0)" />
              <stop offset="34%"  stopColor="rgba(255,215,0,0)" />
              <stop offset="50%"  stopColor="rgba(255,215,0,0.82)" />
              <stop offset="66%"  stopColor="rgba(255,215,0,0)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </linearGradient>
            {/* Tashqi bezakli halqa */}
            <linearGradient id={`${uid}_or`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(105,88,16,0)" />
              <stop offset="22%"  stopColor="rgba(255,210,50,0.7)" />
              <stop offset="50%"  stopColor="rgba(255,240,110,0.92)" />
              <stop offset="78%"  stopColor="rgba(255,210,50,0.7)" />
              <stop offset="100%" stopColor="rgba(105,88,16,0)" />
            </linearGradient>
            {/* Klip — orqa (pastki yari) */}
            <clipPath id={`${uid}_bc`}>
              <rect x="-20" y={backClipY} width="140" height="70" />
            </clipPath>
            {/* Klip — old (yuqori yari) */}
            <clipPath id={`${uid}_fc`}>
              <rect x="-20" y="-20" width="140" height={frontClipMaxY + 20} />
            </clipPath>
          </defs>

          {/* ── Halqa orqa yoyi (sfera orqasida) ── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3} ry={RRY + 3}
            fill="none" stroke="rgba(30,22,5,0.34)" strokeWidth={RSW + 6}
            clipPath={`url(#${uid}_bc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rb)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_bc)`} />

          {/* ── QORA HALQA (sfera atrofida) ── */}
          {/* Tashqi qorayish */}
          <circle cx={SCX} cy={SCY} r={SR + 5.8}
            fill="none" stroke="rgba(45,0,0,0.26)" strokeWidth={2.2}
          />
          {/* Qora halqaning o'zi */}
          <circle cx={SCX} cy={SCY} r={SR + 3.8}
            fill="none" stroke="#000000" strokeWidth={3}
          />
          {/* Ichki chegarada qizil sho'la */}
          <circle cx={SCX} cy={SCY} r={SR + 2.4}
            fill="none" stroke="rgba(155,8,0,0.22)" strokeWidth={1.2}
          />

          {/* ── QIZIL SFERA ── */}
          {/* Soya */}
          <ellipse cx={SCX + 1.5} cy={SCY + SR * 0.9} rx={SR * 0.66} ry={SR * 0.145}
            fill="rgba(0,0,0,0.42)" />
          {/* Asosiy sfera */}
          <circle cx={SCX} cy={SCY} r={SR} fill={`url(#${uid}_sg)`} />
          {/* Animatsion shimmer süpürgisi */}
          <motion.circle cx={SCX} cy={SCY} r={SR}
            fill={`url(#${uid}_ssw)`}
            animate={{ opacity: [0, 0.97, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          {/* Shisha yaltiroqligi */}
          <ellipse
            cx={SCX - SR * 0.18} cy={SCY - SR * 0.19}
            rx={SR * 0.34} ry={SR * 0.23}
            fill={`url(#${uid}_sh)`}
          />
          {/* Chegarada yiltirash */}
          <circle cx={SCX} cy={SCY} r={SR}
            fill="none" stroke="rgba(255,80,50,0.22)" strokeWidth={3.2}
          />
          {/* Ikkinchi spekulyar nuqta */}
          <ellipse
            cx={SCX + SR * 0.44} cy={SCY - SR * 0.37}
            rx={SR * 0.09} ry={SR * 0.06}
            fill="rgba(255,255,255,0.46)"
          />
          {/* Pulslanuvchi qizil ichki sho'la */}
          <motion.circle cx={SCX} cy={SCY} r={SR}
            fill="none" stroke="rgba(255,42,12,0.36)" strokeWidth={8}
            animate={{ opacity: [0.06, 0.62, 0.06], scale: [0.84, 1.0, 0.84] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${SCX}px ${SCY}px` }}
          />
          {/* Tashqi qizgish sho'la pulsyasi */}
          <motion.circle cx={SCX} cy={SCY} r={SR + 1}
            fill="none" stroke="rgba(255,20,5,0.12)" strokeWidth={12}
            animate={{ opacity: [0, 0.4, 0], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            style={{ transformOrigin: `${SCX}px ${SCY}px` }}
          />

          {/* ── Halqa old yoyi (sfera oldida) ── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3} ry={RRY + 3}
            fill="none" stroke="rgba(150,130,46,0.26)" strokeWidth={RSW + 6}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX + RSW * 0.52} ry={RRY + RSW * 0.4}
            fill="none" stroke={`url(#${uid}_or)`} strokeWidth={1.6}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rf)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`} />

          {/* Oq shimmer halqada */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
          />
          {/* Oltin shimmer halqada */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs2)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.92, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 3.1 }}
          />
          {/* Yuqori yoy oq yaltiroqligi */}
          <motion.ellipse cx={RCX} cy={RCY - RRY + 1.5} rx={13} ry={3.5}
            fill="rgba(255,255,255,0.64)"
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0.18, 0.9, 0.18] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Keng oltin glow pulsyasi */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke="rgba(255,215,60,0.24)" strokeWidth={RSW + 9}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.75, 0] }}
            transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 3.8 }}
          />
        </svg>

        {/* ══ ORBITLANUVCHI OLTIN UCHQUNLAR ════════════════════ */}
        {SPARKS.map(sp => {
          const scale = S / 100;
          const p1 = ellipsePoint(RCX, RCY, RRX, RRY, sp.t);
          const p2 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.34) % 1);
          const p3 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.67) % 1);
          const sz = S * 0.057 * sp.size;
          const o  = sz / 2;
          return (
            <motion.div key={sp.id}
              style={{
                position: "absolute", width: sz, height: sz, borderRadius: "50%",
                background: sp.color,
                boxShadow: `0 0 ${sz * 2.0}px ${sz * 1.4}px ${sp.color}`,
                pointerEvents: "none", zIndex: 6,
              }}
              animate={{
                left: [p1.x * scale - o, p2.x * scale - o, p3.x * scale - o, p1.x * scale - o],
                top:  [p1.y * scale - o, p2.y * scale - o, p3.y * scale - o, p1.y * scale - o],
                opacity: [0, 1, 0.72, 0.22, 1, 0],
                scale:   [0, 1.8, 0.72, 1.55, 0],
              }}
              transition={{ duration: sp.dur, repeat: Infinity, delay: sp.delay, ease: "easeInOut" }}
            />
          );
        })}
      </div>

      {/* ── OlchaAI matni ── */}
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
          OlchaAI
        </motion.span>
      )}
    </div>
  );
}
