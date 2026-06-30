import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, groupPostsTable, groupPostLikesTable, usersTable } from "@workspace/db";
import { eq, sql, ilike, and, desc } from "drizzle-orm";

const router = Router();

/* ── List groups ────────────────────────────────────────────── */
router.get("/groups", async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    let groups;
    if (search) {
      groups = await db.select().from(groupsTable).where(ilike(groupsTable.name, `%${search}%`)).limit(limit);
    } else {
      groups = await db.select().from(groupsTable).orderBy(desc(groupsTable.createdAt)).limit(limit);
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

/* ── Get single group ───────────────────────────────────────── */
router.get("/groups/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }
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

/* ── Create group ───────────────────────────────────────────── */
router.post("/groups", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, description, coverUrl, avatarUrl, isPrivate, category,
      privacyLevel, joinType, groupType, icon, themeColor, maxMembers, settings,
    } = req.body;

    if (!name?.trim() || !description?.trim()) {
      res.status(400).json({ error: "name and description are required" });
      return;
    }

    const userId = (req as any).session?.userId ?? null;
    const resolvedPrivacyLevel = privacyLevel || (isPrivate ? "private" : "public");
    const resolvedIsPrivate = resolvedPrivacyLevel !== "public";

    const [group] = await db.insert(groupsTable).values({
      name: name.trim(),
      description: description.trim(),
      coverUrl: coverUrl || null,
      avatarUrl: avatarUrl || null,
      isPrivate: resolvedIsPrivate,
      category: category || "general",
      privacyLevel: resolvedPrivacyLevel,
      joinType: joinType || "auto",
      groupType: groupType || "community",
      icon: icon || "🌟",
      themeColor: themeColor || "#7857ff",
      maxMembers: maxMembers ?? 0,
      settings: settings ?? null,
      creatorId: userId,
    }).returning();

    if (userId) {
      await db.insert(groupMembersTable).values({ groupId: group.id, userId });
      await db.update(groupsTable).set({ membersCount: 1 }).where(eq(groupsTable.id, group.id));
    }

    res.status(201).json({ ...group, isMember: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Update group (creator only) ────────────────────────────── */
router.put("/groups/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }

    if (group.creatorId !== userId) {
      res.status(403).json({ error: "Only the group creator can update the group" });
      return;
    }

    const {
      name, description, coverUrl, category, privacyLevel, joinType,
      icon, themeColor, maxMembers, settings,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name?.trim())        updateData.name = name.trim();
    if (description?.trim()) updateData.description = description.trim();
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl || null;
    if (category !== undefined) updateData.category = category;
    if (icon !== undefined)  updateData.icon = icon;
    if (themeColor !== undefined) updateData.themeColor = themeColor;
    if (maxMembers !== undefined) updateData.maxMembers = Number(maxMembers) || 0;
    if (settings !== undefined) updateData.settings = settings;
    if (joinType !== undefined) updateData.joinType = joinType;
    if (privacyLevel !== undefined) {
      updateData.privacyLevel = privacyLevel;
      updateData.isPrivate = privacyLevel !== "public";
    }

    const [updated] = await db.update(groupsTable)
      .set(updateData as any)
      .where(eq(groupsTable.id, id))
      .returning();

    const [mem] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId)));

    res.json({ ...updated, isMember: !!mem });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Delete group (creator only) ────────────────────────────── */
router.delete("/groups/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }

    if (group.creatorId !== userId) {
      res.status(403).json({ error: "Only the group creator can delete the group" });
      return;
    }

    await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
    await db.delete(groupPostsTable).where(eq(groupPostsTable.groupId, id));
    await db.delete(groupsTable).where(eq(groupsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get group members ──────────────────────────────────────── */
router.get("/groups/:id/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ error: "Invalid id" }); return; }
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

/* ── Get group posts ────────────────────────────────────────── */
router.get("/groups/:id/posts", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const userId = (req as any).session?.userId;

    const posts = await db
      .select({
        id: groupPostsTable.id,
        groupId: groupPostsTable.groupId,
        authorId: groupPostsTable.authorId,
        content: groupPostsTable.content,
        mediaUrl: groupPostsTable.mediaUrl,
        likesCount: groupPostsTable.likesCount,
        createdAt: groupPostsTable.createdAt,
        authorUsername: usersTable.username,
        authorDisplayName: usersTable.displayName,
        authorAvatarUrl: usersTable.avatarUrl,
      })
      .from(groupPostsTable)
      .innerJoin(usersTable, eq(groupPostsTable.authorId, usersTable.id))
      .where(eq(groupPostsTable.groupId, groupId))
      .orderBy(desc(groupPostsTable.createdAt))
      .limit(limit);

    let likedIds = new Set<number>();
    if (userId && posts.length > 0) {
      const likes = await db.select({ postId: groupPostLikesTable.postId })
        .from(groupPostLikesTable)
        .where(eq(groupPostLikesTable.userId, userId));
      likes.forEach(l => likedIds.add(l.postId));
    }

    res.json(posts.map(p => ({ ...p, isLikedByMe: likedIds.has(p.id) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Create group post ──────────────────────────────────────── */
router.post("/groups/:id/posts", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { content, mediaUrl } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }

    const [post] = await db.insert(groupPostsTable).values({
      groupId,
      authorId: userId,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
    }).returning();

    await db.update(groupsTable)
      .set({ postsCount: sql`${groupsTable.postsCount} + 1` })
      .where(eq(groupsTable.id, groupId));

    const [author] = await db.select({
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(eq(usersTable.id, userId));

    res.status(201).json({
      ...post,
      isLikedByMe: false,
      authorUsername: author?.username ?? "",
      authorDisplayName: author?.displayName ?? "",
      authorAvatarUrl: author?.avatarUrl ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Delete group post ──────────────────────────────────────── */
router.delete("/groups/:id/posts/:postId", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const postId = Number(req.params.postId);
    if (isNaN(groupId) || isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [post] = await db.select().from(groupPostsTable).where(eq(groupPostsTable.id, postId));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const [group] = await db.select({ creatorId: groupsTable.creatorId })
      .from(groupsTable).where(eq(groupsTable.id, groupId));

    const isAuthor = post.authorId === userId;
    const isGroupCreator = group?.creatorId === userId;

    if (!isAuthor && !isGroupCreator) {
      res.status(403).json({ error: "No permission to delete this post" });
      return;
    }

    await db.delete(groupPostsTable).where(eq(groupPostsTable.id, postId));
    await db.update(groupsTable)
      .set({ postsCount: sql`GREATEST(${groupsTable.postsCount} - 1, 0)` })
      .where(eq(groupsTable.id, groupId));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Like / unlike group post ───────────────────────────────── */
router.post("/groups/:id/posts/:postId/like", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [existing] = await db.select().from(groupPostLikesTable)
      .where(and(eq(groupPostLikesTable.postId, postId), eq(groupPostLikesTable.userId, userId)));

    let liked: boolean;
    if (existing) {
      await db.delete(groupPostLikesTable)
        .where(and(eq(groupPostLikesTable.postId, postId), eq(groupPostLikesTable.userId, userId)));
      await db.update(groupPostsTable)
        .set({ likesCount: sql`GREATEST(${groupPostsTable.likesCount} - 1, 0)` })
        .where(eq(groupPostsTable.id, postId));
      liked = false;
    } else {
      await db.insert(groupPostLikesTable).values({ postId, userId });
      await db.update(groupPostsTable)
        .set({ likesCount: sql`${groupPostsTable.likesCount} + 1` })
        .where(eq(groupPostsTable.id, postId));
      liked = true;
    }

    const [updated] = await db.select({ likesCount: groupPostsTable.likesCount })
      .from(groupPostsTable).where(eq(groupPostsTable.id, postId));

    res.json({ liked, likesCount: updated?.likesCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Join / leave group ─────────────────────────────────────── */
router.post("/groups/:id/join", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId || 1;
    const existing = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
    if (existing.length > 0) {
      await db.delete(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
      await db.update(groupsTable)
        .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
        .where(eq(groupsTable.id, groupId));
    } else {
      await db.insert(groupMembersTable).values({ groupId, userId });
      await db.update(groupsTable)
        .set({ membersCount: sql`${groupsTable.membersCount} + 1` })
        .where(eq(groupsTable.id, groupId));
    }
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    res.json({ joined: existing.length === 0, membersCount: group?.membersCount || 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
