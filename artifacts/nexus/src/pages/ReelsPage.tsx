import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Tag, Brain, X, Loader2, Volume2, VolumeX, Pause, Send, Check,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────────── */
interface Analysis { tags?: string[]; category?: string; summary?: string; sentiment?: string; }
interface ReelComment {
  id: number; content: string; likesCount: number; createdAt: string;
  author: { id: number; displayName?: string; username?: string; avatarUrl?: string | null; isVerified?: boolean };
}

const SENTIMENT_LABEL: Record<string, string> = { positive: "✅ Ijobiy", neutral: "😐 Neytral", negative: "⚠️ Salbiy" };
const SENTIMENT_COLOR: Record<string, string> = { positive: "text-emerald-400", neutral: "text-white/60", negative: "text-red-400" };

function VideoErrorMsg({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 pointer-events-none gap-3">
      {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
      <p className="text-white/80 text-xs bg-black/60 px-4 py-2 rounded-full z-10">{t("reels.video_na")}</p>
    </div>
  );
}

function CommentsCountLabel({ count }: { count: number }) {
  const { t } = useTranslation();
  return <span className="text-white font-semibold text-sm">{count} {t("reels.comments")}</span>;
}

function ShareToastLabel() {
  const { t } = useTranslation();
  return <>{t("reels.link_copied")}</>;
}

function AIAnalyzeLabel({ className }: { className?: string }) {
  const { t } = useTranslation();
  return <span className={className}>{t("reels.ai_analyze")}</span>;
}

function NoCommentsMsg() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-8">
      <p className="text-white/40 text-sm">{t("reels.no_comments")}</p>
    </div>
  );
}

