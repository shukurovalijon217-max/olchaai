import { tfScanContent } from "./tfEngine.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

export interface AiScanResult {
  score: number;
  categories: Record<string, number>;
  verdict: "clean" | "suspicious" | "violation";
  autoBlock: boolean;
  topCategory: string | null;
  engine?: "rules" | "tensorflow" | "hybrid" | "openai" | "openai+rules";
}

/* ─── Rule patterns (english + uzbek + russian) ─────────────────── */
const RULES: Array<{ category: string; patterns: RegExp[]; weight: number }> = [
  {
    category: "hate_speech",
    patterns: [
      /\b(nigger|faggot|chink|spic|kike|wetback|raghead|towelhead|cracker|honky)\b/i,
      /\b(hate\s+(all|every)\s+(blacks?|whites?|jews?|muslims?|christians?|asians?))\b/i,
      /\b(kill\s+all\s+\w+)\b/i,
      // Uzbek/Russian hate
      /\b(yahudiy|yahudilar|kaferlar|kofir|infidel)\s+(hammasi|barchasi|o'lsin|yo'q\s+qiling)/i,
      /\b(убить\s+всех|уничтожить\s+всех|смерть\s+(евреям|мусульманам|христианам))\b/i,
    ],
    weight: 0.9,
  },
  {
    category: "violence",
    patterns: [
      /\b(i\s+will\s+kill|gonna\s+kill|want\s+to\s+kill|i'll\s+murder)\b/i,
      /\b(bomb\s+threat|shoot\s+up|mass\s+shooting|terrorist\s+attack)\b/i,
      /\b(cut\s+yourself|slit\s+wrist|suicide\s+method|how\s+to\s+die)\b/i,
      // Uzbek
      /\b(o'ldiraman|o'ldir|portlat|hujum\s+qil|teraktchi)\b/i,
      // Russian
      /\b(убью|взорвать|террористическая\s+атака|массовое\s+убийство)\b/i,
    ],
    weight: 0.85,
  },
  {
    category: "adult_content",
    patterns: [
      /\b(porn|xxx|nude\s+pic|sex\s+tape|onlyfans\s+free|naked\s+photo)\b/i,
      /\b(dick\s+pic|pussy\s+pic|nudes\s+for|send\s+nudes)\b/i,
      // Uzbek
      /\b(porno|rasmlar\s+yuborgin|yalang'och\s+rasm|seks\s+video)\b/i,
      // Russian
      /\b(порно|голые\s+фото|секс\s+видео|интим\s+фото)\b/i,
    ],
    weight: 0.8,
  },
  {
    category: "extremism",
    patterns: [
      /\b(jihad\s+(now|against|kill)|allahu\s+akbar.*kill|isis|isil|daesh)\b/i,
      /\b(join\s+(isis|al.qaeda|daesh|taliban)|become\s+a\s+martyr)\b/i,
      /\b(infidels\s+(must|should)\s+die|death\s+to\s+(america|israel|west))\b/i,
      // Uzbek
      /\b(jihod|shahid\s+bo'l|kafirlarni\s+o'ldir|xilofat|hizb.ut.tahrir)\b/i,
      /\b(islom\s+davlati|terrorchilar\s+bilan|ekstremizm)\b/i,
      // Russian
      /\b(джихад|шахид|халифат|смерть\s+неверным|исламское\s+государство)\b/i,
    ],
    weight: 0.95,
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
      // Uzbek
      /\b(o'l\s+sen|joningni\s+ol|seni\s+topaman|qochib\s+qutula\s+olmaysan)\b/i,
      // Russian
      /\b(умри|убей\s+себя|я\s+знаю\s+где\s+ты\s+живёшь)\b/i,
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
      /\b(pizda|huy|ebat|blyad|suka|mudak)\b/gi,
      /\b(qo'tir|ahmoq|tentak|it\s+bola|harom)\b/gi,
    ],
    weight: 0.25,
  },
];

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
      const catScore = Math.min(rule.weight * (0.7 + matches * 0.15), 1.0);
      categories[rule.category] = Math.round(catScore * 100) / 100;
      if (catScore > maxScore) { maxScore = catScore; topCategory = rule.category; }
    }
  }
  const combinedScore = Math.min(
    Object.values(categories).reduce((a, b) => a + b * 0.3, maxScore * 0.7), 1.0
  );
  const finalScore = Math.round(combinedScore * 100) / 100;
  const verdict: AiScanResult["verdict"] =
    finalScore >= 0.7 ? "violation" : finalScore >= 0.35 ? "suspicious" : "clean";
  return { score: finalScore, categories, verdict, autoBlock: finalScore >= 0.85, topCategory };
}

