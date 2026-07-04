import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  groupsTable, groupMembersTable, groupPostsTable, groupPostLikesTable,
  groupPostReactionsTable, groupPostCommentsTable, groupPostCommentLikesTable,
  groupPollsTable, groupPollVotesTable, groupPostBookmarksTable, groupPostReportsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, ilike, and, desc, ne } from "drizzle-orm";
import { randomBytes } from "crypto";

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
    let memberRole = "member";
    if (userId) {
      const [mem] = await db.select().from(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, userId)));
      isMember = !!mem;
      memberRole = mem?.role ?? "member";
    }
    res.json({ ...group, isMember, memberRole });
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
    const inviteCode = randomBytes(6).toString("hex");

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
      inviteCode,
    }).returning();

    if (userId) {
      await db.insert(groupMembersTable).values({ groupId: group.id, userId, role: "admin" });
      await db.update(groupsTable).set({ membersCount: 1 }).where(eq(groupsTable.id, group.id));
    }

    res.status(201).json({ ...group, isMember: true, memberRole: "admin" });
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

    res.json({ ...updated, isMember: !!mem, memberRole: mem?.role ?? "member" });
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
        role: groupMembersTable.role,
        isMuted: groupMembersTable.isMuted,
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

/* ── Kick member (creator/admin only) ───────────────────────── */
router.delete("/groups/:id/members/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const requesterId = (req as any).session?.userId;
    if (!requesterId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }

    const [requesterMem] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, requesterId)));

    if (group.creatorId !== requesterId && requesterMem?.role !== "admin") {
      res.status(403).json({ error: "No permission" }); return;
    }
    if (targetUserId === group.creatorId) {
      res.status(403).json({ error: "Cannot kick the creator" }); return;
    }

    await db.delete(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));
    await db.update(groupsTable)
      .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
      .where(eq(groupsTable.id, groupId));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Change member role (creator only) ──────────────────────── */
router.patch("/groups/:id/members/:userId/role", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const requesterId = (req as any).session?.userId;
    if (!requesterId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group || group.creatorId !== requesterId) {
      res.status(403).json({ error: "Only creator can change roles" }); return;
    }

    const { role } = req.body;
    if (!["member", "moderator", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" }); return;
    }

    await db.update(groupMembersTable)
      .set({ role })
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));

    res.json({ success: true, role });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Mute/unmute member (admin only) ───────────────────────── */
