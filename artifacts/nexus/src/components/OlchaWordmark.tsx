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
 * Per-letter brand color spec (user-specified, do not change casing or colors
 * without re-confirming with the user):
 *  O = purple      l = red-gold      C = purple      h = red
 *  a = silver-gold shimmer          AI = neon shimmer
 * Spelling/casing is intentionally "OlChaAI" (capital C) for the wordmark
 * treatment — running UI copy elsewhere still uses "OlchaAI".
 */
const LETTERS: LetterStyle[] = [
  {
    ch: "O",
    gradient: "linear-gradient(135deg, #3b0764 0%, #9333ea 28%, #eddcff 50%, #9333ea 72%, #3b0764 100%)",
    glow: "rgba(168,85,247,0.7)",
    dur: 3.2,
    delay: 0,
  },
  {
    ch: "l",
    gradient: "linear-gradient(135deg, #7a1f00 0%, #ff5a1f 26%, #ffd700 50%, #ff5a1f 74%, #7a1f00 100%)",
    glow: "rgba(255,170,40,0.65)",
    dur: 2.8,
    delay: 0.2,
  },
  {
    ch: "C",
    gradient: "linear-gradient(135deg, #33025c 0%, #a855f7 28%, #f5e8ff 50%, #a855f7 72%, #33025c 100%)",
    glow: "rgba(168,85,247,0.7)",
    dur: 3.4,
    delay: 0.4,
  },
  {
    ch: "h",
    gradient: "linear-gradient(135deg, #7f0000 0%, #ff2d2d 28%, #ffbdbd 50%, #ff2d2d 72%, #7f0000 100%)",
    glow: "rgba(255,45,45,0.65)",
    dur: 3.0,
    delay: 0.6,
  },
  {
    ch: "a",
    gradient: "linear-gradient(135deg, #8a8a8a 0%, #ffffff 20%, #ffd700 42%, #ffffff 58%, #c0a060 76%, #ffffff 100%)",
    glow: "rgba(255,238,190,0.65)",
    dur: 2.6,
    delay: 0.8,
  },
  {
    ch: "A",
    gradient: "linear-gradient(135deg, #00fff0 0%, #00ffa2 26%, #ff00e5 52%, #00fff0 78%, #ff00e5 100%)",
    glow: "rgba(0,255,240,0.75)",
    dur: 2.3,
    delay: 1.0,
  },
  {
    ch: "I",
    gradient: "linear-gradient(135deg, #ff00e5 0%, #00fff0 28%, #d000ff 54%, #00ffa2 80%, #ff00e5 100%)",
    glow: "rgba(255,0,229,0.75)",
    dur: 2.3,
    delay: 1.2,
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
      aria-label="OlChaAI"
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
