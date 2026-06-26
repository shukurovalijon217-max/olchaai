import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, DEFAULT_NOTIF_PREFS, DEFAULT_PRIVACY_SETTINGS } from "@workspace/db";
import type { NotifPrefs, PrivacySettings } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

router.post("/auth/register", async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body as {
      username?: string; displayName?: string; email?: string; password?: string;
    };
    if (!username || !displayName || !email || !password) {
      res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }); return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" }); return;
    }
    const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Bu username band" }); return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const isAdmin = username.toLowerCase() === "omen";
    const [user] = await db.insert(usersTable).values({
      username, displayName, email, passwordHash, isAdmin,
    }).returning();
    req.session.userId = user.id;
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email va parol kiritilishi shart" }); return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Email yoki parol noto'g'ri" }); return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "Eski akkaunt — admin bilan bog'laning" }); return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email yoki parol noto'g'ri" }); return;
    }
    req.session.userId = user.id;
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
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
