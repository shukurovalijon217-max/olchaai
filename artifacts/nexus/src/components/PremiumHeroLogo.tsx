import { motion } from "framer-motion";

const VB = 200;
const CX = 100, CY = 100;
const GIRDLE_R = 68;
const TABLE_R = 28;

function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function oct(r: number, rot = 22.5) {
  return Array.from({ length: 8 }, (_, i) => pt(r, rot + i * 45));
}

function poly(pts: [number, number][]) {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

const GIRDLE = oct(GIRDLE_R);
const TABLE  = oct(TABLE_R);

const FACET_STOPS: [string, string][] = [
  ["#FFE566", "#C07800"],
  ["#FF9EE0", "#6A0040"],
  ["#D080FF", "#1E0055"],
  ["#5599FF", "#000070"],
  ["#00EEFF", "#003855"],
  ["#44FFAA", "#004825"],
  ["#FFFAD0", "#B89010"],
  ["#C8D8FF", "#4060B0"],
];

const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: i * 30,
  r: 82 + (i % 3) * 5,
  delay: i * 0.4,
  dur: 2.8 + (i % 4) * 0.3,
  color: ["rgba(255,220,80,0.9)", "rgba(200,100,255,0.9)", "rgba(0,230,255,0.9)", "rgba(100,255,180,0.9)"][i % 4],
}));

