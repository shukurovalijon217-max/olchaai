import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./stripe/webhookHandlers";
import { systemMonitor, normalisePath } from "./lib/systemMonitor";
import { aiAutoScaleMiddleware } from "./middlewares/aiAutoScale.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));

// Stripe webhook MUST be registered BEFORE express.json() middleware
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" }); return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env["NODE_ENV"] === "production";

app.use(session({
  secret: process.env["SESSION_SECRET"] ?? "olcha-secret-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? "none" : "lax",
  },
}));

/* ── AI Auto-Scale: rate limiting + memory pressure management ─── */
app.use("/api", aiAutoScaleMiddleware);

/* ── NEXUS Core: Self-Healing middleware ─────────────────────────
   1. If circuit breaker is OPEN for this endpoint → 503 immediately
   2. Record every request's status + latency for health analytics
──────────────────────────────────────────────────────────────── */
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const key = normalisePath(req.method, req.path);
  if (systemMonitor.isOpen(key)) {
    res.status(503).json({
      error: "Service temporarily unavailable",
      message: "NEXUS Core circuit breaker active — auto-healing in 30s",
      endpoint: key,
      retryAfterMs: 30_000,
    });
    return;
  }
  const start = Date.now();
  res.on("finish", () => {
    systemMonitor.record(key, res.statusCode, Date.now() - start);
  });
  next();
});

app.use("/api", router);

export default app;
