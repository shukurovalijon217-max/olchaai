/**
 * NEXUS FEEDCARD — "SIGNAL" Edition  v2.0
 * ─────────────────────────────────────────────────────────────────
 * Unique innovations no other social platform has:
 *
 * 1. ORB COLUMN — floating glass spheres with plasma rings (right edge)
 * 2. SIGNAL FRAME — 1.5 px neon border enters from left on activate
 * 3. FREQUENCY STRIP — 18-bar animated waveform reacts to audio
 * 4. AUTHOR GLASS BAR — bottom glass strip with spinning conic avatar ring
 * 5. PLASMA LIKE — concentric burst rings + floating number on like
 * 6. EDGE-TO-EDGE — 100dvh/100% fills viewport, zero border-radius on card
 * 7. ALBUM 3-D — perspective carousel for multi-image posts
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Trash2,
  VolumeX, Volume2, BadgeCheck, Check, Send, X,
  Music, Sparkles, MoreHorizontal, Link,
  UserPlus, UserCheck, Download, Loader2, Flag, Brain, ChevronLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { Post } from "@workspace/api-client-react";
import {
  PostType, useLikePost, useDeletePost,
  getListPostsQueryKey, getGetAiFeedQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Accent palette (per post index) ───────────────────────── */
const ACCENTS = [
  "#818cf8","#22d3ee","#f472b6","#34d399",
  "#fb923c","#a78bfa","#38bdf8","#f87171",
  "#4ade80","#facc15","#c084fc","#60a5fa",
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : `${n}`;

const initials = (name?: string) =>
  (name ?? "?").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(url);

/* ─── WAVEFORM STRIP ─────────────────────────────────────────── */
function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2.5px]" style={{ height: 22, flexShrink: 0 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          animate={active
            ? { height: [`${18 + (i % 4) * 10}%`, `${45 + (i % 5) * 11}%`, `${18 + (i % 4) * 10}%`] }
            : { height: "18%" }
          }
          transition={active
            ? { duration: 0.4 + (i % 5) * 0.08, repeat: Infinity, delay: i * 0.025, ease: "easeInOut" }
            : { duration: 0.28 }
          }
          style={{ width: 2.5, borderRadius: 2, flexShrink: 0,
            background: active ? color : "rgba(255,255,255,0.18)" }}
        />
      ))}
    </div>
  );
}

/* ─── ACTION ORB ─────────────────────────────────────────────── */
function Orb({
  icon, count, active, activeColor, onClick, inView = true,
}: {
  icon: React.ReactNode; count?: number; active?: boolean;
  activeColor: string; onClick: () => void; inView?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.68 }}
      onClick={onClick}
      className="flex flex-col items-center gap-[3px]"
    >
      <div
        className="w-[42px] h-[42px] rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          background: active ? `${activeColor}28` : "rgba(6,4,16,0.58)",
          border: `1.5px solid ${active ? activeColor + "55" : "rgba(255,255,255,0.12)"}`,
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          boxShadow: active
            ? `0 0 20px ${activeColor}44, inset 0 1px 0 rgba(255,255,255,0.14)`
            : "0 2px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {active && inView && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ background: `radial-gradient(circle, ${activeColor}30 0%, transparent 70%)` }}
          />
        )}
        {icon}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-black tabular-nums leading-none"
          style={{ color: active ? activeColor : "rgba(255,255,255,0.45)" }}>
          {fmt(count)}
        </span>
      )}
    </motion.button>
  );
}

/* ─── PARTICLE (text posts) ─────────────────────────────────── */
function Particle({ color }: { color: string }) {
  const x = Math.random() * 100;
  const d = 3 + Math.random() * 6;
  const s = 2.5 + Math.random() * 4.5;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: "108%", width: s, height: s, background: color, opacity: 0.35 }}
      animate={{ y: [`${-80 - Math.random() * 120}vh`], opacity: [0.35, 0] }}
      transition={{ duration: d, repeat: Infinity, delay: Math.random() * d, ease: "linear" }}
    />
  );
}

