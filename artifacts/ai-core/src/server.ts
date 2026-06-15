/**
 * AI Core — Express REST API
 *
 * All routes are under /ai-core/
 * Used by api-server and internal agents via HTTP.
 */

import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import { trackRequest, scanForInjection, getRecentEvents, getStats as secStats } from "./security.js";
import { enqueueModeration, quickCheck, getModerationStats } from "./moderation.js";
import { getLatestSnapshot, getMetricsHistory, recordRequest } from "./analytics.js";
import { submitTask, getCompletedTask, getOrchestratorStatus, getActionLog } from "./orchestrator.js";

export const app = express();

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "64kb" }));
app.disable("x-powered-by");

// ── Security middleware ────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  (req as Request & { clientIp: string }).clientIp = ip;

  const track = trackRequest(ip);
  if (track.blocked) {
    res.status(429).json({ error: "Blocked", reason: track.reason });
    return;
  }
  next();
});

// ── Request timing ─────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const t0 = Date.now();
  res.on("finish", () => {
    recordRequest(req.path, Date.now() - t0, res.statusCode >= 500);
  });
  next();
});

// ── Health ─────────────────────────────────────────────────────────────
app.get("/ai-core/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "ai-core",
    ts: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── Full status ────────────────────────────────────────────────────────
app.get("/ai-core/status", (_req: Request, res: Response) => {
  const snap = getLatestSnapshot();
  res.json({
    orchestrator: getOrchestratorStatus(),
    security: secStats(),
    moderation: getModerationStats(),
    analytics: snap
      ? {
          uptimeS: snap.uptimeS,
          memMb: snap.memMb,
          eventLoopLagMs: snap.eventLoopLagMs,
          requestsLastMin: snap.requestsLastMin,
          errorsLastMin: snap.errorsLastMin,
          avgResponseMs: snap.avgResponseMs,
        }
      : null,
    ts: new Date().toISOString(),
  });
});

// ── Content Moderation ─────────────────────────────────────────────────
app.post("/ai-core/moderate", async (req: Request, res: Response) => {
  const { id, content, authorId, context } = req.body as {
    id?: string;
    content?: string;
    authorId?: string;
    context?: string;
  };

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content (string) required" });
    return;
  }

  const ip = (req as Request & { clientIp: string }).clientIp;
  if (scanForInjection(ip, content)) {
    res.status(400).json({ error: "Payload rejected — injection pattern detected" });
    return;
  }

  try {
    const result = await enqueueModeration({
      id: id ?? `mod-${Date.now()}`,
      content,
      authorId,
      context: context as "post" | "comment" | "profile" | "message" | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Moderation service error", detail: String(err) });
  }
});

app.post("/ai-core/moderate/quick", (req: Request, res: Response) => {
  const { content } = req.body as { content?: string };
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content required" });
    return;
  }
  const flagged = quickCheck(content);
  res.json({ flagged, method: "heuristic" });
});

// ── Orchestrator ───────────────────────────────────────────────────────
app.post("/ai-core/orchestrate", (req: Request, res: Response) => {
  const { type, payload, priority } = req.body as {
    type?: string;
    payload?: string;
    priority?: number;
  };

  if (!payload || typeof payload !== "string") {
    res.status(400).json({ error: "payload (string) required" });
    return;
  }

  const validTypes = ["moderation_review", "security_analysis", "analytics_insight", "health_check", "custom"];
  const taskType = validTypes.includes(type ?? "") ? (type as any) : "custom";
  const taskPriority: 1 | 2 | 3 = ([1, 2, 3].includes(priority ?? 2) ? priority : 2) as 1 | 2 | 3;

  const taskId = submitTask(taskType, payload, taskPriority);
  res.status(202).json({ taskId, queued: true });
});

app.get("/ai-core/orchestrate/:taskId", (req: Request, res: Response) => {
  const result = getCompletedTask(String(req.params.taskId));
  if (!result) {
    res.status(404).json({ error: "Task not found or still processing" });
    return;
  }
  res.json(result);
});

app.get("/ai-core/orchestrate/log", (_req: Request, res: Response) => {
  const limit = Math.min(parseInt((_req.query.limit as string) ?? "50", 10), 200);
  res.json({ entries: getActionLog(limit) });
});

// ── Security ───────────────────────────────────────────────────────────
app.get("/ai-core/security/events", (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 200);
  res.json({
    stats: secStats(),
    events: getRecentEvents(limit),
  });
});

app.post("/ai-core/security/report", (req: Request, res: Response) => {
  const { type, payload, detail } = req.body as { type?: string; payload?: string; detail?: string };
  if (!type || !payload) {
    res.status(400).json({ error: "type and payload required" });
    return;
  }
  const taskId = submitTask("security_analysis", `${type}: ${payload}. Detail: ${detail ?? "none"}`, 1);
  res.status(202).json({ taskId, acknowledged: true });
});

// ── Analytics ──────────────────────────────────────────────────────────
app.get("/ai-core/analytics", (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "10", 10), 60);
  res.json({
    latest: getLatestSnapshot(),
    history: getMetricsHistory(limit),
  });
});

// ── 404 ────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled server error");
  res.status(500).json({ error: "Internal server error" });
});
