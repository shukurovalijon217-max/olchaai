import { tfScanContent } from "./tfEngine.js";

export interface AiScanResult {
  score: number;
  categories: Record<string, number>;
  verdict: "clean" | "suspicious" | "violation";
  autoBlock: boolean;
  topCategory: string | null;
  engine?: "rules" | "tensorflow" | "hybrid";
}

const RULES: Array<{
  category: string;
  patterns: RegExp[];
  weight: number;
}> = [
  {
    category: "hate_speech",
    patterns: [
      /\b(nigger|faggot|chink|spic|kike|wetback|raghead|towelhead|cracker|honky)\b/i,
      /\b(hate\s+(all|every)\s+(blacks?|whites?|jews?|muslims?|christians?|asians?))\b/i,
      /\b(kill\s+all\s+\w+)\b/i,
    ],
    weight: 0.9,
  },
  {
    category: "violence",
    patterns: [
      /\b(i\s+will\s+kill|gonna\s+kill|want\s+to\s+kill|i'll\s+murder)\b/i,
      /\b(bomb\s+threat|shoot\s+up|mass\s+shooting|terrorist\s+attack)\b/i,
      /\b(cut\s+yourself|slit\s+wrist|suicide\s+method|how\s+to\s+die)\b/i,
    ],
    weight: 0.85,
  },
  {
    category: "adult_content",
    patterns: [
      /\b(porn|xxx|nude\s+pic|sex\s+tape|onlyfans\s+free|naked\s+photo)\b/i,
      /\b(dick\s+pic|pussy\s+pic|nudes\s+for|send\s+nudes)\b/i,
    ],
    weight: 0.75,
  },
  {
    category: "spam",
    patterns: [
      /\b(buy\s+now|click\s+here|free\s+money|make\s+\$\d+|earn\s+\$\d+\s+per\s+day)\b/i,
      /\b(follow\s+for\s+follow|f4f|like\s+for\s+like|l4l|sub4sub)\b/i,
      /\b(dm\s+me\s+for|check\s+my\s+bio|link\s+in\s+bio.*free)\b/i,
      /(https?:\/\/\S+){3,}/i,
    ],
    weight: 0.55,
  },
  {
    category: "harassment",
    patterns: [
      /\b(you\s+should\s+(die|kill\s+yourself|end\s+your\s+life))\b/i,
      /\b(kys|kill\s+urself|rope\s+yourself)\b/i,
      /\b(i\s+know\s+where\s+you\s+live|i'll\s+find\s+you|you\s+can't\s+hide)\b/i,
    ],
    weight: 0.88,
  },
  {
    category: "misinformation",
    patterns: [
      /\b(5g\s+(causes|spreads)\s+covid|vaccines?\s+(cause|causes)\s+autism)\b/i,
      /\b(covid\s+is\s+fake|earth\s+is\s+flat|moon\s+landing\s+fake)\b/i,
    ],
    weight: 0.4,
  },
  {
    category: "profanity",
    patterns: [
      /\b(fuck(ing)?|shit|bitch|asshole|motherfucker|cunt|bastard)\b/gi,
    ],
    weight: 0.25,
  },
];

/** Rule-based scan (synchronous, always available) */
function rulesScan(text: string): Omit<AiScanResult, "engine"> {
  if (!text || text.trim().length === 0) {
    return { score: 0, categories: {}, verdict: "clean", autoBlock: false, topCategory: null };
  }

  const categories: Record<string, number> = {};
  let maxScore = 0;
  let topCategory: string | null = null;

  for (const rule of RULES) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      const m = text.match(pattern);
      if (m) matches += m.length;
    }
    if (matches > 0) {
      const cat_score = Math.min(rule.weight * (0.7 + matches * 0.15), 1.0);
      categories[rule.category] = Math.round(cat_score * 100) / 100;
      if (cat_score > maxScore) {
        maxScore = cat_score;
        topCategory = rule.category;
      }
    }
  }

  const combinedScore = Math.min(
    Object.values(categories).reduce((a, b) => a + b * 0.3, maxScore * 0.7),
    1.0
  );
  const finalScore = Math.round(combinedScore * 100) / 100;
  const verdict: "clean" | "suspicious" | "violation" =
    finalScore >= 0.7 ? "violation" : finalScore >= 0.35 ? "suspicious" : "clean";

  return { score: finalScore, categories, verdict, autoBlock: finalScore >= 0.85, topCategory };
}

/** Hybrid scan: TF.js + rules, merged for higher accuracy */
export async function scanContentAsync(text: string): Promise<AiScanResult> {
  if (!text || text.trim().length === 0) {
    return { score: 0, categories: {}, verdict: "clean", autoBlock: false, topCategory: null, engine: "rules" };
  }

  const rulesResult = rulesScan(text);

  // Try TF.js engine
  let tfResult = null;
  try {
    tfResult = await tfScanContent(text);
  } catch (_) {
    // TF unavailable — fall back to rules only
  }

  if (!tfResult) {
    return { ...rulesResult, engine: "rules" };
  }

  // Merge: rules (weight 0.55) + TF (weight 0.45) hybrid
  const mergedCategories: Record<string, number> = { ...rulesResult.categories };
  for (const [cat, tfScore] of Object.entries(tfResult.categories)) {
    const existing = mergedCategories[cat] ?? 0;
    mergedCategories[cat] = Math.round(Math.max(existing, tfScore * 0.9) * 100) / 100;
  }

  const hybridScore = Math.min(
    Math.round((rulesResult.score * 0.55 + tfResult.score * 0.45) * 100) / 100,
    1.0
  );
  const finalScore = Math.max(hybridScore, rulesResult.score); // never lower than rules alone

  const verdict: "clean" | "suspicious" | "violation" =
    finalScore >= 0.7 ? "violation" : finalScore >= 0.35 ? "suspicious" : "clean";

  let topCategory: string | null = null;
  let topVal = 0;
  for (const [cat, val] of Object.entries(mergedCategories)) {
    if (val > topVal) { topVal = val; topCategory = cat; }
  }

  return {
    score: finalScore,
    categories: mergedCategories,
    verdict,
    autoBlock: finalScore >= 0.85,
    topCategory,
    engine: "hybrid",
  };
}

/** Synchronous scan (backward-compat, rules only) */
export function scanContent(text: string): AiScanResult {
  return { ...rulesScan(text), engine: "rules" };
}

export function scanContentBatch(texts: string[]): AiScanResult[] {
  return texts.map(t => scanContent(t));
}
