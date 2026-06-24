/**
 * OTube — SIGNAL ENGINE v4
 * "BROADCAST STATION" — Kiberpu / Arcade / Neon estetikasi
 * YouTube'dan tubdan boshqa ko'rinish
 */
import {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useListReels, useLikeReel, useFollowUser } from "@workspace/api-client-react";
import type { Reel } from "@workspace/api-client-react";
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
  ListVideo, ShieldCheck, Crosshair,
} from "lucide-react";

/* ─────────────────────────────────────────────────────── */
/* Design tokens — BROADCAST / NEON                        */
/* ─────────────────────────────────────────────────────── */
const T = {
  bg:       "#000005",
  bg2:      "#08020f",
  card:     "#0c0315",
  cyan:     "#00e5ff",
  orange:   "#ff6b00",
  violet:   "#9d00ff",
  border:   "rgba(0,229,255,0.1)",
  borderHot:"rgba(0,229,255,0.35)",
  txt:      "rgba(255,255,255,0.92)",
  txtSub:   "rgba(255,255,255,0.38)",
  gCyan:    "linear-gradient(90deg,#00e5ff,#0088cc)",
  gOrange:  "linear-gradient(90deg,#ff6b00,#ff2d00)",
  gViolet:  "linear-gradient(90deg,#9d00ff,#5500cc)",
} as const;

