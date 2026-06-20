import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark,
  VolumeX, Volume2, BadgeCheck, Check, Send, X,
  ChevronsRight, ChevronsLeft, Eye, DollarSign,
  UserPlus, UserCheck,
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
    { id: "like",    Icon: Heart,                  label: "Layk",    count: likes,                    active: liked,  activeColor: "#f87171", fill: liked,  fn: handleLike },
    { id: "comment", Icon: MessageCircle,           label: "Izoh",    count: post.commentsCount ?? 0,  active: false,  activeColor: "#22d3ee", fill: false, fn: () => { setActionsOpen(false); setCommentOpen(o => !o); } },
    { id: "share",   Icon: copied ? Check : Share2, label: copied ? "Nusxa!" : "Ulash", count: shares, active: copied, activeColor: "#34d399", fill: false, fn: handleShare },
    { id: "save",    Icon: Bookmark,               label: "Saqlash", count: saves,                    active: saved,  activeColor: "#fbbf24", fill: saved,  fn: () => { setSaved(s => { setSaves(n => s ? Math.max(0,n-1) : n+1); return !s; }); } },
  ];

  /* For photo — display format determines object-fit behaviour */
  const displayFormat = (post as any).displayFormat ?? "cover";
  const photoFit = displayFormat === "contain" ? "object-contain" : "object-cover";

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

      {/* VIDEO scanline */}
      {isVideo && (
        <motion.div
          className="absolute inset-x-0 h-[2px] pointer-events-none"
          style={{ background: `linear-gradient(90deg,transparent,${theme.accent}88,transparent)`, zIndex: 4, opacity: 0.55 }}
          animate={{ top: ["-2px", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* ══ LAYER 2 — MAIN CONTENT ══ */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 2 }}
        initial={enterV.initial}
        animate={isInView ? enterV.animate : enterV.initial}
      >
        {isVideo && post.mediaUrl ? (
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
