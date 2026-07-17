import { Router } from "express";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { usersTable, DEFAULT_NOTIF_PREFS, DEFAULT_PRIVACY_SETTINGS } from "@workspace/db";
import type { NotifPrefs, PrivacySettings } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { checkLoginBruteForce, recordLoginFailure, clearLoginAttempts, sanitizeInput, signMobileToken, checkEndpointRateLimit } from "../lib/security";

const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY muhit o'zgaruvchisi o'rnatilmagan");
  return new Resend(key);
};

const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

const router = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin?: boolean;
  }
}

/* ── Send Email OTP ─────────────────────────────────────────── */
router.post("/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Email manzil noto'g'ri" }); return;
    }

    // Rate limit: max 3 OTP per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db.select().from(emailVerifications)
      .where(and(eq(emailVerifications.email, email), gt(emailVerifications.createdAt, oneHourAgo)));
    if (recent.length >= 3) {
      res.status(429).json({ error: "1 soat ichida ko'pi bilan 3 ta kod yuboriladi. Keyinroq urinib ko'ring." }); return;
    }

    // Delete old unverified codes for this email
    await db.delete(emailVerifications)
      .where(and(eq(emailVerifications.email, email), eq(emailVerifications.verified, false)));

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.insert(emailVerifications).values({ email, otp, expiresAt });

    const emailHtml = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0502;color:#c8a060;border-radius:16px">
          <div style="font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:8px">GilosAI</div>
          <div style="font-size:14px;color:#7a4820;margin-bottom:32px">AI-powered ijtimoiy koinot</div>
          <div style="font-size:14px;color:#a07040;margin-bottom:16px">Ro'yxatdan o'tish tasdiqlash kodi:</div>
          <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#e8b060;background:rgba(50,20,5,0.8);border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:24px">${otp}</div>
          <div style="font-size:12px;color:#4a2810">Bu kod 10 daqiqa ichida yaroqli. Agar siz yubormasangiz, xabarni e'tiborsiz qoldiring.</div>
        </div>
      `;

    const emailPayload = { to: email, subject: `${otp} — GilosAI tasdiqlash kodi`, html: emailHtml };

    // Try verified domain first, fall back to Resend shared domain
    let { error: sendError } = await getResend().emails.send({ from: "GilosAI <noreply@olchaai.com>", ...emailPayload });

    if (sendError) {
      const msg = (sendError as { message?: string }).message ?? "";
      const isDomainNotVerified = msg.includes("verify a domain") || msg.includes("testing emails") || msg.includes("not verified");
      if (isDomainNotVerified) {
        req.log.warn("olchaai.com domain not verified yet, falling back to onboarding@resend.dev");
        const fallback = await getResend().emails.send({ from: "GilosAI <onboarding@resend.dev>", ...emailPayload });
        sendError = fallback.error ?? null;
      }
    }

    if (sendError) {
      req.log.error({ resendError: sendError }, "Resend send failed");
      res.status(500).json({ error: "Email yuborishda xato. Keyinroq urinib ko'ring." }); return;
    }

    res.json({ ok: true, message: "Kod emailga yuborildi" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── Verify Email OTP ───────────────────────────────────────── */
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp) {
      res.status(400).json({ error: "Email va kod kiritilishi shart" }); return;
    }

    const now = new Date();
    const [record] = await db.select().from(emailVerifications)
      .where(and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.otp, otp),
        eq(emailVerifications.verified, false),
        gt(emailVerifications.expiresAt, now),
      ));

    if (!record) {
      res.status(400).json({ error: "Kod noto'g'ri yoki muddati o'tgan" }); return;
    }

    await db.update(emailVerifications).set({ verified: true }).where(eq(emailVerifications.id, record.id));
    res.json({ ok: true, verified: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ── Register ───────────────────────────────────────────────── */
router.post("/auth/register", async (req, res) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    if (!checkEndpointRateLimit(ip, "register", 3, 60_000)) {
      res.status(429).json({ error: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urining." }); return;
    }
    const { username, displayName, email, phone, password } = req.body as {
      username?: string; displayName?: string; email?: string; phone?: string; password?: string;
    };
    if (!username || !displayName || !email || !phone || !password) {
      res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }); return;
    }

    // Normalize phone: keep digits and + only
    const normalizedPhone = phone.replace(/[^\d+]/g, "");
    if (normalizedPhone.length < 9) {
      res.status(400).json({ error: "Telefon raqami noto'g'ri" }); return;
    }

    // ── REQUIRE verified email OTP before registration ──────────
    const [emailVerified] = await db.select().from(emailVerifications)
      .where(and(eq(emailVerifications.email, email), eq(emailVerifications.verified, true)));
    if (!emailVerified) {
      res.status(400).json({ error: "Email tasdiqlash kodi kiritilmagan yoki noto'g'ri. Avval emailingizni tasdiqlang." }); return;
    }

    const [existing, existingUsername, existingPhone] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.email, email)),
      db.select().from(usersTable).where(eq(usersTable.username, username)),
      db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone)),
    ]);
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" }); return;
    }
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Bu username band" }); return;
    }
    if (existingPhone.length > 0) {
      res.status(409).json({ error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan. Har bir raqamga faqat 1 ta akkount." }); return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const isAdmin = username.toLowerCase() === "omen" || username.toLowerCase() === "admin";
    const [user] = await db.insert(usersTable).values({
      username, displayName, email, phone: normalizedPhone, passwordHash, isAdmin,
    }).returning();

    // Clean up used verification record
    await db.delete(emailVerifications).where(eq(emailVerifications.id, emailVerified.id)).catch(() => {});

    req.session.userId = user.id;
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ ...safeUser, token: signMobileToken(user.id) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const rawIdentifier = req.body?.email || req.body?.username;
    const rawPassword = req.body?.password;

    const identifier = sanitizeInput(rawIdentifier, 254);
    const password = sanitizeInput(rawPassword, 128);

    if (!identifier || !password) {
      res.status(400).json({ error: "Email/username va parol kiritilishi shart" }); return;
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";

    // Brute-force check
    const bf = checkLoginBruteForce(ip, identifier);
    if (!bf.allowed) {
      const mins = Math.ceil((bf.remainingMs ?? 0) / 60000);
      res.status(429).json({ error: `Juda ko'p urinish. ${mins} daqiqadan so'ng qayta urinib ko'ring.` }); return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, identifier));
    let user = users[0];
    if (!user) {
      const byUsername = await db.select().from(usersTable).where(eq(usersTable.username, identifier));
      user = byUsername[0];
    }
    if (!user) {
      recordLoginFailure(ip, identifier);
      res.status(401).json({ error: "Email/username yoki parol noto'g'ri" }); return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "Eski akkaunt — admin bilan bog'laning" }); return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordLoginFailure(ip, identifier);
      res.status(401).json({ error: "Email/username yoki parol noto'g'ri" }); return;
    }
    clearLoginAttempts(ip, identifier);
    req.session.userId = user.id;
    req.session.isAdmin = user.isAdmin ?? false;
    const { passwordHash: _, ...safeUser } = user;
    res.json({ ...safeUser, token: signMobileToken(user.id) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Kirish talab qilinadi" }); return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Foydalanuvchi topilmadi" }); return;
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.patch("/auth/profile", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const { displayName, bio, avatarUrl, coverUrl, country, timezone } = req.body as {
      displayName?: string; bio?: string; avatarUrl?: string; coverUrl?: string;
      country?: string; timezone?: string;
    };

    const updates: Record<string, any> = {};
    if (displayName !== undefined) {
      if (!displayName.trim()) { res.status(400).json({ error: "Ism bo'sh bo'lishi mumkin emas" }); return; }
      updates.displayName = displayName.trim();
    }
    if (bio !== undefined) updates.bio = bio.trim() || null;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl.trim() || null;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl.trim() || null;
    if (country !== undefined) updates.country = country.trim() || null;
    if (timezone !== undefined) updates.timezone = timezone.trim() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Hech narsa o'zgartirilmadi" }); return;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.patch("/auth/password", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Joriy va yangi parol kiritilishi shart" }); return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user?.passwordHash) { res.status(401).json({ error: "Foydalanuvchi topilmadi" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Joriy parol noto'g'ri" }); return; }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.patch("/auth/preferences", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const { notifPrefs, privacySettings } = req.body as {
      notifPrefs?: Partial<NotifPrefs>;
      privacySettings?: Partial<PrivacySettings>;
    };

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!existing) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }

    const updates: Record<string, unknown> = {};
    if (notifPrefs !== undefined) {
      updates.notifPrefs = { ...DEFAULT_NOTIF_PREFS, ...(existing.notifPrefs ?? {}), ...notifPrefs };
    }
    if (privacySettings !== undefined) {
      updates.privacySettings = { ...DEFAULT_PRIVACY_SETTINGS, ...(existing.privacySettings ?? {}), ...privacySettings };
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Hech narsa o'zgartirilmadi" }); return;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.delete("/auth/account", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }

    const { password } = req.body as { password?: string };
    if (!password) { res.status(400).json({ error: "Parolni tasdiqlang" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user?.passwordHash) { res.status(404).json({ error: "Foydalanuvchi topilmadi" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Parol noto'g'ri" }); return; }

    await db.update(usersTable)
      .set({ status: "deleted", email: `deleted_${userId}_${user.email}`, username: `deleted_${userId}` })
      .where(eq(usersTable.id, userId));

    req.session.destroy(() => {
      res.json({ ok: true });
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
