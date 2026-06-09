interface NexusLogoProps {
  ringSize?: number;
  showText?: boolean;
  fontSize?: string;
  letterSpacing?: string;
}

export default function NexusLogo({
  ringSize = 48,
  showText = true,
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
}: NexusLogoProps) {
  const r = ringSize;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
      {/* The red-sphere-in-ring icon */}
      <svg
        width={r}
        height={r}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Outer ring — bronze/gold metallic */}
          <linearGradient id="nx-ring1" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%"   stopColor="#d4a96a" />
            <stop offset="22%"  stopColor="#f0c87a" />
            <stop offset="45%"  stopColor="#7a4a28" />
            <stop offset="68%"  stopColor="#c89060" />
            <stop offset="100%" stopColor="#4a2810" />
          </linearGradient>

          {/* Ring channel — dark inner */}
          <radialGradient id="nx-channel" cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#2a1408" />
            <stop offset="100%" stopColor="#0d0603" />
          </radialGradient>

          {/* Red sphere */}
          <radialGradient id="nx-sphere" cx="36%" cy="30%" r="65%" fx="36%" fy="30%">
            <stop offset="0%"   stopColor="#ff7060" />
            <stop offset="28%"  stopColor="#e01a10" />
            <stop offset="60%"  stopColor="#a80000" />
            <stop offset="100%" stopColor="#500000" />
          </radialGradient>

          {/* Gloss highlight on sphere */}
          <radialGradient id="nx-gloss" cx="36%" cy="26%" r="38%">
            <stop offset="0%"   stopColor="rgba(255,200,180,0.75)" />
            <stop offset="60%"  stopColor="rgba(255,80,60,0.15)" />
            <stop offset="100%" stopColor="rgba(255,0,0,0)" />
          </radialGradient>

          {/* Glow filter around sphere */}
          <filter id="nx-glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow on ring */}
          <filter id="nx-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.9" />
          </filter>
        </defs>

        {/* Outer metallic ring (outermost) */}
        <circle cx="50" cy="50" r="48" fill="url(#nx-ring1)" filter="url(#nx-shadow)" />

        {/* Dark inner channel */}
        <circle cx="50" cy="50" r="43" fill="url(#nx-channel)" />

        {/* Inner metallic rim highlight */}
        <circle cx="50" cy="50" r="43" fill="none" stroke="#c8905050" strokeWidth="1.5" />

        {/* Red sphere with glow */}
        <circle cx="50" cy="50" r="36" fill="url(#nx-sphere)" filter="url(#nx-glow)" />

        {/* Gloss overlay */}
        <ellipse cx="44" cy="38" rx="15" ry="11"
          fill="url(#nx-gloss)"
          transform="rotate(-18 44 38)"
        />

        {/* Inner ring edge highlight */}
        <circle cx="50" cy="50" r="36" fill="none" stroke="#ff200020" strokeWidth="2" />
      </svg>

      {/* OlCha text */}
      {showText && (
        <span style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          letterSpacing,
          fontWeight: 400,
          fontSize,
          background: "linear-gradient(180deg, #d4a96a 0%, #f0c060 30%, #a06030 65%, #6a3a18 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
        }}>
          OlCha
        </span>
      )}
    </div>
  );
}
