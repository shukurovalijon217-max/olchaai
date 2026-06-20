import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Brain, X, Loader2, Volume2, VolumeX, Send, Check, Zap,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────────── */
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

/* ─── Particle burst on like ─────────────────────────────────── */
const PCOLS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6ef7","#ff8c42","#c084fc","#38bdf8"];

function ParticleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const pts = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360;
    const dist  = 36 + Math.random() * 28;
    const rad   = (angle * Math.PI) / 180;
    return { tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist, color: PCOLS[i % PCOLS.length] };
  });
  return (
    <>
      {pts.map((p, i) => (
        <motion.div key={i}
          initial={{ x, y, scale: 1.2, opacity: 1 }}
          animate={{ x: x + p.tx, y: y + p.ty, scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.012 }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{ position:"absolute", width:7, height:7, borderRadius:"50%", background:p.color,
            pointerEvents:"none", zIndex:60, left:0, top:0, marginLeft:-3.5, marginTop:-3.5 }} />
      ))}
      <motion.div
        initial={{ scale: 0, opacity: 1, x: x - 24, y: y - 24 }}
        animate={{ scale: [0, 1.8, 1.2], opacity: [1, 1, 0], y: y - 80 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        style={{ position:"absolute", left:0, top:0, pointerEvents:"none", zIndex:60 }}>
        <Heart className="w-12 h-12 fill-red-500 text-red-500" />
      </motion.div>
    </>
  );
}

/* ─── Video element ──────────────────────────────────────────── */
function ReelVideoEl({ videoUrl, thumbnailUrl, isActive, muted, videoRef, onPlayState }: {
  videoUrl?: string | null; thumbnailUrl?: string | null;
  isActive: boolean; muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPlayState: (p: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (isActive) {
      v.currentTime = 0; setError(false);
      setLoading(v.readyState < 3);
      v.play().catch(() => onPlayState(true));
    } else { v.pause(); v.currentTime = 0; }
  }, [isActive, videoRef, onPlayState]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, videoRef]);

  if (!videoUrl) return (
    <div className="absolute inset-0">
      {thumbnailUrl
        ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ background:"linear-gradient(135deg,#1e0533,#030314)" }} />}
    </div>
  );

  return (
    <div className="absolute inset-0">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter:"blur(24px) brightness(0.3)", pointerEvents:"none" }} />
      )}
      {thumbnailUrl && (loading || !isActive) && !error && (
        <img src={thumbnailUrl} alt="" loading="eager"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]" />
      )}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>} src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-contain z-[2]"
        loop playsInline muted={muted} preload="auto"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); onPlayState(false); }}
        onPause={() => onPlayState(true)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ opacity: loading && !thumbnailUrl ? 0 : 1, transition:"opacity 120ms ease" }}
      />
      {loading && !error && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-white/5 border-t-pink-400 animate-spin"
              style={{ animationDuration:"0.7s", animationDirection:"reverse" }} />
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

/* ─── useVideoProgress ───────────────────────────────────────── */
function useVideoProgress(ref: React.RefObject<HTMLVideoElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const h = () => setProgress(v.duration > 0 ? v.currentTime / v.duration : 0);
    v.addEventListener("timeupdate", h, { passive:true });
    return () => v.removeEventListener("timeupdate", h);
  });
  return progress;
}

