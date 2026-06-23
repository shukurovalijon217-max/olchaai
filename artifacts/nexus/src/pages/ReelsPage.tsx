/**
 * OLCHA REELS — "SINGULARITY" UI
 * ─────────────────────────────────────────────────────────────────
 * Innovations over every existing social platform:
 *
 * 1. RADIAL FAN ActionHub  — hub circle at top-right; on press,
 *    5 sub-circles arc OUT in a quarter-circle fan (left→down) via
 *    spring physics.  On second press they IMPLODE back into the hub.
 *    SVG constellation lines trace from hub to each node.
 *
 * 2. WAVEFORM PROGRESS BAR — animated vertical bars at the bottom,
 *    filled left-to-right as the video plays.
 *
 * 3. TYPEWRITER CAPTION — caption text types in character by character
 *    each time a new reel appears.
 *
 * 4. RIPPLE WAVE on double-tap — full-screen circular wave + floating
 *    heart, instead of just particles.
 *
 * 5. SHOCKWAVE RING on hub open — brief expanding ring from the hub.
 *
 * 6. MAGNETIC GLOW — sub-circles glow brighter when any sibling is
 *    tapped (solidarity pulse).
 *
 * 7. HOLOGRAPHIC AUTHOR — spinning conic ring + glitch flicker on author.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  motion, AnimatePresence, useMotionValue, useTransform,
  animate as fmAnimate,
} from "framer-motion";
import {
  Heart, MessageCircle, Share2, Music, BadgeCheck, Plus, Sparkles,
  Brain, X, Loader2, Volume2, VolumeX, Send, Check, Eye, Zap,
} from "lucide-react";
import { useListReels, useLikeReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import CreateContentModal from "@/components/CreateContentModal";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ──────────────────────────────────────────────────── */
interface FeedItem {
  id: number; videoUrl?: string | null; thumbnailUrl?: string | null;
  caption?: string | null; audioTrack?: string | null; duration?: number | null;
  likesCount?: number; commentsCount?: number; viewsCount?: number; tags?: string[];
  author?: {
    id: number; username?: string; displayName?: string;
    avatarUrl?: string | null; isVerified?: boolean;
  };
  isLiked?: boolean; _aiSuggested?: boolean; _aiReason?: string;
}
interface ReelComment {
  id: number; content: string; likesCount: number; createdAt: string;
  author: { id: number; displayName?: string; username?: string; avatarUrl?: string | null; isVerified?: boolean };
}
interface Analysis { tags?: string[]; category?: string; summary?: string; sentiment?: string }

/* ─── Utils ──────────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M`
  : n >= 1000 ? `${(n/1000).toFixed(1)}K`
  : `${n}`;

const initials = (name?: string) =>
  (name ?? "?").split(" ").slice(0,2).map(w => w[0]?.toUpperCase()).join("");

/* ─── Design constants ───────────────────────────────────────── */
const HUB  = 46;
const SUB  = 40;
const STEP = 52;

// Vertical cascade: 4 sub-circles drop straight DOWN from hub
const FAN_OFFSETS = [0, 1, 2, 3].map(i => ({ dx: 0, dy: (i + 1) * STEP }));

const hubBase: React.CSSProperties = {
  width: HUB, height: HUB, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  backdropFilter: "blur(26px) saturate(1.8)",
  WebkitBackdropFilter: "blur(26px) saturate(1.8)",
};
const subBase: React.CSSProperties = {
  width: SUB, height: SUB, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
};
const volCircle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: "50%",
  background: "rgba(6,4,18,0.38)",
  backdropFilter: "blur(18px) saturate(1.3)",
  WebkitBackdropFilter: "blur(18px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

/* ─── Particle burst ─────────────────────────────────────────── */
const PCOLS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6ef7","#ff8c42","#c084fc","#38bdf8"];

function ParticleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i/12)*360, d = 36 + Math.random()*24, r = (a*Math.PI)/180;
    return { tx: Math.cos(r)*d, ty: Math.sin(r)*d, color: PCOLS[i%PCOLS.length] };
  });
  return (
    <>
      {pts.map((p,i) => (
        <motion.div key={i}
          initial={{ x, y, scale:1.3, opacity:1 }}
          animate={{ x:x+p.tx, y:y+p.ty, scale:0, opacity:0 }}
          transition={{ duration:0.52, ease:"easeOut", delay:i*0.01 }}
          onAnimationComplete={i===0 ? onDone : undefined}
          style={{ position:"absolute", width:7, height:7, borderRadius:"50%",
            background:p.color, pointerEvents:"none", zIndex:62, left:0, top:0, marginLeft:-3.5, marginTop:-3.5 }}
        />
      ))}
    </>
  );
}

/* ─── Ripple wave on double-tap ──────────────────────────────── */
function RippleWave({ x, y, color, onDone }: { x: number; y: number; color: string; onDone: () => void }) {
  return (
    <>
      {[0, 0.1, 0.22].map((delay, i) => (
        <motion.div key={i}
          initial={{ x: x-50, y: y-50, width:100, height:100, borderRadius:"50%", opacity:0.7 }}
          animate={{ x: x-180, y: y-180, width:360, height:360, opacity:0 }}
          transition={{ duration:0.85, ease:"easeOut", delay }}
          onAnimationComplete={i===2 ? onDone : undefined}
          style={{ position:"absolute", border:`2px solid ${color}`, pointerEvents:"none", zIndex:55, left:0, top:0 }}
        />
      ))}
      {/* Floating heart */}
      <motion.div
        initial={{ x:x-20, y:y-20, scale:0, opacity:1 }}
        animate={{ x:x-20, y:y-100, scale:[0,1.6,1.2], opacity:[1,1,0] }}
        transition={{ duration:1.0, ease:"easeOut", delay:0.05 }}
        style={{ position:"absolute", left:0, top:0, pointerEvents:"none", zIndex:63, fontSize:40 }}>
        ❤️
      </motion.div>
    </>
  );
}