router.patch("/groups/:id/members/:userId/mute", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const requesterId = (req as any).session?.userId;
    if (!requesterId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [mem] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, requesterId)));
    if (!mem || (mem.role !== "admin" && mem.role !== "moderator")) {
      res.status(403).json({ error: "No permission" }); return;
    }

    const [target] = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));
    const newMuted = !target?.isMuted;

    await db.update(groupMembersTable)
      .set({ isMuted: newMuted })
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));

    res.json({ muted: newMuted });
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
    const sortBy = req.query.sort === "popular" ? "popular" : "newest";
    const filterType = req.query.type as string | undefined;
    const userId = (req as any).session?.userId;

    let query = db
      .select({
        id: groupPostsTable.id,
        groupId: groupPostsTable.groupId,
        authorId: groupPostsTable.authorId,
        content: groupPostsTable.content,
        mediaUrl: groupPostsTable.mediaUrl,
        postType: groupPostsTable.postType,
        isPinned: groupPostsTable.isPinned,
        likesCount: groupPostsTable.likesCount,
        reactionsCount: groupPostsTable.reactionsCount,
        commentsCount: groupPostsTable.commentsCount,
        bookmarksCount: groupPostsTable.bookmarksCount,
        createdAt: groupPostsTable.createdAt,
        authorUsername: usersTable.username,
        authorDisplayName: usersTable.displayName,
        authorAvatarUrl: usersTable.avatarUrl,
      })
      .from(groupPostsTable)
      .innerJoin(usersTable, eq(groupPostsTable.authorId, usersTable.id))
      .where(eq(groupPostsTable.groupId, groupId))
      .$dynamic();

    let posts = await query.orderBy(
      sortBy === "popular"
        ? desc(groupPostsTable.reactionsCount)
        : desc(groupPostsTable.createdAt)
    ).limit(limit);

    if (filterType === "media") posts = posts.filter(p => !!p.mediaUrl);
    if (filterType === "polls") posts = posts.filter(p => p.postType === "poll");

    let likedIds = new Set<number>();
    let reactedMap = new Map<number, string>();
    let bookmarkedIds = new Set<number>();

    if (userId && posts.length > 0) {
      const [likes, reactions, bookmarks] = await Promise.all([
        db.select({ postId: groupPostLikesTable.postId })
          .from(groupPostLikesTable).where(eq(groupPostLikesTable.userId, userId)),
        db.select({ postId: groupPostReactionsTable.postId, reactionType: groupPostReactionsTable.reactionType })
          .from(groupPostReactionsTable).where(eq(groupPostReactionsTable.userId, userId)),
        db.select({ postId: groupPostBookmarksTable.postId })
          .from(groupPostBookmarksTable).where(eq(groupPostBookmarksTable.userId, userId)),
      ]);
      likes.forEach(l => likedIds.add(l.postId));
      reactions.forEach(r => reactedMap.set(r.postId, r.reactionType));
      bookmarks.forEach(b => bookmarkedIds.add(b.postId));
    }

    const pinnedFirst = [...posts].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    res.json(pinnedFirst.map(p => ({
      ...p,
      isLikedByMe: likedIds.has(p.id),
      myReaction: reactedMap.get(p.id) ?? null,
      isBookmarked: bookmarkedIds.has(p.id),
    })));
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

    const { content, mediaUrl, postType } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }

    const [post] = await db.insert(groupPostsTable).values({
      groupId,
      authorId: userId,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
      postType: postType || "text",
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
      myReaction: null,
      isBookmarked: false,
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

    const [mem] = await db.select({ role: groupMembersTable.role }).from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));

    const isAuthor = post.authorId === userId;
    const isGroupCreator = group?.creatorId === userId;
    const isAdmin = mem?.role === "admin" || mem?.role === "moderator";

    if (!isAuthor && !isGroupCreator && !isAdmin) {
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

/* ── Pin/unpin group post (creator/admin) ───────────────────── */
router.post("/groups/:id/posts/:postId/pin", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group) { res.status(404).json({ error: "Not found" }); return; }

    const [mem] = await db.select({ role: groupMembersTable.role }).from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));

    if (group.creatorId !== userId && mem?.role !== "admin" && mem?.role !== "moderator") {
      res.status(403).json({ error: "No permission" }); return;
    }

    const [post] = await db.select({ isPinned: groupPostsTable.isPinned })
      .from(groupPostsTable).where(eq(groupPostsTable.id, postId));

    const newPinned = !post?.isPinned;

    // Unpin all others first
    await db.update(groupPostsTable)
      .set({ isPinned: false })
      .where(eq(groupPostsTable.groupId, groupId));

    if (newPinned) {
      await db.update(groupPostsTable)
        .set({ isPinned: true })
        .where(eq(groupPostsTable.id, postId));
    }

    res.json({ pinned: newPinned });
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

