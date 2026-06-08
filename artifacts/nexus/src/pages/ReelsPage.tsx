import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Music, BadgeCheck, ChevronUp, ChevronDown } from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useListReels();
  const [current, setCurrent] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const likeReel = useLikeReel();
  const qc = useQueryClient();

  const handleLike = (reelId: number) => {
    const newSet = new Set(likedIds);
    if (newSet.has(reelId)) newSet.delete(reelId); else newSet.add(reelId);
    setLikedIds(newSet);
    likeReel.mutate({ id: reelId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListReelsQueryKey() }),
    });
  };

  const reel = reels[current];

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

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-12 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 overflow-hidden flex-shrink-0">
                    {reel.author.avatarUrl ? (
                      <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{reel.author.displayName?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-bold">{reel.author.displayName}</span>
                  {reel.author.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                  <button className="ml-1 px-2.5 py-0.5 border border-white/60 rounded-full text-white text-xs font-semibold">
                    Follow
                  </button>
                </div>
                <p className="text-white text-sm leading-snug line-clamp-2 mb-2">{reel.caption}</p>
                {reel.audioTrack && (
                  <div className="flex items-center gap-1.5 text-white/70 text-xs">
                    <Music className="w-3 h-3" />
                    <span>{reel.audioTrack}</span>
                  </div>
                )}
              </div>

              {/* Right actions */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handleLike(reel.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${likedIds.has(reel.id) ? "bg-pink-500/30" : "bg-black/40"}`}>
                    <Heart className={`w-5 h-5 ${likedIds.has(reel.id) ? "text-pink-400 fill-current" : "text-white"}`} />
                  </div>
                  <span className="text-white text-xs font-semibold">{(reel.likesCount + (likedIds.has(reel.id) ? 1 : 0))}</span>
                </motion.button>
                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">{reel.commentsCount}</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">Share</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation arrows */}
        {reels.length > 1 && (
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <button
              onClick={() => setCurrent(Math.max(0, current - 1))}
              disabled={current === 0}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent(Math.min(reels.length - 1, current + 1))}
              disabled={current === reels.length - 1}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dots indicator */}
        {reels.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {reels.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