/* ─── Neon corner brackets ───────────────────────────────────── */
function NeonCorners({ color }: { color: string }) {
  const S = 18, W = "2px";
  const b: React.CSSProperties = { position:"absolute", width:S, height:S, opacity:0.8,
    filter:`drop-shadow(0 0 4px ${color})`, zIndex:25, pointerEvents:"none" };
  return (
    <>
      <div style={{...b, top:9, left:9,    borderTop:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`,  borderRadius:"3px 0 0 0"}} />
      <div style={{...b, top:9, right:9,   borderTop:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 3px 0 0"}} />
      <div style={{...b, bottom:9, left:9,  borderBottom:`${W} solid ${color}`, borderLeft:`${W} solid ${color}`,  borderRadius:"0 0 0 3px"}} />
      <div style={{...b, bottom:9, right:9, borderBottom:`${W} solid ${color}`, borderRight:`${W} solid ${color}`, borderRadius:"0 0 3px 0"}} />
    </>
  );
}

/* ─── Typewriter hook ────────────────────────────────────────── */
function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length && timerRef.current) { clearInterval(timerRef.current); timerRef.current=null; }
    }, speed);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current=null; } };
  }, [text, active, speed]);
  return displayed;
}

/* ─── Audio chip (spinning vinyl + track name, click → popup) ── */
function AudioChip({ track, color }: { track: string; color: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(track).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 1800);
  };

  const short = track.length > 22 ? track.slice(0, 22) + "…" : track;

  return (
    <div className="relative" style={{zIndex:40}}>
      {/* Chip */}
      <motion.button
        whileTap={{scale:0.92}}
        onClick={()=>setOpen(v=>!v)}
        className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-full"
        style={{
          background:"rgba(8,6,22,0.54)",
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          border:`1px solid ${color}44`,
          boxShadow:`0 2px 14px rgba(0,0,0,0.4), 0 0 8px ${color}22`,
        }}>
        {/* Spinning vinyl disc */}
        <motion.div
          animate={{rotate:360}}
          transition={{duration:3, repeat:Infinity, ease:"linear"}}
          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background:`conic-gradient(from 0deg, #1a1030, ${color}88, #1a1030, ${color}44, #1a1030)`,
            border:`1px solid ${color}66`,
          }}>
          <div className="w-[5px] h-[5px] rounded-full bg-white/70"/>
        </motion.div>
        {/* Track name */}
        <span className="text-[10px] font-medium" style={{color:"rgba(255,255,255,0.72)", maxWidth:120, overflow:"hidden", whiteSpace:"nowrap"}}>
          {short}
        </span>
        <Music className="w-[9px] h-[9px] flex-shrink-0" style={{color:`${color}cc`}}/>
      </motion.button>

      {/* Popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{opacity:0, y:6, scale:0.94}}
            animate={{opacity:1, y:0, scale:1}}
            exit={{opacity:0, y:6, scale:0.94}}
            transition={{type:"spring", damping:24, stiffness:360}}
            className="absolute bottom-[calc(100%+8px)] left-0 rounded-2xl p-3 flex flex-col gap-2"
            style={{
              minWidth:180,
              background:"rgba(8,6,22,0.82)",
              backdropFilter:"blur(28px)",
              WebkitBackdropFilter:"blur(28px)",
              border:`1px solid ${color}30`,
              boxShadow:`0 8px 32px rgba(0,0,0,0.55), 0 0 20px ${color}14`,
            }}>
            <div className="flex items-start gap-2">
              <Music className="w-3 h-3 mt-[2px] flex-shrink-0" style={{color:`${color}cc`}}/>
              <span className="text-[11px] leading-snug" style={{color:"rgba(255,255,255,0.82)", wordBreak:"break-word"}}>
                {track}
              </span>
            </div>
            <motion.button
              whileTap={{scale:0.88}}
              onClick={handleCopy}
              className="flex items-center justify-center gap-1 py-[6px] rounded-xl text-[10px] font-semibold"
              style={{
                background: copied ? `${color}33` : "rgba(255,255,255,0.08)",
                border:`1px solid ${copied ? color+"66" : "rgba(255,255,255,0.10)"}`,
                color: copied ? color : "rgba(255,255,255,0.65)",
                transition:"all 0.2s",
              }}>
              {copied ? <Check className="w-3 h-3"/> : null}
              {copied ? "Nusxalandi!" : "Nusxalash"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Speed indicator ────────────────────────────────────────── */
function SpeedGlass({ speed, side }: { speed: number; side: "left"|"right" }) {
  const color = side==="left" ? "#38bdf8" : "#f59e0b";
  const dots  = speed<=0.25?1:speed<=0.5?2:speed<=0.75?3:speed===1?4:speed<=1.25?5:speed<=1.5?6:7;
  return (
    <motion.div initial={{opacity:0,scale:0.82}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.82}}
      transition={{type:"spring",damping:22,stiffness:380}}
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="flex flex-col items-center gap-2 px-8 py-4 rounded-3xl"
        style={{background:"rgba(5,4,15,0.6)", backdropFilter:"blur(30px) saturate(1.5)",
          WebkitBackdropFilter:"blur(30px) saturate(1.5)",
          border:`1px solid ${color}28`, boxShadow:`0 0 44px ${color}14, inset 0 1px 0 rgba(255,255,255,0.07)`}}>
        <div className="flex items-center gap-1">
          {side==="left"
            ? [1,0.6,0.25].map((o,i)=>(
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="none" style={{opacity:o}}>
                  <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>))
            : [0.25,0.6,1].map((o,i)=>(
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="none" style={{opacity:o}}>
                  <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>))}
        </div>
        <span className="font-black tabular-nums"
          style={{fontSize:38, color, textShadow:`0 0 22px ${color}88`, letterSpacing:"-0.02em"}}>
          {speed}×
        </span>
        <div className="flex gap-[5px]">
          {Array.from({length:7},(_,i)=>(
            <div key={i} className="rounded-full"
              style={{width:i<dots?8:5, height:i<dots?8:5,
                background:i<dots?color:"rgba(255,255,255,0.13)",
                boxShadow:i<dots?`0 0 6px ${color}`:undefined}} />
          ))}
        </div>
        <span className="text-[9px] font-bold" style={{color:`${color}88`,letterSpacing:"0.1em"}}>
          {side==="left" ? "◀ SEKIN" : "TEZ ▶"}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Bottom Command Bar ─────────────────────────────────────── *
 *  One pill at the bottom: [Avatar+Name] | [❤️][💬][↑][🧠] | [👁][🔊]
 *  No other social platform has this unified horizontal layout.
 * ────────────────────────────────────────────────────────────── */
function BottomBar({
  reel, isLiked, likesCount, commentsCount, onLike, onComment,
  onShare, onAI, onMute, muted, analyzingId, neonColor, cinemaMode,
}: {
  reel: FeedItem; isLiked: boolean; likesCount: number; commentsCount: number;
  onLike:()=>void; onComment:()=>void; onShare:()=>void; onAI:()=>void;
  onMute:()=>void; muted:boolean; analyzingId:number|null;
  neonColor:string; cinemaMode:boolean;
}) {
  const [shareOk, setShareOk] = useState(false);
  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:"OlCha Reel", url:`${window.location.origin}/reels` });
      else await navigator.clipboard.writeText(`${window.location.origin}/reels`);
    } catch { /* silent */ }
    setShareOk(true); onShare();
    setTimeout(() => setShareOk(false), 1600);
  };

  const sep = <div style={{ width:1, height:22, background:"rgba(255,255,255,0.09)", flexShrink:0, margin:"0 2px" }}/>;

  return (
    <motion.div
      animate={{ opacity: cinemaMode ? 0 : 1, y: cinemaMode ? 14 : 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute bottom-3 left-2 right-2 z-30"
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 pl-1.5 pr-1 py-[5px] rounded-[22px]" style={{
        background: "rgba(5,3,16,0.80)",
        backdropFilter: "blur(32px) saturate(2)",
        WebkitBackdropFilter: "blur(32px) saturate(2)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: `0 -2px 28px rgba(0,0,0,0.55), 0 8px 36px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px ${neonColor}0d`,
      }}>

        {/* ── Author ── */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0" style={{ width:34, height:34 }}>
            <motion.div className="absolute inset-[-2px] rounded-full"
              style={{ background:`conic-gradient(from 0deg,${neonColor}dd,#3b82f677,#06b6d455,${neonColor}dd)` }}
              animate={{ rotate:360 }} transition={{ duration:5, repeat:Infinity, ease:"linear" }}/>
            <div className="absolute inset-[2.5px] rounded-full overflow-hidden z-10 flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#1a0838,#0d1a3a)" }}>
              {reel.author?.avatarUrl
                ? <img src={reel.author.avatarUrl} alt="" className="w-full h-full object-cover"/>
                : <span className="text-[10px] font-black text-white select-none">{initials(reel.author?.displayName)}</span>
              }
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-0.5">
              <span className="text-white font-black text-[11px] truncate max-w-[66px] leading-tight">
                {reel.author?.displayName}
              </span>
              {reel.author?.isVerified && <BadgeCheck className="w-2.5 h-2.5 flex-shrink-0 text-violet-300"/>}
            </div>
            {reel._aiSuggested
              ? <div className="flex items-center gap-0.5">
                  <Zap className="w-[9px] h-[9px] text-violet-400"/>
                  <span className="text-[8px] font-bold text-violet-400 leading-none">AI</span>
                </div>
              : <span className="text-[8.5px] text-white/30 leading-none">@{reel.author?.username}</span>
            }
          </div>
        </div>

        {sep}

        {/* ── Like ── */}
        <motion.button whileTap={{ scale:0.72 }} onClick={onLike}
          className="flex flex-col items-center justify-center gap-[2px] flex-shrink-0"
          style={{ width:37, height:38, borderRadius:"50%", cursor:"pointer",
            background: isLiked ? "rgba(239,68,68,0.22)" : "transparent",
            border: isLiked ? "1px solid rgba(239,68,68,0.42)" : "1px solid transparent" }}>
          <Heart style={{ width:14, height:14,
            color: isLiked ? "#f87171" : "rgba(255,255,255,0.65)",
            fill: isLiked ? "#f87171" : "none", transition:"all 0.15s" }}/>
          <span style={{ fontSize:8.5, color: isLiked ? "#fca5a5" : "rgba(255,255,255,0.42)",
            fontWeight:800, lineHeight:1 }}>{fmt(likesCount)}</span>
        </motion.button>

        {/* ── Comment ── */}
        <motion.button whileTap={{ scale:0.72 }} onClick={onComment}
          className="flex flex-col items-center justify-center gap-[2px] flex-shrink-0"
          style={{ width:37, height:38, borderRadius:"50%", cursor:"pointer" }}>
          <MessageCircle style={{ width:14, height:14, color:"rgba(255,255,255,0.65)" }}/>
          <span style={{ fontSize:8.5, color:"rgba(255,255,255,0.42)", fontWeight:800, lineHeight:1 }}>
            {fmt(commentsCount)}
          </span>
        </motion.button>

        {/* ── Share ── */}
        <motion.button whileTap={{ scale:0.72 }} onClick={handleShare}
          className="flex flex-col items-center justify-center gap-[2px] flex-shrink-0"
          style={{ width:37, height:38, borderRadius:"50%", cursor:"pointer",
            background: shareOk ? "rgba(16,185,129,0.22)" : "transparent",
            border: shareOk ? "1px solid rgba(16,185,129,0.38)" : "1px solid transparent" }}>
          {shareOk
            ? <Check style={{ width:14, height:14, color:"#6ee7b7" }}/>
            : <Share2 style={{ width:14, height:14, color:"rgba(255,255,255,0.65)" }}/>
          }
        </motion.button>

        {/* ── AI ── */}
        <motion.button whileTap={{ scale:0.72 }} onClick={onAI}
          className="flex flex-col items-center justify-center gap-[2px] flex-shrink-0"
          style={{ width:37, height:38, borderRadius:"50%", cursor:"pointer" }}>
          {analyzingId === reel.id
            ? <Loader2 style={{ width:14, height:14, color:"#c4b5fd" }} className="animate-spin"/>
            : <Brain style={{ width:14, height:14, color:"rgba(167,139,250,0.8)" }}/>
          }
        </motion.button>

        {sep}

        {/* ── Views ── */}
        <div className="flex flex-col items-center justify-center gap-[2px] flex-shrink-0 pointer-events-none"
          style={{ width:33 }}>
          <Eye style={{ width:12, height:12, color:"rgba(255,255,255,0.35)" }}/>
          <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", fontWeight:700, lineHeight:1 }}>
            {fmt(reel.viewsCount??0)}
          </span>
        </div>

        {/* ── Volume ── */}
        <motion.button whileTap={{ scale:0.72 }} onClick={onMute}
          className="flex items-center justify-center flex-shrink-0"
          style={{ width:32, height:32, borderRadius:"50%", cursor:"pointer",
            background: muted ? "rgba(255,255,255,0.05)" : `${neonColor}1a`,
            border: muted ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${neonColor}33` }}>
          {muted
            ? <VolumeX style={{ width:13, height:13, color:"rgba(255,255,255,0.32)" }}/>
            : <Volume2 style={{ width:13, height:13, color:"rgba(255,255,255,0.75)" }}/>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Comments sheet ─────────────────────────────────────────── */
function CommentsSheet({ reelId, commentsCount, onClose, user }: {
  reelId: number; commentsCount: number; onClose: () => void;
  user: {id:number;displayName?:string;avatarUrl?:string|null}|null;
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
    fetch(`${API}/api/reels/${reelId}/comments`, {credentials:"include"})
      .then(r=>r.ok?r.json():[]).then(d=>{setComments(d);setLoading(false);}).catch(()=>setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim()||!user||sending) return; setSending(true);
    try {
      const res = await fetch(`${API}/api/reels/${reelId}/comments`, {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
        body:JSON.stringify({content:text}),
      });
      if (res.ok) {
        const nc = await res.json(); setComments(p=>[nc,...p]); setCount(v=>v+1); setText("");
        setTimeout(()=>listRef.current?.scrollTo({top:0,behavior:"smooth"}),100);
      }
    } finally { setSending(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm"/>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28,stiffness:300}}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-t-3xl overflow-hidden"
        style={{maxHeight:"75vh", background:"rgba(10,8,24,0.96)", backdropFilter:"blur(24px)",
          border:"1px solid rgba(124,58,237,0.2)", borderBottom:"none"}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3"
          style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <span className="text-white font-bold text-sm">{count} {t("reels.comments")}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{background:"rgba(255,255,255,0.08)"}}>
            <X className="w-3.5 h-3.5 text-white/60"/>
          </button>
        </div>
        <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-4"
          style={{maxHeight:"calc(75vh - 140px)"}}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin"/>
            </div>
          ) : comments.length===0 ? (
            <p className="text-white/30 text-sm text-center py-8">{t("reels.no_comments")}</p>
          ) : comments.map((c,i)=>(
            <motion.div key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.03}} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border border-white/10"
                style={{background:"linear-gradient(135deg,#7c3aed55,#ec489955)"}}>
                {c.author.avatarUrl
                  ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover"/>
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
          style={{borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden"
            style={{background:"linear-gradient(135deg,#7c3aed55,#ec489955)"}}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                  {initials(user?.displayName)}
                </div>}
          </div>
          <div className="flex-1 flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder={t("reels.comment_ph")}
              className="flex-1 px-3.5 py-2 rounded-2xl text-white text-sm placeholder:text-white/30 focus:outline-none"
              style={{background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)"}}
            />
            <motion.button whileTap={{scale:0.88}} onClick={handleSend} disabled={!text.trim()||sending}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{background:"linear-gradient(135deg,#7c3aed,#3b82f6)"}}>
              {sending ? <Loader2 className="w-4 h-4 text-white animate-spin"/> : <Send className="w-4 h-4 text-white"/>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SINGULARITY ACTION HUB
   ─────────────────────────────────────────────────────────────────
   • Single hub circle at top-right
   • Press → 5 sub-circles arc OUT in a quarter-circle fan (left→down)
             + SVG constellation lines animate from hub to each node
             + Shockwave ring expands from hub
   • Press again → sub-circles implode back into hub (reverse stagger)
   • Each sub-circle: glass, icon, count label beside it
   • No other social platform has this exact interaction pattern
═══════════════════════════════════════════════════════════════════ */
interface HubProps {
  open: boolean; onToggle: () => void;
  isLiked: boolean; likesCount: number; commentsCount: number;
  onLike: ()=>void; onComment: ()=>void; onShare: ()=>void;
  onAI: ()=>void;
  analyzingId: number|null; reelId: number; neonColor: string;
}

function ActionHub({
  open, onToggle, isLiked, likesCount, commentsCount,
  onLike, onComment, onShare, onAI,
  analyzingId, reelId, neonColor,
}: HubProps) {
  const [shareOk, setShareOk]       = useState(false);
  const [shockwave, setShockwave]   = useState(false);
  const [solidarity, setSolidarity] = useState(false);

  const pulse = () => {
    setSolidarity(true);
    setTimeout(() => setSolidarity(false), 600);
  };

  const handleOpen = () => {
    if (!open) setShockwave(true);
    onToggle();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title:"OlCha Reel", url:`${window.location.origin}/reels` });
      else await navigator.clipboard.writeText(`${window.location.origin}/reels`);
    } catch { /* silent */ }
    setShareOk(true); onShare(); pulse();
    setTimeout(() => { setShareOk(false); onToggle(); }, 1600);
  };

  // Sub-circle definitions (5 items, arc from left → down)
  const subs = [
    {
      id:"like", icon:<Heart className={`w-[18px] h-[18px] ${isLiked?"fill-red-400 text-red-400":"text-white/80"}`}/>,
      color:"#ef4444", bg: isLiked?"rgba(239,68,68,0.45)":"rgba(10,7,24,0.56)",
      border: isLiked?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.13)",
      glow: isLiked?"rgba(239,68,68,0.45)":undefined,
      label: fmt(likesCount), labelColor:"#fca5a5",
      onClick: () => { onLike(); pulse(); },
    },
    {
      id:"comment", icon:<MessageCircle className="w-[18px] h-[18px] text-white/80"/>,
      color:"#60a5fa", bg:"rgba(59,130,246,0.34)", border:"rgba(96,165,250,0.38)", glow:"rgba(59,130,246,0.32)",
      label: fmt(commentsCount), labelColor:"#93c5fd",
      onClick: () => { onComment(); onToggle(); },
    },
    {
      id:"share",
      icon: shareOk
        ? <Check className="w-[18px] h-[18px] text-emerald-300"/>
        : <Share2 className="w-[18px] h-[18px] text-white/80"/>,
      color: shareOk?"#10b981":"rgba(255,255,255,0.5)",
      bg: shareOk?"rgba(16,185,129,0.4)":"rgba(10,7,24,0.56)",
      border: shareOk?"rgba(16,185,129,0.45)":"rgba(255,255,255,0.13)",
      glow: shareOk?"rgba(16,185,129,0.4)":undefined,
      label:"", labelColor:"#6ee7b7",
      onClick: handleShare,
    },
    {
      id:"ai",
      icon: analyzingId===reelId
        ? <Loader2 className="w-[18px] h-[18px] text-violet-300 animate-spin"/>
        : <Brain className="w-[18px] h-[18px] text-violet-200"/>,
      color:"#a78bfa", bg:"rgba(124,58,237,0.42)", border:"rgba(167,139,250,0.42)", glow:"rgba(124,58,237,0.38)",
      label:"", labelColor:"#c4b5fd",
      onClick: () => { onAI(); pulse(); },
    },
  ];

  return (
    <div
      style={{ position:"absolute", top:14, right:12, width:HUB, height:HUB, zIndex:30, overflow:"visible" }}
      onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>

      {/* Shockwave ring */}
      <AnimatePresence>
        {shockwave && (
          <motion.div
            key="shock"
            initial={{ x:-(HUB*1.2)/2, y:-(HUB*1.2)/2, width:HUB*1.2, height:HUB*1.2, opacity:0.9, borderRadius:"50%" }}
            animate={{ x:-(HUB*3.5)/2, y:-(HUB*3.5)/2, width:HUB*3.5, height:HUB*3.5, opacity:0 }}
            transition={{ duration:0.5, ease:"easeOut" }}
            onAnimationComplete={() => setShockwave(false)}
            style={{ position:"absolute", border:`2px solid ${neonColor}`, pointerEvents:"none", zIndex:5 }}
          />
        )}
      </AnimatePresence>

      {/* Hub button */}
      <motion.button
        whileTap={{ scale:0.65 }}
        onClick={handleOpen}
        style={{
          ...hubBase, position:"relative", zIndex:10,
          background: "rgba(255,255,255,0.10)",
          border: "1.5px solid rgba(255,255,255,0.22)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: open
            ? "0 0 22px rgba(167,139,250,0.35), 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)"
            : "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}>

        {/* Rotating + → × */}
        <motion.div
          animate={{ rotate: open ? 45 : 0, scale: open ? 1.1 : 1 }}
          transition={{ type:"spring", damping:12, stiffness:280 }}>
          <Plus className="w-5 h-5 text-white"/>
        </motion.div>

        {/* Idle pulsing ring */}
        {!open && (
          <motion.div
            animate={{ opacity:[0.35,0,0.35], scale:[1,1.28,1] }}
            transition={{ duration:3.2, repeat:Infinity, ease:"easeInOut" }}
            style={{ position:"absolute", inset:-3, borderRadius:"50%",
              border:`1px solid ${neonColor}55`, pointerEvents:"none" }}
          />
        )}
      </motion.button>

      {/* Sub-circles — radial fan */}
      {subs.map((s, i) => {
        const { dx, dy } = FAN_OFFSETS[i];
        const delayOpen  = i * 0.075;
        const delayClose = (subs.length - 1 - i) * 0.055;
        // Position sub-circle so its CENTER aligns with hub center when dx=dy=0
        const offset = (HUB - SUB) / 2; // = 3

        return (
          <motion.div key={s.id}
            style={{ position:"absolute", top:offset, left:offset, zIndex: 9 - i }}
            animate={{
              x:       open ? dx : 0,
              y:       open ? dy : 0,
              scale:   open ? 1  : 0.12,
              opacity: open ? 1  : 0,
            }}
            transition={{
              type:"spring", damping:19, stiffness:300,
              delay: open ? delayOpen : delayClose,
            }}>

            {/* Solidarity pulse ring */}
            {solidarity && (
              <motion.div
                initial={{ scale:1, opacity:0.8 }}
                animate={{ scale:2.2, opacity:0 }}
                transition={{ duration:0.55, ease:"easeOut" }}
                style={{ position:"absolute", inset:0, borderRadius:"50%",
                  border:`1.5px solid ${s.color}`, pointerEvents:"none" }}
              />
            )}

            {/* Circle button */}
            <motion.button whileTap={{ scale:0.68 }} onClick={s.onClick}
              whileHover={{ scale:1.1 }}
              style={{
                ...subBase,
                background: s.bg,
                border: `1px solid ${s.border}`,
                boxShadow: s.glow
                  ? `0 0 18px ${s.glow}, 0 4px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)`
                  : `0 4px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}>
              {s.icon}
            </motion.button>

            {/* Count / label pill — floats beside circle */}
            {s.label && (
              <motion.div
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : 8 }}
                transition={{ delay: open ? delayOpen+0.14 : 0, duration:0.18 }}
                style={{ position:"absolute", right:`calc(100% + 7px)`, top:"50%",
                  transform:"translateY(-50%)", pointerEvents:"none", whiteSpace:"nowrap" }}>
                <div className="flex items-center px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(0,0,0,0.52)", backdropFilter:"blur(8px)" }}>
                  <span className="text-[11px] font-black tabular-nums"
                    style={{ color: s.labelColor, textShadow:"0 1px 6px rgba(0,0,0,0.9)" }}>
                    {s.label}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Video element ──────────────────────────────────────────── */
