/**
 * OTube — NEXUS SIGNAL ENGINE
 * Yangi avlod video kashfiyot platformasi
 */
import {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { useListReels } from "@workspace/api-client-react";
import type { Reel } from "@workspace/api-client-react";
import {
  Play, Pause, Volume2, VolumeX, ArrowLeft, Search, X,
  Eye, Heart, Share2, Check, Film, Music2, Gamepad2,
  Zap, Sparkles, TrendingUp, Globe, Settings, Bell,
  RotateCcw, Download, Captions, ChevronRight, ChevronDown,
  Maximize2, RefreshCw,
} from "lucide-react";

/* ─────────────────────────────────────────────────────── */
/* helpers                                                 */
/* ─────────────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n || 0);
}
function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────── */
/* Settings type                                           */
/* ─────────────────────────────────────────────────────── */
interface PlayerSettings {
  autoplay: boolean;
  loop: boolean;
  muteDefault: boolean;
  quality: "Auto" | "1080p" | "720p" | "480p" | "360p";
  cinemaMode: boolean;
  showTitle: boolean;
}
const DEFAULT_SETTINGS: PlayerSettings = {
  autoplay: true,
  loop: true,
  muteDefault: false,
  quality: "Auto",
  cinemaMode: false,
  showTitle: true,
};

/* ─────────────────────────────────────────────────────── */
/* OTube logo (unique SVG)                                 */
/* ─────────────────────────────────────────────────────── */
function OTubeMark({ size = 32 }: { size?: number }) {
  const id = "otg";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c026d3"/>
          <stop offset="50%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#0891b2"/>
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.08"/>
        </linearGradient>
        <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Outer hexagon */}
      <polygon
        points="24,3 42,12.5 42,31.5 24,41 6,31.5 6,12.5"
        fill={`url(#${id}b)`}
        stroke={`url(#${id}a)`}
        strokeWidth="1.6"
        filter={`url(#${id}g)`}
      />
      {/* Inner ring */}
      <circle cx="24" cy="22" r="11" stroke={`url(#${id}a)`} strokeWidth="1" fill="none" opacity="0.45"/>
      {/* Circuit lines */}
      <line x1="6" y1="22" x2="13" y2="22" stroke="#a855f7" strokeWidth="1" opacity="0.5"/>
      <line x1="35" y1="22" x2="42" y2="22" stroke="#06b6d4" strokeWidth="1" opacity="0.5"/>
      <circle cx="13" cy="22" r="1.5" fill="#a855f7" opacity="0.7"/>
      <circle cx="35" cy="22" r="1.5" fill="#06b6d4" opacity="0.7"/>
      {/* Signal dot top */}
      <circle cx="24" cy="3" r="2" fill="#c026d3" opacity="0.8"/>
      {/* Play arrow */}
      <path d="M20 16.5 L30.5 22 L20 27.5 Z" fill="white" opacity="0.95"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────── */
/* categories                                             */
/* ─────────────────────────────────────────────────────── */
const CATS = [
  { id: "all",      label: "Hammasi",   Icon: Globe,      color: "#a855f7" },
  { id: "trending", label: "Trend",     Icon: TrendingUp, color: "#f59e0b" },
  { id: "cinema",   label: "Kino",      Icon: Film,       color: "#ef4444" },
  { id: "music",    label: "Musiqa",    Icon: Music2,     color: "#06b6d4" },
  { id: "gaming",   label: "Gaming",    Icon: Gamepad2,   color: "#10b981" },
  { id: "ai",       label: "AI",        Icon: Sparkles,   color: "#f59e0b" },
  { id: "live",     label: "🔴 Live",   Icon: Zap,        color: "#ef4444" },
];

/* ─────────────────────────────────────────────────────── */
/* Seek flash overlay                                      */
/* ─────────────────────────────────────────────────────── */
function SeekFlash({ side, visible }: { side: "left"|"right"; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={side}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={`absolute top-0 ${side==="left"?"left-0":"right-0"} bottom-0 flex items-center justify-center pointer-events-none`}
          style={{ width: "35%",
            background: side==="left"
              ? "radial-gradient(ellipse at left, rgba(168,85,247,0.25), transparent 70%)"
              : "radial-gradient(ellipse at right, rgba(6,182,212,0.25), transparent 70%)" }}
        >
          <div className="flex flex-col items-center gap-1.5 mt-[-20px]">
            <span style={{ fontSize: 32 }}>{side==="left"?"⏪":"⏩"}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.7)" }}>
              {side==="left"?"-10s":"+10s"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────── */
/* NexusPlayer                                             */
/* ─────────────────────────────────────────────────────── */
function NexusPlayer({
  video, onClose, settings,
}: { video: Reel; onClose: () => void; settings: PlayerSettings }) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const ctrlTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTap     = useRef(0);
  const tapTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longHold    = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [playing,     setPlaying]     = useState(false);
  const [muted,       setMuted]       = useState(settings.muteDefault);
  const [progress,    setProgress]    = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [curTime,     setCurTime]     = useState(0);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [liked,       setLiked]       = useState(false);
  const [shared,      setShared]      = useState(false);
  const [seekLeft,    setSeekLeft]    = useState(false);
  const [seekRight,   setSeekRight]   = useState(false);
  const [fastFwd,     setFastFwd]     = useState(false);  // 2× speed on long-hold

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const v = videoRef.current;
    if (v && settings.autoplay) v.play().then(() => setPlaying(true)).catch(() => {});
    return () => { document.body.style.overflow = ""; };
  }, [settings.autoplay]);

  const resetCtrl = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowCtrl(false), 2800);
  }, []);

  useEffect(() => { resetCtrl(); return () => { if (ctrlTimer.current) clearTimeout(ctrlTimer.current); }; }, [resetCtrl]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else          { v.pause(); setPlaying(false); }
    resetCtrl();
  }, [resetCtrl]);

  const seek = useCallback((delta: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    if (delta < 0) { setSeekLeft(true);  setTimeout(() => setSeekLeft(false), 650); }
    else           { setSeekRight(true); setTimeout(() => setSeekRight(false), 650); }
    resetCtrl();
  }, [resetCtrl]);

  const handleVideoTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const side: "left"|"right" = e.clientX - rect.left < rect.width / 2 ? "left" : "right";

    if (now - lastTap.current < 320) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      seek(side === "right" ? 10 : -10);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => { togglePlay(); lastTap.current = 0; }, 330);
  }, [seek, togglePlay]);

  /* long-press = 2× speed */
  const startHold = useCallback(() => {
    longHold.current = setTimeout(() => {
      const v = videoRef.current; if (v) v.playbackRate = 2;
      setFastFwd(true);
    }, 500);
  }, []);
  const endHold = useCallback(() => {
    if (longHold.current) clearTimeout(longHold.current);
    const v = videoRef.current; if (v) v.playbackRate = 1;
    setFastFwd(false);
  }, []);

  const handleScrub = useCallback((val: number) => {
    const v = videoRef.current;
    if (v && isFinite(v.duration)) {
      v.currentTime = val * v.duration;
      setProgress(val);
      setCurTime(v.currentTime);
    }
    resetCtrl();
  }, [resetCtrl]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title: video.caption || "OTube", url: window.location.href });
      else                 await navigator.clipboard.writeText(window.location.href);
    } catch { /* silent */ }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [video.caption]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: settings.cinemaMode ? "#000" : "#020107" }}
      onMouseMove={resetCtrl} onTouchMove={resetCtrl}
    >
      {/* Video */}
      <div
        className="relative w-full h-full flex items-center justify-center select-none"
        onClick={handleVideoTap}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onMouseDown={startHold}
        onMouseUp={endHold}
      >
        <video
          ref={videoRef}
          src={video.videoUrl ?? undefined}
          poster={video.thumbnailUrl ?? undefined}
          muted={muted}
          playsInline
          loop={settings.loop}
          style={{ objectFit: "contain", width: "100%", height: "100%" }}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (v && isFinite(v.duration) && v.duration > 0) {
              setCurTime(v.currentTime);
              setProgress(v.currentTime / v.duration);
            }
          }}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
        <SeekFlash side="left"  visible={seekLeft}  />
        <SeekFlash side="right" visible={seekRight} />

        {/* 2× speed badge */}
        <AnimatePresence>
          {fastFwd && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ padding: "8px 20px", borderRadius: 12,
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", letterSpacing: "0.05em" }}>
                2× TEZLIK
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <AnimatePresence>
        {showCtrl && (
          <motion.div
            key="ctrls"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* TOP */}
            <div className="absolute top-0 inset-x-0 pointer-events-auto"
              style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)",
                padding: "16px 14px 36px" }}>
              <div className="flex items-center gap-2.5">
                <motion.button whileTap={{ scale: 0.84 }} onClick={onClose}
                  style={{ width: 42, height: 42, borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ArrowLeft className="w-5 h-5 text-white"/>
                </motion.button>
                <div className="flex-1 min-w-0">
                  {settings.showTitle && <>
                    <p className="text-white font-black text-[14px] truncate">{video.caption || "OTube Video"}</p>
                    <p className="text-white/40 text-[11px] truncate mt-0.5">
                      {video.author.displayName} · {fmt(video.viewsCount)} ko'rish
                    </p>
                  </>}
                </div>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => setLiked(l => !l)}
                  style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: liked ? "rgba(239,68,68,0.28)" : "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)",
                    border: liked ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Heart style={{ width: 18, height: 18,
                    fill: liked ? "#f87171" : "none", color: liked ? "#f87171" : "rgba(255,255,255,0.8)" }}/>
                </motion.button>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => void handleShare()}
                  style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: shared ? "rgba(16,185,129,0.28)" : "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)",
                    border: shared ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {shared
                    ? <Check className="w-4 h-4 text-emerald-400"/>
                    : <Share2 className="w-4 h-4 text-white/80"/>}
                </motion.button>
              </div>
            </div>

            {/* Center: paused state */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {!playing && (
                  <motion.div key="ppause"
                    initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.14 }}
                    style={{ width: 78, height: 78, borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(18px)",
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
                    <Play style={{ width: 30, height: 30, fill: "white", color: "white", marginLeft: 4 }}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BOTTOM */}
            <div className="absolute bottom-0 inset-x-0 pointer-events-auto"
              style={{ background: "linear-gradient(to top,rgba(0,0,0,0.9),transparent)",
                padding: "44px 14px 20px" }}>

              {/* Quality badge */}
              <div className="flex justify-end mb-2">
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.06)",
                  padding: "2px 8px", borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.08)" }}>
                  {settings.quality}
                </span>
              </div>

              {/* Scrubber */}
              <div className="relative flex items-center h-5 mb-2.5"
                onClick={e => e.stopPropagation()}>
                <div className="absolute inset-x-0 h-[3px] rounded-full"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${progress*100}%`,
                      background: "linear-gradient(90deg,#a855f7,#06b6d4)" }}/>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `calc(${progress*100}% - 7px)`,
                    width: 14, height: 14, borderRadius: "50%", background: "white",
                    boxShadow: "0 0 10px #a855f7aa, 0 2px 6px rgba(0,0,0,0.6)" }}/>
                <input type="range" min={0} max={1} step={0.001} value={progress}
                  onChange={e => handleScrub(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  onClick={e => e.stopPropagation()}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <motion.button whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#a855f7cc,#6366f1cc)",
                    boxShadow: "0 0 22px #a855f755",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {playing
                    ? <Pause style={{ width: 19, height: 19, fill:"white", color:"white" }}/>
                    : <Play  style={{ width: 19, height: 19, fill:"white", color:"white", marginLeft:2 }}/>}
                </motion.button>

                <span className="text-white/50 text-[11px] font-mono tabular-nums flex-shrink-0">
                  {fmtTime(curTime)} / {fmtTime(duration)}
                </span>

                <div className="flex-1"/>

                {/* Restart */}
                <motion.button whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); const v=videoRef.current; if(v){v.currentTime=0;setProgress(0);setCurTime(0);} }}
                  style={{ width: 38, height: 38, borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RotateCcw className="w-3.5 h-3.5 text-white/55"/>
                </motion.button>

                {/* Volume */}
                <motion.button whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
                  style={{ width: 38, height: 38, borderRadius: "50%",
                    background: muted ? "rgba(255,255,255,0.06)" : "rgba(168,85,247,0.18)",
                    border: muted ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(168,85,247,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {muted
                    ? <VolumeX className="w-4 h-4 text-white/35"/>
                    : <Volume2 className="w-4 h-4 text-violet-300"/>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Settings drawer                                         */
/* ─────────────────────────────────────────────────────── */
function SettingsDrawer({
  open, onClose, settings, onSettings,
}: {
  open: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onSettings: (s: PlayerSettings) => void;
}) {
  const set = <K extends keyof PlayerSettings>(k: K, v: PlayerSettings[K]) =>
    onSettings({ ...settings, [k]: v });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            key="sd-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[8998]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />
          {/* drawer */}
          <motion.div
            key="sd-drawer"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[8999] rounded-t-[28px] overflow-hidden"
            style={{ background: "linear-gradient(180deg,#0e0720 0%,#080512 100%)",
              border: "1px solid rgba(168,85,247,0.18)",
              boxShadow: "0 -24px 80px rgba(168,85,247,0.1), 0 -4px 0 rgba(168,85,247,0.2)",
              maxHeight: "82vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}/>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(99,102,241,0.2))",
                  border: "1px solid rgba(168,85,247,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Settings className="w-4 h-4 text-violet-300"/>
                </div>
                <span className="text-white font-black text-[15px]">OTube Sozlamalar</span>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
                style={{ width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X className="w-4 h-4 text-white/60"/>
              </motion.button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {/* Section: Ijro */}
              <SectionLabel>Ijro sozlamalari</SectionLabel>

              <SettingRow
                icon="▶"
                label="Avtoijro"
                sub="Keyingi videoni avtomatik boshlash"
                value={settings.autoplay}
                onChange={v => set("autoplay", v as boolean)}
                type="toggle"
              />
              <SettingRow
                icon="🔁"
                label="Takrorlash"
                sub="Videoni takrorlab ijro etish"
                value={settings.loop}
                onChange={v => set("loop", v as boolean)}
                type="toggle"
              />
              <SettingRow
                icon="🔇"
                label="Ovozni o'chirish"
                sub="Videolar sukut bilan ochilsin"
                value={settings.muteDefault}
                onChange={v => set("muteDefault", v as boolean)}
                type="toggle"
              />

              {/* Section: Ko'rish */}
              <div className="h-3"/>
              <SectionLabel>Ko'rish sozlamalari</SectionLabel>

              <SettingRow
                icon="🎬"
                label="Kino rejimi"
                sub="O'ynatuvchi foni qoraga o'tadi"
                value={settings.cinemaMode}
                onChange={v => set("cinemaMode", v as boolean)}
                type="toggle"
              />
              <SettingRow
                icon="📝"
                label="Sarlavha ko'rsatish"
                sub="O'ynatuvchida video nomini ko'rsatish"
                value={settings.showTitle}
                onChange={v => set("showTitle", v as boolean)}
                type="toggle"
              />

              {/* Section: Sifat */}
              <div className="h-3"/>
              <SectionLabel>Video sifati</SectionLabel>

              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {(["Auto","1080p","720p","480p","360p"] as const).map(q => (
                  <motion.button key={q} whileTap={{ scale: 0.88 }}
                    onClick={() => set("quality", q)}
                    style={{ padding: "8px 4px", borderRadius: 10, textAlign: "center",
                      background: settings.quality === q
                        ? "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(99,102,241,0.25))"
                        : "rgba(255,255,255,0.04)",
                      border: settings.quality === q
                        ? "1px solid rgba(168,85,247,0.55)"
                        : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: settings.quality === q ? "0 0 14px rgba(168,85,247,0.2)" : "none" }}>
                    <span style={{ fontSize: 11, fontWeight: settings.quality === q ? 900 : 600,
                      color: settings.quality === q ? "#e9d5ff" : "rgba(255,255,255,0.4)" }}>
                      {q}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Footer note */}
              <div className="mt-5 rounded-[14px] p-3.5"
                style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.12)" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
                  OTube — yangi avlod video platformasi. Sozlamalar qurilmangizda saqlanadi.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em",
      color: "rgba(168,85,247,0.6)", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </p>
  );
}

function SettingRow({
  icon, label, sub, value, onChange, type,
}: {
  icon: string; label: string; sub: string;
  value: boolean; onChange: (v: boolean) => void; type: "toggle";
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-[14px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1 }}>{label}</p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>{sub}</p>
      </div>
      {/* Toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => onChange(!value)}
        style={{ position: "relative", width: 46, height: 26, borderRadius: 13, flexShrink: 0,
          background: value
            ? "linear-gradient(90deg,#a855f7,#7c3aed)"
            : "rgba(255,255,255,0.1)",
          border: value ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: value ? "0 0 12px rgba(168,85,247,0.3)" : "none",
          transition: "all 0.2s" }}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", damping: 18, stiffness: 280 }}
          style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%",
            background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
        />
      </motion.button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Hero card (featured)                                    */
/* ─────────────────────────────────────────────────────── */
function HeroCard({ video, onPlay }: { video: Reel; onPlay: () => void }) {
  const y = useMotionValue(0);
  const scale = useTransform(y, [-40, 0, 40], [0.97, 1, 0.97]);

  return (
    <motion.div
      style={{ scale }}
      className="relative rounded-[24px] overflow-hidden cursor-pointer"
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22 }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: "21/9", position: "relative" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.caption} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#12054a,#040d30)" }}>
              <Film className="w-14 h-14 text-white/10"/>
            </div>
        }
        {/* Scan-line overlay (unique effect) */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 4px)",
            mixBlendMode: "multiply" }}/>
        {/* Gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.1) 55%,transparent 100%)" }}/>
        {/* Play ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ width: 68, height: 68, borderRadius: "50%",
              background: "rgba(168,85,247,0.85)",
              boxShadow: "0 0 0 12px rgba(168,85,247,0.15), 0 0 0 24px rgba(168,85,247,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.25)" }}>
            <Play style={{ width: 28, height: 28, fill:"white", color:"white", marginLeft:3 }}/>
          </motion.div>
        </div>
        {/* SIGNAL badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(168,85,247,0.4)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7",
            boxShadow: "0 0 6px #a855f7" }}/>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#e9d5ff", letterSpacing: "0.12em" }}>
            TANLANGAN
          </span>
        </div>
      </div>
      {/* Info bar */}
      <div className="absolute bottom-0 inset-x-0 p-4">
        <h2 className="text-white font-black text-[15px] leading-tight mb-2 line-clamp-2"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
          {video.caption || "OTube Featured"}
        </h2>
        <div className="flex items-center gap-2">
          {video.author.avatarUrl && (
            <img src={video.author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              style={{ border: "1px solid rgba(168,85,247,0.4)" }}/>
          )}
          <span className="text-white/55 text-[11px] flex-1 truncate">
            {video.author.displayName}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-white/30"/>
              <span className="text-white/35 text-[10px] tabular-nums">{fmt(video.viewsCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-white/30"/>
              <span className="text-white/35 text-[10px] tabular-nums">{fmt(video.likesCount)}</span>
            </div>
          </div>
        </div>
      </div>
      {/* bottom-left accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg,#a855f7,#06b6d4,transparent)" }}/>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Trending chip (small horizontal)                        */
/* ─────────────────────────────────────────────────────── */
function TrendCard({ video, onPlay, idx }: { video: Reel; onPlay: () => void; idx: number }) {
  const ACCENTS = ["#a855f7","#f59e0b","#06b6d4","#ef4444","#10b981","#f59e0b"];
  const accent = ACCENTS[idx % ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.06, type: "spring", damping: 22 }}
      className="flex-shrink-0 rounded-[16px] overflow-hidden cursor-pointer relative"
      style={{ width: 150, background: "#0a0520",
        border: `1px solid ${accent}25`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 0 0.5px ${accent}15` }}
      whileTap={{ scale: 0.94 }}
      onClick={onPlay}
    >
      <div style={{ aspectRatio: "16/9", position: "relative" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${accent}18,#06030f)` }}>
              <Film className="w-6 h-6 text-white/12"/>
            </div>
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 30, height: 30, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play style={{ width: 11, height: 11, fill:"white", color:"white", marginLeft:1.5 }}/>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.72),transparent 48%)" }}/>
        {/* Rank badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md"
          style={{ background: `${accent}cc`, fontSize: 9, fontWeight: 900, color: "white" }}>
          #{idx+1}
        </div>
      </div>
      <div className="p-2">
        <p className="text-white text-[10px] font-bold line-clamp-2 leading-snug">
          {video.caption || "Video"}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Eye style={{ width: 9, height: 9, color: "rgba(255,255,255,0.28)" }}/>
          <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>
            {fmt(video.viewsCount)}
          </span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px]"
        style={{ background: `linear-gradient(90deg,${accent}88,transparent)` }}/>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Grid card (2-col)                                       */
/* ─────────────────────────────────────────────────────── */
function GridCard({ video, onPlay, idx }: { video: Reel; onPlay: () => void; idx: number }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, type: "spring", damping: 20 }}
      className="rounded-[15px] overflow-hidden cursor-pointer relative"
      style={{ background: "#09041e",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
      whileTap={{ scale: 0.96 }}
      onClick={onPlay}
    >
      <div style={{ aspectRatio: "16/9", position: "relative" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#16083a,#0a0d28)" }}>
              <Film className="w-7 h-7 text-white/12"/>
            </div>
        }
        <div className="absolute bottom-1 right-1 flex items-center justify-center"
          style={{ width: 26, height: 26, borderRadius: "50%",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <Play style={{ width: 10, height: 10, fill:"rgba(255,255,255,0.7)", color:"rgba(255,255,255,0.7)", marginLeft:1 }}/>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.62) 0%,transparent 42%)" }}/>
      </div>
      <div className="p-2.5">
        <p className="text-white font-bold text-[11px] line-clamp-2 leading-snug mb-1.5">
          {video.caption || "Video"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/35 text-[9.5px] truncate max-w-[72px]">
            {video.author.displayName}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Eye style={{ width: 8.5, height: 8.5, color: "rgba(255,255,255,0.25)" }}/>
              <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>
                {fmt(video.viewsCount ?? 0)}
              </span>
            </div>
            <motion.button whileTap={{ scale: 0.65 }}
              onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
              className="flex items-center gap-0.5">
              <Heart style={{ width: 8.5, height: 8.5,
                fill: liked ? "#f87171" : "none",
                color: liked ? "#f87171" : "rgba(255,255,255,0.25)" }}/>
              <span style={{ fontSize: 8.5, fontWeight: 700,
                color: liked ? "#fca5a5" : "rgba(255,255,255,0.25)" }}>
                {fmt((video.likesCount ?? 0) + (liked ? 1 : 0))}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* OTubePage — main                                        */
/* ─────────────────────────────────────────────────────── */
export default function OTubePage() {
  const [, navigate]     = useLocation();
  const [cat,     setCat]     = useState("all");
  const [query,   setQuery]   = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected]    = useState<Reel|null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings]    = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: raw = [], isLoading } = useListReels();

  /* filter by search query */
  const reels = useMemo(() => {
    if (!query.trim()) return raw;
    const q = query.toLowerCase();
    return raw.filter(r =>
      (r.caption).toLowerCase().includes(q) ||
      (r.author.displayName).toLowerCase().includes(q)
    );
  }, [raw, query]);

  /* swipe right → /reels */
  const tx = useRef(0); const ty = useRef(0);
  const onTS = useCallback((e: React.TouchEvent) => {
    tx.current = e.touches[0].clientX; ty.current = e.touches[0].clientY;
  }, []);
  const onTE = useCallback((e: React.TouchEvent) => {
    const dx = tx.current - e.changedTouches[0].clientX;
    const dy = ty.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && dx < -70) navigate("/reels");
  }, [navigate]);

  /* open search */
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 120);
  }, [showSearch]);

  const featured = reels[0] ?? null;
  const trending  = reels.slice(1, 7);
  const grid      = reels.slice(1);

  return (
    <>
      <div
        className="h-full overflow-y-auto"
        style={{ background: "#04020e", paddingBottom: 100 }}
        onTouchStart={onTS}
        onTouchEnd={onTE}
      >
        {/* ── HEADER ── */}
        <div className="sticky top-0 z-40"
          style={{ background: "rgba(4,2,14,0.9)", backdropFilter: "blur(22px) saturate(1.7)",
            WebkitBackdropFilter: "blur(22px) saturate(1.7)",
            borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

          <div className="px-4 pt-4 pb-2">
            {/* Logo row */}
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div key="search"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 mb-3">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setShowSearch(false); setQuery(""); }}
                    style={{ width: 38, height: 38, borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowLeft className="w-4 h-4 text-white/60"/>
                  </motion.button>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,85,247,0.3)" }}>
                    <Search className="w-3.5 h-3.5 text-violet-400 flex-shrink-0"/>
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Video qidirish..."
                      className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/30"
                    />
                    {query && (
                      <motion.button whileTap={{ scale: 0.8 }} onClick={() => setQuery("")}>
                        <X className="w-3.5 h-3.5 text-white/35"/>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="logo"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-between mb-3">
                  {/* Logo */}
                  <div className="flex items-center gap-2.5">
                    <OTubeMark size={32}/>
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-[19px] tracking-tight"
                        style={{ background: "linear-gradient(90deg,#d946ef,#7c3aed,#0891b2)",
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        OTube
                      </span>
                      <span style={{ fontSize: 8.5, letterSpacing: "0.2em", color: "rgba(168,85,247,0.5)",
                        fontWeight: 700, textTransform: "uppercase" }}>
                        SIGNAL ENGINE
                      </span>
                    </div>
                  </div>
                  {/* Right actions */}
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowSearch(true)}
                      style={{ width: 38, height: 38, borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Search className="w-4 h-4 text-white/55"/>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowSettings(true)}
                      style={{ width: 38, height: 38, borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Settings className="w-4 h-4 text-white/55"/>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category pills — unique angled style */}
            <div className="flex gap-2 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {CATS.map(({ id, label, Icon, color }) => {
                const active = cat === id;
                return (
                  <motion.button key={id} whileTap={{ scale: 0.87 }}
                    onClick={() => setCat(id)}
                    className="flex items-center gap-1.5 flex-shrink-0"
                    style={{ padding: "6px 13px", borderRadius: 8,
                      background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                      border: active ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: active ? `0 0 16px ${color}22` : "none",
                      transition: "all 0.16s",
                      clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
                    <Icon style={{ width: 11, height: 11,
                      color: active ? color : "rgba(255,255,255,0.38)" }}/>
                    <span style={{ fontSize: 11, fontWeight: active ? 800 : 600,
                      color: active ? "white" : "rgba(255,255,255,0.42)", lineHeight: 1 }}>
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-3 pt-4 space-y-7">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <OTubeMark size={48}/>
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(168,85,247,0.3)", borderTopColor: "#a855f7" }}/>
              </div>
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <OTubeMark size={52}/>
              <p className="text-white/28 text-[13px] mt-1">
                {query ? `"${query}" bo'yicha natija topilmadi` : "Hali videolar yo'q"}
              </p>
              {query && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQuery("")}
                  className="flex items-center gap-2 px-4 py-2 rounded-full mt-1"
                  style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <RefreshCw className="w-3.5 h-3.5 text-violet-400"/>
                  <span style={{ fontSize: 12, color: "#c084fc", fontWeight: 700 }}>Filterni tozalash</span>
                </motion.button>
              )}
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && !query && (
                <HeroCard video={featured} onPlay={() => setSelected(featured)}/>
              )}

              {/* Search results */}
              {query && reels.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-3.5 h-3.5 text-violet-400"/>
                    <span className="text-white font-black text-[13px]">
                      "{query}" — {reels.length} ta natija
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {reels.map((v, i) => (
                      <GridCard key={v.id} video={v} onPlay={() => setSelected(v)} idx={i}/>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending */}
              {!query && trending.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400"/>
                      <span className="text-white font-black text-[13px]">Trending</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400/50">
                      <span className="text-[10px] font-bold">Ko'proq</span>
                      <ChevronRight className="w-3 h-3"/>
                    </div>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                    {trending.map((v, i) => (
                      <TrendCard key={v.id} video={v} onPlay={() => setSelected(v)} idx={i}/>
                    ))}
                  </div>
                </section>
              )}

              {/* Discovery grid */}
              {!query && grid.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400"/>
                    <span className="text-white font-black text-[13px]">Kashfiyot</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {grid.map((v, i) => (
                      <GridCard key={v.id} video={v} onPlay={() => setSelected(v)} idx={i}/>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Position dots */}
        <div className="flex items-end justify-center gap-2.5 py-10 pointer-events-none">
          {[{ label:"Lenta", active: false }, { label:"Reels", active: false }, { label:"OTube", active: true }].map(d => (
            <div key={d.label} className="flex flex-col items-center gap-1.5">
              <div style={{ width: d.active ? 28 : 7, height: 7, borderRadius: 4, transition: "all 0.35s",
                background: d.active ? "linear-gradient(90deg,#a855f7,#06b6d4)" : "rgba(255,255,255,0.08)",
                boxShadow: d.active ? "0 0 12px #a855f799" : "none" }}/>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
                color: d.active ? "rgba(168,85,247,0.65)" : "rgba(255,255,255,0.18)" }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Player ── */}
      <AnimatePresence>
        {selected && (
          <NexusPlayer
            key={selected.id}
            video={selected}
            onClose={() => setSelected(null)}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* ── Settings drawer ── */}
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettings={setSettings}
      />
    </>
  );
}
