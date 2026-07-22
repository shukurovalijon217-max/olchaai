import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, MessageCircle, Send, Bookmark,
  ChevronLeft, ChevronRight, Trash2, MoreVertical, Volume2, VolumeX,
} from "lucide-react";

interface StoryItem {
  id: number;
  mediaUrl?: string | null;
  caption?: string | null;
  authorId?: number;
  author?: { id?: number; displayName?: string; avatarUrl?: string | null; username?: string };
  createdAt?: string;
}

interface Props {
  storyGroups: StoryItem[][];
  groupIdx: number;
  storyIdx: number;
  userId?: number;
  onClose: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
  onNextStory: () => void;
  onPrevStory: () => void;
  onDelete?: () => void;
  STORY_DURATION?: number;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function StoryViewer({
  storyGroups, groupIdx, storyIdx, userId,
  onClose, onNextGroup, onPrevGroup, onNextStory, onPrevStory, onDelete,
  STORY_DURATION = 6,
}: Props) {
  const activeGroup = storyGroups[groupIdx] ?? [];
  const story = activeGroup[storyIdx] ?? null;

  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [heartBurst, setHeartBurst] = useState(false);
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goNextRef = useRef(() => {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOwner = userId != null && story?.authorId === userId;
  const isVideo = story?.mediaUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);

  const goNext = useCallback(() => {
    if (storyIdx < activeGroup.length - 1) { onNextStory(); }
    else { onNextGroup(); }
  }, [storyIdx, activeGroup.length, onNextStory, onNextGroup]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { onPrevStory(); }
    else { onPrevGroup(); }
  }, [storyIdx, onPrevStory, onPrevGroup]);

  useEffect(() => { goNextRef.current = goNext; }, [goNext]);

  useEffect(() => {
    setElapsed(0);
    setPaused(false);
    setImgLoaded(false);
    setLiked(false);
    setSaved(false);
    setLikeCount(0);
    setShowReply(false);
  }, [storyIdx, groupIdx]);

  useEffect(() => {
    if (!story || paused || showReply) {
      timerRef.current && clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(p => {
        const n = p + 0.05;
        if (n >= STORY_DURATION) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          goNextRef.current();
          return STORY_DURATION;
        }
        return n;
      });
    }, 50);
    return () => { timerRef.current && clearInterval(timerRef.current); };
  }, [story, paused, showReply, STORY_DURATION]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const handleLike = () => {
    if (!liked) {
      setHeartBurst(true);
      setLikeCount(c => c + 1);
      setTimeout(() => setHeartBurst(false), 900);
    } else {
      setLikeCount(c => Math.max(0, c - 1));
    }
    setLiked(l => !l);
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    setReplyText("");
    setShowReply(false);
  };

  if (!story) return null;

  const author = story.author;
  const progressFrac = Math.min(elapsed / STORY_DURATION, 1);

