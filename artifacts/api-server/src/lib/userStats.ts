import { db, followsTable, postsTable, usersTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface UserStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
}

export async function getUserStats(userId: number, viewerId?: number): Promise<UserStats> {
  const [[followers], [following], [postsCount], followCheck] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, userId)),
    viewerId && viewerId !== userId
      ? db.select({ id: followsTable.followerId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, userId))).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    followersCount: followers.count,
    followingCount: following.count,
    postsCount: postsCount.count,
    isFollowing: (followCheck as any[]).length > 0,
  };
}

export async function getUserStatsMap(userIds: number[], viewerId?: number): Promise<Map<number, UserStats>> {
  const statsMap = new Map<number, UserStats>();
  if (userIds.length === 0) return statsMap;

  const uniqueIds = [...new Set(userIds)];

  const [followersRows, followingRows, postsRows, viewerFollows] = await Promise.all([
    db.select({ id: followsTable.followingId, count: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(inArray(followsTable.followingId, uniqueIds))
      .groupBy(followsTable.followingId),
    db.select({ id: followsTable.followerId, count: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(inArray(followsTable.followerId, uniqueIds))
      .groupBy(followsTable.followerId),
    db.select({ id: postsTable.authorId, count: sql<number>`count(*)::int` })
      .from(postsTable)
      .where(inArray(postsTable.authorId, uniqueIds))
      .groupBy(postsTable.authorId),
    viewerId
      ? db.select({ followingId: followsTable.followingId })
          .from(followsTable)
          .where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, uniqueIds)))
      : Promise.resolve([]),
  ]);

  const followersCountMap = new Map(followersRows.map(r => [r.id, r.count]));
  const followingCountMap = new Map(followingRows.map(r => [r.id, r.count]));
  const postsCountMap = new Map(postsRows.map(r => [r.id, r.count]));
  const viewerFollowsSet = new Set(viewerFollows.map(r => r.followingId));

  for (const id of uniqueIds) {
    statsMap.set(id, {
      followersCount: followersCountMap.get(id) ?? 0,
      followingCount: followingCountMap.get(id) ?? 0,
      postsCount: postsCountMap.get(id) ?? 0,
      isFollowing: viewerFollowsSet.has(id),
    });
  }

  return statsMap;
}
