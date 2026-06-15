import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  name: "ai-core",
  level: process.env.LOG_LEVEL ?? "info",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
            messageFormat: "[{name}] {msg}",
          },
        },
      }),
});

export function agentLog(agent: string, action: string, detail?: Record<string, unknown>) {
  logger.info({ agent, action, ...detail }, `[${agent}] ${action}`);
}

export function agentWarn(agent: string, action: string, detail?: Record<string, unknown>) {
  logger.warn({ agent, action, ...detail }, `[${agent}] ⚠ ${action}`);
}

export function agentError(agent: string, action: string, err: unknown, detail?: Record<string, unknown>) {
  logger.error({ agent, action, err, ...detail }, `[${agent}] ✖ ${action}`);
}

export function agentAlert(agent: string, action: string, detail?: Record<string, unknown>) {
  logger.warn({ agent, action, severity: "ALERT", ...detail }, `[${agent}] 🔴 ALERT: ${action}`);
}
