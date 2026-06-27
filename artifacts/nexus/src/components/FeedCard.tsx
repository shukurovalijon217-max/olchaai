import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark,
  VolumeX, Volume2, BadgeCheck, Check, Send, X,
  ChevronsRight, ChevronsLeft, Eye, DollarSign,
  UserPlus, UserCheck, Search, Link, User,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Post } from "@workspace/api-client-react";
import { PostType, useLikePost } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

/* ─── Number formatter ─── */
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/* ─── Estimated earnings ─── */
const CPM = 2;
const MONO_THRESHOLD = 1_000_000;
function estimatedEarnings(views: number): string {
  const usd = (views / 1000) * CPM;
  if (usd >= 1000) return "$" + (usd / 1000).toFixed(1) + "K";
  return "$" + usd.toFixed(0);
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─────────────────────────────────────────────────
   FLOATING PARTICLES (text posts)
───────────────────────────────────────────────── */
function Particle({ accent }: { accent: string }) {
  const x = Math.random() * 100;
  const d = Math.random() * 4;
  const s = Math.random() * 3 + 1;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, bottom: -10, width: s, height: s, background: accent, opacity: 0.5 }}
      animate={{ y: [0, -(Math.random() * 360 + 140)], opacity: [0.5, 0] }}
      transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, delay: d, ease: "easeOut" }}
    />
  );
}

