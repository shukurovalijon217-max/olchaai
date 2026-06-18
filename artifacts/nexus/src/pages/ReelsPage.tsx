import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Brain, X, Loader2, Volume2, VolumeX, Send, Check, Zap, Tag, Gauge, Scissors,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ──────────────────────────────────────────────────── */
interface FeedItem {
  id: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  audioTrack?: string | null;
  duration?: number | null;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  tags?: string[];
  author?: {
    id: number;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  isLiked?: boolean;
  _aiSuggested?: boolean;
  _aiReason?: string;
  _animIdx?: number;
}

interface ReelComment {
  id: number;
  content: string;
  likesCount: number;
  createdAt: string;
  author: {
    id: number;
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
}

interface Analysis {
  tags?: string[];
  category?: string;
  summary?: string;
  sentiment?: string;
}

interface HeartPos { x: number; y: number; id: number }

/* ─── 12 Unique Per-Item Entrance Animations ─────────────────── */
const ANIM_POOL = [
  /* 0 — Rise from below (spring bounce) */
  {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: "-108%", opacity: 0 },
    transition: { type: "spring", stiffness: 380, damping: 36 },
  },
  /* 1 — Iris circle expand from bottom */
  {
    initial: { clipPath: "circle(0% at 50% 100%)" },
    animate: { clipPath: "circle(150% at 50% 100%)" },
    exit:    { clipPath: "circle(0% at 50% 0%)" },
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const },
  },
  /* 2 — Wormhole spin + scale */
  {
    initial: { scale: 0.04, rotate: -270, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit:    { scale: 0.04, rotate: 270, opacity: 0 },
    transition: { type: "spring", stiffness: 200, damping: 22 },
  },
  /* 3 — Strobe flash reveal */
  {
    initial: { opacity: 0, filter: "brightness(8) saturate(0)" },
    animate: { opacity: 1, filter: "brightness(1) saturate(1)" },
    exit:    { opacity: 0, filter: "brightness(5)" },
    transition: { duration: 0.38, ease: "easeOut" as const },
  },
  /* 4 — Diagonal wipe left→right */
  {
    initial: { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" },
    animate: { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    exit:    { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" },
    transition: { duration: 0.44, ease: [0.16, 1, 0.3, 1] as const },
  },
  /* 5 — Scale burst from thumb */
  {
    initial: { scale: 0.05, opacity: 0, borderRadius: "50%" },
    animate: { scale: 1, opacity: 1, borderRadius: "24px" },
    exit:    { scale: 0.05, opacity: 0, borderRadius: "50%" },
    transition: { type: "spring", stiffness: 340, damping: 28 },
  },
  /* 6 — Slide from right */
  {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit:    { x: "-100%", opacity: 0 },
    transition: { type: "spring", stiffness: 360, damping: 34 },
  },
  /* 7 — Zoom-blur in */
  {
    initial: { scale: 1.75, opacity: 0, filter: "blur(28px)" },
    animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
    exit:    { scale: 0.5, opacity: 0, filter: "blur(14px)" },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
  /* 8 — Shutter drop from top */
  {
    initial: { clipPath: "inset(100% 0 0 0)" },
    animate: { clipPath: "inset(0% 0 0 0)" },
    exit:    { clipPath: "inset(0 0 100% 0)" },
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
  /* 9 — Tilted slam in */
  {
    initial: { scale: 0.78, rotate: -10, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit:    { scale: 0.78, rotate: 10, opacity: 0 },
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
  /* 10 — Vertical accordion */
  {
    initial: { scaleY: 0, opacity: 0 },
    animate: { scaleY: 1, opacity: 1 },
    exit:    { scaleY: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 420, damping: 32 },
  },
  /* 11 — Venetian-blind split from center */
  {
    initial: { clipPath: "inset(48% 0 48% 0)" },
    animate: { clipPath: "inset(0% 0 0% 0)" },
    exit:    { clipPath: "inset(48% 0 48% 0)", opacity: 0 },
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  },
] as const;

/* ─── Video Progress Hook ────────────────────────────────────── */
function useVideoProgress(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setProgress(v.duration > 0 ? v.currentTime / v.duration : 0);
    const onMeta = () => setDur(v.duration || 0);
    v.addEventListener("timeupdate", onTime, { passive: true });
    v.addEventListener("loadedmetadata", onMeta, { passive: true });
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  });

  const seek = useCallback((ratio: number) => {
    const v = videoRef.current;
    if (v && v.duration) v.currentTime = ratio * v.duration;
  }, [videoRef]);

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return { progress, dur, seek, fmtTime };
}

/* ─── Rainbow Progress Bar ───────────────────────────────────── */
function ProgressBar({ progress, dur, seek }: { progress: number; dur: number; seek: (r: number) => void }) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width);
  };
  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 h-[3px] cursor-pointer group"
      style={{ padding: "6px 0", marginTop: -6 }}
      onClick={handleClick}
    >
      <div className="w-full h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg,#C0392B,#B8860B,#D4A020,#C0392B)" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
      {dur > 0 && (
        <div className="absolute right-3 top-2 text-[10px] font-mono opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.7)" }}>
          {Math.floor(progress * dur)}s / {Math.floor(dur)}s
        </div>
      )}
    </div>
  );
}