/* ─── POLL WIDGET ─────────────────────────────────────────────── */
function PollWidget({ post, accent }: { post: Post & any; accent: string }) {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  let options: string[] = [];
  try { options = JSON.parse(post.pollOptions || "[]"); } catch { options = []; }

  const totalVotes = votes.reduce((s, v) => s + v, 0);
  const getPct = (i: number) => totalVotes === 0 ? 0 : Math.round((votes[i] / totalVotes) * 100);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/posts/${post.id}/votes`, { credentials: "include" })
      .then(r => r.json())
      .then((data: { votes?: { optionIndex: number; count: number }[]; userVote?: number | null }) => {
        if (cancelled) return;
        const counts = new Array(options.length).fill(0);
        (data.votes || []).forEach(v => { if (v.optionIndex < counts.length) counts[v.optionIndex] = v.count; });
        setVotes(counts);
        setUserVote(data.userVote ?? null);
      })
      .catch(() => setVotes(new Array(options.length).fill(0)));
    return () => { cancelled = true; };
  }, [post.id]);

  const vote = async (i: number) => {
    if (userVote !== null || loading || !user) return;
    setLoading(true);
    const prevVotes = votes;
    setUserVote(i);
    setVotes(v => v.map((c, idx) => idx === i ? c + 1 : c));
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/vote`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, optionIndex: i }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data: { votes?: { optionIndex: number; count: number }[] } = await res.json();
      const counts = new Array(options.length).fill(0);
      (data.votes || []).forEach(v => { if (v.optionIndex < counts.length) counts[v.optionIndex] = v.count; });
      setVotes(counts);
    } catch {
      setUserVote(null);
      setVotes(prevVotes);
    } finally { setLoading(false); }
  };

  if (!options.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)", border: `1px solid ${accent}22` }}>
      <div className="px-3.5 pt-3 pb-1">
        <p className="text-white font-bold text-[13px] leading-snug">📊 {post.pollQuestion}</p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>{totalVotes} ovoz</p>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {options.map((opt, i) => {
          const voted = userVote !== null;
          const isChosen = userVote === i;
          const pct = voted ? getPct(i) : 0;
          return (
            <button key={i} disabled={voted || loading} onClick={() => vote(i)}
              className="w-full relative rounded-xl overflow-hidden text-left"
              style={{ height: 38,
                background: voted ? (isChosen ? `${accent}20` : "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.09)",
                border: `1px solid ${voted && isChosen ? accent + "55" : "rgba(255,255,255,0.12)"}`,
              }}>
              {voted && (
                <motion.div className="absolute inset-y-0 left-0 rounded-xl"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: isChosen ? `${accent}38` : "rgba(255,255,255,0.07)" }} />
              )}
              <div className="relative flex items-center justify-between px-3 h-full">
                <span className="text-white text-[12px] font-semibold truncate">
                  {isChosen && "✓ "}{opt}
                </span>
                {voted && <span className="text-white/60 text-[11px] font-bold flex-shrink-0 ml-2">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
interface FeedCardProps {
  post: Post & { commentPermission?: string; sharePermission?: string; displayFormat?: string };
  index: number;
}

export default function FeedCard({ post, index }: FeedCardProps) {
  const accent   = ACCENTS[index % ACCENTS.length];
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  /* ── State ── */
  const [liked,    setLiked]    = useState(post.isLiked ?? false);
  const [likes,    setLikes]    = useState(post.likesCount ?? 0);
  const [shares,   setShares]   = useState(post.sharesCount ?? 0);
  const [muted,    setMuted]    = useState(true);
  const [copied,   setCopied]   = useState(false);
  const [subscribed,    setSubscribed]    = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const subscribeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [commentOpen,    setCommentOpen]    = useState(false);
  const [commentText,    setCommentText]    = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent,    setCommentSent]    = useState(false);

  const [shareOpen,    setShareOpen]    = useState(false);
  const [shareQuery,   setShareQuery]   = useState("");
  const [shareResults, setShareResults] = useState<any[]>([]);
  const [shareSending, setShareSending] = useState<number | null>(null);
  const [shareSent,    setShareSent]    = useState<number | null>(null);
  const [linkCopied,   setLinkCopied]   = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted,       setDeleted]       = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [reported,  setReported]  = useState(false);
  const [holdMode,  setHoldMode]  = useState<"fast" | "slow" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Unified overlay tap-to-show (back arrow + author + subscribe + orbs) */
  const [overlayVisible, setOverlayVisible] = useState(false);
  const overlayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showOverlayBriefly = useCallback(() => {
    setOverlayVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setOverlayVisible(false), 3200);
  }, []);

  /* Album carousel */
  const allMedia: string[] = (() => {
    const urls: string[] = (post as any).mediaUrls ?? [];
    return urls.length > 1 ? urls : post.mediaUrl ? [post.mediaUrl] : [];
  })();
  const isAlbum = allMedia.length > 1;
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);

  /* Floating like number */
  const [likeFloat, setLikeFloat] = useState<{ key: number; delta: number } | null>(null);
  let floatKey = useRef(0);

  /* ── Refs ── */
  const cardRef    = useRef<HTMLDivElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const isInView   = useInView(cardRef, { amount: 0.55 });

  /* ── Query client + mutations ── */
  const queryClient = useQueryClient();
  const likePost    = useLikePost();
  const deletePost  = useDeletePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAiFeedQueryKey() });
        setDeleted(true);
      },
      onSettled: () => setDeleting(false),
    },
  });

  const isOwner = !!user && !!post.author && user.id === post.author.id;
  const isVideo = post.type === PostType.video;
  const isPhoto = post.type === PostType.photo;
  const isText  = post.type === PostType.text;
  const hasAudio = !!(post as any).audioUrl;
  const audioName = (post as any).audioName as string | undefined;
  const audioUrl  = (post as any).audioUrl  as string | undefined;
  const displayFormat = (post as any).displayFormat ?? "cover";
  const photoFit  = displayFormat === "contain" ? "object-contain" : "object-cover";

  /* ── Effects ── */
  /* Video auto-play */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [isInView]);

  /* Video speed (hold) */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = holdMode === "fast" ? 2.5 : holdMode === "slow" ? 0.35 : 1;
  }, [holdMode]);

  /* Background audio with trim */
  useEffect(() => {
    if (!audioUrl || !isPhoto) return;
    const trimStart = (post as any).audioTrimStart != null ? Number((post as any).audioTrimStart) : undefined;
    const trimEnd   = (post as any).audioTrimEnd   != null ? Number((post as any).audioTrimEnd)   : undefined;
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.loop = false; a.volume = 0.65;
      if (trimStart != null) a.currentTime = trimStart;
      a.addEventListener("timeupdate", () => {
        if (trimEnd != null && a.currentTime >= trimEnd) {
          a.currentTime = trimStart ?? 0; a.play().catch(() => {});
        }
      });
      a.addEventListener("ended", () => {
        a.currentTime = trimStart ?? 0; a.play().catch(() => {});
      });
      audioRef.current = a;
    }
    audioRef.current.muted = muted;
    if (isInView) {
      if (trimStart != null && audioRef.current.currentTime < trimStart) {
        audioRef.current.currentTime = trimStart;
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
    return () => { audioRef.current?.pause(); };
  }, [isInView, isPhoto, muted, audioUrl]);

  /* Close panels on scroll away */
  useEffect(() => {
    if (!isInView) {
      setCommentOpen(false); setShareOpen(false);
      setMenuOpen(false); setDeleteConfirm(false);
    }
  }, [isInView]);

  /* Focus comment input */
  useEffect(() => {
    if (commentOpen) setTimeout(() => commentRef.current?.focus(), 120);
  }, [commentOpen]);

  /* Share user search */
  useEffect(() => {
    if (!shareOpen || !shareQuery.trim()) { setShareResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users?search=${encodeURIComponent(shareQuery)}&limit=10`, { credentials: "include" });
        if (res.ok) setShareResults(await res.json());
      } catch { /* ignore */ }
    }, 320);
    return () => clearTimeout(t);
  }, [shareQuery, shareOpen]);

  /* ── Handlers ── */
  const handleLike = () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    if (next) {
      floatKey.current++;
      setLikeFloat({ key: floatKey.current, delta: +1 });
      setTimeout(() => setLikeFloat(null), 900);
    }
    likePost.mutate({ id: post.id });
  };

  const handleDelete = useCallback(() => {
    setDeleting(true); deletePost.mutate({ id: post.id });
  }, [deletePost, post.id]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("input");
      el.value = url;
      el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setLinkCopied(true); setShares(s => s + 1);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !user || sendingComment) return;
    setSendingComment(true);
    try {
      await fetch(`${API_BASE}/api/posts/${post.id}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim(), authorId: user.id }),
      });
      setCommentText("");
      setCommentSent(true);
      setTimeout(() => { setCommentSent(false); setCommentOpen(false); }, 1400);
    } catch { /* ignore */ } finally { setSendingComment(false); }
  };

  const handleSendToUser = async (toUser: any) => {
    if (!user || shareSending) return;
    setShareSending(toUser.id);
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const content = `📤 *${post.author?.displayName ?? "OlchaAI"}* tomonidan post:\n${postUrl}`;
    try {
      const convRes = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [user.id, toUser.id] }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      await fetch(`${API_BASE}/api/conversations/${conv.id}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.id, content }),
      });
      setShareSent(toUser.id); setShares(s => s + 1);
      setTimeout(() => {
        setShareSent(null); setShareSending(null);
        setShareOpen(false); setShareQuery(""); setShareResults([]);
      }, 1600);
    } catch { setShareSending(null); }
  };

  const showSubscribeBriefly = useCallback(() => {
    setShowSubscribe(true);
    if (subscribeTimer.current) clearTimeout(subscribeTimer.current);
    subscribeTimer.current = setTimeout(() => setShowSubscribe(false), 2600);
  }, []);

  const startHold = useCallback((side: "fast" | "slow") => {
    holdTimer.current = setTimeout(() => setHoldMode(side), 130);
  }, []);
  const endHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHoldMode(null);
  }, []);

  const goSlide = (dir: 1 | -1) => {
    const next = slideIdx + dir;
    if (next < 0 || next >= allMedia.length) return;
    setSlideDir(dir); setSlideIdx(next);
  };

  /* Parse overlays */
  let overlays: any[] = [];
  try { overlays = JSON.parse((post as any).overlays || "[]"); } catch { overlays = []; }

  let moodLabel = (post as any).mood as string | undefined;
  const tags: string[] = (post.tags ?? []).filter(t => !t.startsWith("_") && !t.includes(":"));
  const hasPoll = !!(post as any).pollQuestion;

  if (deleted) return null;

  /* ──────────── JSX ──────────── */
  return (
    <div
      ref={cardRef}
      className="relative w-full flex-shrink-0 select-none overflow-hidden"
      style={{
        height: "100dvh",
        scrollSnapAlign: "start",
        background: isVideo ? "#060308" : isPhoto ? "#040810" : "#04040e",
      }}
      onClick={() => showOverlayBriefly()}
    >

      {/* ═══ LAYER 0: Blurred background for photo ═══ */}
      {isPhoto && post.mediaUrl && (
        <img src={post.mediaUrl} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(32px) saturate(1.4) brightness(0.28)", transform: "scale(1.18)", zIndex: 0 }}
        />
      )}

      {/* ═══ LAYER 0b: Text nebula background ═══ */}
      {isText && (
        <>
          <motion.div className="absolute inset-0 pointer-events-none"
            animate={isInView ? { opacity: [0.45, 0.75, 0.45] } : { opacity: 0.45 }}
            transition={isInView ? { duration: 6, repeat: Infinity } : { duration: 0.3 }}
            style={{
              zIndex: 0,
              background: `radial-gradient(ellipse at 28% 42%, ${accent}22 0%, transparent 55%),
                           radial-gradient(ellipse at 72% 65%, rgba(59,130,246,0.14) 0%, transparent 55%)`,
            }}
          />
          {isInView && Array.from({ length: 12 }).map((_, i) => <Particle key={i} color={accent} />)}
        </>
      )}

      {/* ═══ LAYER 1: MAIN CONTENT (edge-to-edge) ═══ */}
      <motion.div
        className="absolute inset-0"
        style={{ zIndex: 2 }}
        initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {isAlbum ? (
          /* Album carousel */
          <div className="absolute inset-0 overflow-hidden" style={{ perspective: "1200px" }}>
            <AnimatePresence initial={false} custom={slideDir}>
              <motion.div
                key={slideIdx} custom={slideDir}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", scale: 0.88, rotateY: d > 0 ? 18 : -18, opacity: 0 }),
                  center: { x: 0, scale: 1, rotateY: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? "-38%" : "38%", scale: 0.84, rotateY: d > 0 ? -12 : 12, opacity: 0 }),
                }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12}
                onDragEnd={(_, info) => { if (info.offset.x < -55) goSlide(1); else if (info.offset.x > 55) goSlide(-1); }}
              >
                {isVideoUrl(allMedia[slideIdx])
                  ? <video src={allMedia[slideIdx]} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                  : <img src={allMedia[slideIdx]} alt={post.content} className={`w-full h-full ${photoFit}`} />
                }
                <div className="absolute inset-0 -z-10">
                  <img src={allMedia[slideIdx]} alt="" aria-hidden className="w-full h-full object-cover"
                    style={{ filter: "blur(28px) saturate(1.4) brightness(0.28)", transform: "scale(1.18)" }} />
                </div>
              </motion.div>
            </AnimatePresence>
            {slideIdx > 0 && (
              <button className="absolute left-2 top-0 bottom-0 w-10 z-10 flex items-center justify-start"
                onClick={() => goSlide(-1)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </button>
            )}
            {slideIdx < allMedia.length - 1 && (
              <button className="absolute right-2 top-0 bottom-0 w-10 z-10 flex items-center justify-end"
                onClick={() => goSlide(1)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}
            {/* Dot indicators */}
            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 z-10">
              {allMedia.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === slideIdx ? 18 : 5, height: 5,
                    background: i === slideIdx ? accent : "rgba(255,255,255,0.35)" }} />
              ))}
            </div>
          </div>
        ) : isVideo && post.mediaUrl ? (
          <video ref={videoRef} src={post.mediaUrl} muted={muted} loop playsInline
            className="w-full h-full object-cover" />
        ) : isPhoto && post.mediaUrl ? (
          <img src={post.mediaUrl} alt={post.content}
            className={`w-full h-full ${photoFit} cursor-pointer`}
            onClick={showSubscribeBriefly} />
        ) : (
          /* TEXT POST */
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <motion.p
              className="text-center font-extrabold text-white leading-snug"
              style={{
                fontSize: post.content.length > 120 ? 20 : post.content.length > 60 ? 24 : 28,
                textShadow: `0 0 60px ${accent}66, 0 2px 8px rgba(0,0,0,0.85)`,
                maxWidth: 340,
              }}
              initial={{ opacity: 0, y: 18 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {post.content}
            </motion.p>
          </div>
        )}
      </motion.div>

      {/* ═══ LAYER 1.5: Sticker / text overlays ═══ */}
      {overlays.map((item: any) => {
        const animCls = item.animation === "pulse" ? "txt-anim-pulse"
          : item.animation === "bounce" ? "txt-anim-bounce"
          : item.animation === "neon"   ? "txt-anim-neon"
          : item.animation === "slide"  ? "txt-anim-slide"
          : "";
        const fs: React.CSSProperties = item.fontStyle === "bold"   ? { fontWeight: 900 }
          : item.fontStyle === "italic"  ? { fontStyle: "italic" }
          : item.fontStyle === "shadow"  ? { textShadow: "2px 3px 8px rgba(0,0,0,0.9)" }
          : item.fontStyle === "outline" ? { WebkitTextStroke: "1.5px rgba(0,0,0,0.85)" }
          : {};
        const bg: React.CSSProperties = item.bgStyle === "dark" ? { background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 8 }
          : item.bgStyle === "blur" ? { backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.25)", padding: "4px 10px", borderRadius: 8 }
          : {};
        const inner = item.animation === "wave"
          ? <span style={{ display: "inline-flex", gap: 0 }}>
              {String(item.text).split("").map((ch: string, ci: number) => (
                <span key={ci} style={{ display: "inline-block", animation: `txt-wave-letter 1s ease-in-out infinite`, animationDelay: `${ci * 0.08}s`, color: item.color, fontSize: item.fontSize, whiteSpace: ch === " " ? "pre" : undefined }}>{ch}</span>
              ))}
            </span>
          : <span style={{ color: item.color, fontSize: item.fontSize }}>{item.text}</span>;
        return (
          <div key={item.id} className={animCls}
            style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%,-50%)", zIndex: 9, pointerEvents: "none", fontFamily: "system-ui,sans-serif", lineHeight: 1.2, ...fs, ...bg }}>
            {inner}
          </div>
        );
      })}

      {/* ═══ LAYER 2: Vignette gradient ═══ */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 52%, rgba(0,0,0,0.75) 100%)" }}
      />

      {/* ═══ LAYER 2b: Neon SIGNAL LINE (top accent) ═══ */}
      <motion.div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 14, height: 2 }}
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <div className="w-full h-full"
          style={{ background: `linear-gradient(to right, transparent, ${accent}cc, ${accent}, ${accent}cc, transparent)`,
            boxShadow: `0 0 12px ${accent}88` }}
        />
      </motion.div>

      {/* ═══ LAYER 3: Video speed zones ═══ */}
      {isVideo && (
        <>
          <div className="absolute" style={{ left: 0, top: "25%", width: "48%", height: "50%", zIndex: 6, cursor: "pointer" }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("fast"); }}
            onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}
          />
          <div className="absolute" style={{ right: 0, top: "25%", width: "48%", height: "50%", zIndex: 6, cursor: "pointer" }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("slow"); }}
            onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}
          />
          <AnimatePresence>
            {holdMode && (
              <motion.div key={holdMode} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 50 }}>
                <div className="flex flex-col items-center gap-2 px-8 py-4 rounded-3xl"
                  style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(28px)",
                    border: `1px solid ${accent}25`, boxShadow: `0 0 40px ${accent}12` }}>
                  <span className="font-black text-white" style={{ fontSize: 36, letterSpacing: "-0.02em" }}>
                    {holdMode === "fast" ? "2.5×" : "0.35×"}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest" style={{ color: `${accent}aa` }}>
                    {holdMode === "fast" ? "◀◀ TEZKOR" : "▶▶ SEKIN"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ═══ LAYER 10: TOP UI — avatar (always) + subscribe (always) + tap overlay ═══ */}
      <div className="absolute top-0 left-0 right-0" style={{ zIndex: 18 }}>

        {/* ── Avatar — ALWAYS visible, top-left ── */}
        <div
          className="absolute left-3"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)", zIndex: 20 }}
        >
          <div
            className="relative cursor-pointer"
            style={{ width: 40, height: 40 }}
            onClick={(e) => { e.stopPropagation(); post.author?.id && navigate(`/profile/${post.author.id}`); }}
          >
            <div className="absolute inset-[-2px] rounded-full pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent}44)` }} />
            <div className="absolute inset-[2.5px] rounded-full overflow-hidden z-10 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
              {post.author?.avatarUrl
                ? <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-[11px] font-black text-white select-none">{initials(post.author?.displayName)}</span>
              }
            </div>
          </div>
        </div>

        {/* ── Subscribe — ALWAYS visible, top-right (only for other users' posts) ── */}
        {!isOwner && (
          <div
            className="absolute right-3"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)", zIndex: 20 }}
          >
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); setSubscribed(s => !s); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[11px] font-black"
              style={{
                background: subscribed ? `${accent}22` : "rgba(0,0,0,0.45)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: subscribed ? `1px solid ${accent}66` : "1px solid rgba(255,255,255,0.22)",
                color: subscribed ? accent : "rgba(255,255,255,0.92)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
            >
              {subscribed ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {subscribed ? "Obuna" : "+ Obuna"}
            </motion.button>
          </div>
        )}

        {/* ── Tap overlay: gradient bg + author name appears between avatar and subscribe ── */}
        <AnimatePresence>
          {overlayVisible && (
            <motion.div
              key="top-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{ zIndex: 19 }}
            >
              <div style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, transparent 100%)",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 4px)",
                paddingBottom: 14,
                paddingLeft: 60,
                paddingRight: !isOwner ? 110 : 16,
              }}>
                <div
                  className="flex flex-col justify-center cursor-pointer pointer-events-auto"
                  style={{ minHeight: 40 }}
                  onClick={(e) => { e.stopPropagation(); post.author?.id && navigate(`/profile/${post.author.id}`); }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-white font-black text-[13px] truncate"
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
                      {post.author?.displayName ?? "OlchaAI"}
                    </span>
                    {(post.author as any)?.isVerified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />}
                  </div>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.42)" }}>
                    @{post.author?.username ?? "user"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Back arrow — appears on tap, overlays the avatar ── */}
        <AnimatePresence>
          {overlayVisible && (
            <motion.button
              key="back-btn"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.18 }}
              whileTap={{ scale: 0.82 }}
              onClick={(e) => { e.stopPropagation(); window.history.back(); }}
              className="absolute left-3 flex items-center justify-center"
              style={{
                top: "calc(env(safe-area-inset-top, 0px) + 10px)",
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(0,0,0,0.62)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.16)",
                zIndex: 21,
              }}
              onPointerDown={e => e.stopPropagation()}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

      </div>

      {/* ═══ LAYER 20: RIGHT ORB COLUMN — tap to show ═══ */}
      <motion.div
        className="absolute right-3 flex flex-col items-center gap-3"
        style={{ zIndex: 20, top: "calc(env(safe-area-inset-top, 0px) + 70px)", pointerEvents: overlayVisible ? "auto" : "none" }}
        animate={{ opacity: overlayVisible ? 1 : 0, x: overlayVisible ? 0 : 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onPointerDown={e => { e.stopPropagation(); showOverlayBriefly(); }}
      >
        {/* Like */}
        <div className="relative">
          <Orb
            icon={<Heart className="w-[17px] h-[17px]"
              style={{ color: liked ? "#f87171" : "rgba(255,255,255,0.75)",
                fill: liked ? "#f87171" : "none", transition: "all 0.18s" }} />}
            count={likes} active={liked} activeColor="#f87171" inView={isInView}
            onClick={handleLike}
          />
          {/* Floating number on like */}
          <AnimatePresence>
            {likeFloat && (
              <motion.span key={likeFloat.key}
                initial={{ opacity: 1, y: 0, x: -8 }} animate={{ opacity: 0, y: -38 }}
                exit={{}} transition={{ duration: 0.75, ease: "easeOut" }}
                className="absolute text-[13px] font-black pointer-events-none select-none"
                style={{ color: "#f87171", bottom: "100%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                +1 ❤️
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Comment */}
        <Orb
          icon={<MessageCircle className="w-[17px] h-[17px]" style={{ color: commentOpen ? "#22d3ee" : "rgba(255,255,255,0.75)" }} />}
          count={post.commentsCount ?? 0} active={commentOpen} activeColor="#22d3ee" inView={isInView}
          onClick={() => { setCommentOpen(o => !o); setShareOpen(false); setMenuOpen(false); }}
        />

        {/* Share */}
        <Orb
          icon={<Share2 className="w-[17px] h-[17px]" style={{ color: shareOpen ? "#34d399" : copied ? "#34d399" : "rgba(255,255,255,0.75)" }} />}
          count={shares} active={shareOpen || copied} activeColor="#34d399" inView={isInView}
          onClick={() => { setShareOpen(o => !o); setCommentOpen(false); setMenuOpen(false); }}
        />

        {/* AI / Sparkles */}
        <Orb
          icon={<Sparkles className="w-[17px] h-[17px]" style={{ color: "rgba(192,132,252,0.85)" }} />}
          active={false} activeColor="#c084fc"
          onClick={() => {}}
        />

        {/* More/Delete */}
        <Orb
          icon={isOwner
            ? <Trash2 className="w-[17px] h-[17px]" style={{ color: "rgba(248,113,113,0.8)" }} />
            : <MoreHorizontal className="w-[17px] h-[17px]" style={{ color: "rgba(255,255,255,0.65)" }} />
          }
          active={menuOpen} activeColor={isOwner ? "#f87171" : "#818cf8"} inView={isInView}
          onClick={() => {
            if (isOwner) { setDeleteConfirm(true); }
            else { setMenuOpen(o => !o); setCommentOpen(false); setShareOpen(false); }
          }}
        />

        {/* Volume (video or audio) */}
        {(isVideo || hasAudio) && (
          <Orb
            icon={muted
              ? <VolumeX className="w-[16px] h-[16px]" style={{ color: "rgba(255,255,255,0.45)" }} />
              : <Volume2 className="w-[16px] h-[16px]" style={{ color: "rgba(255,255,255,0.85)" }} />
            }
            active={!muted} activeColor={accent} inView={isInView}
            onClick={() => setMuted(m => !m)}
          />
        )}
      </motion.div>

      {/* ═══ LAYER 18: CAPTION + MOOD + POLL + TAGS (bottom-left) ═══ */}
      <motion.div
        className="absolute left-4 right-16"
        style={{ zIndex: 16, bottom: commentOpen ? 290 : 108, transition: "bottom 0.3s cubic-bezier(0.16,1,0.3,1)" }}
        initial={{ opacity: 0, y: 10 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.28, duration: 0.45 }}
      >
        {/* Song name (download on tap) */}
        {audioName && audioUrl && (
          <a href={audioUrl} download={audioName}
            className="inline-flex items-center gap-1.5 mb-2 cursor-pointer"
            onClick={e => e.stopPropagation()}
            style={{ textDecoration: "none" }}>
            <span className="music-note-bounce text-white select-none" style={{ fontSize: 14, textShadow: `0 0 12px ${accent}` }}>♪</span>
            <span className="text-[12px] font-bold text-white truncate max-w-[160px]"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{audioName}</span>
            <Download className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
          </a>
        )}

        {/* Caption */}
        {post.content && !isText && (
          <p className="text-white text-[14px] font-semibold leading-snug mb-2"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95), 0 2px 14px rgba(0,0,0,0.85)" }}>
            {post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content}
          </p>
        )}

        {/* Mood */}
        {moodLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold mb-1.5"
            style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}>
            {moodLabel}
          </span>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.38)", color: `${accent}cc`,
                  border: `1px solid ${accent}22`, textShadow: "none" }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Poll */}
        {hasPoll && <PollWidget post={post as any} accent={accent} />}
      </motion.div>

      {/* ═══ LAYER 19: BOTTOM GRADIENT + WAVEFORM (no dark bar) ═══ */}
      {(hasAudio || isVideo) && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex justify-end px-4"
          style={{ zIndex: 17, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
          <Waveform active={isInView && !muted} color={accent} />
        </div>
      )}

      {/* ═══ PANEL: COMMENT ═══ */}
      <AnimatePresence>
        {commentOpen && (
          <motion.div
            key="comment"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden"
            style={{ zIndex: 40, background: "rgba(4,3,16,0.94)", backdropFilter: "blur(36px)",
              border: `1px solid ${accent}1a`, borderBottom: "none", boxShadow: `0 -8px 40px rgba(0,0,0,0.6)` }}
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full" style={{ background: `${accent}44` }} />
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: `${accent}15` }}>
              <MessageCircle className="w-4 h-4" style={{ color: accent }} />
              <span className="text-white font-bold text-[14px]">Izoh qoldirish</span>
              <button onClick={() => setCommentOpen(false)} className="ml-auto">
                <X className="w-4 h-4 text-white/45" />
              </button>
            </div>
            <div className="flex items-end gap-3 px-5 py-4">
              <textarea
                ref={commentRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.metaKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder={t("feed_card.comment_ph")}
                rows={3}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${accent}22`, caretColor: accent }}
              />
              <motion.button whileTap={{ scale: 0.85 }} onClick={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${accent}, #3b82f6)`,
                  boxShadow: `0 0 16px ${accent}44` }}>
                {sendingComment ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : commentSent ? <Check className="w-4 h-4 text-white" />
                  : <Send className="w-4 h-4 text-white" />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PANEL: SHARE ═══ */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div key="share"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden"
            style={{ zIndex: 42, maxHeight: "70vh", background: "rgba(4,3,16,0.94)", backdropFilter: "blur(36px)",
              border: `1px solid #34d39922`, borderBottom: "none", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3"><div className="w-9 h-1 rounded-full bg-white/15" /></div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-[14px]">{t("feed_card.share_title")}</span>
              <button onClick={() => setShareOpen(false)} className="ml-auto"><X className="w-4 h-4 text-white/45" /></button>
            </div>
            {/* Copy link */}
            <div className="px-5 py-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: linkCopied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${linkCopied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4 text-white/60" />}
                <span className="text-[13px]" style={{ color: linkCopied ? "#6ee7b7" : "rgba(255,255,255,0.7)" }}>
                  {linkCopied ? t("feed_card.copied") : t("feed_card.copy_link")}
                </span>
              </motion.button>
            </div>
            {/* Search users */}
            <div className="px-5 pb-2">
              <input value={shareQuery} onChange={e => setShareQuery(e.target.value)}
                placeholder={t("feed_card.user_search_ph")}
                className="w-full px-4 py-2.5 rounded-2xl text-white text-[13px] placeholder:text-white/30 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div className="px-5 pb-6 overflow-y-auto space-y-1" style={{ maxHeight: 200 }}>
              {shareResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed44,#ec489944)" }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">{initials(u.displayName)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-[13px] font-semibold truncate block">{u.displayName}</span>
                    <span className="text-white/40 text-[11px]">@{u.username}</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => handleSendToUser(u)} disabled={!!shareSending}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold"
                    style={{ background: shareSent === u.id ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.85)",
                      color: shareSent === u.id ? "#6ee7b7" : "#000" }}>
                    {shareSent === u.id ? "✓" : shareSending === u.id ? "…" : t("feed_card.send")}
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PANEL: OPTIONS MENU ═══ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div key="menu"
            initial={{ opacity: 0, scale: 0.92, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ type: "spring", damping: 24, stiffness: 360 }}
            className="absolute right-3 rounded-2xl overflow-hidden"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 58px)", zIndex: 41, minWidth: 186, background: "rgba(6,4,18,0.94)",
              backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Copy link — for everyone */}
            <button onClick={() => { handleCopyLink(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors">
              <Link className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-white text-[13px] font-medium">{linkCopied ? `✓ ${t("feed_card.copied")}` : t("feed_card.copy_link")}</span>
            </button>
            {/* Report — only for others' posts */}
            {!isOwner && (
              <button onClick={() => { setReported(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors border-t border-white/[0.06]">
                <Flag className="w-4 h-4 flex-shrink-0" style={{ color: reported ? "#6ee7b7" : "#fbbf24" }} />
                <span className="text-[13px] font-medium" style={{ color: reported ? "#6ee7b7" : "rgba(255,255,255,0.9)" }}>
                  {reported ? t("feed_card.report_sent") : t("feed_card.report")}
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PANEL: DELETE CONFIRM ═══ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div key="delete"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden"
            style={{ zIndex: 50, background: "rgba(14,4,4,0.96)", backdropFilter: "blur(36px)",
              border: "1px solid rgba(248,113,113,0.2)", borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(248,113,113,0.15)" }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3"><div className="w-9 h-1 rounded-full bg-red-500/30" /></div>
            <div className="flex flex-col items-center gap-2 px-6 py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
                style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)" }}>
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-white font-black text-[17px]">{t("feed_card.delete_confirm_title")}</p>
              <p className="text-white/45 text-[13px] text-center leading-snug">
                {t("feed_card.delete_confirm_desc")}
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-8">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[15px]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
                {t("feed_card.cancel")}
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3.5 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2"
                style={{ background: "rgba(239,68,68,0.82)", border: "1px solid rgba(248,113,113,0.45)",
                  boxShadow: "0 0 24px rgba(239,68,68,0.3)" }}>
                {deleting
                  ? <motion.div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                  : <><Trash2 className="w-4 h-4" /> {t("feed_card.delete")}</>
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for open panels */}
      {(commentOpen || shareOpen || menuOpen) && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}
          onClick={() => { setCommentOpen(false); setShareOpen(false); setMenuOpen(false); }} />
      )}
      {deleteConfirm && (
        <div className="absolute inset-0" style={{ zIndex: 49 }}
          onClick={() => setDeleteConfirm(false)} />
      )}

    </div>
  );
}
