/**
 * OTube — NEXUS SIGNAL ENGINE v3
 * Kelajak avlod video platformasi — YouTube raqibi
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
  RotateCcw, ChevronRight, ChevronDown, ChevronUp,
  Maximize2, Minimize2, RefreshCw, MessageCircle, Bookmark,
  Plus, DollarSign, Star, Users, Clock, ThumbsUp, ThumbsDown,
  Flag, Gauge, Upload, BadgeDollarSign,
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
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

/* ─────────────────────────────────────────────────────── */
/* Settings / Monetization types                           */
/* ─────────────────────────────────────────────────────── */
interface PlayerSettings {
  autoplay:     boolean;
  loop:         boolean;
  muteDefault:  boolean;
  quality:      "Auto"|"1080p"|"720p"|"480p"|"360p";
  cinemaMode:   boolean;
  showTitle:    boolean;
  dataWarning:  boolean;
  hdStream:     boolean;
}
interface MonetizationSettings {
  creatorMode:       boolean;
  adsEnabled:        boolean;
  membershipEnabled: boolean;
  superThanks:       boolean;
  donation:          "500"|"2000"|"10000"|"50000";
}
const DEFAULT_SETTINGS: PlayerSettings = {
  autoplay: true, loop: true, muteDefault: false,
  quality: "Auto", cinemaMode: false, showTitle: true,
  dataWarning: false, hdStream: true,
};
const DEFAULT_MONETIZE: MonetizationSettings = {
  creatorMode: false, adsEnabled: true,
  membershipEnabled: false, superThanks: true, donation: "2000",
};