  return (
    <motion.div
      key={`sv-${groupIdx}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[220] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.96)" }}
    >
      {/* ── Story card — max phone width, full height ── */}
      <div
        className="relative w-full max-w-[420px] h-full overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button, input, textarea")) return;
          setPaused(true);
        }}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        {/* ─── BACKGROUND MEDIA ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`media-${groupIdx}-${storyIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {story.mediaUrl ? (
              isVideo ? (
                <video
                  ref={videoRef}
                  src={story.mediaUrl}
                  autoPlay
                  loop={false}
                  muted={muted}
                  playsInline
                  className="w-full h-full object-cover"
                  onCanPlay={() => setImgLoaded(true)}
                />
              ) : (
                <>
                  {!imgLoaded && (
                    <div className="absolute inset-0 z-10 animate-pulse"
                      style={{ background: "linear-gradient(160deg,#1a0830,#0a1020)" }} />
                  )}
                  <img
                    src={story.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    fetchPriority="high"
                    onLoad={() => setImgLoaded(true)}
                    onError={(e) => {
                      setImgLoaded(true);
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </>
              )
            ) : (
              <div
                className="w-full h-full flex items-center justify-center px-10"
                style={{
                  background: `linear-gradient(160deg,
                    hsl(${(groupIdx * 47 + storyIdx * 23) % 360},70%,15%) 0%,
                    hsl(${(groupIdx * 47 + storyIdx * 23 + 80) % 360},60%,10%) 100%)`
                }}
              >
                <p className="text-white text-2xl font-bold text-center leading-snug"
                  style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                  {story.caption || "✨"}
                </p>
              </div>
            )}

            {/* Dark gradient overlays */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 60%, rgba(0,0,0,0.75) 100%)"
              }} />
          </motion.div>
        </AnimatePresence>

        {/* ─── TOP BAR: progress + avatar + controls ─── */}
        <div className="absolute top-0 left-0 right-0 z-30 px-3 pt-3 pb-2"
          style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}>

          {/* Progress segments */}
          <div className="flex gap-[3px] mb-3">
            {activeGroup.map((_, i) => (
              <div key={i} className="flex-1 h-[2.5px] rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.25)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    width: i < storyIdx ? "100%"
                      : i === storyIdx ? `${progressFrac * 100}%`
                        : "0%",
                  }}
                  transition={{ duration: 0 }}
                />
              </div>
            ))}
          </div>

          {/* Author row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden border-[1.5px] border-white/80 flex-shrink-0 shadow-lg">
                {author?.avatarUrl ? (
                  <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                    {author?.displayName?.[0] ?? "?"}
                  </div>
                )}
              </div>

              <div>
                <p className="text-white text-[13px] font-semibold leading-tight"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
                  {author?.displayName ?? author?.username ?? "Foydalanuvchi"}
                </p>
                <p className="text-white/60 text-[11px] font-normal">
                  {timeAgo(story.createdAt)}
                  {paused && <span className="ml-1 text-white/40">• to'xtatildi</span>}
                </p>
              </div>
            </div>

            {/* Top right controls */}
            <div className="flex items-center gap-1">
              {isVideo && (
                <button onClick={() => setMuted(m => !m)}
                  className="p-2 rounded-full"
                  style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}>
                  {muted
                    ? <VolumeX className="w-4 h-4 text-white/80" />
                    : <Volume2 className="w-4 h-4 text-white/80" />
                  }
                </button>
              )}
              {isOwner && (
                <button onClick={onDelete}
                  className="p-2 rounded-full"
                  style={{ background: "rgba(180,0,0,0.35)", backdropFilter: "blur(10px)" }}>
                  <Trash2 className="w-4 h-4 text-red-300" />
                </button>
              )}
              <button onClick={onClose}
                className="p-2 rounded-full"
                style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)" }}>
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── TAP ZONES (prev / next) — excluding right action panel ─── */}
        <button
          className="absolute left-0 top-0 w-[38%] h-full z-20"
          onClick={goPrev}
          style={{ WebkitTapHighlightColor: "transparent" }}
        />
        <button
          className="absolute right-[72px] top-0 w-[38%] h-full z-20"
          onClick={goNext}
          style={{ WebkitTapHighlightColor: "transparent" }}
        />

        {/* ─── RIGHT FLOATING ACTION PANEL ─── */}
        <div className="absolute right-3 bottom-28 z-30 flex flex-col gap-3 items-center">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: liked ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: liked ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: liked ? "0 0 20px rgba(239,68,68,0.4)" : "0 4px 16px rgba(0,0,0,0.3)",
              }}>
              <motion.div
                animate={liked ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.45 }}>
                <Heart className="w-5 h-5"
                  style={{ color: liked ? "#ef4444" : "rgba(255,255,255,0.85)", fill: liked ? "#ef4444" : "none" }} />
              </motion.div>
              {/* Heart burst particles */}
              <AnimatePresence>
                {heartBurst && [0,60,120,180,240,300].map(angle => (
                  <motion.div
                    key={angle}
                    className="absolute w-1.5 h-1.5 rounded-full bg-red-400"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle * Math.PI / 180) * 22,
                      y: Math.sin(angle * Math.PI / 180) * 22,
                      opacity: 0, scale: 0,
                    }}
                    exit={{}}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>
            </div>
            <span className="text-white/80 text-[10px] font-semibold"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {likeCount}
            </span>
          </motion.button>

          {/* Reply */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setShowReply(r => !r); setTimeout(() => inputRef.current?.focus(), 100); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: showReply ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: showReply ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>
              <MessageCircle className="w-5 h-5"
                style={{ color: showReply ? "#818cf8" : "rgba(255,255,255,0.85)" }} />
            </div>
            <span className="text-white/80 text-[10px] font-semibold"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>Javob</span>
          </motion.button>

          {/* Share */}
          <motion.button whileTap={{ scale: 0.85 }}
            className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>
              <Send className="w-5 h-5 text-white/85" style={{ transform: "rotate(-30deg)" }} />
            </div>
            <span className="text-white/80 text-[10px] font-semibold"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>Ulash</span>
          </motion.button>

          {/* Bookmark */}
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={() => setSaved(s => !s)}
            className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: saved ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: saved ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.15)",
                boxShadow: saved ? "0 0 18px rgba(251,191,36,0.35)" : "0 4px 16px rgba(0,0,0,0.3)",
              }}>
              <motion.div
                animate={saved ? { rotate: [0, -15, 10, 0] } : { rotate: 0 }}
                transition={{ duration: 0.35 }}>
                <Bookmark className="w-5 h-5"
                  style={{ color: saved ? "#fbbf24" : "rgba(255,255,255,0.85)", fill: saved ? "#fbbf24" : "none" }} />
              </motion.div>
            </div>
            <span className="text-white/80 text-[10px] font-semibold"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>Saqlash</span>
          </motion.button>

          {/* Group nav indicators */}
          {storyGroups.length > 1 && (
            <div className="flex flex-col gap-1.5 mt-1">
              {groupIdx > 0 && (
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={onPrevGroup}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <ChevronLeft className="w-4 h-4 text-white/70" />
                </motion.button>
              )}
              {groupIdx < storyGroups.length - 1 && (
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={onNextGroup}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* ─── BOTTOM AREA: caption + reply input ─── */}
        <div className="absolute bottom-0 left-0 right-[72px] z-30 px-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 16px)" }}>

          {/* Caption */}
          {story.mediaUrl && story.caption && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3"
            >
              <p className="text-white/95 text-[14px] font-medium leading-relaxed"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                {story.caption}
              </p>
            </motion.div>
          )}

          {/* Reply input */}
          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 flex items-center rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <input
                    ref={inputRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleReply(); if (e.key === "Escape") setShowReply(false); }}
                    placeholder="Javob yozing..."
                    className="flex-1 bg-transparent px-4 py-3 text-white text-[13px] placeholder-white/40 outline-none"
                  />
                  <button onClick={handleReply}
                    className="pr-3 pl-1 py-3"
                    disabled={!replyText.trim()}>
                    <Send className="w-4 h-4 text-white/70 -rotate-30"
                      style={{ transform: "rotate(-30deg)", opacity: replyText.trim() ? 1 : 0.35 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── DOUBLE-TAP HEART overlay ─── */}
        <AnimatePresence>
          {heartBurst && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}>
              <motion.div
                initial={{ scale: 0.2, opacity: 1 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}>
                <Heart className="w-24 h-24 text-red-500" style={{ fill: "#ef4444" }} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PAUSE indicator ─── */}
        <AnimatePresence>
          {paused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
                <div className="flex gap-1.5">
                  <div className="w-[4px] h-6 rounded-full bg-white/80" />
                  <div className="w-[4px] h-6 rounded-full bg-white/80" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Left / Right story group nav arrows (desktop) ─── */}
      {groupIdx > 0 && (
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={onPrevGroup}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center z-30"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </motion.button>
      )}
      {groupIdx < storyGroups.length - 1 && (
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={onNextGroup}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center z-30"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <ChevronRight className="w-5 h-5 text-white" />
        </motion.button>
      )}
    </motion.div>
  );
}
