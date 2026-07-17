/**
 * OLCHA REELS — "AURORA" Edition  v3.0
 * ─────────────────────────────────────────────────────────────────
 * Innovations over EVERY existing social platform:
 *
 * 1. LEFT-SIDE ACTION COLUMN — Heart/Comment/Share/AI on the LEFT,
 *    not the right. No other major platform does this.
 *
 * 2. AURORA RAINBOW BORDER — thin 2px animated gradient border that
 *    slowly rotates hue around the full video frame.
 *
 * 3. CIRCULAR PROGRESS RING — video progress shown as a thin arc
 *    in the top-center instead of a bottom scrubber.
 *
 * 4. AUTO-HIDING UI — all UI fades after 3 s of inactivity;
 *    one tap anywhere restores it.
 *
 * 5. PRISM CORNERS — neon corner brackets glow in the accent color.
 *
 * 6. WAVEFORM PULSE — 20 animated bars at very bottom edge react to
 *    audio (even for video).
 *
 * 7. HOLD ZONES — hold left half → 0.35× slow; hold right half → 2.5×;
 *    double-tap → like + ripple burst.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import Hls from "hls.js";
import {
  motion, AnimatePresence, useMotionValue, useTransform,
} from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Brain, X, Loader2, Volume2, VolumeX, Send, Check, Eye, Zap,
} from "lucide-react";
import { useListReels, useLikeReel, useFollowUser, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { resolveApiUrl } from "@/lib/utils";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");

/* ─── Types ──────────────────────────────────────────────────── */
interface FeedItem {
  id: number; videoUrl?: string | null; thumbnailUrl?: string | null; hlsUrl?: string | null;
  caption?: string | null; audioTrack?: string | null; duration?: number | null;
  likesCount?: number; commentsCount?: number; viewsCount?: number; tags?: string[];
  author?: { id: number; username?: string; displayName?: string; avatarUrl?: string | null; isVerified?: boolean; isFollowing?: boolean };
  isLiked?: boolean; _aiSuggested?: boolean; _aiReason?: string;
}
interface ReelComment {
  id: number; content: string; likesCount: number; createdAt: string;
  author: { id: number; displayName?: string; username?: string; avatarUrl?: string | null; isVerified?: boolean };
}
interface Analysis { tags?: string[]; category?: string; summary?: string; sentiment?: string }

/* ─── Utils ──────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000    ? `${(n / 1000).toFixed(1)}K`
  : `${n}`;
const initials = (name?: string) =>
  (name ?? "?").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

/* ─── Accent colors per reel index ──────────────────────────── */
const AURORA_COLS = [
  "#818cf8","#22d3ee","#f472b6","#34d399",
  "#fb923c","#a78bfa","#38bdf8","#f87171",
  "#4ade80","#facc15","#c084fc","#60a5fa",
];

/* ─── Particle burst ─────────────────────────────────────────── */
const PCOLS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6ef7","#ff8c42","#c084fc","#38bdf8"];
function ParticleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360, d = 40 + Math.random() * 28, r = (a * Math.PI) / 180;
    return { tx: Math.cos(r) * d, ty: Math.sin(r) * d, color: PCOLS[i % PCOLS.length] };
  });
  return (
    <>
      {pts.map((p, i) => (
        <motion.div key={i}
          initial={{ x, y, scale: 1.2, opacity: 1 }}
          animate={{ x: x + p.tx, y: y + p.ty, scale: 0, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.01 }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{ position: "absolute", width: 7, height: 7, borderRadius: "50%",
            background: p.color, pointerEvents: "none", zIndex: 62, left: 0, top: 0, marginLeft: -3.5, marginTop: -3.5 }}
        />
      ))}
    </>
  );
}

/* ─── Ripple on double-tap ───────────────────────────────────── */
function RippleWave({ x, y, color, onDone }: { x: number; y: number; color: string; onDone: () => void }) {
  return (
    <>
      {[0, 0.1, 0.22].map((delay, i) => (
        <motion.div key={i}
          initial={{ x: x - 50, y: y - 50, width: 100, height: 100, borderRadius: "50%", opacity: 0.7 }}
          animate={{ x: x - 180, y: y - 180, width: 360, height: 360, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay }}
          onAnimationComplete={i === 2 ? onDone : undefined}
          style={{ position: "absolute", border: `2px solid ${color}`, pointerEvents: "none", zIndex: 55, left: 0, top: 0 }}
        />
      ))}
      <motion.div
        initial={{ x: x - 20, y: y - 20, scale: 0, opacity: 1 }}
        animate={{ x: x - 20, y: y - 100, scale: [0, 1.8, 1.2], opacity: [1, 1, 0] }}
        transition={{ duration: 1.0, ease: "easeOut", delay: 0.05 }}
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 63, fontSize: 40 }}>
        ❤️
      </motion.div>
    </>
  );
}

