import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, ChevronUp, ChevronDown,
  Plus, Sparkles, Tag, Brain, X, Loader2, Volume2, VolumeX, Play, Pause,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import CreateContentModal from "@/components/CreateContentModal";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Analysis {
  tags?: string[];
  category?: string;
  summary?: string;
  sentiment?: string;
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-green-400",
  neutral: "text-muted-foreground",
  negative: "text-red-400",
};
const SENTIMENT_LABEL: Record<string, string> = {
  positive: "✅ Ijobiy",
  neutral: "😐 Neytral",
  negative: "⚠️ Salbiy",
};

/* ─── Video player component ──────────────────────────────────── */
function ReelVideo({
  videoUrl, thumbnailUrl, isActive,
  muted, onTap,
}: {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  isActive: boolean;
  muted: boolean;
  onTap: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);

  /* When this reel becomes active, reset + play */
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      setLoading(true);
      setPaused(false);
      setError(false);
      v.play().catch(() => setPaused(true));
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive]);

  /* Sync muted */
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  const handleTap = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    onTap();
  }, [onTap]);

  if (!videoUrl) {
    /* Fallback: only thumbnail */
    return (
      <div className="absolute inset-0 cursor-pointer" onClick={handleTap}>
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-violet-900 via-blue-900 to-background" />
        }
      </div>
    );
  }

  return (
    <div className="absolute inset-0 cursor-pointer" onClick={handleTap}>
      <video
        ref={ref}
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        preload="auto"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); setPaused(false); }}
        onError={() => { setError(true); setLoading(false); }}
      />
      {/* Buffering spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none gap-3">
          {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover -z-10" />}
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
          <p className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">Video mavjud emas</p>
        </div>
      )}
      {/* Paused indicator (momentary) */}
      <AnimatePresence>
        {paused && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Pause className="w-8 h-8 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: reels = [], isLoading } = useListReels();
  const [current, setCurrent] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const likeReel = useLikeReel();
  const qc = useQueryClient();

  const [analysisMap, setAnalysisMap] = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<number | null>(null);

  const reel = reels[current];

  useEffect(() => {
    if (reel) logInteraction(reel.id, "view");
  }, [current, reel?.id]);

  async function logInteraction(contentId: number, interactionType: string) {
    try {
      await fetch(`${API}/api/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentType: "reel", contentId, interactionType }),
      });
    } catch { /* silent */ }
  }

  const handleLike = (reelId: number) => {
    const newSet = new Set(likedIds);
    if (newSet.has(reelId)) newSet.delete(reelId); else newSet.add(reelId);
    setLikedIds(newSet);
    likeReel.mutate({ id: reelId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListReelsQueryKey() }),
    });
    logInteraction(reelId, "like");
  };

  const analyzeReel = async (reelId: number, caption?: string, thumbnailUrl?: string) => {
    if (analysisMap[reelId]) { setShowAnalysisId(reelId); return; }
    setAnalyzingId(reelId);
    try {
      const r = await fetch(`${API}/api/ai/analyze-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contentId: reelId, contentType: "reel", caption: caption || "", imageUrl: thumbnailUrl || undefined }),
      });
      if (r.ok) {
        const data = await r.json();
        setAnalysisMap(prev => ({ ...prev, [reelId]: data }));
        setShowAnalysisId(reelId);
      }
    } catch { /* silent */ } finally { setAnalyzingId(null); }
  };

  /* Keyboard nav */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setCurrent(c => Math.max(0, c - 1));
      if (e.key === "ArrowDown") setCurrent(c => Math.min(reels.length - 1, c + 1));
      if (e.key === "m") setMuted(v => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.length]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-6">
      <div className="relative w-full max-w-sm mx-auto">
        {isLoading ? (
          <div className="aspect-[9/16] bg-card rounded-3xl animate-pulse border border-border" />
        ) : reels.length === 0 ? (
          <div className="aspect-[9/16] bg-card rounded-3xl border border-border flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <span className="text-4xl">🎬</span>
            <p className="text-sm">Hali reel yo'q</p>
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              <Plus className="w-4 h-4" /> Birinchi reelni qo'shish
            </button>
          </div>
        ) : reel && (
          <AnimatePresence mode="wait">
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-border bg-black"
            >
              {/* ── Video / thumbnail ── */}
              <ReelVideo
                videoUrl={reel.videoUrl}
                thumbnailUrl={reel.thumbnailUrl}
                isActive={true}
                muted={muted}
                onTap={() => {}}
              />

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* ── Top controls ── */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                {/* Mute toggle */}
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setMuted(v => !v)}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 pointer-events-auto">
                  {muted
                    ? <VolumeX className="w-4 h-4 text-white" />
                    : <Volume2 className="w-4 h-4 text-white" />
                  }
                </motion.button>

                {/* AI Analyze */}
                <motion.button whileTap={{ scale: 0.9 }}
                  onClick={() => analyzeReel(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined)}
                  disabled={analyzingId === reel.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white text-xs font-semibold border border-white/10 pointer-events-auto">
                  {analyzingId === reel.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                  }
                  AI Tahlil
                </motion.button>
              </div>

              {/* Progress dots */}
              <div className="absolute top-[52px] left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
                {reels.slice(0, Math.min(reels.length, 8)).map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full transition-all duration-300 ${i === current ? "w-4 bg-white" : "w-1 bg-white/30"}`} />
                ))}
              </div>

              {/* AI Analysis panel */}
              <AnimatePresence>
                {showAnalysisId === reel.id && analysisMap[reel.id] && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-x-3 bottom-24 z-10">
                    <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xs text-white font-semibold">AI Tahlil</span>
                          {analysisMap[reel.id]?.category && (
                            <span className="px-1.5 py-0.5 rounded-md bg-violet-500/30 text-violet-300 text-[10px] font-semibold">
                              {analysisMap[reel.id].category}
                            </span>
                          )}
                        </div>
                        <button onClick={() => setShowAnalysisId(null)}>
                          <X className="w-4 h-4 text-white/60 hover:text-white" />
                        </button>
                      </div>
                      {analysisMap[reel.id]?.summary && (
                        <p className="text-[11px] text-white/80 leading-relaxed">{analysisMap[reel.id].summary}</p>
                      )}
                      {analysisMap[reel.id]?.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {analysisMap[reel.id].tags!.map(tag => (
                            <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px]">
                              <Tag className="w-2.5 h-2.5" />#{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {analysisMap[reel.id]?.sentiment && (
                        <p className={`text-[10px] font-semibold ${SENTIMENT_COLOR[analysisMap[reel.id].sentiment!] ?? "text-muted-foreground"}`}>
                          {SENTIMENT_LABEL[analysisMap[reel.id].sentiment!] ?? analysisMap[reel.id].sentiment}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Bottom info ── */}
              <div className="absolute bottom-0 left-0 right-12 p-5 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 overflow-hidden flex-shrink-0 border border-white/20">
                    {reel.author.avatarUrl
                      ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">{reel.author.displayName?.[0]}</div>
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white font-semibold text-sm truncate">{reel.author.displayName}</span>
                      {reel.author.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <span className="text-white/60 text-xs">@{reel.author.username}</span>
                  </div>
                </div>
                {reel.caption && (
                  <p className="text-white text-sm leading-relaxed line-clamp-2 mb-2">{reel.caption}</p>
                )}
                {(reel.audioTrack || reel.tags?.length) ? (
                  <div className="flex items-center gap-1.5">
                    {reel.audioTrack && (
                      <span className="flex items-center gap-1 text-white/70 text-xs">
                        <Music className="w-3 h-3" /> {reel.audioTrack}
                      </span>
                    )}
                    {reel.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="text-white/50 text-xs">#{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* ── Right action sidebar ── */}
              <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5 z-10">
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 group">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedIds.has(reel.id) ? "bg-red-500 shadow-lg shadow-red-500/40" : "bg-black/40 group-hover:bg-black/60"}`}>
                    <Heart className={`w-5 h-5 transition-all ${likedIds.has(reel.id) ? "text-white fill-white scale-110" : "text-white"}`} />
                  </div>
                  <span className="text-white text-xs font-semibold">{(reel.likesCount ?? 0) + (likedIds.has(reel.id) ? 1 : 0)}</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1 group">
                  <div className="w-11 h-11 rounded-full bg-black/40 group-hover:bg-black/60 flex items-center justify-center transition-colors">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">{reel.commentsCount ?? 0}</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1 group" onClick={() => logInteraction(reel.id, "share")}>
                  <div className="w-11 h-11 rounded-full bg-black/40 group-hover:bg-black/60 flex items-center justify-center transition-colors">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">Ulash</span>
                </motion.button>

                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setCreateOpen(true)}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </motion.button>
              </div>

              {/* ── Up/Down nav ── */}
              <div className="absolute left-3 bottom-16 flex flex-col gap-2 z-10">
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}
                  className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition-colors">
                  <ChevronUp className="w-5 h-5 text-white" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setCurrent(Math.min(reels.length - 1, current + 1))} disabled={current === reels.length - 1}
                  className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition-colors">
                  <ChevronDown className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
