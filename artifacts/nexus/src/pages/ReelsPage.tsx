import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Brain, X, Loader2, Volume2, VolumeX, Send, Check,
  Copy, ExternalLink, Eye, Zap,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────── */
interface FeedItem {
  id: number; videoUrl?: string | null; thumbnailUrl?: string | null;
  caption?: string | null; audioTrack?: string | null; duration?: number | null;
  likesCount?: number; commentsCount?: number; viewsCount?: number; tags?: string[];
  author?: { id: number; username?: string; displayName?: string; avatarUrl?: string | null; isVerified?: boolean };
  isLiked?: boolean; _aiSuggested?: boolean; _aiReason?: string;
}
interface ReelComment {
  id: number; content: string; likesCount: number; createdAt: string;
  author: { id: number; displayName?: string; username?: string; avatarUrl?: string | null; isVerified?: boolean };
}
interface Analysis { tags?: string[]; category?: string; summary?: string; sentiment?: string }

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;

const initials = (name?: string) =>
  (name ?? "?").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

/* ─── Design tokens ──────────────────────────────────────── */
/** Perfect glass circle — same diameter for all action buttons */
const CIRC = 44;
const circleBase: React.CSSProperties = {
  width: CIRC, height: CIRC, borderRadius: "50%", flexShrink: 0,
  background: "rgba(8,6,22,0.44)",
  backdropFilter: "blur(22px) saturate(1.6)",
  WebkitBackdropFilter: "blur(22px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.13)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

/** Small volume circle */
const VOL_SIZE = 32;
const volCircle: React.CSSProperties = {
  width: VOL_SIZE, height: VOL_SIZE, borderRadius: "50%", flexShrink: 0,
  background: "rgba(6,4,18,0.42)",
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

/* ─── Particle burst on double-tap ──────────────────────── */
const PCOLS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6ef7","#ff8c42","#c084fc","#38bdf8"];
function ParticleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const pts = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360, dist = 40 + Math.random() * 28;
    const rad = (angle * Math.PI) / 180;
    return { tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist, color: PCOLS[i % PCOLS.length] };
  });
  return (
    <>
      {pts.map((p, i) => (
        <motion.div key={i}
          initial={{ x, y, scale: 1.2, opacity: 1 }}
          animate={{ x: x + p.tx, y: y + p.ty, scale: 0, opacity: 0 }}
          transition={{ duration: 0.56, ease: "easeOut", delay: i * 0.01 }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{ position:"absolute", width:7, height:7, borderRadius:"50%",
            background: p.color, pointerEvents:"none", zIndex:60, left:0, top:0, marginLeft:-3.5, marginTop:-3.5 }} />
      ))}
      <motion.div
        initial={{ scale:0, opacity:1, x:x-24, y:y-24 }}
        animate={{ scale:[0,1.8,1.1], opacity:[1,1,0], y:y-82 }}
        transition={{ duration:0.7, ease:"easeOut" }}
        style={{ position:"absolute", left:0, top:0, pointerEvents:"none", zIndex:60 }}>
        <Heart className="w-12 h-12 fill-red-500 text-red-500" />
      </motion.div>
    </>
  );
}

/* ─── Neon corners ───────────────────────────────────────── */
function NeonCorners({ color }: { color: string }) {
  const S = 18, W = "2px";
  const c: React.CSSProperties = { position:"absolute", width:S, height:S, opacity:0.85,
    filter:`drop-shadow(0 0 4px ${color})`, zIndex:25, pointerEvents:"none" };
  return (
    <>
      <div style={{ ...c, top:9, left:9,    borderTop:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`, borderRadius:"3px 0 0 0" }} />
      <div style={{ ...c, top:9, right:9,   borderTop:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 3px 0 0" }} />
      <div style={{ ...c, bottom:9, left:9,  borderBottom:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`, borderRadius:"0 0 0 3px" }} />
      <div style={{ ...c, bottom:9, right:9, borderBottom:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 0 3px 0" }} />
    </>
  );
}

/* ─── Video element ──────────────────────────────────────── */
function ReelVideoEl({ videoUrl, thumbnailUrl, isActive, muted, videoRef, onPlayState }: {
  videoUrl?: string|null; thumbnailUrl?: string|null; isActive: boolean; muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement|null>; onPlayState: (p: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (isActive) { v.currentTime=0; setError(false); setLoading(v.readyState<3); v.play().catch(()=>onPlayState(true)); }
    else { v.pause(); v.currentTime=0; }
  }, [isActive, videoRef, onPlayState]);
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, videoRef]);

  if (!videoUrl) return (
    <div className="absolute inset-0">
      {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ background:"linear-gradient(135deg,#1e0533,#030314)" }} />}
    </div>
  );
  return (
    <div className="absolute inset-0">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter:"blur(22px) brightness(0.28)", pointerEvents:"none" }} />
      )}
      {thumbnailUrl && (loading||!isActive) && !error && (
        <img src={thumbnailUrl} alt="" loading="eager"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]" />
      )}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        src={videoUrl} poster={thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-contain z-[2]"
        loop playsInline muted={muted} preload="auto"
        onLoadedData={()=>setLoading(false)} onCanPlay={()=>setLoading(false)}
        onWaiting={()=>setLoading(true)}
        onPlaying={()=>{ setLoading(false); onPlayState(false); }}
        onPause={()=>onPlayState(true)}
        onError={()=>{ setError(true); setLoading(false); }}
        style={{ opacity:loading&&!thumbnailUrl?0:1, transition:"opacity 100ms ease" }}
      />
      {loading && !error && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-white/5 border-t-pink-400 animate-spin"
              style={{ animationDuration:"0.65s", animationDirection:"reverse" }} />
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 z-[3] pointer-events-none">
          {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
          <span className="text-white/65 text-xs bg-black/50 px-4 py-2 rounded-full z-10">Video mavjud emas</span>
        </div>
      )}
    </div>
  );
}