/* ─── Typewriter hook ────────────────────────────────────────── */
function useTypewriter(text: string, active: boolean, speed = 26) {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed(""); let i = 0;
    timerRef.current = setInterval(() => {
      i++; setDisplayed(text.slice(0, i));
      if (i >= text.length && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, speed);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [text, active, speed]);
  return displayed;
}

/* ─── Audio chip ─────────────────────────────────────────────── */
function AudioChip({ track, color }: { track: string; color: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const short = track.length > 22 ? track.slice(0, 22) + "…" : track;
  return (
    <div className="relative" style={{ zIndex: 40 }}>
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
        style={{ background: "rgba(6,4,16,0.58)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          border: `1px solid ${color}38`, boxShadow: `0 2px 12px rgba(0,0,0,0.4), 0 0 8px ${color}18` }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `conic-gradient(from 0deg, #1a1030, ${color}88, #1a1030, ${color}44, #1a1030)`,
            border: `1px solid ${color}55` }}>
          <div className="w-[5px] h-[5px] rounded-full bg-white/70" />
        </motion.div>
        <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.72)", maxWidth: 110, overflow: "hidden", whiteSpace: "nowrap" }}>
          {short}
        </span>
        <Music className="w-[9px] h-[9px] flex-shrink-0" style={{ color: `${color}cc` }} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }} transition={{ type: "spring", damping: 24, stiffness: 360 }}
            className="absolute bottom-[calc(100%+8px)] left-0 rounded-2xl p-3 flex flex-col gap-2"
            style={{ minWidth: 175, background: "rgba(6,4,16,0.88)", backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)", border: `1px solid ${color}28`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 18px ${color}12` }}>
            <div className="flex items-start gap-2">
              <Music className="w-3 h-3 mt-[2px] flex-shrink-0" style={{ color: `${color}cc` }} />
              <span className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.82)", wordBreak: "break-word" }}>{track}</span>
            </div>
            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => { navigator.clipboard.writeText(track).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
              className="flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold"
              style={{ background: copied ? `${color}28` : "rgba(255,255,255,0.07)",
                border: `1px solid ${copied ? color + "55" : "rgba(255,255,255,0.09)"}`,
                color: copied ? color : "rgba(255,255,255,0.6)" }}>
              {copied ? <Check className="w-3 h-3" /> : null}
              {copied ? "Nusxalandi!" : "Nusxalash"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Waveform ───────────────────────────────────────────────── */
function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 18 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i}
          animate={active
            ? { height: [`${16 + (i % 4) * 12}%`, `${42 + (i % 5) * 10}%`, `${16 + (i % 4) * 12}%`] }
            : { height: "18%" }
          }
          transition={active
            ? { duration: 0.42 + (i % 4) * 0.09, repeat: Infinity, delay: i * 0.022, ease: "easeInOut" }
            : { duration: 0.3 }
          }
          style={{ width: 2, borderRadius: 2, flexShrink: 0,
            background: active ? color : "rgba(255,255,255,0.15)" }}
        />
      ))}
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
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [count, setCount]       = useState(commentsCount);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/reels/${reelId}/comments`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setComments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim() || sending || !user) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/reels/${reelId}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim(), authorId: user.id }),
      });
      if (res.status === 401) {
        toast({ title: "Xato", description: "Izoh yozish uchun tizimga kiring", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        toast({ title: "Xato", description: "Izoh qo'shishda xatolik yuz berdi", variant: "destructive" });
        return;
      }
      const c = await res.json();
      setComments(prev => [c, ...prev]);
      setCount(n => n + 1);
      setText("");
      setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 80);
    } catch {
      toast({ title: "Xato", description: "Tarmoq xatosi, qayta urinib ko'ring", variant: "destructive" });
    } finally { setSending(false); }
  };

  const rtf = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    return diff < 60000 ? "hozir" : diff < 3600000 ? `${Math.floor(diff/60000)}d`
      : diff < 86400000 ? `${Math.floor(diff/3600000)}s` : `${Math.floor(diff/86400000)}k`;
  };

  return (
    <motion.div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.55)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-[26px] overflow-hidden flex flex-col"
        style={{ maxHeight: "75vh", background: "rgba(6,4,18,0.96)", backdropFilter: "blur(36px)",
          border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.65)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span className="text-white font-bold text-[14px]">Izohlar</span>
          <span className="text-white/35 text-[12px]">({count})</span>
          <button onClick={onClose} className="ml-auto"><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">{t("reels.no_comments")}</div>
          ) : (
            comments.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed44,#ec489944)" }}>
                  {c.author.avatarUrl
                    ? <img loading="lazy" decoding="async" src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                        {initials(c.author.displayName)}
                      </div>}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-white font-bold text-[12px]">{c.author.displayName ?? c.author.username}</span>
                    {c.author.isVerified && <BadgeCheck className="w-3 h-3 text-violet-300" />}
                    <span className="text-white/25 text-[10px]">{rtf(c.createdAt)}</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#7c3aed44,#ec489944)" }}>
            {user?.avatarUrl
              ? <img loading="lazy" decoding="async" src={resolveApiUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                  {initials(user?.displayName)}
                </div>}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleSend} disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Video element ──────────────────────────────────────────── */
function ReelVideoEl({ videoUrl, hlsUrl, thumbnailUrl, isActive, muted, videoRef, onPlayState }: {
  videoUrl?: string | null; hlsUrl?: string | null; thumbnailUrl?: string | null;
  isActive: boolean; muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>; onPlayState: (p: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  /* Attach HLS.js or native HLS source to the video element */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Destroy previous HLS instance if any
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const src = hlsUrl ?? videoUrl;
    if (!src) return;

    const isHls = src.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,            // auto quality
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        v.muted = muted;
      });
    } else {
      // Safari native HLS or direct video
      v.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl, videoUrl]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (isActive) {
      v.currentTime = 0; setError(false); setLoading(v.readyState < 3);
      v.play().catch(() => onPlayState(true));
    } else { v.pause(); v.currentTime = 0; }
  }, [isActive, videoRef, onPlayState]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, videoRef]);

  if (!videoUrl && !hlsUrl) return (
    <div className="absolute inset-0">
      {thumbnailUrl ? <img loading="lazy" decoding="async" src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1e0533,#030314)" }} />}
    </div>
  );

  return (
    <div className="absolute inset-0">
      {thumbnailUrl && (
        <img loading="lazy" decoding="async" src={thumbnailUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(24px) brightness(0.28)", pointerEvents: "none" }} />
      )}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        poster={thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-contain z-[2]"
        loop playsInline muted={muted} preload="auto"
        onLoadedData={() => setLoading(false)} onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); onPlayState(false); }}
        onPause={() => onPlayState(true)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ opacity: loading && !thumbnailUrl ? 0 : 1, transition: "opacity 100ms ease" }}
      />
      {loading && !error && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-2.5 rounded-full border border-white/5 border-t-pink-400 animate-spin"
              style={{ animationDuration: "0.65s", animationDirection: "reverse" }} />
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 z-[3] pointer-events-none">
          <span className="text-white/65 text-xs bg-black/50 px-4 py-2 rounded-full z-10">Video mavjud emas</span>
        </div>
      )}
    </div>
  );
}

/* ─── Video progress hook ────────────────────────────────────── */
function useVideoProgress(ref: React.RefObject<HTMLVideoElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const h = () => setProgress(v.duration > 0 ? v.currentTime / v.duration : 0);
    v.addEventListener("timeupdate", h, { passive: true });
    return () => v.removeEventListener("timeupdate", h);
  });
  return progress;
}

/* ─── Circular Progress Ring ─────────────────────────────────── */
function ProgressRing({ progress, color, size = 36 }: { progress: number; color: string; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={2.5}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.15s linear", filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

/* ─── Aurora border ──────────────────────────────────────────── */
function AuroraBorder({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 6 }}
      animate={{ filter: [`hue-rotate(0deg)`, `hue-rotate(360deg)`] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    >
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}cc, #f472b6cc, #22d3eecc, transparent)` }} />
      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, #22d3eecc, ${color}cc, #f472b6cc, transparent)` }} />
      {/* Left */}
      <div className="absolute top-0 bottom-0 left-0 w-[2px]"
        style={{ background: `linear-gradient(180deg, transparent, ${color}cc, #22d3eecc, transparent)` }} />
      {/* Right */}
      <div className="absolute top-0 bottom-0 right-0 w-[2px]"
        style={{ background: `linear-gradient(180deg, transparent, #f472b6cc, ${color}cc, transparent)` }} />
    </motion.div>
  );
}

