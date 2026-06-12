import { motion } from "framer-motion";

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
  delay: i * 0.45,
  dur: 3.2 + (i % 3) * 0.4,
  color: i % 3 === 0
    ? "rgba(255,255,210,0.95)"
    : i % 3 === 1
    ? "rgba(220,195,90,0.9)"
    : "rgba(255,230,140,0.85)",
  size: i % 2 === 0 ? 1 : 0.7,
}));

export default function NexusLogo({
  ringSize = 48,
  showText = true,
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
}: NexusLogoProps) {
  const S = ringSize;
  const uid = `olchalogo_${S}`;

  const SCX = 50, SCY = 43, SR = 26;
  const RCX = 50, RCY = 50, RRX = 44, RRY = 13, RSW = 9;
  const backClipY = RCY;
  const frontClipMaxY = RCY + 5;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: S * 0.18, userSelect: "none" }}>
      <div style={{ position: "relative", width: S, height: S, flexShrink: 0 }}>

        {/* Red ambient glow */}
        <motion.div
          animate={{ opacity: [0.2, 0.65, 0.2], scale: [0.78, 1.18, 0.78] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -S * 0.28,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(210,15,0,0.3) 0%, rgba(160,8,0,0.1) 45%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Gold ring glow */}
        <motion.div
          animate={{ opacity: [0.05, 0.3, 0.05] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(ellipse 95% 28% at 50% 54%, rgba(210,185,75,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Main SVG */}
        <svg
          width={S}
          height={S}
          viewBox="0 0 100 100"
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", zIndex: 1 }}
        >
          <defs>
            {/* Red sphere */}
            <radialGradient id={`${uid}_sg`} cx="32%" cy="26%" r="68%">
              <stop offset="0%" stopColor="#ff7575" />
              <stop offset="18%" stopColor="#ee1e1e" />
              <stop offset="52%" stopColor="#9a0505" />
              <stop offset="100%" stopColor="#1e0000" />
            </radialGradient>

            {/* Sphere glass highlight */}
            <radialGradient id={`${uid}_sh`} cx="27%" cy="21%" r="52%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.82)" />
              <stop offset="48%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* Chrome ring - back arc (shadowed) */}
            <linearGradient id={`${uid}_rb`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#0d0d0d" stopOpacity="0.95" />
              <stop offset="18%"  stopColor="#333" />
              <stop offset="38%"  stopColor="#707070" />
              <stop offset="50%"  stopColor="#8e8e8e" />
              <stop offset="62%"  stopColor="#707070" />
              <stop offset="82%"  stopColor="#333" />
              <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0.95" />
            </linearGradient>

            {/* Chrome ring - front arc (bright) */}
            <linearGradient id={`${uid}_rf`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#252525" />
              <stop offset="8%"   stopColor="#5a5a5a" />
              <stop offset="20%"  stopColor="#b5b5b5" />
              <stop offset="33%"  stopColor="#e4e4e4" />
              <stop offset="50%"  stopColor="#ffffff" />
              <stop offset="63%"  stopColor="#e0e0e0" />
              <stop offset="78%"  stopColor="#ababab" />
              <stop offset="92%"  stopColor="#5a5a5a" />
              <stop offset="100%" stopColor="#252525" />
            </linearGradient>

            {/* Shimmer sweep gradient */}
            <linearGradient id={`${uid}_rs`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
              <stop offset="43%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="50%"  stopColor="rgba(255,255,255,0.72)" />
              <stop offset="57%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Thin outer decorative ring */}
            <linearGradient id={`${uid}_or`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(110,95,30,0)" />
              <stop offset="28%"  stopColor="rgba(210,185,75,0.45)" />
              <stop offset="50%"  stopColor="rgba(245,225,120,0.65)" />
              <stop offset="72%"  stopColor="rgba(210,185,75,0.45)" />
              <stop offset="100%" stopColor="rgba(110,95,30,0)" />
            </linearGradient>

            {/* Second shimmer (warmish tint) */}
            <linearGradient id={`${uid}_rs2`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,240,180,0)" />
              <stop offset="35%"  stopColor="rgba(255,240,180,0)" />
              <stop offset="50%"  stopColor="rgba(255,240,180,0.45)" />
              <stop offset="65%"  stopColor="rgba(255,240,180,0)" />
              <stop offset="100%" stopColor="rgba(255,240,180,0)" />
            </linearGradient>

            {/* Clip: bottom half of ring ellipse (behind sphere) */}
            <clipPath id={`${uid}_bc`}>
              <rect x="-20" y={backClipY} width="140" height="70" />
            </clipPath>

            {/* Clip: top half + small margin (in front of sphere) */}
            <clipPath id={`${uid}_fc`}>
              <rect x="-20" y="-20" width="140" height={frontClipMaxY + 20} />
            </clipPath>
          </defs>

          {/* ── BACK ARC (behind sphere) ── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3.5} ry={RRY + 3.5}
            fill="none" stroke="rgba(70,60,15,0.22)" strokeWidth={RSW + 7}
            clipPath={`url(#${uid}_bc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rb)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_bc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX - RSW / 2 - 1.2} ry={Math.max(1, RRY - 3.5)}
            fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.8}
            clipPath={`url(#${uid}_bc)`} />

          {/* ── SPHERE ── */}
          <ellipse cx={SCX + 1.5} cy={SCY + SR * 0.85} rx={SR * 0.68} ry={SR * 0.16}
            fill="rgba(0,0,0,0.28)" />
          <circle cx={SCX} cy={SCY} r={SR} fill={`url(#${uid}_sg)`} />
          <ellipse cx={SCX - SR * 0.19} cy={SCY - SR * 0.19} rx={SR * 0.34} ry={SR * 0.23}
            fill={`url(#${uid}_sh)`} />
          <circle cx={SCX} cy={SCY} r={SR}
            fill="none" stroke="rgba(255,100,60,0.18)" strokeWidth={2.5} />
          <ellipse cx={SCX + SR * 0.44} cy={SCY - SR * 0.36} rx={SR * 0.09} ry={SR * 0.065}
            fill="rgba(255,255,255,0.32)" />

          {/* ── FRONT ARC (in front of sphere) ── */}
          <ellipse cx={RCX} cy={RCY} rx={RRX + 3.5} ry={RRY + 3.5}
            fill="none" stroke="rgba(170,150,60,0.18)" strokeWidth={RSW + 7}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX + RSW * 0.55} ry={RRY + RSW * 0.42}
            fill="none" stroke={`url(#${uid}_or)`} strokeWidth={1.4}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rf)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`} />
          <ellipse cx={RCX} cy={RCY} rx={RRX - RSW / 2 - 1.2} ry={Math.max(1, RRY - 3.5)}
            fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={0.8}
            clipPath={`url(#${uid}_fc)`} />

          {/* Animated shimmer #1 */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} />

          {/* Animated shimmer #2 (warm, offset) */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke={`url(#${uid}_rs2)`} strokeWidth={RSW}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 2.6 }} />

          {/* Bright top-arc highlight */}
          <motion.ellipse cx={RCX} cy={RCY - RRY + 1.5} rx={13} ry={3.8}
            fill="rgba(255,255,255,0.5)"
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0.25, 0.75, 0.25] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />

          {/* Wide soft glow pulse on front ring */}
          <motion.ellipse cx={RCX} cy={RCY} rx={RRX} ry={RRY}
            fill="none" stroke="rgba(255,245,180,0.12)" strokeWidth={RSW + 5}
            clipPath={`url(#${uid}_fc)`}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 3 }} />
        </svg>

        {/* Orbiting sparkle particles */}
        {SPARKS.map(sp => {
          const scale = S / 100;
          const p1 = ellipsePoint(RCX, RCY, RRX, RRY, sp.t);
          const p2 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.33) % 1);
          const p3 = ellipsePoint(RCX, RCY, RRX, RRY, (sp.t + 0.67) % 1);
          const sz = S * 0.055 * sp.size;
          const o = sz / 2;

          return (
            <motion.div
              key={sp.id}
              style={{
                position: "absolute",
                width: sz,
                height: sz,
                borderRadius: "50%",
                background: sp.color,
                boxShadow: `0 0 ${sz * 1.3}px ${sz * 0.9}px ${sp.color}`,
                pointerEvents: "none",
                zIndex: 2,
              }}
              animate={{
                left: [p1.x * scale - o, p2.x * scale - o, p3.x * scale - o, p1.x * scale - o],
                top:  [p1.y * scale - o, p2.y * scale - o, p3.y * scale - o, p1.y * scale - o],
                opacity: [0, 1, 0.6, 0.2, 1, 0],
                scale: [0, 1.5, 0.6, 1.3, 0],
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