function ReelVideoEl({ videoUrl, thumbnailUrl, isActive, muted, videoRef, onPlayState }: {
  videoUrl?: string|null; thumbnailUrl?: string|null; isActive: boolean; muted: boolean;
  videoRef: React.RefObject<HTMLVideoElement|null>; onPlayState: (p: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (isActive) { v.currentTime=0; setError(false); setLoading(v.readyState<3); v.play().catch(()=>onPlayState(true)); }
    else { v.pause(); v.currentTime=0; }
  }, [isActive, videoRef, onPlayState]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted, videoRef]);

  if (!videoUrl) return (
    <div className="absolute inset-0">
      {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{background:"linear-gradient(135deg,#1e0533,#030314)"}}/>}
    </div>
  );

  return (
    <div className="absolute inset-0">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{filter:"blur(22px) brightness(0.28)", pointerEvents:"none"}} />
      )}
      {thumbnailUrl && (loading||!isActive) && !error && (
        <img src={thumbnailUrl} alt="" loading="eager"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]" />
      )}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        src={videoUrl} poster={thumbnailUrl??undefined}
        className="absolute inset-0 w-full h-full object-contain z-[2]"
        loop playsInline muted={muted} preload="auto"
        onLoadedData={()=>setLoading(false)} onCanPlay={()=>setLoading(false)}
        onWaiting={()=>setLoading(true)}
        onPlaying={()=>{ setLoading(false); onPlayState(false); }}
        onPause={()=>onPlayState(true)}
        onError={()=>{ setError(true); setLoading(false); }}
        style={{opacity:loading&&!thumbnailUrl?0:1, transition:"opacity 100ms ease"}}
      />
      {loading && !error && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin"/>
            <div className="absolute inset-2 rounded-full border border-white/5 border-t-pink-400 animate-spin"
              style={{animationDuration:"0.65s",animationDirection:"reverse"}}/>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 z-[3] pointer-events-none">
          {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25"/>}
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
    v.addEventListener("timeupdate", h, {passive:true});
    return () => v.removeEventListener("timeupdate", h);
  });
  return progress;
}

