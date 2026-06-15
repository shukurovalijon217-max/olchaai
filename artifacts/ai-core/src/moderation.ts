/**
 * Content & Moderation Agent
 *
 * Checks posts, comments and any user-generated content
 * against OpenAI's moderation API (free, millisecond-level).
 * Also runs a lightweight heuristic layer without any API call.
 */

import OpenAI from "openai";
import { agentLog, agentAlert, agentWarn } from "./logger.js";

const AGENT = "Moderation";

let openai: OpenAI | null = null;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch {
  /* will degrade to heuristics-only */
}

export interface ModerationInput {
  id: string;
  content: string;
  authorId?: string;
  context?: "post" | "comment" | "profile" | "message";
}

export interface ModerationResult {
  id: string;
  flagged: boolean;
  action: "allow" | "review" | "block";
  categories: Partial<Record<string, boolean>>;
  scores: Partial<Record<string, number>>;
  reason?: string;
  method: "openai" | "heuristic" | "combined";
  latencyMs: number;
}

interface QueueItem extends ModerationInput {
  resolve: (r: ModerationResult) => void;
  reject: (e: unknown) => void;
}

const queue: QueueItem[] = [];
let processing = false;

const HEURISTIC_PATTERNS = [
  { re: /\b(kill|murder|shoot)\s+(my|your|him|her|them)\b/i, category: "violence", score: 0.9 },
  { re: /\b(cp|child\s?porn|loli\s?nude)\b/i, category: "sexual/minors", score: 1.0 },
  { re: /\b(buy|sell)\s+(drugs?|cocaine|heroin|meth)\b/i, category: "illicit", score: 0.85 },
  { re: /\b(n[i1]gg[ae]r|f[a4]gg[o0]t)\b/i, category: "hate", score: 0.95 },
  { re: /\b(bomb|explosive)\s+(plan|build|make)\b/i, category: "violence/terrorism", score: 0.95 },
];

function heuristicCheck(content: string): Pick<ModerationResult, "flagged" | "categories" | "scores" | "reason"> {
  const lower = content.toLowerCase();
  const categories: Record<string, boolean> = {};
  const scores: Record<string, number> = {};
  let maxScore = 0;
  let flagReason: string | undefined;

  for (const { re, category, score } of HEURISTIC_PATTERNS) {
    if (re.test(lower)) {
      categories[category] = true;
      scores[category] = score;
      if (score > maxScore) { maxScore = score; flagReason = category; }
    }
  }

  return {
    flagged: maxScore >= 0.85,
    categories,
    scores,
    reason: flagReason,
  };
}

async function callOpenAIMod(content: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}> {
  if (!openai) throw new Error("OpenAI client not initialised");
  const res = await openai.moderations.create({ model: "omni-moderation-latest", input: content });
  const r = res.results[0];
  return {
    flagged: r.flagged,
    categories: r.categories as unknown as Record<string, boolean>,
    scores: r.category_scores as unknown as Record<string, number>,
  };
}

async function moderate(input: ModerationInput): Promise<ModerationResult> {
  const t0 = Date.now();
  const heuristic = heuristicCheck(input.content);

  const topHeuristicScore = heuristic.reason
    ? (heuristic.scores[heuristic.reason] ?? 0)
    : 0;

  if (heuristic.flagged && topHeuristicScore >= 0.95) {
    agentAlert(AGENT, `Hard-block via heuristic: ${heuristic.reason}`, {
      id: input.id,
      authorId: input.authorId,
    });
    return {
      id: input.id,
      ...heuristic,
      action: "block",
      method: "heuristic",
      latencyMs: Date.now() - t0,
    };
  }

  if (openai) {
    try {
      const oai = await callOpenAIMod(input.content);
      const combined = {
        flagged: oai.flagged || heuristic.flagged,
        categories: { ...heuristic.categories, ...oai.categories },
        scores: { ...heuristic.scores, ...oai.scores },
      };
      const scoreValues = Object.values(oai.scores).filter((s): s is number => s != null);
      const topScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
      const action: ModerationResult["action"] =
        combined.flagged && topScore >= 0.8 ? "block"
        : combined.flagged ? "review"
        : "allow";

      if (action !== "allow") {
        agentWarn(AGENT, `Content flagged via OpenAI (action=${action})`, {
          id: input.id,
          topScore,
          authorId: input.authorId,
        });
      }

      return {
        id: input.id,
        ...combined,
        action,
        reason: heuristic.reason,
        method: "combined",
        latencyMs: Date.now() - t0,
      };
    } catch (err) {
      agentWarn(AGENT, "OpenAI moderation API error — falling back to heuristic", { err });
    }
  }

  const action: ModerationResult["action"] =
    heuristic.flagged
      ? (Object.values(heuristic.scores).some(s => (s ?? 0) >= 0.9) ? "block" : "review")
      : "allow";

  return {
    id: input.id,
    ...heuristic,
    action,
    method: "heuristic",
    latencyMs: Date.now() - t0,
  };
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const result = await moderate(item);
      agentLog(AGENT, `Moderated item ${item.id}`, {
        flagged: result.flagged,
        action: result.action,
        latencyMs: result.latencyMs,
      });
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    await new Promise(r => setTimeout(r, 50));
  }

  processing = false;
}

/** Public API: enqueue a content item for moderation */
export function enqueueModeration(input: ModerationInput): Promise<ModerationResult> {
  return new Promise((resolve, reject) => {
    queue.push({ ...input, resolve, reject });
    void processQueue();
  });
}

/** Synchronous check (heuristic only, no network) */
export function quickCheck(content: string): boolean {
  return heuristicCheck(content).flagged;
}

export function getModerationStats(): { queueLength: number; openaiAvailable: boolean } {
  return { queueLength: queue.length, openaiAvailable: !!openai };
}

export function startModerationAgent(): void {
  agentLog(AGENT, "Moderation agent started", {
    openaiAvailable: !!openai,
    heuristicPatterns: HEURISTIC_PATTERNS.length,
  });
  setInterval(() => {
    if (queue.length > 0) void processQueue();
  }, 1_000);
}
