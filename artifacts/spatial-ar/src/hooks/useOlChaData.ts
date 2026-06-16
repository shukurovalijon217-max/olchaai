import { useState, useEffect } from "react";

export interface OlChaPost {
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

export interface OlChaProfile {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string | null;
}

const FALLBACK_POSTS: OlChaPost[] = [
  {
    id: 1,
    content: "OlCha Spatial AR muhitida birinchi postim! Hologramma interfeysi hayratlanarli, kelajak bugun boshlandi 🚀",
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    likesCount: 142, commentsCount: 28,
    author: { id: "1", username: "sardor_m", displayName: "Sardor M.", profileImage: null },
  },
  {
    id: 2,
    content: "AR kamera rejimi yoqildi! Xona ichida uchib yurgan postlarni ko'ryapman 😮‍💨✨ Bu tajriba butunlay boshqacha!",
    createdAt: new Date(Date.now() - 360_000).toISOString(),
    likesCount: 89, commentsCount: 15,
    author: { id: "2", username: "zulfiya_k", displayName: "Zulfiya K.", profileImage: null },
  },
  {
    id: 3,
    content: "Yangi story joylashdim 🔥 OlCha Live orqali minglab kishilar tomosha qilmoqda! Kimlar ko'ryapti?",
    createdAt: new Date(Date.now() - 720_000).toISOString(),
    likesCount: 234, commentsCount: 47,
    author: { id: "3", username: "bobur_t", displayName: "Bobur T.", profileImage: null },
  },
  {
    id: 4,
    content: "Live stream boshlandi! Spatial AR muhitida efirga chiqish — bu kelajak! 🌐 Barchani taklif qilaman.",
    createdAt: new Date(Date.now() - 1_080_000).toISOString(),
    likesCount: 56, commentsCount: 12,
    author: { id: "4", username: "malika_r", displayName: "Malika R.", profileImage: null },
  },
  {
    id: 5,
    content: "OlCha Go real-time xizmati ishga tushdi. WebSocket orqali jonli yangilanishlar — hech qanday kechikish yo'q! 💚",
    createdAt: new Date(Date.now() - 1_500_000).toISOString(),
    likesCount: 178, commentsCount: 33,
    author: { id: "5", username: "jasur_a", displayName: "Jasur A.", profileImage: null },
  },
  {
    id: 6,
    content: "NEXUS platformasida yangi AI funksiyasi: feed sizning ta'mingizga moslashadi! Sinab ko'ring 🤖",
    createdAt: new Date(Date.now() - 2_100_000).toISOString(),
    likesCount: 321, commentsCount: 64,
    author: { id: "6", username: "kamola_u", displayName: "Kamola U.", profileImage: null },
  },
];

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

export function useOlChaData() {
  const [posts, setPosts] = useState<OlChaPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?limit=20")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const arr: OlChaPost[] = Array.isArray(data) ? data : (data.posts ?? []);
        setPosts(arr.length > 0 ? arr : FALLBACK_POSTS);
      })
      .catch(() => { if (!cancelled) setPosts(FALLBACK_POSTS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { posts, loading };
}
