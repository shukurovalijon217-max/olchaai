import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, ChevronUp, ChevronDown,
  Plus, Sparkles, Tag, Brain, X, Loader2,
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

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useListReels();
  const [current, setCurrent] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const likeReel = useLikeReel();
  const qc = useQueryClient();

  const [analysisMap, setAnalysisMap] = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<number | null>(null);

  const reel = reels[current];

  useEffect(() => {
    if (reel) {
      logInteraction(reel.id, "view");
    }
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
        body: JSON.stringify({
          contentId: reelId,
          contentType: "reel",
          caption: caption || "",
          imageUrl: thumbnailUrl || undefined,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        setAnalysisMap(prev => ({ ...prev, [reelId]: data }));
        setShowAnalysisId(reelId);
      }
    } catch { /* silent */ } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-6">
      <div className="relative w-full max-w-sm mx-auto">
        {isLoading ? (
          <div className="aspect-[9/16] bg-card rounded-3xl animate-pulse border border-border" />
        ) : reels.length === 0 ? (
          <div className="aspect-[9/16] bg-card rounded-3xl border border-border flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <span className="text-4xl">🎬</span>
            <p className="text-sm">No reels yet</p>
          </div>
        ) : reel && (
          <AnimatePresence mode="wait">
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-border bg-card"
              style={{
                background: reel.thumbnailUrl
                  ? `url(${reel.thumbnailUrl}) center/cover`
                  : "linear-gradient(135deg, hsl(252 100% 15%), hsl(280 60% 10%))"
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* AI Analyze button */}
              <div className="absolute top-4 right-4 z-10">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => analyzeReel(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined)}
                  disabled={analyzingId === reel.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/70 transition-colors border border-white/10"
                >
                  {analyzingId === reel.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                  )}
                  AI Tahlil
                </motion.button>
              </div>

              {/* AI Analysis panel */}
              <AnimatePresence>
                {showAnalysisId === reel.id && analysisMap[reel.id] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-x-0 bottom-20 z-10 mx-3"
                  >
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
                      {analysisMap[reel.id]?.tags && analysisMap[reel.id].tags!.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {analysisMap[reel.id].tags!.map(tag => (
                            <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px]">
                              <Tag className="w-2.5 h-2.5" />#{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {analysisMap[reel.id]?.sentiment && (
                        <p className={`text-[10px] font-semibold ${SENTIMENT_COLOR[analysisMap[reel.id].sentiment!] ?? "text-muted-foreground"}`}>
                          {SENTIMENT_LABEL[analysisMap[reel.id].sentiment!] ?? analysisMap[reel.id].sentiment}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-12 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 overflow-hidden flex-shrink-0">
                    {reel.author.avatarUrl ? (
                      <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                        {reel.author.displayName?.[0]}
                      </div>
                    )}
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

              {/* Right actions */}
              <div className="absolute right-3 bottom-16 flex flex-col items-center gap-5">
                <button
                  onClick={() => handleLike(reel.id)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${likedIds.has(reel.id) ? "bg-red-500" : "bg-black/30 group-hover:bg-black/50"}`}>
                    <Heart className={`w-5 h-5 transition-all ${likedIds.has(reel.id) ? "text-white fill-white" : "text-white"}`} />
                  </div>
                  <span className="text-white text-xs font-semibold">{(reel.likesCount ?? 0) + (likedIds.has(reel.id) ? 1 : 0)}</span>
                </button>

                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-11 h-11 rounded-full bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">{reel.commentsCount ?? 0}</span>
                </button>

                <button className="flex flex-col items-center gap-1 group" onClick={() => logInteraction(reel.id, "share")}>
                  <div className="w-11 h-11 rounded-full bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">Ulash</span>
                </button>

                <button
                  onClick={() => setCreateOpen(true)}
                  className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>

              {/* Up/Down nav */}
              <div className="absolute left-3 bottom-16 flex flex-col gap-2">
                <button
                  onClick={() => setCurrent(Math.max(0, current - 1))}
                  disabled={current === 0}
                  className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center disabled:opacity-30 hover:bg-black/50 transition-colors"
                >
                  <ChevronUp className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setCurrent(Math.min(reels.length - 1, current + 1))}
                  disabled={current === reels.length - 1}
                  className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center disabled:opacity-30 hover:bg-black/50 transition-colors"
                >
                  <ChevronDown className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Progress dots */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
                {reels.slice(0, Math.min(reels.length, 8)).map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1 bg-white/30"}`} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