/* ─── Heart Burst (double-tap) ───────────────────────────────── */
function HeartBurst({ hearts, onDone }: { hearts: HeartPos[]; onDone: (id: number) => void }) {
  return (
    <>
      {hearts.map(h => (
        <motion.div
          key={h.id}
          initial={{ scale: 0, opacity: 1, y: 0 }}
          animate={{ scale: [0, 1.5, 2.2], opacity: [1, 1, 0], y: -60 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() => onDone(h.id)}
          style={{ position: "absolute", left: h.x - 24, top: h.y - 24, pointerEvents: "none", zIndex: 30 }}
        >
          <Heart className="w-12 h-12 fill-red-500 text-red-500" />
        </motion.div>
      ))}
    </>
  );
}

/* ─── Action Button ──────────────────────────────────────────── */
function ActionBtn({
  icon, count, active, activeColor, onClick, glow,
}: {
  icon: React.ReactNode;
  count?: number | string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
  glow?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.75 }}
      onClick={onClick}
      className="flex flex-col items-center gap-[5px]"
    >
      <motion.div
        animate={active ? { scale: [1, 1.35, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{
          background: active
            ? (activeColor ?? "rgba(255,255,255,0.15)")
            : "rgba(12,12,24,0.55)",
          backdropFilter: "blur(16px)",
          border: active
            ? `1px solid ${glow ?? "rgba(255,255,255,0.3)"}`
            : "1px solid rgba(255,255,255,0.1)",
          boxShadow: active
            ? `0 0 20px ${glow ?? "rgba(255,255,255,0.3)"}, inset 0 1px 0 rgba(255,255,255,0.15)`
            : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {active && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 50%, ${glow ?? "rgba(255,255,255,0.2)"} 0%, transparent 70%)` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>{icon}</div>
      </motion.div>
      {count !== undefined && (
        <span className="text-white text-xs font-bold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

/* ─── Enhanced Reel Video ─────────────────────────────────────── */
interface ReelVideoProps {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPlayState: (paused: boolean) => void;
}

function ReelVideoEl({ videoUrl, thumbnailUrl, isActive, muted, videoRef, onPlayState }: ReelVideoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      setError(false);
      setLoading(v.readyState < 3);
      v.play().catch(() => onPlayState(true));
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive, videoRef, onPlayState]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, videoRef]);

  if (!videoUrl) return (
    <div className="absolute inset-0">
      {thumbnailUrl
        ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1e0533 0%, #0a0524 50%, #030314 100%)" }} />
      }
    </div>
  );

  return (
    <div className="absolute inset-0">
      {/* Blurred background fill (for letterboxed videos) */}
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(24px) brightness(0.35)", pointerEvents: "none" }}
        />
      )}

      {/* Poster shown instantly while buffering */}
      {thumbnailUrl && (loading || !isActive) && !error && (
        <img src={thumbnailUrl} alt="" loading="eager"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]" />
      )}

      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-contain z-[2]"
        loop playsInline muted={muted} preload="auto"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); onPlayState(false); }}
        onPause={() => onPlayState(true)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ opacity: (loading && !thumbnailUrl) ? 0 : 1, transition: "opacity 120ms ease" }}
      />

      {/* Buffering spinner — only when no thumbnail available */}
      {loading && !error && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-amber-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-white/5 border-t-pink-400 animate-spin" style={{ animationDuration: "0.7s", animationDirection: "reverse" }} />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-[3] pointer-events-none">
          {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <span className="text-white/70 text-xs bg-black/50 px-4 py-2 rounded-full z-10">Video mavjud emas</span>
        </div>
      )}
    </div>
  );
}

/* ─── Comments Sheet ─────────────────────────────────────────── */
function CommentsSheet({ reelId, commentsCount, onClose, user }: {
  reelId: number;
  commentsCount: number;
  onClose: () => void;
  user: { id: number; displayName?: string; avatarUrl?: string | null } | null;
}) {
  const { t, i18n } = useTranslation();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(commentsCount);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/reels/${reelId}/comments`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setComments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/reels/${reelId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const nc = await res.json();
        setComments(prev => [nc, ...prev]);
        setCount(v => v + 1);
        setText("");
        setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
      }
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "75vh", background: "rgba(10,8,24,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(192,57,43,0.2)", borderBottom: "none" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-white font-bold text-sm">{count} {t("reels.comments")}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-4" style={{ maxHeight: "calc(75vh - 140px)" }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-amber-500 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">{t("reels.no_comments")}</p>
            </div>
          ) : comments.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700/60 to-amber-700/60 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                {c.author.avatarUrl
                  ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-white">{c.author.displayName?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white text-xs font-semibold">{c.author.displayName}</span>
                  {c.author.isVerified && <BadgeCheck className="w-3 h-3 text-amber-400" />}
                  <span className="text-white/30 text-[10px] ml-auto">
                    {new Date(c.createdAt).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700/60 to-amber-700/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white">{user?.displayName?.[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #C0392B, #B8860B)" }}>
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Reel Slide (completely redesigned) ─────────────────────── */
interface ReelSlideProps {
  reel: FeedItem;
  isActive: boolean;
  muted: boolean;
  onLike: (id: number) => void;
  likedIds: Set<number>;
  onAnalyze: (id: number, caption?: string, thumb?: string) => void;
  analyzingId: number | null;
  analysisMap: Record<number, Analysis>;
  showAnalysisId: number | null;
  onToggleAnalysis: (id: number | null) => void;
  onComment: (reel: FeedItem) => void;
  onShare: (id: number, caption: string) => void;
  sharedId: number | null;
  onAdd: () => void;
}

function ReelSlide({
  reel, isActive, muted, onLike, likedIds, onAnalyze, analyzingId,
  analysisMap, showAnalysisId, onToggleAnalysis, onComment, onShare, sharedId, onAdd,
}: ReelSlideProps) {
  const isLiked = likedIds.has(reel.id);
  const analysis = analysisMap[reel.id];
  const [paused, setPaused] = useState(false);
  const [hearts, setHearts] = useState<HeartPos[]>([]);
  const [lastTap, setLastTap] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { progress, dur, seek } = useVideoProgress(videoRef);
  const [speed, setSpeed] = useState(1);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showTrimPanel, setShowTrimPanel] = useState(false);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  const [clipSaved, setClipSaved] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed, videoRef]);

  const handleSetTrimStart = useCallback(() => {
    const v = videoRef.current;
    if (v) setTrimStart(parseFloat(v.currentTime.toFixed(1)));
  }, [videoRef]);

  const handleSetTrimEnd = useCallback(() => {
    const v = videoRef.current;
    if (v) setTrimEnd(parseFloat(v.currentTime.toFixed(1)));
  }, [videoRef]);

  const handleSaveClip = useCallback(async () => {
    if (trimStart == null || trimEnd == null) return;
    const info = `Reel #${reel.id} klip: ${trimStart.toFixed(1)}s – ${trimEnd.toFixed(1)}s`;
    try { await navigator.clipboard.writeText(info); } catch { /* silent */ }
    setClipSaved(true);
    setTimeout(() => setClipSaved(false), 2200);
  }, [trimStart, trimEnd, reel.id]);

  /* Tap handler: single = play/pause, double = like + heart burst */
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (now - lastTap < 280) {
      /* double-tap */
      if (!likedIds.has(reel.id)) onLike(reel.id);
      const id = now;
      setHearts(prev => [...prev, { x, y, id }]);
    } else {
      /* single-tap: toggle play/pause */
      const v = videoRef.current;
      if (v) {
        if (v.paused) { v.play().catch(() => {}); setPaused(false); }
        else { v.pause(); setPaused(true); }
      }
    }
    setLastTap(now);
  }, [lastTap, likedIds, onLike, reel.id]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">

      {/* Video layer */}
      <ReelVideoEl videoUrl={reel.videoUrl} thumbnailUrl={reel.thumbnailUrl}
        isActive={isActive} muted={muted} videoRef={videoRef} onPlayState={setPaused} />

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.22) 28%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 40%)" }} />

      {/* Tap zone */}
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleTap} />

      {/* Rainbow progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20" onClick={e => e.stopPropagation()}>
        <ProgressBar progress={progress} dur={dur} seek={seek} />
      </div>

      {/* Heart burst */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <HeartBurst hearts={hearts} onDone={id => setHearts(prev => prev.filter(h => h.id !== id))} />
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <svg className="w-9 h-9 text-white fill-white" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="absolute top-4 inset-x-4 flex items-start justify-between z-20 pointer-events-none">

        {/* Left: AI badge / category / tavsiya */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {reel._aiSuggested && (
            <motion.div initial={{ opacity: 0, scale: 0.85, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(192,57,43,0.4)", backdropFilter: "blur(10px)", border: "1px solid rgba(212,160,32,0.3)", color: "#D4A020" }}>
              <Zap className="w-2.5 h-2.5" />
              <span>Sizga tavsiya · {reel._aiReason}</span>
            </motion.div>
          )}
          {reel.tags?.[0] && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
              <Tag className="w-2 h-2" />
              {reel.tags[0]}
            </motion.div>
          )}
        </div>

        {/* Right: AI analyze */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            if (analysis) onToggleAnalysis(showAnalysisId === reel.id ? null : reel.id);
            else onAnalyze(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined);
          }}
          disabled={analyzingId === reel.id}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-semibold transition-all pointer-events-auto"
          style={{
            background: showAnalysisId === reel.id ? "rgba(192,57,43,0.6)" : "rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            border: showAnalysisId === reel.id ? "1px solid rgba(212,160,32,0.5)" : "1px solid rgba(255,255,255,0.1)",
            color: showAnalysisId === reel.id ? "#D4A020" : "rgba(255,255,255,0.75)",
          }}>
          {analyzingId === reel.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Brain className="w-3.5 h-3.5" style={{ color: "#D4A020" }} />
          }
          AI
        </motion.button>
      </div>

      {/* ── AI Analysis Panel ────────────────────────────────── */}
      <AnimatePresence>
        {showAnalysisId === reel.id && analysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.18 }}
            className="absolute top-16 inset-x-4 z-20 pointer-events-auto"
          >
            <div className="rounded-2xl p-4 space-y-2.5"
              style={{ background: "rgba(8,6,20,0.88)", backdropFilter: "blur(20px)", border: "1px solid rgba(192,57,43,0.25)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {analysis.category && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(192,57,43,0.3)", color: "#D4A020" }}>
                      {analysis.category}
                    </span>
                  )}
                  {analysis.sentiment && (
                    <span className={`text-[10px] font-semibold ${
                      analysis.sentiment === "positive" ? "text-emerald-400" :
                      analysis.sentiment === "negative" ? "text-red-400" : "text-white/50"
                    }`}>
                      {analysis.sentiment === "positive" ? "✅ Ijobiy" : analysis.sentiment === "negative" ? "⚠️ Salbiy" : "😐 Neytral"}
                    </span>
                  )}
                </div>
                <button onClick={() => onToggleAnalysis(null)}>
                  <X className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                </button>
              </div>
              {analysis.summary && <p className="text-[11px] text-white/70 leading-relaxed">{analysis.summary}</p>}
              {analysis.tags && analysis.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {analysis.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom left: Author + Caption + Meta ─────────────── */}
      <div className="absolute bottom-0 left-0 right-20 p-5 z-20 pointer-events-none">

        {/* Author */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative flex-shrink-0 w-10 h-10">
            {/* Spinning gradient ring */}
            <motion.div
              className="absolute inset-[-2px] rounded-full"
              style={{ background: "conic-gradient(from 0deg, #C0392B, #B8860B, #D4A020, #C0392B)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-[2px] rounded-full overflow-hidden bg-black z-10">
              {reel.author?.avatarUrl
                ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #C0392B, #B8860B)" }}>
                    {reel.author?.displayName?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-sm leading-tight">{reel.author?.displayName}</span>
              {reel.author?.isVerified && (
                <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: "#D4A020" }} />
              )}
            </div>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>@{reel.author?.username}</span>
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm leading-relaxed mb-2 font-medium"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
            {reel.caption.length > 80 ? reel.caption.slice(0, 80) + "…" : reel.caption}
          </p>
        )}

        {/* Audio + tags */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          {reel.audioTrack && (
            <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              <motion.div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Music className="w-2 h-2" />
              </motion.div>
              <span className="text-[11px] truncate max-w-[100px]">{reel.audioTrack}</span>
            </div>
          )}
          {reel.viewsCount !== undefined && reel.viewsCount > 0 && (
            <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
              👁 {reel.viewsCount >= 1000 ? `${(reel.viewsCount / 1000).toFixed(1)}K` : reel.viewsCount}
            </span>
          )}
          {reel.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>#{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Right Action Bar ─────────────────────────────────── */}
      <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5 z-20 pointer-events-auto">

        {/* Like */}
        <ActionBtn
          icon={<Heart className={`w-6 h-6 transition-all ${isLiked ? "fill-white text-white" : "text-white"}`} />}
          count={(reel.likesCount ?? 0) + (isLiked ? 1 : 0)}
          active={isLiked}
          activeColor="rgba(239,68,68,0.5)"
          glow="rgba(239,68,68,0.5)"
          onClick={() => onLike(reel.id)}
        />

        {/* Comments */}
        <ActionBtn
          icon={<MessageCircle className="w-6 h-6 text-white" />}
          count={reel.commentsCount ?? 0}
          onClick={() => onComment(reel)}
          glow="rgba(59,130,246,0.5)"
        />

        {/* Share */}
        <ActionBtn
          icon={sharedId === reel.id
            ? <Check className="w-6 h-6 text-white" />
            : <Share2 className="w-6 h-6 text-white" />}
          active={sharedId === reel.id}
          activeColor="rgba(16,185,129,0.45)"
          glow="rgba(16,185,129,0.5)"
          onClick={() => onShare(reel.id, reel.caption ?? "")}
        />

        {/* Add / Create */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onAdd}
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #C0392B 0%, #B8860B 100%)",
            boxShadow: "0 0 24px rgba(192,57,43,0.5), 0 4px 20px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
          <Plus className="w-6 h-6 text-white" />
        </motion.button>

        {/* Speed */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={(e) => { e.stopPropagation(); setShowSpeedPanel(v => !v); setShowTrimPanel(false); }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: speed !== 1 ? "rgba(192,57,43,0.55)" : "rgba(12,12,24,0.55)",
            backdropFilter: "blur(16px)",
            border: speed !== 1 ? "1px solid rgba(212,160,32,0.45)" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: speed !== 1 ? "0 0 18px rgba(192,57,43,0.45)" : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
          {speed !== 1
            ? <span className="text-[11px] font-black" style={{ color: "#D4A020" }}>{speed}×</span>
            : <Gauge className="w-[18px] h-[18px] text-white" />
          }
        </motion.button>

        {/* Clip / Trim */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={(e) => { e.stopPropagation(); setShowTrimPanel(v => !v); setShowSpeedPanel(false); }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: showTrimPanel ? "rgba(59,130,246,0.55)" : "rgba(12,12,24,0.55)",
            backdropFilter: "blur(16px)",
            border: showTrimPanel ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: showTrimPanel ? "0 0 18px rgba(59,130,246,0.45)" : "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
          <Scissors className="w-[18px] h-[18px] text-white" />
        </motion.button>
      </div>

      {/* Share toast */}
      <AnimatePresence>
        {sharedId === reel.id && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ type: "spring", damping: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap z-20 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-white text-sm font-medium">Havola nusxalandi</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Speed Control Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {showSpeedPanel && (
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.88 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="absolute right-[72px] bottom-48 flex flex-col-reverse gap-2 z-30 pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => { setSpeed(s); setShowSpeedPanel(false); }}
                className="px-4 py-2 rounded-xl text-xs font-black"
                style={{
                  background: speed === s
                    ? "rgba(192,57,43,0.75)"
                    : "rgba(8,6,20,0.82)",
                  backdropFilter: "blur(16px)",
                  border: speed === s
                    ? "1px solid rgba(212,160,32,0.65)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: speed === s ? "#D4A020" : "rgba(255,255,255,0.65)",
                  boxShadow: speed === s
                    ? "0 0 16px rgba(192,57,43,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "0 2px 12px rgba(0,0,0,0.5)",
                  minWidth: "3.8rem",
                  textAlign: "center",
                }}>
                {s === 1 ? "1× Normal" : s < 1 ? `${s}× Sekin` : `${s}× Tez`}
              </motion.button>
            ))}
            <div className="text-[10px] font-semibold text-center mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tezlik
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trim / Clip Panel ───────────────────────────────────── */}
      <AnimatePresence>
        {showTrimPanel && (
          <motion.div
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 64 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="absolute bottom-20 left-4 right-20 z-30 pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(8,6,20,0.94)", backdropFilter: "blur(24px)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                  <span className="text-white text-xs font-bold">Klip belgilash</span>
                </div>
                {trimStart != null && trimEnd != null && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] font-mono"
                    style={{ color: "#D4A020" }}>
                    {trimStart.toFixed(1)}s → {trimEnd.toFixed(1)}s &nbsp;·&nbsp; {Math.abs(trimEnd - trimStart).toFixed(1)}s
                  </motion.span>
                )}
              </div>

              {/* Timeline bar */}
              <div className="relative h-8 rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {dur > 0 && (
                  <div className="absolute inset-y-0 left-0 rounded-xl transition-all duration-100"
                    style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg,rgba(192,57,43,0.45),rgba(59,130,246,0.45),rgba(6,182,212,0.45))" }} />
                )}
                {trimStart != null && dur > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-y-0 z-10"
                    style={{
                      left: `${(trimStart / dur) * 100}%`,
                      right: trimEnd != null ? `${100 - (trimEnd / dur) * 100}%` : "0%",
                      background: "rgba(96,165,250,0.22)",
                      borderLeft: "2px solid #60a5fa",
                      borderRight: trimEnd != null ? "2px solid #D4A020" : undefined,
                    }} />
                )}
                {dur > 0 && (
                  <div className="absolute top-0 bottom-0 w-px z-20 pointer-events-none"
                    style={{ left: `${progress * 100}%`, background: "rgba(255,255,255,0.7)", transition: "left 120ms linear" }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono pointer-events-none select-none"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  {dur > 0 ? `${Math.floor(progress * dur)}s / ${Math.floor(dur)}s` : "Video mavjud emas"}
                </span>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={handleSetTrimStart}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background: trimStart != null ? "rgba(192,57,43,0.4)" : "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", color: "#D4A020" }}>
                  ⏮ Boshi
                  {trimStart != null && (
                    <span className="opacity-60 text-[9px]">{trimStart.toFixed(1)}s</span>
                  )}
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={handleSetTrimEnd}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background: trimEnd != null ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd" }}>
                  Oxiri ⏭
                  {trimEnd != null && (
                    <span className="opacity-60 text-[9px]">{trimEnd.toFixed(1)}s</span>
                  )}
                </motion.button>
                {trimStart != null && trimEnd != null && Math.abs(trimEnd - trimStart) > 0.1 && (
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={handleSaveClip}
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="py-2 px-4 rounded-xl text-xs font-bold"
                    style={{
                      background: clipSaved ? "rgba(16,185,129,0.6)" : "linear-gradient(135deg, #C0392B, #B8860B)",
                      color: "white",
                      boxShadow: clipSaved ? "0 0 18px rgba(16,185,129,0.5)" : "0 0 16px rgba(192,57,43,0.4)",
                      border: clipSaved ? "1px solid rgba(52,211,153,0.4)" : "none",
                      transition: "all 0.2s",
                    }}>
                    {clipSaved ? "✓ Saqlandi" : "💾 Saqlash"}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS keyframes for gradient ring */}
      <style>{`@keyframes nexus-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: initialReels = [], isLoading } = useListReels({ limit: 20 } as any);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentReel, setCommentReel] = useState<FeedItem | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<number | null>(null);
  const [sharedId, setSharedId] = useState<number | null>(null);
  const [injecting, setInjecting] = useState(false);

  const likeReel = useLikeReel();
  const qc = useQueryClient();
  const { user } = useAuth();

  const watchedTagsRef = useRef<string[]>([]);
  const watchedIdsRef = useRef<Set<number>>(new Set());

  /* Seed feed from API data, assign animation index */
  useEffect(() => {
    if (initialReels.length > 0 && feed.length === 0) {
      setFeed((initialReels as FeedItem[]).map((r, i) => ({ ...r, _animIdx: i % ANIM_POOL.length })));
    }
  }, [initialReels, feed.length]);

  /* Log view + track tags + AI inject */
  useEffect(() => {
    const reel = feed[current];
    if (!reel) return;

    /* View count */
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "reel", contentId: reel.id, interactionType: "view" }),
    }).catch(() => {});
    fetch(`${API}/api/reels/${reel.id}/view`, { method: "POST", credentials: "include" }).catch(() => {});

    /* Track tags */
    if (reel.tags && reel.tags.length > 0) {
      watchedTagsRef.current = [...new Set([...watchedTagsRef.current, ...reel.tags])].slice(0, 10);
    }
    watchedIdsRef.current.add(reel.id);

    /* Inject similar content every 4 items viewed */
    if (current > 0 && current % 4 === 0 && watchedTagsRef.current.length > 0 && !injecting) {
      const excludeIds = Array.from(watchedIdsRef.current).join(",");
      const topTags = watchedTagsRef.current.slice(0, 5).join(",");
      setInjecting(true);
      fetch(`${API}/api/reels/similar?tags=${encodeURIComponent(topTags)}&excludeIds=${excludeIds}&limit=5`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then((similar: FeedItem[]) => {
          if (similar.length > 0) {
            setFeed(prev => {
              const insertAt = Math.min(current + 3, prev.length);
              const injected = similar.map((r, i) => ({
                ...r,
                _aiSuggested: true,
                _aiReason: topTags.split(",")[0],
                _animIdx: (insertAt + i) % ANIM_POOL.length,
              }));
              return [...prev.slice(0, insertAt), ...injected, ...prev.slice(insertAt)];
            });
          }
        })
        .catch(() => {})
        .finally(() => setInjecting(false));
    }
  }, [current, feed, injecting]);

  /* Keyboard navigation */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") setCurrent(c => Math.min(feed.length - 1, c + 1));
      else if (e.key === "ArrowUp" || e.key === "k") setCurrent(c => Math.max(0, c - 1));
      else if (e.key === "m" || e.key === "M") setMuted(v => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [feed.length]);

  /* Wheel navigation */
  const wheelAccum = useRef(0);
  const wheelLock = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelLock.current) return;
    wheelAccum.current += e.deltaY;
    if (Math.abs(wheelAccum.current) > 60) {
      const dir = wheelAccum.current > 0 ? 1 : -1;
      setCurrent(c => Math.max(0, Math.min(feed.length - 1, c + dir)));
      wheelAccum.current = 0;
      wheelLock.current = true;
      setTimeout(() => { wheelLock.current = false; }, 380);
    }
  }, [feed.length]);

  /* Touch navigation */
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 50) setCurrent(c => Math.min(feed.length - 1, c + 1));
    else if (dy < -50) setCurrent(c => Math.max(0, c - 1));
  }, [feed.length]);

  /* Drag nav */
  const y = useMotionValue(0);
  const dragOpacity = useTransform(y, [-80, 0, 80], [0.55, 1, 0.55]);
  const handleDragEnd = useCallback((_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y < -50) setCurrent(c => Math.min(feed.length - 1, c + 1));
    else if (info.offset.y > 50) setCurrent(c => Math.max(0, c - 1));
    y.set(0);
  }, [feed.length, y]);

  const handleLike = useCallback((reelId: number) => {
    const next = new Set(likedIds);
    if (next.has(reelId)) next.delete(reelId); else next.add(reelId);
    setLikedIds(next);
    likeReel.mutate({ id: reelId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListReelsQueryKey() }),
      onError: () => {
        const rb = new Set(likedIds);
        if (rb.has(reelId)) rb.delete(reelId); else rb.add(reelId);
        setLikedIds(rb);
      },
    });
  }, [likedIds, likeReel, qc]);

  const handleAnalyze = useCallback(async (reelId: number, caption?: string, thumbnailUrl?: string) => {
    if (analysisMap[reelId]) { setShowAnalysisId(reelId); return; }
    setAnalyzingId(reelId);
    try {
      const res = await fetch(`${API}/api/ai/analyze-content`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ contentId: reelId, contentType: "reel", caption: caption ?? "", imageUrl: thumbnailUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisMap(prev => ({ ...prev, [reelId]: data }));
        setShowAnalysisId(reelId);
      }
    } catch { /* silent */ }
    finally { setAnalyzingId(null); }
  }, [analysisMap]);

  const handleShare = useCallback(async (reelId: number, caption: string) => {
    const url = `${window.location.origin}/reels`;
    try {
      if (navigator.share) await navigator.share({ title: caption || "OlCha Reel", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      try { await navigator.clipboard.writeText(url); } catch { /* silent */ }
    }
    setSharedId(reelId);
    setTimeout(() => setSharedId(null), 2200);
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "reel", contentId: reelId, interactionType: "share" }),
    }).catch(() => {});
  }, []);

  const reel = feed[current];

  return (
    <div
      className="relative flex items-center justify-center bg-black overflow-hidden"
      style={{ height: "calc(100vh - 60px)", minHeight: 480 }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Mute toggle ────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setMuted(v => !v)}
        className="absolute top-5 right-5 z-30 w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
        {muted ? <VolumeX className="w-4.5 h-4.5 text-white" /> : <Volume2 className="w-4.5 h-4.5 text-white" />}
      </motion.button>

      {/* ── Feed counter ────────────────────────────────────────── */}
      {feed.length > 0 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1 z-30">
          {feed.slice(Math.max(0, current - 4), Math.min(feed.length, current + 5)).map((_, relIdx) => {
            const absIdx = Math.max(0, current - 4) + relIdx;
            return (
              <motion.button
                key={absIdx}
                onClick={() => setCurrent(absIdx)}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 3,
                  width: absIdx === current ? 24 : 6,
                  background: absIdx === current ? "#fff" : "rgba(255,255,255,0.22)",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Preload pool: next-1 + next-2 buffered silently ─────── */}
      <div style={{ display: "none" }} aria-hidden="true">
        {[current + 1, current + 2].map(idx => {
          const r = feed[idx];
          if (!r?.videoUrl) return null;
          return <video key={r.id} src={r.videoUrl} preload="auto" muted playsInline loop />;
        })}
        {[current + 1, current + 2, current + 3].map(idx => {
          const r = feed[idx];
          if (!r?.thumbnailUrl) return null;
          return <img key={`t-${r.id}`} src={r.thumbnailUrl} loading="eager" alt="" />;
        })}
      </div>

      {/* ── States ─────────────────────────────────────────────── */}
      {isLoading && feed.length === 0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-amber-500 animate-spin" />
            <div className="absolute inset-3 rounded-full border border-white/10 border-t-pink-400 animate-spin" style={{ animationDuration: "0.6s", animationDirection: "reverse" }} />
          </div>
          <p className="text-white/40 text-sm font-medium">OlCha lenta yuklanmoqda…</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>🎬</div>
          <div className="text-center">
            <p className="font-bold text-white mb-1">Hali reel yo'q</p>
            <p className="text-sm text-white/50">Birinchi reelni yuklang!</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C0392B, #B8860B)", boxShadow: "0 4px 24px rgba(192,57,43,0.5)" }}>
            <Plus className="w-4 h-4" /> Reel qo'shish
          </motion.button>
        </div>
      ) : reel && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
          className="relative select-none touch-none"
          style={{
            opacity: dragOpacity,
            width: "min(100vw, calc((100vh - 60px) * 9 / 16))",
            height: "calc(100vh - 60px)",
          }}>

          <AnimatePresence mode="wait" initial={false}>
            {(() => {
              const anim = ANIM_POOL[(reel._animIdx ?? 0) % ANIM_POOL.length];
              return (
                <motion.div
                  key={reel.id}
                  initial={anim.initial}
                  animate={anim.animate}
                  exit={anim.exit}
                  transition={anim.transition as any}
                  className="absolute inset-0 overflow-hidden"
                  style={{ borderRadius: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)" }}>

                  <ReelSlide
                    reel={reel}
                    isActive={true}
                    muted={muted}
                    onLike={handleLike}
                    likedIds={likedIds}
                    onAnalyze={handleAnalyze}
                    analyzingId={analyzingId}
                    analysisMap={analysisMap}
                    showAnalysisId={showAnalysisId}
                    onToggleAnalysis={setShowAnalysisId}
                    onComment={setCommentReel}
                    onShare={handleShare}
                    sharedId={sharedId}
                    onAdd={() => setCreateOpen(true)}
                  />
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Desktop prev/next arrows */}
          <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex-col gap-3 hidden md:flex z-20">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-20 transition-all"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCurrent(c => Math.min(feed.length - 1, c + 1))}
              disabled={current >= feed.length - 1}
              className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-20 transition-all"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          </div>

          {/* AI inject indicator */}
          <AnimatePresence>
            {injecting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold z-20"
                style={{ background: "rgba(192,57,43,0.3)", backdropFilter: "blur(8px)", border: "1px solid rgba(212,160,32,0.2)", color: "#D4A020" }}>
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                AI tavsiyalar tayyorlanmoqda…
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Comments sheet */}
      <AnimatePresence>
        {commentReel && (
          <CommentsSheet
            reelId={commentReel.id}
            commentsCount={commentReel.commentsCount ?? 0}
            user={user}
            onClose={() => setCommentReel(null)}
          />
        )}
      </AnimatePresence>

      <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
