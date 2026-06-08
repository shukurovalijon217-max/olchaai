interface NexusLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textOnly?: boolean;
}

const SIZES = {
  sm: { ring: 32, text: "text-base" },
  md: { ring: 44, text: "text-xl" },
  lg: { ring: 64, text: "text-3xl" },
  xl: { ring: 96, text: "text-5xl" },
};

export default function NexusLogo({ size = "md", showText = true, textOnly = false }: NexusLogoProps) {
  const s = SIZES[size];
  const r = s.ring;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {!textOnly && (
        <div style={{ width: r, height: r, position: "relative", flexShrink: 0 }}>
          {/* Outer metallic ring */}
          <svg
            width={r}
            height={r}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              {/* Metallic ring gradient */}
              <linearGradient id="ringGradOuter" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9a8070" />
                <stop offset="25%" stopColor="#c8a882" />
                <stop offset="50%" stopColor="#6b5040" />
                <stop offset="75%" stopColor="#b89070" />
                <stop offset="100%" stopColor="#5a3a2a" />
              </linearGradient>
              <linearGradient id="ringGradInner" x1="30" y1="15" x2="70" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2a1a10" />
                <stop offset="40%" stopColor="#3d2418" />
                <stop offset="100%" stopColor="#1a0a05" />
              </linearGradient>
              {/* Red sphere gradient */}
              <radialGradient id="sphereGrad" cx="38%" cy="32%" r="60%" fx="38%" fy="32%">
                <stop offset="0%" stopColor="#ff6060" />
                <stop offset="30%" stopColor="#e02020" />
                <stop offset="65%" stopColor="#b00000" />
                <stop offset="100%" stopColor="#600000" />
              </radialGradient>
              {/* Sphere rim glow */}
              <radialGradient id="sphereRimGlow" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="#cc000044" />
              </radialGradient>
              {/* Highlight on sphere */}
              <radialGradient id="sphereHighlight" cx="38%" cy="28%" r="35%">
                <stop offset="0%" stopColor="#ff9090" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff4040" stopOpacity="0" />
              </radialGradient>
              {/* Drop shadow filter */}
              <filter id="sphereShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#cc0000" floodOpacity="0.5" />
              </filter>
              <filter id="ringShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Outer ring border */}
            <circle cx="50" cy="50" r="47" fill="url(#ringGradOuter)" filter="url(#ringShadow)" />

            {/* Ring inner dark channel */}
            <circle cx="50" cy="50" r="43" fill="url(#ringGradInner)" />

            {/* Inner metallic shine */}
            <circle cx="50" cy="50" r="43" fill="none" stroke="url(#ringGradOuter)" strokeWidth="1.5" opacity="0.6" />

            {/* Red sphere */}
            <circle cx="50" cy="50" r="36" fill="url(#sphereGrad)" filter="url(#sphereShadow)" />

            {/* Sphere highlight (top-left gloss) */}
            <circle cx="50" cy="50" r="36" fill="url(#sphereHighlight)" />

            {/* Subtle rim glow around sphere */}
            <circle cx="50" cy="50" r="36" fill="none" stroke="#cc0000" strokeWidth="1" opacity="0.4" />

            {/* Top-left specular highlight */}
            <ellipse cx="40" cy="37" rx="10" ry="7" fill="white" opacity="0.18" transform="rotate(-20 40 37)" />
          </svg>
        </div>
      )}

      {showText && (
        <span
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing: "0.18em",
            fontWeight: 400,
            background: "linear-gradient(180deg, #c8a882 0%, #9a6840 35%, #c8a070 60%, #5a3020 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
          }}
          className={s.text}
        >
          NEXUS
        </span>
      )}
    </div>
  );
}
