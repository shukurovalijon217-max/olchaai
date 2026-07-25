/**
 * Central AI Orchestrator
 *
 * Single nerve-centre that:
 *  - Accepts tasks from all agents and external callers
 *  - Routes to OpenAI for intelligent decisions
 *  - Distributes results back to requesting agents
 *  - Runs a heartbeat to confirm all agents are healthy
 *  - Maintains an append-only action log (circular buffer)
 */

import OpenAI from "openai";
import { agentLog, agentWarn, agentError } from "./logger.js";
import { getStats as secStats } from "./security.js";
import { getModerationStats } from "./moderation.js";
import { getLatestSnapshot } from "./analytics.js";
const AI_CHAT_MODEL = process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

const AGENT = "Orchestrator";
const HEARTBEAT_MS = 30_000;
const MAX_LOG_ENTRIES = 200;

let openai: OpenAI | null = null;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch {
  /* degraded mode */
}

// ── Task types ─────────────────────────────────────────────────────────
export type TaskType =
  | "moderation_review"
  | "security_analysis"
  | "analytics_insight"
  | "health_check"
  | "custom";

export interface OrchestratorTask {
  id: string;
  type: TaskType;
  payload: string;
  priority: 1 | 2 | 3;  // 1 = high
  submittedAt: number;
}

export interface OrchestratorResult {
  taskId: string;
  decision: string;
  confidence: "high" | "medium" | "low";
  actions: string[];
  processedAt: number;
  latencyMs: number;
}

// ── Action log ─────────────────────────────────────────────────────────
interface ActionLogEntry {
  ts: number;
  agent: string;
  action: string;
  detail?: string;
}

const actionLog: ActionLogEntry[] = [];

export function logAction(agent: string, action: string, detail?: string) {
  actionLog.push({ ts: Date.now(), agent, action, detail });
  if (actionLog.length > MAX_LOG_ENTRIES) actionLog.shift();
}

export function getActionLog(limit = 50): ActionLogEntry[] {
  return actionLog.slice(-limit).reverse();
}

// ── Priority queue ─────────────────────────────────────────────────────
const taskQueue: OrchestratorTask[] = [];
const completedTasks: OrchestratorResult[] = [];
const MAX_COMPLETED = 100;
let processingTask = false;

function enqueue(task: OrchestratorTask): void {
  const insertAt = taskQueue.findIndex(t => t.priority > task.priority);
  if (insertAt === -1) taskQueue.push(task);
  else taskQueue.splice(insertAt, 0, task);
  agentLog(AGENT, `Task enqueued: ${task.type}`, { id: task.id, priority: task.priority, queueLen: taskQueue.length });
}

async function callOpenAI(prompt: string): Promise<string> {
  if (!openai) return "OpenAI unavailable — operating in degraded mode.";
  const resp = await openai.chat.completions.create({
    model: AI_CHAT_MODEL,
    max_tokens: 300,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are the central AI orchestrator for OlchaAI, a social platform. " +
          "Give concise, actionable decisions (1-3 sentences). No markdown.",
      },
      { role: "user", content: prompt },
    ],
  });
  return resp.choices[0]?.message?.content?.trim() ?? "No response";
}

async function processTask(task: OrchestratorTask): Promise<OrchestratorResult> {
  const t0 = Date.now();

  let decision = "";
  let confidence: OrchestratorResult["confidence"] = "high";
  const actions: string[] = [];

  try {
    decision = await callOpenAI(task.payload);
    confidence = openai ? "high" : "low";
  } catch (err) {
    agentWarn(AGENT, `OpenAI call failed for task ${task.id}`, { err });
    decision = `Task ${task.type} logged — OpenAI unavailable, human review required.`;
    confidence = "low";
    actions.push("escalate_to_human");
  }

  if (task.type === "moderation_review") actions.push("flag_for_moderation");
  if (task.type === "security_analysis") actions.push("update_threat_model");
  if (task.type === "health_check")      actions.push("log_system_state");

  logAction(AGENT, `Processed ${task.type}`, decision.slice(0, 120));

  return {
    taskId: task.id,
    decision,
    confidence,
    actions,
    processedAt: Date.now(),
    latencyMs: Date.now() - t0,
  };
}

async function drainQueue() {
  if (processingTask || taskQueue.length === 0) return;
  processingTask = true;

  while (taskQueue.length > 0) {
    const task = taskQueue.shift()!;
    try {
      const result = await processTask(task);
      completedTasks.push(result);
      if (completedTasks.length > MAX_COMPLETED) completedTasks.shift();
      agentLog(AGENT, `Task complete: ${task.type}`, {
        id: task.id,
        latencyMs: result.latencyMs,
        confidence: result.confidence,
      });
    } catch (err) {
      agentError(AGENT, `Task failed: ${task.type}`, err, { id: task.id });
    }
    await new Promise(r => setTimeout(r, 200));
  }

  processingTask = false;
}

// ── Public submit API ──────────────────────────────────────────────────
let taskCounter = 0;

export function submitTask(
  type: TaskType,
  payload: string,
  priority: OrchestratorTask["priority"] = 2,
): string {
  const id = `task-${Date.now()}-${++taskCounter}`;
  enqueue({ id, type, payload, priority, submittedAt: Date.now() });
  void drainQueue();
  return id;
}

export function getCompletedTask(id: string): OrchestratorResult | undefined {
  return completedTasks.find(t => t.taskId === id);
}

export function getOrchestratorStatus(): {
  openaiAvailable: boolean;
  queueLength: number;
  completedCount: number;
  actionLogLength: number;
} {
  return {
    openaiAvailable: !!openai,
    queueLength: taskQueue.length,
    completedCount: completedTasks.length,
    actionLogLength: actionLog.length,
  };
}

// ── Heartbeat ──────────────────────────────────────────────────────────
async function heartbeat() {
  const secStatus = secStats();
  const modStatus = getModerationStats();
  const analyticsSnap = getLatestSnapshot();

  const healthSummary = {
    security: {
      trackedIps: secStatus.trackedIps,
      blockedIps: secStatus.blockedIps,
      recentThreats: secStatus.recentThreats,
    },
    moderation: {
      queueLength: modStatus.queueLength,
      openaiAvailable: modStatus.openaiAvailable,
    },
    analytics: analyticsSnap
      ? {
          uptimeS: analyticsSnap.uptimeS,
          memHeapMb: analyticsSnap.memMb.heap,
          requestsLastMin: analyticsSnap.requestsLastMin,
        }
      : null,
  };

  logAction("Heartbeat", "Agent health check", JSON.stringify(healthSummary));

  if (secStatus.recentThreats > 10) {
    submitTask(
      "security_analysis",
      `High threat activity detected: ${secStatus.recentThreats} events in last 5 minutes. ` +
        `${secStatus.blockedIps} IPs currently blocked. Assess risk level and recommend actions.`,
      1,
    );
  }

  if (modStatus.queueLength > 50) {
    agentWarn(AGENT, `Moderation queue backlog: ${modStatus.queueLength} items`);
  }

  agentLog(AGENT, "Heartbeat", healthSummary as unknown as Record<string, unknown>);
}

export function startOrchestrator(): void {
  agentLog(AGENT, "Central AI Orchestrator started", {
    openaiAvailable: !!openai,
    heartbeatMs: HEARTBEAT_MS,
    model: AI_CHAT_MODEL,
  });
  void heartbeat();
  setInterval(() => void heartbeat(), HEARTBEAT_MS);
  setInterval(() => void drainQueue(), 5_000);
}
