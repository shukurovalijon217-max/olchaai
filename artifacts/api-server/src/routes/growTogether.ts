import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.get("/grow-together/goal", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM grow_together_goals WHERE user_id = ${req.session.userId} ORDER BY created_at DESC LIMIT 1`
    );
    res.json((result as any).rows?.[0] ?? null);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.post("/grow-together/goal", requireAuth, async (req: any, res) => {
  const { goalText, category = "general" } = req.body as { goalText?: string; category?: string };
  if (!goalText?.trim()) { res.status(400).json({ error: "Maqsad matni kerak" }); return; }
  try {
    await db.execute(
      sql`DELETE FROM grow_together_goals WHERE user_id = ${req.session.userId}`
    );
    const result = await db.execute(
      sql`INSERT INTO grow_together_goals (user_id, goal_text, category)
          VALUES (${req.session.userId}, ${goalText.trim()}, ${category})
          RETURNING *`
    );
    res.json((result as any).rows?.[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.get("/grow-together/matches", requireAuth, async (req: any, res) => {
  try {
    const myGoal = await db.execute(
      sql`SELECT * FROM grow_together_goals WHERE user_id = ${req.session.userId} LIMIT 1`
    );
    const myGoalRow = (myGoal as any).rows?.[0];
    if (!myGoalRow) { res.json([]); return; }

    const result = await db.execute(sql`
      SELECT g.*, u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
      FROM grow_together_goals g
      JOIN users u ON u.id = g.user_id
      WHERE g.user_id != ${req.session.userId}
        AND g.goal_text ILIKE ${'%' + myGoalRow.goal_text.split(' ').slice(0, 3).join('%') + '%'}
        AND NOT EXISTS (
          SELECT 1 FROM grow_together_connections c
          WHERE (c.user1_id = ${req.session.userId} AND c.user2_id = g.user_id)
             OR (c.user1_id = g.user_id AND c.user2_id = ${req.session.userId})
        )
      ORDER BY g.created_at DESC
      LIMIT 20
    `);
    res.json((result as any).rows ?? []);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.post("/grow-together/connect/:partnerId", requireAuth, async (req: any, res) => {
  const partnerId = Number(req.params.partnerId);
  if (!partnerId) { res.status(400).json({ error: "Partner ID kerak" }); return; }
  try {
    const myGoal = await db.execute(
      sql`SELECT goal_text FROM grow_together_goals WHERE user_id = ${req.session.userId} LIMIT 1`
    );
    const goalText = ((myGoal as any).rows?.[0] as any)?.goal_text ?? "Birga o'sish";

    const result = await db.execute(sql`
      INSERT INTO grow_together_connections (user1_id, user2_id, goal_text)
      VALUES (${req.session.userId}, ${partnerId}, ${goalText})
      ON CONFLICT (user1_id, user2_id) DO UPDATE SET status = 'active'
      RETURNING *
    `);
    res.json((result as any).rows?.[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.get("/grow-together/connections", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT c.*,
        u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
      FROM grow_together_connections c
      JOIN users u ON u.id = CASE
        WHEN c.user1_id = ${req.session.userId} THEN c.user2_id
        ELSE c.user1_id
      END
      WHERE c.user1_id = ${req.session.userId} OR c.user2_id = ${req.session.userId}
      ORDER BY c.created_at DESC
    `);
    res.json((result as any).rows ?? []);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

router.delete("/grow-together/connect/:partnerId", requireAuth, async (req: any, res) => {
  const partnerId = Number(req.params.partnerId);
  try {
    await db.execute(sql`
      DELETE FROM grow_together_connections
      WHERE (user1_id = ${req.session.userId} AND user2_id = ${partnerId})
         OR (user1_id = ${partnerId} AND user2_id = ${req.session.userId})
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Xato" });
  }
});

export default router;
