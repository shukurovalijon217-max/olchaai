/**
 * OTube — SIGNAL ENGINE v4
 * "BROADCAST STATION" — Kiberpu / Arcade / Neon estetikasi
 * YouTube'dan tubdan boshqa ko'rinish
 */
import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useListReels, useLikeReel, useFollowUser, useCreateReel, useRequestUploadUrl } from "@workspace/api-client-react";
import type { Reel, UploadUrlRequest } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  Play, Pause, Volume2, VolumeX, ArrowLeft, Search, X,
  Eye, Heart, Share2, Check, Film, Music2, Gamepad2,
  Zap, Sparkles, TrendingUp, Globe, Settings, Bell,
  RotateCcw, ChevronRight, ChevronDown, RefreshCw,
  MessageCircle, Bookmark, Plus, DollarSign, Star,
  Users, Clock, ThumbsUp, ThumbsDown, Gauge, Upload,
  Maximize2, Minimize2, BadgeDollarSign, Radio, Tv,
  Brain, Flame, Trophy, Moon, ArrowUp, BarChart2, Layers,
  SmilePlus, Swords, Wind, Award, Tag, Cpu, Activity,
  ListVideo, ShieldCheck, Crosshair, Scissors, Timer, Sliders,
  Type, Smile, Music, ChevronLeft, Camera, Mic2, ImagePlus,
  Wand2, AlignCenter, FastForward, Palette, SlidersHorizontal,
} from "lucide-react";

/* ─────────────────────────────────────────────────────── */
/* Design tokens — NEXUS AURORA BROADCAST                  */
/* ─────────────────────────────────────────────────────── */
const T = {
  bg:       "#000008",
  bg2:      "#050010",
  card:     "#0a0018",
  cyan:     "#00e5ff",
  aurora:   "#00ffee",
  orange:   "#ff6b00",
  plasma:   "#ff3500",
  violet:   "#9d00ff",
  nova:     "#7700ff",
  pulse:    "#00ff77",
  gold:     "#ffc400",
  border:   "rgba(0,229,255,0.08)",
  borderHot:"rgba(0,229,255,0.35)",
  txt:      "rgba(255,255,255,0.92)",
  txtSub:   "rgba(255,255,255,0.35)",
  gCyan:    "linear-gradient(135deg,#00ffee,#0088cc)",
  gOrange:  "linear-gradient(135deg,#ff6b00,#ff2d00)",
  gViolet:  "linear-gradient(135deg,#9d00ff,#4400aa)",
  gAurora:  "linear-gradient(135deg,#00ffee,#7700ff)",
  gFire:    "linear-gradient(135deg,#ff6b00,#ff0055)",
} as const;

/* Deep void — aurora system in JSX */
const DOT_BG = { background: "#000008" } as const;

/* ─────────────────────────────────────────────────────── */
/* Global follow-state cache (module-level Map)            */
/* Prevents per-card useState from resetting on re-mount   */
/* ─────────────────────────────────────────────────────── */
const followStateCache = new Map<number, boolean>();

function getFollowState(authorId: number, serverValue: boolean | null | undefined): boolean {
  if (followStateCache.has(authorId)) return followStateCache.get(authorId)!;
  return serverValue ?? false;
}

function setFollowState(authorId: number, value: boolean) {
  followStateCache.set(authorId, value);
}

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
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────── */
/* Settings types                                          */
/* ─────────────────────────────────────────────────────── */
interface PlayerSettings {
  autoplay: boolean; loop: boolean; muteDefault: boolean;
  quality: "Auto"|"1080p"|"720p"|"480p"|"360p";
  cinemaMode: boolean; showTitle: boolean;
  hdStream: boolean; dataWarning: boolean;
}
interface MonetizationSettings {
  creatorMode: boolean; adsEnabled: boolean;
  membershipEnabled: boolean; superThanks: boolean;
  donation: "500"|"2000"|"10000"|"50000";
}
const DEF_S: PlayerSettings = {
  autoplay:true, loop:true, muteDefault:false, quality:"Auto",
  cinemaMode:false, showTitle:true, hdStream:true, dataWarning:false,
};
const DEF_M: MonetizationSettings = {
  creatorMode:false, adsEnabled:true,
  membershipEnabled:false, superThanks:true, donation:"2000",
};