/* ── React to post (multi-type) ─────────────────────────────── */
router.post("/groups/:id/posts/:postId/react", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { reactionType } = req.body;
    const validTypes = ["heart", "fire", "laugh", "wow", "clap", "sad"];
    if (!validTypes.includes(reactionType)) {
      res.status(400).json({ error: "Invalid reaction type" }); return;
    }

    const [existing] = await db.select().from(groupPostReactionsTable)
      .where(and(eq(groupPostReactionsTable.postId, postId), eq(groupPostReactionsTable.userId, userId)));

    let myReaction: string | null;

    if (existing) {
      if (existing.reactionType === reactionType) {
        await db.delete(groupPostReactionsTable)
          .where(and(eq(groupPostReactionsTable.postId, postId), eq(groupPostReactionsTable.userId, userId)));
        await db.update(groupPostsTable)
          .set({ reactionsCount: sql`GREATEST(${groupPostsTable.reactionsCount} - 1, 0)` })
          .where(eq(groupPostsTable.id, postId));
        myReaction = null;
      } else {
        await db.update(groupPostReactionsTable)
          .set({ reactionType })
          .where(and(eq(groupPostReactionsTable.postId, postId), eq(groupPostReactionsTable.userId, userId)));
        myReaction = reactionType;
      }
    } else {
      await db.insert(groupPostReactionsTable).values({ postId, userId, reactionType });
      await db.update(groupPostsTable)
        .set({ reactionsCount: sql`${groupPostsTable.reactionsCount} + 1` })
        .where(eq(groupPostsTable.id, postId));
      myReaction = reactionType;
    }

    const [updated] = await db.select({ reactionsCount: groupPostsTable.reactionsCount })
      .from(groupPostsTable).where(eq(groupPostsTable.id, postId));

    const reactionCounts = await db
      .select({ reactionType: groupPostReactionsTable.reactionType, count: sql<number>`count(*)` })
      .from(groupPostReactionsTable)
      .where(eq(groupPostReactionsTable.postId, postId))
      .groupBy(groupPostReactionsTable.reactionType);

    res.json({ myReaction, reactionsCount: updated?.reactionsCount ?? 0, reactionCounts });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get post reaction summary ──────────────────────────────── */
router.get("/groups/:id/posts/:postId/reactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const reactionCounts = await db
      .select({ reactionType: groupPostReactionsTable.reactionType, count: sql<number>`count(*)` })
      .from(groupPostReactionsTable)
      .where(eq(groupPostReactionsTable.postId, postId))
      .groupBy(groupPostReactionsTable.reactionType);
    res.json(reactionCounts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get post comments ──────────────────────────────────────── */
router.get("/groups/:id/posts/:postId/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const comments = await db
      .select({
        id: groupPostCommentsTable.id,
        postId: groupPostCommentsTable.postId,
        authorId: groupPostCommentsTable.authorId,
        parentId: groupPostCommentsTable.parentId,
        content: groupPostCommentsTable.content,
        likesCount: groupPostCommentsTable.likesCount,
        createdAt: groupPostCommentsTable.createdAt,
        authorUsername: usersTable.username,
        authorDisplayName: usersTable.displayName,
        authorAvatarUrl: usersTable.avatarUrl,
      })
      .from(groupPostCommentsTable)
      .innerJoin(usersTable, eq(groupPostCommentsTable.authorId, usersTable.id))
      .where(eq(groupPostCommentsTable.postId, postId))
      .orderBy(desc(groupPostCommentsTable.createdAt))
      .limit(limit);

    let likedCommentIds = new Set<number>();
    if (userId && comments.length > 0) {
      const likes = await db.select({ commentId: groupPostCommentLikesTable.commentId })
        .from(groupPostCommentLikesTable).where(eq(groupPostCommentLikesTable.userId, userId));
      likes.forEach(l => likedCommentIds.add(l.commentId));
    }

    res.json(comments.map(c => ({ ...c, isLikedByMe: likedCommentIds.has(c.id) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Post a comment ─────────────────────────────────────────── */
router.post("/groups/:id/posts/:postId/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { content, parentId } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

    const [comment] = await db.insert(groupPostCommentsTable).values({
      postId, authorId: userId,
      content: content.trim(),
      parentId: parentId ?? null,
    }).returning();

    await db.update(groupPostsTable)
      .set({ commentsCount: sql`${groupPostsTable.commentsCount} + 1` })
      .where(eq(groupPostsTable.id, postId));

    const [author] = await db.select({
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(eq(usersTable.id, userId));

    res.status(201).json({
      ...comment,
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

/* ── Delete a comment ───────────────────────────────────────── */
router.delete("/groups/:id/posts/:postId/comments/:commentId", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [comment] = await db.select().from(groupPostCommentsTable)
      .where(eq(groupPostCommentsTable.id, commentId));

    if (!comment || comment.authorId !== userId) {
      res.status(403).json({ error: "No permission" }); return;
    }

    await db.delete(groupPostCommentsTable).where(eq(groupPostCommentsTable.id, commentId));
    await db.update(groupPostsTable)
      .set({ commentsCount: sql`GREATEST(${groupPostsTable.commentsCount} - 1, 0)` })
      .where(eq(groupPostsTable.id, postId));

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Like / unlike a comment ────────────────────────────────── */
router.post("/groups/:id/posts/:postId/comments/:commentId/like", async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [existing] = await db.select().from(groupPostCommentLikesTable)
      .where(and(eq(groupPostCommentLikesTable.commentId, commentId), eq(groupPostCommentLikesTable.userId, userId)));

    let liked: boolean;
    if (existing) {
      await db.delete(groupPostCommentLikesTable)
        .where(and(eq(groupPostCommentLikesTable.commentId, commentId), eq(groupPostCommentLikesTable.userId, userId)));
      await db.update(groupPostCommentsTable)
        .set({ likesCount: sql`GREATEST(${groupPostCommentsTable.likesCount} - 1, 0)` })
        .where(eq(groupPostCommentsTable.id, commentId));
      liked = false;
    } else {
      await db.insert(groupPostCommentLikesTable).values({ commentId, userId });
      await db.update(groupPostCommentsTable)
        .set({ likesCount: sql`${groupPostCommentsTable.likesCount} + 1` })
        .where(eq(groupPostCommentsTable.id, commentId));
      liked = true;
    }

    const [updated] = await db.select({ likesCount: groupPostCommentsTable.likesCount })
      .from(groupPostCommentsTable).where(eq(groupPostCommentsTable.id, commentId));

    res.json({ liked, likesCount: updated?.likesCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get group polls ────────────────────────────────────────── */
router.get("/groups/:id/polls", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId;

    const polls = await db.select().from(groupPollsTable)
      .where(eq(groupPollsTable.groupId, groupId))
      .orderBy(desc(groupPollsTable.createdAt))
      .limit(20);

    const enriched = await Promise.all(polls.map(async (poll) => {
      const votes = await db.select().from(groupPollVotesTable)
        .where(eq(groupPollVotesTable.pollId, poll.id));
      const myVote = userId ? votes.find(v => v.userId === userId) : null;
      const voteCounts = (poll.options as string[]).map((_: string, i: number) =>
        votes.filter(v => v.optionIndex === i).length
      );
      return { ...poll, totalVotes: votes.length, voteCounts, myVoteIndex: myVote?.optionIndex ?? null };
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Create group poll ──────────────────────────────────────── */
router.post("/groups/:id/polls", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { question, options, endsAt, isAnonymous, allowMultiple } = req.body;
    if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ error: "question and at least 2 options required" }); return;
    }

    const [poll] = await db.insert(groupPollsTable).values({
      groupId, creatorId: userId,
      question: question.trim(),
      options: options.map((o: string) => o.trim()).filter(Boolean),
      endsAt: endsAt ? new Date(endsAt) : null,
      isAnonymous: isAnonymous ?? false,
      allowMultiple: allowMultiple ?? false,
    }).returning();

    res.status(201).json({ ...poll, totalVotes: 0, voteCounts: options.map(() => 0), myVoteIndex: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Vote on a poll ─────────────────────────────────────────── */
router.post("/groups/:id/polls/:pollId/vote", async (req: Request, res: Response): Promise<void> => {
  try {
    const pollId = Number(req.params.pollId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { optionIndex } = req.body;
    if (typeof optionIndex !== "number") {
      res.status(400).json({ error: "optionIndex required" }); return;
    }

    const [existing] = await db.select().from(groupPollVotesTable)
      .where(and(eq(groupPollVotesTable.pollId, pollId), eq(groupPollVotesTable.userId, userId)));

    if (existing) {
      await db.update(groupPollVotesTable)
        .set({ optionIndex })
        .where(and(eq(groupPollVotesTable.pollId, pollId), eq(groupPollVotesTable.userId, userId)));
    } else {
      await db.insert(groupPollVotesTable).values({ pollId, userId, optionIndex });
    }

    const [poll] = await db.select().from(groupPollsTable).where(eq(groupPollsTable.id, pollId));
    const votes = await db.select().from(groupPollVotesTable).where(eq(groupPollVotesTable.pollId, pollId));
    const voteCounts = (poll.options as string[]).map((_: string, i: number) =>
      votes.filter(v => v.optionIndex === i).length
    );

    res.json({ totalVotes: votes.length, voteCounts, myVoteIndex: optionIndex });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Bookmark / unbookmark post ─────────────────────────────── */
router.post("/groups/:id/posts/:postId/bookmark", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [existing] = await db.select().from(groupPostBookmarksTable)
      .where(and(eq(groupPostBookmarksTable.postId, postId), eq(groupPostBookmarksTable.userId, userId)));

    let bookmarked: boolean;
    if (existing) {
      await db.delete(groupPostBookmarksTable)
        .where(and(eq(groupPostBookmarksTable.postId, postId), eq(groupPostBookmarksTable.userId, userId)));
      await db.update(groupPostsTable)
        .set({ bookmarksCount: sql`GREATEST(${groupPostsTable.bookmarksCount} - 1, 0)` })
        .where(eq(groupPostsTable.id, postId));
      bookmarked = false;
    } else {
      await db.insert(groupPostBookmarksTable).values({ postId, userId });
      await db.update(groupPostsTable)
        .set({ bookmarksCount: sql`${groupPostsTable.bookmarksCount} + 1` })
        .where(eq(groupPostsTable.id, postId));
      bookmarked = true;
    }

    res.json({ bookmarked });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get user's bookmarks for a group ───────────────────────── */
router.get("/groups/:id/bookmarks", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const bookmarks = await db
      .select({
        id: groupPostsTable.id,
        content: groupPostsTable.content,
        mediaUrl: groupPostsTable.mediaUrl,
        postType: groupPostsTable.postType,
        likesCount: groupPostsTable.likesCount,
        commentsCount: groupPostsTable.commentsCount,
        createdAt: groupPostsTable.createdAt,
        authorUsername: usersTable.username,
        authorDisplayName: usersTable.displayName,
        authorAvatarUrl: usersTable.avatarUrl,
        savedAt: groupPostBookmarksTable.createdAt,
      })
      .from(groupPostBookmarksTable)
      .innerJoin(groupPostsTable, eq(groupPostBookmarksTable.postId, groupPostsTable.id))
      .innerJoin(usersTable, eq(groupPostsTable.authorId, usersTable.id))
      .where(and(
        eq(groupPostBookmarksTable.userId, userId),
        eq(groupPostsTable.groupId, groupId)
      ))
      .orderBy(desc(groupPostBookmarksTable.createdAt))
      .limit(50);

    res.json(bookmarks);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Report a post ──────────────────────────────────────────── */
router.post("/groups/:id/posts/:postId/report", async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.postId);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { reason } = req.body;
    if (!reason?.trim()) { res.status(400).json({ error: "reason required" }); return; }

    const [existing] = await db.select().from(groupPostReportsTable)
      .where(and(eq(groupPostReportsTable.postId, postId), eq(groupPostReportsTable.reporterId, userId)));

    if (existing) {
      res.json({ already: true }); return;
    }

    await db.insert(groupPostReportsTable).values({ postId, reporterId: userId, reason: reason.trim() });
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get group stats (creator/admin) ────────────────────────── */
router.get("/groups/:id/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
    if (!group || group.creatorId !== userId) {
      res.status(403).json({ error: "No permission" }); return;
    }

    const [postCount] = await db.select({ count: sql<number>`count(*)` }).from(groupPostsTable).where(eq(groupPostsTable.groupId, groupId));
    const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
    const [likeCount] = await db.select({ total: sql<number>`COALESCE(SUM(likes_count),0)` }).from(groupPostsTable).where(eq(groupPostsTable.groupId, groupId));
    const [commentCount] = await db.select({ total: sql<number>`COALESCE(SUM(comments_count),0)` }).from(groupPostsTable).where(eq(groupPostsTable.groupId, groupId));

    res.json({
      posts: Number(postCount?.count ?? 0),
      members: Number(memberCount?.count ?? 0),
      totalLikes: Number(likeCount?.total ?? 0),
      totalComments: Number(commentCount?.total ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get invite link ────────────────────────────────────────── */
router.get("/groups/:id/invite-link", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select({ inviteCode: groupsTable.inviteCode, creatorId: groupsTable.creatorId })
      .from(groupsTable).where(eq(groupsTable.id, id));
    if (!group) { res.status(404).json({ error: "Not found" }); return; }

    let code = group.inviteCode;
    if (!code) {
      code = randomBytes(6).toString("hex");
      await db.update(groupsTable).set({ inviteCode: code }).where(eq(groupsTable.id, id));
    }

    res.json({ code, link: `${req.headers.origin ?? ""}/groups?invite=${code}` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Regenerate invite link (creator only) ──────────────────── */
router.post("/groups/:id/invite-link/regenerate", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
    if (!group || group.creatorId !== userId) { res.status(403).json({ error: "No permission" }); return; }

    const code = randomBytes(6).toString("hex");
    await db.update(groupsTable).set({ inviteCode: code }).where(eq(groupsTable.id, id));

    res.json({ code, link: `${req.headers.origin ?? ""}/groups?invite=${code}` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Join / leave group ─────────────────────────────────────── */
router.post("/groups/:id/join", async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = Number(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const userId = (req as any).session?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const existing = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
    if (existing.length > 0) {
      await db.delete(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
      await db.update(groupsTable)
        .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
        .where(eq(groupsTable.id, groupId));
    } else {
      await db.insert(groupMembersTable).values({ groupId, userId, role: "member" });
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
