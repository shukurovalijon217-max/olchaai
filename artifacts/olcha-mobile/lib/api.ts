const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export interface Post {
  id: number;
  userId: number;
  content: string;
  mediaUrl: string | null;
  type: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user?: { id: number; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

export interface Reel {
  id: number;
  userId: number;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  user?: { id: number; username: string; displayName: string; avatarUrl: string | null };
}

export interface UserItem {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  bio: string | null;
}

export interface Conversation {
  id: number;
  participantId: number;
  lastMessage: string | null;
  updatedAt: string;
  participant?: UserItem;
}

export interface Story {
  id: number;
  userId: number;
  mediaUrl: string;
  type: string;
  expiresAt: string;
  user?: UserItem;
}

export interface TrendingTopic {
  tag: string;
  postCount: number;
  growth: number;
  category: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  membersCount: number;
  postsCount: number;
  isPrivate: boolean;
  category: string | null;
  createdAt: string;
  isMember: boolean;
}
