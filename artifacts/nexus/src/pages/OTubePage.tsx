import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useListReels } from "@workspace/api-client-react";
import type { FeedItem } from "@workspace/api-client-react";
import {
  Play, Pause, Volume2, VolumeX, ArrowLeft, Search,
  Eye, Heart, Share2, ChevronRight, Film, Music2,
  Gamepad2, Zap, Sparkles, TrendingUp, Globe, Check,
} from "lucide-react";

/* ─── helpers ──────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

const NEON = "#a855f7";
const NEON2 = "#06b6d4";

const CATS = [
  { id: "all",      label: "Barchasi",  Icon: Globe },
  { id: "trending", label: "Trend",     Icon: TrendingUp },
  { id: "cinema",   label: "Kino",      Icon: Film },
  { id: "music",    label: "Musiqa",    Icon: Music2 },
  { id: "gaming",   label: "Gaming",    Icon: Gamepad2 },
  { id: "ai",       label: "AI",        Icon: Sparkles },
  { id: "live",     label: "Live",      Icon: Zap },
];

/* ─── Seek Flash ──────────────────────────────────────── */
function SeekFlash({ side, show }: { side: "left"|"right"; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-0 ${side === "left" ? "left-0" : "right-0"} bottom-0 w-1/3 flex items-center justify-center pointer-events-none`}
          style={{ background: side === "left"
            ? "radial-gradient(ellipse at left,rgba(168,85,247,0.22),transparent 70%)"
            : "radial-gradient(ellipse at right,rgba(6,182,212,0.22),transparent 70%)" }}
        >
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 28, color: "white", opacity: 0.8 }}>
              {side === "left" ? "⏪" : "⏩"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.65)" }}>
              {side === "left" ? "-10s" : "+10s"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── NEXUS CINEMA Player ─────────────────────────────── */
function NexusPlayer({ video, onClose }: { video: FeedItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing,      setPlaying]      = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [showCtrl,     setShowCtrl]     = useState(true);
  const [liked,        setLiked]        = useState(false);
  const [shared,       setShared]       = useState(false);
  const [seekLeft,     setSeekLeft]     = useState(false);
  const [seekRight,    setSeekRight]    = useState(false);
  const ctrlTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTap      = useRef(0);
  const tapTimer     = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    return () => {
      if (ctrlTimer.current)  clearTimeout(ctrlTimer.current);
      if (tapTimer.current)   clearTimeout(tapTimer.current);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const resetCtrl = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowCtrl(false), 2600);
  }, []);

  useEffect(() => { resetCtrl(); }, [resetCtrl]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
    resetCtrl();
  }, [resetCtrl]);

  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";

    if (now - lastTap.current < 300) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      const v = videoRef.current;
      if (v) {
        v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + (side === "right" ? 10 : -10)));
      }
      if (side === "left") { setSeekLeft(true); setTimeout(() => setSeekLeft(false), 600); }
      else { setSeekRight(true); setTimeout(() => setSeekRight(false), 600); }
      lastTap.current = 0;
      resetCtrl();
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      togglePlay();
      lastTap.current = 0;
    }, 310);
  }, [togglePlay, resetCtrl]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = Number(e.target.value);
    if (v && isFinite(v.duration)) {
      v.currentTime = val * v.duration;
      setProgress(val);
      setCurrentTime(v.currentTime);
    }
    resetCtrl();
  }, [resetCtrl]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: video.title || "OTube", url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* silent */ }
    setShared(true);
    setTimeout(() => setShared(false), 1800);
    resetCtrl();
  }, [video.title, resetCtrl]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "#000" }}
      onMouseMove={resetCtrl}
      onTouchStart={resetCtrl}
    >
      {/* ── VIDEO ── */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={video.videoUrl ?? undefined}
          poster={video.thumbnailUrl ?? undefined}
          muted={muted}
          playsInline
          loop
          style={{ objectFit: "contain", width: "100%", height: "100%", maxWidth: "100vw", maxHeight: "100vh" }}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (v && !isNaN(v.duration)) {
              setCurrentTime(v.currentTime);
              setProgress(v.duration > 0 ? v.currentTime / v.duration : 0);
            }
          }}
          onLoadedMetadata={() => { setDuration(videoRef.current?.duration ?? 0); }}
          onEnded={() => setPlaying(false)}
        />

        {/* seek flash */}
        <SeekFlash side="left"  show={seekLeft}  />
        <SeekFlash side="right" show={seekRight} />
      </div>

      {/* ── CONTROLS ── */}
      <AnimatePresence>
        {showCtrl && (
          <motion.div
            key="controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* TOP */}
            <div
              className="absolute top-0 left-0 right-0 pointer-events-auto z-10"
              style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.76) 0%,transparent 100%)",
                padding: "16px 16px 32px" }}
            >
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.84 }}
                  onClick={e => { e.stopPropagation(); onClose(); }}
                  style={{ width: 42, height: 42, borderRadius: "50%",
                    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(14px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0 }}
                >
                  <ArrowLeft className="w-5 h-5 text-white"/>
                </motion.button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-[14px] leading-tight truncate">
                    {video.title || "OTube Video"}
                  </p>
                  <p className="text-white/45 text-[11px] truncate mt-0.5">
                    {video.author?.displayName ?? "OlCha"} · {fmt(video.viewsCount ?? 0)} ko'rish
                  </p>
                </div>
                {/* Like */}
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
                  style={{ width: 42, height: 42, borderRadius: "50%",
                    background: liked ? "rgba(239,68,68,0.28)" : "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(14px)",
                    border: liked ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0 }}
                >
                  <Heart style={{ width: 18, height: 18,
                    fill: liked ? "#f87171" : "none",
                    color: liked ? "#f87171" : "rgba(255,255,255,0.8)" }}/>
                </motion.button>
                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); void handleShare(); }}
                  style={{ width: 42, height: 42, borderRadius: "50%",
                    background: shared ? "rgba(16,185,129,0.28)" : "rgba(0,0,0,0.45)",
                    backdropFilter: "blur(14px)",
                    border: shared ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0 }}
                >
                  {shared
                    ? <Check className="w-4.5 h-4.5 text-emerald-400"/>
                    : <Share2 className="w-4 h-4 text-white/80"/>
                  }
                </motion.button>
              </div>
            </div>

            {/* CENTER: big play/pause */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {!playing && (
                  <motion.div
                    key="pause-icon"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.35 }}
                    transition={{ duration: 0.14 }}
                    style={{ width: 76, height: 76, borderRadius: "50%",
                      background: "rgba(0,0,0,0.52)", backdropFilter: "blur(18px)",
                      border: "1.5px solid rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 32px ${NEON}44` }}
                  >
                    <Play style={{ width: 30, height: 30, fill: "white", color: "white", marginLeft: 4 }}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BOTTOM */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-auto z-10"
              style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 100%)",
                padding: "40px 16px 20px" }}
            >
              {/* Progress scrubber */}
              <div className="relative flex items-center mb-3 h-4"
                onClick={e => e.stopPropagation()}>
                {/* Track */}
                <div className="absolute left-0 right-0 h-[3px] rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ width: `${progress * 100}%`,
                      background: `linear-gradient(90deg,${NEON},${NEON2})` }}/>
                </div>
                {/* Thumb */}
                <div className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full pointer-events-none"
                  style={{ left: `calc(${progress * 100}% - 7px)`,
                    background: "white",
                    boxShadow: `0 0 10px ${NEON}aa, 0 2px 4px rgba(0,0,0,0.5)` }}/>
                {/* Range input */}
                <input type="range" min={0} max={1} step={0.001}
                  value={progress}
                  onChange={handleScrub}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ height: "100%" }}
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-2.5">
                {/* Play/Pause */}
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={togglePlay}
                  style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg,${NEON}cc,#6366f1cc)`,
                    boxShadow: `0 0 22px ${NEON}55`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {playing
                    ? <Pause  style={{ width: 19, height: 19, fill: "white", color: "white" }}/>
                    : <Play   style={{ width: 19, height: 19, fill: "white", color: "white", marginLeft: 2 }}/>
                  }
                </motion.button>

                {/* Time */}
                <span className="text-white/55 text-[11px] font-mono flex-shrink-0 tabular-nums">
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>

                <div className="flex-1"/>

                {/* Volume */}
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
                  style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: muted ? "rgba(255,255,255,0.07)" : `${NEON}22`,
                    border: muted ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${NEON}44`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {muted
                    ? <VolumeX className="w-4 h-4 text-white/40"/>
                    : <Volume2 className="w-4 h-4 text-white/80"/>
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Hero Featured Card ──────────────────────────────── */
function HeroCard({ video, onPlay }: { video: FeedItem; onPlay: (v: FeedItem) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22 }}
      className="relative rounded-[22px] overflow-hidden cursor-pointer"
      style={{ background: "linear-gradient(135deg,rgba(20,8,50,0.95),rgba(8,6,22,0.98))",
        border: `1px solid ${NEON}22`,
        boxShadow: `0 0 64px ${NEON}0e, 0 20px 56px rgba(0,0,0,0.72)` }}
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: "21/9" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title ?? ""} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
              <Film className="w-16 h-16 text-white/10"/>
            </div>
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ width: 76, height: 76, borderRadius: "50%",
              background: `linear-gradient(135deg,${NEON}e0,#6366f1e0)`,
              boxShadow: `0 0 48px ${NEON}66, 0 0 96px ${NEON}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.25)" }}
          >
            <Play style={{ width: 30, height: 30, fill: "white", color: "white", marginLeft: 4 }}/>
          </motion.div>
        </div>
        {/* Featured badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: `${NEON}d8`, backdropFilter: "blur(8px)" }}>
          <Sparkles className="w-2.5 h-2.5 text-white"/>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Tanlangan</span>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 52%)" }}/>
      </div>
      {/* Info */}
      <div className="p-4 pb-3">
        <h2 className="text-white font-black text-[16px] leading-tight mb-2.5 line-clamp-2">
          {video.title || "OlCha eng yaxshi videosi"}
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `1.5px solid ${NEON}55`,
              background: "linear-gradient(135deg,#7c3aed,#1d4ed8)" }}>
            {video.author?.avatarUrl && <img src={video.author.avatarUrl} alt="" className="w-full h-full object-cover"/>}
          </div>
          <span className="text-white/60 text-[11px] font-bold flex-1 truncate">
            {video.author?.displayName ?? "OlCha"}
          </span>
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-white/30"/>
            <span className="text-white/35 text-[10px] tabular-nums">{fmt(video.viewsCount ?? 0)}</span>
            <Heart className="w-3 h-3 text-white/30 ml-1"/>
            <span className="text-white/35 text-[10px] tabular-nums">{fmt(video.likesCount ?? 0)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Small Video Card ────────────────────────────────── */
function VideoCard({ video, onPlay, index }: { video: FeedItem; onPlay: (v: FeedItem) => void; index: number }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", damping: 20 }}
      className="relative rounded-[16px] overflow-hidden cursor-pointer"
      style={{ background: "linear-gradient(135deg,rgba(16,8,36,0.95),rgba(8,5,20,0.98))",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.55)" }}
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title ?? ""} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
              <Film className="w-8 h-8 text-white/15"/>
            </div>
        }
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div style={{ width: 38, height: 38, borderRadius: "50%",
            background: `${NEON}bb`, backdropFilter: "blur(8px)",
            boxShadow: `0 0 20px ${NEON}66`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play style={{ width: 16, height: 16, fill: "white", color: "white", marginLeft: 2 }}/>
          </div>
        </div>
        {/* permanent subtle play badge */}
        <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)" }}>
          <Play style={{ width: 11, height: 11, fill: "rgba(255,255,255,0.75)", color: "rgba(255,255,255,0.75)", marginLeft: 1 }}/>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 45%)" }}/>
      </div>
      {/* Info */}
      <div className="p-2.5">
        <p className="text-white font-bold text-[11px] leading-snug mb-1.5 line-clamp-2">
          {video.title || "Video"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/38 text-[9.5px] truncate max-w-[80px]">
            {video.author?.displayName ?? "OlCha"}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Eye style={{ width: 9, height: 9, color: "rgba(255,255,255,0.28)" }}/>
              <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.28)", fontWeight: 700 }}>
                {fmt(video.viewsCount ?? 0)}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.7 }}
              onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
              className="flex items-center gap-0.5"
            >
              <Heart style={{ width: 9, height: 9,
                fill: liked ? "#f87171" : "none",
                color: liked ? "#f87171" : "rgba(255,255,255,0.28)" }}/>
              <span style={{ fontSize: 8.5, fontWeight: 700,
                color: liked ? "#fca5a5" : "rgba(255,255,255,0.28)" }}>
                {fmt((video.likesCount ?? 0) + (liked ? 1 : 0))}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Horizontal Reel Strip ───────────────────────────── */
function HorizCard({ video, onPlay, index }: { video: FeedItem; onPlay: (v: FeedItem) => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: "spring", damping: 22 }}
      className="relative flex-shrink-0 rounded-[14px] overflow-hidden cursor-pointer"
      style={{ width: 155, background: "rgba(12,6,28,0.97)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.55)" }}
      onClick={() => onPlay(video)}
    >
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title ?? ""} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
              <Film className="w-6 h-6 text-white/15"/>
            </div>
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 30, height: 30, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play style={{ width: 11, height: 11, fill: "white", color: "white", marginLeft: 1.5 }}/>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.68),transparent 48%)" }}/>
      </div>
      <div className="p-2">
        <p className="text-white text-[10px] font-bold line-clamp-2 leading-snug">
          {video.title || "Video"}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Eye style={{ width: 9, height: 9, color: "rgba(255,255,255,0.28)" }}/>
          <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>
            {fmt(video.viewsCount ?? 0)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── OTubePage ───────────────────────────────────────── */
export default function OTubePage() {
  const [, navigate]       = useLocation();
  const [activeCategory,   setActiveCategory]   = useState("all");
  const [selectedVideo,    setSelectedVideo]     = useState<FeedItem|null>(null);
  const { data: reels = [], isLoading } = useListReels();

  /* swipe right → /reels */
  const touchX = useRef(0);
  const touchY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && dx < -70) {
      navigate("/reels");
    }
  }, [navigate]);

  const featured = reels[0] ?? null;
  const trending  = reels.slice(1, 7);
  const forYou    = reels.slice(1);

  return (
    <>
      <div
        className="h-full overflow-y-auto"
        style={{ background: "linear-gradient(180deg,#05030f 0%,#08041c 100%)", paddingBottom: 80 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ─── Header ─── */}
        <div className="sticky top-0 z-30 px-4 pt-4 pb-2.5"
          style={{ background: "rgba(5,3,15,0.88)",
            backdropFilter: "blur(22px) saturate(1.8)",
            WebkitBackdropFilter: "blur(22px) saturate(1.8)",
            borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

          <div className="flex items-center justify-between mb-3">
            {/* OTube logo */}
            <div className="flex items-center gap-2">
              <div style={{ width: 30, height: 30, borderRadius: 9,
                background: `linear-gradient(135deg,${NEON},#6366f1)`,
                boxShadow: `0 0 18px ${NEON}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0 }}>
                <Play style={{ width: 14, height: 14, fill: "white", color: "white", marginLeft: 2 }}/>
              </div>
              <span className="font-black text-[20px] leading-none tracking-tight"
                style={{ background: `linear-gradient(90deg,${NEON},${NEON2})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                OTube
              </span>
            </div>
            {/* Search */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              style={{ width: 38, height: 38, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Search className="w-4 h-4 text-white/55"/>
            </motion.button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {CATS.map(({ id, label, Icon }) => {
              const active = activeCategory === id;
              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setActiveCategory(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: active
                      ? `linear-gradient(135deg,${NEON}30,#6366f120)`
                      : "rgba(255,255,255,0.05)",
                    border: active
                      ? `1px solid ${NEON}55`
                      : "1px solid rgba(255,255,255,0.07)",
                    boxShadow: active ? `0 0 18px ${NEON}20` : "none",
                    transition: "all 0.18s",
                  }}>
                  <Icon style={{ width: 11, height: 11,
                    color: active ? "#c084fc" : "rgba(255,255,255,0.4)" }}/>
                  <span style={{ fontSize: 11, fontWeight: active ? 800 : 600,
                    color: active ? "#e9d5ff" : "rgba(255,255,255,0.45)",
                    lineHeight: 1 }}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="px-3 pt-4 space-y-7">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: `${NEON}44`, borderTopColor: NEON }}/>
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Film className="w-14 h-14 text-white/10"/>
              <p className="text-white/28 text-[13px]">Videolar hali yo'q</p>
            </div>
          ) : (
            <>
              {/* Featured hero */}
              {featured && <HeroCard video={featured} onPlay={setSelectedVideo}/>}

              {/* Trending horizontal */}
              {trending.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400"/>
                      <span className="text-white font-black text-[13px]">Trending</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-violet-400/55">
                      <span className="text-[11px]">Ko'proq</span>
                      <ChevronRight className="w-3 h-3"/>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-0.5"
                    style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                    {trending.map((v, i) => (
                      <HorizCard key={v.id} video={v} onPlay={setSelectedVideo} index={i}/>
                    ))}
                  </div>
                </section>
              )}

              {/* For You 2-col grid */}
              {forYou.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400"/>
                    <span className="text-white font-black text-[13px]">Siz uchun</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {forYou.map((v, i) => (
                      <VideoCard key={v.id} video={v} onPlay={setSelectedVideo} index={i}/>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* navigation dots — shows position in swipe chain */}
        <div className="flex items-center justify-center gap-2 py-8 pointer-events-none">
          {["Lenta","Reels","OTube"].map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div style={{ width: i === 2 ? 22 : 7, height: 7, borderRadius: 4,
                background: i === 2 ? NEON : "rgba(255,255,255,0.1)",
                boxShadow: i === 2 ? `0 0 10px ${NEON}77` : "none",
                transition: "all 0.3s" }}/>
              <span style={{ fontSize: 8, color: i === 2 ? "rgba(168,85,247,0.7)" : "rgba(255,255,255,0.2)",
                fontWeight: 700, letterSpacing: "0.05em" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Player */}
      <AnimatePresence>
        {selectedVideo && (
          <NexusPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)}/>
        )}
      </AnimatePresence>
    </>
  );
}