function useVideoProgress(ref: React.RefObject<HTMLVideoElement|null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const h = () => setProgress(v.duration>0 ? v.currentTime/v.duration : 0);
    v.addEventListener("timeupdate", h, { passive:true });
    return () => v.removeEventListener("timeupdate", h);
  });
  return progress;
}

/* ─── Comments sheet ─────────────────────────────────────── */
function CommentsSheet({ reelId, commentsCount, onClose, user }: {
  reelId: number; commentsCount: number; onClose: () => void;
  user: { id:number; displayName?:string; avatarUrl?:string|null }|null;
}) {
  const { t, i18n } = useTranslation();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [count, setCount]       = useState(commentsCount);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/reels/${reelId}/comments`, { credentials:"include" })
      .then(r=>r.ok?r.json():[]).then(d=>{ setComments(d); setLoading(false); }).catch(()=>setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim()||!user||sending) return; setSending(true);
    try {
      const res = await fetch(`${API}/api/reels/${reelId}/comments`, {
        method:"POST", headers:{ "Content-Type":"application/json" }, credentials:"include",
        body: JSON.stringify({ content:text }),
      });
      if (res.ok) {
        const nc = await res.json(); setComments(p=>[nc,...p]); setCount(v=>v+1); setText("");
        setTimeout(()=>listRef.current?.scrollTo({top:0,behavior:"smooth"}),100);
      }
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:28, stiffness:300 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-3xl overflow-hidden"
        style={{ maxHeight:"75vh", background:"rgba(10,8,24,0.96)", backdropFilter:"blur(24px)",
          border:"1px solid rgba(124,58,237,0.2)", borderBottom:"none" }}
        onClick={e=>e.stopPropagation()}>
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
          ) : comments.length===0 ? (
            <p className="text-white/30 text-sm text-center py-8">{t("reels.no_comments")}</p>
          ) : comments.map((c,i)=>(
            <motion.div key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.03}} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border border-white/10"
                style={{ background:"linear-gradient(135deg,#7c3aed55,#ec489955)" }}>
                {c.author.avatarUrl
                  ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white">
                      {initials(c.author.displayName)}
                    </div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white text-xs font-semibold">{c.author.displayName}</span>
                  {c.author.isVerified&&<BadgeCheck className="w-3 h-3 text-violet-400"/>}
                  <span className="text-white/30 text-[10px] ml-auto">
                    {new Date(c.createdAt).toLocaleDateString(i18n.language,{month:"short",day:"numeric"})}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{c.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="px-4 py-3 flex items-center gap-3"
          style={{ borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
            style={{ background:"linear-gradient(135deg,#7c3aed55,#ec489955)" }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                  {initials(user?.displayName)}
                </div>}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} }}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none"
              style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}
            />
            <motion.button whileTap={{scale:0.88}} onClick={handleSend}
              disabled={!text.trim()||sending}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{ background:"linear-gradient(135deg,#7c3aed,#3b82f6)" }}>
              {sending?<Loader2 className="w-4 h-4 text-white animate-spin"/>:<Send className="w-4 h-4 text-white"/>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Speed indicator (center glass) ────────────────────── */
function SpeedGlass({ speed, side }: { speed: number; side: "left"|"right" }) {
  const color = side==="left" ? "#38bdf8" : "#f59e0b";
  const dots  = speed<=0.25?1:speed<=0.5?2:speed<=0.75?3:speed===1?4:speed<=1.25?5:speed<=1.5?6:7;
  return (
    <motion.div initial={{opacity:0,scale:0.82}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.82}}
      transition={{type:"spring",damping:22,stiffness:380}}
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="flex flex-col items-center gap-2 px-8 py-4 rounded-3xl"
        style={{ background:"rgba(5,4,15,0.58)", backdropFilter:"blur(30px) saturate(1.5)",
          WebkitBackdropFilter:"blur(30px) saturate(1.5)",
          border:`1px solid ${color}28`, boxShadow:`0 0 44px ${color}14, inset 0 1px 0 rgba(255,255,255,0.07)` }}>
        <div className="flex items-center gap-1">
          {side==="left"
            ? [1,0.6,0.25].map((o,i)=>(
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="none" style={{opacity:o}}>
                  <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ))
            : [0.25,0.6,1].map((o,i)=>(
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="none" style={{opacity:o}}>
                  <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ))
          }
        </div>
        <span className="font-black tabular-nums"
          style={{ fontSize:38, color, textShadow:`0 0 22px ${color}88`, letterSpacing:"-0.02em" }}>
          {speed}×
        </span>
        <div className="flex gap-[5px]">
          {Array.from({length:7},(_,i)=>(
            <div key={i} className="rounded-full transition-all duration-200"
              style={{ width:i<dots?8:5, height:i<dots?8:5, background:i<dots?color:"rgba(255,255,255,0.13)",
                boxShadow:i<dots?`0 0 6px ${color}`:undefined }} />
          ))}
        </div>
        <span className="text-[9px] font-bold" style={{color:`${color}88`,letterSpacing:"0.1em"}}>
          {side==="left"?"◀ SEKIN":"TEZ ▶"}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Circle action button with vertical dropdown ────────── */
type PanelType = "like"|"comment"|"share"|"ai"|"create"|null;

/** One circle option that slides in from above */
function DropCircle({
  icon, label, color, bg, onClick, delay = 0,
}: {
  icon: React.ReactNode; label?: string; color?: string;
  bg?: string; onClick?: () => void; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity:0, y:-14, scale:0.7 }}
      animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-10, scale:0.7 }}
      transition={{ type:"spring", damping:20, stiffness:380, delay }}
      className="flex flex-col items-center gap-0.5">
      <motion.button whileTap={{scale:0.72}} onClick={onClick}
        style={{
          ...circleBase,
          background: bg ?? "rgba(8,6,22,0.56)",
          border: `1px solid ${color ? color+"28" : "rgba(255,255,255,0.13)"}`,
          boxShadow: color ? `0 0 16px ${color}24, inset 0 1px 0 rgba(255,255,255,0.09)` : circleBase.boxShadow,
        }}>
        {icon}
      </motion.button>
      {label && (
        <span className="text-[8px] font-bold" style={{color:color??"rgba(255,255,255,0.45)",letterSpacing:"0.05em"}}>
          {label}
        </span>
      )}
    </motion.div>
  );
}

/* ─── ReelSlide ──────────────────────────────────────────── */
function ReelSlide({
  reel, isActive, muted,
  onLike, isLiked, onAnalyze, analyzingId, analysis,
  onComment, onShare, sharedId, onAdd, onMute,
}: {
  reel: FeedItem; isActive: boolean; muted: boolean;
  onLike:()=>void; isLiked:boolean;
  onAnalyze:()=>void; analyzingId:number|null; analysis?:Analysis;
  onComment:()=>void; onShare:()=>void; sharedId:number|null;
  onAdd:()=>void; onMute:()=>void;
}) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const progress   = useVideoProgress(videoRef);
  const [paused, setPaused]       = useState(false);
  const [particles, setParticles] = useState<{x:number;y:number;id:number}[]>([]);
  const [lastTap, setLastTap]     = useState(0);
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const [shareOk, setShareOk]     = useState(false);

  /* speed-hold */
  const [holdSpeed, setHoldSpeed] = useState<number|null>(null);
  const [holdSide, setHoldSide]   = useState<"left"|"right"|null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval>|null>(null);
  const holdStart = useRef(0);
  const isHold    = useRef(false);
  const speedIdx  = useRef(0);
  const SPEED_R   = [1, 1.25, 1.5, 2];
  const SPEED_L   = [1, 0.75, 0.5, 0.25];

  const startHold = useCallback((side:"left"|"right") => {
    isHold.current = true; speedIdx.current = 0;
    setHoldSide(side); setHoldSpeed(1);
    holdTimer.current = setInterval(() => {
      speedIdx.current = Math.min(speedIdx.current+1, 3);
      const sp = side==="right" ? SPEED_R[speedIdx.current] : SPEED_L[speedIdx.current];
      setHoldSpeed(sp);
      if (videoRef.current) videoRef.current.playbackRate = sp;
    }, 600);
  }, []); // eslint-disable-line

  const stopHold = useCallback(() => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current=null; }
    isHold.current=false; speedIdx.current=0;
    setHoldSpeed(null); setHoldSide(null);
    if (videoRef.current) videoRef.current.playbackRate=1;
  }, []);

  useEffect(()=>()=>{ if(holdTimer.current) clearInterval(holdTimer.current); },[]);

  const neonColor = analysis?.sentiment==="positive"?"#10b981"
    : analysis?.sentiment==="negative"?"#ef4444"
    : reel._aiSuggested?"#a78bfa":"#7c3aed";

  const likes = (reel.likesCount??0) + (isLiked?1:0);

  type TapDiv = HTMLDivElement & { _holdTimer?: ReturnType<typeof setTimeout> };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    holdStart.current = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX-rect.left < rect.width/2 ? "left" : "right";
    const el   = e.currentTarget as TapDiv;
    el._holdTimer = setTimeout(()=>{ if(!isHold.current) startHold(side); }, 200);
  }, [startHold]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget as TapDiv;
    if (el._holdTimer) { clearTimeout(el._holdTimer); el._holdTimer=undefined; }
    const held = Date.now()-holdStart.current;
    stopHold();
    if (held < 200) {
      const now = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX-rect.left, y = e.clientY-rect.top;
      if (now-lastTap < 280) {
        if (!isLiked) onLike();
        setParticles(p=>[...p,{x,y,id:now}]);
      } else {
        const v = videoRef.current;
        if (v) { if(v.paused){v.play().catch(()=>{});setPaused(false);}else{v.pause();setPaused(true);} }
      }
      setLastTap(now);
    }
  }, [stopHold, lastTap, isLiked, onLike]);

  const toggle = (p: PanelType) => setOpenPanel(prev => prev===p ? null : p);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/reels`); } catch {}
    setShareOk(true); onShare(); setTimeout(()=>{setShareOk(false);setOpenPanel(null);},1600);
  };
  const handleNative = async () => {
    try {
      if (navigator.share) await navigator.share({title:reel.caption||"OlCha Reel",url:`${window.location.origin}/reels`});
      else await navigator.clipboard.writeText(`${window.location.origin}/reels`);
    } catch {}
    onShare(); setOpenPanel(null);
  };

  return (
    <div className="relative w-full h-full">

      {/* ambient bg */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {reel.thumbnailUrl && (
          <img src={reel.thumbnailUrl} alt="" aria-hidden="true"
            className="absolute inset-[-10%] w-[120%] h-[120%] object-cover"
            style={{ filter:"blur(60px) saturate(2.6) brightness(0.18)" }} />
        )}
        <div className="absolute inset-0"
          style={{ background:`radial-gradient(ellipse at 50% 40%, ${neonColor}14 0%, rgba(0,0,0,0.62) 100%)` }} />
      </div>

      {/* floating video card */}
      <div className="absolute inset-x-1 top-0 bottom-0 rounded-[28px] overflow-hidden"
        style={{ boxShadow:`0 0 52px ${neonColor}22, 0 24px 64px rgba(0,0,0,0.82)`,
          border:`1.5px solid ${neonColor}18` }}>

        <ReelVideoEl videoUrl={reel.videoUrl} thumbnailUrl={reel.thumbnailUrl}
          isActive={isActive} muted={muted} videoRef={videoRef} onPlayState={setPaused} />

        {/* cinematic gradient — thin, video visible through */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background:"linear-gradient(to top, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.08) 22%, transparent 42%)" }} />
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background:"linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 15%)" }} />

        <NeonCorners color={neonColor} />

        {/* tap / hold zone (fills center, avoids button columns) */}
        <div className="absolute inset-0 z-20 cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={e=>{
            const el = e.currentTarget as TapDiv;
            if(el._holdTimer){clearTimeout(el._holdTimer);el._holdTimer=undefined;}
            stopHold();
          }}
        />

        {/* particles */}
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
          {particles.map(p=>(
            <ParticleBurst key={p.id} x={p.x} y={p.y}
              onDone={()=>setParticles(prev=>prev.filter(h=>h.id!==p.id))} />
          ))}
        </div>

        {/* progress strip */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{height:3}}>
          <div style={{ width:`${progress*100}%`, height:"100%",
            background:`linear-gradient(90deg,${neonColor},#06b6d4)`,
            boxShadow:`0 0 7px ${neonColor}bb`, transition:"width 0.1s linear" }} />
        </div>

        {/* speed indicator */}
        <AnimatePresence>
          {holdSpeed!==null && holdSide && <SpeedGlass speed={holdSpeed} side={holdSide} />}
        </AnimatePresence>

        {/* pause icon */}
        <AnimatePresence>
          {paused && (
            <motion.div initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:1.4}} transition={{duration:0.15}}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div style={{ width:66, height:66, borderRadius:"50%",
                background:"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)",
                border:"1.5px solid rgba(255,255,255,0.18)",
                boxShadow:`0 0 28px ${neonColor}44`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg className="fill-white" width="24" height="24" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════
            TOP LEFT — Author chip (lentadagi kabi)
            Circle with initials + name in text
        ═══════════════════════════════════════════ */}
        <div className="absolute top-4 left-4 z-30 pointer-events-auto">
          <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
            transition={{delay:0.06}}
            className="flex items-center gap-2">

            {/* Spinning ring avatar circle — shows initials */}
            <div className="relative flex-shrink-0" style={{width:36,height:36}}>
              <motion.div className="absolute inset-[-2px] rounded-full"
                style={{ background:`conic-gradient(from 0deg, ${neonColor}, #3b82f6, #06b6d4, ${neonColor})` }}
                animate={{rotate:360}} transition={{duration:4,repeat:Infinity,ease:"linear"}} />
              <div className="absolute inset-[2px] rounded-full overflow-hidden z-10 flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
                {reel.author?.avatarUrl
                  ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[11px] font-black text-white select-none">
                      {initials(reel.author?.displayName)}
                    </span>}
              </div>
            </div>

            {/* Name + handle — compact */}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-white font-black text-[12px] leading-tight drop-shadow-lg truncate max-w-[96px]">
                  {reel.author?.displayName}
                </span>
                {reel.author?.isVerified && <BadgeCheck className="w-3 h-3 flex-shrink-0 text-violet-300" />}
              </div>
              <span className="text-white/40 text-[9px] leading-none">@{reel.author?.username}</span>
              {reel._aiSuggested && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Zap className="w-2 h-2 text-violet-300" />
                  <span className="text-[8px] font-bold text-violet-300">AI</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════
            RIGHT — Vertical column of CIRCLE buttons
            Each: round, glass, same CIRC px diameter
            Tap → circles drop below (chain dropdown)
        ═══════════════════════════════════════════ */}
        <div className="absolute top-4 right-3 z-30 flex flex-col items-center gap-2.5 pointer-events-auto">

          {/* ── LIKE ── */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <motion.button whileTap={{scale:0.72}} onClick={()=>{onLike();toggle("like");}}
                style={{
                  ...circleBase,
                  background: isLiked?"rgba(239,68,68,0.38)":circleBase.background,
                  border: isLiked?"1px solid rgba(239,68,68,0.5)":circleBase.border,
                  boxShadow: isLiked?"0 0 20px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.09)":circleBase.boxShadow,
                }}>
                <motion.div animate={isLiked?{scale:[1,1.45,1]}:{scale:1}} transition={{duration:0.28}}>
                  <Heart className={`w-5 h-5 transition-all ${isLiked?"fill-red-400 text-red-400":"text-white/80"}`} />
                </motion.div>
              </motion.button>
            </div>
            <AnimatePresence>
              {openPanel==="like" && (
                <DropCircle key="like-count" delay={0}
                  icon={<span className="text-[10px] font-black text-red-300 tabular-nums">{fmt(likes)}</span>}
                  color="#ef4444" bg="rgba(239,68,68,0.28)"
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── COMMENT ── */}
          <div className="flex flex-col items-center gap-2.5">
            <motion.button whileTap={{scale:0.72}} onClick={()=>{onComment();setOpenPanel(null);}}
              style={{...circleBase}}>
              <MessageCircle className="w-5 h-5 text-white/80" />
            </motion.button>
            <AnimatePresence>
              {openPanel==="comment" && (
                <DropCircle key="cmt-count" delay={0}
                  icon={<span className="text-[10px] font-black text-blue-300">{fmt(reel.commentsCount??0)}</span>}
                  color="#3b82f6" bg="rgba(59,130,246,0.28)"
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── SHARE ── */}
          <div className="flex flex-col items-center gap-2.5">
            <motion.button whileTap={{scale:0.72}} onClick={()=>toggle("share")}
              style={{
                ...circleBase,
                background: shareOk?"rgba(16,185,129,0.35)":circleBase.background,
                border: shareOk?"1px solid rgba(16,185,129,0.45)":circleBase.border,
              }}>
              {shareOk
                ? <Check className="w-5 h-5 text-emerald-400" />
                : <Share2 className="w-5 h-5 text-white/80" />}
            </motion.button>
            <AnimatePresence>
              {openPanel==="share" && (
                <>
                  <DropCircle key="sh-copy" delay={0}
                    icon={<Copy className="w-4 h-4 text-emerald-300" />}
                    label="Nusxa" color="#10b981" bg="rgba(16,185,129,0.28)"
                    onClick={handleCopy}
                  />
                  <DropCircle key="sh-native" delay={0.06}
                    icon={<ExternalLink className="w-4 h-4 text-blue-300" />}
                    label="Ulash" color="#3b82f6" bg="rgba(59,130,246,0.28)"
                    onClick={handleNative}
                  />
                </>
              )}
            </AnimatePresence>
          </div>

          {/* ── AI ── */}
          <div className="flex flex-col items-center gap-2.5">
            <motion.button whileTap={{scale:0.72}} onClick={()=>{ toggle("ai"); if(openPanel!=="ai"&&!analysis) onAnalyze(); }}
              style={{
                ...circleBase,
                background: openPanel==="ai"?"rgba(124,58,237,0.42)":circleBase.background,
                border: openPanel==="ai"?"1px solid rgba(167,139,250,0.45)":circleBase.border,
                boxShadow: openPanel==="ai"?"0 0 18px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.09)":circleBase.boxShadow,
              }}>
              {analyzingId!==null
                ? <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                : <Brain className={`w-5 h-5 ${openPanel==="ai"?"text-purple-300":"text-white/80"}`} />}
            </motion.button>
            <AnimatePresence>
              {openPanel==="ai" && analysis && (
                <>
                  {analysis.category && (
                    <DropCircle key="ai-cat" delay={0}
                      icon={<span className="text-[8px] font-black text-purple-200 text-center px-0.5 leading-tight">
                        {analysis.category.slice(0,6)}
                      </span>}
                      label={analysis.sentiment==="positive"?"✅":analysis.sentiment==="negative"?"⚠️":"😐"}
                      color="#a78bfa" bg="rgba(124,58,237,0.35)"
                    />
                  )}
                </>
              )}
              {openPanel==="ai" && !analysis && analyzingId===null && (
                <DropCircle key="ai-tap" delay={0}
                  icon={<Brain className="w-4 h-4 text-purple-300" />}
                  label="Tahlil" color="#a78bfa" bg="rgba(124,58,237,0.28)"
                  onClick={onAnalyze}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── CREATE ── */}
          <div className="flex flex-col items-center gap-2.5">
            <motion.button whileTap={{scale:0.72}} onClick={()=>{onAdd();setOpenPanel(null);}}
              style={{
                ...circleBase,
                background:"linear-gradient(135deg,rgba(124,58,237,0.6),rgba(236,72,153,0.6))",
                border:"1px solid rgba(167,139,250,0.35)",
                boxShadow:"0 0 18px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}>
              <Plus className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>

        {/* Dismiss dropdown when tapping video area */}
        {openPanel && (
          <div className="absolute inset-0 z-[19]" onClick={()=>setOpenPanel(null)} />
        )}

        {/* ═══════════════════════════════════════════
            BOTTOM — Caption (above the bottom bar)
            Tags below caption — no overlap
        ═══════════════════════════════════════════ */}
        <div className="absolute bottom-10 left-4 right-[58px] z-30 pointer-events-none">
          {reel.caption && (
            <p className="text-white text-[12px] leading-snug mb-2 font-semibold"
              style={{ textShadow:"0 1px 12px rgba(0,0,0,0.98)" }}>
              {reel.caption.length>72 ? reel.caption.slice(0,72)+"…" : reel.caption}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {reel.audioTrack && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)" }}>
                <motion.div animate={{rotate:360}} transition={{duration:3,repeat:Infinity,ease:"linear"}}
                  className="w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ background:"rgba(255,255,255,0.1)" }}>
                  <Music className="w-1.5 h-1.5 text-white" />
                </motion.div>
                <span className="text-[9px] text-white/50 truncate max-w-[72px]">{reel.audioTrack}</span>
              </div>
            )}
            {reel.tags?.slice(0,3).map(tag=>(
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ color:neonColor, background:`${neonColor}16`, border:`1px solid ${neonColor}28` }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            BOTTOM LEFT
            🔊 Volume (small glass circle) + 👁 Views
            Side by side, compact, don't block caption
        ═══════════════════════════════════════════ */}
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 pointer-events-auto">
          {/* Volume — smaller circle */}
          <motion.button whileTap={{scale:0.75}} onClick={onMute} style={{...volCircle}}>
            {muted
              ? <VolumeX className="w-3.5 h-3.5 text-white/50" />
              : <Volume2 className="w-3.5 h-3.5 text-white/75" />}
          </motion.button>

          {/* Views — eye icon like lenta */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full pointer-events-none"
            style={{ background:"rgba(8,6,22,0.42)", backdropFilter:"blur(18px)",
              border:"1px solid rgba(255,255,255,0.1)",
              boxShadow:"0 2px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <Eye className="w-3 h-3 text-white/55" />
            <motion.span
              animate={{opacity:[0.6,1,0.6]}} transition={{duration:2.4,repeat:Infinity,ease:"easeInOut"}}
              className="text-[10px] font-bold tabular-nums"
              style={{ color:"rgba(255,255,255,0.65)" }}>
              {fmt(reel.viewsCount??0)}
            </motion.span>
          </div>
        </div>

      </div>{/* /floating card */}
    </div>
  );
}

/* ─── Main ReelsPage ─────────────────────────────────────── */
export default function ReelsPage() {
  const { data: initialReels = [], isLoading } = useListReels({ limit:20 } as any);
  const [feed, setFeed]           = useState<FeedItem[]>([]);
  const [current, setCurrent]     = useState(0);
  const [likedIds, setLikedIds]   = useState<Set<number>>(new Set());
  const [muted, setMuted]         = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentReel, setCommentReel] = useState<FeedItem|null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number,Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number|null>(null);
  const [sharedId, setSharedId]   = useState<number|null>(null);
  const [injecting, setInjecting] = useState(false);

  const likeReel = useLikeReel();
  const qc       = useQueryClient();
  const { user } = useAuth();

  const watchedTags = useRef<string[]>([]);
  const watchedIds  = useRef<Set<number>>(new Set());

  useEffect(()=>{ if(initialReels.length>0&&feed.length===0) setFeed(initialReels as FeedItem[]); },[initialReels,feed.length]);

  useEffect(()=>{
    const reel = feed[current]; if(!reel) return;
    fetch(`${API}/api/interactions`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
      body:JSON.stringify({contentType:"reel",contentId:reel.id,interactionType:"view"})}).catch(()=>{});
    fetch(`${API}/api/reels/${reel.id}/view`,{method:"POST",credentials:"include"}).catch(()=>{});
    if(reel.tags?.length) watchedTags.current=[...new Set([...watchedTags.current,...reel.tags])].slice(0,10);
    watchedIds.current.add(reel.id);
    if(current>0&&current%4===0&&watchedTags.current.length>0&&!injecting){
      const excl=Array.from(watchedIds.current).join(","), tags=watchedTags.current.slice(0,5).join(",");
      setInjecting(true);
      fetch(`${API}/api/reels/similar?tags=${encodeURIComponent(tags)}&excludeIds=${excl}&limit=5`,{credentials:"include"})
        .then(r=>r.ok?r.json():[])
        .then((similar:FeedItem[])=>{
          if(similar.length>0) setFeed(prev=>{
            const at=Math.min(current+3,prev.length);
            return [...prev.slice(0,at),...similar.map(r=>({...r,_aiSuggested:true})),...prev.slice(at)];
          });
        }).catch(()=>{}).finally(()=>setInjecting(false));
    }
  },[current,feed,injecting]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="ArrowDown"||e.key==="j") setCurrent(c=>Math.min(feed.length-1,c+1));
      else if(e.key==="ArrowUp"||e.key==="k") setCurrent(c=>Math.max(0,c-1));
      else if(e.key==="m"||e.key==="M") setMuted(v=>!v);
    };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[feed.length]);

  const wheelAccum = useRef(0), wheelLock = useRef(false);
  const handleWheel = useCallback((e:React.WheelEvent)=>{
    e.preventDefault(); if(wheelLock.current) return;
    wheelAccum.current+=e.deltaY;
    if(Math.abs(wheelAccum.current)>60){
      setCurrent(c=>Math.max(0,Math.min(feed.length-1,c+(wheelAccum.current>0?1:-1))));
      wheelAccum.current=0; wheelLock.current=true; setTimeout(()=>{wheelLock.current=false;},380);
    }
  },[feed.length]);

  const touchY = useRef(0);
  const handleTouchStart = useCallback((e:React.TouchEvent)=>{ touchY.current=e.touches[0].clientY; },[]);
  const handleTouchEnd   = useCallback((e:React.TouchEvent)=>{
    const dy=touchY.current-e.changedTouches[0].clientY;
    if(dy>50) setCurrent(c=>Math.min(feed.length-1,c+1));
    if(dy<-50) setCurrent(c=>Math.max(0,c-1));
  },[feed.length]);

  const y = useMotionValue(0);
  const dragOpacity = useTransform(y,[-80,0,80],[0.45,1,0.45]);
  const handleDragEnd = useCallback((_:unknown,info:{offset:{y:number}})=>{
    if(info.offset.y<-50) setCurrent(c=>Math.min(feed.length-1,c+1));
    else if(info.offset.y>50) setCurrent(c=>Math.max(0,c-1));
    y.set(0);
  },[feed.length,y]);

  const handleLike = useCallback((reelId:number)=>{
    const next=new Set(likedIds);
    if(next.has(reelId)) next.delete(reelId); else next.add(reelId);
    setLikedIds(next);
    likeReel.mutate({id:reelId},{
      onSuccess:()=>qc.invalidateQueries({queryKey:getListReelsQueryKey()}),
      onError:()=>{ const rb=new Set(likedIds); if(rb.has(reelId)) rb.delete(reelId); else rb.add(reelId); setLikedIds(rb); },
    });
  },[likedIds,likeReel,qc]);

  const handleAnalyze = useCallback(async(reelId:number,caption?:string,thumbUrl?:string)=>{
    if(analysisMap[reelId]) return; setAnalyzingId(reelId);
    try{
      const res=await fetch(`${API}/api/ai/analyze-content`,{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
        body:JSON.stringify({contentId:reelId,contentType:"reel",caption:caption??"",imageUrl:thumbUrl}),
      });
      if(res.ok){const d=await res.json();setAnalysisMap(p=>({...p,[reelId]:d}));}
    }catch{}finally{setAnalyzingId(null);}
  },[analysisMap]);

  const handleShare = useCallback(async(reelId:number)=>{
    setSharedId(reelId); setTimeout(()=>setSharedId(null),2200);
    fetch(`${API}/api/interactions`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
      body:JSON.stringify({contentType:"reel",contentId:reelId,interactionType:"share"})}).catch(()=>{});
  },[]);

  const reel = feed[current];

  return (
    <div className="relative flex items-center justify-center overflow-hidden"
      style={{ height:"calc(100vh - 60px)", minHeight:480, background:"#000" }}
      onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* full-screen ambient */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {reel?.thumbnailUrl && (
            <motion.img key={reel.id} src={reel.thumbnailUrl} alt="" aria-hidden="true"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.5}}
              className="absolute inset-[-12%] w-[124%] h-[124%] object-cover"
              style={{ filter:"blur(80px) saturate(3) brightness(0.14)" }} />
          )}
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background:"rgba(0,0,0,0.55)" }} />
        {/* scanline */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity:0.016,
            backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.6) 0px,rgba(255,255,255,0.6) 1px,transparent 1px,transparent 3px)" }} />
      </div>

      {/* preload */}
      <div style={{display:"none"}} aria-hidden="true">
        {[current+1,current+2].map(i=>{const r=feed[i];return r?.videoUrl?<video key={r.id} src={r.videoUrl} preload="auto" muted playsInline loop/>:null;})}
        {[current+1,current+2,current+3].map(i=>{const r=feed[i];return r?.thumbnailUrl?<img key={`t-${r.id}`} src={r.thumbnailUrl} loading="eager" alt=""/>:null;})}
      </div>

      {/* states */}
      {isLoading && feed.length===0 ? (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            <div className="absolute inset-2.5 rounded-full border border-white/10 border-t-pink-400 animate-spin"
              style={{animationDuration:"0.65s",animationDirection:"reverse"}} />
          </div>
          <div className="text-center">
            <p className="text-white font-black text-sm tracking-[0.2em]">◈ SIGNAL</p>
            <p className="text-white/35 text-[11px] mt-0.5">yuklanmoqda…</p>
          </div>
        </div>
      ) : feed.length===0 ? (
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>🎬</div>
          <div className="text-center">
            <p className="font-black text-white mb-1">Hali reel yo'q</p>
            <p className="text-sm text-white/50">Birinchi reelni yuklang!</p>
          </div>
          <motion.button whileTap={{scale:0.95}} onClick={()=>setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
            style={{background:"linear-gradient(135deg,#7c3aed,#ec4899)",boxShadow:"0 4px 24px rgba(124,58,237,0.5)"}}>
            <Plus className="w-4 h-4" /> Reel qo'shish
          </motion.button>
        </div>
      ) : reel && (
        <>
          <motion.div drag="y" dragConstraints={{top:0,bottom:0}} dragElastic={0.1}
            onDragEnd={handleDragEnd} className="relative z-10 select-none touch-none"
            style={{
              opacity: dragOpacity,
              width:"min(100%, calc((100vh - 60px) * 0.52))",
              height:"calc(100vh - 60px)",
            }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={reel.id}
                initial={{opacity:0,y:30,scale:0.97}}
                animate={{opacity:1,y:0,scale:1}}
                exit={{opacity:0,y:-30,scale:0.97}}
                transition={{type:"spring",stiffness:440,damping:36}}
                className="absolute inset-0">
                <ReelSlide
                  reel={reel} isActive={true} muted={muted}
                  onLike={()=>handleLike(reel.id)}
                  isLiked={likedIds.has(reel.id)}
                  onAnalyze={()=>handleAnalyze(reel.id,reel.caption??undefined,reel.thumbnailUrl??undefined)}
                  analyzingId={analyzingId}
                  analysis={analysisMap[reel.id]}
                  onComment={()=>setCommentReel(reel)}
                  onShare={()=>handleShare(reel.id)}
                  sharedId={sharedId}
                  onAdd={()=>setCreateOpen(true)}
                  onMute={()=>setMuted(v=>!v)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Desktop nav arrows */}
            <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex-col gap-3 hidden md:flex z-20">
              {([[-1,"M5 15l7-7 7 7"],[1,"M19 9l-7 7-7-7"]] as [number,string][]).map(([dir,icon])=>(
                <motion.button key={dir} whileTap={{scale:0.85}}
                  onClick={()=>setCurrent(c=>Math.max(0,Math.min(feed.length-1,c+dir)))}
                  disabled={dir===-1?current===0:current>=feed.length-1}
                  className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20"
                  style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.11)"}}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Right filmstrip (vertical thumbnail nav) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 items-center">
            {feed.slice(Math.max(0,current-3),Math.min(feed.length,current+6)).map((r,relIdx)=>{
              const absIdx=Math.max(0,current-3)+relIdx, isAct=absIdx===current, dist=Math.abs(absIdx-current);
              return (
                <motion.button key={r.id} onClick={()=>setCurrent(absIdx)} whileTap={{scale:0.82}}
                  animate={{scale:isAct?1:1-dist*0.06}} className="overflow-hidden flex-shrink-0"
                  style={{
                    width:isAct?38:26, height:isAct?58:40,
                    borderRadius:isAct?12:8,
                    border:isAct?"2px solid rgba(167,139,250,0.88)":"1.5px solid rgba(255,255,255,0.1)",
                    boxShadow:isAct?"0 0 14px rgba(167,139,250,0.5)":"0 2px 8px rgba(0,0,0,0.5)",
                    opacity:Math.max(0.18,1-dist*0.22),
                    transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                  }}>
                  {r.thumbnailUrl
                    ? <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full" style={{background:"linear-gradient(135deg,#7c3aed44,#ec489944)"}} />}
                </motion.button>
              );
            })}
            {feed.length>0 && (
              <span className="text-[8px] font-black text-white/22 mt-1"
                style={{writingMode:"vertical-lr",letterSpacing:"0.08em"}}>
                {current+1}/{feed.length}
              </span>
            )}
          </div>
        </>
      )}

      {/* AI inject chip */}
      <AnimatePresence>
        {injecting && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold z-30"
            style={{background:"rgba(124,58,237,0.3)",backdropFilter:"blur(8px)",
              border:"1px solid rgba(167,139,250,0.2)",color:"#c4b5fd"}}>
            <Sparkles className="w-2.5 h-2.5 animate-pulse" />
            AI tavsiyalar…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commentReel && (
          <CommentsSheet reelId={commentReel.id} commentsCount={commentReel.commentsCount??0}
            user={user} onClose={()=>setCommentReel(null)} />
        )}
      </AnimatePresence>

      <CreateContentModal open={createOpen} onClose={()=>setCreateOpen(false)} />
    </div>
  );
}
