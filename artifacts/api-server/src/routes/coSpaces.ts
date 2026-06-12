import { Router } from "express";
import { db } from "@workspace/db";
import { coSpacesTable, coSpaceMembersTable, coSpaceTasksTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) { res.status(401).json({ error: "Kirish talab qilinadi" }); return; }
  next();
};

router.get("/spaces", async (req: any, res) => {
  try {
    const category = req.query.category as string | undefined;
    let q = db.select({
      id: coSpacesTable.id,
      name: coSpacesTable.name,
      description: coSpacesTable.description,
      category: coSpacesTable.category,
      memberCount: coSpacesTable.memberCount,
      status: coSpacesTable.status,
      createdAt: coSpacesTable.createdAt,
      creatorId: usersTable.id,
      creatorUsername: usersTable.username,
      creatorName: usersTable.displayName,
      creatorAvatar: usersTable.avatarUrl,
    }).from(coSpacesTable)
      .innerJoin(usersTable, eq(coSpacesTable.creatorId, usersTable.id));

    const rows = await q.orderBy(desc(coSpacesTable.createdAt)).limit(50);
    const filtered = category ? rows.filter(r => r.category === category) : rows;
    res.json(filtered);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/spaces", requireAuth, async (req: any, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Nom majburiy" }); return; }
    const [space] = await db.insert(coSpacesTable)
      .values({ name: name.trim(), description, category: category ?? "general", creatorId: req.session.userId })
      .returning();
    await db.insert(coSpaceMembersTable).values({ spaceId: space.id, userId: req.session.userId, role: "creator" });
    res.json(space);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.get("/spaces/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [space] = await db.select().from(coSpacesTable).where(eq(coSpacesTable.id, id));
    if (!space) { res.status(404).json({ error: "Topilmadi" }); return; }
    const members = await db
      .select({ id: coSpaceMembersTable.id, role: coSpaceMembersTable.role, contribution: coSpaceMembersTable.contribution, joinedAt: coSpaceMembersTable.joinedAt, userId: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatar: usersTable.avatarUrl })
      .from(coSpaceMembersTable)
      .innerJoin(usersTable, eq(coSpaceMembersTable.userId, usersTable.id))
      .where(eq(coSpaceMembersTable.spaceId, id));
    const tasks = await db.select().from(coSpaceTasksTable).where(eq(coSpaceTasksTable.spaceId, id)).orderBy(coSpaceTasksTable.createdAt);
    res.json({ ...space, members, tasks });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/spaces/:id/join", requireAuth, async (req: any, res) => {
  try {
    const spaceId = parseInt(req.params.id);
    const userId = req.session.userId;
    const already = await db.select().from(coSpaceMembersTable)
      .where(and(eq(coSpaceMembersTable.spaceId, spaceId), eq(coSpaceMembersTable.userId, userId)));
    if (already.length > 0) { res.json({ already: true }); return; }
    const [member] = await db.insert(coSpaceMembersTable).values({ spaceId, userId }).returning();
    await db.update(coSpacesTable).set({ memberCount: (await db.select().from(coSpaceMembersTable).where(eq(coSpaceMembersTable.spaceId, spaceId))).length }).where(eq(coSpacesTable.id, spaceId));
    res.json(member);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.post("/spaces/:id/tasks", requireAuth, async (req: any, res) => {
  try {
    const spaceId = parseInt(req.params.id);
    const { title, description, assigneeId, priority } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Sarlavha majburiy" }); return; }
    const [task] = await db.insert(coSpaceTasksTable)
      .values({ spaceId, title: title.trim(), description, assigneeId, priority: priority ?? "medium" })
      .returning();
    const member = await db.select().from(coSpaceMembersTable)
      .where(and(eq(coSpaceMembersTable.spaceId, spaceId), eq(coSpaceMembersTable.userId, req.session.userId)));
    if (member.length > 0) {
      await db.update(coSpaceMembersTable).set({ contribution: member[0].contribution + 1 })
        .where(eq(coSpaceMembersTable.id, member[0].id));
    }
    res.json(task);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.patch("/spaces/:id/tasks/:taskId", requireAuth, async (req: any, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { status, assigneeId } = req.body;
    const [task] = await db.update(coSpaceTasksTable)
      .set({ ...(status && { status }), ...(assigneeId !== undefined && { assigneeId }) })
      .where(eq(coSpaceTasksTable.id, taskId))
      .returning();
    res.json(task);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

router.patch("/spaces/:id/canvas", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { canvas } = req.body;
    const [space] = await db.update(coSpacesTable).set({ canvas }).where(eq(coSpacesTable.id, id)).returning();
    res.json(space);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Server xatosi" }); }
});

export default router;