/* ─── Neon corner targeting brackets ────────────────────────── */
function NeonCorners({ color }: { color: string }) {
  const S = 22, W = "2.5px";
  const base: React.CSSProperties = {
    position:"absolute", width:S, height:S, opacity:0.9,
    filter:`drop-shadow(0 0 5px ${color})`, zIndex:22, pointerEvents:"none",
  };
  return (
    <>
      <div style={{ ...base, top:10, left:10, borderTop:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`, borderRadius:"4px 0 0 0" }} />
      <div style={{ ...base, top:10, right:10, borderTop:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 4px 0 0" }} />
      <div style={{ ...base, bottom:10, left:10, borderBottom:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`, borderRadius:"0 0 0 4px" }} />
      <div style={{ ...base, bottom:10, right:10, borderBottom:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 0 4px 0" }} />
    </>
  );
}

/* ─── CommentsSheet ──────────────────────────────────────────── */
function CommentsSheet({ reelId, commentsCount, onClose, user }: {
  reelId: number; commentsCount: number; onClose: () => void;
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
    fetch(`${API}/api/reels/${reelId}/comments`, { credentials:"include" })
      .then(r => r.ok ? r.json() : []).then(d => { setComments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/reels/${reelId}/comments`, {
        method:"POST", headers:{ "Content-Type":"application/json" }, credentials:"include",
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const nc = await res.json();
        setComments(prev => [nc, ...prev]);
        setCount(v => v + 1); setText("");
        setTimeout(() => listRef.current?.scrollTo({ top:0, behavior:"smooth" }), 100);
      }
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:28, stiffness:300 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-3xl overflow-hidden"
        style={{ maxHeight:"75vh", background:"rgba(10,8,24,0.96)", backdropFilter:"blur(24px)",
          border:"1px solid rgba(124,58,237,0.2)", borderBottom:"none" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-white font-bold text-sm">{count} {t("reels.comments")}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background:"rgba(255,255,255,0.08)" }}>
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
        <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-4"
          style={{ maxHeight:"calc(75vh - 140px)" }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">{t("reels.no_comments")}</p>
          ) : comments.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.03 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/60 to-pink-600/60 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                {c.author.avatarUrl
                  ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-white">{c.author.displayName?.[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white text-xs font-semibold">{c.author.displayName}</span>
                  {c.author.isVerified && <BadgeCheck className="w-3 h-3 text-violet-400" />}
                  <span className="text-white/30 text-[10px] ml-auto">
                    {new Date(c.createdAt).toLocaleDateString(i18n.language, { month:"short", day:"numeric" })}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="px-4 py-3 flex items-center gap-3"
          style={{ borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/60 to-pink-600/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white">{user?.displayName?.[0]?.toUpperCase() ?? "?"}</span>}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none"
              style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}
            />
            <motion.button whileTap={{ scale:0.88 }} onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ background:"linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── SIGNAL Action Bar — horizontal pill ────────────────────── */
function SignalBar({
  reel, isLiked, sharedId, muted, analyzingId, showAnalysisId,
  onLike, onComment, onShare, onAnalyze, onAdd, onMute, onToggleAnalysis,
}: {
  reel: FeedItem; isLiked: boolean; sharedId: number | null; muted: boolean;
  analyzingId: number | null; showAnalysisId: number | null;
  onLike: () => void; onComment: () => void; onShare: () => void;
  onAnalyze: () => void; onAdd: () => void; onMute: () => void; onToggleAnalysis: () => void;
}) {
  const likes = (reel.likesCount ?? 0) + (isLiked ? 1 : 0);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  const Divider = () => (
    <div style={{ width:1, height:32, background:"rgba(255,255,255,0.09)", flexShrink:0 }} />
  );

  const Btn = ({ children, onClick, active, activeColor, label }: {
    children: React.ReactNode; onClick: () => void;
    active?: boolean; activeColor?: string; label: string;
  }) => (
    <motion.button whileTap={{ scale: 0.72 }} onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-colors flex-shrink-0"
      style={{ background: active ? `${activeColor ?? "rgba(255,255,255,0.1)"}` : "transparent" }}>
      {children}
      <span className="text-[9px] font-bold leading-none" style={{ color:"rgba(255,255,255,0.4)" }}>{label}</span>
    </motion.button>
  );

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type:"spring", damping:20, stiffness:300, delay:0.08 }}
      className="flex items-center justify-center">
      <div className="flex items-center gap-0 rounded-[999px] overflow-hidden"
        style={{
          background:"rgba(8,5,22,0.86)",
          backdropFilter:"blur(28px)",
          border:"1px solid rgba(255,255,255,0.09)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}>

        {/* Like */}
        <Btn onClick={onLike} active={isLiked} activeColor="rgba(239,68,68,0.22)" label={fmt(likes)}>
          <motion.div animate={isLiked ? { scale:[1,1.4,1.1,1] } : { scale:1 }} transition={{ duration:0.3 }}>
            <Heart className={`w-[22px] h-[22px] transition-all ${isLiked ? "fill-red-400 text-red-400" : "text-white/80"}`} />
          </motion.div>
        </Btn>
        <Divider />

        {/* Comment */}
        <Btn onClick={onComment} label={fmt(reel.commentsCount ?? 0)}>
          <MessageCircle className="w-[22px] h-[22px] text-white/80" />
        </Btn>
        <Divider />

        {/* Share */}
        <Btn onClick={onShare} active={sharedId === reel.id} activeColor="rgba(16,185,129,0.22)" label="Ulash">
          {sharedId === reel.id
            ? <Check className="w-[22px] h-[22px] text-emerald-400" />
            : <Share2 className="w-[22px] h-[22px] text-white/80" />}
        </Btn>
        <Divider />

        {/* AI Brain */}
        <Btn onClick={() => { if (showAnalysisId === reel.id) onToggleAnalysis(); else onAnalyze(); }}
          active={showAnalysisId === reel.id} activeColor="rgba(124,58,237,0.3)" label="AI">
          {analyzingId === reel.id
            ? <Loader2 className="w-[22px] h-[22px] text-purple-400 animate-spin" />
            : <Brain className={`w-[22px] h-[22px] ${showAnalysisId === reel.id ? "text-purple-300" : "text-white/80"}`} />}
        </Btn>
        <Divider />

        {/* Create */}
        <Btn onClick={onAdd} label="Yaratish">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
            style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            <Plus className="w-3.5 h-3.5 text-white" />
          </div>
        </Btn>
        <Divider />

        {/* Mute */}
        <Btn onClick={onMute} label={muted ? "Ses" : "Ovoz"}>
          {muted
            ? <VolumeX className="w-[22px] h-[22px] text-white/45" />
            : <Volume2 className="w-[22px] h-[22px] text-white/80" />}
        </Btn>
      </div>
    </motion.div>
  );
}

/* ─── ReelSlide — full redesign ──────────────────────────────── */
function ReelSlide({
  reel, isActive, muted,
  onLike, isLiked, onAnalyze, analyzingId, analysis,
  showAnalysisId, onToggleAnalysis,
  onComment, onShare, sharedId, onAdd, onMute,
}: {
  reel: FeedItem; isActive: boolean; muted: boolean;
  onLike: () => void; isLiked: boolean;
  onAnalyze: () => void; analyzingId: number | null;
  analysis?: Analysis; showAnalysisId: number | null; onToggleAnalysis: () => void;
  onComment: () => void; onShare: () => void; sharedId: number | null;
  onAdd: () => void; onMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = useVideoProgress(videoRef);
  const [paused, setPaused] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [lastTap, setLastTap] = useState(0);

  /* neon color changes based on AI sentiment or AI-suggested */
  const neonColor = analysis?.sentiment === "positive" ? "#10b981"
    : analysis?.sentiment === "negative" ? "#ef4444"
    : reel._aiSuggested ? "#a78bfa" : "#7c3aed";

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (now - lastTap < 280) {
      if (!isLiked) onLike();
      setParticles(p => [...p, { x, y, id: now }]);
    } else {
      const v = videoRef.current;
      if (v) { if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); } }
    }
    setLastTap(now);
  }, [lastTap, isLiked, onLike]);

  return (
    <div className="relative w-full h-full flex flex-col" style={{ paddingBottom: 68 }}>

      {/* ── Ambient full-screen blur bg ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
        style={{ borderRadius: "inherit" }}>
        {reel.thumbnailUrl && (
          <img src={reel.thumbnailUrl} alt="" aria-hidden="true"
            className="absolute inset-[-8%] w-[116%] h-[116%] object-cover"
            style={{ filter:"blur(52px) saturate(2.2) brightness(0.22)" }} />
        )}
        <div className="absolute inset-0"
          style={{ background:`radial-gradient(ellipse at 50% 35%, ${neonColor}18 0%, rgba(0,0,0,0.72) 100%)` }} />
      </div>

      {/* ── Main floating video card ── */}
      <div className="relative flex-1 mx-1 rounded-[30px] overflow-hidden"
        style={{
          boxShadow:`0 0 64px ${neonColor}2a, 0 28px 72px rgba(0,0,0,0.85)`,
          border:`1.5px solid ${neonColor}1e`,
        }}>

        {/* Video */}
        <ReelVideoEl videoUrl={reel.videoUrl} thumbnailUrl={reel.thumbnailUrl}
          isActive={isActive} muted={muted} videoRef={videoRef} onPlayState={setPaused} />

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background:"linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 28%, transparent 52%)" }} />
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, transparent 22%)" }} />

        {/* Neon corner brackets */}
        <NeonCorners color={neonColor} />

        {/* Tap zone */}
        <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleTap} />

        {/* Particle burst on like */}
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
          {particles.map(p => (
            <ParticleBurst key={p.id} x={p.x} y={p.y}
              onDone={() => setParticles(prev => prev.filter(h => h.id !== p.id))} />
          ))}
        </div>

        {/* Progress strip — colored glow at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ height:3 }}>
          <div style={{
            width:`${progress * 100}%`, height:"100%",
            background:`linear-gradient(90deg, ${neonColor}, #06b6d4)`,
            boxShadow:`0 0 8px ${neonColor}cc`,
            transition:"width 0.12s linear",
          }} />
        </div>

        {/* Pause overlay */}
        <AnimatePresence>
          {paused && (
            <motion.div initial={{ opacity:0, scale:0.55 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:1.4 }} transition={{ duration:0.16 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div style={{
                width:70, height:70, borderRadius:"50%",
                background:"rgba(0,0,0,0.62)", backdropFilter:"blur(12px)",
                border:"1.5px solid rgba(255,255,255,0.22)",
                boxShadow:`0 0 32px ${neonColor}55`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg className="fill-white" width="28" height="28" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Top bar: AI badge + views ── */}
        <div className="absolute top-4 inset-x-4 flex items-start justify-between z-30 pointer-events-none">
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            {reel._aiSuggested && (
              <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background:"rgba(124,58,237,0.45)", backdropFilter:"blur(10px)",
                  border:"1px solid rgba(167,139,250,0.4)", color:"#c4b5fd" }}>
                <Zap className="w-2.5 h-2.5" />
                <span>AI tavsiya · {reel._aiReason}</span>
              </motion.div>
            )}
          </div>
          {(reel.viewsCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background:"rgba(0,0,0,0.42)", backdropFilter:"blur(8px)",
                border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)" }}>
              👁 {(reel.viewsCount ?? 0) >= 1000 ? `${((reel.viewsCount ?? 0)/1000).toFixed(1)}K` : reel.viewsCount}
            </div>
          )}
        </div>

        {/* ── AI Analysis dropdown ── */}
        <AnimatePresence>
          {showAnalysisId === reel.id && analysis && (
            <motion.div initial={{ opacity:0, y:-10, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-10, scale:0.96 }}
              className="absolute top-16 inset-x-4 z-30 pointer-events-auto">
              <div className="rounded-2xl p-3.5 space-y-2"
                style={{ background:"rgba(8,5,22,0.93)", backdropFilter:"blur(20px)",
                  border:`1px solid ${neonColor}44` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {analysis.category && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                        style={{ background:"rgba(124,58,237,0.35)", color:"#c4b5fd" }}>
                        {analysis.category}
                      </span>
                    )}
                    {analysis.sentiment && (
                      <span className={`text-[10px] font-semibold ${analysis.sentiment === "positive" ? "text-emerald-400" : analysis.sentiment === "negative" ? "text-red-400" : "text-white/50"}`}>
                        {analysis.sentiment === "positive" ? "✅ Ijobiy" : analysis.sentiment === "negative" ? "⚠️ Salbiy" : "😐 Neytral"}
                      </span>
                    )}
                  </div>
                  <button onClick={onToggleAnalysis}>
                    <X className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                  </button>
                </div>
                {analysis.summary && <p className="text-[11px] text-white/70 leading-relaxed">{analysis.summary}</p>}
                {analysis.tags && analysis.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysis.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.45)" }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Author + caption card at bottom ── */}
        <div className="absolute bottom-5 left-4 right-4 z-30 pointer-events-none">
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative flex-shrink-0 w-10 h-10">
              <motion.div className="absolute inset-[-2px] rounded-full"
                style={{ background:`conic-gradient(from 0deg, ${neonColor}, #3b82f6, #06b6d4, ${neonColor})` }}
                animate={{ rotate:360 }} transition={{ duration:4, repeat:Infinity, ease:"linear" }} />
              <div className="absolute inset-[2px] rounded-full overflow-hidden bg-black z-10">
                {reel.author?.avatarUrl
                  ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                      {reel.author?.displayName?.[0]?.toUpperCase()}
                    </div>}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-black text-sm leading-tight truncate">{reel.author?.displayName}</span>
                {reel.author?.isVerified && <BadgeCheck className="w-4 h-4 flex-shrink-0 text-violet-400" />}
              </div>
              <span className="text-[11px] text-white/40">@{reel.author?.username}</span>
            </div>
          </div>

          {/* Caption */}
          {reel.caption && (
            <p className="text-white text-[13px] leading-relaxed mb-2 font-medium"
              style={{ textShadow:"0 1px 8px rgba(0,0,0,0.95)" }}>
              {reel.caption.length > 75 ? reel.caption.slice(0, 75) + "…" : reel.caption}
            </p>
          )}

          {/* Audio + tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {reel.audioTrack && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)" }}>
                <motion.div animate={{ rotate:360 }} transition={{ duration:3, repeat:Infinity, ease:"linear" }}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.12)" }}>
                  <Music className="w-2 h-2 text-white" />
                </motion.div>
                <span className="text-[10px] text-white/55 truncate max-w-[90px]">{reel.audioTrack}</span>
              </div>
            )}
            {reel.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ color:neonColor, background:`${neonColor}1a`, border:`1px solid ${neonColor}2e` }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SIGNAL Bar ── */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center px-2">
        <SignalBar
          reel={reel} isLiked={isLiked} sharedId={sharedId} muted={muted}
          analyzingId={analyzingId} showAnalysisId={showAnalysisId}
          onLike={onLike} onComment={onComment} onShare={onShare}
          onAnalyze={onAnalyze} onAdd={onAdd} onMute={onMute} onToggleAnalysis={onToggleAnalysis}
        />
      </div>
    </div>
  );
}

/* ─── Main ReelsPage ─────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: initialReels = [], isLoading } = useListReels({ limit: 20 } as any);
  const [feed, setFeed]                         = useState<FeedItem[]>([]);
  const [current, setCurrent]                   = useState(0);
  const [likedIds, setLikedIds]                 = useState<Set<number>>(new Set());
  const [muted, setMuted]                       = useState(false);
  const [createOpen, setCreateOpen]             = useState(false);
  const [commentReel, setCommentReel]           = useState<FeedItem | null>(null);
  const [analysisMap, setAnalysisMap]           = useState<Record<number, Analysis>>({});
  const [analyzingId, setAnalyzingId]           = useState<number | null>(null);
  const [showAnalysisId, setShowAnalysisId]     = useState<number | null>(null);
  const [sharedId, setSharedId]                 = useState<number | null>(null);
  const [injecting, setInjecting]               = useState(false);

  const likeReel = useLikeReel();
  const qc       = useQueryClient();
  const { user } = useAuth();

  const watchedTagsRef = useRef<string[]>([]);
  const watchedIdsRef  = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (initialReels.length > 0 && feed.length === 0)
      setFeed(initialReels as FeedItem[]);
  }, [initialReels, feed.length]);

  useEffect(() => {
    const reel = feed[current]; if (!reel) return;
    fetch(`${API}/api/interactions`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, credentials:"include",
      body: JSON.stringify({ contentType:"reel", contentId:reel.id, interactionType:"view" }),
    }).catch(() => {});
    fetch(`${API}/api/reels/${reel.id}/view`, { method:"POST", credentials:"include" }).catch(() => {});
    if (reel.tags?.length) {
      watchedTagsRef.current = [...new Set([...watchedTagsRef.current, ...reel.tags])].slice(0, 10);
    }
    watchedIdsRef.current.add(reel.id);
    if (current > 0 && current % 4 === 0 && watchedTagsRef.current.length > 0 && !injecting) {
      const excludeIds = Array.from(watchedIdsRef.current).join(",");
      const topTags    = watchedTagsRef.current.slice(0, 5).join(",");
      setInjecting(true);
      fetch(`${API}/api/reels/similar?tags=${encodeURIComponent(topTags)}&excludeIds=${excludeIds}&limit=5`,
        { credentials:"include" })
        .then(r => r.ok ? r.json() : [])
        .then((similar: FeedItem[]) => {
          if (similar.length > 0) {
            setFeed(prev => {
              const at = Math.min(current + 3, prev.length);
              return [...prev.slice(0, at),
                ...similar.map(r => ({ ...r, _aiSuggested:true, _aiReason:topTags.split(",")[0] })),
                ...prev.slice(at)];
            });
          }
        }).catch(() => {}).finally(() => setInjecting(false));
    }
  }, [current, feed, injecting]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") setCurrent(c => Math.min(feed.length - 1, c + 1));
      else if (e.key === "ArrowUp" || e.key === "k") setCurrent(c => Math.max(0, c - 1));
      else if (e.key === "m" || e.key === "M") setMuted(v => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [feed.length]);

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

  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; }, []);
  const handleTouchEnd   = useCallback((e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 50)  setCurrent(c => Math.min(feed.length - 1, c + 1));
    if (dy < -50) setCurrent(c => Math.max(0, c - 1));
  }, [feed.length]);

  const y = useMotionValue(0);
  const dragOpacity = useTransform(y, [-80, 0, 80], [0.5, 1, 0.5]);
  const handleDragEnd = useCallback((_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y < -50) setCurrent(c => Math.min(feed.length - 1, c + 1));
    else if (info.offset.y > 50) setCurrent(c => Math.max(0, c - 1));
    y.set(0);
  }, [feed.length, y]);

  const handleLike = useCallback((reelId: number) => {
    const next = new Set(likedIds);
    if (next.has(reelId)) next.delete(reelId); else next.add(reelId);
    setLikedIds(next);
    likeReel.mutate({ id:reelId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey:getListReelsQueryKey() }),
      onError: () => {
        const rb = new Set(likedIds);
        if (rb.has(reelId)) rb.delete(reelId); else rb.add(reelId);
        setLikedIds(rb);
      },
    });
  }, [likedIds, likeReel, qc]);

  const handleAnalyze = useCallback(async (reelId: number, caption?: string, thumbUrl?: string) => {
    if (analysisMap[reelId]) { setShowAnalysisId(reelId); return; }
    setAnalyzingId(reelId);
    try {
      const res = await fetch(`${API}/api/ai/analyze-content`, {
        method:"POST", headers:{ "Content-Type":"application/json" }, credentials:"include",
        body: JSON.stringify({ contentId:reelId, contentType:"reel", caption:caption ?? "", imageUrl:thumbUrl }),
      });
      if (res.ok) { const d = await res.json(); setAnalysisMap(p => ({ ...p, [reelId]:d })); setShowAnalysisId(reelId); }
    } catch { /* silent */ } finally { setAnalyzingId(null); }
  }, [analysisMap]);

  const handleShare = useCallback(async (reelId: number, caption: string) => {
    const url = `${window.location.origin}/reels`;
    try {
      if (navigator.share) await navigator.share({ title:caption || "OlCha Reel", url });
      else await navigator.clipboard.writeText(url);
    } catch { try { await navigator.clipboard.writeText(url); } catch { /* silent */ } }
    setSharedId(reelId); setTimeout(() => setSharedId(null), 2200);
    fetch(`${API}/api/interactions`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, credentials:"include",
      body: JSON.stringify({ contentType:"reel", contentId:reelId, interactionType:"share" }),
    }).catch(() => {});
  }, []);

  const reel = feed[current];

  return (
    <div className="relative flex items-center justify-center overflow-hidden"
      style={{ height:"calc(100vh - 60px)", minHeight:480, background:"#000" }}
      onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* ── Full-screen ambient background — animated per reel ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {reel?.thumbnailUrl && (
            <motion.img key={reel.id} src={reel.thumbnailUrl} alt="" aria-hidden="true"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.6 }}
              className="absolute inset-[-12%] w-[124%] h-[124%] object-cover"
              style={{ filter:"blur(72px) saturate(2.8) brightness(0.18)" }} />
          )}
        </AnimatePresence>
        {/* Dark veil */}
        <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.58)" }} />
        {/* Scanline texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage:"repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)" }} />
      </div>

      {/* ── Preload next videos ── */}
      <div style={{ display:"none" }} aria-hidden="true">
        {[current + 1, current + 2].map(i => {
          const r = feed[i]; if (!r?.videoUrl) return null;
          return <video key={r.id} src={r.videoUrl} preload="auto" muted playsInline loop />;
        })}
        {[current + 1, current + 2, current + 3].map(i => {
          const r = feed[i]; if (!r?.thumbnailUrl) return null;
          return <img key={`t-${r.id}`} src={r.thumbnailUrl} loading="eager" alt="" />;
        })}
      </div>

      {/* ── Loading / empty states ── */}
      {isLoading && feed.length === 0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-3 rounded-full border border-white/10 border-t-pink-400 animate-spin"
              style={{ animationDuration:"0.6s", animationDirection:"reverse" }} />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-sm tracking-widest">◈ SIGNAL</p>
            <p className="text-white/35 text-xs mt-1">lenta yuklanmoqda…</p>
          </div>
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>🎬</div>
          <div className="text-center">
            <p className="font-black text-white mb-1">Hali reel yo'q</p>
            <p className="text-sm text-white/50">Birinchi reelni yuklang!</p>
          </div>
          <motion.button whileTap={{ scale:0.95 }} onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
            style={{ background:"linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow:"0 4px 24px rgba(124,58,237,0.5)" }}>
            <Plus className="w-4 h-4" /> Reel qo'shish
          </motion.button>
        </div>

      ) : reel && (
        <>
          {/* ── Main drag container ── */}
          <motion.div drag="y" dragConstraints={{ top:0, bottom:0 }} dragElastic={0.11}
            onDragEnd={handleDragEnd}
            className="relative z-10 select-none touch-none"
            style={{
              opacity: dragOpacity,
              width: "min(100%, calc((100vh - 60px) * 0.52))",
              height: "calc(100vh - 60px)",
            }}>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={reel.id}
                initial={{ opacity:0, y:36, scale:0.97 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-36, scale:0.97 }}
                transition={{ type:"spring", stiffness:420, damping:36 }}
                className="absolute inset-0">
                <ReelSlide
                  reel={reel} isActive={true} muted={muted}
                  onLike={() => handleLike(reel.id)} isLiked={likedIds.has(reel.id)}
                  onAnalyze={() => handleAnalyze(reel.id, reel.caption ?? undefined, reel.thumbnailUrl ?? undefined)}
                  analyzingId={analyzingId} analysis={analysisMap[reel.id]}
                  showAnalysisId={showAnalysisId}
                  onToggleAnalysis={() => setShowAnalysisId(v => v === reel.id ? null : reel.id)}
                  onComment={() => setCommentReel(reel)}
                  onShare={() => handleShare(reel.id, reel.caption ?? "")}
                  sharedId={sharedId} onAdd={() => setCreateOpen(true)}
                  onMute={() => setMuted(v => !v)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Desktop nav arrows */}
            <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex-col gap-3 hidden md:flex z-20">
              {[{ dir:-1, icon:"M5 15l7-7 7 7" }, { dir:1, icon:"M19 9l-7 7-7-7" }].map(({ dir, icon }, i) => (
                <motion.button key={i} whileTap={{ scale:0.85 }}
                  onClick={() => setCurrent(c => Math.max(0, Math.min(feed.length - 1, c + dir)))}
                  disabled={dir === -1 ? current === 0 : current >= feed.length - 1}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-20"
                  style={{ background:"rgba(255,255,255,0.08)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.12)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Right filmstrip — vertical thumbnail navigator ── */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 items-center">
            {/* SIGNAL label */}
            <div className="mb-1 flex flex-col items-center gap-0.5">
              <div className="w-[3px] h-3 rounded-full" style={{ background:"rgba(255,255,255,0.15)" }} />
            </div>

            {feed.slice(Math.max(0, current - 3), Math.min(feed.length, current + 6)).map((r, relIdx) => {
              const absIdx = Math.max(0, current - 3) + relIdx;
              const isAct  = absIdx === current;
              const dist   = Math.abs(absIdx - current);
              return (
                <motion.button key={r.id}
                  onClick={() => setCurrent(absIdx)}
                  whileTap={{ scale:0.82 }}
                  animate={{ scale: isAct ? 1 : 1 - dist * 0.06 }}
                  className="overflow-hidden flex-shrink-0 transition-all"
                  style={{
                    width:  isAct ? 38 : 28,
                    height: isAct ? 58 : 42,
                    borderRadius: isAct ? 12 : 8,
                    border: isAct
                      ? "2px solid rgba(167,139,250,0.9)"
                      : "1.5px solid rgba(255,255,255,0.12)",
                    boxShadow: isAct ? "0 0 14px rgba(167,139,250,0.55)" : "0 2px 8px rgba(0,0,0,0.5)",
                    opacity: Math.max(0.2, 1 - dist * 0.22),
                    transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  }}>
                  {r.thumbnailUrl
                    ? <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full"
                        style={{ background:"linear-gradient(135deg,#7c3aed55,#ec489955)" }} />
                  }
                  {isAct && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background:"rgba(167,139,250,0.15)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}

            <div className="mt-1 flex flex-col items-center gap-0.5">
              <div className="w-[3px] h-3 rounded-full" style={{ background:"rgba(255,255,255,0.15)" }} />
              {feed.length > 0 && (
                <span className="text-[8px] font-black text-white/25 mt-0.5"
                  style={{ writingMode:"vertical-lr", letterSpacing:"0.1em" }}>
                  {current + 1}/{feed.length}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── AI inject indicator ── */}
      <AnimatePresence>
        {injecting && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold z-30"
            style={{ background:"rgba(124,58,237,0.3)", backdropFilter:"blur(8px)", border:"1px solid rgba(167,139,250,0.2)", color:"#c4b5fd" }}>
            <Sparkles className="w-2.5 h-2.5 animate-pulse" />
            AI tavsiyalar tayyorlanmoqda…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Comments sheet ── */}
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