/* ─── ReelSlide ──────────────────────────────────────────────── */
function ReelSlide({
  reel, isActive, muted,
  onLike, isLiked, onAnalyze, analyzingId, analysis,
  onComment, onShare, onMute,
}: {
  reel: FeedItem; isActive: boolean; muted: boolean;
  onLike:()=>void; isLiked:boolean;
  onAnalyze:()=>void; analyzingId:number|null; analysis?:Analysis;
  onComment:()=>void; onShare:()=>void;
  onMute:()=>void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = useVideoProgress(videoRef);
  const [paused,      setPaused]      = useState(false);
  const [cinemaMode,  setCinemaMode]  = useState(false);
  const [particles,   setParticles]   = useState<{x:number;y:number;id:number}[]>([]);
  const [ripples,     setRipples]     = useState<{x:number;y:number;id:number}[]>([]);
  const [lastTap,     setLastTap]     = useState(0);
  const holdStart = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  /* Hold → Cinema mode: all UI fades, pure video + letterbox */
  const startHold = useCallback(() => { setCinemaMode(true); }, []);
  const stopHold  = useCallback(() => { setCinemaMode(false); }, []);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const neonColor = analysis?.sentiment==="positive" ? "#10b981"
    : analysis?.sentiment==="negative" ? "#ef4444"
    : reel._aiSuggested ? "#a78bfa" : "#7c3aed";

  const caption = reel.caption ?? "";
  const captionShort = caption.length > 68 ? caption.slice(0,68)+"…" : caption;
  /* Typewriter — triggers when reel becomes active */
  const typed = useTypewriter(captionShort, isActive, 26);

  type TapDiv = HTMLDivElement & { _holdTimer?: ReturnType<typeof setTimeout> };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    holdStart.current = Date.now();
    const el = e.currentTarget as TapDiv;
    el._holdTimer = setTimeout(() => startHold(), 220);
  }, [startHold]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget as TapDiv;
    if (el._holdTimer) { clearTimeout(el._holdTimer); el._holdTimer=undefined; }
    const held = Date.now()-holdStart.current;
    stopHold();
    if (held < 220) {
      const now  = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX-rect.left, y = e.clientY-rect.top;
      if (now-lastTap < 280) {
        if (!isLiked) onLike();
        setRipples(r=>[...r,{x,y,id:now}]);
        setParticles(p=>[...p,{x,y,id:now+1}]);
      } else {
        const v = videoRef.current;
        if (v) { if(v.paused){v.play().catch(()=>{});setPaused(false);}else{v.pause();setPaused(true);} }
      }
      setLastTap(now);
    }
  }, [stopHold, lastTap, isLiked, onLike]);

  return (
    <div className="relative w-full h-full">

      {/* ambient bg */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {reel.thumbnailUrl && (
          <img src={reel.thumbnailUrl} alt="" aria-hidden="true"
            className="absolute inset-[-10%] w-[120%] h-[120%] object-cover"
            style={{filter:"blur(62px) saturate(2.6) brightness(0.16)"}}/>
        )}
        <div className="absolute inset-0"
          style={{background:`radial-gradient(ellipse at 50% 36%, ${neonColor}12 0%, rgba(0,0,0,0.6) 100%)`}}/>
      </div>

      {/* floating card */}
      <div className="absolute inset-x-1 top-0 bottom-0 rounded-[28px] overflow-hidden"
        style={{
          boxShadow:`0 0 52px ${neonColor}22, 0 24px 64px rgba(0,0,0,0.82)`,
          border:`1.5px solid ${neonColor}18`,
        }}>

        <ReelVideoEl videoUrl={reel.videoUrl} thumbnailUrl={reel.thumbnailUrl}
          isActive={isActive} muted={muted} videoRef={videoRef} onPlayState={setPaused}/>

        {/* cinematic gradients */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{background:"linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.05) 24%, transparent 42%)"}}/>
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{background:"linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 14%)"}}/>

        <NeonCorners color={neonColor}/>

        {/* tap / hold zone */}
        <div className="absolute inset-0 z-20 cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={e=>{
            const el = e.currentTarget as TapDiv;
            if(el._holdTimer){clearTimeout(el._holdTimer);el._holdTimer=undefined;}
            stopHold();
          }}
        />

        {/* double-tap ripple waves */}
        <div className="absolute inset-0 z-[52] pointer-events-none overflow-hidden">
          {ripples.map(r=>(
            <RippleWave key={r.id} x={r.x} y={r.y} color={neonColor}
              onDone={()=>setRipples(prev=>prev.filter(h=>h.id!==r.id))}/>
          ))}
        </div>

        {/* particles */}
        <div className="absolute inset-0 z-[54] pointer-events-none overflow-hidden">
          {particles.map(p=>(
            <ParticleBurst key={p.id} x={p.x} y={p.y}
              onDone={()=>setParticles(prev=>prev.filter(h=>h.id!==p.id))}/>
          ))}
        </div>

        {/* Thin progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-[28] pointer-events-none" style={{height:3}}>
          <div style={{width:`${progress*100}%`, height:"100%",
            background:`linear-gradient(90deg,${neonColor},#06b6d4)`,
            boxShadow:`0 0 7px ${neonColor}bb`, transition:"width 0.1s linear"}}/>
        </div>

        {/* ══ CINEMA MODE: letterbox + SIGNAL pulse ══ */}
        <AnimatePresence>
          {cinemaMode && (
            <>
              {/* top bar */}
              <motion.div key="lb-top"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.14}}
                className="absolute top-0 left-0 right-0 z-[35] pointer-events-none"
                style={{height:52, background:"linear-gradient(to bottom,rgba(0,0,0,0.9) 30%,transparent)"}}/>
              {/* bottom bar */}
              <motion.div key="lb-bot"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.14}}
                className="absolute bottom-0 left-0 right-0 z-[35] pointer-events-none"
                style={{height:52, background:"linear-gradient(to top,rgba(0,0,0,0.9) 30%,transparent)"}}/>
              {/* SIGNAL dot */}
              <motion.div key="signal"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-[36] flex items-center gap-1.5 pointer-events-none">
                <motion.div
                  animate={{scale:[1,1.6,1], opacity:[1,0.35,1]}}
                  transition={{duration:1.3, repeat:Infinity, ease:"easeInOut"}}
                  style={{width:7,height:7,borderRadius:"50%",background:"#a855f7",
                    boxShadow:"0 0 12px #a855f7,0 0 24px #a855f755"}}/>
                <span style={{fontSize:8.5,fontWeight:900,letterSpacing:"0.24em",
                  color:"rgba(255,255,255,0.32)",textTransform:"uppercase"}}>SIGNAL</span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pause icon */}
        <AnimatePresence>
          {paused && !cinemaMode && (
            <motion.div initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:1.4}} transition={{duration:0.15}}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div style={{width:64,height:64,borderRadius:"50%",
                background:"rgba(0,0,0,0.52)",backdropFilter:"blur(12px)",
                border:"1.5px solid rgba(255,255,255,0.18)",
                boxShadow:`0 0 28px ${neonColor}44`,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg className="fill-white" width="24" height="24" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                  <rect x="14" y="4" width="4" height="16" rx="1.5"/>
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ CAPTION + TAGS (above bottom bar, fades in cinema mode) ══ */}
        <motion.div
          animate={{ opacity: cinemaMode ? 0 : 1, y: cinemaMode ? 6 : 0 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-[72px] left-4 right-4 z-30 pointer-events-none">
          {caption && (
            <p className="text-white text-[12px] leading-snug mb-2 font-semibold"
              style={{textShadow:"0 1px 14px rgba(0,0,0,1)"}}>
              {typed}
              {typed.length < captionShort.length && (
                <motion.span animate={{opacity:[1,0,1]}} transition={{duration:0.6,repeat:Infinity}}>|</motion.span>
              )}
            </p>
          )}
          {/* Audio chip */}
          {reel.audioTrack && (
            <div className="pointer-events-auto mb-1.5"
              onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
              <AudioChip track={reel.audioTrack} color={neonColor}/>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {reel.tags?.slice(0,3).map(tag=>(
              <motion.span key={tag}
                initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}}
                transition={{type:"spring",damping:14}}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{color:neonColor, background:`${neonColor}14`, border:`1px solid ${neonColor}26`}}>
                #{tag}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* ══ NEW: Bottom Command Bar ══ */}
        <BottomBar
          reel={reel}
          isLiked={isLiked} likesCount={(reel.likesCount??0)+(isLiked?1:0)}
          commentsCount={reel.commentsCount??0}
          onLike={onLike} onComment={onComment} onShare={()=>{}}
          onAI={onAnalyze}
          onMute={onMute} muted={muted}
          analyzingId={analyzingId} neonColor={neonColor} cinemaMode={cinemaMode}
        />

        {/* AI analysis badge */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{opacity:0,y:6,scale:0.9}} animate={{opacity:1,y:0,scale:1}}
              exit={{opacity:0,y:-4,scale:0.9}}
              className="absolute bottom-[68px] right-3 z-30 pointer-events-none"
              style={{maxWidth:130}}>
              <div className="px-2.5 py-1.5 rounded-xl text-[9px] font-semibold"
                style={{background:"rgba(124,58,237,0.45)", backdropFilter:"blur(12px)",
                  border:"1px solid rgba(167,139,250,0.3)", color:"#c4b5fd",
                  boxShadow:"0 0 16px rgba(124,58,237,0.3)"}}>
                {analysis.sentiment && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <span>{analysis.sentiment==="positive"?"✅":analysis.sentiment==="negative"?"⚠️":"😐"}</span>
                    <span className="capitalize">{analysis.sentiment}</span>
                  </div>
                )}
                {analysis.category && <div className="opacity-70 truncate">{analysis.category}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* /card */}
    </div>
  );
}

/* ─── Main ReelsPage ─────────────────────────────────────────── */
export default function ReelsPage() {
  const { data: initialReels = [], isLoading } = useListReels({ limit:20 } as any);
  const [feed, setFeed]             = useState<FeedItem[]>([]);
  const [current, setCurrent]       = useState(0);
  const [likedIds, setLikedIds]     = useState<Set<number>>(new Set());
  const [muted, setMuted]           = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentReel, setCommentReel] = useState<FeedItem|null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number,Analysis>>({});
  const [analyzingId, setAnalyzingId] = useState<number|null>(null);
  const [injecting, setInjecting]   = useState(false);

  const likeReel = useLikeReel();
  const qc       = useQueryClient();
  const { user } = useAuth();

  const watchedTags = useRef<string[]>([]);
  const watchedIds  = useRef<Set<number>>(new Set());

  useEffect(()=>{
    if(initialReels.length>0&&feed.length===0) setFeed(initialReels as FeedItem[]);
  },[initialReels,feed.length]);

  useEffect(()=>{
    const reel=feed[current]; if(!reel) return;
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
        .then((sim:FeedItem[])=>{
          if(sim.length>0) setFeed(prev=>{
            const at=Math.min(current+3,prev.length);
            return [...prev.slice(0,at),...sim.map(r=>({...r,_aiSuggested:true})),...prev.slice(at)];
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

  const wheelAccum=useRef(0), wheelLock=useRef(false);
  const handleWheel=useCallback((e:React.WheelEvent)=>{
    e.preventDefault(); if(wheelLock.current) return;
    wheelAccum.current+=e.deltaY;
    if(Math.abs(wheelAccum.current)>60){
      setCurrent(c=>Math.max(0,Math.min(feed.length-1,c+(wheelAccum.current>0?1:-1))));
      wheelAccum.current=0; wheelLock.current=true; setTimeout(()=>{wheelLock.current=false;},380);
    }
  },[feed.length]);

  const [, navigate] = useLocation();
  const touchY=useRef(0);
  const touchX=useRef(0);
  const handleTouchStart=useCallback((e:React.TouchEvent)=>{
    touchY.current=e.touches[0].clientY;
    touchX.current=e.touches[0].clientX;
  },[]);
  const handleTouchEnd  =useCallback((e:React.TouchEvent)=>{
    const dy=touchY.current-e.changedTouches[0].clientY;
    const dx=touchX.current-e.changedTouches[0].clientX;
    if(Math.abs(dx)>Math.abs(dy)){
      if(dx<-70) navigate("/");
      if(dx>70)  navigate("/otube");
    } else {
      if(dy>50)  setCurrent(c=>Math.min(feed.length-1,c+1));
      if(dy<-50) setCurrent(c=>Math.max(0,c-1));
    }
  },[feed.length, navigate]);

  const y=useMotionValue(0);
  const dragOpacity=useTransform(y,[-80,0,80],[0.45,1,0.45]);
  const handleDragEnd=useCallback((_:unknown,info:{offset:{y:number}})=>{
    if(info.offset.y<-50) setCurrent(c=>Math.min(feed.length-1,c+1));
    else if(info.offset.y>50) setCurrent(c=>Math.max(0,c-1));
    y.set(0);
  },[feed.length,y]);

  const handleLike=useCallback((reelId:number)=>{
    const next=new Set(likedIds);
    if(next.has(reelId)) next.delete(reelId); else next.add(reelId);
    setLikedIds(next);
    likeReel.mutate({id:reelId},{
      onSuccess:()=>qc.invalidateQueries({queryKey:getListReelsQueryKey()}),
      onError:()=>{
        const rb=new Set(likedIds);
        if(rb.has(reelId)) rb.delete(reelId); else rb.add(reelId);
        setLikedIds(rb);
      },
    });
  },[likedIds,likeReel,qc]);

  const handleAnalyze=useCallback(async(reelId:number,caption?:string,thumbUrl?:string)=>{
    if(analysisMap[reelId]) return; setAnalyzingId(reelId);
    try{
      const res=await fetch(`${API}/api/ai/analyze-content`,{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
        body:JSON.stringify({contentId:reelId,contentType:"reel",caption:caption??"",imageUrl:thumbUrl}),
      });
      if(res.ok){const d=await res.json();setAnalysisMap(p=>({...p,[reelId]:d}));}
    }catch{}finally{setAnalyzingId(null);}
  },[analysisMap]);

  const handleShare=useCallback(async(reelId:number)=>{
    fetch(`${API}/api/interactions`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
      body:JSON.stringify({contentType:"reel",contentId:reelId,interactionType:"share"})}).catch(()=>{});
  },[]);

  const reel=feed[current];

  // Unused import suppressor
  void fmAnimate;

  return (
    <div className="relative flex items-center justify-center overflow-hidden"
      style={{height:"calc(100vh - 60px)", minHeight:480, background:"#000"}}
      onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* global ambient */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {reel?.thumbnailUrl && (
            <motion.img key={reel.id} src={reel.thumbnailUrl} alt="" aria-hidden="true"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.5}}
              className="absolute inset-[-12%] w-[124%] h-[124%] object-cover"
              style={{filter:"blur(80px) saturate(3) brightness(0.12)"}}/>
          )}
        </AnimatePresence>
        <div className="absolute inset-0" style={{background:"rgba(0,0,0,0.55)"}}/>
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
          style={{opacity:0.014,
            backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.6) 0px,rgba(255,255,255,0.6) 1px,transparent 1px,transparent 3px)"}}/>
      </div>

      {/* Video preload */}
      <div style={{display:"none"}} aria-hidden="true">
        {[current+1,current+2].map(i=>{const r=feed[i];return r?.videoUrl?<video key={r.id} src={r.videoUrl} preload="auto" muted playsInline loop/>:null;})}
        {[current+1,current+2,current+3].map(i=>{const r=feed[i];return r?.thumbnailUrl?<img key={`t-${r.id}`} src={r.thumbnailUrl} loading="eager" alt=""/>:null;})}
      </div>

      {/* States */}
      {isLoading&&feed.length===0 ? (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin"/>
            <div className="absolute inset-2.5 rounded-full border border-white/10 border-t-pink-400 animate-spin"
              style={{animationDuration:"0.65s",animationDirection:"reverse"}}/>
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
            <Plus className="w-4 h-4"/> Reel qo'shish
          </motion.button>
        </div>
      ) : reel && (
        <>
          <motion.div drag="y" dragConstraints={{top:0,bottom:0}} dragElastic={0.1}
            onDragEnd={handleDragEnd} className="relative z-10 select-none touch-none"
            style={{
              opacity:dragOpacity,
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
                  onMute={()=>setMuted(v=>!v)}
                />
              </motion.div>
            </AnimatePresence>

            {/* Desktop arrow nav */}
            <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex-col gap-3 hidden md:flex z-20">
              {([[-1,"M5 15l7-7 7 7"],[1,"M19 9l-7 7-7-7"]] as [number,string][]).map(([dir,icon])=>(
                <motion.button key={dir} whileTap={{scale:0.85}}
                  onClick={()=>setCurrent(c=>Math.max(0,Math.min(feed.length-1,c+dir)))}
                  disabled={dir===-1?current===0:current>=feed.length-1}
                  className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20"
                  style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.11)"}}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon}/>
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Filmstrip — right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 items-center">
            {feed.slice(Math.max(0,current-3),Math.min(feed.length,current+6)).map((r,relIdx)=>{
              const absIdx=Math.max(0,current-3)+relIdx;
              const isAct=absIdx===current, dist=Math.abs(absIdx-current);
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
                    ? <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full" style={{background:"linear-gradient(135deg,#7c3aed44,#ec489944)"}}/>}
                </motion.button>
              );
            })}
            {feed.length>0 && (
              <span className="text-[8px] font-black text-white/20 mt-1"
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
            style={{background:"rgba(124,58,237,0.32)",backdropFilter:"blur(8px)",
              border:"1px solid rgba(167,139,250,0.22)",color:"#c4b5fd"}}>
            <Sparkles className="w-2.5 h-2.5 animate-pulse"/>
            AI tavsiyalar…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commentReel && (
          <CommentsSheet reelId={commentReel.id} commentsCount={commentReel.commentsCount??0}
            user={user} onClose={()=>setCommentReel(null)}/>
        )}
      </AnimatePresence>

      <CreateContentModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
    </div>
  );
}
