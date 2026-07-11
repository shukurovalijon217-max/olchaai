import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./stripe/webhookHandlers";
import { creditTreasury } from "./routes/treasury";
import { systemMonitor, normalisePath } from "./lib/systemMonitor";
import { aiAutoScaleMiddleware } from "./middlewares/aiAutoScale.js";
import { securityShield } from "./middlewares/securityShield";
import { resilienceMiddleware } from "./middlewares/resilience";

const app: Express = express();

/* ── Trust the reverse proxy in front of us (Replit/Cloud Run) ──────
   Required for secure/sameSite="none" session cookies in production:
   without this, req.secure stays false behind the proxy's TLS
   termination, so express-session silently refuses to set the
   session cookie at all — breaking every login-gated feature. ─── */
app.set("trust proxy", 1);

/* ── Gzip/Brotli compression — faster responses globally ────────── */
app.use(compression({
  level: 6,
  threshold: 1024, // compress responses > 1KB
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));

/* ── Security: HTTP headers via Helmet ─────────────────────────── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // CSP handled by frontend build tool
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));


/* ── Request logger ─────────────────────────────────────────────── */
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

/* ── CORS — allow Replit, Render.com, and configured custom origins ─ */
const ALLOWED_ORIGINS = new Set([
  ...(process.env["REPLIT_DOMAINS"] ?? "").split(",").map(d => `https://${d.trim()}`).filter(Boolean),
  ...(process.env["ALLOWED_ORIGINS"] ?? "").split(",").map(o => o.trim()).filter(Boolean),
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:80",
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (/^https:\/\/[\w-]+\.replit\.app$/.test(origin) ||
          /^https:\/\/[\w-]+\.repl\.co$/.test(origin) ||
          /^https:\/\/[\w-]+(\.onrender\.com)$/.test(origin) ||
          /^https?:\/\/(www\.)?olchaai\.com$/.test(origin) ||
          /^https?:\/\/(www\.)?gilosai\.com$/.test(origin) ||
          ALLOWED_ORIGINS.has(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  })(req, res, (err) => {
    if (err) { res.status(403).json({ error: "CORS: origin not allowed" }); return; }
    // If cors said false (not allowed), respond 403
    if (!res.getHeader("Access-Control-Allow-Origin") && req.headers.origin) {
      res.status(403).json({ error: "CORS: origin not allowed" }); return;
    }
    next();
  });
});

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
      const rawBody = req.body as Buffer;

      // Parse event for treasury crediting (before sync, tolerates missing secret)
      try {
        const event = JSON.parse(rawBody.toString());
        // Credit treasury for successful premium subscription payments
        if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
          const obj = event.data?.object;
          const amountPaid = obj?.amount_paid ?? obj?.amount_total ?? 0;
          if (amountPaid > 0) {
            const ref = obj?.id ?? `stripe-${Date.now()}`;
            creditTreasury({
              amount: amountPaid,
              source: "premium",
              description: `Stripe to'lovi — ${event.type}`,
              reference: `STR-${ref}`,
            }).catch(() => {});
          }
        }
      } catch { /* parsing failure is non-fatal */ }

      await WebhookHandlers.processWebhook(rawBody, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const isProd = process.env["NODE_ENV"] === "production";
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    conString: process.env["DATABASE_URL"],
    tableName: "user_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60, // prune expired sessions every hour
  }),
  secret: process.env["SESSION_SECRET"] ?? "olcha-secret-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: isProd ? "none" : "lax",
  },
}));

/* ── Cache-Control headers for Cloudflare CDN ───────────────────
   Tiered strategy:
   - Private/sensitive (auth, wallet, admin): no-store
   - User-specific feed/profile: private, short TTL
   - Public feeds, posts, search: Cloudflare edge cache 30s + SWR 60s
   - Static media proxy: long cache 1h + SWR 1h
   Mutations (POST/PUT/PATCH/DELETE): always no-store.             */
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET") {
    const p = req.path;
    if (
      p.startsWith("/api/admin") ||
      p.startsWith("/api/auth") ||
      p.startsWith("/api/wallet") ||
      p.startsWith("/api/messages") ||
      p.startsWith("/api/notifications")
    ) {
      res.setHeader("Cache-Control", "private, no-store");
    } else if (p.startsWith("/api/media/img")) {
      // Each URL is content-addressed by (source url + width + quality), so once
      // generated it never changes — safe to cache at Cloudflare's edge for 30 days
      // instead of re-fetching from origin on every browser/CDN cache miss.
      res.setHeader("Cache-Control", "public, max-age=2592000, s-maxage=2592000, immutable");
    } else if (
      p.startsWith("/api/posts") ||
      p.startsWith("/api/search") ||
      p.startsWith("/api/marketplace") ||
      p.startsWith("/api/otube") ||
      p.startsWith("/api/reels")
    ) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    } else if (p.startsWith("/api/users")) {
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    } else {
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    }
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});

/* ── NEXUS Security Shield — Pentagon-grade auto-defense ─────── */
app.use(securityShield);

/* ── Mobile Bearer token auth: HMAC-signed token ──────────────── */
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ") && !req.session?.userId) {
    const { verifyMobileToken } = require("./lib/security");
    const uid = verifyMobileToken(auth.slice(7));
    if (uid) req.session.userId = uid;
  }
  next();
});

/* ── IP-based rate limiting ────────────────────────────────────── */
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const { checkRateLimit } = require("./lib/security");
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  next();
});

/* ── AI Auto-Scale: rate limiting + memory pressure management ─── */
app.use("/api", aiAutoScaleMiddleware);

/* ── Resilience: timeout + load shedder + concurrency cap ────────
   Prevents any request from hanging forever and sheds excess load
   gracefully instead of crashing. ──────────────────────────────── */
app.use("/api", resilienceMiddleware);

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

/* ── Security: strip any accidental passwordHash leakage from responses ──
   Defense in depth — routes should already omit passwordHash, but this
   guarantees it never reaches a client even if a future route forgets. */
function stripPasswordHash(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => stripPasswordHash(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key === "passwordHash") continue;
    out[key] = stripPasswordHash(val, depth + 1);
  }
  return out;
}
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = ((body?: unknown) => originalJson(stripPasswordHash(body))) as typeof res.json;
  next();
});

app.use("/api", router);

export default app;