/* ─── Video Player ─────────────────────────────────────────── */
function ReelVideo({ videoUrl, thumbnailUrl, isActive, muted, onTap }: {
  videoUrl?: string | null; thumbnailUrl?: string | null;
  isActive: boolean; muted: boolean; onTap: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (isActive) {
      v.currentTime = 0; setLoading(true); setPaused(false); setError(false);
      v.play().catch(() => setPaused(true));
    } else { v.pause(); v.currentTime = 0; }
  }, [isActive]);

  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  const handleTap = useCallback(() => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
    onTap();
  }, [onTap]);

  if (!videoUrl) return (
    <div className="absolute inset-0 cursor-pointer" onClick={handleTap}>
      {thumbnailUrl
        ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-gradient-to-br from-violet-900 via-indigo-900 to-black" />
      }
    </div>
  );

  return (
    <div className="absolute inset-0 cursor-pointer" onClick={handleTap}>
      <video ref={ref} src={videoUrl} poster={thumbnailUrl ?? undefined}
        className="w-full h-full object-cover" loop playsInline muted={muted} preload="auto"
        onLoadedData={() => setLoading(false)} onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)} onPlaying={() => { setLoading(false); setPaused(false); }}
        onError={() => { setError(true); setLoading(false); }}
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
      {error && (
        <VideoErrorMsg thumbnailUrl={thumbnailUrl} />
      )}
      <AnimatePresence>
        {paused && !loading && !error && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Pause className="w-9 h-9 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Comments Sheet ─────────────────────────────────────────── */
function CommentsSheet({ reelId, commentsCount, onClose, user }: {
  reelId: number; commentsCount: number; onClose: () => void;
  user: { id: number; displayName?: string; avatarUrl?: string | null } | null;
}) {
  const { t } = useTranslation();
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
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCount(v => v + 1);
        setText("");
        setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
      }
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Sheet */}
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 overflow-hidden"
        style={{ maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <CommentsCountLabel count={count} />
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>

        {/* Comments list */}
        <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-4" style={{ maxHeight: "calc(75vh - 140px)" }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <NoCommentsMsg />
          ) : (
            comments.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/60 to-pink-600/60 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                  {c.author.avatarUrl
                    ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-white">{c.author.displayName?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-white text-xs font-semibold">{c.author.displayName}</span>
                    {c.author.isVerified && <BadgeCheck className="w-3 h-3 text-violet-400" />}
                    <span className="text-white/30 text-[10px] ml-auto">
                      {new Date(c.createdAt).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/60 to-pink-600/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white">{user?.displayName?.[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl bg-white/10 text-white text-sm placeholder:text-white/30 border border-white/10 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center disabled:opacity-40 hover:bg-violet-500 transition-colors">
              {sending
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Share Toast ────────────────────────────────────────────── */
function ShareToast({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ type: "spring", damping: 20 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm font-medium whitespace-nowrap z-20 pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <ShareToastLabel />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Reel Slide ─────────────────────────────────────────────── */
function ReelSlide({
  reel, isActive, muted, onLike, likedIds, onAnalyze, analyzingId, analysisMap,
  showAnalysisId, onToggleAnalysis, onComment, onShare, sharedId,
}: {
  reel: any; isActive: boolean; muted: boolean;
  onLike: (id: number) => void; likedIds: Set<number>;
  onAnalyze: (id: number, caption?: string, thumb?: string) => void;
  analyzingId: number | null; analysisMap: Record<number, Analysis>;
  showAnalysisId: number | null; onToggleAnalysis: (id: number | null) => void;
  onComment: (reel: any) => void; onShare: (id: number, caption: string) => void;
  sharedId: number | null;
}) {
  const isLiked = likedIds.has(reel.id);
  const analysis = analysisMap[reel.id];

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <ReelVideo videoUrl={reel.videoUrl} thumbnailUrl={reel.thumbnailUrl}
        isActive={isActive} muted={muted} onTap={() => {}} />

      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />

      {/* ── Top bar ── */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
        {/* AI Tahlil button */}
        <motion.button whileTap={{ scale: 0.88 }}
          onClick={() => {
            if (analysis) { onToggleAnalysis(showAnalysisId === reel.id ? null : reel.id); }
            else { onAnalyze(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined); }
          }}
          disabled={analyzingId === reel.id}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold border backdrop-blur-md transition-all ${
            showAnalysisId === reel.id
              ? "bg-violet-600/80 border-violet-400/40 text-white"
              : "bg-black/50 border-white/10 text-white hover:bg-black/70"
          }`}>
          {analyzingId === reel.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          }
          <AIAnalyzeLabel />
        </motion.button>
        {/* placeholder right */}
        <div className="w-9" />
      </div>

      {/* ── AI Analysis panel ── */}
      <AnimatePresence>
        {showAnalysisId === reel.id && analysis && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.18 }}
            className="absolute top-16 inset-x-4 z-10">
            <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <AIAnalyzeLabel className="text-xs text-white font-semibold" />
                  </div>
                  {analysis.category && (
                    <span className="px-2 py-0.5 rounded-lg bg-violet-500/30 text-violet-300 text-[10px] font-semibold">
                      {analysis.category}
                    </span>
                  )}
                  {analysis.sentiment && (
                    <span className={`text-[10px] font-semibold ${SENTIMENT_COLOR[analysis.sentiment] ?? "text-white/60"}`}>
                      {SENTIMENT_LABEL[analysis.sentiment] ?? analysis.sentiment}
                    </span>
                  )}
                </div>
                <button onClick={() => onToggleAnalysis(null)}>
                  <X className="w-4 h-4 text-white/50 hover:text-white transition-colors" />
                </button>
              </div>
              {analysis.summary && (
                <p className="text-[11px] text-white/75 leading-relaxed">{analysis.summary}</p>
              )}
              {analysis.tags && analysis.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {analysis.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px]">
                      <Tag className="w-2 h-2" />#{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Author + caption ── */}
      <div className="absolute bottom-0 left-0 right-16 p-5 z-10">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600/80 to-pink-600/80 overflow-hidden flex-shrink-0 border-2 border-white/30">
            {reel.author?.avatarUrl
              ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{reel.author?.displayName?.[0]}</div>
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-sm">{reel.author?.displayName}</span>
              {reel.author?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
            </div>
            <span className="text-white/50 text-xs">@{reel.author?.username}</span>
          </div>
        </div>
        {reel.caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-2 mb-2 font-medium">{reel.caption}</p>
        )}
        {(reel.audioTrack || reel.tags?.length) && (
          <div className="flex items-center gap-2 overflow-hidden">
            {reel.audioTrack && (
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
                  <Music className="w-2.5 h-2.5" />
                </div>
                <span className="truncate max-w-[120px]">{reel.audioTrack}</span>
              </div>
            )}
            {reel.tags?.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-white/40 text-xs shrink-0">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Right action bar ── */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-6 z-10">
        {/* Like */}
        <motion.button whileTap={{ scale: 0.75 }} onClick={() => onLike(reel.id)} className="flex flex-col items-center gap-1">
          <motion.div
            animate={isLiked ? { scale: [1, 1.4, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isLiked ? "bg-red-500 shadow-2xl shadow-red-500/60" : "bg-black/50 backdrop-blur-sm border border-white/10"
            }`}>
            <Heart className={`w-6 h-6 transition-all ${isLiked ? "text-white fill-white" : "text-white"}`} />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-md">
            {(reel.likesCount ?? 0) + (isLiked ? 1 : 0)}
          </span>
        </motion.button>

        {/* Comments */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onComment(reel)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{reel.commentsCount ?? 0}</span>
        </motion.button>

        {/* Share */}
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onShare(reel.id, reel.caption ?? "")}
          className="flex flex-col items-center gap-1">
          <motion.div
            animate={sharedId === reel.id ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            className={`w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-200 ${
              sharedId === reel.id ? "bg-emerald-500/80 border-emerald-400/40" : "bg-black/50 border-white/10 hover:bg-black/70"
            }`}>
            {sharedId === reel.id ? <Check className="w-6 h-6 text-white" /> : <Share2 className="w-6 h-6 text-white" />}
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-md">Ulash</span>
        </motion.button>

        {/* Create */}
        <motion.button whileTap={{ scale: 0.88 }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/40 border-2 border-white/20">
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Share toast */}
      <ShareToast visible={sharedId === reel.id} />
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: reels = [], isLoading } = useListReels();
  const [current, setCurrent] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentReel, setCommentReel] = useState<any | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<number | null>(null);
  const [sharedId, setSharedId] = useState<number | null>(null);

  const likeReel = useLikeReel();
  const qc = useQueryClient();
  const { user } = useAuth();

  const reel = reels[current];

  /* Log view interaction */
  useEffect(() => {
    if (!reel) return;
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "reel", contentId: reel.id, interactionType: "view" }),
    }).catch(() => {});
  }, [reel?.id]);

  /* Keyboard nav */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setCurrent(c => Math.max(0, c - 1));
      else if (e.key === "ArrowDown") setCurrent(c => Math.min(reels.length - 1, c + 1));
      else if (e.key === "m" || e.key === "M") setMuted(v => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [reels.length]);

  /* Drag/swipe nav */
  const y = useMotionValue(0);
  const dragOpacity = useTransform(y, [-80, 0, 80], [0.6, 1, 0.6]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.y < -50) setCurrent(c => Math.min(reels.length - 1, c + 1));
    else if (info.offset.y > 50) setCurrent(c => Math.max(0, c - 1));
    y.set(0);
  };

  const handleLike = (reelId: number) => {
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
  };

  const handleAnalyze = async (reelId: number, caption?: string, thumbnailUrl?: string) => {
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
  };

  const handleShare = async (reelId: number, caption: string) => {
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
  };

  return (
    <div className="relative flex items-center justify-center bg-black"
      style={{ height: "calc(100vh - 60px)", minHeight: 500 }}>

      {/* Mute toggle — always visible */}
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => setMuted(v => !v)}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
      </motion.button>

      {/* Progress pills */}
      {reels.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {reels.slice(0, Math.min(reels.length, 10)).map((_, i) => (
            <motion.button key={i} onClick={() => setCurrent(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === current ? "bg-white w-6" : "bg-white/25 w-1.5"}`} />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          <p className="text-white/40 text-sm">Yuklanmoqda...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center gap-5 text-white/60">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-4xl border border-white/10">🎬</div>
          <div className="text-center">
            <p className="font-semibold text-white mb-1">Hali reel yo'q</p>
            <p className="text-sm">Birinchi reelni yuklang!</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-semibold shadow-lg">
            <Plus className="w-4 h-4" /> Reel qo'shish
          </motion.button>
        </div>
      ) : reel && (
        /* 9:16 container */
        <motion.div
          drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="relative select-none touch-none"
          style={{ opacity: dragOpacity, width: "min(100vw, calc((100vh - 60px) * 9 / 16))", height: "calc(100vh - 60px)" }}>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={reel.id}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>

              <ReelSlide
                reel={reel} isActive={true} muted={muted}
                onLike={handleLike} likedIds={likedIds}
                onAnalyze={handleAnalyze} analyzingId={analyzingId}
                analysisMap={analysisMap} showAnalysisId={showAnalysisId}
                onToggleAnalysis={setShowAnalysisId}
                onComment={setCommentReel}
                onShare={handleShare} sharedId={sharedId}
              />
            </motion.div>
          </AnimatePresence>

          {/* Prev/Next arrows */}
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 hidden md:flex">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center disabled:opacity-20 hover:bg-white/20 transition border border-white/10">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setCurrent(c => Math.min(reels.length - 1, c + 1))}
              disabled={current === reels.length - 1}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center disabled:opacity-20 hover:bg-white/20 transition border border-white/10">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Comments bottom sheet */}
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