/* Pure black — aurora blobs added in JSX */
const DOT_BG = { background: "#000000" } as const;

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
        <radialGradient id={`${id}s`} cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#ff6b6b"/>
          <stop offset="35%"  stopColor="#ef2020"/>
          <stop offset="75%"  stopColor="#b91c1c"/>
          <stop offset="100%" stopColor="#7f1d1d"/>
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#ff4444"/>
          <stop offset="100%" stopColor="#991b1b"/>
        </linearGradient>
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id={`${id}d`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3"
            floodColor="#ef2020" floodOpacity="0.55"/>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="22.5"
        stroke={`url(#${id}r)`} strokeWidth="1.2"
        fill="rgba(0,0,0,0.35)" filter={`url(#${id}g)`}/>
      <circle cx="24" cy="24" r="18"
        fill={`url(#${id}s)`} filter={`url(#${id}d)`}/>
      <ellipse cx="18.5" cy="15.5" rx="6.5" ry="4"
        fill="rgba(255,255,255,0.28)" transform="rotate(-18 18.5 15.5)"/>
      <ellipse cx="30" cy="14" rx="2.5" ry="1.5"
        fill="rgba(255,255,255,0.15)" transform="rotate(10 30 14)"/>
      <path d="M20 16.5 L32 24 L20 31.5 Z"
        fill="white" opacity="0.96"/>
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
                      {subbed?"✓ Obuna":"+ Obuna"}
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
                  active={disliked} activeColor={T.orange} label="Ko'rmadim">
                  <ThumbsDown style={{width:15,height:15,fill:disliked?T.orange:"none",color:disliked?T.orange:"rgba(255,255,255,0.55)"}}/>
                </IBtn>
                <IBtn onClick={()=>void handleShare()} active={shared} activeColor="#10b981" label="Ulashish">
                  {shared?<Check style={{width:15,height:15,color:"#10b981"}}/>
                         :<Share2 style={{width:15,height:15,color:"rgba(255,255,255,0.7)"}}/>}
                </IBtn>
                <IBtn onClick={toggleSave} active={saved} activeColor={T.violet} label="Saqlash">
                  <Bookmark style={{width:15,height:15,fill:saved?T.violet:"none",color:saved?T.violet:"rgba(255,255,255,0.65)"}}/>
                </IBtn>
                <IBtn onClick={()=>setShowCom(c=>!c)} active={showCom} label={fmt(video.commentsCount??0)}>
                  <MessageCircle style={{width:15,height:15,color:showCom?T.cyan:"rgba(255,255,255,0.65)"}}/>
                </IBtn>
                <IBtn onClick={()=>setDonating(d=>!d)} active={donating} activeColor={T.orange} label="Yordam">
                  <Star style={{width:15,height:15,fill:donating?T.orange:"none",color:donating?T.orange:"rgba(255,255,255,0.55)"}}/>
                </IBtn>
                <IBtn onClick={()=>setDanmaku(d=>!d)} active={danmaku} activeColor="#ffd700" label="Reakciya">
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
                        ⭐ {video.author.displayName}ga yordam
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
                          {donateAmt} so'm jo'natish
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
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:600}}>Tavsif</span>
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
                        {fmt(video.viewsCount)} ko'rish · {fmt(video.likesCount)} like
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
                        ✓ Faol
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
                    {speed}× TEZLIK
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
                  <p style={{fontSize:14,fontWeight:700,color:"white"}}>OTube Sozlamalar</p>
                  <p style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>Player va monetizatsiya</p>
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
              {([{id:"player",label:"🎬 O'ynatuvchi"},{id:"monetize",label:"💰 Monetizatsiya"}] as const)
                .map(({id,label})=>(
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
                  <SecHead>Ijro sozlamalari</SecHead>
                  <TRow icon="▶" label="Avtoijro" sub="Keyingi videoni avtomatik boshlash"
                    on={settings.autoplay} onToggle={()=>sP("autoplay",!settings.autoplay)}/>
                  <TRow icon="🔁" label="Takrorlash" sub="Videoni loop qilish"
                    on={settings.loop} onToggle={()=>sP("loop",!settings.loop)}/>
                  <TRow icon="🔇" label="Sukut ovoz" sub="Videolar shovqinsiz ochilsin"
                    on={settings.muteDefault} onToggle={()=>sP("muteDefault",!settings.muteDefault)}/>
                  <TRow icon="📶" label="HD oqim" sub="Yuqori sifat (ko'proq internet)"
                    on={settings.hdStream} onToggle={()=>sP("hdStream",!settings.hdStream)}/>

                  <SecHead>Ko'rish sozlamalari</SecHead>
                  <TRow icon="🎬" label="Kino rejimi" sub="Fon qorayadi"
                    on={settings.cinemaMode} onToggle={()=>sP("cinemaMode",!settings.cinemaMode)}/>
                  <TRow icon="📝" label="Sarlavha ko'rsatish" sub="Player ichida nom ko'rinsin"
                    on={settings.showTitle} onToggle={()=>sP("showTitle",!settings.showTitle)}/>

                  <SecHead>Video sifati</SecHead>
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
                      <span style={{fontSize:11,fontWeight:600,color:T.cyan}}>Kreator daromadi</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {l:"Ko'rishlar",v:fmt(views),i:"👁"},
                        {l:"Daromad",v:`${Number(rev).toLocaleString()} so'm`,i:"💰"},
                        {l:"Obunachi",v:"1.2K",i:"👥"},
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

                  <SecHead>Kreator rejimi</SecHead>
                  <TRow icon="🎥" label="Kreator rejimi" sub="Daromad va tahlillarni ko'rish"
                    on={monetize.creatorMode} onToggle={()=>sM("creatorMode",!monetize.creatorMode)}/>

                  <SecHead>Daromad manbalari</SecHead>
                  <TRow icon="📢" label="Reklama daromadi" sub="CPM: 1.8 so'm/ko'rish"
                    on={monetize.adsEnabled} onToggle={()=>sM("adsEnabled",!monetize.adsEnabled)}/>
                  <TRow icon="⭐" label="Super Thanks" sub="Tomoshabin yordam puli"
                    on={monetize.superThanks} onToggle={()=>sM("superThanks",!monetize.superThanks)}/>
                  <TRow icon="👑" label="A'zolik (Membership)" sub="Oylik to'lov bilan eksklyuziv kontent"
                    on={monetize.membershipEnabled} onToggle={()=>sM("membershipEnabled",!monetize.membershipEnabled)}/>

                  <SecHead>Minimal yordam miqdori</SecHead>
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
          {subbed?"✓ Obuna":"+ Obuna"}
        </span>
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Hero cinematic card                                     */
/* ─────────────────────────────────────────────────────── */
function HeroCard({ video, onPlay }: { video:Reel; onPlay:()=>void }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({x:0,y:0});
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
            {video.caption||"OTube Tanlangan"}
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

      {/* AI Smart Chapters strip */}
      <div className="px-3 pb-3" onClick={e=>e.stopPropagation()}
        style={{background:"rgba(0,0,0,0.2)"}}>
        <div className="flex items-center gap-1.5 mb-2">
          <Brain style={{width:9,height:9,color:`${T.cyan}99`}}/>
          <span style={{fontSize:8,fontWeight:700,color:`${T.cyan}70`,letterSpacing:"0.1em"}}>
            AI CHAPTERS
          </span>
        </div>
        <div className="flex gap-1">
          {([
            {label:"Kirish",    col:T.cyan,    flex:2},
            {label:"Asosiy",   col:T.orange,  flex:5},
            {label:"Kulminatsiya",col:"#ff2d55",flex:4},
            {label:"Xulosa",   col:T.violet,  flex:2},
          ] as const).map((ch,i)=>(
            <motion.div key={i}
              initial={{opacity:0,scaleX:0}} animate={{opacity:1,scaleX:1}}
              transition={{delay:0.3+i*0.08,type:"spring",damping:20}}
              style={{flex:ch.flex,height:3,borderRadius:99,
                background:ch.col,opacity:0.55,transformOrigin:"left center"}}/>
          ))}
        </div>
        <div className="flex mt-1">
          {([
            {label:"Kirish",    col:T.cyan,    flex:2},
            {label:"Asosiy",   col:T.orange,  flex:5},
            {label:"Kulminatsiya",col:"#ff2d55",flex:4},
            {label:"Xulosa",   col:T.violet,  flex:2},
          ] as const).map((ch,i)=>(
            <div key={i} style={{flex:ch.flex,overflow:"hidden"}}>
              <span style={{fontSize:6.5,color:ch.col,fontWeight:600,opacity:0.75,
                whiteSpace:"nowrap"}}>{ch.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* Watch Party quick-join button */
function WatchPartyBtn({ videoId }: { videoId: number }) {
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
        {joined?"👥 Birga ko'ryapsiz":"Birga ko'r"}
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
        {live.toLocaleString()} jonli
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* Trending list — vertical rank                           */
/* ─────────────────────────────────────────────────────── */
/* TrendRow renders a horizontal cinema card (used inside overflow-x scroll) */
function TrendRow({ video, onPlay, idx }:
  { video:Reel; onPlay:()=>void; idx:number }) {
  const COLS = [T.cyan, T.orange, T.violet, "#00ff88", "#ff2d55", "#ffd700"];
  const col = COLS[idx % COLS.length];
  return (
    <motion.div
      initial={{opacity:0,x:20,scale:0.94}} animate={{opacity:1,x:0,scale:1}}
      transition={{delay:idx*0.06,type:"spring",damping:22}}
      className="flex-shrink-0 cursor-pointer overflow-hidden relative"
      style={{width:160,borderRadius:14,
        boxShadow:`0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`}}
      whileTap={{scale:0.94}} onClick={onPlay}
    >
      {/* Thumbnail */}
      <div style={{aspectRatio:"9/12",position:"relative",overflow:"hidden"}}>
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full"
              style={{background:`linear-gradient(160deg,${col}22,#000)`}}/>}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:"linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.05) 55%,transparent 100%)"}}/>
        {/* Rank badge */}
        <div className="absolute top-2.5 left-2.5"
          style={{width:28,height:28,borderRadius:"50%",
            background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 0 0 1.5px ${col}55`}}>
          <span style={{fontSize:12,fontWeight:900,color:col,fontFamily:"monospace"}}>{idx+1}</span>
        </div>
        {/* Velocity badge */}
        {(()=>{
          const vel = 8+((idx*13+7)%41);
          const vc = vel>30?"#ff2d55":vel>18?T.orange:T.cyan;
          return (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5"
              style={{borderRadius:99,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",
                boxShadow:`0 0 0 1px ${vc}44`}}>
              <ArrowUp style={{width:7,height:7,color:vc}}/>
              <span style={{fontSize:7.5,fontWeight:700,color:vc,fontFamily:"monospace"}}>{vel}%</span>
            </div>
          );
        })()}
        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <p style={{fontSize:10.5,fontWeight:700,color:"white",lineHeight:1.3,marginBottom:4}}
            className="line-clamp-2">{video.caption||"Video"}</p>
          <div className="flex items-center gap-1.5">
            <Eye style={{width:8,height:8,color:"rgba(255,255,255,0.4)"}}/>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>
              {fmt(video.viewsCount)}
            </span>
            {/* Duration */}
            <span style={{marginLeft:"auto",fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.55)",
              fontFamily:"monospace",background:"rgba(0,0,0,0.55)",padding:"1px 5px",borderRadius:4}}>
              {1+(video.id%12)}:{String((video.id*13)%60).padStart(2,"0")}
            </span>
          </div>
        </div>
        {/* Color accent bottom */}
        <div className="absolute bottom-0 inset-x-0 h-[2px]"
          style={{background:col,opacity:0.6}}/>
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
  useEffect(()=>{
    const t = setInterval(()=>setXp(x=>x+(Math.random()>0.7?10:0)),4000);
    return ()=>clearInterval(t);
  },[]);
  const dots = [true,true,true,true,true,true,false]; // 6/7 kunlik streak
  return (
    <motion.div
      initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}}
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
            Davom ettirish
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
/* Floating FAB — speed dial                               */
/* ─────────────────────────────────────────────────────── */
function FloatingFAB() {
  const [open, setOpen] = useState(false);
  const items = [
    { Icon: Upload,    label: "Yuklash",    col: T.cyan },
    { Icon: Radio,     label: "Jonli efir", col: "#ff2d55" },
    { Icon: Zap,       label: "Short",      col: T.orange },
    { Icon: Swords,    label: "Challenge",  col: "#00ff88" },
    { Icon: Crosshair, label: "Klip yarating", col: T.violet },
  ];
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2.5 pointer-events-none">
      <AnimatePresence>
        {open && items.map((item, i) => (
          <motion.button key={i}
            initial={{opacity:0,x:24,scale:0.75}} animate={{opacity:1,x:0,scale:1}}
            exit={{opacity:0,x:24,scale:0.75}}
            transition={{delay:i*0.05,type:"spring",damping:22,stiffness:280}}
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
      <motion.button className="pointer-events-auto" whileTap={{scale:0.86}}
        onClick={()=>setOpen(o=>!o)}
        style={{width:54,height:54,borderRadius:"50%",
          background:open?"rgba(255,255,255,0.08)":T.cyan,
          boxShadow:open
            ?"0 0 0 1px rgba(255,255,255,0.18), 0 4px 20px rgba(0,0,0,0.5)"
            :`0 0 32px ${T.cyan}66, 0 0 0 1.5px ${T.cyan}, 0 4px 20px rgba(0,0,0,0.5)`,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"background 0.22s, box-shadow 0.22s"}}>
        <motion.div animate={{rotate:open?45:0}} transition={{type:"spring",damping:18,stiffness:320}}>
          <Plus style={{width:22,height:22,color:open?"rgba(255,255,255,0.65)":"#000"}}/>
        </motion.div>
      </motion.button>
    </div>
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
/* OTubePage — MAIN                                        */
/* ─────────────────────────────────────────────────────── */
const CATS = [
  {id:"all",      label:"ALL",       Icon:Globe,      col:T.cyan},
  {id:"trending", label:"TREND",     Icon:TrendingUp, col:T.orange},
  {id:"cinema",   label:"KINO",      Icon:Film,       col:"#ff2d55"},
  {id:"music",    label:"MUSIQA",    Icon:Music2,     col:T.cyan},
  {id:"gaming",   label:"GAMING",    Icon:Gamepad2,   col:"#00ff88"},
  {id:"ai",       label:"AI",        Icon:Sparkles,   col:T.orange},
  {id:"live",     label:"◉ LIVE",    Icon:Zap,        col:"#ff2d55"},
  {id:"new",      label:"YANGI",     Icon:Clock,      col:T.violet},
];
const TABS=[
  {id:"home",  l:"BROADCAST", badge:null},
  {id:"shorts",l:"SHORTS",    badge:"NEW"},
  {id:"subs",  l:"CHANNELS",  badge:null},
] as const;

export default function OTubePage() {
  const [,navigate]  = useLocation();
  const [cat,setCat] = useState("all");
  const [query,setQuery] = useState("");
  const [showSearch,setShowSearch] = useState(false);
  const [selected,setSelected] = useState<Reel|null>(null);
  const [showSettings,setShowSettings] = useState(false);
  const [settings,setSettings] = useState<PlayerSettings>(DEF_S);
  const [monetize,setMonetize] = useState<MonetizationSettings>(DEF_M);
  const [tab,setTab] = useState<"home"|"shorts"|"subs">("home");
  const [notifDot,setNotifDot] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

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
      {/* Aurora background blobs — fixed */}
      <div className="fixed inset-0 pointer-events-none" style={{zIndex:0}}>
        <div style={{position:"absolute",top:-120,left:-80,width:340,height:340,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,229,255,0.07) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        <div style={{position:"absolute",top:220,right:-100,width:280,height:280,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(157,0,255,0.06) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        <div style={{position:"absolute",bottom:160,left:40,width:220,height:220,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(255,107,0,0.05) 0%,transparent 70%)",filter:"blur(36px)"}}/>
      </div>
      <div className="h-full overflow-y-auto relative"
        style={{...DOT_BG,paddingBottom:100,zIndex:1}}
        onTouchStart={onTS} onTouchEnd={onTE}>

        {/* ── HEADER — floating, no borders ── */}
        <div className="sticky top-0 z-40"
          style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(28px)",
            WebkitBackdropFilter:"blur(28px)"}}>

          <div className="px-4 pt-4 pb-3">
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div key="search"
                  initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{duration:0.18}}
                  className="flex items-center gap-2 mb-3">
                  <motion.button whileTap={{scale:0.85}}
                    onClick={()=>{setShowSearch(false);setQuery("");}}
                    style={{width:38,height:38,flexShrink:0,borderRadius:"50%",
                      background:"rgba(255,255,255,0.08)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <ArrowLeft style={{width:15,height:15,color:"rgba(255,255,255,0.8)"}}/>
                  </motion.button>
                  <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5"
                    style={{borderRadius:99,background:"rgba(255,255,255,0.07)",
                      boxShadow:"0 0 0 1px rgba(255,255,255,0.1)"}}>
                    <Search style={{width:13,height:13,color:"rgba(255,255,255,0.4)",flexShrink:0}}/>
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)}
                      placeholder="Video, kanal, qo'shiq..."
                      className="flex-1 bg-transparent outline-none text-white text-[13px] placeholder:text-white/25"
                      style={{fontFamily:"inherit"}}/>
                    {query && <button onClick={()=>setQuery("")}><X style={{width:13,height:13,color:"rgba(255,255,255,0.3)"}}/></button>}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="logo"
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                  transition={{duration:0.18}}
                  className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <OTubeMark size={34}/>
                    <span className="font-black text-[21px]" style={{color:"white",letterSpacing:"-0.02em"}}>
                      O<span style={{color:T.cyan}}>T</span>ube
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Social gravity ticker */}
                    <SocialTicker/>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setNotifDot(false)}
                      className="relative"
                      style={{width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.07)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Bell style={{width:14,height:14,color:"rgba(255,255,255,0.6)"}}/>
                      {notifDot && <div className="absolute top-1.5 right-1.5"
                        style={{width:7,height:7,borderRadius:"50%",background:"#ff3b30",
                          boxShadow:"0 0 6px #ff3b30"}}/>}
                    </motion.button>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setShowSearch(true)}
                      style={{width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.07)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Search style={{width:14,height:14,color:"rgba(255,255,255,0.6)"}}/>
                    </motion.button>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setShowSettings(true)}
                      style={{width:36,height:36,borderRadius:"50%",
                        background:"rgba(255,255,255,0.07)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Settings style={{width:14,height:14,color:"rgba(255,255,255,0.6)"}}/>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav tabs — round pills */}
            <div className="flex gap-2 overflow-x-auto mb-3" style={{scrollbarWidth:"none"}}>
              {TABS.map(t=>(
                <motion.button key={t.id} onClick={()=>setTab(t.id)}
                  whileTap={{scale:0.93}}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 relative"
                  style={{borderRadius:99,fontSize:10.5,fontWeight:700,letterSpacing:"0.06em",
                    background:tab===t.id?"rgba(255,255,255,0.12)":"transparent",
                    color:tab===t.id?"white":"rgba(255,255,255,0.35)",
                    boxShadow:tab===t.id?`0 0 0 1px rgba(255,255,255,0.2), 0 0 18px ${T.cyan}22`:"none",
                    transition:"all 0.2s"}}>
                  {t.l}
                  {t.badge && (
                    <motion.span
                      animate={{scale:[1,1.1,1]}} transition={{duration:2,repeat:Infinity}}
                      style={{fontSize:7,fontWeight:900,color:"#000",background:"#00ff88",
                        padding:"1px 5px",borderRadius:99,letterSpacing:"0.06em",
                        boxShadow:"0 0 8px rgba(0,255,136,0.6)"}}>
                      {t.badge}
                    </motion.span>
                  )}
                  {t.id==="home" && tab==="home" && (
                    <span style={{fontSize:8,color:`${T.cyan}88`,fontFamily:"monospace",fontWeight:700}}>
                      {reels.length}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Category chips — round pills */}
            {tab==="home" && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{scrollbarWidth:"none"}}>
                {CATS.map(({id,label,Icon,col})=>{
                  const active=cat===id;
                  return (
                    <motion.button key={id} whileTap={{scale:0.88}} onClick={()=>setCat(id)}
                      className="flex items-center gap-1.5 flex-shrink-0"
                      style={{padding:"5px 12px",borderRadius:99,
                        background:active?`${col}22`:"rgba(255,255,255,0.05)",
                        boxShadow:active?`0 0 0 1px ${col}55, 0 0 16px ${col}22`:"0 0 0 1px rgba(255,255,255,0.08)",
                        transition:"all 0.2s"}}>
                      <Icon style={{width:9,height:9,color:active?col:"rgba(255,255,255,0.35)"}}/>
                      <span style={{fontSize:10,fontWeight:active?700:500,
                        color:active?col:"rgba(255,255,255,0.45)"}}>
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
        <div className="px-3 pt-4 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <OTubeMark size={56}/>
                <div className="flex items-center gap-1">
                  {[0,1,2,3].map(i=>(
                    <motion.div key={i}
                      animate={{opacity:[0.3,1,0.3],scaleY:[0.5,1,0.5]}}
                      transition={{duration:0.8,repeat:Infinity,delay:i*0.15}}
                      style={{width:3,height:20,background:T.cyan}}/>
                  ))}
                </div>
                <span style={{fontSize:10,color:T.cyan,letterSpacing:"0.18em",fontFamily:"monospace"}}>
                  SIGNAL SCANNING...
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
              {/* Streak banner — always visible on home */}
              {!query && <StreakBanner/>}

              {/* Featured hero — edge-to-edge */}
              {featured && !query && (
                <div className="-mx-3 mb-2">
                  <HeroCard video={featured} onPlay={()=>setSelected(featured)}/>
                </div>
              )}

              {/* Search results */}
              {query && reels.length>0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Search style={{width:13,height:13,color:"rgba(255,255,255,0.4)"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)"}}>
                      "{query}" — {reels.length} ta natija
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {reels.map((v,i)=><BentoCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>)}
                  </div>
                </section>
              )}

              {!query && (
                <>
                  {/* Continue Watching */}
                  <ContinueRow videos={reels.slice(2,7)} onPlay={v=>setSelected(v)}/>

                  {/* Trending — horizontal scroll cinema strip */}
                  {trending.length>0 && (
                    <section className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <ChBadge n="01" color={T.orange}/>
                        <div className="flex items-center gap-1.5">
                          <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.55)",letterSpacing:"0.04em"}}>
                            Trending
                          </span>
                          {/* Live trending pulse */}
                          <motion.div className="flex items-center gap-1 px-2 py-0.5"
                            style={{borderRadius:99,background:"rgba(255,45,85,0.12)",
                              boxShadow:"0 0 0 1px rgba(255,45,85,0.3)"}}>
                            <motion.div
                              animate={{opacity:[1,0.2,1]}} transition={{duration:0.9,repeat:Infinity}}
                              style={{width:4,height:4,borderRadius:"50%",background:"#ff2d55",
                                boxShadow:"0 0 5px #ff2d55"}}/>
                            <span style={{fontSize:7.5,fontWeight:700,color:"#ff2d55",letterSpacing:"0.08em"}}>
                              LIVE
                            </span>
                          </motion.div>
                        </div>
                      </div>
                      <div className="flex gap-3 overflow-x-auto -mx-3 px-3 pb-2"
                        style={{scrollbarWidth:"none"}}>
                        {trending.map((v,i)=><TrendRow key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>)}
                      </div>
                    </section>
                  )}

                  {/* Mood rows — curated themed */}
                  <MoodRow title="Kech uchun" emoji="🌙" col={T.violet}
                    videos={reels.filter((_,i)=>i%3===0)}
                    onPlay={v=>setSelected(v)}/>
                  <MoodRow title="Energiya" emoji="⚡" col={T.orange}
                    videos={reels.filter((_,i)=>i%2===0)}
                    onPlay={v=>setSelected(v)}/>
                  <MoodRow title="Kulgili" emoji="😂" col={T.cyan}
                    videos={reels.filter((_,i)=>i%2===1)}
                    onPlay={v=>setSelected(v)}/>

                  {/* Discovery — organic alternating grid */}
                  {grid.length>0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <ChBadge n="02" color={T.violet}/>
                        <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.55)",letterSpacing:"0.04em"}}>
                          Kashfiyot
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {grid.map((v,i)=>{
                          const isWide = i===0 || i===4 || i===9;
                          return (
                            <BentoCard key={v.id} video={v} onPlay={()=>setSelected(v)}
                              wide={isWide} idx={i}/>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          ) : tab==="shorts" ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div style={{width:26,height:26,
                  background:T.orange,display:"flex",alignItems:"center",justifyContent:"center",
                  clipPath:"polygon(0 4px,4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px))"}}>
                  <Zap style={{width:13,height:13,fill:"white",color:"white"}}/>
                </div>
                <span style={{fontSize:15,fontWeight:900,color:"white",letterSpacing:"0.05em"}}>SHORTS</span>
                <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.12em",
                  color:T.orange,background:`${T.orange}18`,
                  padding:"2px 8px",border:`1px solid ${T.orange}44`}}>
                  VERTICAL
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                {shorts.map(v=><ShortsCard key={v.id} video={v} onPlay={()=>setSelected(v)}/>)}
              </div>
              <div className="h-4"/>
              <div className="grid grid-cols-2 gap-2">
                {raw.map((v,i)=><BentoCard key={v.id} video={v} onPlay={()=>setSelected(v)} idx={i}/>)}
              </div>
            </section>
          ) : (
            /* CHANNELS tab */
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Tv style={{width:16,height:16,color:T.cyan}}/>
                <span style={{fontSize:13,fontWeight:900,letterSpacing:"0.1em",color:T.cyan}}>
                  KANALLAR
                </span>
              </div>
              {raw.slice(0,5).map((v,i)=>(
                <ChannelRow key={v.author.id} author={v.author} idx={i}/>
              ))}
              <div className="h-3"/>
              <div className="flex items-center gap-2 mb-3">
                <Play style={{width:13,height:13,color:T.orange}}/>
                <span style={{fontSize:10,fontWeight:900,letterSpacing:"0.12em",color:"rgba(255,255,255,0.6)"}}>
                  SO'NGGI EFIRLAR
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
                    <span style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{fmt(v.viewsCount)} ko'rish</span>
                  </div>
                </motion.div>
              ))}
            </section>
          )}
        </div>

        {/* Swipe indicator */}
        <div className="flex items-end justify-center gap-3 py-10 pointer-events-none">
          {[{l:"Lenta",a:false},{l:"Reels",a:false},{l:"OTube",a:true}].map(d=>(
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
