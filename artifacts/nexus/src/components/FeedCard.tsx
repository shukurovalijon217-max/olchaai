import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark,
  VolumeX, Volume2, BadgeCheck, Check, Send, X,
  ChevronsRight, ChevronsLeft, Eye, DollarSign,
  UserPlus, UserCheck, Search, Link, User,
} from "lucide-react";
import type { Post } from "@workspace/api-client-react";
import { PostType, useLikePost } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

/* ─────────────────────────────────────────────────
   THEMES
───────────────────────────────────────────────── */
const THEMES: Record<string, {
  bg: string; accent: string; glow: string; badge: string; labelColor: string;
}> = {
  [PostType.photo]: {
    bg: "#060c14", accent: "#22d3ee", glow: "rgba(34,211,238,0.45)",
    badge: "📷 Rasm", labelColor: "#67e8f9",
  },
  [PostType.video]: {
    bg: "#0f0808", accent: "#f87171", glow: "rgba(248,113,113,0.45)",
    badge: "🎬 Video", labelColor: "#fca5a5",
  },
  [PostType.text]: {
    bg: "#06060f", accent: "#818cf8", glow: "rgba(129,140,248,0.4)",
    badge: "✍️ Post", labelColor: "#a5b4fc",
  },
};
const getTheme = (type: string) => THEMES[type] ?? THEMES[PostType.text];