/* ─────────────────────────────────────────────────────── */
/* OTube Logo — QIZIL SFERA (o'zgarmaydi)                 */
/* ─────────────────────────────────────────────────────── */
function OTubeMark({ size = 32 }: { size?: number }) {
  const id = `ot${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        {/* Aurora sphere gradient — matches T.gAurora (#00ffee → #7700ff) */}
        <radialGradient id={`${id}s`} cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#66fff8"/>
          <stop offset="30%"  stopColor="#00e5ff"/>
          <stop offset="65%"  stopColor="#0077cc"/>
          <stop offset="100%" stopColor="#7700ff"/>
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#00ffee"/>
          <stop offset="100%" stopColor="#6600cc"/>
        </linearGradient>
        {/* Outer glow — cyan */}
        <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
          <feColorMatrix in="b" type="matrix"
            values="0 0 0 0 0  0 1 1 0 0  0 0 1 0 0  0 0 0 1 0" result="colored"/>
          <feComposite in="SourceGraphic" in2="colored" operator="over"/>
        </filter>
        <filter id={`${id}d`}>
          <feDropShadow dx="0" dy="0" stdDeviation="4"
            floodColor="#00e5ff" floodOpacity="0.7"/>
        </filter>
        {/* Inner shimmer */}
        <radialGradient id={`${id}sh`} cx="30%" cy="25%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      {/* Outer ring glow */}
      <circle cx="24" cy="24" r="22.5"
        stroke={`url(#${id}r)`} strokeWidth="1.5"
        fill="rgba(0,0,20,0.5)" filter={`url(#${id}g)`}/>
      {/* Main sphere */}
      <circle cx="24" cy="24" r="18"
        fill={`url(#${id}s)`} filter={`url(#${id}d)`}/>
      {/* Shimmer highlight */}
      <circle cx="24" cy="24" r="18" fill={`url(#${id}sh)`}/>
      {/* Specular top-left */}
      <ellipse cx="17.5" cy="15" rx="6" ry="3.5"
        fill="rgba(255,255,255,0.32)" transform="rotate(-20 17.5 15)"/>
      <ellipse cx="29" cy="13.5" rx="2.2" ry="1.3"
        fill="rgba(255,255,255,0.18)" transform="rotate(8 29 13.5)"/>
      {/* Play triangle */}
      <path d="M20 16.5 L32 24 L20 31.5 Z"
        fill="white" opacity="0.97"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Seek flash                                              */
/* ─────────────────────────────────────────────────────── */
/* ── Danmaku overlay — floating reactions (Bilibili-style) ── */
const DANK_MSGS = [
  "🔥 wow","mazali!","juda zo'r","🚀🚀🚀","birinchi marta ko'rdim",
  "❤️ ajoyib","zo'r kanal","OlCha > YouTube","💯 perfect","davom eting",
  "salom hammaga 👋","yutub kerak emas","🎉 zo'r","signal kuchli!","❤️‍🔥",
];
const DANK_COLS = ["#00e5ff","#ff6b00","#a855f7","#00ff88","#ff2d55","#ffd700","white"];
function DanmakuOverlay({ active }: { active:boolean }) {
  const [items, setItems] = useState<{id:number;msg:string;top:number;col:string;dur:number}[]>([]);
  const ctr = useRef(0);
  useEffect(()=>{
    if (!active) { setItems([]); return; }
    const iv = setInterval(()=>{
      const id = ctr.current++;
      setItems(prev=>[...prev.slice(-14),{
        id, msg: DANK_MSGS[Math.floor(Math.random()*DANK_MSGS.length)],
        top: 8+Math.random()*62,
        col: DANK_COLS[Math.floor(Math.random()*DANK_COLS.length)],
        dur: 4+Math.random()*3,
      }]);
    }, 700);
    return ()=>clearInterval(iv);
  },[active]);
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {items.map(it=>(
          <motion.div key={it.id}
            initial={{x:"105vw",opacity:0.9}} animate={{x:"-110%"}} exit={{opacity:0}}
            transition={{duration:it.dur,ease:"linear"}}
            className="absolute whitespace-nowrap"
            style={{top:`${it.top}%`,fontSize:12,fontWeight:700,color:it.col,
              textShadow:`0 0 10px ${it.col}99`,
              background:"rgba(0,0,0,0.38)",backdropFilter:"blur(4px)",
              padding:"2px 9px",borderRadius:99}}>
            {it.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function SeekFlash({ side, visible }: { side:"left"|"right"; visible:boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key={side}
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          transition={{duration:0.12}}
          className={`absolute top-0 ${side==="left"?"left-0":"right-0"} bottom-0 flex items-center justify-center pointer-events-none`}
          style={{ width:"36%",
            background: side==="left"
              ? "radial-gradient(ellipse at left,rgba(0,229,255,0.22),transparent 70%)"
              : "radial-gradient(ellipse at right,rgba(0,229,255,0.22),transparent 70%)" }}>
          <div className="flex flex-col items-center gap-1" style={{marginTop:-18}}>
            <span style={{fontSize:28}}>{side==="left"?"⏪":"⏩"}</span>
            <span style={{fontSize:11,fontWeight:900,color:T.cyan}}>{side==="left"?"-10s":"+10s"}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Speed picker                                            */
/* ─────────────────────────────────────────────────────── */
const SPEEDS = [0.5,0.75,1,1.25,1.5,2] as const;
function SpeedPicker({ speed, onSpeed, onClose }:
  { speed:number; onSpeed:(s:number)=>void; onClose:()=>void }) {
  return (
    <motion.div
      initial={{opacity:0,y:10,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:0.92}}
      className="absolute bottom-20 right-3 z-50 overflow-hidden"
      style={{ background:"rgba(12,8,22,0.92)",backdropFilter:"blur(20px)",
        boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)`,
        borderRadius:16,minWidth:130 }}>
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,0.5)"}}>TEZLIK</span>
        <button onClick={onClose}><X style={{width:12,height:12,color:"rgba(255,255,255,0.3)"}}/></button>
      </div>
      {SPEEDS.map(s => (
        <button key={s} onClick={()=>{onSpeed(s);onClose();}}
          className="w-full flex items-center justify-between px-4 py-2.5"
          style={{ background:speed===s?"rgba(0,229,255,0.1)":"transparent" }}>
          <span style={{fontSize:13,fontWeight:speed===s?900:500,
            color:speed===s?T.cyan:"rgba(255,255,255,0.5)"}}>
            {s===1?"Oddiy":`${s}×`}
          </span>
          {speed===s && <Check style={{width:12,height:12,color:T.cyan}}/>}
        </button>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Comments panel — real API                               */
/* ─────────────────────────────────────────────────────── */
interface ApiComment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; username: string; displayName: string; avatarUrl: string | null };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}k`;
}

function CommentsPanel({ reelId, onClose }: { reelId:number; onClose:()=>void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [txt, setTxt] = useState("");

  const { data: comments = [], isLoading } = useQuery<ApiComment[]>({
    queryKey: ["reel-comments", reelId],
    queryFn: async () => {
      const r = await fetch(`/api/reels/${reelId}/comments`);
      if (!r.ok) throw new Error("Izohlarni olishda xatolik");
      return r.json() as Promise<ApiComment[]>;
    },
    staleTime: 30_000,
  });

  const postMut = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch(`/api/reels/${reelId}/comments`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ content }),
      });
      if (!r.ok) throw new Error("Izoh qo'shishda xatolik");
      return r.json() as Promise<ApiComment>;
    },
    onSuccess: (newComment) => {
      qc.setQueryData<ApiComment[]>(["reel-comments", reelId], old =>
        old ? [newComment, ...old] : [newComment]
      );
    },
  });

  const send = () => {
    if (!txt.trim() || postMut.isPending) return;
    postMut.mutate(txt.trim());
    setTxt("");
  };

  return (
    <motion.div
      initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
      transition={{type:"spring",damping:30,stiffness:320}}
      className="absolute inset-x-0 bottom-0 z-[60] flex flex-col overflow-hidden"
      style={{ background:"rgba(6,3,16,0.97)",backdropFilter:"blur(24px)",maxHeight:"68%",
        borderRadius:"20px 20px 0 0",
        boxShadow:`0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)` }}
      onClick={e=>e.stopPropagation()}>
      {/* drag handle */}
      <div className="flex justify-center pt-2.5 pb-1">
        <div style={{width:36,height:3,borderRadius:99,background:"rgba(255,255,255,0.15)"}}/>
      </div>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
        <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.75)"}}>
          Izohlar <span style={{color:"rgba(255,255,255,0.25)",fontWeight:500}}>({comments.length})</span>
        </span>
        <button onClick={onClose}
          style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.08)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X style={{width:12,height:12,color:"rgba(255,255,255,0.5)"}}/>
        </button>
      </div>
      {/* input */}
      {user && (
        <div className="flex items-center gap-2.5 px-4 py-3"
          style={{borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
          <div style={{width:30,height:30,flexShrink:0,borderRadius:"50%",
            background:"linear-gradient(135deg,rgba(0,229,255,0.2),rgba(157,0,255,0.2))",
            overflow:"hidden",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
              : <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>
                  {(user.displayName||user.username||"S")[0].toUpperCase()}
                </span>}
          </div>
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2"
            style={{borderRadius:99,background:"rgba(255,255,255,0.07)",
              boxShadow:"0 0 0 1px rgba(255,255,255,0.09)"}}>
            <input value={txt} onChange={e=>setTxt(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="Izoh yozing..."
              className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/20"
              style={{fontFamily:"inherit"}}/>
            {txt && (
              <button onClick={send} disabled={postMut.isPending}
                style={{color:postMut.isPending?"rgba(0,229,255,0.4)":T.cyan,fontSize:16}}>
                {postMut.isPending ? "..." : "➤"}
              </button>
            )}
          </div>
        </div>
      )}
      {/* list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5"
        style={{scrollbarWidth:"none"}}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-1">
              {[0,1,2].map(i=>(
                <motion.div key={i} animate={{opacity:[0.3,1,0.3]}}
                  transition={{duration:0.7,repeat:Infinity,delay:i*0.15}}
                  style={{width:3,height:14,background:T.cyan}}/>
              ))}
            </div>
          </div>
        ) : comments.length === 0 ? (
          <p style={{fontSize:11,color:"rgba(255,255,255,0.25)",textAlign:"center",paddingTop:24,fontFamily:"monospace"}}>
            Birinchi bo'lib izoh qoldiring
          </p>
        ) : comments.map(c=>(
          <div key={c.id} className="flex gap-2.5">
            <div style={{width:28,height:28,flexShrink:0,borderRadius:"50%",
              background:`hsl(${(c.id*47)%360},50%,22%)`,
              overflow:"hidden",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {c.author.avatarUrl
                ? <img src={c.author.avatarUrl} alt="" className="w-full h-full object-cover"/>
                : <span style={{fontSize:10,fontWeight:900,color:"white"}}>
                    {(c.author.displayName||c.author.username||"?")[0].toUpperCase()}
                  </span>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.7)"}}>
                  {c.author.displayName||c.author.username}
                </span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.22)"}}>{timeAgo(c.createdAt)}</span>
              </div>
              <p style={{fontSize:11.5,color:"rgba(255,255,255,0.8)",lineHeight:1.45}}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* NexusPlayer — BROADCAST STYLE                           */
/* ─────────────────────────────────────────────────────── */
function NexusPlayer({ video, onClose, settings }:
  { video:Reel; onClose:()=>void; settings:PlayerSettings }) {
  const { t } = useTranslation();
  const qc             = useQueryClient();
  const [, navPlayer]  = useLocation();
  const videoRef   = useRef<HTMLVideoElement>(null);
  const contRef    = useRef<HTMLDivElement>(null);
  const ctrlTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTap    = useRef(0);
  const tapTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longHold   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const viewTracked = useRef(false);

  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(settings.muteDefault);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [curTime,   setCurTime]   = useState(0);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const [liked,     setLiked]     = useState(video.isLiked ?? false);
  const [likesCount,setLikesCount]= useState(video.likesCount ?? 0);
  const [disliked,  setDisliked]  = useState(false);
  const [shared,    setShared]    = useState(false);
  const [saved,     setSaved]     = useState(()=>{
    try { return JSON.parse(localStorage.getItem("otube_saved")||"[]").includes(video.id); } catch { return false; }
  });
  const [subbed,    setSubbed]    = useState(() => getFollowState(video.author.id, video.author.isFollowing));
  const [seekLeft,  setSeekLeft]  = useState(false);
  const [seekRight, setSeekRight] = useState(false);
  const [fastFwd,   setFastFwd]   = useState(false);
  const [speed,     setSpeed]     = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showCom,   setShowCom]   = useState(false);
  const [isFull,    setIsFull]    = useState(false);
  const [showDesc,  setShowDesc]  = useState(false);
  const [donating,  setDonating]  = useState(false);
  const [danmaku,   setDanmaku]   = useState(false);
  const [aiDub,     setAiDub]     = useState(false);
  const [dubLang,   setDubLang]   = useState<"uz"|"ru"|"en">("uz");
  const [donateAmt, setDonateAmt] = useState("2000");

  /* Real like mutation */
  const likeMut = useLikeReel({
    mutation: {
      onMutate: () => {
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(c => wasLiked ? Math.max(0,c-1) : c+1);
        if (!liked && disliked) setDisliked(false);
      },
      onSuccess: (data) => {
        setLiked(data.liked);
        setLikesCount(data.likesCount);
        qc.invalidateQueries({ queryKey: ["/api/reels"] });
      },
      onError: () => {
        setLiked(liked);
        setLikesCount(video.likesCount);
      },
    },
  });

  /* Real follow mutation */
  const followMut = useFollowUser({
    mutation: {
      onMutate: () => {
        const next = !getFollowState(video.author.id, video.author.isFollowing);
        setFollowState(video.author.id, next);
        setSubbed(next);
      },
      onSuccess: (data) => {
        setFollowState(video.author.id, data.following);
        setSubbed(data.following);
        qc.invalidateQueries({ queryKey: ["/api/reels"] });
      },
      onError: () => {
        const prev = !subbed;
        setFollowState(video.author.id, prev);
        setSubbed(prev);
      },
    },
  });

  /* Save to localStorage */
  const toggleSave = useCallback(() => {
    setSaved((s: boolean) => {
      const next = !s;
      try {
        const arr: number[] = JSON.parse(localStorage.getItem("otube_saved")||"[]");
        const updated = next ? [...arr, video.id] : arr.filter(x=>x!==video.id);
        localStorage.setItem("otube_saved", JSON.stringify(updated));
      } catch {}
      return next;
    });
  }, [video.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const v = videoRef.current;
    if (v && settings.autoplay) v.play().then(()=>setPlaying(true)).catch(()=>{});
    return () => { document.body.style.overflow = ""; };
  }, [settings.autoplay]);

  useEffect(() => {
    const h = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFull = useCallback(async () => {
    const el = contRef.current; if (!el) return;
    if (!document.fullscreenElement) { try { await el.requestFullscreen(); } catch{} }
    else { try { await document.exitFullscreen(); } catch{} }
  }, []);

  const resetCtrl = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(()=>setShowCtrl(false), 3200);
  }, []);
  useEffect(() => {
    resetCtrl();
    return () => { if (ctrlTimer.current) clearTimeout(ctrlTimer.current); };
  }, [resetCtrl]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) {
      v.play().then(()=>{
        setPlaying(true);
        if (!viewTracked.current) {
          viewTracked.current = true;
          fetch(`/api/reels/${video.id}/view`, { method:"POST" }).catch(()=>{});
        }
      }).catch(()=>{});
    } else { v.pause(); setPlaying(false); }
    resetCtrl();
  }, [resetCtrl, video.id]);

  const seek = useCallback((d:number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0,Math.min(v.duration||0, v.currentTime+d));
    if (d<0){setSeekLeft(true);setTimeout(()=>setSeekLeft(false),650);}
    else   {setSeekRight(true);setTimeout(()=>setSeekRight(false),650);}
    resetCtrl();
  }, [resetCtrl]);

  const handleTap = useCallback((e:React.MouseEvent<HTMLDivElement>) => {
    if (showSpeed||showCom) return;
    const now = Date.now();
    const r = e.currentTarget.getBoundingClientRect();
    const side = e.clientX-r.left < r.width/2 ? "left" : "right";
    if (now-lastTap.current < 320) {
      if (tapTimer.current){clearTimeout(tapTimer.current);tapTimer.current=null;}
      seek(side==="right"?10:-10); lastTap.current=0; return;
    }
    lastTap.current=now;
    tapTimer.current=setTimeout(()=>{togglePlay();lastTap.current=0;},330);
  }, [seek,togglePlay,showSpeed,showCom]);

  const startHold = useCallback(()=>{
    longHold.current=setTimeout(()=>{
      const v=videoRef.current;if(v)v.playbackRate=2;setFastFwd(true);
    },500);
  },[]);
  const endHold = useCallback(()=>{
    if(longHold.current)clearTimeout(longHold.current);
    const v=videoRef.current;if(v)v.playbackRate=speed;setFastFwd(false);
  },[speed]);

  const scrub = useCallback((val:number)=>{
    const v=videoRef.current;
    if(v&&isFinite(v.duration)){v.currentTime=val*v.duration;setProgress(val);setCurTime(v.currentTime);}
    resetCtrl();
  },[resetCtrl]);

  const applySpeed = useCallback((s:number)=>{
    const v=videoRef.current;if(v)v.playbackRate=s;setSpeed(s);
  },[]);

  const handleShare = useCallback(async()=>{
    try{if(navigator.share)await navigator.share({title:video.caption||"OTube",url:window.location.href});
    else await navigator.clipboard.writeText(window.location.href);}catch{}
    setShared(true);setTimeout(()=>setShared(false),2000);
  },[video.caption]);

  /* Icon button helper — round */
  const IBtn = ({ onClick, active=false, activeColor=T.cyan, children, label }:
    { onClick:()=>void; active?:boolean; activeColor?:string; children:React.ReactNode; label:string }) => (
    <motion.button whileTap={{scale:0.72}}
      onClick={e=>{e.stopPropagation();onClick();}}
      className="flex flex-col items-center gap-1">
      <div style={{
        width:42,height:42,flexShrink:0,borderRadius:"50%",
        background: active?`${activeColor}28`:"rgba(0,0,0,0.45)",
        backdropFilter:"blur(12px)",
        boxShadow: active?`0 0 0 1.5px ${activeColor}66, 0 0 16px ${activeColor}33`
                        :"0 0 0 1px rgba(255,255,255,0.1)",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>
        {children}
      </div>
      <span style={{fontSize:8,color:"rgba(255,255,255,0.28)",fontWeight:600}}>
        {label}
      </span>
    </motion.button>
  );

  return (
    <motion.div ref={contRef}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.18}}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: settings.cinemaMode?"#000":"#03000a" }}
      onMouseMove={resetCtrl} onTouchMove={resetCtrl}
    >
      {/* Video */}
      <div className="relative flex-1 flex items-center justify-center select-none"
        onClick={handleTap}
        onTouchStart={startHold} onTouchEnd={endHold}
        onMouseDown={startHold} onMouseUp={endHold}>
        <video
          ref={videoRef}
          src={video.videoUrl??undefined}
          poster={video.thumbnailUrl??undefined}
          muted={muted} playsInline loop={settings.loop}
          style={{objectFit:"contain",width:"100%",height:"100%"}}
          onTimeUpdate={()=>{
            const v=videoRef.current;
            if(v&&isFinite(v.duration)&&v.duration>0){setCurTime(v.currentTime);setProgress(v.currentTime/v.duration);}
          }}
          onLoadedMetadata={()=>setDuration(videoRef.current?.duration??0)}
          onEnded={()=>setPlaying(false)}
        />
        <SeekFlash side="left"  visible={seekLeft}/>
        <SeekFlash side="right" visible={seekRight}/>
        <DanmakuOverlay active={danmaku}/>

        {/* 2× badge */}
        <AnimatePresence>
          {fastFwd && (
            <motion.div initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none px-5 py-2"
              style={{ borderRadius:99,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(12px)",
                boxShadow:`0 0 0 1px ${T.orange}44` }}>
              <span style={{fontSize:18,fontWeight:900,color:T.orange,letterSpacing:"0.12em"}}>2× TEZLIK</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSpeed && <SpeedPicker speed={speed} onSpeed={applySpeed} onClose={()=>setShowSpeed(false)}/>}
        </AnimatePresence>
        <AnimatePresence>
          {showCom && <CommentsPanel reelId={video.id} onClose={()=>setShowCom(false)}/>}
        </AnimatePresence>

        {/* Controls */}
        <AnimatePresence>
          {showCtrl && (
            <motion.div key="ctrls"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              transition={{duration:0.18}}
              className="absolute inset-0 pointer-events-none">

              {/* TOP bar */}
              <div className="absolute top-0 inset-x-0 pointer-events-auto"
                style={{ background:"linear-gradient(to bottom,rgba(0,0,0,0.85),transparent)",
                  padding:"14px 12px 40px" }}>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{scale:0.85}} onClick={onClose}
                    style={{ width:40,height:40,flexShrink:0,borderRadius:"50%",
                      background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",
                      boxShadow:"0 0 0 1px rgba(255,255,255,0.12)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ArrowLeft style={{width:18,height:18,color:"rgba(255,255,255,0.85)"}}/>
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    {settings.showTitle && <>
                      <p className="text-white font-black text-[13px] truncate">{video.caption||"OTube Video"}</p>
                      <p className="text-[10px] truncate mt-0.5 cursor-pointer"
                        style={{color:"rgba(255,255,255,0.5)"}}
                        onClick={(e)=>{e.stopPropagation(); onClose(); navPlayer(`/profile/${video.author.id}`);}}>
                        {video.author.displayName} · {fmt(video.viewsCount)} ko'rish
                      </p>
                    </>}
                  </div>

                  {/* Subscribe */}
                  <motion.button whileTap={{scale:0.88}}
                    onClick={()=>followMut.mutate({ id: video.author.id })}
                    disabled={followMut.isPending}
                    style={{ padding:"6px 14px",flexShrink:0,borderRadius:99,
                      background: subbed?"rgba(255,255,255,0.1)":`${T.orange}dd`,
                      boxShadow: subbed?"none":`0 0 16px ${T.orange}44`,
                      opacity: followMut.isPending?0.7:1 }}>
                    <span style={{fontSize:10,fontWeight:700,color:subbed?"rgba(255,255,255,0.5)":"white"}}>
                      {subbed?"✓ Obuna":"··· Obuna"}
                    </span>
                  </motion.button>

                  {/* Fullscreen */}
                  <motion.button whileTap={{scale:0.85}} onClick={toggleFull}
                    style={{ width:38,height:38,flexShrink:0,borderRadius:"50%",
                      background:"rgba(0,0,0,0.4)",backdropFilter:"blur(10px)",
                      boxShadow:"0 0 0 1px rgba(255,255,255,0.1)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {isFull
                      ? <Minimize2 style={{width:15,height:15,color:"rgba(255,255,255,0.7)"}}/>
                      : <Maximize2 style={{width:15,height:15,color:"rgba(255,255,255,0.6)"}}/>}
                  </motion.button>
                </div>
              </div>

              {/* CENTER paused */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatePresence>
                  {!playing && (
                    <motion.div key="ppause"
                      initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}}
                      exit={{opacity:0,scale:1.4}} transition={{duration:0.15}}
                      style={{ width:74,height:74,borderRadius:"50%",
                        background:"rgba(0,0,0,0.5)",backdropFilter:"blur(18px)",
                        boxShadow:`0 0 0 2px rgba(255,255,255,0.2), 0 0 40px rgba(0,229,255,0.2)`,
                        display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Play style={{width:28,height:28,fill:"white",color:"white",marginLeft:4}}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT sidebar */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col gap-2.5">
                <IBtn onClick={()=>likeMut.mutate({ id: video.id })}
                  active={liked} activeColor={T.cyan} label={fmt(likesCount)}>
                  <ThumbsUp style={{width:15,height:15,fill:liked?T.cyan:"none",color:liked?T.cyan:"rgba(255,255,255,0.7)"}}/>
                </IBtn>
                <IBtn onClick={()=>{setDisliked(d=>!d);if(liked){likeMut.mutate({id:video.id});}}}
                  active={disliked} activeColor={T.orange} label={t("otube.dislike")}>
                  <ThumbsDown style={{width:15,height:15,fill:disliked?T.orange:"none",color:disliked?T.orange:"rgba(255,255,255,0.55)"}}/>
                </IBtn>
                <IBtn onClick={()=>void handleShare()} active={shared} activeColor="#10b981" label={t("otube.share_btn")}>
                  {shared?<Check style={{width:15,height:15,color:"#10b981"}}/>
                         :<Share2 style={{width:15,height:15,color:"rgba(255,255,255,0.7)"}}/>}
                </IBtn>
                <IBtn onClick={toggleSave} active={saved} activeColor={T.violet} label={t("otube.save_btn")}>
                  <Bookmark style={{width:15,height:15,fill:saved?T.violet:"none",color:saved?T.violet:"rgba(255,255,255,0.65)"}}/>
                </IBtn>
                <IBtn onClick={()=>setShowCom(c=>!c)} active={showCom} label={fmt(video.commentsCount??0)}>
                  <MessageCircle style={{width:15,height:15,color:showCom?T.cyan:"rgba(255,255,255,0.65)"}}/>
                </IBtn>
                <IBtn onClick={()=>setDonating(d=>!d)} active={donating} activeColor={T.orange} label={t("otube.donate_btn")}>
                  <Star style={{width:15,height:15,fill:donating?T.orange:"none",color:donating?T.orange:"rgba(255,255,255,0.55)"}}/>
                </IBtn>
                <IBtn onClick={()=>setDanmaku(d=>!d)} active={danmaku} activeColor="#ffd700" label={t("otube.reaction")}>
                  <Sparkles style={{width:15,height:15,color:danmaku?"#ffd700":"rgba(255,255,255,0.55)"}}/>
                </IBtn>
                <IBtn onClick={()=>setAiDub(d=>!d)} active={aiDub} activeColor="#00ff88" label="AI Dub">
                  <Gauge style={{width:15,height:15,color:aiDub?"#00ff88":"rgba(255,255,255,0.55)"}}/>
                </IBtn>
              </div>

              {/* BOTTOM controls */}
              <div className="absolute bottom-0 inset-x-0 pointer-events-auto"
                style={{ background:"linear-gradient(to top,rgba(0,0,0,0.92),transparent)",
                  padding:"40px 12px 16px" }}>

                {/* Donate panel */}
                <AnimatePresence>
                  {donating && (
                    <motion.div
                      initial={{opacity:0,y:12,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:0.95}}
                      className="mb-3 p-3.5"
                      onClick={e=>e.stopPropagation()}
                      style={{ borderRadius:18,
                        background:"rgba(10,6,20,0.88)",backdropFilter:"blur(20px)",
                        boxShadow:`0 0 0 1px rgba(255,107,0,0.25), 0 8px 32px rgba(0,0,0,0.5)` }}>
                      <p style={{fontSize:11,fontWeight:700,color:"rgba(255,160,50,0.9)",marginBottom:10}}>
                        ⭐ {video.author.displayName} · {t("otube.donate_btn")}
                      </p>
                      <div className="flex gap-2 mb-3">
                        {["500","2000","10000","50000"].map(a=>(
                          <button key={a} onClick={()=>setDonateAmt(a)}
                            style={{flex:1,padding:"7px 0",textAlign:"center",borderRadius:10,
                              background:donateAmt===a?`${T.orange}28`:"rgba(255,255,255,0.06)",
                              boxShadow:donateAmt===a?`0 0 0 1.5px ${T.orange}66`:"0 0 0 1px rgba(255,255,255,0.08)"}}>
                            <span style={{fontSize:10.5,fontWeight:700,color:donateAmt===a?T.orange:"rgba(255,255,255,0.45)"}}>
                              {Number(a)>=1000?`${Number(a)/1000}K`:a}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button onClick={()=>setDonating(false)}
                        className="w-full py-2.5 flex items-center justify-center gap-2"
                        style={{borderRadius:12,background:"linear-gradient(90deg,#ff6b00,#ff3d00)",
                          boxShadow:"0 4px 16px rgba(255,80,0,0.35)"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"white"}}>
                          {donateAmt} so'm · {t("otube.send_btn")}
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description toggle */}
                <button onClick={e=>{e.stopPropagation();setShowDesc(d=>!d);}}
                  className="w-full flex items-center justify-between mb-2"
                  style={{padding:"7px 12px",borderRadius:10,
                    background:"rgba(255,255,255,0.06)"}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:600}}>{t("otube.description")}</span>
                  {showDesc?<ChevronDown style={{width:12,height:12,color:"rgba(255,255,255,0.4)"}}/>
                            :<ChevronRight style={{width:12,height:12,color:"rgba(255,255,255,0.4)"}}/>}
                </button>
                <AnimatePresence>
                  {showDesc && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                      exit={{height:0,opacity:0}}
                      className="overflow-hidden mb-2"
                      onClick={e=>e.stopPropagation()}>
                      <p style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.6,
                        padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginBottom:6}}>
                        {video.caption} · @{video.author.username} ·{" "}
                        {fmt(video.viewsCount)} {t("otube.views_short")} · {fmt(video.likesCount)} like
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Neural Dub strip */}
                <AnimatePresence>
                  {aiDub && (
                    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                      className="flex items-center gap-2 mb-2" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center gap-1 px-2 py-1"
                        style={{borderRadius:99,background:"rgba(0,255,136,0.12)",
                          boxShadow:"0 0 0 1px rgba(0,255,136,0.3)"}}>
                        <Sparkles style={{width:9,height:9,color:"#00ff88"}}/>
                        <span style={{fontSize:9,fontWeight:700,color:"#00ff88"}}>AI DUB</span>
                      </div>
                      {(["uz","ru","en"] as const).map(l=>(
                        <motion.button key={l} whileTap={{scale:0.9}} onClick={()=>setDubLang(l)}
                          className="px-3 py-1"
                          style={{borderRadius:99,fontSize:10,fontWeight:700,
                            background:dubLang===l?"rgba(0,255,136,0.18)":"rgba(255,255,255,0.06)",
                            color:dubLang===l?"#00ff88":"rgba(255,255,255,0.4)",
                            boxShadow:dubLang===l?"0 0 0 1.5px rgba(0,255,136,0.5)":"none"}}>
                          {l.toUpperCase()}
                        </motion.button>
                      ))}
                      <span style={{fontSize:9,color:"rgba(0,255,136,0.6)",marginLeft:2}}>
                        ✓ {t("otube.active")}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quality + Speed badges */}
                <div className="flex justify-between items-center mb-2">
                  <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",
                    background:"rgba(255,255,255,0.06)",padding:"3px 10px",borderRadius:99}}>
                    {settings.quality}
                  </span>
                  <span style={{fontSize:9,fontWeight:600,borderRadius:99,
                    color:speed!==1?T.orange:"rgba(255,255,255,0.28)",
                    background:speed!==1?`${T.orange}18`:"rgba(255,255,255,0.05)",
                    padding:"3px 10px"}}>
                    {speed}× {t("otube.speed_label")}
                  </span>
                </div>

                {/* Scrubber */}
                <div className="relative flex items-center h-5 mb-2.5"
                  onClick={e=>e.stopPropagation()}>
                  <div className="absolute inset-x-0 h-[2px]"
                    style={{background:"rgba(255,255,255,0.1)"}}>
                    <div className="h-full"
                      style={{width:`${progress*100}%`,
                        background:`linear-gradient(90deg,${T.cyan},${T.violet})`}}/>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{left:`calc(${progress*100}% - 6px)`,
                      width:12,height:12,borderRadius:"50%",background:"white",
                      boxShadow:`0 0 10px rgba(255,255,255,0.7), 0 0 0 2px rgba(255,255,255,0.3)`}}/>
                  <input type="range" min={0} max={1} step={0.001} value={progress}
                    onChange={e=>scrub(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    onClick={e=>e.stopPropagation()}/>
                </div>

                {/* Bottom row */}
                <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                  <motion.button whileTap={{scale:0.82}} onClick={togglePlay}
                    style={{ width:46,height:46,flexShrink:0,borderRadius:"50%",
                      background:"rgba(255,255,255,0.12)",backdropFilter:"blur(12px)",
                      boxShadow:`0 0 0 1.5px rgba(255,255,255,0.2)`,
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {playing
                      ? <Pause style={{width:17,height:17,fill:"white",color:"white"}}/>
                      : <Play  style={{width:17,height:17,fill:"white",color:"white",marginLeft:2}}/>}
                  </motion.button>

                  {/* Restart */}
                  <button onClick={()=>{const v=videoRef.current;if(v){v.currentTime=0;setProgress(0);setCurTime(0);}}}
                    style={{width:34,height:34,flexShrink:0,borderRadius:"50%",
                      background:"rgba(255,255,255,0.06)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <RotateCcw style={{width:13,height:13,color:"rgba(255,255,255,0.45)"}}/>
                  </button>

                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"monospace",flexShrink:0}}>
                    {fmtTime(curTime)}/{fmtTime(duration)}
                  </span>

                  <div className="flex-1"/>

                  {/* Speed */}
                  <button onClick={()=>setShowSpeed(s=>!s)}
                    style={{width:34,height:34,flexShrink:0,borderRadius:"50%",
                      background:showSpeed?`${T.orange}22`:"rgba(255,255,255,0.06)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Gauge style={{width:14,height:14,color:showSpeed?T.orange:"rgba(255,255,255,0.45)"}}/>
                  </button>

                  {/* Volume */}
                  <button onClick={()=>setMuted(m=>!m)}
                    style={{width:34,height:34,flexShrink:0,borderRadius:"50%",
                      background:muted?"rgba(255,255,255,0.06)":`rgba(0,229,255,0.12)`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {muted
                      ? <VolumeX style={{width:14,height:14,color:"rgba(255,255,255,0.3)"}}/>
                      : <Volume2 style={{width:14,height:14,color:"rgba(0,229,255,0.8)"}}/>}
                  </button>
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
/* Settings Drawer — BROADCAST STYLE                       */
/* ─────────────────────────────────────────────────────── */
function Toggle({ on, onToggle, accent=T.cyan }:
  { on:boolean; onToggle:()=>void; accent?:string }) {
  return (
    <motion.button whileTap={{scale:0.88}} onClick={onToggle}
      style={{position:"relative",width:44,height:24,flexShrink:0,
        background:on?`${accent}cc`:"rgba(255,255,255,0.08)",
        boxShadow:on?`0 0 12px ${accent}55`:"none",transition:"all 0.2s",borderRadius:99}}>
      <motion.div animate={{x:on?22:2}}
        transition={{type:"spring",damping:18,stiffness:280}}
        style={{position:"absolute",top:3,width:18,height:18,borderRadius:"50%",
          background:"white",boxShadow:"0 2px 4px rgba(0,0,0,0.3)"}}/>
    </motion.button>
  );
}

function TRow({ icon,label,sub,on,onToggle }:
  { icon:string;label:string;sub:string;on:boolean;onToggle:()=>void }) {
  return (
    <div className="flex items-center gap-3 py-3 px-1"
      style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <span style={{fontSize:18,flexShrink:0,width:28,textAlign:"center"}}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{fontSize:12.5,fontWeight:600,color:"rgba(255,255,255,0.85)"}}>{label}</p>
        <p style={{fontSize:9.5,color:"rgba(255,255,255,0.28)",marginTop:1}}>{sub}</p>
      </div>
      <Toggle on={on} onToggle={onToggle}/>
    </div>
  );
}

function SecHead({ children }: { children:React.ReactNode }) {
  return (
    <div className="mt-5 mb-2">
      <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.35)",letterSpacing:"0.06em"}}>
        {String(children).toUpperCase()}
      </span>
    </div>
  );
}

function SettingsDrawer({ open,onClose,settings,onSettings,monetize,onMonetize }:
  { open:boolean;onClose:()=>void;settings:PlayerSettings;onSettings:(s:PlayerSettings)=>void;
    monetize:MonetizationSettings;onMonetize:(m:MonetizationSettings)=>void; }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"player"|"monetize">("player");
  const sP = <K extends keyof PlayerSettings>(k:K,v:PlayerSettings[K])=>onSettings({...settings,[k]:v});
  const sM = <K extends keyof MonetizationSettings>(k:K,v:MonetizationSettings[K])=>onMonetize({...monetize,[k]:v});
  const views=12480;
  const rev = monetize.creatorMode
    ?(views*(monetize.adsEnabled?0.0018:0)+(monetize.membershipEnabled?18500:0)).toFixed(0):"0";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="sb"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[8998]"
            style={{background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}}
            onClick={onClose}/>
          <motion.div key="sd"
            initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
            transition={{type:"spring",damping:28,stiffness:320}}
            className="fixed bottom-0 left-0 right-0 z-[8999] overflow-hidden"
            style={{background:"rgba(8,4,18,0.97)",backdropFilter:"blur(24px)",
              borderRadius:"20px 20px 0 0",
              boxShadow:`0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)`,
              maxHeight:"88vh"}}>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0.5">
              <div style={{width:36,height:3,borderRadius:99,background:"rgba(255,255,255,0.15)"}}/>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <OTubeMark size={26}/>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:"white"}}>{t("otube.settings")}</p>
                  <p style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{t("otube.settings_sub")}</p>
                </div>
              </div>
              <button onClick={onClose}
                style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X style={{width:14,height:14,color:"rgba(255,255,255,0.6)"}}/>
              </button>
            </div>

            {/* Tabs — round pills */}
            <div className="flex gap-2 px-5 pb-3">
              {([
                {id:"player" as const,  label:t("otube.player_tab")},
                {id:"monetize" as const,label:t("otube.monetize_tab")},
              ]).map(({id,label})=>(
                <motion.button key={id} onClick={()=>setTab(id)}
                  whileTap={{scale:0.94}}
                  className="flex-1 py-2 text-center"
                  style={{borderRadius:10,fontSize:11,fontWeight:600,
                    background:tab===id?"rgba(255,255,255,0.1)":"transparent",
                    color:tab===id?"white":"rgba(255,255,255,0.35)",
                    boxShadow:tab===id?"0 0 0 1px rgba(255,255,255,0.15)":"none",
                    transition:"all 0.2s"}}>
                  {label}
                </motion.button>
              ))}
            </div>

            <div className="px-5 py-3 overflow-y-auto" style={{maxHeight:"64vh",scrollbarWidth:"none"}}>
              {tab==="player" ? (
                <>
                  <SecHead>{t("otube.playback")}</SecHead>
                  <TRow icon="▶" label={t("otube.autoplay")} sub={t("otube.autoplay_sub")}
                    on={settings.autoplay} onToggle={()=>sP("autoplay",!settings.autoplay)}/>
                  <TRow icon="🔁" label={t("otube.loop")} sub={t("otube.loop_sub")}
                    on={settings.loop} onToggle={()=>sP("loop",!settings.loop)}/>
                  <TRow icon="🔇" label={t("otube.mute_default")} sub={t("otube.mute_sub")}
                    on={settings.muteDefault} onToggle={()=>sP("muteDefault",!settings.muteDefault)}/>
                  <TRow icon="📶" label={t("otube.hd_stream")} sub={t("otube.hd_sub")}
                    on={settings.hdStream} onToggle={()=>sP("hdStream",!settings.hdStream)}/>

                  <SecHead>{t("otube.view_settings")}</SecHead>
                  <TRow icon="🎬" label={t("otube.cinema_mode")} sub={t("otube.cinema_sub")}
                    on={settings.cinemaMode} onToggle={()=>sP("cinemaMode",!settings.cinemaMode)}/>
                  <TRow icon="📝" label={t("otube.show_title")} sub={t("otube.show_title_sub")}
                    on={settings.showTitle} onToggle={()=>sP("showTitle",!settings.showTitle)}/>

                  <SecHead>{t("otube.quality")}</SecHead>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(["Auto","1080p","720p","480p","360p"] as const).map(q=>(
                      <button key={q} onClick={()=>sP("quality",q)}
                        style={{padding:"7px 14px",borderRadius:99,
                          background:settings.quality===q?`rgba(0,229,255,0.14)`:"rgba(255,255,255,0.05)",
                          boxShadow:settings.quality===q?`0 0 0 1.5px ${T.cyan}55`:"0 0 0 1px rgba(255,255,255,0.08)"}}>
                        <span style={{fontSize:11,fontWeight:settings.quality===q?700:400,
                          color:settings.quality===q?T.cyan:"rgba(255,255,255,0.4)"}}>
                          {q}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Revenue card */}
                  <div className="p-4 mt-1 mb-2"
                    style={{borderRadius:16,background:"rgba(0,229,255,0.05)",
                      boxShadow:`0 0 0 1px rgba(0,229,255,0.12), inset 0 0 30px rgba(0,229,255,0.03)`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Radio style={{width:13,height:13,color:T.cyan}}/>
                      <span style={{fontSize:11,fontWeight:600,color:T.cyan}}>{t("otube.creator_revenue")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {l:t("otube.views_label"),v:fmt(views),i:"👁"},
                        {l:t("otube.income_label"),v:`${Number(rev).toLocaleString()} so'm`,i:"💰"},
                        {l:t("otube.subscribers_label"),v:"1.2K",i:"👥"},
                      ].map(s=>(
                        <div key={s.l} className="p-2.5 text-center"
                          style={{borderRadius:12,background:"rgba(0,0,0,0.3)"}}>
                          <div style={{fontSize:16,marginBottom:2}}>{s.i}</div>
                          <div style={{fontSize:12,fontWeight:700,color:T.cyan}}>{s.v}</div>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SecHead>{t("otube.creator_tab")}</SecHead>
                  <TRow icon="🎥" label={t("otube.creator_tab")} sub={t("otube.creator_sub")}
                    on={monetize.creatorMode} onToggle={()=>sM("creatorMode",!monetize.creatorMode)}/>

                  <SecHead>{t("otube.revenue_sources")}</SecHead>
                  <TRow icon="📢" label={t("otube.ads")} sub={t("otube.ads_sub")}
                    on={monetize.adsEnabled} onToggle={()=>sM("adsEnabled",!monetize.adsEnabled)}/>
                  <TRow icon="⭐" label={t("otube.super_thanks")} sub={t("otube.super_thanks_sub")}
                    on={monetize.superThanks} onToggle={()=>sM("superThanks",!monetize.superThanks)}/>
                  <TRow icon="👑" label={t("otube.membership")} sub={t("otube.membership_sub")}
                    on={monetize.membershipEnabled} onToggle={()=>sM("membershipEnabled",!monetize.membershipEnabled)}/>

                  <SecHead>{t("otube.min_support")}</SecHead>
                  <div className="grid grid-cols-2 gap-2">
                    {(["500","2000","10000","50000"] as const).map(d=>(
                      <button key={d} onClick={()=>sM("donation",d)}
                        className="py-2.5 px-3 flex items-center justify-between"
                        style={{borderRadius:10,
                          background:monetize.donation===d?`${T.orange}22`:"rgba(255,255,255,0.05)",
                          boxShadow:monetize.donation===d?`0 0 0 1.5px ${T.orange}55`:"0 0 0 1px rgba(255,255,255,0.08)"}}>
                        <span style={{fontSize:13,fontWeight:600,
                          color:monetize.donation===d?T.orange:"rgba(255,255,255,0.45)"}}>
                          {Number(d)>=1000?`${Number(d)/1000}K`:d} so'm
                        </span>
                        {monetize.donation===d&&<Check style={{width:13,height:13,color:T.orange}}/>}
                      </button>
                    ))}
                  </div>

                  {monetize.membershipEnabled && (
                    <>
                      <SecHead>A'zolik darajalari</SecHead>
                      {[
                        {n:"BRONZA",p:"9 900",c:"#cd7f32",pk:"Maxsus badge"},
                        {n:"KUMUSH",p:"29 900",c:"#c0c0c0",pk:"Badge + imtiyozlar"},
                        {n:"OLTIN", p:"99 900",c:"#ffd700",pk:"To'liq eksklyuziv"},
                      ].map(tier=>(
                        <div key={tier.n} className="flex items-center gap-3 py-2.5 px-3 mb-1.5"
                          style={{borderRadius:12,background:"rgba(0,0,0,0.3)",
                            boxShadow:`0 0 0 1px ${tier.c}22`}}>
                          <div style={{width:32,height:32,flexShrink:0,borderRadius:"50%",
                            background:`${tier.c}18`,boxShadow:`0 0 0 1.5px ${tier.c}44`,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Star style={{width:13,height:13,fill:tier.c,color:tier.c}}/>
                          </div>
                          <div className="flex-1">
                            <p style={{fontSize:11,fontWeight:900,color:"rgba(255,255,255,0.85)",letterSpacing:"0.08em"}}>{tier.n}</p>
                            <p style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{tier.pk}</p>
                          </div>
                          <span style={{fontSize:11,fontWeight:900,color:tier.c}}>{tier.p} so'm/oy</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Payout info */}
                  <div className="mt-3 p-3.5"
                    style={{borderRadius:12,background:"rgba(255,255,255,0.04)"}}>
                    <p style={{fontSize:10,color:"rgba(255,255,255,0.38)",lineHeight:1.7}}>
                      Min: 100 000 so'm. OlCha Pay orqali har oyning 15-sanasida chiqariladi.
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
/* Glowing dot label                                       */
/* ─────────────────────────────────────────────────────── */
function ChBadge({ n: _n, color=T.cyan }: { n:string; color?:string }) {
  return (
    <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
      background:color,boxShadow:`0 0 12px ${color}, 0 0 5px ${color}`}}/>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Channel row — real follow (redesigned)                  */
/* ─────────────────────────────────────────────────────── */
function ChannelRow({ author, idx }: { author: Reel["author"]; idx: number }) {
  const COLORS = [T.cyan, T.orange, T.violet, "#00ff88", "#ff2d55"];
  const col = COLORS[idx % COLORS.length];
  const [subbed, setSubbed] = useState(() => getFollowState(author.id, author.isFollowing));
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const followMut = useFollowUser({
    mutation: {
      onMutate: () => {
        const next = !getFollowState(author.id, author.isFollowing);
        setFollowState(author.id, next);
        setSubbed(next);
      },
      onSuccess: (data) => {
        setFollowState(author.id, data.following);
        setSubbed(data.following);
        qc.invalidateQueries({ queryKey: ["/api/reels"] });
      },
      onError: () => {
        const prev = getFollowState(author.id, author.isFollowing);
        setFollowState(author.id, !prev);
        setSubbed(!prev);
      },
    },
  });
  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${author.id}`);
  }, [author.id, navigate]);
  return (
    <motion.div className="flex items-center gap-3 mb-3"
      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      transition={{delay:idx*0.06,type:"spring",damping:24}}
      style={{padding:"12px 14px",
        background:"rgba(255,255,255,0.028)",
        backdropFilter:"blur(12px)",
        borderRadius:16,
        boxShadow:`0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)`}}>
      {/* Circular avatar — clickable → profile */}
      <div onClick={goToProfile} className="cursor-pointer"
        style={{width:44,height:44,flexShrink:0,overflow:"hidden",
          borderRadius:"50%",
          background:`radial-gradient(circle at 30% 30%, hsl(${idx*65}deg 60%,35%), hsl(${idx*65}deg 40%,12%))`,
          boxShadow:`0 0 0 2px ${col}44, 0 0 20px ${col}22`,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
        {author.avatarUrl
          ? <img src={author.avatarUrl} alt="" className="w-full h-full object-cover"/>
          : <span style={{fontSize:17,fontWeight:900,color:"white"}}>{(author.displayName||author.username||"?")[0]}</span>}
      </div>
      {/* Name — clickable → profile */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={goToProfile}>
        <p style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>
          {author.displayName}
        </p>
        <p style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:1}}>
          {fmt(author.followersCount ?? 0)} obunachi
        </p>
      </div>
      <motion.button whileTap={{scale:0.9}}
        onClick={()=>followMut.mutate({ id: author.id })}
        disabled={followMut.isPending}
        style={{padding:"7px 16px",borderRadius:99,
          background: subbed?"rgba(255,255,255,0.08)":`${col}22`,
          border:`1px solid ${col}${subbed?"44":"66"}`,
          boxShadow: subbed?"none":`0 0 14px ${col}33`,
          opacity: followMut.isPending ? 0.6 : 1}}>
        <span style={{fontSize:10,fontWeight:700,color:subbed?"rgba(255,255,255,0.4)":col}}>
          {subbed?"✓ Obuna":"··· Obuna"}
        </span>
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Hero cinematic card                                     */
/* ─────────────────────────────────────────────────────── */
function HeroCard({ video, onPlay }: { video:Reel; onPlay:()=>void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [quickTxt, setQuickTxt] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({x:0,y:0});

  const quickComment = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch(`/api/reels/${video.id}/comments`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ content }),
      });
      if (!r.ok) throw new Error("Izoh qo'shishda xatolik");
      return r.json() as Promise<ApiComment>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reel-comments", video.id] });
      setQuickTxt("");
    },
  });
  const onMouseMove = useCallback((e:React.MouseEvent<HTMLDivElement>)=>{
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({x: py * -7, y: px * 7});
  },[]);
  const onMouseLeave = useCallback(()=>setTilt({x:0,y:0}),[]);
  return (
    <motion.div ref={cardRef}
      className="relative cursor-pointer overflow-hidden"
      initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
      transition={{type:"spring",damping:24}}
      style={{borderRadius:20,
        boxShadow:`0 0 60px rgba(0,229,255,0.1), 0 0 0 1px rgba(255,255,255,0.07)`,
        transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition:"transform 0.18s ease-out"}}
      whileTap={{scale:0.985}} onClick={onPlay}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
    >
      {/* Expand button */}
      <motion.button whileTap={{scale:0.8}}
        onClick={e=>{e.stopPropagation();setExpanded(x=>!x);}}
        className="absolute top-3 right-3 z-10 flex items-center justify-center"
        style={{width:32,height:32,borderRadius:"50%",
          background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)"}}>
        {expanded
          ? <Minimize2 style={{width:13,height:13,color:"rgba(255,255,255,0.7)"}}/>
          : <Maximize2 style={{width:13,height:13,color:"rgba(255,255,255,0.7)"}}/>}
      </motion.button>

      {/* Thumbnail — info panel lives INSIDE so it doesn't overlap Watch Party row */}
      <div style={{aspectRatio:expanded?"4/3":"16/9",position:"relative",transition:"all 0.4s cubic-bezier(.4,0,.2,1)",overflow:"hidden"}}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.caption} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#0d0028,#000510)"}}>
              <Film className="w-14 h-14 text-white/8"/>
            </div>}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)"}}/>
        {/* Play button — round */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileTap={{scale:0.88}}
            style={{width:64,height:64,borderRadius:"50%",
              background:"rgba(0,0,0,0.45)",backdropFilter:"blur(12px)",
              boxShadow:`0 0 0 1.5px rgba(255,255,255,0.25), 0 0 40px rgba(0,229,255,0.25)`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Play style={{width:22,height:22,fill:"white",color:"white",marginLeft:3}}/>
          </motion.div>
        </div>
        {/* Live dot */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5"
          style={{borderRadius:99,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(12px)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#ff3b30",
            boxShadow:"0 0 8px #ff3b30"}}/>
          <span style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.85)",letterSpacing:"0.06em"}}>LIVE</span>
        </div>

        {/* Info panel — inside thumbnail so Watch Party row never overlaps */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          <h2 style={{color:"white",fontWeight:900,fontSize:14,lineHeight:1.3,
            marginBottom:6,textShadow:"0 2px 8px rgba(0,0,0,0.9)"}}>
            {video.caption||t("otube.caption_default")}
          </h2>
          <div className="flex items-center gap-2">
            {video.author.avatarUrl && (
              <div style={{position:"relative",flexShrink:0,width:32,height:32}}>
                <svg width={32} height={32}
                  style={{position:"absolute",top:0,left:0,zIndex:1,transform:"rotate(-90deg)"}}>
                  <circle cx={16} cy={16} r={13.5} stroke="rgba(255,255,255,0.07)" strokeWidth={2} fill="none"/>
                  <motion.circle cx={16} cy={16} r={13.5} stroke={T.cyan} strokeWidth={2} fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*13.5}`}
                    initial={{strokeDashoffset:`${2*Math.PI*13.5}`}}
                    animate={{strokeDashoffset:`${2*Math.PI*13.5*0.27}`}}
                    transition={{duration:2,ease:"easeOut",delay:0.5}}/>
                </svg>
                <img src={video.author.avatarUrl} alt=""
                  style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",
                    position:"absolute",top:4,left:4,zIndex:2}}/>
                <div style={{position:"absolute",bottom:-2,right:-2,zIndex:3,
                  width:12,height:12,borderRadius:"50%",background:T.cyan,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:6,fontWeight:900,color:"#000",boxShadow:`0 0 6px ${T.cyan}88`}}>7</div>
              </div>
            )}
            <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",flex:1}} className="truncate">
              {video.author.displayName}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye style={{width:10,height:10,color:T.cyan+"88"}}/>
                <span style={{fontSize:10,color:T.cyan+"88",fontFamily:"monospace"}}>{fmt(video.viewsCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart style={{width:10,height:10,color:T.orange+"88"}}/>
                <span style={{fontSize:10,color:T.orange+"88",fontFamily:"monospace"}}>{fmt(video.likesCount)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom accent line — also inside thumbnail */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{background:`linear-gradient(90deg,${T.cyan},${T.violet},transparent)`}}/>
      </div>

      {/* Watch Party + Live Pulse row */}
      <div className="flex gap-2 p-3 pt-2" onClick={e=>e.stopPropagation()}
        style={{background:"rgba(0,0,0,0.35)"}}>
        <WatchPartyBtn videoId={video.id}/>
        <LivePulse count={video.viewsCount}/>
      </div>

      {/* Quick comment input row */}
      {user && (
        <div className="flex items-center gap-2 px-3 py-2" onClick={e=>e.stopPropagation()}
          style={{background:"rgba(0,0,0,0.22)",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{width:26,height:26,flexShrink:0,borderRadius:"50%",overflow:"hidden",
            background:"linear-gradient(135deg,rgba(0,229,255,0.2),rgba(157,0,255,0.2))",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
              : <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>
                  {(user.displayName||user.username||"S")[0].toUpperCase()}
                </span>}
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5"
            style={{borderRadius:99,background:"rgba(255,255,255,0.06)",
              boxShadow:"0 0 0 1px rgba(255,255,255,0.08)"}}>
            <input
              value={quickTxt}
              onChange={e=>setQuickTxt(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&quickTxt.trim()){quickComment.mutate(quickTxt.trim());}}}
              placeholder={t("otube.quick_comment_ph")}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/20"
              style={{fontSize:11,fontFamily:"inherit"}}/>
            {quickTxt && (
              <motion.button whileTap={{scale:0.8}}
                onClick={()=>{if(quickTxt.trim())quickComment.mutate(quickTxt.trim());}}
                disabled={quickComment.isPending}
                style={{color:quickComment.isPending?"rgba(0,229,255,0.3)":T.cyan,fontSize:15,lineHeight:1}}>
                {quickComment.isPending?"…":"➤"}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* AI Smart Chapters strip */}
      <div className="px-3 pb-3" onClick={e=>e.stopPropagation()}
        style={{background:"rgba(0,0,0,0.2)"}}>
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{scale:0.8}}
            onClick={e=>{e.stopPropagation();setChaptersOpen(o=>!o);}}
            style={{width:18,height:18,borderRadius:6,display:"flex",alignItems:"center",
              justifyContent:"center",flexShrink:0,
              background:chaptersOpen?"rgba(0,229,255,0.18)":"rgba(0,229,255,0.07)",
              border:`1px solid ${chaptersOpen?T.cyan+"66":"rgba(0,229,255,0.15)"}`,
              transition:"all 0.2s"}}>
            <Brain style={{width:9,height:9,color:chaptersOpen?T.cyan:`${T.cyan}70`}}/>
          </motion.button>
          <AnimatePresence>
            {chaptersOpen && (
              <motion.div
                initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-6}}
                transition={{duration:0.18}}
                className="flex-1 flex flex-col gap-0.5">
                <div className="flex gap-1">
                  {([
                    {label:"Kirish",      col:T.cyan,    flex:2},
                    {label:"Asosiy",      col:T.orange,  flex:5},
                    {label:"Kulminatsiya",col:"#ff2d55",  flex:4},
                    {label:"Xulosa",      col:T.violet,  flex:2},
                  ] as const).map((ch,i)=>(
                    <motion.div key={i}
                      initial={{scaleX:0}} animate={{scaleX:1}}
                      transition={{delay:i*0.06,type:"spring",damping:20}}
                      style={{flex:ch.flex,height:3,borderRadius:99,
                        background:ch.col,opacity:0.65,transformOrigin:"left center"}}/>
                  ))}
                </div>
                <div className="flex">
                  {([
                    {label:"Kirish",      col:T.cyan,    flex:2},
                    {label:"Asosiy",      col:T.orange,  flex:5},
                    {label:"Kulminatsiya",col:"#ff2d55",  flex:4},
                    {label:"Xulosa",      col:T.violet,  flex:2},
                  ] as const).map((ch,i)=>(
                    <div key={i} style={{flex:ch.flex,overflow:"hidden"}}>
                      <span style={{fontSize:6,color:ch.col,fontWeight:700,opacity:0.8,
                        whiteSpace:"nowrap"}}>{ch.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* Watch Party quick-join button */
function WatchPartyBtn({ videoId }: { videoId: number }) {
  const { t } = useTranslation();
  const [joined, setJoined] = useState(false);
  const [partyCount, setPartyCount] = useState(()=>3+Math.floor(videoId%12));
  return (
    <motion.button whileTap={{scale:0.88}}
      onClick={()=>{setJoined(j=>!j);setPartyCount(c=>joined?c-1:c+1);}}
      className="flex items-center gap-1.5 px-3 py-1.5 flex-1"
      style={{borderRadius:99,
        background:joined?`rgba(168,85,247,0.2)`:"rgba(255,255,255,0.06)",
        boxShadow:joined?`0 0 0 1px rgba(168,85,247,0.5), 0 0 16px rgba(168,85,247,0.2)`:"0 0 0 1px rgba(255,255,255,0.08)"}}>
      <Users style={{width:11,height:11,color:joined?"#a855f7":"rgba(255,255,255,0.45)"}}/>
      <span style={{fontSize:10,fontWeight:600,color:joined?"#a855f7":"rgba(255,255,255,0.5)"}}>
        {joined?`👥 ${t("otube.watch_joined")}`:t("otube.watch_join")}
      </span>
      {joined ? (
        <motion.span
          animate={{opacity:[0.3,1,0.3]}} transition={{duration:1.1,repeat:Infinity}}
          style={{fontSize:11,color:"rgba(168,85,247,0.7)",marginLeft:"auto",letterSpacing:"0.12em"}}>
          ···
        </motion.span>
      ) : (
        <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:"monospace",marginLeft:"auto"}}>
          {partyCount}
        </span>
      )}
    </motion.button>
  );
}

/* Live pulse — animated live viewer count */
function LivePulse({ count }: { count: number }) {
  const { t } = useTranslation();
  const base = Math.max(10, count);
  const [live, setLive] = useState(base);
  useEffect(()=>{
    const t = setInterval(()=>{
      setLive(base + Math.floor((Math.random()-0.4)*8));
    }, 2800);
    return ()=>clearInterval(t);
  },[base]);
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5"
      style={{borderRadius:99,background:"rgba(255,59,48,0.1)",
        boxShadow:"0 0 0 1px rgba(255,59,48,0.25)"}}>
      <motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:1.2,repeat:Infinity}}
        style={{width:5,height:5,borderRadius:"50%",background:"#ff3b30",
          boxShadow:"0 0 6px #ff3b30"}}/>
      <span style={{fontSize:9.5,fontWeight:600,color:"rgba(255,100,80,0.9)",fontFamily:"monospace"}}>
        {live.toLocaleString()} {t("otube.live_count")}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Trending list — vertical rank                           */
/* ─────────────────────────────────────────────────────── */
/* TrendRow — NEXUS PULSE CARD: cinematic vertical broadcast window */
function TrendRow({ video, onPlay, idx }:
  { video:Reel; onPlay:()=>void; idx:number }) {
  const AURORA = [T.aurora, "#ff4500", "#ff2d55", T.pulse, "#a855f7", T.gold];
  const col = AURORA[idx % AURORA.length];
  const vel = 8+((idx*13+7)%41);
  const isHot = vel > 30;
  return (
    <motion.div
      initial={{opacity:0,x:24,scale:0.9}} animate={{opacity:1,x:0,scale:1}}
      transition={{delay:idx*0.07,type:"spring",damping:20,stiffness:220}}
      className="flex-shrink-0 cursor-pointer relative"
      style={{width:148,borderRadius:20,overflow:"hidden",
        boxShadow:`0 0 0 1px ${col}22, 0 8px 32px rgba(0,0,0,0.7), 0 0 40px ${col}10`}}
      whileTap={{scale:0.91}} onClick={onPlay}
    >
      {/* Thumbnail — fills entire card, no border visible */}
      <div style={{aspectRatio:"3/4",position:"relative",overflow:"hidden"}}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"
              style={{transform:"scale(1.04)"}}/>
          : <div className="w-full h-full"
              style={{background:`linear-gradient(175deg,${col}28,#000010)`}}/>}

        {/* Heavy cinema gradient — bottom 2/3 dark */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`linear-gradient(to top,rgba(0,0,5,0.98) 0%,rgba(0,0,5,0.5) 40%,transparent 75%)`}}/>
        {/* Top letterbox — cinema feel */}
        <div className="absolute top-0 inset-x-0 h-[3px]"
          style={{background:`linear-gradient(90deg,transparent,${col},transparent)`}}/>

        {/* HOT signal badge */}
        {isHot && (
          <motion.div className="absolute top-3 right-3"
            animate={{opacity:[0.7,1,0.7]}} transition={{duration:1.2,repeat:Infinity}}>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5"
              style={{borderRadius:99,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",
                boxShadow:"0 0 0 1px rgba(255,45,85,0.6), 0 0 12px rgba(255,45,85,0.3)"}}>
              <Flame style={{width:7,height:7,fill:"#ff2d55",color:"#ff2d55"}}/>
              <span style={{fontSize:7,fontWeight:900,color:"#ff2d55",letterSpacing:"0.08em"}}>HOT</span>
            </div>
          </motion.div>
        )}

        {/* Rank — floating number with color glow */}
        <div className="absolute top-3 left-3">
          <span style={{fontSize:28,fontWeight:900,color:col,lineHeight:1,
            textShadow:`0 0 20px ${col}, 0 0 40px ${col}66`,fontFamily:"monospace",
            opacity:0.9}}>
            {idx+1}
          </span>
        </div>

        {/* Bottom: title + momentum */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p style={{fontSize:11,fontWeight:800,color:"white",lineHeight:1.3,
            marginBottom:6,textShadow:"0 1px 12px rgba(0,0,0,0.9)"}}
            className="line-clamp-2">{video.caption||"Video"}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Eye style={{width:8,height:8,color:"rgba(255,255,255,0.4)"}}/>
              <span style={{fontSize:8,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>
                {fmt(video.viewsCount)}
              </span>
            </div>
            {/* Velocity signal */}
            <div className="flex items-center gap-0.5 px-1.5 py-0.5"
              style={{borderRadius:99,background:`${col}18`,boxShadow:`0 0 0 1px ${col}44`}}>
              <ArrowUp style={{width:7,height:7,color:col}}/>
              <span style={{fontSize:7.5,fontWeight:800,color:col,fontFamily:"monospace"}}>{vel}%</span>
            </div>
          </div>
        </div>

        {/* Color accent bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-[1px]"
          style={{background:`linear-gradient(90deg,transparent,${col}88,transparent)`}}/>
        {/* Dummy old block closer — see below */}
        {(()=>{
          const _dur = `${1+(video.id%12)}:${String((video.id*13)%60).padStart(2,"0")}`;
          return (
            <div className="absolute bottom-[44px] right-3 px-1.5 py-0.5"
              style={{borderRadius:4,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(4px)"}}>
              <span style={{fontSize:7.5,fontWeight:700,color:"rgba(255,255,255,0.55)",fontFamily:"monospace"}}>
                {_dur}</span>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Discovery card — cinematic, no info box                 */
/* ─────────────────────────────────────────────────────── */
function BentoCard({ video, onPlay, wide=false, idx=0 }:
  { video:Reel; onPlay:()=>void; wide?:boolean; idx?:number }) {
  const qc = useQueryClient();
  const [liked,    setLiked]    = useState(video.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(video.likesCount ?? 0);
  const [showReact, setShowReact] = useState(false);
  const [myReact,   setMyReact]   = useState<string|null>(null);
  const pressRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const ACCENT = [T.cyan, T.orange, T.violet, "#00ff88", "#ff2d55"];
  const accent = ACCENT[idx % ACCENT.length];
  const isNew = idx < 2;
  const likeMut = useLikeReel({
    mutation: {
      onMutate: () => {
        setLiked(l => !l);
        setLikesCount(c => liked ? Math.max(0,c-1) : c+1);
      },
      onSuccess: (data) => {
        setLiked(data.liked);
        setLikesCount(data.likesCount);
        qc.invalidateQueries({ queryKey: ["/api/reels"] });
      },
    },
  });
  const ar = wide ? "16/9" : idx%3===0 ? "3/4" : "16/9";
  return (
    <motion.div
      initial={{opacity:0,y:18,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
      transition={{delay:idx*0.05,type:"spring",damping:22,stiffness:200}}
      className={`cursor-pointer relative ${wide?"col-span-2":""}`}
      style={{borderRadius:16,
        boxShadow:`0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), 0 0 48px ${accent}14`}}
      whileTap={{scale:0.96}} onClick={onPlay}
      onPointerDown={()=>{pressRef.current=setTimeout(()=>setShowReact(r=>!r),500);}}
      onPointerUp={()=>{if(pressRef.current)clearTimeout(pressRef.current);}}
      onPointerLeave={()=>{if(pressRef.current)clearTimeout(pressRef.current);}}
    >
    {/* Reaction burst overlay — floats above card */}
    <AnimatePresence>
      {showReact && (
        <motion.div
          initial={{opacity:0,y:10,scale:0.85}} animate={{opacity:1,y:0,scale:1}}
          exit={{opacity:0,y:10,scale:0.85}}
          transition={{type:"spring",damping:20}}
          className="absolute flex gap-1.5 justify-center"
          style={{bottom:"calc(100% + 6px)",left:0,right:0,zIndex:30,padding:"0 6px"}}
          onClick={e=>e.stopPropagation()}>
          {["🔥","❤️","😮","😂","👏","⚡"].map((r,i)=>(
            <motion.button key={r}
              initial={{scale:0,y:10}} animate={{scale:1,y:0}}
              transition={{delay:i*0.04,type:"spring",damping:14,stiffness:400}}
              whileTap={{scale:0.7}}
              onClick={e=>{e.stopPropagation();setMyReact(r);setShowReact(false);}}
              style={{width:34,height:34,borderRadius:"50%",fontSize:18,
                background:myReact===r?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.72)",
                backdropFilter:"blur(16px)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:myReact===r?"0 0 16px rgba(255,255,255,0.25)":"0 2px 8px rgba(0,0,0,0.5)"}}>
              {r}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
      {/* Full-bleed image — NO bottom info box */}
      <div style={{aspectRatio:ar,position:"relative",overflow:"hidden",borderRadius:16}}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"
              style={{transition:"transform 0.4s"}}/>
          : <div className="w-full h-full flex items-center justify-center"
              style={{background:`linear-gradient(135deg,${accent}18,#000)`}}>
              <Film style={{width:wide?32:20,height:wide?32:20,color:"rgba(255,255,255,0.08)"}}/>
            </div>}

        {/* Deep gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:"linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.15) 50%,transparent 100%)"}}/>

        {/* Top left: NEW badge or my reaction */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
          {isNew && (
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.2,type:"spring",damping:14}}
              className="flex items-center gap-1 px-2 py-0.5"
              style={{borderRadius:99,background:"linear-gradient(90deg,#00ff88,#00bbaa)",
                boxShadow:"0 0 10px rgba(0,255,136,0.5)"}}>
              <Sparkles style={{width:7,height:7,color:"#000"}}/>
              <span style={{fontSize:7.5,fontWeight:900,color:"#000",letterSpacing:"0.06em"}}>YANGI</span>
            </motion.div>
          )}
          {myReact && (
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",damping:14}}
              style={{width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.6)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                backdropFilter:"blur(8px)"}}>
              {myReact}
            </motion.div>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-9 right-2 px-1.5 py-0.5"
          style={{borderRadius:5,background:"rgba(0,0,0,0.78)",backdropFilter:"blur(4px)"}}>
          <span style={{fontSize:8,fontWeight:700,color:"white",fontFamily:"monospace"}}>
            {2+(video.id%18)}:{String((video.id*7)%60).padStart(2,"0")}
          </span>
        </div>

        {/* Signal Score — single chip only */}
        <div className="absolute top-2.5 right-2.5">
          {(()=>{
            const score = Math.min(99, Math.round(
              Math.log10(Math.max(2, video.viewsCount)) * 14 +
              (video.likesCount / Math.max(1, video.viewsCount)) * 120
            ));
            const col = score > 75 ? "#ff2d55" : score > 50 ? T.orange : T.cyan;
            return (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5"
                style={{borderRadius:99,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",
                  boxShadow:`0 0 0 1px ${col}44`}}>
                <Zap style={{width:7,height:7,fill:col,color:col}}/>
                <span style={{fontSize:8,fontWeight:700,color:col,fontFamily:"monospace"}}>{score}</span>
              </div>
            );
          })()}
        </div>

        {/* Bottom: title + author + like */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p style={{fontSize:wide?13:11.5,fontWeight:700,color:"white",lineHeight:1.35,
            marginBottom:5,textShadow:"0 1px 8px rgba(0,0,0,0.8)"}}
            className={wide?"line-clamp-2":"line-clamp-2"}>{video.caption||"Video"}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 truncate max-w-[100px]">
              <span style={{fontSize:9,color:"rgba(255,255,255,0.4)"}} className="truncate">
                {video.author.displayName}
              </span>
              {/* Verified badge */}
              {(video.viewsCount > 300 || video.author.id % 3 === 0) && (
                <ShieldCheck style={{width:8,height:8,color:"#ffd700",flexShrink:0}}/>
              )}
            </div>
            <motion.button whileTap={{scale:0.65}}
              onClick={e=>{e.stopPropagation();likeMut.mutate({id:video.id});}}
              className="flex items-center gap-1 px-2 py-1"
              style={{borderRadius:99,background:liked?`${T.orange}22`:"rgba(0,0,0,0.4)",backdropFilter:"blur(8px)"}}>
              <Heart style={{width:9,height:9,fill:liked?T.orange:"none",
                color:liked?T.orange:"rgba(255,255,255,0.4)"}}/>
              <span style={{fontSize:8,fontFamily:"monospace",
                color:liked?T.orange:"rgba(255,255,255,0.35)"}}>
                {fmt(likesCount)}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Accent glow bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-[1px]"
          style={{background:`linear-gradient(90deg,transparent,${accent}66,transparent)`}}/>
      </div>{/* end aspect ratio container */}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Social Gravity Ticker — live online count               */
/* ─────────────────────────────────────────────────────── */
function SocialTicker() {
  const [count, setCount] = useState(247);
  useEffect(()=>{
    const t = setInterval(()=>setCount(c=>Math.max(180,c+Math.floor((Math.random()-0.38)*18))),3200);
    return ()=>clearInterval(t);
  },[]);
  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1.5"
      style={{borderRadius:99,background:"rgba(255,59,48,0.1)",
        boxShadow:"0 0 0 1px rgba(255,59,48,0.22)"}}>
      <motion.div
        animate={{opacity:[1,0.2,1],scale:[1,1.3,1]}}
        transition={{duration:1.3,repeat:Infinity}}
        style={{width:5,height:5,borderRadius:"50%",background:"#ff3b30",
          boxShadow:"0 0 6px #ff3b30"}}/>
      <motion.span
        key={count}
        initial={{y:-6,opacity:0}} animate={{y:0,opacity:1}}
        transition={{duration:0.2}}
        style={{fontSize:9.5,fontWeight:700,color:"rgba(255,100,80,0.9)",fontFamily:"monospace"}}>
        {count.toLocaleString()}
      </motion.span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Streak Banner — haftalik watch streak + XP              */
/* ─────────────────────────────────────────────────────── */
function StreakBanner() {
  const [xp, setXp] = useState(1240);
  const [visible, setVisible] = useState(true);
  useEffect(()=>{
    const xpT = setInterval(()=>setXp(x=>x+(Math.random()>0.7?10:0)),4000);
    const hideT = setTimeout(()=>setVisible(false), 3500);
    return ()=>{ clearInterval(xpT); clearTimeout(hideT); };
  },[]);
  const dots = [true,true,true,true,true,true,false];
  if (!visible) return null;
  return (
    <motion.div
      initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}}
      exit={{opacity:0,y:-8,scale:0.96}}
      transition={{type:"spring",damping:22,delay:0.2}}
      className="mx-3 mb-4 px-4 py-3 flex items-center gap-3"
      style={{borderRadius:14,
        background:"rgba(255,107,0,0.09)",
        boxShadow:"0 0 0 1px rgba(255,107,0,0.2)"}}>
      {/* Flame */}
      <motion.span
        animate={{scale:[1,1.15,1]}} transition={{duration:1.8,repeat:Infinity}}
        style={{fontSize:22,lineHeight:1,flexShrink:0}}>🔥</motion.span>

      {/* Streak info */}
      <div className="flex-1 min-w-0">
        <div style={{fontSize:12,fontWeight:900,color:"white",marginBottom:4}}>
          7 kunlik streak
        </div>
        {/* 7 dot indicators */}
        <div className="flex gap-1.5">
          {dots.map((active,i)=>(
            <motion.div key={i}
              initial={{scale:0}} animate={{scale:1}}
              transition={{delay:i*0.04,type:"spring",damping:16}}
              style={{width:active?20:14,height:6,borderRadius:99,
                background:active
                  ?`linear-gradient(90deg,${T.orange},${T.violet})`
                  :"rgba(255,255,255,0.1)",
                boxShadow:active?`0 0 8px ${T.orange}66`:"none",
                transition:"all 0.3s"}}/>
          ))}
        </div>
      </div>

      {/* XP badge */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 flex-shrink-0"
        style={{borderRadius:99,background:"rgba(255,107,0,0.18)",
          boxShadow:"0 0 0 1px rgba(255,107,0,0.3)"}}>
        <Trophy style={{width:9,height:9,color:T.orange}}/>
        <motion.span
          key={xp}
          initial={{y:-4,opacity:0}} animate={{y:0,opacity:1}}
          transition={{duration:0.25}}
          style={{fontSize:10,fontWeight:900,color:T.orange,fontFamily:"monospace"}}>
          {xp.toLocaleString()}
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Continue Watching row — videos with progress bars       */
/* ─────────────────────────────────────────────────────── */
function ContinueRow({ videos, onPlay }: { videos:Reel[]; onPlay:(v:Reel)=>void }) {
  const { t } = useTranslation();
  if (!videos.length) return null;
  const items = videos.slice(0,5);
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5"
          style={{borderRadius:99,background:"rgba(0,229,255,0.1)",
            boxShadow:`0 0 0 1px rgba(0,229,255,0.25)`}}>
          <ListVideo style={{width:10,height:10,color:T.cyan}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.cyan,letterSpacing:"0.04em"}}>
            {t("otube.continue_watching")}
          </span>
        </div>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${T.cyan}33,transparent)`}}/>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
          {items.length} ta
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-3 px-3 pb-2" style={{scrollbarWidth:"none"}}>
        {items.map((v,i)=>{
          const pct = 15 + ((v.id * 17 + i * 31) % 72); // 15–87% deterministic
          const mins = 2 + (v.id % 18);
          const secs = (v.id * 7) % 60;
          const durStr = `${mins}:${String(secs).padStart(2,"0")}`;
          const watchedStr = fmtTime((pct/100) * (mins*60+secs));
          return (
            <motion.div key={v.id}
              initial={{opacity:0,x:18}} animate={{opacity:1,x:0}}
              transition={{delay:i*0.07,type:"spring",damping:22}}
              className="flex-shrink-0 cursor-pointer"
              style={{width:164,borderRadius:14,overflow:"hidden",
                boxShadow:`0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`}}
              whileTap={{scale:0.93}} onClick={()=>onPlay(v)}>
              <div style={{aspectRatio:"16/9",position:"relative",overflow:"hidden"}}>
                {v.thumbnailUrl
                  ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full"
                      style={{background:`linear-gradient(135deg,${T.cyan}14,#000)`}}/>}
                <div className="absolute inset-0 pointer-events-none"
                  style={{background:"linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%)"}}/>
                {/* Progress bar overlay */}
                <div className="absolute bottom-0 inset-x-0 h-[3px]"
                  style={{background:"rgba(255,255,255,0.12)"}}>
                  <motion.div
                    initial={{width:0}} animate={{width:`${pct}%`}}
                    transition={{delay:0.4+i*0.1,duration:0.9,ease:"easeOut"}}
                    style={{height:"100%",borderRadius:99,
                      background:`linear-gradient(90deg,${T.cyan},${T.violet})`}}/>
                </div>
                {/* Duration */}
                <div className="absolute bottom-1.5 right-2 flex items-center gap-0.5">
                  <span style={{fontSize:8,fontFamily:"monospace",color:"rgba(255,255,255,0.55)"}}>
                    {watchedStr} / {durStr}
                  </span>
                </div>
              </div>
              <div style={{background:"rgba(8,2,15,0.95)",padding:"8px 10px"}}>
                <p style={{fontSize:10.5,fontWeight:600,color:"rgba(255,255,255,0.8)",
                  lineHeight:1.3}} className="line-clamp-1">{v.caption||"Video"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>
                    {v.author.displayName}
                  </span>
                  <span style={{fontSize:8,fontWeight:700,color:T.cyan,fontFamily:"monospace"}}>
                    {pct}%
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────── */
/* Modal base — full-screen bottom sheet                   */
/* ─────────────────────────────────────────────────────── */
function ModalSheet({ children, onClose, title, accent = T.cyan, rightSlot }:
  { children: React.ReactNode; onClose:()=>void; title:string; accent?:string; rightSlot?:React.ReactNode }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[10000]"
      style={{background:"rgba(0,0,8,0.94)",backdropFilter:"blur(24px)"}}>
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose}/>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:30,stiffness:320}}
        className="absolute bottom-0 left-0 right-0"
        style={{background:"linear-gradient(180deg,#0b0120 0%,#06000f 100%)",
          borderRadius:"24px 24px 0 0",
          border:`1px solid ${accent}30`,
          boxShadow:`0 -20px 60px ${accent}12, 0 -1px 0 ${accent}22`,
          maxHeight:"94vh",overflowY:"auto"}}>
        {/* Animated accent line */}
        <div style={{height:3,background:`linear-gradient(90deg,transparent,${accent},transparent)`,
          borderRadius:"24px 24px 0 0",opacity:0.6}}/>
        <div className="flex justify-center pt-2 pb-1">
          <div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.18)"}}/>
        </div>
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <button onClick={onClose}
            style={{width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.08)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ChevronLeft style={{width:16,height:16,color:"rgba(255,255,255,0.55)"}}/>
          </button>
          <div className="flex flex-col items-center">
            <span style={{fontSize:15,fontWeight:900,color:"white",letterSpacing:"0.03em"}}>{title}</span>
          </div>
          <div style={{width:34}}>{rightSlot}</div>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Upload Modal — real file upload + createReel v2        */
/* ─────────────────────────────────────────────────────── */
const AI_TITLE_SUGGESTIONS = [
  "OlCha'dagi eng zo'r moment 🔥","Buni ko'rmasangiz bo'lmaydi!","Signal kuchli | OlCha",
  "Viral bo'ladigan video 🚀","OlCha NEXUS × Exclusive","Siz kutmagan narsa...",
];
const AI_TAG_SUGGESTIONS = ["olcha","viral","nexus","trending","signal","broadcast","exclusive","top"];

function UploadModal({ onClose }: { onClose: ()=>void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<0|1|2>(0);
  const [file, setFile] = useState<File|null>(null);
  const [thumbFile, setThumbFile] = useState<File|null>(null);
  const [thumbSrc, setThumbSrc] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [privacy, setPrivacy] = useState<"public"|"unlisted"|"private">("public");
  const [monetize, setMonetize] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle"|"uploading"|"creating"|"done"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef  = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const uploadUrlMut = useRequestUploadUrl();
  const createMut = useCreateReel({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({queryKey:["/api/reels"]}); setPhase("done"); },
      onError:   () => { setErrMsg("Video yaratishda xato"); setPhase("error"); },
    }
  });

  const handleFile = (f: File) => { setFile(f); setTitle(f.name.replace(/\.[^.]+$/,"").slice(0,60)); setStep(1); };
  const handleThumb = (f: File) => { setThumbFile(f); setThumbSrc(URL.createObjectURL(f)); };
  const addTag = (t: string) => { const v=t.trim().replace(/^#/,""); if(v&&!tagList.includes(v)) setTagList(p=>[...p,v]); setTagInput(""); };
  const aiSuggest = () => {
    setAiLoading(true);
    setTimeout(()=>{
      setTitle(AI_TITLE_SUGGESTIONS[Math.floor(Math.random()*AI_TITLE_SUGGESTIONS.length)]);
      setTagList(AI_TAG_SUGGESTIONS.slice(0,4+Math.floor(Math.random()*3)));
      setCaption("OlCha platformasida exclusive kontent. Signal kuchli — NEXUS BROADCAST. #OlCha #Viral");
      setAiLoading(false);
    }, 1400);
  };

  const handleSubmit = async () => {
    if (!file||!title.trim()||!user) return;
    setPhase("uploading"); setProgress(0); setErrMsg("");
    try {
      const req: UploadUrlRequest = {name:file.name,size:file.size,contentType:file.type};
      const {uploadURL,objectPath} = await uploadUrlMut.mutateAsync({data:req});
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => { if(e.lengthComputable) setProgress(Math.round(e.loaded/e.total*88)); };
      await new Promise<void>((res,rej)=>{
        xhr.open("PUT",uploadURL); xhr.setRequestHeader("Content-Type",file.type);
        xhr.onload=()=>xhr.status<300?res():rej(new Error("Upload failed"));
        xhr.onerror=()=>rej(new Error("Network error")); xhr.send(file);
      });
      setProgress(95); setPhase("creating");
      createMut.mutate({data:{
        authorId:user.id, videoUrl:`/api/storage/objects/${objectPath}`,
        caption:caption||title, tags:tagList, duration:0,
        thumbnailUrl: thumbSrc||undefined,
      }});
      setProgress(100);
    } catch(e:unknown) { setErrMsg(e instanceof Error?e.message:"Xato yuz berdi"); setPhase("error"); }
  };

  const PRIVACIES = [
    {id:"public",   label:t("otube.privacy_public"),   icon:"🌐", desc:t("otube.privacy_pub_desc")},
    {id:"unlisted", label:t("otube.privacy_unlisted"),  icon:"🔗", desc:t("otube.privacy_unl_desc")},
    {id:"private",  label:t("otube.privacy_private"),   icon:"🔒", desc:t("otube.privacy_prv_desc")},
  ] as const;

  return (
    <ModalSheet onClose={onClose} title={t("otube.upload_title")} accent={T.cyan}
      rightSlot={file && (
        <button onClick={aiSuggest} disabled={aiLoading}
          style={{width:34,height:34,borderRadius:10,background:"rgba(0,229,255,0.1)",
            border:`1px solid ${T.cyan}33`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Wand2 style={{width:14,height:14,color:aiLoading?"rgba(255,255,255,0.3)":T.cyan}}/>
        </button>
      )}>
      {aiLoading && (
        <div style={{margin:"0 20px 12px",padding:"10px 14px",borderRadius:12,
          background:"rgba(0,229,255,0.06)",border:`1px solid ${T.cyan}22`,
          display:"flex",alignItems:"center",gap:8}}>
          <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}>
            <Sparkles style={{width:14,height:14,color:T.cyan}}/>
          </motion.div>
          <span style={{fontSize:12,color:T.cyan}}>{t("otube.ai_analyzing")}</span>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-0 px-5 mb-4">
        {[t("otube.step_file"),t("otube.step_detail"),t("otube.step_settings_lbl")].map((s,i)=>(
          <React.Fragment key={i}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:24,height:24,borderRadius:"50%",fontSize:10,fontWeight:800,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:step>=i?T.cyan:"rgba(255,255,255,0.08)",
                color:step>=i?"#000":"rgba(255,255,255,0.3)"}}>
                {step>i?"✓":i+1}
              </div>
              <span style={{fontSize:8,color:step>=i?T.cyan:"rgba(255,255,255,0.3)",fontWeight:700}}>{s}</span>
            </div>
            {i<2&&<div style={{flex:1,height:1,background:step>i?T.cyan:"rgba(255,255,255,0.08)",margin:"0 4px 12px"}}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="px-5 pb-8 flex flex-col gap-4">
        {/* Step 0: File */}
        {step===0 && (
          <motion.div whileTap={{scale:0.98}} onClick={()=>fileRef.current?.click()}
            style={{borderRadius:16,border:`1.5px dashed rgba(0,229,255,0.3)`,
              background:"rgba(0,229,255,0.04)",padding:"32px 16px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:12,cursor:"pointer"}}>
            <div style={{width:56,height:56,borderRadius:16,background:"rgba(0,229,255,0.1)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Upload style={{width:24,height:24,color:T.cyan}}/>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.8)"}}>{t("otube.select_video")}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:4}}>MP4, MOV, AVI, MKV · max 2GB</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              {["4K","HDR","60fps"].map(b=>(
                <span key={b} style={{padding:"3px 8px",borderRadius:99,fontSize:9,fontWeight:700,
                  background:"rgba(0,229,255,0.08)",border:"1px solid rgba(0,229,255,0.2)",color:T.cyan}}>{b}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 1: Details */}
        {step>=1 && file && (
          <>
            {/* File info bar */}
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,
              background:"rgba(0,229,255,0.06)",border:`1px solid ${T.cyan}22`}}>
              <Film style={{width:18,height:18,color:T.cyan,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>
                  {(file.size/1024/1024).toFixed(1)}MB · {file.type.split("/")[1]?.toUpperCase()}
                </div>
              </div>
              <button onClick={()=>{setFile(null);setStep(0);}}
                style={{width:22,height:22,borderRadius:"50%",background:"rgba(255,255,255,0.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X style={{width:11,height:11,color:"rgba(255,255,255,0.5)"}}/>
              </button>
            </div>

            {/* Thumbnail */}
            <div>
              <span style={{fontSize:10,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.cover_image")}</span>
              <div className="flex gap-3 mt-2">
                <motion.div whileTap={{scale:0.96}} onClick={()=>thumbRef.current?.click()}
                  style={{width:88,height:56,borderRadius:10,overflow:"hidden",cursor:"pointer",
                    border:`1.5px dashed ${thumbSrc?"transparent":T.cyan+"44"}`,
                    background:thumbSrc?"#000":"rgba(0,229,255,0.04)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {thumbSrc
                    ? <img src={thumbSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : <ImagePlus style={{width:20,height:20,color:`${T.cyan}66`}}/>}
                </motion.div>
                <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:4}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>{t("otube.cover_select")}</span>
                  <span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{t("otube.cover_tip")}</span>
                </div>
              </div>
              <input ref={thumbRef} type="file" accept="image/*" className="hidden"
                onChange={e=>e.target.files?.[0]&&handleThumb(e.target.files[0])}/>
            </div>

            {/* Title */}
            <div>
              <div className="flex justify-between mb-1">
                <span style={{fontSize:10,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.title_label")}</span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{title.length}/100</span>
              </div>
              <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}
                placeholder={t("otube.video_title_ph")}
                style={{width:"100%",padding:"11px 13px",borderRadius:12,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",
                  color:"white",fontSize:13,outline:"none"}}/>
            </div>

            {/* Description */}
            <div>
              <span style={{fontSize:10,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.desc_label")}</span>
              <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} maxLength={500}
                placeholder={t("otube.video_desc_ph")}
                style={{width:"100%",marginTop:4,padding:"11px 13px",borderRadius:12,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",
                  color:"white",fontSize:12,outline:"none",resize:"none"}}/>
            </div>

            {/* Tags */}
            <div>
              <span style={{fontSize:10,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.tags_label")}</span>
              {tagList.length>0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {tagList.map(t=>(
                    <span key={t} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px 3px 10px",
                      borderRadius:99,background:"rgba(0,229,255,0.1)",border:`1px solid ${T.cyan}33`,
                      fontSize:10,color:T.cyan,fontWeight:700}}>
                      #{t}
                      <button onClick={()=>setTagList(p=>p.filter(x=>x!==t))}
                        style={{width:12,height:12,opacity:0.6,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <X style={{width:10,height:10}}/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addTag(tagInput);}}}
                  placeholder={t("otube.tag_ph")}
                  style={{flex:1,padding:"9px 12px",borderRadius:10,
                    background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",
                    color:"white",fontSize:12,outline:"none"}}/>
                <button onClick={()=>addTag(tagInput)}
                  style={{padding:"9px 14px",borderRadius:10,background:"rgba(0,229,255,0.12)",
                    border:`1px solid ${T.cyan}33`,color:T.cyan,fontSize:12,fontWeight:700}}>+</button>
              </div>
              {/* Suggested tags */}
              <div className="flex gap-1.5 flex-wrap mt-2">
                {AI_TAG_SUGGESTIONS.filter(t=>!tagList.includes(t)).slice(0,5).map(t=>(
                  <button key={t} onClick={()=>addTag(t)}
                    style={{padding:"2px 8px",borderRadius:99,fontSize:9,
                      background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
                      color:"rgba(255,255,255,0.4)"}}>
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            <motion.button whileTap={{scale:0.96}} onClick={()=>setStep(2)}
              style={{padding:"12px",borderRadius:12,background:T.gCyan,
                fontSize:13,fontWeight:800,color:"#000"}}>
              {t("otube.next_btn")}
            </motion.button>
          </>
        )}

        {/* Step 2: Settings */}
        {step===2 && (
          <>
            {/* Privacy */}
            <div>
              <span style={{fontSize:10,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.visibility_label")}</span>
              <div className="flex flex-col gap-2 mt-2">
                {PRIVACIES.map(p=>(
                  <button key={p.id} onClick={()=>setPrivacy(p.id)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,
                      background:privacy===p.id?"rgba(0,229,255,0.1)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${privacy===p.id?T.cyan+"55":"rgba(255,255,255,0.07)"}`,
                      textAlign:"left"}}>
                    <span style={{fontSize:18}}>{p.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:privacy===p.id?T.cyan:"rgba(255,255,255,0.75)"}}>{p.label}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{p.desc}</div>
                    </div>
                    {privacy===p.id&&<div style={{width:8,height:8,borderRadius:"50%",background:T.cyan}}/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Monetize */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",
              borderRadius:12,background:"rgba(255,196,0,0.06)",border:"1px solid rgba(255,196,0,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <DollarSign style={{width:18,height:18,color:T.gold}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{t("otube.monetize_label")}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t("otube.monetize_sub")}</div>
                </div>
              </div>
              <motion.button whileTap={{scale:0.9}} onClick={()=>setMonetize(m=>!m)}
                style={{width:44,height:24,borderRadius:99,position:"relative",
                  background:monetize?T.gold:"rgba(255,255,255,0.1)",transition:"all 0.2s"}}>
                <motion.div animate={{x:monetize?20:2}}
                  style={{position:"absolute",top:2,width:20,height:20,borderRadius:"50%",
                    background:monetize?"#000":"rgba(255,255,255,0.5)"}}/>
              </motion.button>
            </div>

            {/* Scheduled */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Clock style={{width:18,height:18,color:"rgba(255,255,255,0.5)"}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)"}}>{t("otube.scheduled_label")}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{t("otube.scheduled_sub")}</div>
                  </div>
                </div>
                <motion.button whileTap={{scale:0.9}} onClick={()=>setScheduled(s=>!s)}
                  style={{width:44,height:24,borderRadius:99,position:"relative",
                    background:scheduled?T.cyan:"rgba(255,255,255,0.1)",transition:"all 0.2s"}}>
                  <motion.div animate={{x:scheduled?20:2}}
                    style={{position:"absolute",top:2,width:20,height:20,borderRadius:"50%",
                      background:scheduled?"#000":"rgba(255,255,255,0.5)"}}/>
                </motion.button>
              </div>
              {scheduled && (
                <input type="datetime-local" value={schedDate} onChange={e=>setSchedDate(e.target.value)}
                  style={{width:"100%",marginTop:6,padding:"10px 12px",borderRadius:10,
                    background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",
                    color:"white",fontSize:12,outline:"none"}}/>
              )}
            </div>

            {/* Progress */}
            {(phase==="uploading"||phase==="creating") && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <span style={{fontSize:10,color:T.cyan}}>{phase==="uploading"?t("otube.uploading"):t("otube.saving")}</span>
                  <span style={{fontSize:10,color:T.cyan}}>{progress}%</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
                  <motion.div animate={{width:`${progress}%`}} style={{height:"100%",borderRadius:3,background:T.gCyan}}/>
                </div>
              </div>
            )}
            {phase==="done" && (
              <div style={{padding:"12px 14px",borderRadius:12,background:"rgba(0,255,136,0.08)",
                border:"1px solid rgba(0,255,136,0.3)",display:"flex",alignItems:"center",gap:8}}>
                <Check style={{width:16,height:16,color:"#00ff88"}}/>
                <span style={{fontSize:12,color:"#00ff88",fontWeight:700}}>{t("otube.upload_done")}</span>
              </div>
            )}
            {phase==="error" && (
              <div style={{padding:"12px 14px",borderRadius:12,background:"rgba(255,45,85,0.08)",
                border:"1px solid rgba(255,45,85,0.3)"}}>
                <span style={{fontSize:12,color:"#ff2d55"}}>{errMsg}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={()=>setStep(1)}
                style={{flex:"0 0 44px",height:44,borderRadius:12,
                  background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ChevronLeft style={{width:18,height:18,color:"rgba(255,255,255,0.5)"}}/>
              </button>
              {phase==="done" ? (
                <motion.button whileTap={{scale:0.96}} onClick={onClose}
                  style={{flex:1,padding:"13px",borderRadius:12,
                    background:"rgba(0,255,136,0.15)",border:"1px solid rgba(0,255,136,0.4)",
                    fontSize:13,fontWeight:800,color:"#00ff88"}}>
                  {t("otube.done_close")}
                </motion.button>
              ) : (
                <motion.button whileTap={{scale:0.96}} onClick={handleSubmit}
                  disabled={!title.trim()||phase==="uploading"||phase==="creating"}
                  style={{flex:1,padding:"13px",borderRadius:12,
                    background:!title.trim()?"rgba(255,255,255,0.06)":T.gCyan,
                    fontSize:13,fontWeight:800,
                    color:!title.trim()?"rgba(255,255,255,0.25)":"#000",
                    opacity:(phase==="uploading"||phase==="creating")?0.7:1}}>
                  {phase==="uploading"?t("otube.uploading"):phase==="creating"?t("otube.saving"):t("otube.publish_btn")}
                </motion.button>
              )}
            </div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
    </ModalSheet>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Live Setup Modal v2                                     */
/* ─────────────────────────────────────────────────────── */
const LIVE_AUTO_MSGS = [
  {u:"Sardor",m:"salom hammaga 👋",c:"#00e5ff"},
  {u:"Nilufar",m:"zo'r efir! 🔥",c:"#ff6b00"},
  {u:"Jasur",m:"OlCha > YouTube 💯",c:"#a855f7"},
  {u:"Malika",m:"❤️ ajoyib!",c:"#ff2d55"},
  {u:"Bobur",m:"birinchi marta ko'rdim",c:"#00ff88"},
  {u:"Kamola",m:"🚀🚀🚀 signal!",c:"#ffd700"},
  {u:"Ulugbek",m:"stream sifati a'lo 🎯",c:"#00ffee"},
  {u:"Zulfiya",m:"obuna bo'ldim ✨",c:"#ff6b00"},
];
const LIVE_GIFTS = ["💎","🚀","🔥","❤️‍🔥","⚡","🌊","👑","💰"];


/* ─────────────────────────────────────────────────────── */
/* Live Setup Modal                                        */
/* ─────────────────────────────────────────────────────── */
function LiveSetupModal({ onClose }: { onClose: ()=>void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("gaming");
  const [quality, setQuality] = useState("1080p");
  const [live, setLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const CATS = ["gaming","music","sport","news","education","travel","cook"];
  const QUALS = ["720p","1080p","4K"];
  useEffect(()=>{
    if (!live) return;
    setViewerCount(Math.floor(Math.random()*120)+8);
    const iv = setInterval(()=>{
      setElapsed(s=>s+1);
      setViewerCount(c=>Math.max(5,c+Math.floor((Math.random()-0.38)*8)));
    },1000);
    return ()=>clearInterval(iv);
  },[live]);
  const fmtTime = (s:number) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  return (
    <ModalSheet onClose={onClose} title={t("otube.live_modal_title")} accent="#ff2d55">
      <div className="px-5 pb-8 flex flex-col gap-4">
        {/* Camera preview */}
        <div style={{borderRadius:14,background:"#020008",aspectRatio:"16/9",position:"relative",overflow:"hidden",
          border:"1px solid rgba(255,45,85,0.2)"}}>
          {live && (
            <>
              <motion.div animate={{opacity:[0.3,0.7,0.3]}} transition={{duration:2,repeat:Infinity}}
                style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%, rgba(255,45,85,0.12) 0%, transparent 70%)"}}/>
              <div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:6}}>
                <motion.div animate={{opacity:[1,0,1]}} transition={{duration:1,repeat:Infinity}}
                  style={{width:8,height:8,borderRadius:"50%",background:"#ff2d55",boxShadow:"0 0 8px #ff2d55"}}/>
                <span style={{fontSize:10,fontWeight:900,color:"white",letterSpacing:"0.1em"}}>LIVE</span>
              </div>
              <div style={{position:"absolute",top:10,right:10,display:"flex",alignItems:"center",gap:4}}>
                <Eye style={{width:10,height:10,color:"rgba(255,255,255,0.7)"}}/>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.9)",fontWeight:700}}>{viewerCount}</span>
              </div>
              <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
                fontSize:10,color:"rgba(255,255,255,0.55)",fontFamily:"monospace"}}>{fmtTime(elapsed)}</div>
            </>
          )}
          {!live && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              height:"100%",gap:8}}>
              <Camera style={{width:28,height:28,color:"rgba(255,255,255,0.2)"}}/>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>{t("otube.camera_ready")}</span>
            </div>
          )}
        </div>

        {!live && (
          <>
            <div>
              <span style={{fontSize:10,color:"#ff2d55",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.title_label")}</span>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("otube.live_title_ph")}
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                  color:"white",fontSize:13,outline:"none"}}/>
            </div>
            <div>
              <span style={{fontSize:10,color:"#ff2d55",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.live_cat_label")}</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATS.map(c=>(
                  <button key={c} onClick={()=>setCategory(c)}
                    style={{padding:"5px 12px",borderRadius:99,fontSize:10,fontWeight:700,
                      background:category===c?"rgba(255,45,85,0.25)":"rgba(255,255,255,0.05)",
                      border:`1px solid ${category===c?"rgba(255,45,85,0.6)":"rgba(255,255,255,0.08)"}`,
                      color:category===c?"#ff2d55":"rgba(255,255,255,0.5)"}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={{fontSize:10,color:"#ff2d55",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.live_qual_label")}</span>
              <div className="flex gap-2 mt-2">
                {QUALS.map(q=>(
                  <button key={q} onClick={()=>setQuality(q)}
                    style={{flex:1,padding:"8px",borderRadius:10,fontSize:11,fontWeight:700,
                      background:quality===q?"rgba(255,45,85,0.2)":"rgba(255,255,255,0.04)",
                      border:`1px solid ${quality===q?"rgba(255,45,85,0.5)":"rgba(255,255,255,0.08)"}`,
                      color:quality===q?"#ff2d55":"rgba(255,255,255,0.45)"}}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {live && (
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,padding:"10px",borderRadius:10,background:"rgba(255,45,85,0.08)",
              border:"1px solid rgba(255,45,85,0.2)",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#ff2d55"}}>{viewerCount}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{t("otube.live_viewers")}</div>
            </div>
            <div style={{flex:1,padding:"10px",borderRadius:10,background:"rgba(0,229,255,0.08)",
              border:"1px solid rgba(0,229,255,0.2)",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:900,color:T.cyan,fontFamily:"monospace"}}>{fmtTime(elapsed)}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{t("otube.live_duration")}</div>
            </div>
          </div>
        )}

        <motion.button whileTap={{scale:0.96}} onClick={()=>setLive(l=>!l)}
          style={{padding:"13px",borderRadius:12,letterSpacing:"0.04em",fontSize:13,fontWeight:800,
            background:live?"rgba(255,45,85,0.15)":"linear-gradient(135deg,#ff2d55,#ff6b00)",
            border:live?"1px solid rgba(255,45,85,0.4)":"none",
            color:live?"#ff2d55":"white"}}>
          {live?t("otube.end_live"):t("otube.start_live")}
        </motion.button>
      </div>
    </ModalSheet>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Short Creator Modal                                     */
/* ─────────────────────────────────────────────────────── */
function ShortModal({ onClose }: { onClose: ()=>void }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState<15|30|60>(30);
  const [elapsed, setElapsed] = useState(0);
  const [filter, setFilter] = useState("normal");
  const [caption, setCaption] = useState("");
  const [done, setDone] = useState(false);
  const FILTERS = [
    { id:"normal",  name:"Normal",    css:"none" },
    { id:"vivid",   name:"Vivid",     css:"saturate(1.8) contrast(1.1)" },
    { id:"cinema",  name:"Cinema",    css:"sepia(0.3) contrast(1.2)" },
    { id:"neon",    name:"Neon",      css:"hue-rotate(200deg) saturate(2)" },
    { id:"retro",   name:"Retro",     css:"sepia(0.6) brightness(0.9)" },
    { id:"bw",      name:"B&W",       css:"grayscale(1) contrast(1.3)" },
    { id:"warm",    name:"Warm",      css:"sepia(0.2) saturate(1.4) brightness(1.05)" },
  ];
  useEffect(()=>{
    if (!recording) return;
    if (elapsed >= duration) { setRecording(false); setDone(true); return; }
    const t = setTimeout(()=>setElapsed(s=>s+1),1000);
    return ()=>clearTimeout(t);
  },[recording, elapsed, duration]);
  const pct = Math.min(100, elapsed/duration*100);
  return (
    <ModalSheet onClose={onClose} title={t("otube.short_modal_title")} accent={T.orange}>
      <div className="px-5 pb-8 flex flex-col gap-4">
        {/* Viewfinder */}
        <div style={{borderRadius:14,background:"#020008",aspectRatio:"9/16",maxHeight:320,
          position:"relative",overflow:"hidden",border:`1px solid ${T.orange}22`}}>
          <div style={{filter: FILTERS.find(f=>f.id===filter)?.css || "none",
            position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 20%, rgba(255,107,0,0.08),transparent 60%)"}}/>
          {/* Progress arc */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.08)"}}>
            <motion.div animate={{width:`${pct}%`}} style={{height:"100%",background:T.gOrange,borderRadius:2}}/>
          </div>
          {recording && (
            <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
              display:"flex",alignItems:"center",gap:6}}>
              <motion.div animate={{opacity:[1,0,1]}} transition={{duration:0.8,repeat:Infinity}}
                style={{width:7,height:7,borderRadius:"50%",background:"#ff2d55",boxShadow:"0 0 6px #ff2d55"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"white",fontFamily:"monospace"}}>
                {elapsed}s / {duration}s
              </span>
            </div>
          )}
          {done && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
              justifyContent:"center",background:"rgba(0,0,0,0.5)"}}>
              <div style={{textAlign:"center"}}>
                <Check style={{width:32,height:32,color:"#00ff88",margin:"0 auto"}}/>
                <p style={{color:"#00ff88",fontWeight:700,fontSize:12,marginTop:4}}>Tayyor!</p>
              </div>
            </div>
          )}
          {!recording && !done && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Camera style={{width:28,height:28,color:"rgba(255,255,255,0.15)"}}/>
            </div>
          )}
        </div>
        {/* Duration */}
        <div className="flex gap-2">
          {([15,30,60] as const).map(d=>(
            <button key={d} onClick={()=>{setDuration(d);setElapsed(0);setDone(false);}}
              style={{flex:1,padding:"8px",borderRadius:10,fontSize:12,fontWeight:700,
                background:duration===d?"rgba(255,107,0,0.2)":"rgba(255,255,255,0.04)",
                border:`1px solid ${duration===d?T.orange+"66":"rgba(255,255,255,0.08)"}`,
                color:duration===d?T.orange:"rgba(255,255,255,0.4)"}}>
              {d}s
            </button>
          ))}
        </div>
        {/* Filters */}
        <div>
          <span style={{fontSize:10,color:T.orange,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.filter_label")}</span>
          <div className="flex gap-2 overflow-x-auto mt-2 pb-1" style={{scrollbarWidth:"none"}}>
            {FILTERS.map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)}
                style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:44,height:44,borderRadius:10,
                  background:`linear-gradient(135deg,#1a0533,#050010)`,
                  filter:f.css,
                  border:`2px solid ${filter===f.id?T.orange:"rgba(255,255,255,0.08)"}`,
                  boxShadow:filter===f.id?`0 0 8px ${T.orange}66`:"none"}}/>
                <span style={{fontSize:8,color:filter===f.id?T.orange:"rgba(255,255,255,0.4)",fontWeight:700}}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        {/* Caption */}
        <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder={t("otube.caption_ph")}
          style={{padding:"10px 12px",borderRadius:10,
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
            color:"white",fontSize:13,outline:"none"}}/>
        {/* Action */}
        {done ? (
          <motion.button whileTap={{scale:0.96}} onClick={onClose}
            style={{padding:"13px",borderRadius:12,background:"linear-gradient(135deg,#00ff88,#00cc66)",
              fontSize:13,fontWeight:800,color:"#000"}}>
            {t("otube.publish_short")}
          </motion.button>
        ) : (
          <motion.button whileTap={{scale:0.96}}
            onClick={()=>{setRecording(r=>!r);if(!recording){setElapsed(0);setDone(false);}}}
            style={{padding:"13px",borderRadius:12,letterSpacing:"0.04em",fontSize:13,fontWeight:800,
              background:recording?"rgba(255,45,85,0.15)":T.gOrange,
              border:recording?"1px solid rgba(255,45,85,0.4)":"none",
              color:recording?"#ff2d55":"white"}}>
            {recording?t("otube.stop_rec"):t("otube.start_rec")}
          </motion.button>
        )}
      </div>
    </ModalSheet>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Challenge Modal                                         */
/* ─────────────────────────────────────────────────────── */
function ChallengeModal({ onClose }: { onClose: ()=>void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [days, setDays] = useState(7);
  const [rules, setRules] = useState(["","",""]);
  const [done, setDone] = useState(false);
  const DAYS = [3,7,14,30];
  const updateRule = (i:number, v:string) => setRules(r=>{const n=[...r]; n[i]=v; return n;});
  return (
    <ModalSheet onClose={onClose} title={t("otube.ch_modal_title")} accent="#00ff88">
      <div className="px-5 pb-8 flex flex-col gap-4">
        <div>
          <span style={{fontSize:10,color:"#00ff88",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_name_label")}</span>
          <div style={{marginTop:4,display:"flex",alignItems:"center",gap:0,
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10}}>
            <span style={{padding:"10px 10px",color:"#00ff88",fontSize:16,fontWeight:900}}>#</span>
            <input value={name} onChange={e=>setName(e.target.value.replace(/\s+/g,""))}
              placeholder="MyChallengeOlcha"
              style={{flex:1,padding:"10px 8px 10px 0",background:"transparent",
                color:"white",fontSize:13,outline:"none",border:"none"}}/>
          </div>
        </div>
        <div>
          <span style={{fontSize:10,color:"#00ff88",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_desc_label")}</span>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} maxLength={200}
            placeholder={t("otube.ch_desc_ph")}
            style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,
              background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
              color:"white",fontSize:13,outline:"none",resize:"none"}}/>
        </div>
        <div>
          <span style={{fontSize:10,color:"#00ff88",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_rules_label")}</span>
          <div className="flex flex-col gap-2 mt-2">
            {rules.map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,fontWeight:900,color:"#00ff88",width:16}}>{i+1}.</span>
                <input value={r} onChange={e=>updateRule(i,e.target.value)} placeholder={`${t("otube.ch_rule_ph")} ${i+1}`}
                  style={{flex:1,padding:"8px 10px",borderRadius:8,
                    background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
                    color:"white",fontSize:12,outline:"none"}}/>
              </div>
            ))}
          </div>
        </div>
        <div>
          <span style={{fontSize:10,color:"#00ff88",fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_dur_label")}</span>
          <div className="flex gap-2 mt-2">
            {DAYS.map(d=>(
              <button key={d} onClick={()=>setDays(d)}
                style={{flex:1,padding:"8px",borderRadius:10,fontSize:11,fontWeight:700,
                  background:days===d?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                  border:`1px solid ${days===d?"rgba(0,255,136,0.5)":"rgba(255,255,255,0.08)"}`,
                  color:days===d?"#00ff88":"rgba(255,255,255,0.4)"}}>
                {d} {t("otube.ch_days")}
              </button>
            ))}
          </div>
        </div>
        {done ? (
          <div style={{padding:"12px",borderRadius:10,background:"rgba(0,255,136,0.08)",
            border:"1px solid rgba(0,255,136,0.3)",display:"flex",alignItems:"center",gap:8}}>
            <Trophy style={{width:16,height:16,color:"#00ff88"}}/>
            <span style={{fontSize:12,color:"#00ff88",fontWeight:700}}>#{name} {t("otube.ch_created")}</span>
          </div>
        ) : null}
        <motion.button whileTap={{scale:0.96}}
          onClick={()=>{if(name.trim())setDone(true);}}
          disabled={!name.trim()}
          style={{padding:"13px",borderRadius:12,letterSpacing:"0.04em",fontSize:13,fontWeight:800,
            background:!name.trim()?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#00ff88,#00cc44)",
            color:!name.trim()?"rgba(255,255,255,0.25)":"#000"}}>
          {done?t("otube.ch_done"):t("otube.ch_start")}
        </motion.button>
      </div>
    </ModalSheet>
  );
}

/* ─────────────────────────────────────────────────────── */
/* OTube Studio — full video editor                       */
/* ─────────────────────────────────────────────────────── */
function CipCatModal({ onClose }: { onClose: ()=>void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile]         = useState<File|null>(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [activeTab, setActiveTab] = useState<"trim"|"filters"|"text"|"stickers"|"music"|"speed"|"grading"|"ai"|"transitions">("trim");
  const [filter, setFilter]     = useState("normal");
  const [speed, setSpeed]       = useState(1);
  const [caption, setCaption]   = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont]   = useState("bold");
  const [textSize, setTextSize]   = useState(14);
  const [textBg, setTextBg]       = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd]     = useState(100);
  const [music, setMusic]         = useState<string|null>(null);
  const [stickers, setStickers]   = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished]   = useState(false);
  const [exportQ, setExportQ]     = useState<"720p"|"1080p"|"4K">("1080p");
  const [transition, setTransition] = useState("cut");
  const [aiRunning, setAiRunning] = useState<string|null>(null);
  const [aiDone, setAiDone]       = useState<string[]>([]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [temperature, setTemperature] = useState(0);
  const [vignette, setVignette]     = useState(0);
  const [drafts, setDrafts]         = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const uploadUrlMut = useRequestUploadUrl();
  const createMut    = useCreateReel({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({queryKey:["/api/reels"]}); setPublished(true); setPublishing(false); },
      onError:   () => setPublishing(false),
    }
  });

  const FILTERS = [
    { id:"normal",   name:"Normal",   css:"none",                                           preview:"#1a0533" },
    { id:"vivid",    name:"Vivid",    css:"saturate(1.9) contrast(1.15)",                  preview:"#2d0044" },
    { id:"cinema",   name:"Cinema",   css:"sepia(0.35) contrast(1.2) brightness(0.95)",    preview:"#221100" },
    { id:"neon",     name:"Neon",     css:"hue-rotate(195deg) saturate(2.2)",              preview:"#001133" },
    { id:"retro",    name:"Retro",    css:"sepia(0.65) brightness(0.88)",                  preview:"#332200" },
    { id:"bw",       name:"B&W",      css:"grayscale(1) contrast(1.35)",                   preview:"#111111" },
    { id:"warm",     name:"Warm",     css:"sepia(0.22) saturate(1.5) brightness(1.06)",    preview:"#330d00" },
    { id:"cool",     name:"Cool",     css:"hue-rotate(30deg) saturate(1.3)",               preview:"#001a33" },
    { id:"glitch",   name:"Glitch",   css:"hue-rotate(320deg) saturate(2.5) contrast(1.4)",preview:"#1a0022" },
    { id:"galaxy",   name:"Galaxy",   css:"hue-rotate(240deg) saturate(1.8) brightness(0.8)",preview:"#000a33" },
    { id:"sunset",   name:"Sunset",   css:"sepia(0.4) saturate(2) hue-rotate(-20deg)",    preview:"#331500" },
    { id:"dream",    name:"Dream",    css:"blur(0.5px) saturate(1.4) brightness(1.1)",     preview:"#220033" },
  ];

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

  const MUSICS = [
    { id:"aurora",   name:"Aurora Wave",      emoji:"🌊", bpm:96  },
    { id:"neon",     name:"Neon Pulse",       emoji:"⚡", bpm:128 },
    { id:"chill",    name:"Chill Vibes",      emoji:"🎵", bpm:80  },
    { id:"epic",     name:"Epic Drop",        emoji:"🔥", bpm:140 },
    { id:"lofi",     name:"Lo-Fi Beats",      emoji:"🎹", bpm:75  },
    { id:"trap",     name:"Future Trap",      emoji:"🎤", bpm:144 },
    { id:"ambient",  name:"Space Ambient",    emoji:"🌌", bpm:60  },
    { id:"hiphop",   name:"OlCha Hip-Hop",    emoji:"🎧", bpm:92  },
    { id:"none",     name:"Musiqasiz",        emoji:"🔇", bpm:0   },
  ];

  const STICKER_LIST = ["🔥","⚡","💫","🎯","🚀","✨","💥","🌊","🎵","❤️","😎","🤩","💯","🏆","👑","🌈",
    "🎬","📡","🛸","🦁","🐉","⭐","🌀","🎭","🎪","💎","🏅","🤖","👾","🕹️","🎮","🌟"];

  const TRANSITIONS = [
    {id:"cut",    name:"Cut",       emoji:"✂️"},
    {id:"fade",   name:"Fade",      emoji:"🌅"},
    {id:"dissolve",name:"Dissolve", emoji:"💧"},
    {id:"slide",  name:"Slide",     emoji:"➡️"},
    {id:"zoom",   name:"Zoom",      emoji:"🔍"},
    {id:"spin",   name:"Spin",      emoji:"🌀"},
    {id:"glitch", name:"Glitch",    emoji:"⚡"},
    {id:"flash",  name:"Flash",     emoji:"💥"},
    {id:"wipe",   name:"Wipe",      emoji:"🖌️"},
    {id:"iris",   name:"Iris",      emoji:"👁️"},
    {id:"push",   name:"Push",      emoji:"🏃"},
    {id:"morph",  name:"Morph",     emoji:"🧬"},
  ];

  const AI_ACTIONS = [
    {id:"autocut",  label:t("otube.ai_autocut"),   icon:"✂️", desc:t("otube.ai_autocut_desc")},
    {id:"captions", label:t("otube.ai_captions"),  icon:"📝", desc:t("otube.ai_captions_desc")},
    {id:"scene",    label:t("otube.ai_scene"),      icon:"🎬", desc:t("otube.ai_scene_desc")},
    {id:"beat",     label:t("otube.ai_beat"),       icon:"🎵", desc:t("otube.ai_beat_desc")},
    {id:"enhance",  label:t("otube.ai_enhance"),    icon:"✨", desc:t("otube.ai_enhance_desc")},
    {id:"crop",     label:t("otube.ai_crop"),       icon:"🎯", desc:t("otube.ai_crop_desc")},
  ];

  const TEXT_FONTS = [
    {id:"bold",    name:"Bold",      css:"bold"},
    {id:"italic",  name:"Italic",    css:"italic"},
    {id:"neon",    name:"Neon",      css:"bold"},
    {id:"outline", name:"Outline",   css:"bold"},
    {id:"shadow",  name:"Shadow",    css:"bold"},
  ];

  const handleFile = (f: File) => {
    setFile(f); setVideoSrc(URL.createObjectURL(f));
    setTrimStart(0); setTrimEnd(100);
  };

  useEffect(()=>{ if(videoRef.current) videoRef.current.playbackRate=speed; },[speed]);

  const gradingCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${temperature}deg)`;
  const filterCss  = FILTERS.find(f=>f.id===filter)?.css||"none";
  const appliedCss = filterCss==="none" ? gradingCss : `${filterCss} ${gradingCss}`;

  const runAi = (id:string) => {
    setAiRunning(id);
    setTimeout(()=>{ setAiRunning(null); setAiDone(p=>[...p,id]); }, 1800+Math.random()*1200);
  };

  const handlePublish = async () => {
    if (!file||!user) return;
    setPublishing(true);
    try {
      const req: UploadUrlRequest = {name:file.name,size:file.size,contentType:file.type};
      const {uploadURL,objectPath} = await uploadUrlMut.mutateAsync({data:req});
      const res = await fetch(uploadURL,{method:"PUT",headers:{"Content-Type":file.type},body:file});
      if (!res.ok) throw new Error("Upload failed");
      createMut.mutate({data:{
        authorId:user.id,
        videoUrl:`/api/storage/objects/${objectPath}`,
        caption:caption||"OTube Studio · OlCha",
        audioTrack:music&&music!=="none"?music:undefined,
        tags:["otube-studio","olcha","studio"],
        duration:0,
      }});
    } catch { setPublishing(false); }
  };

  const TABS = [
    { id:"trim",        Icon:SlidersHorizontal, label:t("otube.tab_trim")        },
    { id:"filters",     Icon:Palette,            label:t("otube.tab_filters")     },
    { id:"grading",     Icon:Sliders,            label:t("otube.tab_grading")     },
    { id:"text",        Icon:Type,               label:t("otube.tab_text")        },
    { id:"stickers",    Icon:Smile,              label:t("otube.tab_stickers")    },
    { id:"transitions", Icon:Layers,             label:t("otube.tab_transitions") },
    { id:"music",       Icon:Music,              label:t("otube.tab_music_lbl")   },
    { id:"speed",       Icon:FastForward,        label:t("otube.tab_speed")       },
    { id:"ai",          Icon:Sparkles,           label:t("otube.tab_ai")          },
  ] as const;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[10000] flex flex-col" style={{background:"#04000f"}}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3"
        style={{borderBottom:"1px solid rgba(168,85,247,0.18)",background:"rgba(4,0,15,0.95)"}}>
        <button onClick={onClose}
          style={{width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.07)",
            border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X style={{width:16,height:16,color:"rgba(255,255,255,0.6)"}}/>
        </button>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{rotateY:[0,180,360]}}
            transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}
            style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",
              background:"linear-gradient(135deg,#ff3500,#ff6b00,#ffc400)",
              borderRadius:7,boxShadow:"0 0 14px rgba(255,107,0,0.55), 0 0 28px rgba(255,53,0,0.25)"}}>
            <Film style={{width:13,height:13,color:"white"}}/>
          </motion.div>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
            <span style={{fontSize:14,fontWeight:900,letterSpacing:"0.04em"}}>
              <span style={{background:"linear-gradient(90deg,#ff6b00,#ffc400)",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>OTube</span>
              <span style={{color:"white"}}> Studio</span>
            </span>
          </div>
          <motion.span
            animate={{opacity:[0.6,1,0.6]}}
            transition={{duration:2,repeat:Infinity}}
            style={{fontSize:7,fontWeight:800,letterSpacing:"0.18em",
              padding:"2px 6px",borderRadius:4,
              background:"linear-gradient(90deg,rgba(255,53,0,0.2),rgba(255,196,0,0.15))",
              border:"1px solid rgba(255,107,0,0.35)",
              color:"#ffc400"}}>
            PRO
          </motion.span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export quality */}
          <select value={exportQ} onChange={e=>setExportQ(e.target.value as "720p"|"1080p"|"4K")}
            style={{padding:"4px 6px",borderRadius:8,background:"rgba(168,85,247,0.1)",
              border:"1px solid rgba(168,85,247,0.3)",color:T.violet,fontSize:9,fontWeight:700,
              outline:"none",appearance:"none"}}>
            {["720p","1080p","4K"].map(q=><option key={q} value={q}>{q}</option>)}
          </select>
          {/* Draft save */}
          <motion.button whileTap={{scale:0.9}} onClick={()=>setDrafts(d=>d+1)}
            style={{padding:"5px 8px",borderRadius:8,background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.1)",fontSize:9,fontWeight:700,
              color:"rgba(255,255,255,0.5)"}}>
            {drafts>0?`💾 ${drafts}`:"💾"}
          </motion.button>
          {/* Publish */}
          <motion.button whileTap={{scale:0.9}} onClick={handlePublish}
            disabled={!file||publishing||published}
            style={{padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:900,
              background:(!file||published)?"rgba(255,255,255,0.06)":T.gViolet,
              color:(!file||published)?"rgba(255,255,255,0.3)":"white",
              opacity:publishing?0.7:1,
              boxShadow:(!file||published)?"none":`0 2px 12px ${T.violet}55`}}>
            {published?"✓":publishing?"…":t("otube.studio_publish")}
          </motion.button>
        </div>
      </div>

      {/* Video preview */}
      <div style={{flex:"0 0 220px",position:"relative",background:"#000",
        width:"100%",overflow:"hidden"}}>
        {videoSrc ? (
          <video ref={videoRef} src={videoSrc} autoPlay loop muted playsInline
            style={{width:"100%",height:"100%",objectFit:"cover",filter:appliedCss}}/>
        ) : (
          <motion.div whileTap={{scale:0.97}} onClick={()=>fileRef.current?.click()}
            style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              height:"100%",gap:10,cursor:"pointer",
              background:"radial-gradient(ellipse at 50% 40%,rgba(168,85,247,0.08),transparent 60%)"}}>
            <motion.div animate={{scale:[1,1.05,1]}} transition={{duration:2,repeat:Infinity}}
              style={{width:60,height:60,borderRadius:18,background:"rgba(168,85,247,0.12)",
                border:"1.5px dashed rgba(168,85,247,0.5)",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 0 30px rgba(168,85,247,0.15)"}}>
              <ImagePlus style={{width:24,height:24,color:T.violet}}/>
            </motion.div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",fontWeight:700}}>{t("otube.studio_select_video")}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",marginTop:2}}>MP4, MOV, AVI · max 2GB</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {["4K","HDR","60FPS"].map(b=>(
                <span key={b} style={{padding:"2px 7px",borderRadius:99,fontSize:8,fontWeight:700,
                  background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.25)",color:T.violet}}>{b}</span>
              ))}
            </div>
          </motion.div>
        )}
        {/* Stickers overlay */}
        {stickers.length>0 && (
          <div style={{position:"absolute",top:10,right:10,display:"flex",flexWrap:"wrap",
            gap:2,maxWidth:84,justifyContent:"flex-end",pointerEvents:"none"}}>
            {stickers.map((s,i)=>(
              <span key={i} style={{fontSize:18,filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.9))"}}>{s}</span>
            ))}
          </div>
        )}
        {/* Text overlay */}
        {caption && (
          <div style={{position:"absolute",bottom:20,left:0,right:0,textAlign:"center",pointerEvents:"none"}}>
            <span style={{fontSize:textSize,fontWeight:textFont==="italic"?"normal":900,
              fontStyle:textFont==="italic"?"italic":"normal",
              color:textColor,textShadow:"0 2px 10px rgba(0,0,0,0.95)",
              padding:"4px 12px",borderRadius:7,
              background:textBg?"rgba(0,0,0,0.45)":"transparent",
              letterSpacing:"0.02em"}}>{caption}</span>
          </div>
        )}
        {/* Vignette overlay */}
        {vignette>0 && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",
            background:`radial-gradient(ellipse at 50% 50%,transparent ${100-vignette}%,rgba(0,0,0,${vignette/150}) 100%)`}}/>
        )}
        {/* Trim progress bar */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:5,background:"rgba(0,0,0,0.6)"}}>
          <div style={{position:"absolute",left:`${trimStart}%`,width:`${trimEnd-trimStart}%`,
            height:"100%",background:T.gViolet,opacity:0.8}}/>
          <div style={{position:"absolute",left:`${trimStart}%`,width:3,height:"100%",background:"white",opacity:0.9}}/>
          <div style={{position:"absolute",left:`${trimEnd}%`,width:3,height:"100%",background:"white",opacity:0.9,transform:"translateX(-3px)"}}/>
        </div>
        {/* AI processing badge */}
        {aiRunning && (
          <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
            display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,
            background:"rgba(168,85,247,0.7)",backdropFilter:"blur(8px)"}}>
            <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}}>
              <Sparkles style={{width:10,height:10,color:"white"}}/>
            </motion.div>
            <span style={{fontSize:9,fontWeight:700,color:"white"}}>AI ishlayapti…</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>

      {/* Multi-layer waveform timeline */}
      <div style={{padding:"5px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"rgba(0,0,0,0.3)"}}>
        <div style={{position:"relative",height:32}}>
          {/* Track label */}
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:36,
            display:"flex",flexDirection:"column",justifyContent:"space-around",gap:1}}>
            {["VID","AUD"].map(l=>(
              <span key={l} style={{fontSize:6,fontWeight:800,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em"}}>{l}</span>
            ))}
          </div>
          {/* Video track */}
          <div style={{position:"absolute",left:40,right:0,top:1,height:12,
            background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}>
            <div style={{position:"absolute",left:`${trimStart}%`,width:`${trimEnd-trimStart}%`,
              top:0,bottom:0,background:`linear-gradient(90deg,${T.violet}44,${T.nova}55)`,borderRadius:2}}/>
            {Array.from({length:24}).map((_,i)=>(
              <div key={i} style={{position:"absolute",left:`${(i/24)*100}%`,top:1,bottom:1,width:1.5,
                background:`rgba(168,85,247,${0.2+Math.abs(Math.sin(i*1.3))*0.5})`,borderRadius:1}}/>
            ))}
          </div>
          {/* Audio waveform track */}
          <div style={{position:"absolute",left:40,right:0,bottom:1,height:12,
            background:"rgba(255,255,255,0.03)",borderRadius:3,overflow:"hidden"}}>
            {music && music!=="none" && Array.from({length:32}).map((_,i)=>(
              <div key={i} style={{position:"absolute",left:`${(i/32)*100}%`,
                bottom:1,width:2,
                height:`${30+Math.abs(Math.sin(i*2.1+1))*70}%`,
                background:`rgba(0,229,255,${0.3+Math.abs(Math.sin(i*2.1))*0.4})`,borderRadius:1}}/>
            ))}
          </div>
        </div>
      </div>

      {/* Tool tabs — scrollable */}
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.2)"}}>
        <div className="flex overflow-x-auto px-2" style={{scrollbarWidth:"none",gap:2,paddingBottom:0}}>
          {TABS.map(({id,Icon,label})=>(
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{flexShrink:0,padding:"7px 10px",display:"flex",flexDirection:"column",
                alignItems:"center",gap:1.5,
                borderBottom:`2px solid ${activeTab===id?T.violet:"transparent"}`,
                background:activeTab===id?"rgba(168,85,247,0.05)":"transparent",
                transition:"all 0.15s"}}>
              <Icon style={{width:13,height:13,color:activeTab===id?T.violet:"rgba(255,255,255,0.3)"}}/>
              <span style={{fontSize:7.5,fontWeight:700,letterSpacing:"0.04em",
                color:activeTab===id?T.violet:"rgba(255,255,255,0.28)"}}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool panel */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 20px",minHeight:0,scrollbarWidth:"none"}}>

        {/* ── TRIM ── */}
        {activeTab==="trim" && (
          <div className="flex flex-col gap-4">
            {[
              {label:t("otube.studio_trim_start"),value:trimStart,set:setTrimStart,min:0,max:trimEnd-5},
              {label:t("otube.studio_trim_end"),  value:trimEnd,  set:setTrimEnd,  min:trimStart+5,max:100},
            ].map(({label,value,set,min,max})=>(
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>{label}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>{value}%</span>
                </div>
                <input type="range" min={min} max={max} value={value}
                  onChange={e=>set(Number(e.target.value))}
                  style={{width:"100%",accentColor:T.violet}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{l:"15s",v:[0,25]},{l:"30s",v:[0,50]},{l:"60s",v:[0,100]},{l:t("otube.studio_preset_custom"),v:[25,75]}].map(p=>(
                <button key={p.l} onClick={()=>{setTrimStart(p.v[0]);setTrimEnd(p.v[1]);}}
                  style={{padding:"6px 12px",borderRadius:8,fontSize:10,fontWeight:700,
                    background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.25)",color:T.violet}}>
                  {p.l}
                </button>
              ))}
            </div>
            <div style={{padding:"10px 12px",borderRadius:10,background:"rgba(168,85,247,0.07)",
              border:"1px solid rgba(168,85,247,0.15)",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{t("otube.studio_selected")}</span>
              <span style={{color:T.violet,fontWeight:800,fontSize:11}}>{trimEnd-trimStart}%</span>
            </div>
          </div>
        )}

        {/* ── FILTERS ── */}
        {activeTab==="filters" && (
          <div>
            <div className="flex flex-wrap gap-3 justify-between">
              {FILTERS.map(f=>(
                <button key={f.id} onClick={()=>setFilter(f.id)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:52,height:52,borderRadius:12,background:f.preview,
                    filter:f.css==="none"?"none":f.css,
                    border:`2px solid ${filter===f.id?T.violet:"rgba(255,255,255,0.06)"}`,
                    boxShadow:filter===f.id?`0 0 12px ${T.violet}66, 0 0 24px ${T.violet}22`:"none",
                    transition:"all 0.2s"}}/>
                  <span style={{fontSize:7.5,fontWeight:700,
                    color:filter===f.id?T.violet:"rgba(255,255,255,0.3)"}}>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── COLOR GRADING ── */}
        {activeTab==="grading" && (
          <div className="flex flex-col gap-4">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{t("otube.studio_color_settings")}</span>
              <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setTemperature(0);setVignette(0);}}
                style={{fontSize:10,color:T.violet,fontWeight:700}}>Reset</button>
            </div>
            {[
              {label:t("otube.studio_brightness"),  value:brightness, set:setBrightness, min:50, max:200, unit:"%" },
              {label:t("otube.studio_contrast"),    value:contrast,   set:setContrast,   min:50, max:200, unit:"%" },
              {label:t("otube.studio_saturation"),  value:saturation, set:setSaturation, min:0,  max:300, unit:"%" },
              {label:t("otube.studio_temperature"), value:temperature,set:setTemperature,min:-60,max:60,  unit:"°" },
              {label:t("otube.studio_vignette"),    value:vignette,   set:setVignette,   min:0,  max:80,  unit:""  },
            ].map(({label,value,set,min,max,unit})=>(
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.08em"}}>{label.toUpperCase()}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>
                    {value>0&&unit!=="%"?"+":""}{value}{unit}
                  </span>
                </div>
                <input type="range" min={min} max={max} value={value}
                  onChange={e=>set(Number(e.target.value))}
                  style={{width:"100%",accentColor:T.violet}}/>
              </div>
            ))}
            {/* Preview swatch */}
            <div style={{height:40,borderRadius:12,overflow:"hidden",
              background:"linear-gradient(135deg,#ff3500,#7700ff,#00ffee)",
              filter:gradingCss}}/>
          </div>
        )}

        {/* ── TEXT ── */}
        {activeTab==="text" && (
          <div className="flex flex-col gap-4">
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>MATN</span>
              <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={80}
                placeholder="Video ustiga matn..."
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                  color:textColor,fontSize:13,fontStyle:textFont==="italic"?"italic":"normal",
                  fontWeight:textFont==="italic"?400:900,outline:"none"}}/>
            </div>
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>RANG</span>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {["#ffffff","#00ffee","#ff3500","#7700ff","#ffc400","#ff2d55","#00ff88","#ff6b00","#00e5ff","#a855f7"].map(c=>(
                  <button key={c} onClick={()=>setTextColor(c)}
                    style={{width:26,height:26,borderRadius:"50%",background:c,
                      border:`3px solid ${textColor===c?"white":"transparent"}`,
                      boxShadow:textColor===c?"0 0 0 1px rgba(255,255,255,0.4)":"none",
                      transition:"all 0.15s"}}/>
                ))}
              </div>
            </div>
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>STIL</span>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {TEXT_FONTS.map(f=>(
                  <button key={f.id} onClick={()=>setTextFont(f.id)}
                    style={{padding:"5px 12px",borderRadius:8,fontSize:11,
                      fontWeight:textFont===f.id?900:400,
                      fontStyle:f.id==="italic"?"italic":"normal",
                      background:textFont===f.id?"rgba(168,85,247,0.18)":"rgba(255,255,255,0.04)",
                      border:`1px solid ${textFont===f.id?"rgba(168,85,247,0.4)":"rgba(255,255,255,0.07)"}`,
                      color:textFont===f.id?T.violet:"rgba(255,255,255,0.5)"}}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.studio_text_size")}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{textSize}px</span>
              </div>
              <input type="range" min={10} max={32} value={textSize}
                onChange={e=>setTextSize(Number(e.target.value))}
                style={{width:"100%",accentColor:T.violet}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{t("otube.studio_text_bg")}</span>
              <motion.button whileTap={{scale:0.9}} onClick={()=>setTextBg(b=>!b)}
                style={{width:40,height:22,borderRadius:99,position:"relative",
                  background:textBg?T.violet:"rgba(255,255,255,0.1)",transition:"all 0.2s"}}>
                <motion.div animate={{x:textBg?18:2}}
                  style={{position:"absolute",top:2,width:18,height:18,borderRadius:"50%",
                    background:"white"}}/>
              </motion.button>
            </div>
            {caption && (
              <div style={{padding:"14px",borderRadius:12,background:"rgba(0,0,0,0.6)",
                textAlign:"center",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:textSize,fontWeight:900,color:textColor,
                  textShadow:"0 2px 8px rgba(0,0,0,0.9)"}}>{caption}</span>
              </div>
            )}
          </div>
        )}

        {/* ── STICKERS ── */}
        {activeTab==="stickers" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5">
              {STICKER_LIST.map(s=>(
                <motion.button key={s} whileTap={{scale:0.8}}
                  onClick={()=>setStickers(p=>[...p.slice(-8),s])}
                  style={{width:42,height:42,borderRadius:10,fontSize:22,
                    background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {s}
                </motion.button>
              ))}
            </div>
            {stickers.length>0 && (
              <div style={{padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.07)"}}>
                <div className="flex justify-between mb-2">
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700}}>{t("otube.studio_stickers_added")}</span>
                  <button onClick={()=>setStickers([])} style={{fontSize:10,color:"#ff2d55",fontWeight:700}}>{t("otube.studio_stickers_clear")}</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {stickers.map((s,i)=><span key={i} style={{fontSize:22}}>{s}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRANSITIONS ── */}
        {activeTab==="transitions" && (
          <div className="flex flex-col gap-3">
            <p style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>
              {t("otube.studio_transition_hint")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TRANSITIONS.map(t=>(
                <motion.button key={t.id} whileTap={{scale:0.92}}
                  onClick={()=>setTransition(t.id)}
                  style={{padding:"10px 6px",borderRadius:12,display:"flex",flexDirection:"column",
                    alignItems:"center",gap:4,
                    background:transition===t.id?"rgba(168,85,247,0.18)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${transition===t.id?"rgba(168,85,247,0.5)":"rgba(255,255,255,0.07)"}`,
                    boxShadow:transition===t.id?`0 0 12px ${T.violet}33`:"none",
                    transition:"all 0.15s"}}>
                  <span style={{fontSize:20}}>{t.emoji}</span>
                  <span style={{fontSize:9,fontWeight:700,
                    color:transition===t.id?T.violet:"rgba(255,255,255,0.4)"}}>{t.name}</span>
                </motion.button>
              ))}
            </div>
            <div style={{padding:"10px 12px",borderRadius:10,
              background:"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.15)"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                {t("otube.studio_transition_selected")} <span style={{color:T.violet,fontWeight:700}}>
                  {TRANSITIONS.find(t=>t.id===transition)?.emoji} {TRANSITIONS.find(t=>t.id===transition)?.name}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* ── MUSIC ── */}
        {activeTab==="music" && (
          <div className="flex flex-col gap-2">
            {MUSICS.map(m=>(
              <motion.button key={m.id} whileTap={{scale:0.98}} onClick={()=>setMusic(m.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:12,
                  background:music===m.id?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${music===m.id?"rgba(168,85,247,0.5)":"rgba(255,255,255,0.06)"}`,
                  textAlign:"left",transition:"all 0.15s"}}>
                <div style={{width:38,height:38,borderRadius:10,
                  background:music===m.id?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.06)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {m.emoji}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:music===m.id?T.violet:"rgba(255,255,255,0.75)"}}>{m.name}</div>
                  {m.bpm>0 && <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>{m.bpm} BPM</div>}
                </div>
                {music===m.id && (
                  <motion.div animate={{scale:[1,1.3,1]}} transition={{duration:0.6,repeat:Infinity}}>
                    <Check style={{width:14,height:14,color:T.violet}}/>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        )}

        {/* ── SPEED ── */}
        {activeTab==="speed" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              {SPEEDS.map(s=>(
                <button key={s} onClick={()=>setSpeed(s)}
                  style={{flex:"1 1 60px",padding:"11px 8px",borderRadius:10,fontSize:12,fontWeight:800,
                    background:speed===s?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${speed===s?T.violet+"66":"rgba(255,255,255,0.08)"}`,
                    color:speed===s?T.violet:"rgba(255,255,255,0.4)",
                    boxShadow:speed===s?`0 0 10px ${T.violet}33`:"none",transition:"all 0.15s"}}>
                  {s}×
                </button>
              ))}
            </div>
            <div style={{padding:"12px",borderRadius:12,background:"rgba(168,85,247,0.07)",
              border:"1px solid rgba(168,85,247,0.15)"}}>
              <div style={{fontSize:24,fontWeight:900,color:T.violet,textAlign:"center"}}>{speed}×</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textAlign:"center",marginTop:2}}>
                {speed<0.5?t("otube.speed_ultra_slow"):speed<1?t("otube.speed_slow"):speed===1?t("otube.speed_normal"):t("otube.speed_fast")}
                {speed>=3?t("otube.speed_timelapse"):""}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{fontSize:9,color:T.violet,fontWeight:700}}>{t("otube.speed_slider")}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{speed}×</span>
              </div>
              <input type="range" min={25} max={400} step={25} value={speed*100}
                onChange={e=>setSpeed(Number(e.target.value)/100)}
                style={{width:"100%",accentColor:T.violet}}/>
            </div>
          </div>
        )}

        {/* ── AI EDIT ── */}
        {activeTab==="ai" && (
          <div className="flex flex-col gap-3">
            <div style={{padding:"10px 12px",borderRadius:12,
              background:"linear-gradient(135deg,rgba(168,85,247,0.08),rgba(119,0,255,0.05))",
              border:"1px solid rgba(168,85,247,0.2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <Sparkles style={{width:12,height:12,color:T.violet}}/>
                <span style={{fontSize:10,color:T.violet,fontWeight:700,letterSpacing:"0.08em"}}>{t("otube.ai_editor_title")}</span>
              </div>
              <p style={{fontSize:10,color:"rgba(255,255,255,0.45)",lineHeight:1.5}}>
                {t("otube.ai_editor_desc")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {AI_ACTIONS.map(a=>(
                <motion.button key={a.id} whileTap={{scale:0.97}}
                  onClick={()=>!aiDone.includes(a.id)&&!aiRunning&&runAi(a.id)}
                  disabled={!!aiRunning}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px",borderRadius:12,
                    background:aiDone.includes(a.id)
                      ?"rgba(0,255,136,0.07)"
                      :aiRunning===a.id
                      ?"rgba(168,85,247,0.12)"
                      :"rgba(255,255,255,0.04)",
                    border:`1px solid ${
                      aiDone.includes(a.id)?"rgba(0,255,136,0.3)":
                      aiRunning===a.id?"rgba(168,85,247,0.4)":"rgba(255,255,255,0.07)"}`,
                    textAlign:"left",transition:"all 0.2s"}}>
                  <div style={{width:36,height:36,borderRadius:10,fontSize:18,
                    background:aiDone.includes(a.id)?"rgba(0,255,136,0.1)":"rgba(255,255,255,0.06)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {aiRunning===a.id ? (
                      <motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:"linear"}}>
                        <Sparkles style={{width:14,height:14,color:T.violet}}/>
                      </motion.div>
                    ) : aiDone.includes(a.id) ? "✅" : a.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,
                      color:aiDone.includes(a.id)?"#00ff88":aiRunning===a.id?T.violet:"rgba(255,255,255,0.8)"}}>
                      {a.label}
                    </div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:1}}>{a.desc}</div>
                  </div>
                  {aiRunning===a.id && (
                    <div style={{fontSize:9,color:T.violet,fontWeight:700}}>AI…</div>
                  )}
                  {aiDone.includes(a.id) && (
                    <span style={{fontSize:9,color:"#00ff88",fontWeight:700}}>{t("otube.ai_ready")}</span>
                  )}
                </motion.button>
              ))}
            </div>
            {aiDone.length>0 && (
              <div style={{padding:"10px 12px",borderRadius:10,background:"rgba(0,255,136,0.06)",
                border:"1px solid rgba(0,255,136,0.2)",display:"flex",alignItems:"center",gap:8}}>
                <Check style={{width:12,height:12,color:"#00ff88"}}/>
                <span style={{fontSize:10,color:"#00ff88",fontWeight:700}}>{t("otube.ai_applied",{count:aiDone.length})}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",padding:"10px 16px",
        background:"rgba(4,0,15,0.95)",display:"flex",alignItems:"center",gap:8}}>
        {published ? (
          <>
            <Check style={{width:16,height:16,color:"#00ff88"}}/>
            <span style={{fontSize:12,color:"#00ff88",fontWeight:700,flex:1}}>{t("otube.studio_published")}</span>
            <button onClick={onClose} style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{t("otube.studio_close")}</button>
          </>
        ) : (
          <>
            {file && (
              <div style={{flex:1,fontSize:9,color:"rgba(255,255,255,0.3)"}}>
                {file.name.slice(0,22)}… · {(file.size/1024/1024).toFixed(1)}MB · {exportQ}
              </div>
            )}
            {!file && (
              <motion.button whileTap={{scale:0.96}} onClick={()=>fileRef.current?.click()}
                style={{flex:1,padding:"10px",borderRadius:10,fontSize:12,fontWeight:700,
                  background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.3)",color:T.violet}}>
                {t("otube.studio_add_video")}
              </motion.button>
            )}
            {file && (
              <motion.button whileTap={{scale:0.96}} onClick={handlePublish}
                disabled={publishing}
                style={{padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:900,
                  background:T.gViolet,color:"white",
                  opacity:publishing?0.6:1,
                  boxShadow:`0 4px 20px ${T.violet}44`}}>
                {publishing?t("otube.uploading"):t("otube.publish_btn")}
              </motion.button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Floating FAB — speed dial with working modals          */
/* ─────────────────────────────────────────────────────── */
function FloatingFAB() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"upload"|"live"|"short"|"challenge"|"cipcat"|null>(null);

  const openModal = (id: "upload"|"live"|"short"|"challenge"|"cipcat") => {
    setOpen(false);
    setTimeout(() => setModal(id), 150);
  };

  const items = [
    { Icon: Upload,    label: t("otube.fab_upload"),    col: T.cyan,    id: "upload"    as const },
    { Icon: Radio,     label: t("otube.fab_live"),      col: "#ff2d55", id: "live"      as const },
    { Icon: Zap,       label: t("otube.fab_short"),     col: T.orange,  id: "short"     as const },
    { Icon: Swords,    label: t("otube.fab_challenge"), col: "#00ff88", id: "challenge" as const },
    { Icon: Film,      label: t("otube.fab_studio"),    col: T.gold,    id: "cipcat"    as const },
  ];

  return (
    <>
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2.5 pointer-events-none">
        <AnimatePresence>
          {open && items.map((item, i) => (
            <motion.button key={i}
              initial={{opacity:0,x:24,scale:0.75}} animate={{opacity:1,x:0,scale:1}}
              exit={{opacity:0,x:24,scale:0.75}}
              transition={{delay:i*0.05,type:"spring",damping:22,stiffness:280}}
              onClick={()=>openModal(item.id)}
              className="flex items-center gap-2 pointer-events-auto"
              style={{padding:"8px 14px 8px 10px",borderRadius:99,
                background:"rgba(4,1,16,0.88)",backdropFilter:"blur(24px)",
                boxShadow:`0 0 0 1px ${item.col}33, 0 6px 24px rgba(0,0,0,0.55)`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`${item.col}22`,
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:`0 0 0 1px ${item.col}55`}}>
                <item.Icon style={{width:12,height:12,color:item.col}}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.88)"}}>
                {item.label}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        <motion.button className="pointer-events-auto" whileTap={{scale:0.88}}
          onClick={()=>setOpen(o=>!o)}
          style={{padding:"8px 18px",borderRadius:12,
            background:open?"rgba(255,255,255,0.06)":"rgba(0,229,255,0.10)",
            border:`1px solid ${open?"rgba(255,255,255,0.18)":T.cyan+"55"}`,
            boxShadow:open?"none":`0 0 14px ${T.cyan}33`,
            backdropFilter:"blur(16px)",
            transition:"background 0.2s, box-shadow 0.2s"}}>
          <span style={{fontSize:18,fontWeight:900,letterSpacing:"0.12em",
            color:open?"rgba(255,255,255,0.45)":T.cyan,lineHeight:1}}>
            ···
          </span>
        </motion.button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal==="upload"    && <UploadModal     onClose={()=>setModal(null)}/>}
        {modal==="live"      && <LiveSetupModal  onClose={()=>setModal(null)}/>}
        {modal==="short"     && <ShortModal      onClose={()=>setModal(null)}/>}
        {modal==="challenge" && <ChallengeModal  onClose={()=>setModal(null)}/>}
        {modal==="cipcat"    && <CipCatModal     onClose={()=>setModal(null)}/>}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Mood row — curated themed horizontal scroll             */
/* ─────────────────────────────────────────────────────── */
function MoodRow({ title, emoji, col, videos, onPlay }:
  { title:string; emoji:string; col:string; videos:Reel[]; onPlay:(v:Reel)=>void }) {
  if (videos.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5"
          style={{borderRadius:99,background:`${col}18`,boxShadow:`0 0 0 1px ${col}33`}}>
          <span style={{fontSize:14}}>{emoji}</span>
          <span style={{fontSize:11,fontWeight:700,color:col,letterSpacing:"0.04em"}}>{title}</span>
        </div>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${col}44,transparent)`}}/>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-3 px-3 pb-2" style={{scrollbarWidth:"none"}}>
        {videos.slice(0,6).map((v,i)=>(
          <motion.div key={v.id}
            initial={{opacity:0,x:18,scale:0.94}} animate={{opacity:1,x:0,scale:1}}
            transition={{delay:i*0.06,type:"spring",damping:22}}
            className="flex-shrink-0 cursor-pointer overflow-hidden relative"
            style={{width:148,borderRadius:14,
              boxShadow:`0 4px 20px rgba(0,0,0,0.65), 0 0 0 1px ${col}22, 0 0 28px ${col}12`}}
            whileTap={{scale:0.93}} onClick={()=>onPlay(v)}>
            <div style={{aspectRatio:"16/9",position:"relative",overflow:"hidden"}}>
              {v.thumbnailUrl
                ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                : <div className="w-full h-full"
                    style={{background:`linear-gradient(135deg,${col}22,#000)`}}/>}
              <div className="absolute inset-0 pointer-events-none"
                style={{background:"linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 60%)"}}/>
              <div className="absolute bottom-0 inset-x-0 p-2">
                <p style={{fontSize:10,fontWeight:700,color:"white",lineHeight:1.3}}
                  className="line-clamp-2">{v.caption||"Video"}</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-[2px]"
                style={{background:col,opacity:0.55}}/>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Shorts card — vertical, rounded                         */
/* ─────────────────────────────────────────────────────── */
function ShortsCard({ video, onPlay }: { video:Reel; onPlay:()=>void }) {
  return (
    <motion.div whileTap={{scale:0.92}} onClick={onPlay}
      className="flex-shrink-0 cursor-pointer overflow-hidden relative"
      style={{width:112,aspectRatio:"9/16",borderRadius:14,
        boxShadow:`0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)`}}>
      {video.thumbnailUrl
        ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{background:"linear-gradient(180deg,#1a0028,#000510)"}}/>}
      <div className="absolute inset-0 pointer-events-none"
        style={{background:"linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 55%)"}}/>
      {/* Short badge — round pill */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1"
        style={{borderRadius:99,background:"rgba(255,107,0,0.85)",backdropFilter:"blur(8px)"}}>
        <Zap style={{width:7,height:7,fill:"white",color:"white"}}/>
        <span style={{fontSize:7.5,fontWeight:800,color:"white",letterSpacing:"0.06em"}}>SHORT</span>
      </div>
      <div className="absolute bottom-3 inset-x-2.5">
        <p style={{fontSize:10,fontWeight:700,color:"white",lineHeight:1.3}}
          className="line-clamp-2 mb-1">{video.caption||"Short"}</p>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.45)",fontFamily:"monospace"}}>{fmt(video.viewsCount)}</span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* BROADCAST MATRIX — asymmetric organic grid               */
/* Pattern: [full] → [pair] → [trio] → [full] → repeat    */
/* ─────────────────────────────────────────────────────── */
function BroadcastMatrix({ reels, onPlay }: { reels: Reel[]; onPlay:(v:Reel)=>void }) {
  if (!reels.length) return null;
  const rows: React.ReactNode[] = [];
  let i = 0;
  let rowKey = 0;
  while (i < reels.length) {
    const pattern = (rowKey % 3); // 0=full, 1=pair, 2=trio
    if (pattern === 0) {
      // Full-width featured card
      const v = reels[i];
      rows.push(
        <div key={`r${rowKey}`} className="-mx-3">
          <BentoCard video={v} onPlay={()=>onPlay(v)} wide idx={i}/>
        </div>
      );
      i++;
    } else if (pattern === 1) {
      // 2-column pair
      const pair = reels.slice(i, i+2);
      rows.push(
        <div key={`r${rowKey}`} className="grid grid-cols-2 gap-2">
          {pair.map((v,j)=>(
            <BentoCard key={v.id} video={v} onPlay={()=>onPlay(v)} idx={i+j}/>
          ))}
        </div>
      );
      i += pair.length;
    } else {
      // 3-column landscape trio
      const trio = reels.slice(i, i+3);
      rows.push(
        <div key={`r${rowKey}`} className="grid grid-cols-3 gap-1.5">
          {trio.map((v,j)=>(
            <BentoCard key={v.id} video={v} onPlay={()=>onPlay(v)} idx={i+j}/>
          ))}
        </div>
      );
      i += trio.length;
    }
    rowKey++;
  }
  return <div className="space-y-2">{rows}</div>;
}

/* ─────────────────────────────────────────────────────── */
/* OTubePage — MAIN                                        */
/* ─────────────────────────────────────────────────────── */
/* Unified signal board — replaces both tabs + category chips */
const SIGNALS = [
  {id:"all",      Icon:Globe,    label:"EFIR",    col:T.aurora,  tab:"home"   as const, cat:"all"},
  {id:"fire",     Icon:Flame,    label:"TREND",   col:"#ff4500", tab:"home"   as const, cat:"trending"},
  {id:"cinema",   Icon:Film,     label:"KINO",    col:"#ff2d55", tab:"home"   as const, cat:"cinema"},
  {id:"music",    Icon:Music2,   label:"MUSIQA",  col:"#a855f7", tab:"home"   as const, cat:"music"},
  {id:"gaming",   Icon:Gamepad2, label:"GAMING",  col:T.pulse,   tab:"home"   as const, cat:"gaming"},
  {id:"ai",       Icon:Brain,    label:"AI",      col:T.cyan,    tab:"home"   as const, cat:"ai"},
  {id:"shorts",   Icon:Zap,      label:"SHORTS",  col:T.orange,  tab:"shorts" as const, cat:""},
  {id:"channels", Icon:Tv,       label:"KANALLAR",col:T.violet,  tab:"subs"   as const, cat:""},
] as const;
type SignalId = typeof SIGNALS[number]["id"];

export default function OTubePage() {
  const { t } = useTranslation();
  const [,navigate]    = useLocation();
  const [signal, setSignal] = useState<SignalId>("all");
  const [query,setQuery]    = useState("");
  const [showSearch,setShowSearch] = useState(false);
  const [selected,setSelected]     = useState<Reel|null>(null);
  const [showSettings,setShowSettings] = useState(false);
  const [settings,setSettings]   = useState<PlayerSettings>(DEF_S);
  const [monetize,setMonetize]   = useState<MonetizationSettings>(DEF_M);
  const [notifDot,setNotifDot]   = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeSig  = SIGNALS.find(s=>s.id===signal)!;
  const tab        = activeSig.tab;

  const { data:raw=[], isLoading } = useListReels();

  const reels = useMemo(()=>{
    if (!query.trim()) return raw;
    const q = query.toLowerCase();
    return raw.filter(r=>r.caption.toLowerCase().includes(q)||r.author.displayName.toLowerCase().includes(q));
  },[raw,query]);

  const tx=useRef(0);const ty=useRef(0);
  const onTS=useCallback((e:React.TouchEvent)=>{tx.current=e.touches[0].clientX;ty.current=e.touches[0].clientY;},[]);
  const onTE=useCallback((e:React.TouchEvent)=>{
    const dx=tx.current-e.changedTouches[0].clientX;
    const dy=ty.current-e.changedTouches[0].clientY;
    if(Math.abs(dx)>Math.abs(dy)&&dx<-70)navigate("/reels");
  },[navigate]);

  useEffect(()=>{ if(showSearch)setTimeout(()=>searchRef.current?.focus(),120); },[showSearch]);

  const featured = reels[0]??null;
  const trending = reels.slice(1,9);
  const shorts   = reels.slice(0,6);
  const grid     = reels.slice(1);
  const newest   = [...reels].reverse().slice(0,4);

  return (
    <>
      {/* ── NEXUS AURORA SYSTEM — dynamic background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{zIndex:0}}>
        {/* Primary aurora band — top */}
        <motion.div
          animate={{x:[-30,30,-30],y:[-10,20,-10],opacity:[0.06,0.1,0.06]}}
          transition={{duration:14,repeat:Infinity,ease:"easeInOut"}}
          style={{position:"absolute",top:-180,left:-120,width:500,height:500,borderRadius:"50%",
            background:"radial-gradient(ellipse,rgba(0,255,238,0.18) 0%,transparent 65%)",
            filter:"blur(60px)"}}/>
        {/* Secondary aurora — right */}
        <motion.div
          animate={{x:[20,-20,20],y:[10,-30,10],opacity:[0.07,0.12,0.07]}}
          transition={{duration:18,repeat:Infinity,ease:"easeInOut",delay:3}}
          style={{position:"absolute",top:80,right:-140,width:420,height:420,borderRadius:"50%",
            background:"radial-gradient(ellipse,rgba(119,0,255,0.16) 0%,transparent 65%)",
            filter:"blur(55px)"}}/>
        {/* Third aurora — bottom */}
        <motion.div
          animate={{x:[-15,25,-15],y:[5,-15,5],opacity:[0.05,0.09,0.05]}}
          transition={{duration:22,repeat:Infinity,ease:"easeInOut",delay:6}}
          style={{position:"absolute",bottom:100,left:-60,width:360,height:360,borderRadius:"50%",
            background:"radial-gradient(ellipse,rgba(255,53,0,0.12) 0%,transparent 65%)",
            filter:"blur(50px)"}}/>
        {/* Quantum lattice — subtle dot grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:"radial-gradient(rgba(0,255,238,0.025) 1px,transparent 1px)",
          backgroundSize:"28px 28px"}}/>
      </div>

      <div className="h-full overflow-y-auto relative"
        style={{...DOT_BG,paddingBottom:100,zIndex:1}}
        onTouchStart={onTS} onTouchEnd={onTE}>

        {/* ── NEXUS BROADCAST HEADER — ultra-minimal ── */}
        <div className="sticky top-0 z-40"
          style={{background:"rgba(0,0,8,0.82)",backdropFilter:"blur(32px)",
            WebkitBackdropFilter:"blur(32px)",
            borderBottom:"1px solid rgba(255,255,255,0.04)"}}>

          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div key="search"
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                transition={{duration:0.16}}
                className="flex items-center gap-2 px-4 py-3">
                <motion.button whileTap={{scale:0.82}}
                  onClick={()=>{setShowSearch(false);setQuery("");}}
                  style={{width:36,height:36,flexShrink:0,borderRadius:"50%",
                    background:"rgba(255,255,255,0.07)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <ArrowLeft style={{width:14,height:14,color:"rgba(255,255,255,0.7)"}}/>
                </motion.button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5"
                  style={{borderRadius:12,background:"rgba(255,255,255,0.06)",
                    boxShadow:`0 0 0 1px ${T.aurora}22`}}>
                  <Search style={{width:12,height:12,color:`${T.aurora}66`,flexShrink:0}}/>
                  <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder={t("otube.search_signal_ph")}
                    className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/20"
                    style={{fontFamily:"inherit"}}/>
                  {query && <button onClick={()=>setQuery("")}>
                    <X style={{width:12,height:12,color:"rgba(255,255,255,0.3)"}}/>
                  </button>}
                </div>
              </motion.div>
            ) : (
              <motion.div key="logo"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.16}}
                className="flex items-center justify-between px-4 pt-3 pb-2">
                {/* Brand — minimal holographic */}
                <div className="flex items-center gap-2">
                  <OTubeMark size={30}/>
                  <div className="flex flex-col">
                    <span style={{fontSize:18,fontWeight:900,color:"white",letterSpacing:"-0.03em",lineHeight:1}}>
                      O<span style={{background:T.gAurora,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>T</span>ube
                    </span>
                    <motion.span
                      animate={{opacity:[0.4,0.8,0.4]}} transition={{duration:3,repeat:Infinity}}
                      style={{fontSize:7,fontWeight:700,color:T.aurora,letterSpacing:"0.22em",
                        fontFamily:"monospace",lineHeight:1}}>
                      NEXUS BROADCAST
                    </motion.span>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex items-center gap-1.5">
                  <SocialTicker/>
                  <motion.button whileTap={{scale:0.82}} onClick={()=>setNotifDot(false)}
                    className="relative"
                    style={{width:34,height:34,borderRadius:10,
                      background:"rgba(255,255,255,0.05)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Bell style={{width:14,height:14,color:"rgba(255,255,255,0.55)"}}/>
                    {notifDot && <motion.div
                      animate={{scale:[1,1.3,1]}} transition={{duration:1.8,repeat:Infinity}}
                      className="absolute top-1.5 right-1.5"
                      style={{width:6,height:6,borderRadius:"50%",background:"#ff3b30",
                        boxShadow:"0 0 8px #ff3b30"}}/>}
                  </motion.button>
                  <motion.button whileTap={{scale:0.82}} onClick={()=>setShowSearch(true)}
                    style={{width:34,height:34,borderRadius:10,
                      background:"rgba(255,255,255,0.05)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Search style={{width:14,height:14,color:"rgba(255,255,255,0.55)"}}/>
                  </motion.button>
                  <motion.button whileTap={{scale:0.82}} onClick={()=>setShowSettings(true)}
                    style={{width:34,height:34,borderRadius:10,
                      background:"rgba(255,255,255,0.05)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Settings style={{width:14,height:14,color:"rgba(255,255,255,0.55)"}}/>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SIGNAL NEXUS TUNER — 8 frequency nodes, replaces tab+cat ── */}
          {!showSearch && (
            <div className="flex overflow-x-auto px-3 pb-2.5 gap-1" style={{scrollbarWidth:"none"}}>
              {SIGNALS.map(({id,Icon,label,col})=>{
                const active = signal === id;
                return (
                  <motion.button key={id}
                    whileTap={{scale:0.88}}
                    onClick={()=>setSignal(id as SignalId)}
                    className="flex-shrink-0 flex flex-col items-center relative"
                    style={{minWidth:60,padding:"6px 4px 4px"}}>
                    {/* Active line — top indicator (NOT YouTube underline, this is a TOP bar) */}
                    <motion.div
                      animate={{
                        scaleX: active ? 1 : 0,
                        opacity: active ? 1 : 0,
                      }}
                      style={{position:"absolute",top:0,left:8,right:8,height:2,
                        background:`linear-gradient(90deg,transparent,${col},transparent)`,
                        borderRadius:99,transformOrigin:"center",
                        boxShadow:`0 0 8px ${col}`}}/>
                    {/* Icon tile */}
                    <motion.div
                      animate={{
                        background: active ? `${col}1a` : "rgba(255,255,255,0.03)",
                        boxShadow: active ? `0 0 0 1px ${col}44, 0 0 20px ${col}18` : "0 0 0 1px rgba(255,255,255,0.05)",
                      }}
                      transition={{duration:0.25}}
                      style={{width:40,height:40,borderRadius:13,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        marginBottom:4}}>
                      <Icon style={{width:17,height:17,color:active?col:"rgba(255,255,255,0.28)",
                        transition:"color 0.25s"}}/>
                    </motion.div>
                    {/* Label */}
                    <span style={{fontSize:8,fontWeight:active?800:500,
                      color:active?col:"rgba(255,255,255,0.22)",
                      letterSpacing:"0.04em",transition:"all 0.25s"}}>
                      {t(`otube.signal_${id}`)}
                    </span>
                    {/* SHORTS badge */}
                    {id==="shorts" && !active && (
                      <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:2.5,repeat:Infinity}}
                        style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",
                          background:T.pulse,boxShadow:`0 0 6px ${T.pulse}`}}/>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BROADCAST MATRIX — CONTENT ── */}
        <div className="px-3 pt-4 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <OTubeMark size={56}/>
                {/* Signal scanner bars */}
                <div className="flex items-end gap-1">
                  {[14,22,18,28,16,24,20,26].map((h,i)=>(
                    <motion.div key={i}
                      animate={{height:[h*0.4, h, h*0.4],opacity:[0.3,1,0.3]}}
                      transition={{duration:0.7,repeat:Infinity,delay:i*0.09,ease:"easeInOut"}}
                      style={{width:3,borderRadius:99,
                        background:i%3===0?T.aurora:i%3===1?T.orange:T.violet}}/>
                  ))}
                </div>
                <span style={{fontSize:9,color:T.aurora,letterSpacing:"0.22em",fontFamily:"monospace"}}>
                  NEXUS SCANNING...
                </span>
              </div>
            </div>
          ) : reels.length===0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <OTubeMark size={52}/>
              <p style={{color:"rgba(255,255,255,0.25)",fontSize:13,fontFamily:"monospace"}}>
                {query?`"${query}" — signal topilmadi`:"Kontent yo'q"}
              </p>
              {query && (
                <motion.button whileTap={{scale:0.9}} onClick={()=>setQuery("")}
                  className="flex items-center gap-2 px-4 py-2"
                  style={{background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`}}>
                  <RefreshCw style={{width:13,height:13,color:T.cyan}}/>
                  <span style={{fontSize:11,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>FILTER TOZALASH</span>
                </motion.button>
              )}
            </div>
          ) : tab==="home" ? (
            <>
              {/* XP / Streak — compact broadcast banner */}
              {!query && <StreakBanner/>}

              {/* ── PRIME SIGNAL — cinematic hero ── */}
              {featured && !query && (
                <div className="-mx-3 mb-0">
                  <HeroCard video={featured} onPlay={()=>setSelected(featured)}/>
                </div>
              )}

              {/* Search results */}
              {query && reels.length>0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <motion.div
                      animate={{opacity:[0.5,1,0.5]}} transition={{duration:1.4,repeat:Infinity}}
                      style={{width:8,height:8,borderRadius:"50%",background:T.aurora,
                        boxShadow:`0 0 8px ${T.aurora}`}}/>
                    <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.45)",
                      fontFamily:"monospace",letterSpacing:"0.06em"}}>
                      "{query}" — {reels.length} signal
                    </span>
                  </div>
                  {/* Asymmetric search grid */}
                  <BroadcastMatrix reels={reels} onPlay={v=>setSelected(v)}/>
                </section>
              )}

              {!query && (
                <>
                  {/* Continue Watching */}
                  <ContinueRow videos={reels.slice(2,7)} onPlay={v=>setSelected(v)}/>

                  {/* ── PULSE STREAM — trending, cinema horizontal ── */}
                  {trending.length>0 && (
                    <section className="mb-6">
                      {/* Broadcast station divider */}
                      <div className="flex items-center gap-3 mb-3 -mx-3 px-3">
                        <motion.div
                          animate={{opacity:[1,0.4,1]}} transition={{duration:1.1,repeat:Infinity}}
                          style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                            background:"#ff2d55",boxShadow:"0 0 10px #ff2d55"}}/>
                        <span style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",
                          letterSpacing:"0.22em",fontFamily:"monospace"}}>PULSE STREAM</span>
                        <div style={{flex:1,height:1,
                          background:"linear-gradient(90deg,rgba(255,45,85,0.4),transparent)"}}/>
                        <span style={{fontSize:8,color:"rgba(255,255,255,0.2)",fontFamily:"monospace",flexShrink:0}}>
                          {trending.length} signal
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto -mx-3 px-3 pb-2"
                        style={{scrollbarWidth:"none"}}>
                        {trending.map((v,i)=><TrendRow key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>)}
                      </div>
                    </section>
                  )}

                  {/* ── DISCOVERY MATRIX — asymmetric organic grid ── */}
                  {grid.length>0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-3 -mx-3 px-3">
                        <div style={{width:8,height:8,borderRadius:2,flexShrink:0,
                          background:T.nova,boxShadow:`0 0 8px ${T.nova}`}}/>
                        <span style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",
                          letterSpacing:"0.22em",fontFamily:"monospace"}}>DISCOVERY MATRIX</span>
                        <div style={{flex:1,height:1,
                          background:`linear-gradient(90deg,${T.nova}55,transparent)`}}/>
                      </div>
                      <BroadcastMatrix reels={grid} onPlay={v=>setSelected(v)}/>
                    </section>
                  )}
                </>
              )}
            </>
          ) : tab==="shorts" ? (
            <section>
              {/* Shorts header — broadcast style */}
              <div className="flex items-center gap-3 mb-4 -mx-3 px-3">
                <motion.div
                  animate={{scale:[1,1.2,1],opacity:[1,0.7,1]}} transition={{duration:0.9,repeat:Infinity}}
                  style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
                    background:T.orange,boxShadow:`0 0 12px ${T.orange}`}}/>
                <span style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",
                  letterSpacing:"0.22em",fontFamily:"monospace"}}>SHORTS SIGNAL</span>
                <div style={{flex:1,height:1,
                  background:`linear-gradient(90deg,${T.orange}55,transparent)`}}/>
                <span style={{fontSize:8,fontWeight:700,color:T.orange,fontFamily:"monospace",
                  padding:"2px 8px",borderRadius:99,background:`${T.orange}18`,flexShrink:0}}>
                  VERTICAL
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                {shorts.map(v=><ShortsCard key={v.id} video={v} onPlay={()=>setSelected(v)}/>)}
              </div>
              <div className="h-4"/>
              <BroadcastMatrix reels={raw} onPlay={v=>setSelected(v)}/>
            </section>
          ) : (
            /* CHANNELS tab */
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Tv style={{width:16,height:16,color:T.cyan}}/>
                <span style={{fontSize:13,fontWeight:900,letterSpacing:"0.1em",color:T.cyan}}>
                  {t("otube.channels_label")}
                </span>
              </div>
              {raw.slice(0,5).map((v,i)=>(
                <ChannelRow key={v.author.id} author={v.author} idx={i}/>
              ))}
              <div className="h-3"/>
              <div className="flex items-center gap-2 mb-3">
                <Play style={{width:13,height:13,color:T.orange}}/>
                <span style={{fontSize:10,fontWeight:900,letterSpacing:"0.12em",color:"rgba(255,255,255,0.6)"}}>
                  {t("otube.recent_streams")}
                </span>
              </div>
              {raw.slice(0,4).map(v=>(
                <motion.div key={v.id}
                  whileTap={{scale:0.97}} onClick={()=>setSelected(v)}
                  className="flex gap-3 cursor-pointer mb-2.5"
                  style={{padding:"10px 12px",borderRadius:14,
                    background:"rgba(255,255,255,0.04)",
                    boxShadow:"0 0 0 1px rgba(255,255,255,0.06)"}}>
                  <div style={{width:80,aspectRatio:"16/9",flexShrink:0,borderRadius:8,
                    position:"relative",overflow:"hidden"}}>
                    {v.thumbnailUrl
                      ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full" style={{background:"#0a0218"}}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{fontSize:11.5,fontWeight:600,color:"rgba(255,255,255,0.82)"}}
                      className="line-clamp-2 leading-snug mb-1">{v.caption||"Video"}</p>
                    <p style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{v.author.displayName}</p>
                    <span style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(v.viewsCount)} {t("otube.views")}</span>
                  </div>
                </motion.div>
              ))}
            </section>
          )}
        </div>

        {/* Swipe indicator */}
        <div className="flex items-end justify-center gap-3 py-10 pointer-events-none">
          {[{l:t("otube.sw_feed"),a:false},{l:"Reels",a:false},{l:"OTube",a:true}].map(d=>(
            <div key={d.l} className="flex flex-col items-center gap-1.5">
              <div style={{width:d.a?28:6,height:6,borderRadius:99,transition:"all 0.35s",
                background:d.a?T.gCyan:"rgba(255,255,255,0.07)",
                boxShadow:d.a?`0 0 12px ${T.cyan}88`:"none"}}/>
              <span style={{fontSize:8,fontWeight:700,letterSpacing:"0.08em",fontFamily:"monospace",
                color:d.a?T.cyan+"99":"rgba(255,255,255,0.18)"}}>
                {d.l.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <NexusPlayer key={selected.id}
            video={selected} onClose={()=>setSelected(null)} settings={settings}/>
        )}
      </AnimatePresence>

      <SettingsDrawer open={showSettings} onClose={()=>setShowSettings(false)}
        settings={settings} onSettings={setSettings}
        monetize={monetize} onMonetize={setMonetize}/>

      {/* Floating action button — only when player closed */}
      {!selected && <FloatingFAB/>}
    </>
  );
}