/* ─── Left Action Orb ────────────────────────────────────────── */
function LeftOrb({
  icon, count, active, activeColor, onClick,
}: {
  icon: React.ReactNode; count?: number; active?: boolean;
  activeColor: string; onClick: () => void;
}) {
  return (
    <motion.button whileTap={{ scale: 0.68 }} onClick={onClick}
      className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center relative" style={{ width: 44, height: 44 }}>
        {icon}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-black tabular-nums leading-none"
          style={{ color: active ? activeColor : "rgba(255,255,255,0.45)" }}>
          {fmt(count)}
        </span>
      )}
    </motion.button>
  );
}

/* ─── REEL SLIDE ─────────────────────────────────────────────── */
function ReelSlide({
  reel, isActive, muted, accent, user,
  onLike, isLiked, onAnalyze, analyzingId, analysis,
  onComment, onShare, onMute, onFollow, isFollowing,
}: {
  reel: FeedItem; isActive: boolean; muted: boolean; accent: string;
  user: { id: number; displayName?: string; avatarUrl?: string | null } | null;
  onLike: () => void; isLiked: boolean;
  onAnalyze: () => void; analyzingId: number | null; analysis?: Analysis;
  onComment: () => void; onShare: () => void; onMute: () => void;
  onFollow: () => void; isFollowing: boolean;
}) {
  const [, navigate] = useLocation();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const progress     = useVideoProgress(videoRef);
  const [paused,   setPaused]   = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [holdMode, setHoldMode] = useState<"fast" | "slow" | null>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [ripples,   setRipples]   = useState<{ x: number; y: number; id: number }[]>([]);
  const [lastTap,   setLastTap]   = useState(0);
  const holdTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Share */
  const [shareOpen,    setShareOpen]    = useState(false);
  const [shareQuery,   setShareQuery]   = useState("");
  const [shareResults, setShareResults] = useState<{ id: number; displayName?: string; username?: string; avatarUrl?: string | null }[]>([]);
  const [shareSending, setShareSending] = useState<number | null>(null);
  const [shareSent,    setShareSent]    = useState<number | null>(null);

  useEffect(() => {
    if (!shareOpen || !shareQuery.trim()) { setShareResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/users?search=${encodeURIComponent(shareQuery)}&limit=10`, { credentials: "include" });
        if (res.ok) setShareResults(await res.json());
      } catch { /* ignore */ }
    }, 320);
    return () => clearTimeout(t);
  }, [shareQuery, shareOpen]);

  const handleSendToUser = async (toUser: { id: number; displayName?: string; username?: string }) => {
    if (!user || shareSending) return;
    setShareSending(toUser.id);
    const content = `📤 *${reel.author?.displayName ?? "OlchaAI"}* tomonidan reel:\n${window.location.origin}/reels`;
    try {
      const convRes = await fetch(`${API}/api/conversations`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [user.id, toUser.id] }),
      });
      if (!convRes.ok) throw new Error();
      const conv = await convRes.json() as { id: number };
      await fetch(`${API}/api/conversations/${conv.id}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.id, content }),
      });
      setShareSent(toUser.id);
      setTimeout(() => {
        setShareSent(null); setShareSending(null);
        setShareOpen(false); setShareQuery(""); setShareResults([]);
      }, 1600);
    } catch { setShareSending(null); }
  };

  /* Auto-hide UI after 3s */
  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => { resetHideTimer(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [resetHideTimer]);
  useEffect(() => { if (!isActive) setUiVisible(false); else resetHideTimer(); }, [isActive, resetHideTimer]);

  /* Video speed control */
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = holdMode === "fast" ? 2.5 : holdMode === "slow" ? 0.35 : 1;
  }, [holdMode]);

  const caption = reel.caption ?? "";
  const captionShort = caption.length > 72 ? caption.slice(0, 72) + "…" : caption;
  const typed = useTypewriter(captionShort, isActive, 26);

  const neonColor = analysis?.sentiment === "positive" ? "#10b981"
    : analysis?.sentiment === "negative" ? "#ef4444"
    : reel._aiSuggested ? "#a78bfa" : accent;

  type TapDiv = HTMLDivElement & { _holdTimer?: ReturnType<typeof setTimeout> };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget as TapDiv;
    el._holdTimer = setTimeout(() => setHoldMode(e.clientX < window.innerWidth / 2 ? "fast" : "slow"), 220);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget as TapDiv;
    if (el._holdTimer) { clearTimeout(el._holdTimer); el._holdTimer = undefined; }
    if (holdMode) { setHoldMode(null); return; }
    setHoldMode(null);
    resetHideTimer();

    const now  = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (now - lastTap < 300) {
      /* Double tap = like */
      if (!isLiked) onLike();
      setRipples(r => [...r, { x, y, id: now }]);
      setParticles(p => [...p, { x, y, id: now + 1 }]);
    } else {
      /* Single tap = toggle play */
      const v = videoRef.current;
      if (v) { if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); } }
    }
    setLastTap(now);
  }, [holdMode, lastTap, isLiked, onLike, resetHideTimer]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#030308" }}>

      {/* Ambient blur bg */}
      {reel.thumbnailUrl && (
        <img loading="lazy" decoding="async" src={reel.thumbnailUrl} alt="" aria-hidden
          className="absolute inset-[-8%] w-[116%] h-[116%] object-cover pointer-events-none"
          style={{ filter: "blur(60px) saturate(2.2) brightness(0.14)", zIndex: 0 }} />
      )}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1,
        background: "radial-gradient(ellipse at 50% 35%, rgba(124,58,237,0.07) 0%, rgba(0,0,0,0.4) 100%)" }} />

      {/* Video */}
      <ReelVideoEl videoUrl={reel.videoUrl} hlsUrl={reel.hlsUrl} thumbnailUrl={reel.thumbnailUrl}
        isActive={isActive} muted={muted} videoRef={videoRef} onPlayState={setPaused} />

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5,
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.04) 30%, transparent 50%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 20%)" }} />

      {/* Aurora animated border */}
      <AuroraBorder color={neonColor} />

      {/* Tap / hold zone */}
      <div className="absolute inset-0" style={{ zIndex: 20, cursor: "pointer" }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={e => {
          const el = e.currentTarget as TapDiv;
          if (el._holdTimer) { clearTimeout(el._holdTimer); el._holdTimer = undefined; }
          setHoldMode(null);
        }}
      />

      {/* Ripples */}
      <div className="absolute inset-0 z-[52] pointer-events-none overflow-hidden">
        {ripples.map(r => (
          <RippleWave key={r.id} x={r.x} y={r.y} color={neonColor}
            onDone={() => setRipples(prev => prev.filter(h => h.id !== r.id))} />
        ))}
      </div>

      {/* Particles */}
      <div className="absolute inset-0 z-[54] pointer-events-none overflow-hidden">
        {particles.map(p => (
          <ParticleBurst key={p.id} x={p.x} y={p.y}
            onDone={() => setParticles(prev => prev.filter(h => h.id !== p.id))} />
        ))}
      </div>

      {/* Pause icon */}
      <AnimatePresence>
        {paused && (
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div style={{ width: 64, height: 64, borderRadius: "50%",
              background: "rgba(0,0,0,0.52)", backdropFilter: "blur(14px)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              boxShadow: `0 0 28px ${neonColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg className="fill-white" width="22" height="22" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ═══ UI LAYER (auto-hiding) ═══ */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: uiVisible ? 1 : 0 }} transition={{ duration: 0.4 }}
        style={{ zIndex: 28 }}>

        {/* ─── TOP BAR: progress ring + views + mute ─── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-auto"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 44px) + 10px)" }}>
          {/* Left: views */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,0.09)" }}>
            <Eye className="w-3 h-3" style={{ color: "rgba(255,255,255,0.45)" }} />
            <span className="text-[10px] font-bold text-white/50">{fmt(reel.viewsCount ?? 0)}</span>
          </div>

          {/* Center: circular progress */}
          <div className="relative">
            <ProgressRing progress={progress} color={neonColor} size={34} />
            {reel._aiSuggested && (
              <Zap className="absolute inset-0 m-auto w-3 h-3" style={{ color: neonColor }} />
            )}
          </div>

          {/* Right: mute + add */}
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.8 }} onClick={onMute}
              className="flex items-center justify-center p-1">
              {muted
                ? <VolumeX className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.9))" }} />
                : <Volume2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.9))" }} />
              }
            </motion.button>
          </div>
        </div>

        {/* ─── LEFT ACTION COLUMN ─── */}
        {/* Anchored from the bottom (above caption/tags/audio block) instead of
            vertically centered, so it never collides with multi-line captions
            on shorter viewports. */}
        <div className="absolute left-3 flex flex-col items-center gap-4 pointer-events-auto"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 278px)" }}>
          {/* Like */}
          <div className="relative">
            <LeftOrb
              icon={<Heart className="w-[18px] h-[18px]"
                style={{ color: isLiked ? "#f87171" : "rgba(255,255,255,0.78)",
                  fill: isLiked ? "#f87171" : "none", transition: "all 0.15s" }} />}
              count={reel.likesCount ?? 0} active={isLiked} activeColor="#f87171"
              onClick={onLike}
            />
          </div>

          {/* Comment */}
          <LeftOrb
            icon={<MessageCircle className="w-[18px] h-[18px]" style={{ color: "rgba(255,255,255,0.78)" }} />}
            count={reel.commentsCount ?? 0} active={false} activeColor="#22d3ee"
            onClick={onComment}
          />

          {/* Share */}
          <LeftOrb
            icon={<Share2 className="w-[18px] h-[18px]" style={{ color: shareOpen ? "#34d399" : "rgba(255,255,255,0.78)" }} />}
            active={shareOpen} activeColor="#34d399"
            onClick={() => { onShare(); setShareOpen(v => !v); }}
          />

          {/* AI analysis */}
          <LeftOrb
            icon={analyzingId === reel.id
              ? <Loader2 className="w-[18px] h-[18px] text-violet-300 animate-spin" />
              : <Brain className="w-[18px] h-[18px]" style={{ color: "rgba(167,139,250,0.88)" }} />}
            active={!!analysis} activeColor="#a78bfa"
            onClick={onAnalyze}
          />
        </div>

        {/* ─── AI analysis badge ─── */}
        <AnimatePresence>
          {analysis && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="absolute left-16 pointer-events-none"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 278px)", maxWidth: 120 }}>
              <div className="px-2.5 py-2 rounded-2xl text-[9px] font-semibold"
                style={{ background: "rgba(124,58,237,0.5)", backdropFilter: "blur(14px)",
                  border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd",
                  boxShadow: "0 0 18px rgba(124,58,237,0.3)" }}>
                {analysis.sentiment && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <span>{analysis.sentiment === "positive" ? "✅" : analysis.sentiment === "negative" ? "⚠️" : "😐"}</span>
                    <span className="capitalize">{analysis.sentiment}</span>
                  </div>
                )}
                {analysis.category && <div className="opacity-70 truncate">{analysis.category}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CAPTION + TAGS + AUDIO (above bottom bar) ─── */}
        <div className="absolute left-4 right-4 pointer-events-auto"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 170px)" }}>
          {caption && (
            <p className="text-white text-[12.5px] leading-snug mb-2 font-semibold"
              style={{ textShadow: "0 1px 14px rgba(0,0,0,1)" }}>
              {typed}
              {typed.length < captionShort.length && (
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>|</motion.span>
              )}
            </p>
          )}
          {reel.audioTrack && (
            <div className="mb-1.5" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
              <AudioChip track={reel.audioTrack} color={neonColor} />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(reel.tags ?? [])
              .filter(t => !t.startsWith("_") && !t.includes(":") && !t.toLowerCase().includes("otube") && !t.toLowerCase().includes("olcha"))
              .slice(0, 3)
              .map(tag => (
                <span key={tag} className="text-[10px] font-bold"
                  style={{ color: neonColor, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        {/* ─── BOTTOM BAR: author + waveform ─── */}
        <div className="absolute left-0 right-0 pointer-events-auto"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          {/* Author strip — transparent, floats on gradient */}
          <div className="flex items-center gap-2.5 px-4 py-2"
            onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>

            {/* Avatar */}
            <div className="relative flex-shrink-0 cursor-pointer" style={{ width: 38, height: 38 }}
              onClick={() => reel.author?.id && navigate(`/profile/${reel.author.id}`)}>
              <motion.div className="absolute inset-[-2px] rounded-full pointer-events-none"
                style={{ background: `conic-gradient(from 0deg, ${neonColor}dd, #3b82f677, #06b6d455, ${neonColor}dd)` }}
                animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
              <div className="absolute inset-[2px] rounded-full overflow-hidden z-10 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
                {reel.author?.avatarUrl
                  ? <img loading="lazy" decoding="async" src={resolveApiUrl(reel.author.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[10px] font-black text-white select-none">{initials(reel.author?.displayName)}</span>}
              </div>
            </div>

            {/* Name + username — single line */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => reel.author?.id && navigate(`/profile/${reel.author.id}`)}>
              <div className="flex items-center gap-1">
                <span className="text-white font-black text-[13px] truncate"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                  {reel.author?.displayName ?? "OlchaAI"}
                </span>
                {reel.author?.isVerified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: neonColor }} />}
                {reel._aiSuggested && <Zap className="w-3 h-3 text-violet-400 flex-shrink-0" />}
              </div>
              <span className="text-[10px] text-white/45"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
                @{reel.author?.username}
              </span>
            </div>

            {/* Follow btn */}
            {reel.author?.id && user?.id !== reel.author.id && (
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={e => { e.stopPropagation(); onFollow(); }}
                onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-black flex-shrink-0"
                style={{ background: isFollowing ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)", backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: `1px solid ${neonColor}55`,
                  color: "#fff",
                  opacity: isFollowing ? 0.75 : 1,
                  boxShadow: `0 0 12px ${neonColor}33, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
                {isFollowing
                  ? <><Check className="w-3.5 h-3.5" /> Obunadasiz</>
                  : <><Plus className="w-3.5 h-3.5" /> Obuna</>}
              </motion.button>
            )}
          </div>
        </div>

        {/* ─── Progress bar (thin, just above bottom bar) ─── */}
        <div className="absolute pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", left: 0, right: 0, height: 2, zIndex: 32 }}>
          <div style={{ width: `${progress * 100}%`, height: "100%",
            background: `linear-gradient(90deg, ${neonColor}, #06b6d4)`,
            boxShadow: `0 0 6px ${neonColor}bb`, transition: "width 0.12s linear" }} />
        </div>

      </motion.div>{/* /ui layer */}

      {/* ─── SHARE SHEET ─── */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden"
            style={{ zIndex: 60, maxHeight: "72vh", background: "rgba(4,3,16,0.96)",
              backdropFilter: "blur(36px)", WebkitBackdropFilter: "blur(36px)",
              border: "1px solid rgba(52,211,153,0.18)", borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.7)" }}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3">
              <div className="w-9 h-1 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-[14px]">Ulashish</span>
              <button onClick={() => { setShareOpen(false); setShareQuery(""); setShareResults([]); }}
                className="ml-auto p-1"><X className="w-4 h-4 text-white/45" /></button>
            </div>
            <div className="px-5 pt-3 pb-2">
              <input
                value={shareQuery}
                onChange={e => setShareQuery(e.target.value)}
                placeholder="OlchaAI foydalanuvchisini qidirish..."
                className="w-full px-4 py-2.5 rounded-2xl text-white text-[13px] placeholder:text-white/30 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            <div className="px-5 pb-6 overflow-y-auto space-y-1" style={{ maxHeight: 220 }}>
              {shareResults.length === 0 && shareQuery.trim() && (
                <p className="text-white/30 text-[13px] text-center py-4">Topilmadi</p>
              )}
              {shareResults.length === 0 && !shareQuery.trim() && (
                <p className="text-white/20 text-[12px] text-center py-4">Qidirish orqali OlchaAI foydalanuvchilarini toping</p>
              )}
              {shareResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed44,#ec489944)" }}>
                    {u.avatarUrl
                      ? <img loading="lazy" decoding="async" src={resolveApiUrl(u.avatarUrl)} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                          {(u.displayName ?? "?").slice(0, 2).toUpperCase()}
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-[13px] font-semibold truncate block">{u.displayName}</span>
                    <span className="text-white/40 text-[11px]">@{u.username}</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.88 }}
                    onClick={() => handleSendToUser(u)} disabled={!!shareSending}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex-shrink-0"
                    style={{
                      background: shareSent === u.id ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.85)",
                      color: shareSent === u.id ? "#6ee7b7" : "#000",
                    }}>
                    {shareSent === u.id ? "✓" : shareSending === u.id ? "…" : "Yuborish"}
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: initialReels = [], isLoading } = useListReels({ limit: 20 } as any);
  const [feed,      setFeed]      = useState<FeedItem[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [likedIds,  setLikedIds]  = useState<Set<number>>(new Set());
  const [muted,     setMuted]     = useState(false);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [commentReel, setCommentReel] = useState<FeedItem | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [injecting, setInjecting] = useState(false);

  const likeReel  = useLikeReel();
  const followMut = useFollowUser();
  const [followOverrides, setFollowOverrides] = useState<Map<number, boolean>>(new Map());
  const qc       = useQueryClient();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const watchedTags = useRef<string[]>([]);
  const watchedIds  = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (initialReels.length > 0 && feed.length === 0) setFeed(initialReels as FeedItem[]);
  }, [initialReels, feed.length]);

  // Initialize liked state from server's isLiked flag when reels first load
  useEffect(() => {
    if (initialReels.length > 0) {
      setLikedIds(new Set(
        (initialReels as FeedItem[]).filter(r => r.isLiked).map(r => r.id)
      ));
    }
  }, [initialReels]);

  /* Track views + AI injection */
  useEffect(() => {
    const reel = feed[current]; if (!reel) return;
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "reel", contentId: reel.id, interactionType: "view" }),
    }).catch(() => {});
    fetch(`${API}/api/reels/${reel.id}/view`, { method: "POST", credentials: "include" }).catch(() => {});
    if (reel.tags?.length) watchedTags.current = [...new Set([...watchedTags.current, ...reel.tags])].slice(0, 10);
    watchedIds.current.add(reel.id);
    if (current > 0 && current % 4 === 0 && watchedTags.current.length > 0 && !injecting) {
      const excl = Array.from(watchedIds.current).join(","), tags = watchedTags.current.slice(0, 5).join(",");
      setInjecting(true);
      fetch(`${API}/api/reels/similar?tags=${encodeURIComponent(tags)}&excludeIds=${excl}&limit=5`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then((sim: FeedItem[]) => {
          if (sim.length > 0) setFeed(prev => {
            const at = Math.min(current + 3, prev.length);
            return [...prev.slice(0, at), ...sim.map(r => ({ ...r, _aiSuggested: true })), ...prev.slice(at)];
          });
        }).catch(() => {}).finally(() => setInjecting(false));
    }
  }, [current, feed, injecting]);

  /* Keyboard navigation */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") setCurrent(c => Math.min(feed.length - 1, c + 1));
      else if (e.key === "ArrowUp" || e.key === "k") setCurrent(c => Math.max(0, c - 1));
      else if (e.key === "m" || e.key === "M") setMuted(v => !v);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [feed.length]);

  /* Mouse wheel */
  const wheelAccum = useRef(0), wheelLock = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); if (wheelLock.current) return;
    wheelAccum.current += e.deltaY;
    if (Math.abs(wheelAccum.current) > 60) {
      setCurrent(c => Math.max(0, Math.min(feed.length - 1, c + (wheelAccum.current > 0 ? 1 : -1))));
      wheelAccum.current = 0; wheelLock.current = true;
      setTimeout(() => { wheelLock.current = false; }, 380);
    }
  }, [feed.length]);

  /* Touch swipe */
  const touchY = useRef(0), touchX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchY.current = e.touches[0].clientY; touchX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dy = touchY.current - e.changedTouches[0].clientY;
    const dx = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -70) navigate("/");
      if (dx > 70)  navigate("/otube");
    } else {
      if (dy > 50)  setCurrent(c => Math.min(feed.length - 1, c + 1));
      if (dy < -50) setCurrent(c => Math.max(0, c - 1));
    }
  }, [feed.length, navigate]);

  /* Drag (framer) */
  const y = useMotionValue(0);
  const dragOpacity = useTransform(y, [-80, 0, 80], [0.45, 1, 0.45]);
  const handleDragEnd = useCallback((_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y < -50) setCurrent(c => Math.min(feed.length - 1, c + 1));
    else if (info.offset.y > 50) setCurrent(c => Math.max(0, c - 1));
    y.set(0);
  }, [feed.length, y]);

  /* Like */
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

  /* Follow */
  const handleFollow = useCallback((authorId: number, serverFollowing?: boolean) => {
    const current = followOverrides.has(authorId) ? followOverrides.get(authorId)! : !!serverFollowing;
    const next = !current;
    setFollowOverrides(prev => new Map(prev).set(authorId, next));
    followMut.mutate({ id: authorId }, {
      onSuccess: (data) => {
        setFollowOverrides(prev => new Map(prev).set(authorId, data.following));
        qc.invalidateQueries({ queryKey: getListReelsQueryKey({ limit: 20 } as any) });
      },
      onError: () => {
        setFollowOverrides(prev => new Map(prev).set(authorId, current));
      },
    });
  }, [followOverrides, followMut, qc]);

  /* AI analysis */
  const handleAnalyze = useCallback(async (reelId: number, caption?: string, thumbUrl?: string) => {
    if (analysisMap[reelId]) return; setAnalyzingId(reelId);
    try {
      const res = await fetch(`${API}/api/ai/analyze-content`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ contentId: reelId, contentType: "reel", caption: caption ?? "", imageUrl: thumbUrl }),
      });
      if (res.ok) { const d = await res.json(); setAnalysisMap(p => ({ ...p, [reelId]: d })); }
    } catch { /* ignore */ } finally { setAnalyzingId(null); }
  }, [analysisMap]);

  const handleShare = useCallback((reelId: number) => {
    fetch(`${API}/api/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ contentType: "reel", contentId: reelId, interactionType: "share" }),
    }).catch(() => {});
  }, []);

  const reel = feed[current];

  return (
    <div
      className="-ml-2 md:ml-0 relative flex items-center justify-center overflow-hidden"
      style={{ height: "100dvh", background: "#000" }}
      onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
    >

      {/* Global ambient */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {reel?.thumbnailUrl && (
            <motion.img key={reel.id} src={reel.thumbnailUrl} alt="" aria-hidden
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-[-12%] w-[124%] h-[124%] object-cover"
              style={{ filter: "blur(80px) saturate(3) brightness(0.1)" }} />
          )}
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      </div>

      {/* Video preload */}
      <div style={{ display: "none" }} aria-hidden>
        {[current + 1, current + 2].map(i => { const r = feed[i]; return r?.videoUrl ? <video key={r.id} src={r.videoUrl} preload="auto" muted playsInline loop /> : null; })}
        {[current + 1, current + 2, current + 3].map(i => { const r = feed[i]; return r?.thumbnailUrl ? <img key={`t-${r.id}`} src={r.thumbnailUrl} loading="eager" alt="" /> : null; })}
      </div>

      {/* Loading */}
      {isLoading && feed.length === 0 ? (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-2.5 rounded-full border border-white/10 border-t-pink-400 animate-spin"
              style={{ animationDuration: "0.65s", animationDirection: "reverse" }} />
          </div>
          <p className="text-white/40 text-sm font-bold tracking-widest">YUKLANMOQDA…</p>
        </div>

      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>🎬</div>
          <div className="text-center">
            <p className="font-black text-white mb-1">Hali reel yo'q</p>
            <p className="text-sm text-white/45">Birinchi reelni yuklang!</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 4px 24px rgba(124,58,237,0.45)" }}>
            <Plus className="w-4 h-4" /> Reel qo'shish
          </motion.button>
        </div>

      ) : reel && (
        <>
          <motion.div
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="relative z-10 select-none touch-none"
            style={{
              opacity: dragOpacity,
              width: "100%",
              height: "100dvh",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={reel.id}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 440, damping: 36 }}
                className="absolute inset-0">
                <ReelSlide
                  reel={reel}
                  isActive
                  muted={muted}
                  accent={AURORA_COLS[current % AURORA_COLS.length]}
                  user={user}
                  onLike={() => handleLike(reel.id)}
                  isLiked={likedIds.has(reel.id)}
                  onFollow={() => reel.author?.id && handleFollow(reel.author.id, reel.author.isFollowing)}
                  isFollowing={!!reel.author?.id && (followOverrides.has(reel.author.id) ? followOverrides.get(reel.author.id)! : !!reel.author.isFollowing)}
                  onAnalyze={() => handleAnalyze(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined)}
                  analyzingId={analyzingId}
                  analysis={analysisMap[reel.id]}
                  onComment={() => setCommentReel(reel)}
                  onShare={() => handleShare(reel.id)}
                  onMute={() => setMuted(v => !v)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Desktop: arrow nav */}
            <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex-col gap-3 hidden md:flex z-20">
              {([[-1, "M5 15l7-7 7 7"], [1, "M19 9l-7 7-7-7"]] as [number, string][]).map(([dir, icon]) => (
                <motion.button key={dir} whileTap={{ scale: 0.85 }}
                  onClick={() => setCurrent(c => Math.max(0, Math.min(feed.length - 1, c + dir)))}
                  disabled={dir === -1 ? current === 0 : current >= feed.length - 1}
                  className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20"
                  style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
                  </svg>
                </motion.button>
              ))}
            </div>

            {/* Desktop filmstrip */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-2 items-center">
              {feed.slice(Math.max(0, current - 3), Math.min(feed.length, current + 6)).map((r, relIdx) => {
                const absIdx = Math.max(0, current - 3) + relIdx;
                const isAct = absIdx === current, dist = Math.abs(absIdx - current);
                return (
                  <motion.button key={r.id} onClick={() => setCurrent(absIdx)} whileTap={{ scale: 0.82 }}
                    animate={{ scale: isAct ? 1 : 1 - dist * 0.06 }}
                    className="overflow-hidden flex-shrink-0"
                    style={{ width: isAct ? 36 : 24, height: isAct ? 56 : 38, borderRadius: isAct ? 10 : 6,
                      border: isAct ? "2px solid rgba(167,139,250,0.85)" : "1.5px solid rgba(255,255,255,0.09)",
                      boxShadow: isAct ? "0 0 14px rgba(167,139,250,0.45)" : "none",
                      opacity: Math.max(0.15, 1 - dist * 0.22), transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                    {r.thumbnailUrl
                      ? <img loading="lazy" decoding="async" src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#7c3aed44,#ec489944)" }} />}
                  </motion.button>
                );
              })}
            </div>

          </motion.div>

          {/* AI inject chip */}
          <AnimatePresence>
            {injecting && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold z-30"
                style={{ background: "rgba(124,58,237,0.32)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(167,139,250,0.22)", color: "#c4b5fd" }}>
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                AI tavsiyalar qo'shilmoqda…
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Comments */}
      <AnimatePresence>
        {commentReel && (
          <CommentsSheet reelId={commentReel.id} commentsCount={commentReel.commentsCount ?? 0}
            user={user} onClose={() => setCommentReel(null)} />
        )}
      </AnimatePresence>

      <CreateContentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
