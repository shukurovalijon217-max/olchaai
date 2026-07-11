import { useState, useEffect } from "react";

export interface OlchaAIPost {
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

export interface OlchaAIProfile {
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

export function useOlchaAIData() {
  const [posts, setPosts] = useState<OlchaAIPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?limit=20")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const arr: OlchaAIPost[] = Array.isArray(data) ? data : (data.posts ?? []);
        setPosts(arr);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { posts, loading };
}

export function useOlchaAIProfiles() {
  const [profiles, setProfiles] = useState<OlchaAIProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users?limit=6")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : (data.users ?? []);
        const mapped: OlchaAIProfile[] = arr.map((u: any) => ({
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
