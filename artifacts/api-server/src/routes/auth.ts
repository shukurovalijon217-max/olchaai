import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
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
    const [user] = await db.insert(usersTable).values({
      username, displayName, email, passwordHash,
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

export default router;