/** OpenAI Moderation API — fastest, most accurate, free */
async function openaiModerationScan(text: string): Promise<Omit<AiScanResult, "engine"> | null> {
  try {
    const res = await openai.moderations.create({ input: text.slice(0, 2000) });
    const result = res.results[0];
    if (!result) return null;

    const CATEGORY_MAP: Record<string, string> = {
      "harassment":             "harassment",
      "harassment/threatening": "harassment",
      "hate":                   "hate_speech",
      "hate/threatening":       "hate_speech",
      "self-harm":              "violence",
      "self-harm/instructions": "violence",
      "self-harm/intent":       "violence",
      "sexual":                 "adult_content",
      "sexual/minors":          "adult_content",
      "violence":               "violence",
      "violence/graphic":       "violence",
    };

    const categories: Record<string, number> = {};
    let maxScore = 0;
    let topCategory: string | null = null;

    for (const [key, score] of Object.entries(result.category_scores)) {
      const mapped = CATEGORY_MAP[key];
      if (!mapped) continue;
      const s = score as number;
      const existing = categories[mapped] ?? 0;
      if (s > existing) categories[mapped] = Math.round(s * 100) / 100;
      if (s > maxScore) { maxScore = s; topCategory = mapped; }
    }

    const finalScore = Math.round(maxScore * 100) / 100;
    const verdict: AiScanResult["verdict"] =
      result.flagged ? (finalScore >= 0.7 ? "violation" : "suspicious")
        : finalScore >= 0.15 ? "suspicious" : "clean";

    return {
      score: finalScore, categories, verdict,
      autoBlock: result.flagged && finalScore >= 0.7,
      topCategory,
    };
  } catch {
    return null;
  }
}

/** Synchronous rules-only scan (used where async is not possible) */
export function scanContent(text: string): AiScanResult {
  return { ...rulesScan(text), engine: "rules" };
}

/** Full async scan: OpenAI Moderation → TF.js → rules (fallback chain) */
export async function scanContentAsync(text: string): Promise<AiScanResult> {
  if (!text || text.trim().length === 0) {
    return { score: 0, categories: {}, verdict: "clean", autoBlock: false, topCategory: null, engine: "rules" };
  }

  // Run rules and OpenAI in parallel for speed
  const [rulesResult, openaiResult] = await Promise.all([
    Promise.resolve(rulesScan(text)),
    openaiModerationScan(text),
  ]);

  // If OpenAI is available, merge with rules (OpenAI 70%, rules 30%)
  if (openaiResult) {
    const mergedCats: Record<string, number> = { ...openaiResult.categories };
    for (const [cat, rScore] of Object.entries(rulesResult.categories)) {
      const existing = mergedCats[cat] ?? 0;
      mergedCats[cat] = Math.round(Math.max(existing, rScore * 0.7) * 100) / 100;
    }
    const mergedScore = Math.min(openaiResult.score * 0.7 + rulesResult.score * 0.3, 1.0);
    const finalScore = Math.round(mergedScore * 100) / 100;
    const verdict: AiScanResult["verdict"] =
      finalScore >= 0.65 ? "violation" : finalScore >= 0.3 ? "suspicious" : "clean";
    const topCategory = openaiResult.topCategory ?? rulesResult.topCategory;
    return {
      score: finalScore, categories: mergedCats, verdict,
      autoBlock: openaiResult.autoBlock || rulesResult.autoBlock || finalScore >= 0.8,
      topCategory, engine: "openai+rules",
    };
  }

  // Fallback: TF.js
  let tfResult = null;
  try { tfResult = await tfScanContent(text); } catch { /* noop */ }
  if (!tfResult) return { ...rulesResult, engine: "rules" };

  const mergedCats: Record<string, number> = { ...rulesResult.categories };
  for (const [cat, tfScore] of Object.entries(tfResult.categories)) {
    const existing = mergedCats[cat] ?? 0;
    if (tfScore > existing) mergedCats[cat] = Math.round(tfScore * 100) / 100;
  }
  const mergedScore = Math.min(rulesResult.score * 0.55 + tfResult.score * 0.45, 1.0);
  const finalScore = Math.round(mergedScore * 100) / 100;
  const verdict: AiScanResult["verdict"] =
    finalScore >= 0.7 ? "violation" : finalScore >= 0.35 ? "suspicious" : "clean";
  const tfAny = tfResult as any;
  const topCategory = finalScore >= 0.5 ? (tfAny.topCategory ?? rulesResult.topCategory) : rulesResult.topCategory;
  return {
    score: finalScore, categories: mergedCats, verdict,
    autoBlock: finalScore >= 0.85 || rulesResult.autoBlock || (tfAny.autoBlock ?? false),
    topCategory, engine: "hybrid",
  };
}