/* ─────────────────────────────────────────────────
   ENTRANCE ANIMATIONS
───────────────────────────────────────────────── */
type V = { initial: any; animate: any };
const ENTER: Record<string, V> = {
  [PostType.photo]: {
    initial: { scale: 1.06, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  },
  [PostType.video]: {
    initial: { y: 70, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  },
  [PostType.text]: {
    initial: { rotateX: -18, opacity: 0, y: 30 },
    animate: { rotateX: 0, opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  },
};

/* ─────────────────────────────────────────────────
   FLOATING PARTICLES (text)
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
   PERMISSION LABEL MAP
───────────────────────────────────────────────── */
const PERM_LABEL: Record<string, string> = {
  everyone: "Hamma",
  followers: "Obunachilarga",
  none: "O'chirilgan",
};

/* ── Number formatter ── */
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/* ── Monetization: $2 CPM (YouTube starter estimate) ── */
const CPM = 2;
const MONO_THRESHOLD = 1_000_000;
function estimatedEarnings(views: number): string {
  const usd = (views / 1000) * CPM;
  if (usd >= 1000) return "$" + (usd / 1000).toFixed(1) + "K";
  return "$" + usd.toFixed(0);
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─────────────────────────────────────────────────
   POLL WIDGET
───────────────────────────────────────────────── */
function PollWidget({ post, theme }: { post: any; theme: any }) {
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
        setVotes(d.votes ?? []);
        setUserVote(d.userVote ?? null);
      })
      .catch(() => {});
  }, [post.id, fetched]);

  const vote = async (optionIndex: number) => {
    if (userVote !== null || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: post.authorId, optionIndex }),
      });
      const d = await res.json() as { votes: typeof votes; userVote: number };
      setVotes(d.votes ?? []);
      setUserVote(d.userVote);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const getCount = (i: number) => votes.find(v => v.optionIndex === i)?.count ?? 0;
  const getPct   = (i: number) => totalVotes > 0 ? Math.round((getCount(i) / totalVotes) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)" }}>
      <div className="px-3.5 pt-3 pb-1">
        <p className="text-white font-bold text-[13px] leading-snug" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
          📊 {post.pollQuestion}
        </p>
        <p className="text-white/45 text-[10px] mt-0.5">{totalVotes} ovoz</p>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {options.map((opt, i) => {
          const voted = userVote !== null;
          const isChosen = userVote === i;
          const pct = voted ? getPct(i) : 0;
          return (
            <button
              key={i}
              disabled={voted || loading}
              onClick={() => vote(i)}
              className="w-full relative rounded-xl overflow-hidden text-left transition-all"
              style={{
                height: 38,
                background: voted
                  ? isChosen ? `${theme.accent}28` : "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.10)",
                border: voted && isChosen ? `1px solid ${theme.accent}66` : "1px solid rgba(255,255,255,0.14)",
              }}
            >
              {/* Progress bar fill */}
              {voted && (
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: isChosen ? `${theme.accent}44` : "rgba(255,255,255,0.08)" }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 h-full">
                <span className="text-white text-[12px] font-semibold truncate" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                  {isChosen && "✓ "}{opt}
                </span>
                {voted && (
                  <span className="text-white/70 text-[11px] font-bold flex-shrink-0 ml-2">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
  const theme  = getTheme(post.type);
  const enterV = ENTER[post.type] ?? ENTER[PostType.text];
  const { user } = useAuth();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  const [liked, setLiked]     = useState(post.isLiked ?? false);
  const [likes, setLikes]     = useState(post.likesCount ?? 0);
  const [saved, setSaved]     = useState(false);
  const [saves, setSaves]     = useState(0);
  const [shares, setShares]   = useState(post.sharesCount ?? 0);
  const [muted, setMuted]         = useState(true);
  const [copied, setCopied]       = useState(false);
  const [subscribed, setSubscribed]       = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const subscribeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Share panel ── */
  const [shareOpen, setShareOpen]       = useState(false);
  const [shareQuery, setShareQuery]     = useState("");
  const [shareResults, setShareResults] = useState<any[]>([]);
  const [shareSending, setShareSending] = useState<number | null>(null);
  const [shareSent, setShareSent]       = useState<number | null>(null);
  const [linkCopied, setLinkCopied]     = useState(false);

  /* ── Video speed hold ── */
  const [holdMode, setHoldMode] = useState<"fast" | "slow" | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRef    = useRef<HTMLDivElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const isInView   = useInView(cardRef, { amount: 0.55 });

  const likePost = useLikePost();

  const isVideo = post.type === PostType.video;
  const isPhoto = post.type === PostType.photo;
  const isText  = post.type === PostType.text;

  /* auto-play video */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [isInView]);

  /* close panel on scroll */
  useEffect(() => {
    if (!isInView) { setActionsOpen(false); setCommentOpen(false); }
  }, [isInView]);

  /* focus comment input when opened */
  useEffect(() => {
    if (commentOpen) setTimeout(() => commentRef.current?.focus(), 120);
  }, [commentOpen]);

  /* sync video playbackRate with holdMode */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (holdMode === "fast")  v.playbackRate = 2.5;
    else if (holdMode === "slow") v.playbackRate = 0.35;
    else v.playbackRate = 1;
  }, [holdMode]);

  /* share panel — debounced user search */
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

  /* send post link to a specific user via chat */
  const handleSendToUser = async (toUser: any) => {
    if (!user || shareSending) return;
    setShareSending(toUser.id);
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const content = `📤 *${post.author?.displayName ?? "OlCha"}* tomonidan post:\n${postUrl}`;
    try {
      const convRes = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantIds: [user.id, toUser.id] }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json();
      await fetch(`${API_BASE}/api/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senderId: user.id, content }),
      });
      setShareSent(toUser.id);
      setShares(s => s + 1);
      setTimeout(() => {
        setShareSent(null);
        setShareSending(null);
        setShareOpen(false);
        setShareQuery("");
        setShareResults([]);
      }, 1600);
    } catch {
      setShareSending(null);
    }
  };

  /* copy link fallback */
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setLinkCopied(true);
    setShares(s => s + 1);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  /* show subscribe pill briefly then auto-hide */
  const showSubscribeBriefly = useCallback(() => {
    setShowSubscribe(true);
    if (subscribeTimer.current) clearTimeout(subscribeTimer.current);
    subscribeTimer.current = setTimeout(() => setShowSubscribe(false), 2800);
  }, []);

  /* hold zone handlers — only activate after 130 ms press */
  const startHold = useCallback((side: "fast" | "slow") => {
    holdTimer.current = setTimeout(() => setHoldMode(side), 130);
  }, []);

  const endHold = useCallback(() => {
    const wasQuickTap = holdTimer.current !== null; // timer still pending = user released before 130 ms
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHoldMode(null);
    if (wasQuickTap) showSubscribeBriefly();
  }, [showSubscribeBriefly]);

  const handleLike = () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    likePost.mutate({ id: post.id });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setShares(s => s + 1);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !user || sendingComment) return;
    setSendingComment(true);
    try {
      await fetch(`${API_BASE}/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentText.trim(), authorId: user.id }),
      });
      setCommentText("");
      setCommentSent(true);
      setTimeout(() => { setCommentSent(false); setCommentOpen(false); }, 1400);
    } catch { /* ignore */ } finally {
      setSendingComment(false);
    }
  };

  const ACTIONS = [
    { id: "like",    Icon: Heart,          label: "Layk",    count: likes,                   active: liked,      activeColor: "#f87171", fill: liked,  fn: handleLike },
    { id: "comment", Icon: MessageCircle,  label: "Izoh",    count: post.commentsCount ?? 0, active: false,      activeColor: "#22d3ee", fill: false, fn: () => { setActionsOpen(false); setCommentOpen(o => !o); setShareOpen(false); } },
    { id: "share",   Icon: Share2,         label: "Ulash",   count: shares,                  active: shareOpen,  activeColor: "#34d399", fill: false, fn: () => { setShareOpen(o => !o); setCommentOpen(false); setActionsOpen(false); } },
    { id: "save",    Icon: Bookmark,       label: "Saqlash", count: saves,                   active: saved,      activeColor: "#fbbf24", fill: saved,  fn: () => { setSaved(s => { setSaves(n => s ? Math.max(0,n-1) : n+1); return !s; }); } },
  ];

  /* For photo — display format determines object-fit behaviour */
  const displayFormat = (post as any).displayFormat ?? "cover";
  const photoFit = displayFormat === "contain" ? "object-contain" : "object-cover";

  /* ── Album / multi-media carousel ── */
  const allMedia: string[] = (() => {
    const urls: string[] = (post as any).mediaUrls ?? [];
    if (urls.length > 1) return urls;
    return post.mediaUrl ? [post.mediaUrl] : [];
  })();
  const isAlbum = allMedia.length > 1;
  const [slideIdx, setSlideIdx]   = useState(0);
  const [slideDir, setSlideDir]   = useState(1); // 1 = forward, -1 = back

  const goSlide = (dir: 1 | -1) => {
    const next = slideIdx + dir;
    if (next < 0 || next >= allMedia.length) return;
    setSlideDir(dir);
    setSlideIdx(next);
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(url);

  return (
    <div
      ref={cardRef}
      className="relative w-full overflow-hidden flex-shrink-0 select-none"
      style={{ height: "100dvh", scrollSnapAlign: "start", backgroundColor: theme.bg }}
    >

      {/* ══ LAYER 1 — TYPE-SPECIFIC BACKGROUND ══ */}

      {/* PHOTO blur bg */}
      {isPhoto && post.mediaUrl && (
        <img
          src={post.mediaUrl} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(26px) saturate(1.5) brightness(0.3)", transform: "scale(1.15)" }}
        />
      )}

      {/* TEXT gradient mesh */}
      {isText && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{
              background: `radial-gradient(ellipse at 25% 40%, ${theme.glow} 0%, transparent 55%),
                           radial-gradient(ellipse at 75% 65%, rgba(59,130,246,0.16) 0%, transparent 55%)`,
            }}
          />
          {Array.from({ length: 14 }).map((_, i) => <Particle key={i} accent={theme.accent} />)}
        </>
      )}


      {/* ══ LAYER 2 — MAIN CONTENT ══ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 2 }}
        initial={enterV.initial}
        animate={isInView ? enterV.animate : enterV.initial}
      >
        {isAlbum ? (
          /* ── ALBUM CAROUSEL ── */
          <div className="absolute inset-0 overflow-hidden" style={{ perspective: "1200px" }}>
            <AnimatePresence initial={false} custom={slideDir}>
              <motion.div
                key={slideIdx}
                custom={slideDir}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", scale: 0.88, rotateY: d > 0 ? 18 : -18, opacity: 0 }),
                  center: { x: 0, scale: 1, rotateY: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? "-38%" : "38%", scale: 0.82, rotateY: d > 0 ? -12 : 12, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55) goSlide(1);
                  else if (info.offset.x > 55) goSlide(-1);
                }}
                onClick={showSubscribeBriefly}
              >
                {isVideoUrl(allMedia[slideIdx]) ? (
                  <video
                    src={allMedia[slideIdx]}
                    muted={muted} loop playsInline autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={allMedia[slideIdx]}
                    alt={post.content}
                    className={`w-full h-full ${photoFit}`}
                  />
                )}
                {/* Blur BG for photo */}
                <div className="absolute inset-0 -z-10">
                  <img src={allMedia[slideIdx]} alt="" aria-hidden
                    className="w-full h-full object-cover"
                    style={{ filter: "blur(26px) saturate(1.5) brightness(0.3)", transform: "scale(1.15)" }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Swipe zone left */}
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
            {/* Swipe zone right */}
            {slideIdx < allMedia.length - 1 && (
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-end pr-1"
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
          /* Video — full cover */
          <video
            ref={videoRef} src={post.mediaUrl}
            muted={muted} loop playsInline
            className="w-full h-full object-cover"
          />
        ) : isPhoto && post.mediaUrl ? (
          /* Photo — fills screen completely per displayFormat */
          <img
            src={post.mediaUrl} alt={post.content}
            className={`w-full h-full ${photoFit} cursor-pointer`}
            onClick={showSubscribeBriefly}
          />
        ) : (
          /* Text post */
          <div className="max-w-[78%] text-center px-4" style={{ perspective: "800px" }}>
            <p
              className="text-2xl md:text-[2.1rem] font-extrabold text-white leading-snug"
              style={{ textShadow: `0 0 50px ${theme.glow}, 0 2px 8px rgba(0,0,0,0.8)` }}
            >
              {post.content}
            </p>
            {post.tags && post.tags.length > 0 && (
              <motion.div
                className="flex flex-wrap justify-center gap-1.5 mt-4"
                initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.4 }}
              >
                {post.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}44`, color: theme.labelColor }}>
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ LAYER 3 — GRADIENT OVERLAYS ══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 22%, transparent 55%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      {/* ══ LAYER 3.2 — TEXT OVERLAYS (from MediaEditor) ══ */}
      {(() => {
        let overlays: any[] = [];
        try { overlays = JSON.parse((post as any).overlays || "[]"); } catch { overlays = []; }
        if (!overlays.length) return null;
        return overlays.map((item: any) => {
          const animCls = item.animation === "pulse"  ? "txt-anim-pulse"
            : item.animation === "bounce" ? "txt-anim-bounce"
            : item.animation === "neon"   ? "txt-anim-neon"
            : item.animation === "slide"  ? "txt-anim-slide"
            : "";
          const fs: React.CSSProperties = item.fontStyle === "bold"   ? { fontWeight: 900 }
            : item.fontStyle === "italic"  ? { fontStyle: "italic" }
            : item.fontStyle === "shadow"  ? { textShadow: "2px 3px 8px rgba(0,0,0,0.9)" }
            : item.fontStyle === "outline" ? { WebkitTextStroke: "1.5px rgba(0,0,0,0.85)" }
            : {};
          const bg: React.CSSProperties = item.bgStyle === "dark" ? { background:"rgba(0,0,0,0.5)", padding:"4px 10px", borderRadius:8 }
            : item.bgStyle === "blur" ? { backdropFilter:"blur(12px)", background:"rgba(0,0,0,0.25)", padding:"4px 10px", borderRadius:8 }
            : {};
          const inner = item.animation === "wave"
            ? <span style={{ display:"inline-flex", gap:0 }}>
                {String(item.text).split("").map((ch: string, ci: number) => (
                  <span key={ci} style={{ display:"inline-block", animation:`txt-wave-letter 1s ease-in-out infinite`, animationDelay:`${ci*0.08}s`, color:item.color, fontSize:item.fontSize, whiteSpace:ch===" "?"pre":undefined }}>{ch}</span>
                ))}
              </span>
            : <span style={{ color:item.color, fontSize:item.fontSize }}>{item.text}</span>;
          return (
            <div key={item.id} className={animCls} style={{ position:"absolute", left:`${item.x}%`, top:`${item.y}%`, transform:"translate(-50%,-50%)", zIndex:9, pointerEvents:"none", fontFamily:"system-ui,sans-serif", lineHeight:1.2, ...fs, ...bg }}>
              {inner}
            </div>
          );
        });
      })()}

      {/* ══ LAYER 3.5 — VIDEO SPEED HOLD ZONES (video only) ══ */}
      {isVideo && (
        <>
          {/* LEFT ZONE → fast (2.5x) */}
          <div
            className="absolute"
            style={{ left: 0, top: "25%", width: "48%", height: "50%", zIndex: 6, cursor: "pointer" }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("fast"); }}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onPointerLeave={endHold}
          />
          {/* RIGHT ZONE → slow (0.35x) */}
          <div
            className="absolute"
            style={{ right: 0, top: "25%", width: "48%", height: "50%", zIndex: 6, cursor: "pointer" }}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startHold("slow"); }}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onPointerLeave={endHold}
          />

          {/* SPEED INDICATOR OVERLAY */}
          <AnimatePresence>
            {holdMode && (
              <motion.div
                key={holdMode}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex items-center pointer-events-none"
                style={{
                  zIndex: 25,
                  justifyContent: holdMode === "fast" ? "flex-start" : "flex-end",
                  paddingInline: "10%",
                }}
              >
                <div
                  className="flex flex-col items-center gap-2"
                  style={{ filter: holdMode === "fast" ? "drop-shadow(0 0 18px #f87171)" : "drop-shadow(0 0 18px #60a5fa)" }}
                >
                  {/* Animated chevrons */}
                  <div className="flex items-center">
                    {[0, 1, 2].map(i => (
                      holdMode === "fast" ? (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}
                        >
                          <ChevronsRight className="w-8 h-8" style={{ color: "#f87171" }} />
                        </motion.div>
                      ) : (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2], x: [0, -5, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}
                        >
                          <ChevronsLeft className="w-8 h-8" style={{ color: "#60a5fa" }} />
                        </motion.div>
                      )
                    ))}
                  </div>
                  {/* Speed label */}
                  <div
                    className="px-3 py-1 rounded-xl text-sm font-black tracking-wide"
                    style={{
                      background: holdMode === "fast" ? "rgba(248,113,113,0.18)" : "rgba(96,165,250,0.18)",
                      border: `1px solid ${holdMode === "fast" ? "rgba(248,113,113,0.5)" : "rgba(96,165,250,0.5)"}`,
                      color: holdMode === "fast" ? "#fca5a5" : "#93c5fd",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {holdMode === "fast" ? "⚡ 2.5×" : "🐢 0.35×"}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ══ LAYER 4 — USER INFO (top-left) ══ */}
      <motion.div
        className="absolute left-4 flex items-center gap-2.5"
        style={{ top: 22, zIndex: 10 }}
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative flex-shrink-0">
          {post.author?.avatarUrl ? (
            <img src={post.author.avatarUrl} alt=""
              className="w-9 h-9 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px ${theme.accent}99, 0 0 14px ${theme.glow}` }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
              style={{ background: `linear-gradient(135deg,${theme.accent}cc,${theme.bg})`, boxShadow: `0 0 0 2px ${theme.accent}88,0 0 14px ${theme.glow}` }}>
              {post.author?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-[13px] drop-shadow leading-none">
              {post.author?.displayName ?? "Foydalanuvchi"}
            </span>
            {post.author?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
          </div>
          <span className="text-white/55 text-[11px] leading-none mt-0.5 block">@{post.author?.username ?? "user"}</span>
        </div>
      </motion.div>

      {/* Content-type badge */}
      <motion.div
        className="absolute left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
        style={{ top: 74, zIndex: 10, background: `${theme.accent}18`, border: `1px solid ${theme.accent}38`, color: theme.labelColor }}
        initial={{ opacity: 0, y: -6 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        transition={{ delay: 0.28 }}
      >
        {theme.badge}
      </motion.div>

      {/* ══ SUBSCRIBE PILL — video & photo, top-center, only on tap ══ */}
      {(isVideo || isPhoto) && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 22, zIndex: 20 }}
          initial={{ opacity: 0, scale: 0.85, y: -6 }}
          animate={showSubscribe ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.button
            onClick={() => setSubscribed(s => !s)}
            whileTap={{ scale: 0.91 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: subscribed
                ? "rgba(248,113,113,0.18)"
                : "rgba(255,255,255,0.11)",
              backdropFilter: "blur(24px) saturate(1.8)",
              WebkitBackdropFilter: "blur(24px) saturate(1.8)",
              border: subscribed
                ? "1px solid rgba(248,113,113,0.50)"
                : "1px solid rgba(255,255,255,0.22)",
              boxShadow: subscribed
                ? "0 0 14px rgba(248,113,113,0.25), inset 0 1px 0 rgba(255,255,255,0.12)"
                : "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)",
            }}
          >
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.div key="check" className="flex items-center gap-1.5"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <UserCheck className="w-3.5 h-3.5" style={{ color: "#fca5a5" }} />
                  <span className="text-[11px] font-black tracking-wide" style={{ color: "#fca5a5" }}>
                    Obunada
                  </span>
                </motion.div>
              ) : (
                <motion.div key="plus" className="flex items-center gap-1.5"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <UserPlus className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[11px] font-black tracking-wide text-white/90">
                    Obuna
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      )}

      {/* ══ LAYER 5 — ACTION ORB + PANEL (top-right) ══ */}
      <div className="absolute right-4" style={{ top: 20, zIndex: 30 }}>

        {/* THE ORB — true glassmorphism, slightly smaller */}
        <motion.button
          onClick={() => { setActionsOpen(o => !o); setCommentOpen(false); }}
          aria-label="Amallar"
          className="relative w-8 h-8 rounded-full flex items-center justify-center focus:outline-none"
          style={{
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(20px) saturate(1.8)",
            WebkitBackdropFilter: "blur(20px) saturate(1.8)",
            border: `1px solid rgba(255,255,255,0.28)`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.20), 0 0 14px ${theme.glow}`,
          }}
          whileTap={{ scale: 0.86 }}
        >
          {/* subtle pulse ring */}
          {!actionsOpen && (
            <motion.span className="absolute inset-0 rounded-full"
              style={{ border: `1px solid ${theme.accent}88` }}
              animate={{ scale: [1, 1.65], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
          )}

          <div className="flex flex-col items-center gap-[3px]">
            <motion.span className="w-[11px] h-[1.5px] rounded-full bg-white/90 block"
              animate={{ rotate: actionsOpen ? 45 : 0, y: actionsOpen ? 4.5 : 0 }}
              transition={{ duration: 0.22 }} />
            <motion.span className="w-[11px] h-[1.5px] rounded-full bg-white/90 block"
              animate={{ opacity: actionsOpen ? 0 : 1, scaleX: actionsOpen ? 0 : 1 }}
              transition={{ duration: 0.18 }} />
            <motion.span className="w-[11px] h-[1.5px] rounded-full bg-white/90 block"
              animate={{ rotate: actionsOpen ? -45 : 0, y: actionsOpen ? -4.5 : 0 }}
              transition={{ duration: 0.22 }} />
          </div>
        </motion.button>

        {/* SLIDE-DOWN PANEL — glassmorphism */}
        <AnimatePresence>
          {actionsOpen && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.45, y: -10 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.45, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-2.5 w-[158px] rounded-2xl overflow-hidden flex flex-col gap-0.5 p-1.5"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(32px) saturate(2) brightness(1.1)",
                WebkitBackdropFilter: "blur(32px) saturate(2) brightness(1.1)",
                border: `1px solid rgba(255,255,255,0.18)`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 20px ${theme.glow}`,
                transformOrigin: "top right",
              }}
            >
              <div className="h-[1px] rounded-full mx-2 mb-0.5"
                style={{ background: `linear-gradient(90deg,transparent,${theme.accent}99,transparent)` }} />

              {ACTIONS.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => { action.fn(); if (action.id !== "share" && action.id !== "comment") setActionsOpen(false); }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl w-full"
                  style={{
                    background: action.active ? `${action.activeColor}20` : "rgba(255,255,255,0.04)",
                    border: action.active ? `1px solid ${action.activeColor}44` : "1px solid transparent",
                  }}
                  whileTap={{ scale: 0.93 }}
                >
                  {/* Icon + label */}
                  <div className="flex items-center gap-2">
                    <action.Icon className="w-4 h-4 flex-shrink-0"
                      style={{ color: action.active ? action.activeColor : "rgba(255,255,255,0.85)" }}
                      fill={action.fill ? action.activeColor : "none"} />
                    <span className="text-[11px] font-semibold"
                      style={{ color: action.active ? action.activeColor : "rgba(255,255,255,0.85)" }}>
                      {action.label}
                    </span>
                  </div>
                  {/* Count — fixed width so layout never shifts */}
                  <span
                    className="text-xs font-black tabular-nums text-right"
                    style={{
                      color: action.active ? action.activeColor : "rgba(255,255,255,0.55)",
                      minWidth: "2.6rem",
                    }}
                  >
                    {fmtNum(action.count)}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ LAYER 6 — BOTTOM-LEFT CONTROLS (volume + views + monetization) ══ */}
      <motion.div
        className="absolute left-4 flex items-center gap-2"
        style={{ bottom: 28, zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.38 }}
      >
        {/* Volume toggle (video only) */}
        {isVideo && (
          <motion.button
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.42)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${theme.accent}44`,
              boxShadow: `0 0 10px ${theme.glow}`,
            }}
            onClick={() => setMuted(m => !m)}
            whileTap={{ scale: 0.88 }}
          >
            {muted
              ? <VolumeX className="w-4 h-4 text-white" />
              : <Volume2 className="w-4 h-4" style={{ color: theme.accent }} />
            }
          </motion.button>
        )}

        {/* Views counter (photo + video) */}
        {!isText && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.38)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Eye className="w-3 h-3 text-white/60" />
            <span className="text-[11px] font-bold text-white/80 tabular-nums">
              {fmtNum((post as any).viewsCount ?? 0)}
            </span>
          </div>
        )}

        {/* Monetization badge — shown when views ≥ 1M */}
        {!isText && ((post as any).viewsCount ?? 0) >= MONO_THRESHOLD && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.6 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg,rgba(251,191,36,0.22),rgba(245,158,11,0.14))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(251,191,36,0.45)",
              boxShadow: "0 0 12px rgba(251,191,36,0.25)",
            }}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <DollarSign className="w-3 h-3 text-amber-300" />
            </motion.div>
            <span className="text-[10px] font-black text-amber-300 tabular-nums">
              {estimatedEarnings((post as any).viewsCount ?? 0)}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ══ ALBUM DOTS — glass dots, no counter, equal size ══ */}
      {isAlbum && (
        <motion.div
          className="absolute left-0 right-0 flex items-center justify-center gap-[7px]"
          style={{ bottom: commentOpen ? 220 : 60, zIndex: 12 }}
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.25 }}
        >
          {allMedia.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => { setSlideDir(i > slideIdx ? 1 : -1); setSlideIdx(i); }}
              animate={{ opacity: i === slideIdx ? 1 : 0.32 }}
              transition={{ duration: 0.22 }}
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{
                background: i === slideIdx
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,0.28)",
                backdropFilter: "blur(6px)",
                boxShadow: i === slideIdx
                  ? "0 0 6px rgba(255,255,255,0.4), inset 0 0 3px rgba(255,255,255,0.15)"
                  : "inset 0 0 2px rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* ══ LAYER 6.5 — MUSIC (transparent, letters only) ══ */}
      {!isText && !!(post as any).audioName && (
        <div
          className="absolute flex items-center gap-1.5"
          style={{
            left: 16,
            bottom: commentOpen ? 270 : 120,
            zIndex: 11,
            maxWidth: 200,
            transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Bouncing note */}
          <span
            className="music-note-bounce flex-shrink-0 select-none"
            style={{
              fontSize: 14,
              color: "#fff",
              textShadow: "0 1px 8px rgba(0,0,0,1), 0 0 16px rgba(168,85,247,0.9)",
            }}
          >♪</span>

          {/* Scrolling song name — clips cleanly */}
          <div style={{ overflow: "hidden", maxWidth: 172 }}>
            <span
              className="music-text-scroll"
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.01em",
                color: "#fff",
                textShadow:
                  "0 1px 6px rgba(0,0,0,0.95), 0 2px 14px rgba(0,0,0,0.85), 0 0 22px rgba(168,85,247,0.5)",
              }}
            >
              {(post as any).audioName}
            </span>
          </div>
        </div>
      )}

      {/* ══ LAYER 7 — CAPTION + POLL + MOOD (video & photo, bottom-left) ══ */}
      {!isText && (
        <motion.div
          className="absolute left-4 right-14 space-y-2.5"
          style={{
            bottom: commentOpen ? 220 : 72,
            zIndex: 10,
            transition: "bottom 0.32s cubic-bezier(0.16,1,0.3,1)",
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mood badge */}
          {!!(post as any).mood && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}>
              <span style={{ fontSize: 16 }}>{(post as any).mood}</span>
            </div>
          )}

          {/* Caption */}
          {post.content && (
            <p className="text-white text-[13px] font-medium leading-relaxed line-clamp-3"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85)" }}>
              {post.content}
            </p>
          )}

          {/* Tags */}
          {post.tags && post.tags.filter(t => !t.startsWith("_")).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.filter(t => !t.startsWith("_")).slice(0, 4).map(tag => (
                <span key={tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${theme.accent}1e`,
                    border: `1px solid ${theme.accent}44`,
                    color: theme.labelColor,
                  }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Poll Widget */}
          {!!(post as any).pollQuestion && (
            <PollWidget post={post} theme={theme} />
          )}
        </motion.div>
      )}

      {/* ══ LAYER 8a — SHARE PANEL (slide up from bottom) ══ */}
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
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(40px) saturate(2) brightness(0.9)",
              WebkitBackdropFilter: "blur(40px) saturate(2) brightness(0.9)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderBottom: "none",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-white font-black text-[15px]">Kimga yuborish?</span>
              <motion.button
                onClick={() => { setShareOpen(false); setShareQuery(""); setShareResults([]); }}
                whileTap={{ scale: 0.88 }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                <X className="w-3.5 h-3.5 text-white/80" />
              </motion.button>
            </div>

            {/* Search field */}
            <div className="px-4 pb-3">
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
                <input
                  autoFocus
                  value={shareQuery}
                  onChange={e => setShareQuery(e.target.value)}
                  placeholder="Foydalanuvchi nomini kiriting…"
                  className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/35"
                />
                {shareQuery && (
                  <button onClick={() => { setShareQuery(""); setShareResults([]); }}>
                    <X className="w-3.5 h-3.5 text-white/40" />
                  </button>
                )}
              </div>
            </div>

            {/* Copy link row */}
            <div className="px-4 pb-2">
              <motion.button
                onClick={handleCopyLink}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl"
                style={{
                  background: linkCopied ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.06)",
                  border: linkCopied ? "1px solid rgba(52,211,153,0.40)" : "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {linkCopied
                  ? <Check className="w-4 h-4 text-emerald-400" />
                  : <Link className="w-4 h-4 text-white/60" />
                }
                <span className="text-[13px] font-semibold" style={{ color: linkCopied ? "#34d399" : "rgba(255,255,255,0.75)" }}>
                  {linkCopied ? "Havola nusxalandi!" : "Havolani nusxalash"}
                </span>
              </motion.button>
            </div>

            {/* Divider */}
            {(shareResults.length > 0 || shareQuery.trim()) && (
              <div className="mx-4 mb-2 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
            )}

            {/* User results */}
            <div className="overflow-y-auto" style={{ maxHeight: "220px" }}>
              {shareQuery.trim() && shareResults.length === 0 && (
                <div className="flex items-center justify-center py-6 gap-2 text-white/35">
                  <User className="w-4 h-4" />
                  <span className="text-[12px]">Foydalanuvchi topilmadi</span>
                </div>
              )}
              {shareResults
                .filter(u => u.id !== user?.id)
                .map((u, i) => {
                  const sent    = shareSent === u.id;
                  const sending = shareSending === u.id;
                  return (
                    <motion.button
                      key={u.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.045 }}
                      onClick={() => handleSendToUser(u)}
                      disabled={sending || sent}
                      className="flex items-center gap-3 w-full px-4 py-2.5"
                      style={{ background: sent ? "rgba(52,211,153,0.08)" : "transparent" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Avatar */}
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.18)" }} />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 0 2px rgba(168,85,247,0.35)" }}>
                          {u.displayName?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      {/* Name + username */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white text-[13px] font-bold truncate">{u.displayName}</p>
                        <p className="text-white/45 text-[11px] truncate">@{u.username}</p>
                      </div>
                      {/* Status */}
                      <div className="flex-shrink-0">
                        {sent ? (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.40)" }}
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] font-bold text-emerald-400">Yuborildi</span>
                          </motion.div>
                        ) : sending ? (
                          <motion.div
                            animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70"
                          />
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

            <div className="h-safe pb-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ LAYER 8 — INLINE COMMENT PANEL (slide up from bottom) ══ */}
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
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(40px) saturate(2) brightness(0.9)",
              WebkitBackdropFilter: "blur(40px) saturate(2) brightness(0.9)",
              border: `1px solid rgba(255,255,255,0.20)`,
              borderBottom: "none",
              boxShadow: `0 -8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ background: `${theme.accent}44` }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-xs font-bold text-white/70">Izoh qoldiring</span>
              <button
                onClick={() => setCommentOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            {/* Input row */}
            <div className="flex items-end gap-2.5 px-4 pb-5">
              {/* User avatar */}
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                  style={{ background: `linear-gradient(135deg,${theme.accent},${theme.bg})` }}>
                  {user?.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}

              {/* Textarea */}
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
                    border: `1px solid ${theme.accent}30`,
                    minHeight: 40,
                    maxHeight: 80,
                    overflow: "hidden",
                  }}
                />
                {/* Animated glow border on focus */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  animate={{ boxShadow: commentText ? `0 0 0 1.5px ${theme.accent}66, 0 0 12px ${theme.glow}` : "0 0 0 0px transparent" }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Send button */}
              <motion.button
                onClick={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                style={{
                  background: commentText.trim() ? `linear-gradient(135deg,${theme.accent},${theme.bg}88)` : "rgba(255,255,255,0.07)",
                  border: `1px solid ${commentText.trim() ? theme.accent + "88" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: commentText.trim() ? `0 0 14px ${theme.glow}` : "none",
                }}
                whileTap={{ scale: 0.88 }}
                animate={{ scale: commentSent ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
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

      {/* Click-outside backdrop */}
      {(actionsOpen || commentOpen) && (
        <div className="absolute inset-0" style={{ zIndex: 20 }}
          onClick={() => { setActionsOpen(false); setCommentOpen(false); }} />
      )}
    </div>
  );
}
