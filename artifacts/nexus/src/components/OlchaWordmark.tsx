import { motion } from "framer-motion";

interface OlchaWordmarkProps {
  fontSize?: string;
  letterSpacing?: string;
  fontWeight?: number;
  className?: string;
}

interface LetterStyle {
  ch: string;
  gradient: string;
  glow: string;
  dur: number;
  delay: number;
}

/**
 * Per-letter brand color spec — "OlchaAI" neon wordmark:
 *  G = cherry-red neon    i = magenta neon    l = amber-orange neon
 *  o = purple neon        s = cyan neon       AI = cyan+pink neon shimmer
 */
const LETTERS: LetterStyle[] = [
  {
    ch: "G",
    gradient: "linear-gradient(135deg, #8b0000 0%, #ff1744 28%, #ff8a80 50%, #ff1744 72%, #8b0000 100%)",
    glow: "rgba(255,23,68,0.80)",
    dur: 3.0,
    delay: 0,
  },
  {
    ch: "i",
    gradient: "linear-gradient(135deg, #880e4f 0%, #e91e8c 26%, #fce4ec 50%, #e91e8c 74%, #880e4f 100%)",
    glow: "rgba(233,30,140,0.75)",
    dur: 2.7,
    delay: 0.18,
  },
  {
    ch: "l",
    gradient: "linear-gradient(135deg, #7a1f00 0%, #ff5722 26%, #ffd180 50%, #ff5722 74%, #7a1f00 100%)",
    glow: "rgba(255,87,34,0.70)",
    dur: 3.2,
    delay: 0.36,
  },
  {
    ch: "o",
    gradient: "linear-gradient(135deg, #3b0764 0%, #9333ea 28%, #eddcff 50%, #9333ea 72%, #3b0764 100%)",
    glow: "rgba(168,85,247,0.75)",
    dur: 2.9,
    delay: 0.54,
  },
  {
    ch: "s",
    gradient: "linear-gradient(135deg, #006064 0%, #00e5ff 28%, #e0f7fa 50%, #00e5ff 72%, #006064 100%)",
    glow: "rgba(0,229,255,0.75)",
    dur: 2.5,
    delay: 0.72,
  },
  {
    ch: "A",
    gradient: "linear-gradient(135deg, #00fff0 0%, #00ffa2 26%, #ff00e5 52%, #00fff0 78%, #ff00e5 100%)",
    glow: "rgba(0,255,240,0.80)",
    dur: 2.3,
    delay: 0.90,
  },
  {
    ch: "I",
    gradient: "linear-gradient(135deg, #ff00e5 0%, #00fff0 28%, #d000ff 54%, #00ffa2 80%, #ff00e5 100%)",
    glow: "rgba(255,0,229,0.80)",
    dur: 2.3,
    delay: 1.08,
  },
];

function scaledLength(size: string, factor: number): string {
  const match = size.match(/^(-?[\d.]+)(\D*)$/);
  if (!match) return size;
  const [, num, unit] = match;
  return `${(parseFloat(num) * factor).toFixed(3)}${unit || "px"}`;
}

export default function OlchaWordmark({
  fontSize = "1.1rem",
  letterSpacing = "0.22em",
  fontWeight = 400,
  className,
}: OlchaWordmarkProps) {
  const glowSize = scaledLength(fontSize, 0.14);

  return (
    <span
      className={className}
      role="img"
      aria-label="OlchaAI"
      style={{ position: "relative", display: "inline-flex", alignItems: "baseline" }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "baseline" }}>
        {LETTERS.map((l, i) => (
          <motion.span
            key={i}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: l.dur, repeat: Infinity, ease: "easeInOut", delay: l.delay }}
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontWeight,
              fontSize,
              lineHeight: 1,
              marginRight: i < LETTERS.length - 1 ? letterSpacing : 0,
              backgroundImage: l.gradient,
              backgroundSize: "240% 240%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: `drop-shadow(0 0 ${glowSize} ${l.glow})`,
            }}
          >
            {l.ch}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
