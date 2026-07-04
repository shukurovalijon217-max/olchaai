/**
 * EmojiText — OlchaAI 9D Emoji renderer.
 * Parses text and wraps every emoji sequence in an animated .olcha-emoji span.
 * Handles: standard emoji, ZWJ sequences, skin-tones, country flags.
 */

const EMOJI_RE =
  // ZWJ sequences first (e.g. 👨‍💻), then keycap, then variation+modifier, then flags, then base
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\u20E3)?)*)|(?:[\u{1F1E0}-\u{1F1FF}]{2})/gu;

interface Props {
  text: string;
  className?: string;
}

export function EmojiText({ text, className }: Props) {
  const parts: Array<{ emoji: boolean; value: string }> = [];
  let last = 0;
  const re = new RegExp(EMOJI_RE.source, EMOJI_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ emoji: false, value: text.slice(last, m.index) });
    parts.push({ emoji: true, value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ emoji: false, value: text.slice(last) });

  if (parts.length === 0) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.emoji ? (
          <span key={i} className="olcha-emoji">{p.value}</span>
        ) : (
          p.value
        )
      )}
    </span>
  );
}