export default function PremiumHeroLogo({ size = 180 }: { size?: number }) {
  const scale = size / VB;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>

      {/* ── Outer radial aura gold ── */}
      <motion.div
        animate={{ opacity: [0.25, 0.75, 0.25], scale: [0.82, 1.22, 0.82] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: -size * 0.22, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,180,0,0.38) 0%, rgba(180,60,255,0.18) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Outer aura cyan ── */}
      <motion.div
        animate={{ opacity: [0.1, 0.5, 0.1], scale: [1.15, 0.88, 1.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
        style={{
          position: "absolute", inset: -size * 0.18, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,230,255,0.28) 0%, rgba(100,0,200,0.12) 50%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Sparkle particles ── */}
      {SPARKS.map(sp => {
        const [x1, y1] = pt(sp.r, sp.angle);
        const [x2, y2] = pt(sp.r, (sp.angle + 120) % 360);
        const [x3, y3] = pt(sp.r, (sp.angle + 240) % 360);
        const sz = size * 0.048;
        const off = sz / 2;
        return (
          <motion.div
            key={sp.id}
            style={{
              position: "absolute",
              width: sz, height: sz,
              borderRadius: "50%",
              background: sp.color,
              boxShadow: `0 0 ${sz * 1.6}px ${sz * 1.0}px ${sp.color}`,
              pointerEvents: "none",
              zIndex: 3,
            }}
            animate={{
              left: [x1 * scale - off, x2 * scale - off, x3 * scale - off, x1 * scale - off],
              top:  [y1 * scale - off, y2 * scale - off, y3 * scale - off, y1 * scale - off],
              opacity: [0, 1, 0.7, 0.2, 1, 0],
              scale:   [0, 1.6, 0.7, 1.4, 0],
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

      {/* ── Main SVG ── */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible", zIndex: 2 }}
      >
        <defs>
          {/* Per-facet gradients */}
          {FACET_STOPS.map(([from, to], i) => (
            <radialGradient key={i} id={`f${i}`} cx="28%" cy="25%" r="80%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </radialGradient>
          ))}

          {/* Table (center) gradient */}
          <radialGradient id="tbl" cx="33%" cy="28%" r="72%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="22%"  stopColor="#FFF9E0" />
            <stop offset="55%"  stopColor="#F0D060" />
            <stop offset="100%" stopColor="#AA7010" />
          </radialGradient>

          {/* Holographic sweep */}
          <linearGradient id="hswp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
            <stop offset="42%"  stopColor="rgba(255,255,255,0)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.72)" />
            <stop offset="58%"  stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Holo tint A — gold-orange */}
          <linearGradient id="htA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,200,30,0.35)" />
            <stop offset="100%" stopColor="rgba(255,80,0,0.18)" />
          </linearGradient>

          {/* Holo tint B — violet-cyan */}
          <linearGradient id="htB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(160,0,255,0.28)" />
            <stop offset="100%" stopColor="rgba(0,220,255,0.24)" />
          </linearGradient>

          {/* Holo tint C — emerald-pink */}
          <linearGradient id="htC" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(0,255,160,0.22)" />
            <stop offset="100%" stopColor="rgba(255,80,180,0.2)" />
          </linearGradient>

          {/* Outer ring gradient */}
          <linearGradient id="orG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(255,180,0,0)" />
            <stop offset="20%"  stopColor="rgba(255,220,80,0.8)" />
            <stop offset="40%"  stopColor="rgba(0,230,255,0.9)" />
            <stop offset="60%"  stopColor="rgba(200,80,255,0.8)" />
            <stop offset="80%"  stopColor="rgba(80,255,180,0.7)" />
            <stop offset="100%" stopColor="rgba(255,180,0,0)" />
          </linearGradient>

          {/* Edge bevel on gem */}
          <linearGradient id="bevel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>

          {/* Gem clip */}
          <clipPath id="gc">
            <polygon points={poly(GIRDLE)} />
          </clipPath>

          {/* Table clip */}
          <clipPath id="tc">
            <polygon points={poly(TABLE)} />
          </clipPath>

          {/* Center star glow */}
          <radialGradient id="csg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,1)" />
            <stop offset="40%"  stopColor="rgba(255,255,220,0.5)" />
            <stop offset="100%" stopColor="rgba(255,200,80,0)" />
          </radialGradient>

          {/* Drop shadow */}
          <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.55)" />
          </filter>
        </defs>

        {/* ── Outer glow rings ── */}
        <motion.circle
          cx={CX} cy={CY} r={90}
          fill="none" stroke="url(#orG)" strokeWidth={1.8}
          animate={{ opacity: [0.2, 0.9, 0.2], rotate: [0, 360] }}
          transition={{
            opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            rotate:  { duration: 10, repeat: Infinity, ease: "linear" },
          }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
        <motion.circle
          cx={CX} cy={CY} r={84}
          fill="none" stroke="url(#orG)" strokeWidth={0.8}
          strokeDasharray="6 4"
          animate={{ opacity: [0.15, 0.6, 0.15], rotate: [360, 0] }}
          transition={{
            opacity: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
            rotate:  { duration: 16, repeat: Infinity, ease: "linear" },
          }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
        <motion.circle
          cx={CX} cy={CY} r={77}
          fill="none" stroke="rgba(255,200,80,0.18)" strokeWidth={0.5}
          strokeDasharray="2 5"
          animate={{ opacity: [0.3, 0.8, 0.3], rotate: [0, 360] }}
          transition={{
            opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
            rotate:  { duration: 22, repeat: Infinity, ease: "linear" },
          }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />

        {/* ── Drop shadow under gem ── */}
        <ellipse
          cx={CX + 3} cy={CY + 5}
          rx={GIRDLE_R + 4} ry={GIRDLE_R + 4}
          fill="rgba(0,0,0,0.38)"
          style={{ filter: "blur(8px)" }}
        />

        {/* ── Light rays (12 beams from center) ── */}
        <motion.g
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={CX} y1={CY}
                x2={CX + 95 * Math.cos(a)} y2={CY + 95 * Math.sin(a)}
                stroke="rgba(255,220,100,0.07)"
                strokeWidth={i % 3 === 0 ? 3 : 1.5}
              />
            );
          })}
        </motion.g>

        {/* ── 8 Crown facets ── */}
        {FACET_STOPS.map((_, i) => {
          const p1 = GIRDLE[i];
          const p2 = GIRDLE[(i + 1) % 8];
          return (
            <polygon
              key={i}
              points={`${CX},${CY} ${p1[0].toFixed(2)},${p1[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`}
              fill={`url(#f${i})`}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={0.6}
              filter="url(#dropshadow)"
            />
          );
        })}

        {/* ── Sub-facet depth lines (table→girdle edges) ── */}
        {TABLE.map(([tx, ty], i) => {
          const [gx, gy] = GIRDLE[i];
          return (
            <line
              key={i}
              x1={tx.toFixed(2)} y1={ty.toFixed(2)}
              x2={gx.toFixed(2)} y2={gy.toFixed(2)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.7}
            />
          );
        })}

        {/* ── Table octagon ── */}
        <polygon
          points={poly(TABLE)}
          fill="url(#tbl)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.2}
        />

        {/* ── Holographic tint A (gold) ── */}
        <motion.polygon
          points={poly(GIRDLE)}
          fill="url(#htA)"
          clipPath="url(#gc)"
          animate={{ opacity: [0.85, 0.05, 0.85] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ── Holographic tint B (violet-cyan) ── */}
        <motion.polygon
          points={poly(GIRDLE)}
          fill="url(#htB)"
          clipPath="url(#gc)"
          animate={{ opacity: [0.05, 0.9, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* ── Holographic tint C (emerald-pink) ── */}
        <motion.polygon
          points={poly(GIRDLE)}
          fill="url(#htC)"
          clipPath="url(#gc)"
          animate={{ opacity: [0.05, 0.7, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        {/* ── Shimmer sweep ── */}
        <motion.polygon
          points={poly(GIRDLE)}
          fill="url(#hswp)"
          clipPath="url(#gc)"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />

        {/* ── Bevel edge on gem ── */}
        <polygon
          points={poly(GIRDLE)}
          fill="none"
          stroke="url(#bevel)"
          strokeWidth={2.5}
          clipPath="url(#gc)"
        />

        {/* ── Top-left glass highlight ── */}
        <ellipse
          cx={CX - 22} cy={CY - 22}
          rx={20} ry={13}
          fill="rgba(255,255,255,0.2)"
          transform={`rotate(-38, ${CX - 22}, ${CY - 22})`}
        />
        <ellipse
          cx={CX - 24} cy={CY - 24}
          rx={9} ry={5.5}
          fill="rgba(255,255,255,0.52)"
          transform={`rotate(-38, ${CX - 24}, ${CY - 24})`}
        />
        <ellipse
          cx={CX - 26} cy={CY - 26}
          rx={3.5} ry={2}
          fill="rgba(255,255,255,0.9)"
          transform={`rotate(-38, ${CX - 26}, ${CY - 26})`}
        />

        {/* ── Center star burst ── */}
        <motion.circle
          cx={CX} cy={CY} r={10}
          fill="url(#csg)"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.75, 1.35, 0.75] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
        <motion.circle
          cx={CX} cy={CY} r={4}
          fill="white"
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />

        {/* ── 4-pointed star flare at center ── */}
        {[[0, -18], [0, 18], [-18, 0], [18, 0]].map(([dx, dy], i) => (
          <motion.line
            key={i}
            x1={CX} y1={CY}
            x2={CX + dx} y2={CY + dy}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={i % 2 === 0 ? 1.2 : 0.7}
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}

        {/* ── Outer gem bevel ring ── */}
        <motion.polygon
          points={poly(oct(GIRDLE_R + 3))}
          fill="none"
          stroke="rgba(255,220,100,0.35)"
          strokeWidth={1.5}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
