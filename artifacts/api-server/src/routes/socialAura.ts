import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

function scoreToColor(score: number): { color: string; label: string; gradient: string } {
  if (score >= 90) return { color: "#FFD700", label: "Oltin Aura", gradient: "linear-gradient(135deg,#FFD700,#FF8C00)" };
  if (score >= 75) return { color: "#C0C0C0", label: "Kumush Aura", gradient: "linear-gradient(135deg,#C0C0C0,#808080)" };
  if (score >= 60) return { color: "#9D00FF", label: "Binafsha Aura", gradient: "linear-gradient(135deg,#9D00FF,#4400AA)" };
  if (score >= 45) return { color: "#00E5FF", label: "Ko'k Aura", gradient: "linear-gradient(135deg,#00E5FF,#0088CC)" };
  if (score >= 30) return { color: "#00FF77", label: "Yashil Aura", gradient: "linear-gradient(135deg,#00FF77,#007744)" };
  if (score >= 15) return { color: "#FF6B00", label: "To'q Sariq Aura", gradient: "linear-gradient(135deg,#FF6B00,#FF2D00)" };
  return { color: "#778899", label: "Kulrang Aura", gradient: "linear-gradient(135deg,#778899,#445566)" };
}

async function computeAura(userId: number) {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE author_id = ${userId} AND created_at > NOW() - INTERVAL '30 days') AS posts30,
      (SELECT COUNT(*) FROM post_likes pl JOIN posts p ON p.id = pl.post_id WHERE p.author_id = ${userId} AND pl.created_at > NOW() - INTERVAL '30 days') AS likes_received,
      (SELECT COUNT(*) FROM comments WHERE author_id = ${userId} AND created_at > NOW() - INTERVAL '30 days') AS comments_made,
      (SELECT COUNT(*) FROM follows WHERE following_id = ${userId} AND created_at > NOW() - INTERVAL '30 days') AS new_followers,
      (SELECT COUNT(*) FROM reels WHERE author_id = ${userId}) AS total_reels
  `);
  const row = (result as any).rows?.[0] ?? {};
  const posts30 = Number(row.posts30 ?? 0);
  const likesReceived = Number(row.likes_received ?? 0);
  const commentsMade = Number(row.comments_made ?? 0);
  const newFollowers = Number(row.new_followers ?? 0);
  const totalReels = Number(row.total_reels ?? 0);

  const score = Math.min(100, Math.round(
    posts30 * 4 +
    likesReceived * 2 +
    commentsMade * 1.5 +
    newFollowers * 5 +
    totalReels * 3
  ));

  return { score, ...scoreToColor(score), stats: { posts30, likesReceived, commentsMade, newFollowers, totalReels } };
}

router.get("/users/aura", requireAuth, async (req: any, res) => {
  try {
    const aura = await computeAura(req.session.userId);
    await db.execute(sql`UPDATE users SET aura_color = ${aura.color} WHERE id = ${req.session.userId}`);
    res.json(aura);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Aura hisoblashda xato" });
  }
});

router.get("/users/:id/aura", async (req: any, res) => {
  const userId = Number(req.params.id);
  if (!userId) { res.status(400).json({ error: "ID kerak" }); return; }
  try {
    const aura = await computeAura(userId);
    res.json(aura);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Aura hisoblashda xato" });
  }
});

export default router;