/* ─────────────────────────────────────────────────
   HOT TAKE WIDGET
───────────────────────────────────────────────── */
function HotTakeWidget({ post }: { post: any }) {
  const [fire, setFire] = useState(0);
  const [cold, setCold] = useState(0);
  const [userVote, setUserVote] = useState<"fire" | "cold" | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const { user } = useAuth();
  const total = fire + cold;

  useEffect(() => {
    if (fetched) return;
    setFetched(true);
    fetch(`${API_BASE}/api/posts/${post.id}/hot-take`, { credentials: "include" })
      .then(r => r.json())
      .then((d: { fire: number; cold: number; userVote: "fire" | "cold" | null }) => {
        setFire(d.fire ?? 0); setCold(d.cold ?? 0); setUserVote(d.userVote ?? null);
      })
      .catch(() => {});
  }, [post.id, fetched]);

  const vote = async (v: "fire" | "cold") => {
    if (userVote || loading || !user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/hot-take`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, vote: v }),
      });
      const d = await res.json() as { fire: number; cold: number };
      setFire(d.fire ?? 0); setCold(d.cold ?? 0); setUserVote(v);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const fireW = total > 0 ? Math.round((fire / total) * 100) : 50;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="px-3.5 pt-2.5 pb-1">
        <p className="text-white font-black text-[12px]">🔥 Hot Take — Ovoz bering!</p>
        <p className="text-white/35 text-[10px]">{total} ovoz</p>
      </div>
      <div className="mx-3 mb-2.5 rounded-xl overflow-hidden h-2 flex">
        <motion.div animate={{ width: `${fireW}%` }} transition={{ duration: 0.6 }}
          className="h-full" style={{ background: "linear-gradient(90deg,#f97316,#ef4444)" }} />
        <div className="flex-1 h-full" style={{ background: "linear-gradient(90deg,#38bdf8,#818cf8)" }} />
      </div>
      <div className="flex gap-2 px-3 pb-3">
        {[
          { v: "fire" as const, emoji: "🔥", label: "Issiq", count: fire, grad: "linear-gradient(135deg,#f97316,#ef4444)", active: "#f97316" },
          { v: "cold" as const, emoji: "❄️", label: "Sovuq", count: cold, grad: "linear-gradient(135deg,#38bdf8,#818cf8)", active: "#38bdf8" },
        ].map(btn => (
          <motion.button key={btn.v}
            disabled={!!userVote || loading}
            onClick={() => vote(btn.v)}
            whileTap={{ scale: 0.92 }}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl"
            style={{
              background: userVote === btn.v ? btn.grad : "rgba(255,255,255,0.08)",
              border: userVote === btn.v ? `1px solid ${btn.active}` : "1px solid rgba(255,255,255,0.12)",
              opacity: userVote && userVote !== btn.v ? 0.6 : 1,
            }}>
            <span className="text-base leading-none">{btn.emoji}</span>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[12px] font-black text-white">{btn.count}</span>
              <span className="text-[9px] text-white/50">{btn.label}</span>
            </div>
            {userVote === btn.v && <span className="text-[10px] text-white font-bold">✓</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   POLL WIDGET
───────────────────────────────────────────────── */
function PollWidget({ post, accent }: { post: any; accent: string }) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const [votes, setVotes] = useState<{ optionIndex: number; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const options: string[] = (() => {
    try { return JSON.parse(post.pollOptions ?? "[]"); } catch { return []; }
  })();
  const totalVotes = votes.reduce((s, v) => s + v.count, 0);

  useEffect(() => {
    if (fetched) return;
    setFetched(true);
    fetch(`${API_BASE}/api/posts/${post.id}/votes`, { credentials: "include" })
      .then(r => r.json())
      .then((d: { votes: typeof votes; userVote: number | null }) => {
        setVotes(d.votes ?? []); setUserVote(d.userVote ?? null);
      })
      .catch(() => {});
  }, [post.id, fetched]);

  const vote = async (optionIndex: number) => {
    if (userVote !== null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/vote`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: post.authorId, optionIndex }),
      });
      const d = await res.json() as { votes: typeof votes; userVote: number };
      setVotes(d.votes ?? []); setUserVote(d.userVote);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const getCount = (i: number) => votes.find(v => v.optionIndex === i)?.count ?? 0;
  const getPct = (i: number) => totalVotes > 0 ? Math.round((getCount(i) / totalVotes) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)" }}>
      <div className="px-3.5 pt-3 pb-1">
        <p className="text-white font-bold text-[13px] leading-snug">📊 {post.pollQuestion}</p>
        <p className="text-white/45 text-[10px] mt-0.5">{totalVotes} ovoz</p>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {options.map((opt, i) => {
          const voted = userVote !== null;
          const isChosen = userVote === i;
          const pct = voted ? getPct(i) : 0;
          return (
            <button key={i} disabled={voted || loading} onClick={() => vote(i)}
              className="w-full relative rounded-xl overflow-hidden text-left"
              style={{
                height: 38,
                background: voted ? isChosen ? `${accent}28` : "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
                border: voted && isChosen ? `1px solid ${accent}66` : "1px solid rgba(255,255,255,0.14)",
              }}>
              {voted && (
                <motion.div className="absolute inset-y-0 left-0 rounded-xl"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: isChosen ? `${accent}44` : "rgba(255,255,255,0.08)" }} />
              )}
              <div className="relative flex items-center justify-between px-3 h-full">
                <span className="text-white text-[12px] font-semibold truncate">
                  {isChosen && "✓ "}{opt}
                </span>
                {voted && <span className="text-white/70 text-[11px] font-bold flex-shrink-0 ml-2">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   RIGHT-SIDE ACTION BUTTON (TikTok / Instagram Reels style)
───────────────────────────────────────────────── */
interface ActionBtnProps {
  icon: React.ElementType;
  count: number;
  active?: boolean;
  activeColor?: string;
  fill?: boolean;
  glowColor?: string;
  onClick: () => void;
  label?: string;
}
function ActionBtn({ icon: Icon, count, active, activeColor = "#f87171", fill, glowColor, onClick, label }: ActionBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.82 }}
      className="flex flex-col items-center gap-1"
    >
      <motion.div
        animate={active ? { scale: [1, 1.28, 0.92, 1] } : {}}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="w-11 h-11 rounded-full flex items-center justify-center relative"
        style={{
          background: active
            ? `${activeColor}22`
            : "rgba(0,0,0,0.38)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: active
            ? `1.5px solid ${activeColor}66`
            : "1.5px solid rgba(255,255,255,0.16)",
          boxShadow: active
            ? `0 0 18px ${glowColor ?? activeColor}66, inset 0 1px 0 rgba(255,255,255,0.12)`
            : "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <Icon
          className="w-5 h-5"
          style={{ color: active ? activeColor : "rgba(255,255,255,0.88)" }}
          fill={fill ? activeColor : "none"}
          strokeWidth={fill ? 0 : 2}
        />
        {/* Inner glow ring when active */}
        {active && (
          <motion.span
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{ border: `1.5px solid ${activeColor}88` }}
          />
        )}
      </motion.div>
      <span
        className="text-[11px] font-black tabular-nums leading-none"
        style={{
          color: active ? activeColor : "rgba(255,255,255,0.75)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        {fmtNum(count)}
      </span>
      {label && (
        <span className="text-[8px] text-white/35 leading-none -mt-0.5">{label}</span>
      )}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────── */
interface FeedCardProps {
  post: Post & {
    commentPermission?: string;
    sharePermission?: string;
    displayFormat?: string;
  };
  index: number;
}

export default function FeedCard({ post }: FeedCardProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  /* ── Interaction state ── */
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likesCount ?? 0);
  const [saved, setSaved] = useState(false);
  const [saves, setSaves] = useState(0);
  const [shares, setShares] = useState(post.sharesCount ?? 0);
  const [muted, setMuted] = useState(true);
  const [subscribed, setSubscribed] = useState(false);

  /* ── Share panel ── */
  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [shareResults, setShareResults] = useState<any[]>([]);
  const [shareSending, setShareSending] = useState<number | null>(null);
  const [shareSent, setShareSent] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  /* ── Video speed hold ── */
  const [holdMode, setHoldMode] = useState<"fast" | "slow" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Caption expand ── */
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInView = useInView(cardRef, { amount: 0.55 });

  const likePost = useLikePost();

  const isVideo = post.type === PostType.video;
  const isPhoto = post.type === PostType.photo;
  const isText = post.type === PostType.text;

  /* ── Post accent color per type ── */
  const accent = isVideo ? "#f87171" : isPhoto ? "#22d3ee" : "#818cf8";
  const glow = isVideo ? "rgba(248,113,113,0.45)" : isPhoto ? "rgba(34,211,238,0.45)" : "rgba(129,140,248,0.4)";
  const bg = isVideo ? "#0f0808" : isPhoto ? "#060c14" : "#06060f";

  /* ── Album / multi-media carousel ── */
  const allMedia: string[] = (() => {
    const urls: string[] = (post as any).mediaUrls ?? [];
    if (urls.length > 1) return urls;
    return post.mediaUrl ? [post.mediaUrl] : [];
  })();
  const isAlbum = allMedia.length > 1;
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);

  const goSlide = (dir: 1 | -1) => {
    const next = slideIdx + dir;
    if (next < 0 || next >= allMedia.length) return;
    setSlideDir(dir);
    setSlideIdx(next);
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(url);
  const displayFormat = (post as any).displayFormat ?? "cover";
  const photoFit = displayFormat === "contain" ? "object-contain" : "object-cover";

  /* ── Auto-play video ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [isInView]);

  /* ── Background music for photo posts ── */
  useEffect(() => {
    const audioUrl = (post as any).audioUrl as string | undefined;
    if (!audioUrl || !isPhoto) return;
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.loop = true; a.volume = 0.65;
      audioRef.current = a;
    }
    audioRef.current.muted = muted;
    if (isInView) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
    return () => { audioRef.current?.pause(); };
  }, [isInView, isPhoto, muted, (post as any).audioUrl]);

  /* ── Close panels on scroll away ── */
  useEffect(() => {
    if (!isInView) { setCommentOpen(false); setShareOpen(false); }
  }, [isInView]);

  /* ── Focus comment textarea ── */
  useEffect(() => {
    if (commentOpen) setTimeout(() => commentRef.current?.focus(), 120);
  }, [commentOpen]);

  /* ── Video playback rate ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (holdMode === "fast") v.playbackRate = 2.5;
    else if (holdMode === "slow") v.playbackRate = 0.35;
    else v.playbackRate = 1;
  }, [holdMode]);

  /* ── Share panel user search ── */
  useEffect(() => {
    if (!shareOpen) return;
    if (!shareQuery.trim()) { setShareResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users?search=${encodeURIComponent(shareQuery)}&limit=12`, { credentials: "include" });
        if (res.ok) setShareResults(await res.json());
      } catch { /* ignore */ }
    }, 320);
    return () => clearTimeout(t);
  }, [shareQuery, shareOpen]);

  /* ── Send post to user via chat ── */
  const handleSendToUser = async (toUser: any) => {
    if (!user || shareSending) return;
    setShareSending(toUser.id);
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const content = `📤 *${post.author?.displayName ?? "OlCha"}* tomonidan post:\n${postUrl}`;
    try {
      const convRes = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ participantIds: [user.id, toUser.id] }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      await fetch(`${API_BASE}/api/conversations/${conv.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ senderId: user.id, content }),
      });
      setShareSent(toUser.id);
      setShares(s => s + 1);
      setTimeout(() => { setShareSent(null); setShareSending(null); setShareOpen(false); setShareQuery(""); setShareResults([]); }, 1600);
    } catch { setShareSending(null); }
  };

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); } catch { /* ignore */ }
    setLinkCopied(true);
    setShares(s => s + 1);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  /* ── Speed hold zones ── */
  const startHold = useCallback((side: "fast" | "slow") => {
    holdTimer.current = setTimeout(() => setHoldMode(side), 130);
  }, []);

  const endHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHoldMode(null);
  }, []);

  /* ── Like ── */
  const handleLike = () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    likePost.mutate({ id: post.id });
  };

  /* ── Comment submit ── */
  const handleSendComment = async () => {
    if (!commentText.trim() || !user || sendingComment) return;
    setSendingComment(true);
    try {
      await fetch(`${API_BASE}/api/posts/${post.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ content: commentText.trim(), authorId: user.id }),
      });
      setCommentText("");
      setCommentSent(true);
      setTimeout(() => { setCommentSent(false); setCommentOpen(false); }, 1400);
    } catch { /* ignore */ } finally { setSendingComment(false); }
  };

  /* ─────────────────────────────────────────── */
  return (
    <div
      ref={cardRef}
      className="relative w-full overflow-hidden flex-shrink-0 select-none"
      style={{ height: "100dvh", scrollSnapAlign: "start", backgroundColor: bg }}
    >

      {/* ══ BLUR BACKGROUND (photo) ══ */}
      {isPhoto && post.mediaUrl && (
        <img src={post.mediaUrl} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(28px) saturate(1.6) brightness(0.28)", transform: "scale(1.15)", zIndex: 0 }}
        />
      )}

      {/* ══ GRADIENT MESH (text posts) ══ */}
      {isText && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{
            zIndex: 0,
            background: `radial-gradient(ellipse at 25% 40%, ${glow} 0%, transparent 55%),
                         radial-gradient(ellipse at 75% 65%, rgba(59,130,246,0.16) 0%, transparent 55%)`,
          }}
        />
      )}
      {isText && Array.from({ length: 14 }).map((_, i) => <Particle key={i} accent={accent} />)}

      {/* ══ MAIN MEDIA ══ */}
      <motion.div
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        initial={{ scale: 1.06, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 1.06, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {isAlbum ? (
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence initial={false} custom={slideDir}>
              <motion.div
                key={slideIdx}
                custom={slideDir}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? "-38%" : "38%", opacity: 0 }),
                }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55) goSlide(1);
                  else if (info.offset.x > 55) goSlide(-1);
                }}
              >
                {isVideoUrl(allMedia[slideIdx]) ? (
                  <video src={allMedia[slideIdx]} muted={muted} loop playsInline autoPlay className="w-full h-full object-cover" />
                ) : (
                  <img src={allMedia[slideIdx]} alt={post.content} className={`w-full h-full ${photoFit}`} />
                )}
                <div className="absolute inset-0 -z-10">
                  <img src={allMedia[slideIdx]} alt="" aria-hidden className="w-full h-full object-cover"
                    style={{ filter: "blur(26px) saturate(1.5) brightness(0.3)", transform: "scale(1.15)" }} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Album nav arrows */}
            {slideIdx > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-start pl-1"
                onClick={() => goSlide(-1)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </div>
            )}
            {slideIdx < allMedia.length - 1 && (
              <div className="absolute right-14 top-0 bottom-0 w-12 z-10 flex items-center justify-end pr-1"
                onClick={() => goSlide(1)}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : isVideo && post.mediaUrl ? (
          <video ref={videoRef} src={post.mediaUrl} muted={muted} loop playsInline
            className="w-full h-full object-cover" />
        ) : isPhoto && post.mediaUrl ? (
          <img src={post.mediaUrl} alt={post.content} className={`w-full h-full ${photoFit}`} />
        ) : (
          /* Text post */
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
            <div className="max-w-[78%] text-center px-4">
              <p className="text-2xl md:text-[2.1rem] font-extrabold text-white leading-snug"
                style={{ textShadow: `0 0 50px ${glow}, 0 2px 8px rgba(0,0,0,0.8)` }}>
                {post.content}
              </p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {post.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: `${accent}22`, border: `1px solid ${accent}44`, color: accent }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ══ TEXT OVERLAYS (from MediaEditor) ══ */}
      {(() => {
        let overlays: any[] = [];
        try { overlays = JSON.parse((post as any).overlays || "[]"); } catch { overlays = []; }
        if (!overlays.length) return null;
        return overlays.map((item: any) => {
          const animCls = item.animation === "pulse" ? "txt-anim-pulse"
            : item.animation === "bounce" ? "txt-anim-bounce"
            : item.animation === "neon" ? "txt-anim-neon"
            : item.animation === "slide" ? "txt-anim-slide"
            : "";
          const fs: React.CSSProperties = item.fontStyle === "bold" ? { fontWeight: 900 }
            : item.fontStyle === "italic" ? { fontStyle: "italic" }
            : item.fontStyle === "shadow" ? { textShadow: "2px 3px 8px rgba(0,0,0,0.9)" }
            : item.fontStyle === "outline" ? { WebkitTextStroke: "1.5px rgba(0,0,0,0.85)" }
            : {};
          const bgSt: React.CSSProperties = item.bgStyle === "dark" ? { background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 8 }
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
              style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%,-50%)", zIndex: 9, pointerEvents: "none", fontFamily: "system-ui,sans-serif", lineHeight: 1.2, ...fs, ...bgSt }}>
              {inner}
            </div>
          );
        });
      })()}

      {/* ══ DEEP GRADIENT OVERLAYS ══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 18%, transparent 40%, rgba(0,0,0,0.65) 80%, rgba(0,0,0,0.88) 100%),
            linear-gradient(to right, transparent 68%, rgba(0,0,0,0.55) 100%)
          `,
        }}
      />

      {/* ══ VIDEO SPEED HOLD ZONES ══ */}
      {isVideo && (
        <>
          {/* Left zone (fast) — avoids right action buttons */}
          <div className="absolute" style={{ left: 0, top: "20%", width: "55%", height: "55%", zIndex: 6 }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("fast"); }}
            onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold} />
          {/* Right zone (slow) — center area only, not the action buttons column */}
          <div className="absolute" style={{ right: "17%", top: "20%", width: "28%", height: "55%", zIndex: 6 }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("slow"); }}
            onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold} />

          <AnimatePresence>
            {holdMode && (
              <motion.div
                key={holdMode}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 flex items-center pointer-events-none"
                style={{ zIndex: 25, justifyContent: holdMode === "fast" ? "flex-start" : "flex-end", paddingInline: "8%" }}
              >
                <div className="flex flex-col items-center gap-2"
                  style={{ filter: holdMode === "fast" ? "drop-shadow(0 0 18px #f87171)" : "drop-shadow(0 0 18px #60a5fa)" }}>
                  <div className="flex items-center">
                    {[0, 1, 2].map(i => (
                      holdMode === "fast" ? (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}>
                          <ChevronsRight className="w-8 h-8" style={{ color: "#f87171" }} />
                        </motion.div>
                      ) : (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2], x: [0, -5, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}>
                          <ChevronsLeft className="w-8 h-8" style={{ color: "#60a5fa" }} />
                        </motion.div>
                      )
                    ))}
                  </div>
                  <div className="px-3 py-1 rounded-xl text-sm font-black tracking-wide"
                    style={{
                      background: holdMode === "fast" ? "rgba(248,113,113,0.18)" : "rgba(96,165,250,0.18)",
                      border: `1px solid ${holdMode === "fast" ? "rgba(248,113,113,0.5)" : "rgba(96,165,250,0.5)"}`,
                      color: holdMode === "fast" ? "#fca5a5" : "#93c5fd",
                      backdropFilter: "blur(8px)",
                    }}>
                    {holdMode === "fast" ? "⚡ 2.5×" : "🐢 0.35×"}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ══ TOP-RIGHT: VOLUME BUTTON ══ */}
      {(isVideo || isPhoto) && (
        <motion.button
          className="absolute flex items-center justify-center"
          style={{
            top: 20, right: 16, zIndex: 20,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,0,0,0.42)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          }}
          onClick={() => setMuted(m => !m)}
          whileTap={{ scale: 0.88 }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 text-white/70" />
            : <Volume2 className="w-3.5 h-3.5" style={{ color: accent }} />
          }
        </motion.button>
      )}

      {/* ══ RIGHT SIDE — VERTICAL ACTION BUTTONS (TikTok/Reels style) ══ */}
      <motion.div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{
          bottom: commentOpen ? 230 : 120,
          zIndex: 15,
          transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)",
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Like */}
        <ActionBtn
          icon={Heart}
          count={likes}
          active={liked}
          activeColor="#f43f5e"
          fill={liked}
          glowColor="#f43f5e"
          onClick={handleLike}
          label="Layk"
        />

        {/* Comment */}
        <ActionBtn
          icon={MessageCircle}
          count={post.commentsCount ?? 0}
          activeColor="#22d3ee"
          onClick={() => { setCommentOpen(o => !o); setShareOpen(false); }}
          label="Izoh"
        />

        {/* Share */}
        <ActionBtn
          icon={Share2}
          count={shares}
          active={shareOpen}
          activeColor="#34d399"
          glowColor="#34d399"
          onClick={() => { setShareOpen(o => !o); setCommentOpen(false); }}
          label="Ulash"
        />

        {/* DM / Send */}
        <ActionBtn
          icon={Send}
          count={0}
          activeColor="#a78bfa"
          onClick={() => { /* opens send DM */ setShareOpen(o => !o); setCommentOpen(false); }}
          label="DM"
        />

        {/* Save / Bookmark */}
        <ActionBtn
          icon={Bookmark}
          count={saves}
          active={saved}
          activeColor="#fbbf24"
          fill={saved}
          glowColor="#fbbf24"
          onClick={() => { setSaved(s => { setSaves(n => s ? Math.max(0, n - 1) : n + 1); return !s; }); }}
          label="Saqlash"
        />
      </motion.div>

      {/* ══ BOTTOM-LEFT: USER INFO + CAPTION (Instagram Reels style) ══ */}
      <motion.div
        className="absolute left-0 right-16"
        style={{
          bottom: commentOpen ? 220 : 20,
          zIndex: 12,
          padding: "0 16px",
          transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* User info row */}
        <div className="flex items-center gap-2.5 mb-2">
          {/* Avatar */}
          <div className="relative flex-shrink-0 cursor-pointer"
            onClick={() => post.author?.id && navigate(`/profile/${post.author.id}`)}>
            {post.author?.avatarUrl ? (
              <img src={post.author.avatarUrl} alt=""
                className="w-10 h-10 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2.5px ${accent}cc, 0 0 16px ${glow}` }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                style={{
                  background: `linear-gradient(135deg,${accent}cc,rgba(0,0,0,0.6))`,
                  boxShadow: `0 0 0 2.5px ${accent}88, 0 0 16px ${glow}`,
                }}>
                {post.author?.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
          </div>

          {/* Name + verify + subscribe */}
          <div className="flex-1 min-w-0 cursor-pointer"
            onClick={() => post.author?.id && navigate(`/profile/${post.author.id}`)}>
            <div className="flex items-center gap-1">
              <span className="text-white font-black text-[14px] leading-none tracking-tight drop-shadow">
                {post.author?.displayName ?? "Foydalanuvchi"}
              </span>
              {post.author?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
            </div>
            <span className="text-white/50 text-[11px] leading-none mt-0.5 block">
              @{post.author?.username ?? "user"}
            </span>
          </div>

          {/* Subscribe pill */}
          <motion.button
            onClick={() => setSubscribed(s => !s)}
            whileTap={{ scale: 0.91 }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: subscribed ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              border: subscribed ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(255,255,255,0.24)",
              boxShadow: subscribed
                ? "0 0 14px rgba(248,113,113,0.3)"
                : "0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.14)",
            }}
          >
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.div key="check" className="flex items-center gap-1"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px] font-black text-rose-400">Obunada</span>
                </motion.div>
              ) : (
                <motion.div key="plus" className="flex items-center gap-1"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <UserPlus className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[11px] font-black text-white/90">Obuna</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mood badge */}
        {!!(post as any).mood && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: 16 }}>{(post as any).mood}</span>
          </div>
        )}

        {/* Caption */}
        {!isText && post.content && (
          <div>
            <p
              className={`text-white text-[13px] font-medium leading-relaxed ${captionExpanded ? "" : "line-clamp-2"}`}
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
              onClick={() => setCaptionExpanded(e => !e)}
            >
              {post.content}
            </p>
            {post.content.length > 80 && (
              <button
                onClick={() => setCaptionExpanded(e => !e)}
                className="text-[11px] font-bold mt-0.5"
                style={{ color: accent }}
              >
                {captionExpanded ? "Kamroq" : "Ko'proq"}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.filter(t => !t.startsWith("_")).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {post.tags.filter(t => !t.startsWith("_")).slice(0, 4).map(tag => (
              <span key={tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}1e`, border: `1px solid ${accent}44`, color: accent }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Poll Widget */}
        {!!(post as any).pollQuestion && (
          <div className="mt-2">
            <PollWidget post={post} accent={accent} />
          </div>
        )}

        {/* Hot Take Widget */}
        {!!(post as any).hotTake && (
          <div className="mt-2">
            <HotTakeWidget post={post} />
          </div>
        )}

        {/* Time Capsule */}
        {!!(post as any).scheduledAt && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl mt-2"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)" }}>
            <span className="text-sm">⏳</span>
            <div>
              <p className="text-[11px] font-bold text-cyan-300">Vaqt Kapsulasi</p>
              <p className="text-[10px] text-white/40">
                {new Date((post as any).scheduledAt).toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" })} da ochiladi
              </p>
            </div>
          </div>
        )}

        {/* Views + monetization row */}
        {!isText && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Eye className="w-3 h-3 text-white/50" />
              <span className="text-[10px] font-bold text-white/70 tabular-nums">
                {fmtNum((post as any).viewsCount ?? 0)} ko'rish
              </span>
            </div>
            {((post as any).viewsCount ?? 0) >= MONO_THRESHOLD && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.22),rgba(245,158,11,0.14))", border: "1px solid rgba(251,191,36,0.45)" }}>
                <DollarSign className="w-3 h-3 text-amber-300" />
                <span className="text-[10px] font-black text-amber-300">{estimatedEarnings((post as any).viewsCount ?? 0)}</span>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ MUSIC CHIP (bottom-left, above caption) ══ */}
      {!!(post as any).audioName && (
        <div className="absolute flex items-center gap-1.5"
          style={{
            left: 16,
            bottom: commentOpen ? 340 : 220,
            zIndex: 11,
            maxWidth: 200,
            transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)",
          }}>
          <span className="music-note-bounce flex-shrink-0 select-none"
            style={{ fontSize: 14, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,1), 0 0 16px rgba(168,85,247,0.9)" }}>♪</span>
          <div style={{ overflow: "hidden", maxWidth: 172 }}>
            <span className="music-text-scroll"
              style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, letterSpacing: "0.01em", color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.95), 0 0 22px rgba(168,85,247,0.5)" }}>
              {(post as any).audioName}
            </span>
          </div>
        </div>
      )}

      {/* ══ ALBUM DOTS ══ */}
      {isAlbum && (
        <motion.div
          className="absolute left-0 right-0 flex items-center justify-center gap-[7px]"
          style={{ bottom: commentOpen ? 230 : 12, zIndex: 12, transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)" }}
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.25 }}>
          {allMedia.map((_, i) => (
            <motion.button key={i}
              onClick={() => { setSlideDir(i > slideIdx ? 1 : -1); setSlideIdx(i); }}
              animate={{ opacity: i === slideIdx ? 1 : 0.32 }}
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{
                background: i === slideIdx ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
                boxShadow: i === slideIdx ? "0 0 6px rgba(255,255,255,0.4)" : "none",
                border: "1px solid rgba(255,255,255,0.18)",
              }} />
          ))}
        </motion.div>
      )}

      {/* ══ SHARE PANEL ══ */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl overflow-hidden"
            style={{
              zIndex: 40,
              background: "rgba(8,8,20,0.95)",
              backdropFilter: "blur(40px) saturate(2)",
              WebkitBackdropFilter: "blur(40px) saturate(2)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}>
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/25" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-white font-black text-[15px]">Kimga yuborish?</span>
              <motion.button onClick={() => { setShareOpen(false); setShareQuery(""); setShareResults([]); }}
                whileTap={{ scale: 0.88 }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
                <X className="w-3.5 h-3.5 text-white/80" />
              </motion.button>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input autoFocus value={shareQuery} onChange={e => setShareQuery(e.target.value)}
                  placeholder="Foydalanuvchi nomini kiriting…"
                  className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/35" />
                {shareQuery && <button onClick={() => { setShareQuery(""); setShareResults([]); }}><X className="w-3.5 h-3.5 text-white/40" /></button>}
              </div>
            </div>
            <div className="px-4 pb-2">
              <motion.button onClick={handleCopyLink} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl"
                style={{
                  background: linkCopied ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.06)",
                  border: linkCopied ? "1px solid rgba(52,211,153,0.40)" : "1px solid rgba(255,255,255,0.12)",
                }}>
                {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4 text-white/60" />}
                <span className="text-[13px] font-semibold" style={{ color: linkCopied ? "#34d399" : "rgba(255,255,255,0.75)" }}>
                  {linkCopied ? "Havola nusxalandi!" : "Havolani nusxalash"}
                </span>
              </motion.button>
            </div>
            {(shareResults.length > 0 || shareQuery.trim()) && (
              <div className="mx-4 mb-2 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            )}
            <div className="overflow-y-auto" style={{ maxHeight: "220px" }}>
              {shareQuery.trim() && shareResults.length === 0 && (
                <div className="flex items-center justify-center py-6 gap-2 text-white/35">
                  <User className="w-4 h-4" />
                  <span className="text-[12px]">Foydalanuvchi topilmadi</span>
                </div>
              )}
              {shareResults.filter(u => u.id !== user?.id).map((u, i) => {
                const sent = shareSent === u.id;
                const sending = shareSending === u.id;
                return (
                  <motion.button key={u.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.045 }}
                    onClick={() => handleSendToUser(u)} disabled={sending || sent}
                    className="flex items-center gap-3 w-full px-4 py-2.5"
                    style={{ background: sent ? "rgba(52,211,153,0.08)" : "transparent" }}
                    whileTap={{ scale: 0.98 }}>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.18)" }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 0 2px rgba(168,85,247,0.35)" }}>
                        {u.displayName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-[13px] font-bold truncate">{u.displayName}</p>
                      <p className="text-white/45 text-[11px] truncate">@{u.username}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {sent ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.40)" }}>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] font-bold text-emerald-400">Yuborildi</span>
                        </motion.div>
                      ) : sending ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70" />
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.40)" }}>
                          <Send className="w-3 h-3" style={{ color: "#a855f7" }} />
                          <span className="text-[11px] font-bold" style={{ color: "#a855f7" }}>Yuborish</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ COMMENT PANEL ══ */}
      <AnimatePresence>
        {commentOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl overflow-hidden"
            style={{
              zIndex: 40,
              background: "rgba(8,8,20,0.95)",
              backdropFilter: "blur(40px) saturate(2)",
              WebkitBackdropFilter: "blur(40px) saturate(2)",
              border: `1px solid rgba(255,255,255,0.12)`,
              borderBottom: "none",
              boxShadow: `0 -8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}>
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: `${accent}44` }} />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-xs font-bold text-white/70">💬 Izoh qoldiring</span>
              <button onClick={() => setCommentOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
            <div className="flex items-end gap-2.5 px-4 pb-6">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                  style={{ background: `linear-gradient(135deg,${accent},rgba(0,0,0,0.6))` }}>
                  {user?.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 relative">
                <textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Fikringizni yozing…"
                  rows={commentText.split("\n").length > 2 ? 3 : 1}
                  className="w-full resize-none rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: `1px solid ${accent}30`,
                    minHeight: 40, maxHeight: 80, overflow: "hidden",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{ boxShadow: commentText ? `0 0 0 1.5px ${accent}66, 0 0 12px ${glow}` : "0 0 0 0px transparent" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <motion.button
                onClick={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                style={{
                  background: commentText.trim() ? `linear-gradient(135deg,${accent},rgba(0,0,0,0.4))` : "rgba(255,255,255,0.07)",
                  border: `1px solid ${commentText.trim() ? accent + "88" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: commentText.trim() ? `0 0 14px ${glow}` : "none",
                }}
                whileTap={{ scale: 0.88 }}
                animate={{ scale: commentSent ? [1, 1.2, 1] : 1 }}>
                <AnimatePresence mode="wait">
                  {commentSent ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Send className="w-4 h-4" style={{ color: commentText.trim() ? "white" : "rgba(255,255,255,0.3)" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-outside to close panels */}
      {(commentOpen || shareOpen) && (
        <div className="absolute inset-0" style={{ zIndex: 20 }}
          onClick={() => { setCommentOpen(false); setShareOpen(false); }} />
      )}
    </div>
  );
}