/* ─────────────────────────────────────────────────────── */
/* OTube Logo — yumaloq doira ichida qizil sfera           */
/* ─────────────────────────────────────────────────────── */
function OTubeMark({ size = 32 }: { size?: number }) {
  const id = `ot${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        {/* Qizil sfera gradient */}
        <radialGradient id={`${id}s`} cx="38%" cy="30%" r="65%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#ff6b6b"/>
          <stop offset="35%"  stopColor="#ef2020"/>
          <stop offset="75%"  stopColor="#b91c1c"/>
          <stop offset="100%" stopColor="#7f1d1d"/>
        </radialGradient>
        {/* Tashqi doira gradient */}
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#ff4444"/>
          <stop offset="100%" stopColor="#991b1b"/>
        </linearGradient>
        {/* Glow filter */}
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        {/* Drop shadow */}
        <filter id={`${id}d`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef2020" floodOpacity="0.55"/>
        </filter>
      </defs>

      {/* Tashqi halqa — glowing ring */}
      <circle cx="24" cy="24" r="22.5"
        stroke={`url(#${id}r)`} strokeWidth="1.2"
        fill="rgba(0,0,0,0.35)"
        filter={`url(#${id}g)`}/>

      {/* Asosiy qizil sfera */}
      <circle cx="24" cy="24" r="18"
        fill={`url(#${id}s)`}
        filter={`url(#${id}d)`}/>

      {/* Yorug'lik bliki — tepada chap */}
      <ellipse cx="18.5" cy="15.5" rx="6.5" ry="4"
        fill="rgba(255,255,255,0.28)" transform="rotate(-18 18.5 15.5)"/>

      {/* Kichik blik */}
      <ellipse cx="30" cy="14" rx="2.5" ry="1.5"
        fill="rgba(255,255,255,0.15)" transform="rotate(10 30 14)"/>

      {/* Play o'qi — oq, markazda */}
      <path d="M20 16.5 L32 24 L20 31.5 Z"
        fill="white" opacity="0.96"
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────── */
/* categories                                             */
/* ─────────────────────────────────────────────────────── */
const CATS = [
  { id:"all",      label:"Hammasi",  Icon:Globe,      color:"#a855f7" },
  { id:"trending", label:"Trend",    Icon:TrendingUp, color:"#f59e0b" },
  { id:"cinema",   label:"Kino",     Icon:Film,       color:"#ef4444" },
  { id:"music",    label:"Musiqa",   Icon:Music2,     color:"#06b6d4" },
  { id:"gaming",   label:"Gaming",   Icon:Gamepad2,   color:"#10b981" },
  { id:"ai",       label:"AI",       Icon:Sparkles,   color:"#f59e0b" },
  { id:"live",     label:"🔴 Live",  Icon:Zap,        color:"#ef4444" },
  { id:"new",      label:"Yangi",    Icon:Clock,      color:"#a855f7" },
];

/* Tablar */
const TABS = [
  { id:"home", label:"Bosh sahifa" },
  { id:"shorts", label:"Shorts" },
  { id:"subs", label:"Obunalar" },
];

/* ─────────────────────────────────────────────────────── */
/* SeekFlash                                               */
/* ─────────────────────────────────────────────────────── */
function SeekFlash({ side, visible }: { side:"left"|"right"; visible:boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key={side}
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.12 }}
          className={`absolute top-0 ${side==="left"?"left-0":"right-0"} bottom-0 flex items-center justify-center pointer-events-none`}
          style={{ width:"38%",
            background: side==="left"
              ? "radial-gradient(ellipse at left,rgba(239,68,68,0.22),transparent 70%)"
              : "radial-gradient(ellipse at right,rgba(239,68,68,0.22),transparent 70%)" }}
        >
          <div className="flex flex-col items-center gap-1.5" style={{ marginTop:-20 }}>
            <span style={{ fontSize:32 }}>{side==="left"?"⏪":"⏩"}</span>
            <span style={{ fontSize:12,fontWeight:900,color:"rgba(255,255,255,0.7)" }}>
              {side==="left"?"-10s":"+10s"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────── */
/* SpeedMenu                                               */
/* ─────────────────────────────────────────────────────── */
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
function SpeedMenu({
  speed, onSpeed, onClose,
}: { speed:number; onSpeed:(s:number)=>void; onClose:()=>void }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:0.88, y:8 }} animate={{ opacity:1, scale:1, y:0 }}
      exit={{ opacity:0, scale:0.88, y:8 }}
      transition={{ type:"spring", damping:22, stiffness:350 }}
      className="absolute bottom-20 right-3 z-50 rounded-[18px] overflow-hidden"
      style={{ background:"rgba(10,4,26,0.96)", backdropFilter:"blur(24px)",
        border:"1px solid rgba(239,68,68,0.25)", minWidth:130,
        boxShadow:"0 16px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(239,68,68,0.12)" }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize:10,fontWeight:900,letterSpacing:"0.12em",
          color:"rgba(239,68,68,0.8)",textTransform:"uppercase" }}>TEZLIK</span>
        <motion.button whileTap={{ scale:0.8 }} onClick={onClose}>
          <X className="w-3.5 h-3.5 text-white/35"/>
        </motion.button>
      </div>
      {SPEEDS.map(s => (
        <motion.button key={s} whileTap={{ scale:0.92 }}
          onClick={() => { onSpeed(s); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5"
          style={{ background: speed===s ? "rgba(239,68,68,0.12)" : "transparent",
            transition:"background 0.15s" }}>
          <span style={{ fontSize:13, fontWeight: speed===s ? 900 : 600,
            color: speed===s ? "#fca5a5" : "rgba(255,255,255,0.55)" }}>
            {s === 1 ? "Oddiy" : `${s}×`}
          </span>
          {speed===s && <Check className="w-3.5 h-3.5 text-red-400"/>}
        </motion.button>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* CommentsPanel                                           */
/* ─────────────────────────────────────────────────────── */
const MOCK_COMMENTS = [
  { id:1, user:"Jasur T",       avatar:"",  text:"Ajoyib video! Davom ettir 🔥",    likes:42, time:"2s oldin" },
  { id:2, user:"Malika S",      avatar:"",  text:"Bu qanaqa texnologiya bor?",      likes:18, time:"5s oldin" },
  { id:3, user:"OlCha fani",    avatar:"",  text:"OTube eng yaxshi platforma 💯",   likes:105,time:"8s oldin" },
  { id:4, user:"Dilshod B",     avatar:"",  text:"Qachon keyingi qism?",            likes:7,  time:"12s oldin" },
  { id:5, user:"Nodira A",      avatar:"",  text:"Sifat juda yaxshi ekan 👏",       likes:33, time:"18s oldin" },
  { id:6, user:"Tech Uzbek",    avatar:"",  text:"Signal Engine — future platform!",likes:89, time:"24s oldin" },
];

function CommentsPanel({ onClose }: { onClose:()=>void }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const send = () => {
    if (!text.trim()) return;
    setComments(c => [{ id: Date.now(), user:"Siz", avatar:"", text, likes:0, time:"hozir" }, ...c]);
    setText("");
  };

  return (
    <motion.div
      key="comments"
      initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
      transition={{ type:"spring", damping:30, stiffness:320 }}
      className="absolute inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-[24px] overflow-hidden"
      style={{ background:"rgba(8,3,22,0.97)", backdropFilter:"blur(30px)",
        border:"1px solid rgba(239,68,68,0.15)", maxHeight:"70%" }}
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div style={{ width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.12)" }}/>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-red-400"/>
          <span className="text-white font-black text-[14px]">Izohlar</span>
          <span className="text-white/30 text-[11px]">({comments.length})</span>
        </div>
        <motion.button whileTap={{ scale:0.82 }} onClick={onClose}
          style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.07)",
            border:"1px solid rgba(255,255,255,0.09)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <X className="w-3.5 h-3.5 text-white/55"/>
        </motion.button>
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width:30,height:30,borderRadius:"50%",flexShrink:0,
          background:"linear-gradient(135deg,#ef4444,#7c3aed)",
          display:"flex",alignItems:"center",justifyContent:"center" }}>
          <span style={{ fontSize:12,fontWeight:900,color:"white" }}>S</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)" }}>
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key==="Enter" && send()}
            placeholder="Izoh qoldiring..."
            className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/25"/>
          {text && (
            <motion.button whileTap={{ scale:0.82 }} onClick={send}>
              <span style={{ fontSize:18 }}>➤</span>
            </motion.button>
          )}
        </div>
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ scrollbarWidth:"none" }}>
        {comments.map(c => (
          <div key={c.id} className="flex gap-2.5">
            <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,
              background:`hsl(${(c.id * 47)%360},60%,35%)`,
              display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontSize:11,fontWeight:900,color:"white" }}>
                {c.user[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span style={{ fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.7)" }}>{c.user}</span>
                <span style={{ fontSize:9,color:"rgba(255,255,255,0.25)" }}>{c.time}</span>
              </div>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.82)",lineHeight:1.45 }}>{c.text}</p>
              <div className="flex items-center gap-3 mt-1">
                <motion.button whileTap={{ scale:0.8 }}
                  onClick={() => setLiked(s => { const n=new Set(s); n.has(c.id)?n.delete(c.id):n.add(c.id); return n; })}
                  className="flex items-center gap-1">
                  <ThumbsUp style={{ width:10,height:10,
                    fill:liked.has(c.id)?"#fca5a5":"none",
                    color:liked.has(c.id)?"#fca5a5":"rgba(255,255,255,0.3)" }}/>
                  <span style={{ fontSize:9,color:"rgba(255,255,255,0.3)" }}>
                    {c.likes + (liked.has(c.id)?1:0)}
                  </span>
                </motion.button>
                <button style={{ fontSize:9,color:"rgba(255,255,255,0.22)" }}>Javob</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* NexusPlayer v3 — YouTube-dan boyroq                    */
/* ─────────────────────────────────────────────────────── */
function NexusPlayer({
  video, onClose, settings,
}: { video:Reel; onClose:()=>void; settings:PlayerSettings }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTap    = useRef(0);
  const tapTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longHold   = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [playing,    setPlaying]    = useState(false);
  const [muted,      setMuted]      = useState(settings.muteDefault);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [curTime,    setCurTime]    = useState(0);
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [liked,      setLiked]      = useState(false);
  const [disliked,   setDisliked]   = useState(false);
  const [shared,     setShared]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [seekLeft,   setSeekLeft]   = useState(false);
  const [seekRight,  setSeekRight]  = useState(false);
  const [fastFwd,    setFastFwd]    = useState(false);
  const [speed,      setSpeed]      = useState(1);
  const [showSpeed,  setShowSpeed]  = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theaterMode, setTheaterMode]   = useState(false);
  const [showDesc,   setShowDesc]   = useState(false);
  const [donating,   setDonating]   = useState(false);
  const [donateAmt,  setDonateAmt]  = useState("2000");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const v = videoRef.current;
    if (v && settings.autoplay) v.play().then(() => setPlaying(true)).catch(() => {});
    return () => { document.body.style.overflow = ""; };
  }, [settings.autoplay]);

  /* Fullscreen API */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { try { await el.requestFullscreen(); } catch{} }
    else { try { await document.exitFullscreen(); } catch{} }
  }, []);

  /* PiP */
  const togglePiP = useCallback(async () => {
    const v = videoRef.current; if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* silent */ }
  }, []);

  const resetCtrl = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  useEffect(() => {
    resetCtrl();
    return () => { if (ctrlTimer.current) clearTimeout(ctrlTimer.current); };
  }, [resetCtrl]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else          { v.pause(); setPlaying(false); }
    resetCtrl();
  }, [resetCtrl]);

  const seek = useCallback((delta:number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration||0, v.currentTime+delta));
    if (delta < 0) { setSeekLeft(true);  setTimeout(()=>setSeekLeft(false),650); }
    else           { setSeekRight(true); setTimeout(()=>setSeekRight(false),650); }
    resetCtrl();
  }, [resetCtrl]);

  const handleVideoTap = useCallback((e:React.MouseEvent<HTMLDivElement>) => {
    if (showSpeed || showComments) return;
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const side: "left"|"right" = e.clientX - rect.left < rect.width/2 ? "left" : "right";
    if (now - lastTap.current < 320) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current=null; }
      seek(side==="right" ? 10 : -10);
      lastTap.current = 0; return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => { togglePlay(); lastTap.current=0; }, 330);
  }, [seek, togglePlay, showSpeed, showComments]);

  /* long-press = 2× speed */
  const startHold = useCallback(() => {
    longHold.current = setTimeout(() => {
      const v = videoRef.current; if (v) v.playbackRate = 2;
      setFastFwd(true);
    }, 500);
  }, []);
  const endHold = useCallback(() => {
    if (longHold.current) clearTimeout(longHold.current);
    const v = videoRef.current; if (v) v.playbackRate = speed;
    setFastFwd(false);
  }, [speed]);

  const handleScrub = useCallback((val:number) => {
    const v = videoRef.current;
    if (v && isFinite(v.duration)) {
      v.currentTime = val * v.duration;
      setProgress(val); setCurTime(v.currentTime);
    }
    resetCtrl();
  }, [resetCtrl]);

  const applySpeed = useCallback((s:number) => {
    const v = videoRef.current; if (v) v.playbackRate = s;
    setSpeed(s);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title:video.caption||"OTube", url:window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* silent */ }
    setShared(true); setTimeout(()=>setShared(false),2000);
  }, [video.caption]);

  const videoArea = theaterMode
    ? { width:"100%", height:"auto", aspectRatio:"16/9" }
    : { width:"100%", height:"100%" };

  return (
    <motion.div ref={containerRef}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.18 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: settings.cinemaMode ? "#000" : "#020107" }}
      onMouseMove={resetCtrl} onTouchMove={resetCtrl}
    >
      {/* ── Video area ── */}
      <div
        className="relative flex-1 flex items-center justify-center select-none overflow-hidden"
        style={theaterMode ? { flex:"none" } : { flex:1 }}
        onClick={handleVideoTap}
        onTouchStart={startHold} onTouchEnd={endHold}
        onMouseDown={startHold} onMouseUp={endHold}
      >
        <video
          ref={videoRef}
          src={video.videoUrl ?? undefined}
          poster={video.thumbnailUrl ?? undefined}
          muted={muted}
          playsInline
          loop={settings.loop}
          style={{ objectFit:"contain", ...videoArea }}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (v && isFinite(v.duration) && v.duration > 0) {
              setCurTime(v.currentTime); setProgress(v.currentTime / v.duration);
            }
          }}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration??0)}
          onEnded={() => setPlaying(false)}
        />
        <SeekFlash side="left"  visible={seekLeft}  />
        <SeekFlash side="right" visible={seekRight} />

        {/* 2× badge */}
        <AnimatePresence>
          {fastFwd && (
            <motion.div initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ padding:"8px 20px",borderRadius:12,
                background:"rgba(0,0,0,0.65)",backdropFilter:"blur(12px)",
                border:"1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize:18,fontWeight:900,color:"#fbbf24" }}>2× TEZLIK</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speed menu */}
        <AnimatePresence>
          {showSpeed && <SpeedMenu speed={speed} onSpeed={applySpeed} onClose={()=>setShowSpeed(false)}/>}
        </AnimatePresence>

        {/* Comments panel */}
        <AnimatePresence>
          {showComments && <CommentsPanel onClose={()=>setShowComments(false)}/>}
        </AnimatePresence>

        {/* Controls overlay */}
        <AnimatePresence>
          {showCtrl && (
            <motion.div key="ctrls"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              transition={{duration:0.18}}
              className="absolute inset-0 pointer-events-none"
            >
              {/* ── TOP ── */}
              <div className="absolute top-0 inset-x-0 pointer-events-auto"
                style={{ background:"linear-gradient(to bottom,rgba(0,0,0,0.82),transparent)",
                  padding:"14px 12px 36px" }}>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{scale:0.84}} onClick={onClose}
                    style={{ width:40,height:40,borderRadius:"50%",
                      background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",
                      border:"1px solid rgba(255,255,255,0.12)",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <ArrowLeft className="w-5 h-5 text-white"/>
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    {settings.showTitle && <>
                      <p className="text-white font-black text-[13px] truncate">{video.caption||"OTube Video"}</p>
                      <p className="text-white/38 text-[10px] truncate mt-0.5">
                        {video.author.displayName} · {fmt(video.viewsCount)} ko'rish
                      </p>
                    </>}
                  </div>

                  {/* Subscribe */}
                  <motion.button whileTap={{scale:0.88}}
                    onClick={()=>setSubscribed(s=>!s)}
                    style={{ padding:"5px 10px",borderRadius:10,flexShrink:0,
                      background: subscribed ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.85)",
                      border: subscribed ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(239,68,68,0.5)",
                      boxShadow: subscribed ? "none" : "0 0 18px rgba(239,68,68,0.4)" }}>
                    <span style={{ fontSize:10,fontWeight:900,
                      color: subscribed ? "rgba(255,255,255,0.6)" : "white" }}>
                      {subscribed ? "✓ Obuna" : "+ Obuna"}
                    </span>
                  </motion.button>

                  {/* Theater mode */}
                  <motion.button whileTap={{scale:0.82}}
                    onClick={()=>setTheaterMode(t=>!t)}
                    style={{ width:38,height:38,borderRadius:"50%",flexShrink:0,
                      background: theaterMode ? "rgba(239,68,68,0.18)" : "rgba(0,0,0,0.5)",
                      backdropFilter:"blur(12px)",
                      border: theaterMode ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {theaterMode
                      ? <Minimize2 className="w-4 h-4 text-red-400"/>
                      : <Maximize2 className="w-4 h-4 text-white/70"/>}
                  </motion.button>
                </div>
              </div>

              {/* ── CENTER: paused ── */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatePresence>
                  {!playing && (
                    <motion.div key="ppause"
                      initial={{opacity:0,scale:0.55}} animate={{opacity:1,scale:1}}
                      exit={{opacity:0,scale:1.4}} transition={{duration:0.14}}
                      style={{ width:76,height:76,borderRadius:"50%",
                        background:"rgba(0,0,0,0.5)",backdropFilter:"blur(18px)",
                        border:"1.5px solid rgba(255,255,255,0.18)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow:"0 0 40px rgba(239,68,68,0.35)" }}>
                      <Play style={{ width:28,height:28,fill:"white",color:"white",marginLeft:4 }}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── RIGHT SIDEBAR: action buttons ── */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col gap-2.5">
                {/* Like */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();setLiked(l=>!l);if(disliked)setDisliked(false);}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background: liked ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.45)",
                    backdropFilter:"blur(10px)",
                    border: liked ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ThumbsUp style={{ width:16,height:16,
                      fill:liked?"#f87171":"none", color:liked?"#f87171":"rgba(255,255,255,0.75)" }}/>
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.4)",fontWeight:700 }}>
                    {fmt(video.likesCount+(liked?1:0))}
                  </span>
                </motion.button>

                {/* Dislike */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();setDisliked(d=>!d);if(liked)setLiked(false);}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background: disliked ? "rgba(239,68,68,0.12)" : "rgba(0,0,0,0.45)",
                    backdropFilter:"blur(10px)",
                    border: disliked ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ThumbsDown style={{ width:16,height:16,
                      fill:disliked?"#f87171":"none", color:disliked?"#f87171":"rgba(255,255,255,0.5)" }}/>
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:700 }}>Ko'rmadim</span>
                </motion.button>

                {/* Share */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();void handleShare();}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background: shared ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.45)",
                    backdropFilter:"blur(10px)",
                    border: shared ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {shared ? <Check className="w-4 h-4 text-emerald-400"/>
                             : <Share2 className="w-4 h-4 text-white/75"/>}
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.35)",fontWeight:700 }}>Ulashish</span>
                </motion.button>

                {/* Save */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();setSaved(s=>!s);}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background: saved ? "rgba(168,85,247,0.22)" : "rgba(0,0,0,0.45)",
                    backdropFilter:"blur(10px)",
                    border: saved ? "1px solid rgba(168,85,247,0.45)" : "1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Bookmark style={{ width:16,height:16,
                      fill:saved?"#c084fc":"none", color:saved?"#c084fc":"rgba(255,255,255,0.65)" }}/>
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.35)",fontWeight:700 }}>Saqlash</span>
                </motion.button>

                {/* Comments */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();setShowComments(c=>!c);}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background:"rgba(0,0,0,0.45)",backdropFilter:"blur(10px)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <MessageCircle className="w-4 h-4 text-white/65"/>
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.35)",fontWeight:700 }}>Izohlar</span>
                </motion.button>

                {/* Donate */}
                <motion.button whileTap={{scale:0.75}}
                  onClick={e=>{e.stopPropagation();setDonating(d=>!d);}}
                  className="flex flex-col items-center gap-0.5">
                  <div style={{ width:40,height:40,borderRadius:"50%",
                    background: donating ? "rgba(245,158,11,0.22)" : "rgba(0,0,0,0.45)",
                    backdropFilter:"blur(10px)",
                    border: donating ? "1px solid rgba(245,158,11,0.45)" : "1px solid rgba(255,255,255,0.1)",
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Star style={{ width:16,height:16,
                      fill:donating?"#fbbf24":"none", color:donating?"#fbbf24":"rgba(255,255,255,0.55)" }}/>
                  </div>
                  <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.35)",fontWeight:700 }}>Yordam</span>
                </motion.button>
              </div>

              {/* ── BOTTOM ── */}
              <div className="absolute bottom-0 inset-x-0 pointer-events-auto"
                style={{ background:"linear-gradient(to top,rgba(0,0,0,0.92),transparent)",
                  padding:"38px 12px 18px" }}>

                {/* Donation panel */}
                <AnimatePresence>
                  {donating && (
                    <motion.div
                      initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}
                      className="mb-3 p-3 rounded-[14px]"
                      onClick={e=>e.stopPropagation()}
                      style={{ background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.25)" }}>
                      <p style={{ fontSize:11,fontWeight:800,color:"#fbbf24",marginBottom:8 }}>
                        🌟 Super Thanks — {video.author.displayName}ga yordam bering
                      </p>
                      <div className="flex gap-2 mb-2">
                        {["500","2000","10000","50000"].map(a => (
                          <motion.button key={a} whileTap={{scale:0.88}}
                            onClick={()=>setDonateAmt(a)}
                            style={{ flex:1,padding:"5px 0",borderRadius:8,textAlign:"center",
                              background: donateAmt===a ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.06)",
                              border: donateAmt===a ? "1px solid rgba(245,158,11,0.6)" : "1px solid rgba(255,255,255,0.08)" }}>
                            <span style={{ fontSize:10,fontWeight:900,color:donateAmt===a?"#fbbf24":"rgba(255,255,255,0.45)" }}>
                              {Number(a)>=1000?`${Number(a)/1000}K`:a}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                      <motion.button whileTap={{scale:0.95}}
                        onClick={()=>setDonating(false)}
                        className="w-full py-2 rounded-[10px] flex items-center justify-center gap-2"
                        style={{ background:"linear-gradient(90deg,#f59e0b,#d97706)",
                          boxShadow:"0 0 18px rgba(245,158,11,0.35)" }}>
                        <Star className="w-3.5 h-3.5 text-white" style={{ fill:"white" }}/>
                        <span style={{ fontSize:12,fontWeight:900,color:"white" }}>
                          {donateAmt} so'm jo'natish
                        </span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description toggle */}
                <button
                  onClick={e=>{e.stopPropagation();setShowDesc(d=>!d);}}
                  className="w-full flex items-center justify-between mb-2.5"
                  style={{ background:"rgba(255,255,255,0.04)",borderRadius:10,
                    padding:"6px 10px",border:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700 }}>
                    Tavsif ko'rsatish
                  </span>
                  {showDesc
                    ? <ChevronDown className="w-3.5 h-3.5 text-white/35"/>
                    : <ChevronUp   className="w-3.5 h-3.5 text-white/35"/>}
                </button>
                <AnimatePresence>
                  {showDesc && (
                    <motion.div
                      initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                      exit={{height:0,opacity:0}}
                      className="overflow-hidden mb-2"
                      onClick={e=>e.stopPropagation()}>
                      <p style={{ fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.6,
                        padding:"6px 10px",background:"rgba(255,255,255,0.03)",
                        borderRadius:10,marginBottom:6 }}>
                        {video.caption || "OTube video platformasida joylashtirilgan kontent."}
                        {" "}Ko'rsatkichlar: {fmt(video.viewsCount)} ko'rish, {fmt(video.likesCount)} like.
                        {" "}Muallif: @{video.author.username}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quality badge + speed */}
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.08em",
                    color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.06)",
                    padding:"2px 8px",borderRadius:4,border:"1px solid rgba(255,255,255,0.08)" }}>
                    {settings.quality}
                  </span>
                  <span style={{ fontSize:9,fontWeight:800,
                    color: speed!==1 ? "#fbbf24" : "rgba(255,255,255,0.3)",
                    background: speed!==1 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                    padding:"2px 8px",borderRadius:4,border: speed!==1 ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.07)" }}>
                    {speed}× tezlik
                  </span>
                </div>

                {/* Scrubber */}
                <div className="relative flex items-center h-5 mb-2.5" onClick={e=>e.stopPropagation()}>
                  <div className="absolute inset-x-0 h-[3px] rounded-full"
                    style={{ background:"rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full"
                      style={{ width:`${progress*100}%`,
                        background:"linear-gradient(90deg,#ef4444,#a855f7)" }}/>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left:`calc(${progress*100}% - 7px)`,
                      width:14,height:14,borderRadius:"50%",background:"white",
                      boxShadow:"0 0 10px #ef4444aa, 0 2px 6px rgba(0,0,0,0.6)" }}/>
                  <input type="range" min={0} max={1} step={0.001} value={progress}
                    onChange={e=>handleScrub(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    onClick={e=>e.stopPropagation()}/>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                  {/* Play/Pause */}
                  <motion.button whileTap={{scale:0.8}}
                    onClick={togglePlay}
                    style={{ width:46,height:46,borderRadius:"50%",flexShrink:0,
                      background:"linear-gradient(135deg,#ef4444cc,#dc2626cc)",
                      boxShadow:"0 0 22px #ef444455",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {playing
                      ? <Pause style={{ width:18,height:18,fill:"white",color:"white" }}/>
                      : <Play  style={{ width:18,height:18,fill:"white",color:"white",marginLeft:2 }}/>}
                  </motion.button>

                  {/* Restart */}
                  <motion.button whileTap={{scale:0.8}}
                    onClick={()=>{const v=videoRef.current;if(v){v.currentTime=0;setProgress(0);setCurTime(0);}}}
                    style={{ width:36,height:36,borderRadius:"50%",
                      background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <RotateCcw className="w-3.5 h-3.5 text-white/55"/>
                  </motion.button>

                  {/* Time */}
                  <span className="text-white/45 text-[10px] font-mono tabular-nums flex-shrink-0">
                    {fmtTime(curTime)} / {fmtTime(duration)}
                  </span>

                  <div className="flex-1"/>

                  {/* Speed selector */}
                  <motion.button whileTap={{scale:0.8}}
                    onClick={()=>setShowSpeed(s=>!s)}
                    style={{ width:36,height:36,borderRadius:"50%",
                      background: showSpeed ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.06)",
                      border: showSpeed ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.09)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Gauge className="w-3.5 h-3.5"
                      style={{ color: showSpeed ? "#fbbf24" : "rgba(255,255,255,0.5)" }}/>
                  </motion.button>

                  {/* Volume */}
                  <motion.button whileTap={{scale:0.8}}
                    onClick={()=>setMuted(m=>!m)}
                    style={{ width:36,height:36,borderRadius:"50%",
                      background: muted ? "rgba(255,255,255,0.06)" : "rgba(239,68,68,0.15)",
                      border: muted ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(239,68,68,0.35)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {muted
                      ? <VolumeX className="w-4 h-4 text-white/35"/>
                      : <Volume2 className="w-4 h-4 text-red-400"/>}
                  </motion.button>

                  {/* Fullscreen */}
                  <motion.button whileTap={{scale:0.8}}
                    onClick={toggleFullscreen}
                    style={{ width:36,height:36,borderRadius:"50%",
                      background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {isFullscreen
                      ? <Minimize2 className="w-3.5 h-3.5 text-white/55"/>
                      : <Maximize2 className="w-3.5 h-3.5 text-white/55"/>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Settings + Monetization drawer                          */
/* ─────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children:React.ReactNode }) {
  return (
    <p style={{ fontSize:10,fontWeight:900,letterSpacing:"0.1em",
      color:"rgba(239,68,68,0.65)",textTransform:"uppercase",marginBottom:6 }}>
      {children}
    </p>
  );
}
function ToggleRow({
  icon, label, sub, value, onChange,
}: { icon:string; label:string; sub:string; value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-[14px]"
      style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize:18,flexShrink:0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.88)",lineHeight:1 }}>{label}</p>
        <p style={{ fontSize:10,color:"rgba(255,255,255,0.32)",marginTop:2 }}>{sub}</p>
      </div>
      <motion.button whileTap={{scale:0.88}} onClick={()=>onChange(!value)}
        style={{ position:"relative",width:44,height:24,borderRadius:12,flexShrink:0,
          background: value ? "linear-gradient(90deg,#ef4444,#dc2626)" : "rgba(255,255,255,0.1)",
          border: value ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.1)",
          boxShadow: value ? "0 0 12px rgba(239,68,68,0.3)" : "none", transition:"all 0.2s" }}>
        <motion.div animate={{ x: value ? 21 : 2 }}
          transition={{ type:"spring",damping:18,stiffness:280 }}
          style={{ position:"absolute",top:2,width:19,height:19,borderRadius:"50%",
            background:"white",boxShadow:"0 2px 4px rgba(0,0,0,0.3)" }}/>
      </motion.button>
    </div>
  );
}

function SettingsDrawer({
  open, onClose, settings, onSettings, monetize, onMonetize,
}: {
  open:boolean; onClose:()=>void;
  settings:PlayerSettings; onSettings:(s:PlayerSettings)=>void;
  monetize:MonetizationSettings; onMonetize:(m:MonetizationSettings)=>void;
}) {
  const [tab, setTab] = useState<"player"|"monetize">("player");
  const setP = <K extends keyof PlayerSettings>(k:K, v:PlayerSettings[K]) =>
    onSettings({ ...settings, [k]:v });
  const setM = <K extends keyof MonetizationSettings>(k:K, v:MonetizationSettings[K]) =>
    onMonetize({ ...monetize, [k]:v });

  /* mock revenue numbers */
  const views = 12480;
  const revenue = monetize.creatorMode
    ? (views * (monetize.adsEnabled ? 0.0018 : 0) + (monetize.membershipEnabled ? 18500 : 0)).toFixed(0)
    : "0";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="sd-b"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[8998]"
            style={{ background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)" }}
            onClick={onClose}/>
          <motion.div key="sd-d"
            initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
            transition={{ type:"spring",damping:28,stiffness:320 }}
            className="fixed bottom-0 left-0 right-0 z-[8999] rounded-t-[26px] overflow-hidden"
            style={{ background:"linear-gradient(180deg,#0e0318 0%,#080211 100%)",
              border:"1px solid rgba(239,68,68,0.15)",
              boxShadow:"0 -24px 80px rgba(239,68,68,0.08), 0 -3px 0 rgba(239,68,68,0.18)",
              maxHeight:"86vh" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width:38,height:4,borderRadius:2,background:"rgba(255,255,255,0.12)" }}/>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <OTubeMark size={28}/>
                <span className="text-white font-black text-[15px]">OTube Sozlamalar</span>
              </div>
              <motion.button whileTap={{scale:0.85}} onClick={onClose}
                style={{ width:32,height:32,borderRadius:"50%",
                  background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                <X className="w-4 h-4 text-white/60"/>
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-5 pt-3 pb-0"
              style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              {([
                { id:"player",   label:"🎬 O'ynatuvchi", Icon:Settings },
                { id:"monetize", label:"💰 Monetizatsiya", Icon:DollarSign },
              ] as const).map(({ id, label }) => (
                <button key={id} onClick={()=>setTab(id)}
                  className="flex-1 pb-3 text-center relative"
                  style={{ fontSize:12,fontWeight:tab===id?900:600,
                    color:tab===id?"white":"rgba(255,255,255,0.38)" }}>
                  {label}
                  {tab===id && (
                    <motion.div layoutId="tab-indicator"
                      className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                      style={{ background:"linear-gradient(90deg,#ef4444,#a855f7)" }}/>
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto space-y-1.5" style={{ maxHeight:"62vh" }}>
              {tab === "player" ? (
                <>
                  <SectionLabel>Ijro sozlamalari</SectionLabel>
                  <ToggleRow icon="▶" label="Avtoijro" sub="Keyingi videoni avtomatik boshlash"
                    value={settings.autoplay} onChange={v=>setP("autoplay",v)}/>
                  <ToggleRow icon="🔁" label="Takrorlash" sub="Videoni loop qilish"
                    value={settings.loop} onChange={v=>setP("loop",v)}/>
                  <ToggleRow icon="🔇" label="Sukut ovoz" sub="Videolar shovqinsiz ochilsin"
                    value={settings.muteDefault} onChange={v=>setP("muteDefault",v)}/>
                  <ToggleRow icon="📶" label="HD oqim" sub="Yuqori sifat (ko'proq internet)"
                    value={settings.hdStream} onChange={v=>setP("hdStream",v)}/>
                  <ToggleRow icon="⚠️" label="Ma'lumot ogohlanishi" sub="Ko'p internet sarflanganda ogohlantir"
                    value={settings.dataWarning} onChange={v=>setP("dataWarning",v)}/>

                  <div className="h-2"/>
                  <SectionLabel>Ko'rish sozlamalari</SectionLabel>
                  <ToggleRow icon="🎬" label="Kino rejimi" sub="O'ynatuvchi foni qora bo'ladi"
                    value={settings.cinemaMode} onChange={v=>setP("cinemaMode",v)}/>
                  <ToggleRow icon="📝" label="Sarlavha ko'rsatish" sub="O'ynatuvchida nom ko'rinsin"
                    value={settings.showTitle} onChange={v=>setP("showTitle",v)}/>

                  <div className="h-2"/>
                  <SectionLabel>Video sifati</SectionLabel>
                  <div className="grid grid-cols-5 gap-1.5 mt-1">
                    {(["Auto","1080p","720p","480p","360p"] as const).map(q => (
                      <motion.button key={q} whileTap={{scale:0.88}}
                        onClick={()=>setP("quality",q)}
                        style={{ padding:"8px 4px",borderRadius:10,textAlign:"center",
                          background: settings.quality===q
                            ? "linear-gradient(135deg,rgba(239,68,68,0.3),rgba(168,85,247,0.2))"
                            : "rgba(255,255,255,0.04)",
                          border: settings.quality===q
                            ? "1px solid rgba(239,68,68,0.55)"
                            : "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ fontSize:11,fontWeight:settings.quality===q?900:600,
                          color:settings.quality===q?"#fca5a5":"rgba(255,255,255,0.38)" }}>
                          {q}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Creator stats */}
                  <div className="rounded-[18px] p-4 mb-3"
                    style={{ background:"linear-gradient(135deg,rgba(239,68,68,0.12),rgba(168,85,247,0.08))",
                      border:"1px solid rgba(239,68,68,0.2)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <BadgeDollarSign className="w-4 h-4 text-red-400"/>
                      <span style={{ fontSize:13,fontWeight:900,color:"white" }}>Kreator daromadi</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label:"Ko'rishlar", value:fmt(views), icon:"👁" },
                        { label:"Daromad", value:`${Number(revenue).toLocaleString()} so'm`, icon:"💰" },
                        { label:"Obunachi", value:"1.2K", icon:"👥" },
                      ].map(s => (
                        <div key={s.label} className="rounded-[12px] p-2.5 text-center"
                          style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ fontSize:16,marginBottom:2 }}>{s.icon}</div>
                          <div style={{ fontSize:12,fontWeight:900,color:"white" }}>{s.value}</div>
                          <div style={{ fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:1 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SectionLabel>Kreator rejimi</SectionLabel>
                  <ToggleRow icon="🎥" label="Kreator rejimi" sub="Daromad va tahlillarni ko'rish imkonini beradi"
                    value={monetize.creatorMode} onChange={v=>setM("creatorMode",v)}/>

                  <div className="h-2"/>
                  <SectionLabel>Daromad manbalari</SectionLabel>
                  <ToggleRow icon="📢" label="Reklama daromadi" sub="Videolarda reklama ko'rsatish (CPM: 1.8 so'm/ko'rish)"
                    value={monetize.adsEnabled} onChange={v=>setM("adsEnabled",v)}/>
                  <ToggleRow icon="⭐" label="Super Thanks" sub="Tomoshabinlar yordam pul jo'natishi"
                    value={monetize.superThanks} onChange={v=>setM("superThanks",v)}/>
                  <ToggleRow icon="👑" label="A'zolik (Membership)" sub="Oylik to'lov bilan eksklyuziv kontent"
                    value={monetize.membershipEnabled} onChange={v=>setM("membershipEnabled",v)}/>

                  {/* Donation tiers */}
                  <div className="h-2"/>
                  <SectionLabel>Minimal yordam miqdori</SectionLabel>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(["500","2000","10000","50000"] as const).map(d => (
                      <motion.button key={d} whileTap={{scale:0.92}}
                        onClick={()=>setM("donation",d)}
                        className="py-2 px-3 rounded-[12px] flex items-center justify-between"
                        style={{ background: monetize.donation===d
                            ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.04)",
                          border: monetize.donation===d
                            ? "1px solid rgba(245,158,11,0.45)" : "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ fontSize:13,fontWeight:900,
                          color: monetize.donation===d ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>
                          {Number(d)>=1000?`${Number(d)/1000}K`:d} so'm
                        </span>
                        {monetize.donation===d && <Check className="w-3.5 h-3.5 text-amber-400"/>}
                      </motion.button>
                    ))}
                  </div>

                  {/* Membership tiers */}
                  {monetize.membershipEnabled && (
                    <>
                      <div className="h-2"/>
                      <SectionLabel>A'zolik darajalari</SectionLabel>
                      {[
                        { name:"Bronza", price:"9 900", color:"#cd7f32", perks:"Maxsus badge" },
                        { name:"Kumush", price:"29 900", color:"#c0c0c0", perks:"Badge + imtiyozlar" },
                        { name:"Oltin",  price:"99 900", color:"#ffd700", perks:"To'liq eksklyuziv" },
                      ].map(tier => (
                        <div key={tier.name} className="flex items-center gap-3 py-2.5 px-3 rounded-[14px]"
                          style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ width:32,height:32,borderRadius:"50%",flexShrink:0,
                            background:`${tier.color}22`,border:`1.5px solid ${tier.color}55`,
                            display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <Star style={{ width:14,height:14,fill:tier.color,color:tier.color }}/>
                          </div>
                          <div className="flex-1">
                            <p style={{ fontSize:12,fontWeight:800,color:"rgba(255,255,255,0.85)" }}>{tier.name}</p>
                            <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>{tier.perks}</p>
                          </div>
                          <span style={{ fontSize:11,fontWeight:900,color:tier.color }}>{tier.price} so'm/oy</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Payout */}
                  <div className="mt-3 rounded-[14px] p-3.5"
                    style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.12)" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-red-400"/>
                      <span style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.7)" }}>
                        To'lovlarni olish
                      </span>
                    </div>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",lineHeight:1.6 }}>
                      Minimal to'lov: 100 000 so'm. OlCha Pay orqali avtomatik hisobingizga o'tkaziladi.
                      To'lovlar har oyning 15-sanasida amalga oshiriladi.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────── */
/* HeroCard — expand button tepada                         */
/* ─────────────────────────────────────────────────────── */
function HeroCard({ video, onPlay }: { video:Reel; onPlay:()=>void }) {
  const [expanded, setExpanded] = useState(false);
  const y = useMotionValue(0);
  const scale = useTransform(y, [-40,0,40], [0.97,1,0.97]);

  return (
    <motion.div style={{ scale }}
      className="relative rounded-[22px] overflow-hidden cursor-pointer"
      whileTap={{ scale:0.98 }} onClick={onPlay}
      initial={{ opacity:0,y:18 }} animate={{ opacity:1,y:0 }}
      transition={{ type:"spring",damping:22 }}
    >
      {/* Expand/shrink button — TOP RIGHT */}
      <motion.button
        whileTap={{ scale:0.82 }}
        onClick={e => { e.stopPropagation(); setExpanded(x=>!x); }}
        className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center"
        style={{ width:34,height:34,borderRadius:"50%",
          background:"rgba(0,0,0,0.55)",backdropFilter:"blur(10px)",
          border:"1px solid rgba(255,255,255,0.15)" }}>
        {expanded
          ? <Minimize2 className="w-3.5 h-3.5 text-white"/>
          : <Maximize2 className="w-3.5 h-3.5 text-white"/>}
      </motion.button>

      <div style={{ aspectRatio: expanded ? "4/3" : "21/9", position:"relative", transition:"all 0.3s" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.caption}
              className="w-full h-full object-cover" style={{ transition:"all 0.3s" }}/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#2d0a0a,#0d040d)" }}>
              <Film className="w-14 h-14 text-white/10"/>
            </div>}
        {/* Scan-line */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)" }}/>
        {/* Gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.1) 55%,transparent 100%)" }}/>
        {/* Play ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
            style={{ width:66,height:66,borderRadius:"50%",
              background:"rgba(239,68,68,0.82)",
              boxShadow:"0 0 0 12px rgba(239,68,68,0.14), 0 0 0 24px rgba(239,68,68,0.05)",
              display:"flex",alignItems:"center",justifyContent:"center",
              backdropFilter:"blur(8px)",border:"1.5px solid rgba(255,255,255,0.25)" }}>
            <Play style={{ width:26,height:26,fill:"white",color:"white",marginLeft:3 }}/>
          </motion.div>
        </div>
        {/* TANLANGAN badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background:"rgba(0,0,0,0.62)",backdropFilter:"blur(10px)",
            border:"1px solid rgba(239,68,68,0.4)" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",
            boxShadow:"0 0 6px #ef4444" }}/>
          <span style={{ fontSize:9,fontWeight:900,color:"#fca5a5",letterSpacing:"0.12em" }}>TANLANGAN</span>
        </div>
      </div>
      {/* Info */}
      <div className="absolute bottom-0 inset-x-0 p-4">
        <h2 className="text-white font-black text-[15px] leading-tight mb-2 line-clamp-2"
          style={{ textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>
          {video.caption||"OTube Tanlangan"}
        </h2>
        <div className="flex items-center gap-2">
          {video.author.avatarUrl && (
            <img src={video.author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              style={{ border:"1px solid rgba(239,68,68,0.4)" }}/>)}
          <span className="text-white/55 text-[11px] flex-1 truncate">{video.author.displayName}</span>
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
      <div className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background:"linear-gradient(90deg,#ef4444,#a855f7,transparent)" }}/>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* TrendCard                                               */
/* ─────────────────────────────────────────────────────── */
function TrendCard({ video, onPlay, idx }: { video:Reel; onPlay:()=>void; idx:number }) {
  const ACCENTS = ["#ef4444","#f59e0b","#06b6d4","#a855f7","#10b981","#f59e0b"];
  const accent = ACCENTS[idx % ACCENTS.length];
  return (
    <motion.div
      initial={{ opacity:0,x:28 }} animate={{ opacity:1,x:0 }}
      transition={{ delay:idx*0.06,type:"spring",damping:22 }}
      className="flex-shrink-0 rounded-[16px] overflow-hidden cursor-pointer relative"
      style={{ width:150,background:"#0a0214",
        border:`1px solid ${accent}22`,
        boxShadow:`0 4px 24px rgba(0,0,0,0.55), 0 0 0 0.5px ${accent}12` }}
      whileTap={{ scale:0.94 }} onClick={onPlay}
    >
      <div style={{ aspectRatio:"16/9",position:"relative" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background:`linear-gradient(135deg,${accent}14,#07030f)` }}>
              <Film className="w-6 h-6 text-white/10"/>
            </div>}
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width:28,height:28,borderRadius:"50%",
            background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",
            border:"1px solid rgba(255,255,255,0.14)",
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Play style={{ width:10,height:10,fill:"white",color:"white",marginLeft:1.5 }}/>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:"linear-gradient(to top,rgba(0,0,0,0.72),transparent 48%)" }}/>
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md"
          style={{ background:`${accent}cc`,fontSize:9,fontWeight:900,color:"white" }}>
          #{idx+1}
        </div>
      </div>
      <div className="p-2">
        <p className="text-white text-[10px] font-bold line-clamp-2 leading-snug">{video.caption||"Video"}</p>
        <div className="flex items-center gap-1 mt-1">
          <Eye style={{ width:9,height:9,color:"rgba(255,255,255,0.28)" }}/>
          <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.28)",fontWeight:600 }}>{fmt(video.viewsCount)}</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px]"
        style={{ background:`linear-gradient(90deg,${accent}80,transparent)` }}/>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* GridCard — expand button tepada                         */
/* ─────────────────────────────────────────────────────── */
function GridCard({ video, onPlay, idx }: { video:Reel; onPlay:()=>void; idx:number }) {
  const [liked,    setLiked]    = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }}
      transition={{ delay:idx*0.04,type:"spring",damping:20 }}
      className="rounded-[14px] overflow-hidden cursor-pointer relative"
      style={{ background:"#080218",border:"1px solid rgba(255,255,255,0.06)",
        boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}
      whileTap={{ scale:0.96 }} onClick={onPlay}
    >
      {/* Expand/shrink button */}
      <motion.button
        whileTap={{ scale:0.8 }}
        onClick={e=>{e.stopPropagation();setExpanded(x=>!x);}}
        className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center"
        style={{ width:26,height:26,borderRadius:"50%",
          background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,0.12)" }}>
        {expanded
          ? <Minimize2 style={{ width:10,height:10,color:"white" }}/>
          : <Maximize2 style={{ width:10,height:10,color:"white" }}/>}
      </motion.button>

      <div style={{ aspectRatio: expanded?"4/3":"16/9",position:"relative",transition:"all 0.3s" }}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#1a0a0a,#0a0d28)" }}>
              <Film className="w-7 h-7 text-white/10"/>
            </div>}
        <div className="absolute bottom-1 right-1 flex items-center justify-center"
          style={{ width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)" }}>
          <Play style={{ width:9,height:9,fill:"rgba(255,255,255,0.7)",color:"rgba(255,255,255,0.7)",marginLeft:1 }}/>
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:"linear-gradient(to top,rgba(0,0,0,0.62) 0%,transparent 42%)" }}/>
      </div>
      <div className="p-2.5">
        <p className="text-white font-bold text-[11px] line-clamp-2 leading-snug mb-1.5">
          {video.caption||"Video"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/35 text-[9.5px] truncate max-w-[72px]">{video.author.displayName}</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Eye style={{ width:8.5,height:8.5,color:"rgba(255,255,255,0.25)" }}/>
              <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:700 }}>{fmt(video.viewsCount)}</span>
            </div>
            <motion.button whileTap={{scale:0.65}}
              onClick={e=>{e.stopPropagation();setLiked(l=>!l);}}
              className="flex items-center gap-0.5">
              <Heart style={{ width:8.5,height:8.5,
                fill:liked?"#f87171":"none", color:liked?"#f87171":"rgba(255,255,255,0.25)" }}/>
              <span style={{ fontSize:8.5,fontWeight:700,
                color:liked?"#fca5a5":"rgba(255,255,255,0.25)" }}>
                {fmt(video.likesCount+(liked?1:0))}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* ShortsCard                                              */
/* ─────────────────────────────────────────────────────── */
function ShortsCard({ video, onPlay }: { video:Reel; onPlay:()=>void }) {
  return (
    <motion.div whileTap={{ scale:0.93 }} onClick={onPlay}
      className="flex-shrink-0 rounded-[16px] overflow-hidden cursor-pointer relative"
      style={{ width:110,aspectRatio:"9/16",background:"#080218",
        border:"1px solid rgba(239,68,68,0.12)" }}>
      {video.thumbnailUrl
        ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full flex items-center justify-center"
            style={{ background:"linear-gradient(180deg,#2d0a0a,#0a0218)" }}>
            <Zap className="w-8 h-8 text-white/10"/>
          </div>}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 55%)" }}/>
      <div className="absolute top-2 left-2">
        <div className="px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background:"rgba(239,68,68,0.75)",backdropFilter:"blur(6px)" }}>
          <Zap style={{ width:8,height:8,fill:"white",color:"white" }}/>
          <span style={{ fontSize:8,fontWeight:900,color:"white" }}>SHORT</span>
        </div>
      </div>
      <div className="absolute bottom-2 inset-x-2">
        <p className="text-white font-bold text-[9.5px] line-clamp-2 leading-snug">{video.caption||"Short"}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Eye style={{ width:7,height:7,color:"rgba(255,255,255,0.4)" }}/>
          <span style={{ fontSize:7.5,color:"rgba(255,255,255,0.4)",fontWeight:600 }}>{fmt(video.viewsCount)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* OTubePage — main                                        */
/* ─────────────────────────────────────────────────────── */
export default function OTubePage() {
  const [, navigate]        = useLocation();
  const [cat, setCat]       = useState("all");
  const [query, setQuery]   = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected]     = useState<Reel|null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings]     = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [monetize, setMonetize]     = useState<MonetizationSettings>(DEFAULT_MONETIZE);
  const [tab, setTab]       = useState<"home"|"shorts"|"subs">("home");
  const [notifDot, setNotifDot] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: raw = [], isLoading } = useListReels();

  const reels = useMemo(() => {
    if (!query.trim()) return raw;
    const q = query.toLowerCase();
    return raw.filter(r =>
      r.caption.toLowerCase().includes(q) ||
      r.author.displayName.toLowerCase().includes(q)
    );
  }, [raw, query]);

  /* swipe right → /reels */
  const tx = useRef(0); const ty = useRef(0);
  const onTS = useCallback((e:React.TouchEvent) => {
    tx.current = e.touches[0].clientX; ty.current = e.touches[0].clientY;
  }, []);
  const onTE = useCallback((e:React.TouchEvent) => {
    const dx = tx.current - e.changedTouches[0].clientX;
    const dy = ty.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && dx < -70) navigate("/reels");
  }, [navigate]);

  useEffect(() => {
    if (showSearch) setTimeout(()=>searchRef.current?.focus(), 120);
  }, [showSearch]);

  const featured  = reels[0] ?? null;
  const trending  = reels.slice(1, 8);
  const shorts    = reels.slice(0, 6);
  const grid      = reels.slice(1);
  const newVideos = [...reels].reverse().slice(0, 6);

  return (
    <>
      <div className="h-full overflow-y-auto"
        style={{ background:"#03010b",paddingBottom:100 }}
        onTouchStart={onTS} onTouchEnd={onTE}
      >
        {/* ── HEADER ── */}
        <div className="sticky top-0 z-40"
          style={{ background:"rgba(3,1,11,0.92)",backdropFilter:"blur(22px) saturate(1.7)",
            WebkitBackdropFilter:"blur(22px) saturate(1.7)",
            borderBottom:"1px solid rgba(255,255,255,0.05)" }}>

          <div className="px-4 pt-4 pb-2">
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div key="search"
                  initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{duration:0.18}}
                  className="flex items-center gap-2 mb-3">
                  <motion.button whileTap={{scale:0.85}}
                    onClick={()=>{ setShowSearch(false); setQuery(""); }}
                    style={{ width:38,height:38,borderRadius:"50%",
                      background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.09)",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <ArrowLeft className="w-4 h-4 text-white/60"/>
                  </motion.button>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(239,68,68,0.3)" }}>
                    <Search className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)}
                      placeholder="Video, kanal qidirish..."
                      className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/30"/>
                    {query && (
                      <motion.button whileTap={{scale:0.8}} onClick={()=>setQuery("")}>
                        <X className="w-3.5 h-3.5 text-white/35"/>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="logo"
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                  transition={{duration:0.18}}
                  className="flex items-center justify-between mb-3">
                  {/* Logo */}
                  <div className="flex items-center gap-2.5">
                    <OTubeMark size={34}/>
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-[20px] tracking-tight"
                        style={{ background:"linear-gradient(90deg,#ef4444,#dc2626,#7c3aed)",
                          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                        OTube
                      </span>
                      <span style={{ fontSize:8,letterSpacing:"0.22em",color:"rgba(239,68,68,0.5)",
                        fontWeight:700,textTransform:"uppercase" }}>
                        SIGNAL ENGINE
                      </span>
                    </div>
                  </div>
                  {/* Right actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Upload */}
                    <motion.button whileTap={{scale:0.85}}
                      style={{ width:36,height:36,borderRadius:"50%",
                        background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Upload className="w-3.5 h-3.5 text-red-400"/>
                    </motion.button>
                    {/* Bell with dot */}
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setNotifDot(false)}
                      className="relative"
                      style={{ width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Bell className="w-3.5 h-3.5 text-white/55"/>
                      {notifDot && (
                        <div className="absolute top-1 right-1"
                          style={{ width:7,height:7,borderRadius:"50%",background:"#ef4444",
                            boxShadow:"0 0 6px #ef4444",border:"1.5px solid #03010b" }}/>
                      )}
                    </motion.button>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setShowSearch(true)}
                      style={{ width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Search className="w-3.5 h-3.5 text-white/55"/>
                    </motion.button>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setShowSettings(true)}
                      style={{ width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Settings className="w-3.5 h-3.5 text-white/55"/>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav tabs */}
            <div className="flex gap-0 mb-2.5 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
                  className="flex-shrink-0 px-4 py-1.5 relative"
                  style={{ fontSize:12,fontWeight:tab===t.id?900:600,
                    color:tab===t.id?"white":"rgba(255,255,255,0.4)" }}>
                  {t.label}
                  {tab===t.id && (
                    <motion.div layoutId="nav-tab"
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                      style={{ background:"linear-gradient(90deg,#ef4444,#a855f7)" }}/>
                  )}
                </button>
              ))}
            </div>

            {/* Category pills */}
            {tab === "home" && (
              <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth:"none" }}>
                {CATS.map(({ id, label, Icon, color }) => {
                  const active = cat===id;
                  return (
                    <motion.button key={id} whileTap={{scale:0.87}} onClick={()=>setCat(id)}
                      className="flex items-center gap-1.5 flex-shrink-0"
                      style={{ padding:"5px 12px",borderRadius:7,
                        background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                        border: active ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: active ? `0 0 14px ${color}20` : "none",
                        clipPath:"polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)" }}>
                      <Icon style={{ width:10,height:10,color:active?color:"rgba(255,255,255,0.35)" }}/>
                      <span style={{ fontSize:10.5,fontWeight:active?800:600,
                        color:active?"white":"rgba(255,255,255,0.4)",lineHeight:1 }}>
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-3 pt-4 space-y-7">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <OTubeMark size={52}/>
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor:"rgba(239,68,68,0.25)",borderTopColor:"#ef4444" }}/>
                <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:700 }}>Yuklanmoqda...</span>
              </div>
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <OTubeMark size={52}/>
              <p className="text-white/28 text-[13px] mt-1">
                {query ? `"${query}" bo'yicha natija topilmadi` : "Hali videolar yo'q"}
              </p>
              {query && (
                <motion.button whileTap={{scale:0.9}} onClick={()=>setQuery("")}
                  className="flex items-center gap-2 px-4 py-2 rounded-full mt-1"
                  style={{ background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)" }}>
                  <RefreshCw className="w-3.5 h-3.5 text-red-400"/>
                  <span style={{ fontSize:12,color:"#fca5a5",fontWeight:700 }}>Filterni tozalash</span>
                </motion.button>
              )}
            </div>
          ) : tab === "home" ? (
            <>
              {/* Featured */}
              {featured && !query && (
                <HeroCard video={featured} onPlay={()=>setSelected(featured)}/>
              )}

              {/* Search results */}
              {query && reels.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-3.5 h-3.5 text-red-400"/>
                    <span className="text-white font-black text-[13px]">
                      "{query}" — {reels.length} ta natija
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {reels.map((v,i) => (
                      <GridCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>
                    ))}
                  </div>
                </section>
              )}

              {!query && (
                <>
                  {/* Trending */}
                  {trending.length > 0 && (
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
                      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
                        {trending.map((v,i) => (
                          <TrendCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* New videos */}
                  {newVideos.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-violet-400"/>
                        <span className="text-white font-black text-[13px]">Yangi videolar</span>
                      </div>
                      <div className="space-y-2">
                        {newVideos.map((v) => (
                          <motion.div key={v.id}
                            whileTap={{scale:0.98}}
                            onClick={()=>setSelected(v)}
                            className="flex gap-3 rounded-[14px] overflow-hidden cursor-pointer"
                            style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",padding:8 }}>
                            <div className="flex-shrink-0 rounded-[10px] overflow-hidden"
                              style={{ width:88,aspectRatio:"16/9",background:"#0a0218",position:"relative" }}>
                              {v.thumbnailUrl
                                ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                                : <div className="w-full h-full flex items-center justify-center">
                                    <Film className="w-5 h-5 text-white/10"/>
                                  </div>}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div style={{ width:22,height:22,borderRadius:"50%",
                                  background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                                  <Play style={{ width:8,height:8,fill:"white",color:"white",marginLeft:1 }}/>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 py-0.5">
                              <p className="text-white font-bold text-[11px] line-clamp-2 leading-snug mb-1">
                                {v.caption||"Video"}
                              </p>
                              <p className="text-white/40 text-[10px]">{v.author.displayName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Eye style={{ width:8,height:8,color:"rgba(255,255,255,0.25)" }}/>
                                <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:600 }}>{fmt(v.viewsCount)}</span>
                                <Heart style={{ width:8,height:8,color:"rgba(255,255,255,0.25)" }}/>
                                <span style={{ fontSize:8.5,color:"rgba(255,255,255,0.25)",fontWeight:600 }}>{fmt(v.likesCount)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Discovery grid */}
                  {grid.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400"/>
                        <span className="text-white font-black text-[13px]">Kashfiyot</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {grid.map((v,i) => (
                          <GridCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          ) : tab === "shorts" ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div style={{ width:28,height:28,borderRadius:"50%",
                  background:"rgba(239,68,68,0.85)",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Zap style={{ width:14,height:14,fill:"white",color:"white" }}/>
                </div>
                <span className="text-white font-black text-[16px]">Shorts</span>
                <span style={{ fontSize:10,fontWeight:700,
                  color:"rgba(239,68,68,0.7)",background:"rgba(239,68,68,0.1)",
                  padding:"2px 8px",borderRadius:6,border:"1px solid rgba(239,68,68,0.2)" }}>
                  YANGI AVLOD
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
                {shorts.map(v => (
                  <ShortsCard key={v.id} video={v} onPlay={()=>setSelected(v)}/>
                ))}
              </div>
              <div className="h-4"/>
              {/* Grid view for shorts */}
              <div className="grid grid-cols-2 gap-2.5">
                {raw.map((v,i) => (
                  <GridCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>
                ))}
              </div>
            </section>
          ) : (
            /* Subscriptions tab */
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-violet-400"/>
                <span className="text-white font-black text-[15px]">Obunalar</span>
              </div>
              {/* Channel rows */}
              {raw.map((v, i) => i < 5 && (
                <div key={v.id} className="flex items-center gap-3 py-2.5 px-3 rounded-[14px] mb-2"
                  style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,
                    background:`hsl(${i*65}deg 60% 35%)`,
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {v.author.avatarUrl
                      ? <img src={v.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/>
                      : <span style={{ fontSize:16,fontWeight:900,color:"white" }}>
                          {v.author.displayName[0]}
                        </span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize:13,fontWeight:800,color:"rgba(255,255,255,0.85)" }}>
                      {v.author.displayName}
                    </p>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>
                      @{v.author.username} · {fmt(Math.floor(Math.random()*50000+1000))} obunachi
                    </p>
                  </div>
                  <motion.button whileTap={{scale:0.9}}
                    style={{ padding:"6px 12px",borderRadius:10,
                      background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)" }}>
                    <span style={{ fontSize:10,fontWeight:900,color:"#fca5a5" }}>+ Obuna</span>
                  </motion.button>
                </div>
              ))}
              {/* Videos from subs */}
              <div className="h-2"/>
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-3.5 h-3.5 text-red-400"/>
                <span className="text-white font-black text-[13px]">So'nggi videolar</span>
              </div>
              <div className="space-y-2">
                {raw.slice(0,4).map(v => (
                  <motion.div key={v.id}
                    whileTap={{scale:0.98}} onClick={()=>setSelected(v)}
                    className="flex gap-3 rounded-[14px] overflow-hidden cursor-pointer"
                    style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",padding:8 }}>
                    <div className="flex-shrink-0 rounded-[10px] overflow-hidden"
                      style={{ width:88,aspectRatio:"16/9",background:"#0a0218",position:"relative" }}>
                      {v.thumbnailUrl
                        ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-5 h-5 text-white/10"/>
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-white font-bold text-[11px] line-clamp-2 leading-snug mb-1">
                        {v.caption||"Video"}
                      </p>
                      <p className="text-white/40 text-[10px]">{v.author.displayName}</p>
                      <p style={{ fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:2 }}>
                        {fmt(v.viewsCount)} ko'rish
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Swipe indicator */}
        <div className="flex items-end justify-center gap-2.5 py-10 pointer-events-none">
          {[{label:"Lenta",a:false},{label:"Reels",a:false},{label:"OTube",a:true}].map(d => (
            <div key={d.label} className="flex flex-col items-center gap-1.5">
              <div style={{ width:d.a?26:7,height:7,borderRadius:4,transition:"all 0.35s",
                background:d.a?"linear-gradient(90deg,#ef4444,#a855f7)":"rgba(255,255,255,0.08)",
                boxShadow:d.a?"0 0 12px #ef444499":"none" }}/>
              <span style={{ fontSize:8,fontWeight:700,letterSpacing:"0.06em",
                color:d.a?"rgba(239,68,68,0.65)":"rgba(255,255,255,0.18)" }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Player */}
      <AnimatePresence>
        {selected && (
          <NexusPlayer key={selected.id}
            video={selected} onClose={()=>setSelected(null)} settings={settings}/>
        )}
      </AnimatePresence>

      {/* Settings + Monetization drawer */}
      <SettingsDrawer
        open={showSettings} onClose={()=>setShowSettings(false)}
        settings={settings} onSettings={setSettings}
        monetize={monetize} onMonetize={setMonetize}
      />
    </>
  );
}
