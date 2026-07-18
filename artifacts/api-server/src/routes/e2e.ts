/**
 * E2E Encryption key exchange endpoints
 * ECDH P-256 public key registry — server never sees private keys
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }
  next();
};

/* ── Ensure column exists ─────────────────────────────────────── */
async function ensureE2eColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS e2e_public_key TEXT;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS e2e_nonce TEXT;
    `);
  } catch { /* non-fatal, column may already exist */ }
}
ensureE2eColumn().catch(() => {});

/* ── PUT /e2e/key — register/update own public key ───────────── */
router.put("/e2e/key", requireAuth, async (req: any, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== "string" || publicKey.length > 4096) {
      res.status(400).json({ error: "Yaroqli publicKey kerak (JWK format)" }); return;
    }
    // Validate it's a valid JWK-like JSON
    let parsed: any;
    try { parsed = JSON.parse(publicKey); } catch {
      res.status(400).json({ error: "publicKey JSON formatida bo'lishi kerak" }); return;
    }
    if (parsed.kty !== "EC" || parsed.crv !== "P-256") {
      res.status(400).json({ error: "Faqat ECDH P-256 kaliti qabul qilinadi" }); return;
    }

    await db.execute(sql`
      UPDATE users SET e2e_public_key = ${publicKey} WHERE id = ${req.session.userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── GET /e2e/key/:userId — get user's public key ────────────── */
router.get("/e2e/key/:userId", requireAuth, async (req: any, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) { res.status(400).json({ error: "userId noto'g'ri" }); return; }

    const result = await db.execute(sql`
      SELECT e2e_public_key FROM users WHERE id = ${userId}
    `);
    const row = (result as any).rows?.[0];
    if (!row?.e2e_public_key) {
      res.status(404).json({ error: "Ushbu foydalanuvchi E2E kalitini o'rnatmagan" }); return;
    }
    res.json({ userId, publicKey: row.e2e_public_key });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── GET /e2e/status — check own E2E status ──────────────────── */
router.get("/e2e/status", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT e2e_public_key IS NOT NULL AS has_key FROM users WHERE id = ${req.session.userId}
    `);
    const row = (result as any).rows?.[0];
    res.json({ enabled: !!row?.has_key });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── DELETE /e2e/key — remove own key (disable E2E) ─────────── */
router.delete("/e2e/key", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE users SET e2e_public_key = NULL WHERE id = ${req.session.userId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
