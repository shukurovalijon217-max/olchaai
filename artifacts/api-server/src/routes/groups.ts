import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { eq, sql, ilike, and, desc } from "drizzle-orm";

const router = Router();

router.get("/groups", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    let groups;
    if (search) {
      groups = await db.select().from(groupsTable).where(ilike(groupsTable.name, `%${search}%`)).limit(limit);
    } else {
      groups = await db.select().from(groupsTable).limit(limit);
    }
    const userId = (req as any).session?.userId;
    let memberIds = new Set<number>();
    if (userId) {
      const memberships = await db.select({ groupId: groupMembersTable.groupId })
        .from(groupMembersTable).where(eq(groupMembersTable.userId, userId));
      memberships.forEach(m => memberIds.add(m.groupId));
    }
    res.json(groups.map(g => ({ ...g, isMember: memberIds.has(g.id) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/groups/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    if (!group) return res.status(404).json({ error: "Group not found" });
    const userId = (req as any).session?.userId;
    let isMember = false;
    if (userId) {
      const [mem] = await db.select().from(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId)));
      isMember = !!mem;
    }
    res.json({ ...group, isMember });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/groups/:id/members", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) return res.status(400).json({ error: "Invalid id" });
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const members = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        isVerified: usersTable.isVerified,
        isPremium: usersTable.isPremium,
        joinedAt: groupMembersTable.joinedAt,
      })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, groupId))
      .orderBy(desc(groupMembersTable.joinedAt))
      .limit(limit);
    res.json(members);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/groups/:id/posts", async (req, res) => {
  res.json([]);
});

router.post("/groups", async (req, res) => {
  try {
    const { name, description, avatarUrl, isPrivate, category } = req.body;
    const [group] = await db.insert(groupsTable).values({ name, description, avatarUrl, isPrivate: isPrivate || false, category }).returning();
    res.status(201).json({ ...group, isMember: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/groups/:id/join", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId || 1;
    const existing = await db.select().from(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
    if (existing.length > 0) {
      await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
      await db.update(groupsTable).set({ membersCount: sql`${groupsTable.membersCount} - 1` }).where(eq(groupsTable.id, groupId));
    } else {
      await db.insert(groupMembersTable).values({ groupId, userId });
      await db.update(groupsTable).set({ membersCount: sql`${groupsTable.membersCount} + 1` }).where(eq(groupsTable.id, groupId));
    }
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    res.json({ joined: existing.length === 0, membersCount: group?.membersCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
