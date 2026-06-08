import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable } from "@workspace/db";
import { eq, sql, ilike, and } from "drizzle-orm";

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
    res.json(groups.map(g => ({ ...g, isMember: false })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
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
    const userId = 1;
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
