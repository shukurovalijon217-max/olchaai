import { useState, useEffect } from "react";

export interface GILOSPost {
  id: number;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  mediaUrl?: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string | null;
  };
}

export interface GILOSProfile {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string | null;
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

export function useGILOSData() {
  const [posts, setPosts] = useState<GILOSPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?limit=20")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const arr: GILOSPost[] = Array.isArray(data) ? data : (data.posts ?? []);
        setPosts(arr);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { posts, loading };
}

export function useGILOSProfiles() {
  const [profiles, setProfiles] = useState<GILOSProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users?limit=6")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : (data.users ?? []);
        const mapped: GILOSProfile[] = arr.map((u: any) => ({
          id: String(u.id),
          username: u.username,
          displayName: u.displayName ?? u.username,
          profileImage: u.avatarUrl ?? null,
        }));
        setProfiles(mapped);
      })
      .catch(() => { if (!cancelled) setProfiles([]); });
    return () => { cancelled = true; };
  }, []);

  return profiles;
}
