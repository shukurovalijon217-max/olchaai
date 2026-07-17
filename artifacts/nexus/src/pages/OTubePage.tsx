/**
 * OTube — SIGNAL ENGINE v4
 * "BROADCAST STATION" — Kiberpu / Arcade / Neon estetikasi
 * YouTube'dan tubdan boshqa ko'rinish
 */
import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import Hls from "hls.js";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useListReels, getListReelsQueryKey, useLikeReel, useFollowUser, useCreateReel, useRequestUploadUrl, useListNotifications, markAllNotificationsRead, useDeleteReel, useStartLive, useGetContinueWatching, useUpdateReelProgress, useGetStreak, useTouchStreak, useCreateChallenge, useListReelCollaborators, useInviteReelCollaborator, useRemoveReelCollaborator, useOtubeAiColorCorrection } from "@workspace/api-client-react";
import type { Reel, UploadUrlRequest, Notification, ContinueWatchingItem, StreakInfo, Challenge, ChallengeInput, ReelCollaborator } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { usePip } from "@/context/PipContext";
import { useDockedState } from "@/hooks/useDockedState";
import {
  Play, Pause, Volume2, VolumeX, ArrowLeft, Search, X,
  Eye, Heart, Share2, Check, Film, Music2, Gamepad2,
  Zap, Sparkles, TrendingUp, Globe, Settings, Bell,
  RotateCcw, ChevronRight, ChevronDown, ChevronUp, RefreshCw,
  MessageCircle, Bookmark, Plus, DollarSign, Star,
  Users, Clock, ThumbsUp, ThumbsDown, Gauge, Upload,
  Maximize2, Minimize2, BadgeDollarSign, Radio, Tv,
  Brain, Flame, Trophy, Moon, ArrowUp, BarChart2, Layers,
  SmilePlus, Swords, Wind, Award, Tag, Cpu, Activity,
  ListVideo, ShieldCheck, Crosshair, Scissors, Timer, Sliders,
  Type, Smile, Music, ChevronLeft, Camera, Mic2, ImagePlus,
  Wand2, AlignCenter, FastForward, Palette, SlidersHorizontal,
  PictureInPicture2, MoreVertical, Trash2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────── */
/* API base URL — must be absolute in production           */
/* ─────────────────────────────────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

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
/* ── Danmaku overlay — floating reactions, fed by real reel comments ── */
const DANK_COLS = ["#00e5ff","#ff6b00","#a855f7","#00ff88","#ff2d55","#ffd700","white"];
function DanmakuOverlay({ active, reelId }: { active:boolean; reelId:number }) {
  const { data: comments = [] } = useQuery<ApiComment[]>({
    queryKey: ["reel-comments", reelId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/reels/${reelId}/comments`, { credentials:"include" });
      if (!r.ok) throw new Error("Izohlarni olishda xatolik");
      return r.json() as Promise<ApiComment[]>;
    },
    enabled: active,
    staleTime: 30_000,
  });
  const [items, setItems] = useState<{id:number;msg:string;top:number;col:string;dur:number}[]>([]);
  const ctr = useRef(0);
  useEffect(()=>{
    if (!active || comments.length===0) { setItems([]); return; }
    const iv = setInterval(()=>{
      const id = ctr.current++;
      const c = comments[Math.floor(Math.random()*comments.length)];
      setItems(prev=>[...prev.slice(-14),{
        id, msg: `${c.author.displayName||c.author.username}: ${c.content}`,
        top: 8+Math.random()*62,
        col: DANK_COLS[Math.floor(Math.random()*DANK_COLS.length)],
        dur: 5+Math.random()*3,
      }]);
    }, 1400);
    return ()=>clearInterval(iv);
  },[active, comments]);
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
      const r = await fetch(`${API_BASE}/api/reels/${reelId}/comments`, { credentials:"include" });
      if (!r.ok) throw new Error("Izohlarni olishda xatolik");
      return r.json() as Promise<ApiComment[]>;
    },
    staleTime: 30_000,
  });

  const postMut = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch(`${API_BASE}/api/reels/${reelId}/comments`, {
        method:"POST", credentials:"include", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ content }),
      });
      if (r.status === 401) throw new Error("Izoh yozish uchun tizimga kiring");
      if (!r.ok) throw new Error("Izoh qo'shishda xatolik");
      return r.json() as Promise<ApiComment>;
    },
    onSuccess: (newComment) => {
      qc.setQueryData<ApiComment[]>(["reel-comments", reelId], old =>
        old ? [newComment, ...old] : [newComment]
      );
    },
    onError: (err: Error) => {
      toast({ title: "Xato", description: err.message, variant: "destructive" });
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
              ? <img loading="lazy" decoding="async" src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
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
                ? <img loading="lazy" decoding="async" src={c.author.avatarUrl} alt="" className="w-full h-full object-cover"/>
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
/* VersionHistoryPanel — real version history               */
/* ─────────────────────────────────────────────────────── */
function VersionHistoryPanel({ reelId, currentCaption }: { reelId: number | null; currentCaption: string }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    if (!reelId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/reels/${reelId}/versions`, { credentials: "include" });
      if (r.ok) setVersions(await r.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reelId]);

  const saveVersion = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/reels/${reelId}/versions`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); setNote(""); void load(); }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>
        📋 VERSIYA TARIXI
      </div>
      {!reelId && (
        <div style={{padding:"12px",borderRadius:8,background:"rgba(255,255,255,0.03)",
          border:"1px dashed rgba(255,255,255,0.08)",textAlign:"center",marginBottom:8}}>
          <span style={{fontSize:10.5,color:"rgba(255,255,255,0.3)"}}>Video saqlangandan keyin versiya tarixi yoqiladi</span>
        </div>
      )}
      {/* Save snapshot */}
      <div style={{display:"flex",gap:6,marginBottom:10,opacity:reelId?1:0.35,pointerEvents:reelId?undefined:"none"}}>
        <input value={note} onChange={e=>setNote(e.target.value)}
          placeholder="Izoh (ixtiyoriy)"
          style={{flex:1,background:"rgba(255,255,255,0.06)",color:"white",fontSize:11,padding:"7px 10px",
            borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",outline:"none"}}/>
        <button onClick={()=>void saveVersion()} disabled={saving}
          style={{padding:"7px 12px",borderRadius:8,background:saved?"#22c55e":T.cyan,
            color:"#000",fontSize:11,fontWeight:700,opacity:saving?0.5:1}}>
          {saved?"✓":saving?"...":"Saqlash"}
        </button>
      </div>
      {/* Version list */}
      {!reelId ? null : loading ? (
        <div style={{textAlign:"center",padding:10,color:"rgba(255,255,255,0.3)",fontSize:11}}>Yuklanmoqda...</div>
      ) : versions.length === 0 ? (
        <div style={{padding:"12px",borderRadius:8,background:"rgba(255,255,255,0.03)",
          border:"1px dashed rgba(255,255,255,0.08)",textAlign:"center"}}>
          <span style={{fontSize:10.5,color:"rgba(255,255,255,0.3)"}}>Hali versiya saqlanmagan</span>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {versions.slice(0, 8).map((v: any) => (
            <div key={v.id} style={{padding:"8px 10px",borderRadius:8,
              background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>
                  {v.displayName || v.username}
                </span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>
              {v.caption && <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",lineHeight:1.4,marginBottom:v.note?4:0}} className="line-clamp-2">{v.caption}</p>}
              {v.note && <p style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontStyle:"italic"}}>"{v.note}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* NexusPlayer — BROADCAST STYLE                           */
/* ─────────────────────────────────────────────────────── */
function NexusPlayer({ video, onClose, settings, onPip, onNext, onPrev, hasNext, hasPrev }:
  { video:Reel; onClose:()=>void; settings:PlayerSettings; onPip?:(time:number)=>void;
    onNext?:()=>void; onPrev?:()=>void; hasNext?:boolean; hasPrev?:boolean }) {
  const { t } = useTranslation();
  const qc             = useQueryClient();
  const [, navPlayer]  = useLocation();
  const { user }       = useAuth();
  const { setPlayerOpen } = usePip();
  const videoRef   = useRef<HTMLVideoElement>(null);
  const hlsRef     = useRef<Hls|null>(null);
  const contRef    = useRef<HTMLDivElement>(null);
  const ctrlTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastTap    = useRef(0);
  const tapTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longHold   = useRef<ReturnType<typeof setTimeout>|null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval>|null>(null);
  const holdRateRef = useRef(1);
  const viewTracked = useRef(false);
  const progressRef = useRef({ time: 0, dur: 0 });
  const lastReportRef = useRef(0);
  const swipeTY = useRef(0);
  const swipeTX = useRef(0);
  const swipeActive = useRef(false);
  const [dragY, setDragY] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const isDragging = useRef(false);

  const [playing,   setPlaying]   = useState(false);
  const [muted,     setMuted]     = useState(settings.muteDefault);
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const [showMore,  setShowMore]  = useState(false);
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
  const [speed,     setSpeed]     = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showCom,   setShowCom]   = useState(false);
  const [isFull,    setIsFull]    = useState(false);
  const [showDesc,  setShowDesc]  = useState(false);
  const [donating,  setDonating]  = useState(false);
  const [danmaku,   setDanmaku]   = useState(false);
  const [donateAmt, setDonateAmt] = useState("2000");
  const [walletBal, setWalletBal] = useState<number|null>(null);
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftResult, setGiftResult] = useState<"ok"|"err"|"low"|null>(null);
  const [showDub, setShowDub] = useState(false);
  const [dubLang, setDubLang] = useState("uz");
  const [dubbing, setDubbing] = useState(false);
  const [dubResult, setDubResult] = useState<{translated:string;audioB64:string;lang:string}|null>(null);
  const dubAudioRef = useRef<HTMLAudioElement|null>(null);
  const [swipeHint, setSwipeHint] = useState<"up"|"down"|null>(null);

  /* Tizimga kirmagan foydalanuvchi uchun: amalni bajarish o'rniga login sahifasiga yo'naltirish */
  const requireLogin = useCallback(() => {
    if (user) return true;
    toast({
      title: "Tizimga kiring",
      description: "Bu amalni bajarish uchun avval tizimga kiring.",
      variant: "destructive",
    });
    navPlayer("/login");
    return false;
  }, [user, navPlayer]);

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

  const isOwner = !!user && user.id === video.author.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMut = useDeleteReel({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/reels"] });
        onClose();
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

  /* ── HLS source attachment ─────────────────────────────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const src = (video as any).hlsUrl ?? video.videoUrl;
    if (!src) return;
    if (src.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
    } else {
      v.src = src ?? "";
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(video as any).hlsUrl, video.videoUrl]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const v = videoRef.current;
    if (v && settings.autoplay) {
      v.play()
        .then(()=>setPlaying(true))
        .catch(()=>{
          /* browser blocks unmuted autoplay → try muted */
          setMuted(true);
          v.muted = true;
          v.play().then(()=>setPlaying(true)).catch(()=>{});
        });
    }
    return () => { document.body.style.overflow = ""; };
  }, [settings.autoplay]);

  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update); };
  }, []);

  useEffect(() => {
    const h = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  /* ── Keyboard + Mouse Wheel navigation (desktop) ── */
  useEffect(() => {
    const wheelCooldown = { active: false };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (e.key === "ArrowUp" && hasNext && onNext) {
          setSwipeHint("up");
          setTimeout(() => setSwipeHint(null), 400);
          setTimeout(() => onNext(), 160);
        } else if (e.key === "ArrowDown" && hasPrev && onPrev) {
          setSwipeHint("down");
          setTimeout(() => setSwipeHint(null), 400);
          setTimeout(() => onPrev(), 160);
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (wheelCooldown.active) return;
      if (Math.abs(e.deltaY) < 40) return;
      wheelCooldown.active = true;
      setTimeout(() => { wheelCooldown.active = false; }, 800);
      if (e.deltaY > 0 && hasNext && onNext) {
        setSwipeHint("up");
        setTimeout(() => setSwipeHint(null), 400);
        setTimeout(() => onNext(), 160);
      } else if (e.deltaY < 0 && hasPrev && onPrev) {
        setSwipeHint("down");
        setTimeout(() => setSwipeHint(null), 400);
        setTimeout(() => onPrev(), 160);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [hasNext, hasPrev, onNext, onPrev]);

  /* Tell the global chrome (Muni assistant orb, dock edge tabs, avatar bubble)
     to hide while this full-screen player is mounted, so they stop swallowing
     taps meant for the player's own top-bar / action-panel buttons. */
  useEffect(() => {
    setPlayerOpen(true);
    return () => setPlayerOpen(false);
  }, [setPlayerOpen]);

  const toggleFull = useCallback(async () => {
    const el = contRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean }) | null;
    if (!document.fullscreenElement) {
      if (el?.requestFullscreen) {
        try { await el.requestFullscreen(); return; } catch { /* fall through to iOS fallback */ }
      }
      /* iOS Safari has no generic Fullscreen API — only <video> supports native fullscreen there */
      if (v?.webkitEnterFullscreen && !v.webkitDisplayingFullscreen) {
        try { v.webkitEnterFullscreen(); } catch { /* nothing else we can do */ }
      }
    } else if (document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch{}
    }
  }, []);

  const resetCtrl = useCallback(() => {
    setShowCtrl(true);
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(()=>setShowCtrl(false), 6000);
  }, []);
  useEffect(() => {
    resetCtrl();
    return () => { if (ctrlTimer.current) clearTimeout(ctrlTimer.current); };
  }, [resetCtrl]);

  /* Real watch-progress persistence — throttled during playback, flushed on pause/unmount */
  const updateProgressMut = useUpdateReelProgress();
  const reportProgress = useCallback(() => {
    const { time, dur } = progressRef.current;
    if (dur > 0 && time > 0) {
      updateProgressMut.mutate({ id: video.id, data: { positionSec: Math.floor(time), durationSec: Math.floor(dur) } });
    }
  }, [video.id]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) {
      v.play().then(()=>{
        setPlaying(true);
        if (!viewTracked.current) {
          viewTracked.current = true;
          fetch(`${API_BASE}/api/reels/${video.id}/view`, { method:"POST" }).catch(()=>{});
        }
      }).catch(()=>{});
    } else { v.pause(); setPlaying(false); reportProgress(); }
    resetCtrl();
  }, [resetCtrl, video.id, reportProgress]);

  useEffect(() => {
    return () => { reportProgress(); };
  }, [reportProgress]);

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

  const startHold = useCallback((e:React.SyntheticEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const native=e.nativeEvent as MouseEvent&TouchEvent;
    const clientX=native.touches&&native.touches.length?native.touches[0].clientX:native.clientX;
    const side=clientX-rect.left<rect.width/2?"left":"right";
    holdRateRef.current=videoRef.current?.playbackRate??speed;
    if(longHold.current)clearTimeout(longHold.current);
    longHold.current=setTimeout(()=>{
      if(holdInterval.current)clearInterval(holdInterval.current);
      holdInterval.current=setInterval(()=>{
        const v=videoRef.current;if(!v)return;
        const delta=side==="left"?0.25:-0.25;
        holdRateRef.current=Math.max(0.25,Math.min(4,holdRateRef.current+delta));
        v.playbackRate=holdRateRef.current;
      },220);
    },350);
  },[speed]);
  const endHold = useCallback(()=>{
    if(longHold.current){clearTimeout(longHold.current);longHold.current=null;}
    if(holdInterval.current){clearInterval(holdInterval.current);holdInterval.current=null;}
    const v=videoRef.current;if(v)v.playbackRate=speed;
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
    const videoUrl = `${window.location.origin}/otube?v=${video.id}`;
    try{if(navigator.share)await navigator.share({title:video.caption||"OTube video",url:videoUrl});
    else await navigator.clipboard.writeText(videoUrl);}catch{}
    setShared(true);setTimeout(()=>setShared(false),2000);
  },[video.caption]);

  const handlePip = useCallback(async()=>{
    const v = videoRef.current;
    if (v && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
      try { await v.requestPictureInPicture(); return; } catch {}
    }
    if (onPip) { onPip(v?.currentTime ?? 0); onClose(); }
  },[onPip, onClose]);

  useEffect(()=>{
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.caption || 'OTube Video',
      artist: video.author.displayName,
      album: 'OTube — NEXUS Platform',
      artwork: video.thumbnailUrl
        ? [{ src: video.thumbnailUrl, sizes:'512x512', type:'image/jpeg' }]
        : [],
    });
    navigator.mediaSession.setActionHandler('play', ()=>{
      videoRef.current?.play(); setPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', ()=>{
      videoRef.current?.pause(); setPlaying(false);
    });
    return ()=>{
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  },[video]);

  useEffect(()=>{
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  },[playing]);

  /* ── Action pill button ── */
  const ABtn = ({ onClick, active=false, col=T.cyan, children, label, flex=1 }:
    { onClick:()=>void; active?:boolean; col?:string; children:React.ReactNode; label:string; flex?:number }) => (
    <motion.button whileTap={{scale:0.82}}
      onClick={e=>{e.stopPropagation();onClick();}}
      style={{flex,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
        padding:"8px 4px",borderRadius:14,
        background:active?`${col}18`:"rgba(255,255,255,0.04)",
        border:`1px solid ${active?`${col}44`:"rgba(255,255,255,0.06)"}`}}>
      {children}
      <span style={{fontSize:9,fontWeight:700,color:active?col:"rgba(255,255,255,0.38)",lineHeight:1}}>
        {label}
      </span>
    </motion.button>
  );

  return (
    <motion.div ref={contRef}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.18}}
      style={{
        position:"fixed",inset:0,zIndex:9999,
        display:"flex",flexDirection:isLandscape?"row":"column",
        background:"#020008",
        fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",
      }}
      onMouseMove={resetCtrl} onTouchMove={resetCtrl}
    >
      {/* ══ TOP BAR — portrait only ══ */}
      {!isLandscape && (
        <div style={{
          flexShrink:0,display:"flex",alignItems:"center",gap:8,
          paddingTop:"calc(env(safe-area-inset-top,0px) + 8px)",
          paddingBottom:8,paddingLeft:12,paddingRight:10,
          background:"rgba(0,0,0,0.18)",backdropFilter:"blur(22px)",
          WebkitBackdropFilter:"blur(22px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
        }}>
          <motion.button whileTap={{scale:0.82}} onClick={onClose}
            style={{width:36,height:36,flexShrink:0,borderRadius:"50%",
              background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.08)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ArrowLeft style={{width:17,height:17,color:"rgba(255,255,255,0.82)"}}/>
          </motion.button>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:"white",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {video.caption||"OTube Video"}
            </p>
            <p style={{margin:0,fontSize:10,color:"rgba(255,255,255,0.35)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {video.author.displayName||video.author.username} · {fmt(video.viewsCount)} ko'rish
            </p>
          </div>
          <motion.button whileTap={{scale:0.9}}
            onClick={(e)=>{e.stopPropagation();if(requireLogin())followMut.mutate({id:video.author.id});}}
            disabled={followMut.isPending}
            style={{padding:"5px 10px",borderRadius:99,flexShrink:0,
              background:"rgba(255,255,255,0.10)",
              backdropFilter:"blur(16px)",
              WebkitBackdropFilter:"blur(16px)",
              border:`1px solid ${subbed?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.22)"}`,
              opacity:followMut.isPending?0.6:1,
              fontSize:10,fontWeight:600,color:subbed?"rgba(255,255,255,0.40)":"rgba(255,255,255,0.9)"}}>
            {subbed?"✓ Obuna":"+ Obuna"}
          </motion.button>
          <motion.button whileTap={{scale:0.85}} onClick={(e)=>{e.stopPropagation();toggleFull();}}
            style={{width:32,height:32,flexShrink:0,borderRadius:"50%",
              background:"rgba(255,255,255,0.07)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isFull
              ?<Minimize2 style={{width:14,height:14,color:"rgba(255,255,255,0.7)"}}/>
              :<Maximize2 style={{width:14,height:14,color:"rgba(255,255,255,0.7)"}}/>}
          </motion.button>
        </div>
      )}

      {/* ══ VIDEO AREA ══ */}
      <div
        style={{flex:1,position:"relative",overflow:"hidden",background:"#000",cursor:"pointer"}}
        onClick={handleTap}
        onTouchStart={(e)=>{
          swipeTY.current=e.touches[0].clientY;
          swipeTX.current=e.touches[0].clientX;
          swipeActive.current=true;
          isDragging.current=false;
          startHold(e);
        }}
        onTouchMove={(e)=>{
          if(!swipeActive.current)return;
          const dy=e.touches[0].clientY-swipeTY.current;
          const dx=e.touches[0].clientX-swipeTX.current;
          if(!isDragging.current){
            if(Math.abs(dy)<Math.abs(dx))return;
            isDragging.current=true;
          }
          e.stopPropagation();
          /* rubber-band: slow down at edges */
          const clamped=dy*(Math.abs(dy)>120?0.25:0.6);
          setDragY(clamped);
        }}
        onTouchEnd={(e)=>{
          endHold();
          if(!swipeActive.current)return;
          swipeActive.current=false;
          const dy=swipeTY.current-e.changedTouches[0].clientY;
          const dx=swipeTX.current-e.changedTouches[0].clientX;
          if(isDragging.current&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>55){
            const vh=window.innerHeight;
            if(dy>0&&hasNext&&onNext){
              /* yuqoriga suring: joriy video tepaga chiqadi, keyingi pastdan kiradi */
              setIsSnapping(true);
              setDragY(-vh*1.05);
              setTimeout(()=>{
                setIsSnapping(false);
                setDragY(vh*0.35);
                onNext();
                requestAnimationFrame(()=>requestAnimationFrame(()=>{
                  setIsSnapping(true);
                  setDragY(0);
                }));
              },230);
            } else if(dy<0&&hasPrev&&onPrev){
              /* pastga suring: joriy video pastga chiqadi, oldingi tepadan kiradi */
              setIsSnapping(true);
              setDragY(vh*1.05);
              setTimeout(()=>{
                setIsSnapping(false);
                setDragY(-vh*0.35);
                onPrev();
                requestAnimationFrame(()=>requestAnimationFrame(()=>{
                  setIsSnapping(true);
                  setDragY(0);
                }));
              },230);
            } else {
              setIsSnapping(true);
              setDragY(0);
            }
          } else {
            setIsSnapping(true);
            setDragY(0);
          }
          isDragging.current=false;
        }}
        onMouseDown={startHold} onMouseUp={endHold}>
        <video
          ref={videoRef}
          poster={video.thumbnailUrl??undefined}
          muted={muted} playsInline loop={settings.loop}
          style={{width:"100%",height:"100%",objectFit:"cover",display:"block",
            transform:`translateY(${dragY}px)`,
            transition:isSnapping?"transform 0.24s cubic-bezier(0.4,0,0.2,1)":"none",
            willChange:"transform",
          }}
          onTimeUpdate={()=>{
            const v=videoRef.current;
            if(v&&isFinite(v.duration)&&v.duration>0){
              setCurTime(v.currentTime);setProgress(v.currentTime/v.duration);
              progressRef.current={time:v.currentTime,dur:v.duration};
              if(v.currentTime-lastReportRef.current>=5){lastReportRef.current=v.currentTime;reportProgress();}
            }
          }}
          onLoadedMetadata={()=>setDuration(videoRef.current?.duration??0)}
          onEnded={()=>{setPlaying(false);reportProgress();}}
        />
        <SeekFlash side="left"  visible={seekLeft}/>
        <SeekFlash side="right" visible={seekRight}/>
        <DanmakuOverlay active={danmaku} reelId={video.id}/>

        {/* ── SWIPE HINT OVERLAY ── */}
        <AnimatePresence>
          {swipeHint && (
            <motion.div
              initial={{opacity:0,y:swipeHint==="up"?20:-20}}
              animate={{opacity:1,y:0}}
              exit={{opacity:0,y:swipeHint==="up"?-20:20}}
              transition={{duration:0.2}}
              style={{
                position:"absolute",inset:0,display:"flex",
                flexDirection:"column",alignItems:"center",justifyContent:"center",
                pointerEvents:"none",zIndex:50,
                background:"rgba(0,0,0,0.38)",backdropFilter:"blur(4px)",
              }}>
              <span style={{fontSize:36,lineHeight:1}}>{swipeHint==="up"?"⬆":"⬇"}</span>
              <span style={{fontSize:14,fontWeight:700,color:"white",marginTop:8,letterSpacing:"0.04em"}}>
                {swipeHint==="up"?"Keyingi video":"Oldingi video"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NEXT VIDEO INDICATOR (bottom edge, hint only) ── */}
        {hasNext && (
          <div style={{
            position:"absolute",bottom:0,left:0,right:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            paddingBottom:10,pointerEvents:"none",zIndex:30,
          }}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:0.4}}>
              <motion.div animate={{y:[0,-5,0]}} transition={{duration:1.2,repeat:Infinity,ease:"easeInOut"}}>
                <ChevronUp style={{width:20,height:20,color:"white"}}/>
              </motion.div>
              <span style={{fontSize:9,fontWeight:600,color:"white",letterSpacing:"0.06em"}}>YUQORIGA SURING</span>
            </div>
          </div>
        )}

        {/* ── RIGHT SIDE ACTION PANEL — auto-hide on idle ── */}
        <div style={{
          position:"absolute", right:0, top:0, bottom:168,
          width:50,
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center",
          gap:0, zIndex:22,
          paddingTop:8, paddingBottom:8,
          overflowY:"auto", scrollbarWidth:"none",
          opacity: showCtrl ? 1 : 0,
          pointerEvents: showCtrl ? "auto" : "none",
          transition:"opacity 0.25s ease",
        }}>
          {([
            {
              icon:<ThumbsUp style={{width:15,height:15,fill:liked?"white":"none",color:"white"}}/>,
              label:fmt(likesCount), col:"rgba(255,255,255,0.9)", active:liked,
              act:()=>{if(requireLogin())likeMut.mutate({id:video.id});},
            },
            {
              icon:<ThumbsDown style={{width:15,height:15,fill:disliked?"white":"none",color:"white"}}/>,
              label:"Ko'rmadim", col:"rgba(255,255,255,0.9)", active:disliked,
              act:()=>{if(!requireLogin())return;setDisliked(d=>!d);if(liked)likeMut.mutate({id:video.id});},
            },
            {
              icon:<Share2 style={{width:15,height:15,color:"white"}}/>,
              label:"Ulashish", col:"rgba(255,255,255,0.9)", active:shared,
              act:()=>void handleShare(),
            },
            {
              icon:<Bookmark style={{width:15,height:15,fill:saved?T.violet:"none",color:saved?T.violet:"white"}}/>,
              label:"Saqlash", col:saved?T.violet:"rgba(255,255,255,0.9)", active:saved,
              bg:saved?"rgba(120,0,255,0.85)":"rgba(30,30,40,0.75)",
              act:()=>toggleSave(),
            },
            {
              icon:<MessageCircle style={{width:15,height:15,color:"white"}}/>,
              label:fmt(video.commentsCount??0), col:"rgba(255,255,255,0.9)", active:showCom,
              act:()=>{if(requireLogin())setShowCom(c=>!c);},
            },
            {
              icon:<Star style={{width:15,height:15,color:"white"}}/>,
              label:"Yordam", col:"rgba(255,255,255,0.9)", active:donating,
              act:()=>{if(!requireLogin())return;setDonating(d=>!d);setShowMore(false);},
            },
            {
              icon:<Sparkles style={{width:15,height:15,color:"white"}}/>,
              label:"Reakciya", col:"rgba(255,255,255,0.9)", active:danmaku,
              act:()=>setDanmaku(d=>!d),
            },
            {
              icon:<Brain style={{width:15,height:15,color:showDub?T.cyan:"rgba(255,255,255,0.9)"}}/>,
              label:"AI Dub", col:T.cyan, active:showDub,
              act:()=>{if(requireLogin()){setShowDub(s=>!s);setShowMore(false);}},
            },
            {
              icon:<Upload style={{width:15,height:15,color:"white",transform:"rotate(180deg)"}}/>,
              label:"Yuklab", col:"rgba(255,255,255,0.9)", active:false,
              act:()=>{
                if(!video.videoUrl)return;
                const a=document.createElement("a");a.href=video.videoUrl;
                a.download=`${video.caption||"video"}.mp4`;
                document.body.appendChild(a);a.click();document.body.removeChild(a);
              },
            },
            {
              icon:<PictureInPicture2 style={{width:15,height:15,color:"white"}}/>,
              label:"Mini", col:"rgba(255,255,255,0.9)", active:false,
              act:()=>void handlePip(),
            },
            ...(isOwner ? [{
              icon:<Trash2 style={{width:15,height:15,color:"#ff4444"}}/>,
              label:"O'chirish", col:"#ff6666", active:false,
              bg:"rgba(255,30,30,0.18)",
              act:()=>setConfirmDelete(true),
            }] : []),
          ] as Array<{icon:React.ReactNode;label:string;col:string;active:boolean;bg?:string;act:()=>void}>)
            .map((b,i)=>(
            <motion.button key={i} whileTap={{scale:0.82}}
              onClick={(e)=>{e.stopPropagation();b.act();}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                padding:"6px 0",width:"100%"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34}}>
                {b.icon}
              </div>
              <span style={{fontSize:8,fontWeight:600,color:b.col,
                textShadow:"0 1px 4px rgba(0,0,0,0.95)",lineHeight:1.2,textAlign:"center",
                maxWidth:44,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {b.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Landscape: back button */}
        {isLandscape && (
          <motion.button whileTap={{scale:0.82}} onClick={onClose}
            style={{position:"absolute",top:12,left:12,width:38,height:38,
              borderRadius:"50%",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(12px)",
              border:"1px solid rgba(255,255,255,0.1)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ArrowLeft style={{width:17,height:17,color:"rgba(255,255,255,0.85)"}}/>
          </motion.button>
        )}

        {/* Center play/pause */}
        <AnimatePresence>
          {!playing && (
            <motion.div key="pause-icon"
              initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:1.4}} transition={{duration:0.14}}
              style={{position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%,-50%)",pointerEvents:"none",
                width:68,height:68,borderRadius:"50%",
                background:"rgba(255,255,255,0.12)",backdropFilter:"blur(20px)",
                WebkitBackdropFilter:"blur(20px)",
                border:"1.5px solid rgba(255,255,255,0.30)",
                boxShadow:"0 4px 24px rgba(0,0,0,0.25)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Play style={{width:26,height:26,fill:"rgba(255,255,255,0.95)",color:"rgba(255,255,255,0.95)",marginLeft:4}}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speed picker */}
        <AnimatePresence>
          {showSpeed && <SpeedPicker speed={speed} onSpeed={applySpeed} onClose={()=>setShowSpeed(false)}/>}
        </AnimatePresence>
        {/* Comments panel */}
        <AnimatePresence>
          {showCom && <CommentsPanel reelId={video.id} onClose={()=>setShowCom(false)}/>}
        </AnimatePresence>

        {/* ══ MORE OPTIONS SHEET ══ */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{opacity:0,y:80}} animate={{opacity:1,y:0}} exit={{opacity:0,y:80}}
              transition={{type:"spring",damping:28,stiffness:320}}
              onClick={e=>e.stopPropagation()}
              style={{position:"absolute",bottom:0,inset:"auto 0 0 0",zIndex:50,
                background:"rgba(5,0,16,0.97)",backdropFilter:"blur(28px)",
                borderTopLeftRadius:22,borderTopRightRadius:22,
                border:"1px solid rgba(255,255,255,0.07)",
                padding:"14px 14px 24px"}}>
              <div style={{width:36,height:3,borderRadius:3,
                background:"rgba(255,255,255,0.15)",margin:"0 auto 14px"}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[
                  {icon:<ThumbsUp style={{width:18,height:18,fill:liked?T.cyan:"none",color:liked?T.cyan:"rgba(255,255,255,0.55)"}}/>,label:liked?"Yoqdim":"Yoqtirish",col:T.cyan,on:liked,act:()=>{if(requireLogin())likeMut.mutate({id:video.id});}},
                  {icon:<ThumbsDown style={{width:18,height:18,fill:disliked?T.orange:"none",color:disliked?T.orange:"rgba(255,255,255,0.5)"}}/>,label:"Yoqmadi",col:T.orange,on:disliked,act:()=>{if(!requireLogin())return;setDisliked(d=>!d);if(liked)likeMut.mutate({id:video.id});}},
                  {icon:<Sparkles style={{width:18,height:18,color:danmaku?"#ffd700":"rgba(255,255,255,0.5)"}}/>,label:"Reaktsiya",col:"#ffd700",on:danmaku,act:()=>{setDanmaku(d=>!d);setShowMore(false);}},
                  {icon:<Gauge style={{width:18,height:18,color:showSpeed?T.orange:"rgba(255,255,255,0.5)"}}/>,label:"Tezlik",col:T.orange,on:showSpeed,act:()=>{setShowSpeed(s=>!s);setShowMore(false);}},
                  {icon:<Brain style={{width:18,height:18,color:showDub?T.cyan:"rgba(255,255,255,0.55)"}}/>,label:"AI Dub",col:T.cyan,on:showDub,act:()=>{if(requireLogin()){setShowDub(s=>!s);setShowMore(false);}}},
                  {icon:<Star style={{width:18,height:18,fill:donating?T.orange:"none",color:donating?T.orange:"rgba(255,255,255,0.5)"}}/>,label:"Sovg'a",col:T.orange,on:donating,act:()=>{if(!requireLogin())return;setDonating(d=>!d);setShowMore(false);}},
                  {icon:<Upload style={{width:18,height:18,color:"rgba(255,255,255,0.5)",transform:"rotate(180deg)"}}/>,label:"Yuklab",col:"rgba(200,200,200,0.7)",on:false,act:()=>{if(!video.videoUrl)return;const a=document.createElement("a");a.href=video.videoUrl;a.download=`${video.caption||"video"}.mp4`;document.body.appendChild(a);a.click();document.body.removeChild(a);setShowMore(false);}},
                  {icon:<PictureInPicture2 style={{width:18,height:18,color:"rgba(255,255,255,0.5)"}}/>,label:"Mini",col:T.cyan,on:false,act:()=>{void handlePip();setShowMore(false);}},
                  ...(isOwner?[{icon:<Trash2 style={{width:18,height:18,color:"#ff3b30"}}/>,label:"O'chirish",col:"#ff3b30",on:false,act:()=>{setConfirmDelete(true);setShowMore(false);}}]:[]),
                ].map((b,i)=>(
                  <motion.button key={i} whileTap={{scale:0.82}} onClick={()=>b.act()}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                      padding:"10px 4px",borderRadius:14,
                      background:b.on?`${b.col}18`:"rgba(255,255,255,0.04)",
                      border:`1px solid ${b.on?`${b.col}44`:"rgba(255,255,255,0.06)"}`}}>
                    {b.icon}
                    <span style={{fontSize:9.5,color:"rgba(255,255,255,0.38)",fontWeight:600,lineHeight:1,textAlign:"center"}}>
                      {b.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ AI DUB PANEL ══ */}
        <AnimatePresence>
          {showDub && (
            <motion.div
              initial={{opacity:0,y:60}} animate={{opacity:1,y:0}} exit={{opacity:0,y:60}}
              style={{position:"absolute",bottom:0,left:0,right:0,zIndex:120,
                background:"linear-gradient(180deg,rgba(0,0,0,0.0),rgba(0,0,0,0.97))",
                borderRadius:"18px 18px 0 0",padding:"16px 16px 32px",maxHeight:"70%",overflowY:"auto"}}>
              <div style={{width:36,height:3,borderRadius:3,background:"rgba(255,255,255,0.15)",margin:"0 auto 14px"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Brain style={{width:16,height:16,color:T.cyan}}/>
                  <span style={{fontSize:13,fontWeight:700,color:"white"}}>AI Dublyaj</span>
                </div>
                <button onClick={()=>setShowDub(false)} style={{color:"rgba(255,255,255,0.4)",fontSize:18,lineHeight:1}}>✕</button>
              </div>
              {/* Language selector */}
              <p style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:8}}>Tilni tanlang:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                {[{code:"uz",name:"O'zbek"},{code:"ru",name:"Русский"},{code:"en",name:"English"},{code:"tr",name:"Türkçe"},{code:"zh",name:"中文"},{code:"es",name:"Español"}].map(({code,name})=>(
                  <button key={code} onClick={()=>{setDubLang(code);setDubResult(null);}}
                    style={{padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:600,
                      background:dubLang===code?T.cyan:"rgba(255,255,255,0.08)",
                      color:dubLang===code?"#000":"rgba(255,255,255,0.7)",
                      border:`1px solid ${dubLang===code?T.cyan:"rgba(255,255,255,0.1)"}`}}>
                    {name}
                  </button>
                ))}
              </div>
              {/* Generate button */}
              <button
                disabled={dubbing}
                onClick={async()=>{
                  if(!video.caption)return;
                  setDubbing(true);setDubResult(null);
                  try{
                    const r=await fetch(`${API_BASE}/api/otube/ai/dub`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({caption:(video.caption||"").slice(0,500),targetLang:dubLang})});
                    if(r.ok){const d=await r.json();setDubResult(d);}
                  }catch{/* ignore */}finally{setDubbing(false);}
                }}
                style={{width:"100%",padding:"12px",borderRadius:12,background:dubbing?"rgba(255,255,255,0.1)":T.cyan,
                  color:dubbing?"rgba(255,255,255,0.4)":"#000",fontWeight:700,fontSize:13,marginBottom:12}}>
                {dubbing?"Yaratilmoqda...":"🎙 Dublyaj qilish"}
              </button>
              {/* Result */}
              {dubResult&&(
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12,border:"1px solid rgba(255,255,255,0.08)"}}>
                  <p style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>Tarjima:</p>
                  <p style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:10,lineHeight:1.5}}>{dubResult.translated}</p>
                  <button onClick={()=>{
                    const audio=new Audio(`data:audio/mp3;base64,${dubResult.audioB64}`);
                    dubAudioRef.current=audio;
                    audio.play().catch(()=>{});
                  }}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,
                      background:"rgba(255,255,255,0.08)",color:"white",fontSize:12,fontWeight:600}}>
                    <span>▶</span> Ovozni ijro etish
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ DONATE SHEET ══ */}
        <AnimatePresence>
          {donating && (
            <motion.div
              initial={{opacity:0,y:80}} animate={{opacity:1,y:0}} exit={{opacity:0,y:80}}
              transition={{type:"spring",damping:28,stiffness:320}}
              onClick={e=>e.stopPropagation()}
              onAnimationStart={()=>{
                fetch(`${API_BASE}/api/wallet`,{credentials:"include"})
                  .then(r=>r.json()).then(d=>setWalletBal(d.wallet?.balance??null)).catch(()=>{});
              }}
              style={{position:"absolute",bottom:0,inset:"auto 0 0 0",zIndex:50,
                background:"rgba(5,0,16,0.97)",backdropFilter:"blur(28px)",
                borderTopLeftRadius:22,borderTopRightRadius:22,
                border:`1px solid rgba(255,107,0,0.2)`,
                padding:"14px 14px 28px"}}>
              <div style={{width:36,height:3,borderRadius:3,
                background:"rgba(255,255,255,0.15)",margin:"0 auto 14px"}}/>
              <p style={{fontSize:13,fontWeight:800,color:"rgba(255,160,50,0.9)",marginBottom:4,textAlign:"center"}}>
                ⭐ {video.author.displayName} ga sovg'a
              </p>
              {walletBal !== null && (
                <p style={{fontSize:10.5,color:"rgba(255,255,255,0.35)",textAlign:"center",marginBottom:10}}>
                  Hamyon: <span style={{color:T.cyan,fontWeight:700}}>{walletBal.toLocaleString()} so'm</span>
                </p>
              )}
              {giftResult==="ok" && (
                <p style={{fontSize:12,color:"#00ff88",textAlign:"center",marginBottom:10,fontWeight:700}}>
                  ✓ Sovg'a yuborildi!
                </p>
              )}
              {giftResult==="low" && (
                <p style={{fontSize:12,color:"#ff6666",textAlign:"center",marginBottom:10,fontWeight:700}}>
                  ✗ Hamyonda mablag' yetarli emas
                </p>
              )}
              {giftResult==="err" && (
                <p style={{fontSize:12,color:"#ff6666",textAlign:"center",marginBottom:10}}>
                  Xato yuz berdi. Qayta urinib ko'ring.
                </p>
              )}
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {["500","2000","10000","50000"].map(a=>(
                  <button key={a} onClick={()=>{setDonateAmt(a);setGiftResult(null);}}
                    style={{flex:1,padding:"10px 0",borderRadius:12,textAlign:"center",
                      background:donateAmt===a?"rgba(255,107,0,0.2)":"rgba(255,255,255,0.05)",
                      border:`1px solid ${donateAmt===a?"rgba(255,107,0,0.5)":"rgba(255,255,255,0.07)"}`}}>
                    <span style={{fontSize:12,fontWeight:700,color:donateAmt===a?T.orange:"rgba(255,255,255,0.4)"}}>
                      {Number(a)>=1000?`${Number(a)/1000}K`:a}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setDonating(false);setGiftResult(null);setWalletBal(null);}}
                  style={{flex:1,padding:"11px 0",borderRadius:12,
                    background:"rgba(255,255,255,0.06)",fontSize:13,fontWeight:700,
                    color:"rgba(255,255,255,0.5)"}}>Bekor</button>
                <button
                  disabled={giftLoading||giftResult==="ok"}
                  onClick={async()=>{
                    setGiftLoading(true);setGiftResult(null);
                    try{
                      const r=await fetch(`${API_BASE}/api/reels/${video.id}/gift`,{
                        method:"POST",credentials:"include",
                        headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({amount:Number(donateAmt)}),
                      });
                      const d=await r.json();
                      if(r.status===400&&d.error?.includes("yetarli")){
                        setGiftResult("low");setWalletBal(d.balance??null);
                      } else if(!r.ok){setGiftResult("err");}
                      else{
                        setGiftResult("ok");
                        if(d.newBalance!==undefined)setWalletBal(d.newBalance);
                      }
                    }catch{setGiftResult("err");}
                    finally{setGiftLoading(false);}
                  }}
                  style={{flex:2,padding:"11px 0",borderRadius:12,
                    background:giftResult==="ok"?"rgba(0,255,136,0.2)":giftLoading?"rgba(255,107,0,0.4)":"linear-gradient(90deg,#ff6b00,#ff3500)",
                    fontSize:13,fontWeight:700,
                    color:giftResult==="ok"?"#00ff88":"white",
                    boxShadow:giftResult==="ok"?"none":"0 4px 14px rgba(255,80,0,0.3)",
                    opacity:giftLoading||giftResult==="ok"?0.8:1}}>
                  {giftLoading?"Yuborilmoqda…":giftResult==="ok"?"✓ Yuborildi":`${Number(donateAmt).toLocaleString()} so'm · Yuborish`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ DELETE CONFIRM ══ */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={e=>e.stopPropagation()}
              style={{position:"absolute",inset:0,zIndex:100,
                background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",
                display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"auto"}}>
              <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.85,opacity:0}}
                style={{background:"rgba(10,3,25,0.98)",borderRadius:22,padding:"28px 22px 20px",
                  maxWidth:300,width:"90%",textAlign:"center",
                  border:"1px solid rgba(255,59,48,0.2)"}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,59,48,0.12)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  margin:"0 auto 14px",border:"1px solid rgba(255,59,48,0.3)"}}>
                  <Trash2 style={{width:22,height:22,color:"#ff3b30"}}/>
                </div>
                <p style={{fontSize:16,fontWeight:800,color:"white",marginBottom:8}}>Videoni o'chirish</p>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:22,lineHeight:1.5}}>
                  Bu amalni qaytarib bo'lmaydi. Video va barcha sharhlari o'chiriladi.
                </p>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setConfirmDelete(false)}
                    style={{flex:1,padding:"11px 0",borderRadius:14,
                      background:"rgba(255,255,255,0.07)",fontSize:13,fontWeight:700,
                      color:"rgba(255,255,255,0.6)"}}>Bekor</button>
                  <button onClick={()=>deleteMut.mutate({id:video.id})} disabled={deleteMut.isPending}
                    style={{flex:1,padding:"11px 0",borderRadius:14,
                      background:deleteMut.isPending?"rgba(255,59,48,0.4)":"#ff3b30",
                      fontSize:13,fontWeight:700,color:"white"}}>
                    {deleteMut.isPending?"O'chirilmoqda…":"O'chirish"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PORTRAIT CONTROLS OVERLAY (absolute bottom) ══ */}
        {!isLandscape && (
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, zIndex:20,
            background:"linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.72) 55%,transparent 100%)",
            opacity:showCtrl?1:0, pointerEvents:showCtrl?"auto":"none",
            transition:"opacity 0.25s ease",
            paddingBottom:"max(env(safe-area-inset-bottom,0px), 12px)",
            display:"flex",flexDirection:"column",gap:0,
          }}>
            {/* ── SCRUBBER ── */}
            <div style={{padding:"10px 14px 6px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:9.5,color:"rgba(255,255,255,0.5)",fontFamily:"monospace",flexShrink:0}}>
                {fmtTime(curTime)}
              </span>
              <div style={{flex:1,position:"relative",height:4,borderRadius:4,
                background:"rgba(255,255,255,0.15)"}}>
                <div style={{height:"100%",borderRadius:4,
                  background:`linear-gradient(90deg,${T.cyan},${T.violet})`,
                  width:`${progress*100}%`,transition:"width 0.1s linear"}}/>
                <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",
                  left:`calc(${progress*100}% - 7px)`,
                  width:14,height:14,borderRadius:"50%",background:"white",
                  boxShadow:"0 0 10px rgba(255,255,255,0.65)",pointerEvents:"none"}}/>
                <input type="range" min={0} max={1} step={0.001} value={progress}
                  onChange={e=>scrub(Number(e.target.value))}
                  onClick={e=>e.stopPropagation()}
                  style={{position:"absolute",inset:"-10px 0",opacity:0,cursor:"pointer",width:"100%"}}/>
              </div>
              <span style={{fontSize:9.5,color:"rgba(255,255,255,0.5)",fontFamily:"monospace",flexShrink:0}}>
                {fmtTime(duration)}
              </span>
            </div>

            {/* ── TAVSIF ── */}
            <div style={{flexShrink:0,padding:"2px 12px 4px"}}>
              <button onClick={(e)=>{e.stopPropagation();setShowDesc(d=>!d);}}
                style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",
                  padding:"3px 0",cursor:"pointer"}}>
                <span style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>Tavsif</span>
                <ChevronDown style={{width:11,height:11,color:"rgba(255,255,255,0.4)",
                  transform:showDesc?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}/>
              </button>
              <p style={{margin:0,fontSize:10,color:"rgba(255,255,255,0.45)",lineHeight:1.4,
                overflow:"hidden",textOverflow:"ellipsis",
                display:"-webkit-box",WebkitLineClamp:showDesc?10:1,WebkitBoxOrient:"vertical" as const}}>
                {video.caption||"Video"} · @{video.author.username} · {fmt(video.viewsCount)} ko'rish · {fmt(likesCount)} like
              </p>
            </div>

            {/* ── CHIPS + CONTROLS ── */}
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"2px 12px 0"}}>
              <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.45)",
                padding:"3px 9px",borderRadius:6,background:"rgba(255,255,255,0.1)",
                border:"1px solid rgba(255,255,255,0.15)"}}>Auto</span>
              <button onClick={(e)=>{e.stopPropagation();setShowSpeed(s=>!s);}}
                style={{fontSize:10,fontWeight:600,color:speed!==1?T.orange:"rgba(255,255,255,0.45)",
                  padding:"3px 9px",borderRadius:6,background:"rgba(255,255,255,0.1)",
                  border:`1px solid ${speed!==1?"rgba(255,107,0,0.4)":"rgba(255,255,255,0.15)"}`,
                  display:"flex",alignItems:"center",gap:3}}>
                {speed}× TEZLIK
                <ChevronRight style={{width:10,height:10}}/>
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"6px 14px 8px"}}>
              <motion.button whileTap={{scale:0.82}} onClick={(e)=>{e.stopPropagation();togglePlay();}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {playing
                  ?<Pause style={{width:18,height:18,fill:"white",color:"white"}}/>
                  :<Play  style={{width:18,height:18,fill:"white",color:"white",marginLeft:2}}/>}
              </motion.button>
              <motion.button whileTap={{scale:0.85}}
                onClick={(e)=>{e.stopPropagation();const v=videoRef.current;if(v){v.currentTime=0;setProgress(0);setCurTime(0);}}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <RotateCcw style={{width:15,height:15,color:"rgba(255,255,255,0.6)"}}/>
              </motion.button>
              <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.5)",
                fontFamily:"monospace",flex:1}}>
                {fmtTime(curTime)}/{fmtTime(duration)}
              </span>
              <motion.button whileTap={{scale:0.85}} onClick={(e)=>{e.stopPropagation();setMuted(m=>!m);}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {muted
                  ?<VolumeX style={{width:15,height:15,color:"rgba(255,255,255,0.5)"}}/>
                  :<Volume2 style={{width:15,height:15,color:"#00e5ff"}}/>}
              </motion.button>
              <motion.button whileTap={{scale:0.85}} onClick={(e)=>{e.stopPropagation();toggleFull();}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {isFull
                  ?<Minimize2 style={{width:15,height:15,color:"rgba(255,255,255,0.6)"}}/>
                  :<Maximize2 style={{width:15,height:15,color:"rgba(255,255,255,0.6)"}}/>}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* ══ LANDSCAPE SIDEBAR ══ */}
      {isLandscape && (
        <div style={{
          flexShrink:0,width:230,
          background:"rgba(4,0,14,0.98)",backdropFilter:"blur(28px)",
          borderLeft:"1px solid rgba(255,255,255,0.05)",
          display:"flex",flexDirection:"column",gap:0,
          paddingBottom:"calc(env(safe-area-inset-bottom,0px)+8px)",
        }}>
          <div style={{padding:"12px 14px 8px",
            borderBottom:"1px solid rgba(255,255,255,0.05)",
            display:"flex",alignItems:"center",gap:8}}>
            <motion.button whileTap={{scale:0.85}} onClick={onClose}
              style={{width:34,height:34,borderRadius:"50%",flexShrink:0,
                background:"rgba(255,255,255,0.07)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              <ArrowLeft style={{width:16,height:16,color:"rgba(255,255,255,0.75)"}}/>
            </motion.button>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:12,fontWeight:700,color:"white",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {video.caption||"OTube Video"}
              </p>
              <p style={{margin:0,fontSize:9.5,color:"rgba(255,255,255,0.35)"}}>
                {fmt(video.viewsCount)} ko'rish
              </p>
            </div>
          </div>
          <div style={{padding:"10px 14px 6px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:9.5,color:"rgba(255,255,255,0.3)",fontFamily:"monospace",flexShrink:0}}>
              {fmtTime(curTime)}
            </span>
            <div style={{flex:1,position:"relative",height:4,borderRadius:4,background:"rgba(255,255,255,0.1)"}}>
              <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.cyan},${T.violet})`,
                width:`${progress*100}%`,transition:"width 0.1s linear"}}/>
              <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",
                left:`calc(${progress*100}% - 7px)`,
                width:14,height:14,borderRadius:"50%",background:"white",
                boxShadow:"0 0 10px rgba(255,255,255,0.65)",pointerEvents:"none"}}/>
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={e=>scrub(Number(e.target.value))}
                onClick={e=>e.stopPropagation()}
                style={{position:"absolute",inset:"-10px 0",opacity:0,cursor:"pointer",width:"100%"}}/>
            </div>
            <span style={{fontSize:9.5,color:"rgba(255,255,255,0.3)",fontFamily:"monospace",flexShrink:0}}>
              {fmtTime(duration)}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px 8px"}}>
            <motion.button whileTap={{scale:0.82}} onClick={(e)=>{e.stopPropagation();togglePlay();}}
              style={{width:42,height:42,flexShrink:0,borderRadius:"50%",
                background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.14)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {playing?<Pause style={{width:16,height:16,fill:"white",color:"white"}}/>
                :<Play style={{width:16,height:16,fill:"white",color:"white",marginLeft:2}}/>}
            </motion.button>
            <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.35)",fontFamily:"monospace",flex:1}}>
              {fmtTime(curTime)}/{fmtTime(duration)}
            </span>
            <motion.button whileTap={{scale:0.85}} onClick={(e)=>{e.stopPropagation();setMuted(m=>!m);}}
              style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                background:muted?"rgba(255,255,255,0.05)":"rgba(0,229,255,0.1)",
                border:`1px solid ${muted?"rgba(255,255,255,0.07)":"rgba(0,229,255,0.28)"}`,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {muted?<VolumeX style={{width:13,height:13,color:"rgba(255,255,255,0.35)"}}/>
                :<Volume2 style={{width:13,height:13,color:"#00e5ff"}}/>}
            </motion.button>
            <motion.button whileTap={{scale:0.85}} onClick={(e)=>{e.stopPropagation();toggleFull();}}
              style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                background:"rgba(255,255,255,0.05)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              {isFull?<Minimize2 style={{width:13,height:13,color:"rgba(255,255,255,0.4)"}}/>
                :<Maximize2 style={{width:13,height:13,color:"rgba(255,255,255,0.4)"}}/>}
            </motion.button>
          </div>
        </div>
      )}
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
  const { user } = useAuth();
  const [tab, setTab] = useState<"player"|"monetize">("player");
  const sP = <K extends keyof PlayerSettings>(k:K,v:PlayerSettings[K])=>onSettings({...settings,[k]:v});
  const sM = <K extends keyof MonetizationSettings>(k:K,v:MonetizationSettings[K])=>onMonetize({...monetize,[k]:v});
  const [walletEarnings, setWalletEarnings] = useState<number|null>(null);
  useEffect(()=>{
    if(!open||tab!=="monetize")return;
    fetch(`${API_BASE}/api/wallet`,{credentials:"include"})
      .then(r=>r.json())
      .then(d=>setWalletEarnings((d.wallet?.earningsBalance??0)+(d.wallet?.adRevenueBalance??0)))
      .catch(()=>setWalletEarnings(null));
  },[open,tab]);
  const rev = monetize.creatorMode ? String(walletEarnings ?? 0) : "0";
  const { data: myReelsForRevenue=[] } = useListReels(
    { userId: user?.id, limit: 100 },
    { query: { enabled: open && tab==="monetize" && !!user?.id, queryKey: getListReelsQueryKey({ userId: user?.id, limit: 100 }) } },
  );
  const views = myReelsForRevenue.reduce((sum,r)=>sum+(r.viewsCount??0),0);

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
                      Min: 100 000 so'm. OlchaAI Pay orqali har oyning 15-sanasida chiqariladi.
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
  const { user } = useAuth();
  const requireLogin = useCallback(() => {
    if (user) return true;
    toast({
      title: "Tizimga kiring",
      description: "Bu amalni bajarish uchun avval tizimga kiring.",
      variant: "destructive",
    });
    navigate("/login");
    return false;
  }, [user, navigate]);
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
          ? <img loading="lazy" decoding="async" src={author.avatarUrl} alt="" className="w-full h-full object-cover"/>
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
        onClick={()=>{if(requireLogin())followMut.mutate({ id: author.id });}}
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
      const r = await fetch(`${API_BASE}/api/reels/${video.id}/comments`, {
        method:"POST", credentials:"include", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ content }),
      });
      if (r.status === 401) throw new Error("Izoh yozish uchun tizimga kiring");
      if (!r.ok) throw new Error("Izoh qo'shishda xatolik");
      return r.json() as Promise<ApiComment>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reel-comments", video.id] });
      setQuickTxt("");
    },
    onError: (err: Error) => {
      toast({ title: "Xato", description: err.message, variant: "destructive" });
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
          ? <img loading="lazy" decoding="async" src={video.thumbnailUrl} alt={video.caption} className="w-full h-full object-cover"/>
          : video.videoUrl
          ? <video src={video.videoUrl} autoPlay muted playsInline loop
              className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
          : (video as any).audioTrack
          ? <div className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{background:"linear-gradient(135deg,#1a0040,#000510)"}}>
              <Music2 className="w-14 h-14" style={{color:"rgba(168,85,247,0.5)"}}/>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",maxWidth:120,textAlign:"center",lineHeight:1.4}} className="line-clamp-2">{(video as any).audioTrack}</span>
            </div>
          : <div className="w-full h-full flex items-center justify-center"
              style={{background:"linear-gradient(135deg,#0d0028,#000510)"}}>
              <Film className="w-14 h-14 text-white/8"/>
            </div>}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)"}}/>
        {/* Play button — glass iOS style */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileTap={{scale:0.88}}
            style={{width:64,height:64,borderRadius:"50%",
              background:"rgba(255,255,255,0.12)",backdropFilter:"blur(20px)",
              WebkitBackdropFilter:"blur(20px)",
              border:"1.5px solid rgba(255,255,255,0.30)",
              boxShadow:"0 4px 24px rgba(0,0,0,0.25)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Play style={{width:22,height:22,fill:"rgba(255,255,255,0.95)",color:"rgba(255,255,255,0.95)",marginLeft:3}}/>
          </motion.div>
        </div>
        {/* View count top-left chip — real data only */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1"
          style={{borderRadius:99,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(12px)"}}>
          <Eye style={{width:9,height:9,color:"rgba(255,255,255,0.7)"}}/>
          <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.8)",fontFamily:"monospace"}}>{fmt(video.viewsCount)}</span>
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
                <img loading="lazy" decoding="async" src={video.author.avatarUrl} alt=""
                  style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",
                    position:"absolute",top:4,left:4,zIndex:2}}/>
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
              ? <img loading="lazy" decoding="async" src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>
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

/* Watch Party quick-join button — creates a real co-view room */
function WatchPartyBtn({ videoId }: { videoId: number }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleJoin = async () => {
    if (creating) return;
    setCreating(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/coview/rooms`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "reel", contentId: videoId }),
      });
      if (r.ok) {
        const room = await r.json();
        navigate(`/coview/${room.inviteCode}`);
      } else if (r.status === 401) {
        setErr("Kirish talab qilinadi");
        setTimeout(() => setErr(null), 3000);
      } else {
        setErr("Xatolik yuz berdi");
        setTimeout(() => setErr(null), 3000);
      }
    } catch {
      setErr("Tarmoq xatosi");
      setTimeout(() => setErr(null), 3000);
    }
    finally { setCreating(false); }
  };

  return (
    <div className="flex flex-col flex-1 gap-1">
      {err && (
        <div style={{fontSize:9,color:"#f87171",textAlign:"center",padding:"2px 6px",
          background:"rgba(239,68,68,0.12)",borderRadius:6}}>
          {err}
        </div>
      )}
      <motion.button whileTap={{scale:0.88}}
        onClick={handleJoin} disabled={creating}
        className="flex items-center gap-1.5 px-3 py-1.5 w-full"
        style={{borderRadius:99,
          background: err ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
          boxShadow:`0 0 0 1px ${err ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`}}>
        <Users style={{width:11,height:11,color:"rgba(255,255,255,0.45)"}}/>
        <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.5)"}}>
          {creating?"…":t("otube.watch_join")}
        </span>
      </motion.button>
    </div>
  );
}

/* View count chip — real data */
function LivePulse({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 flex-1 justify-end"
      style={{borderRadius:99,background:"rgba(255,255,255,0.05)",
        boxShadow:"0 0 0 1px rgba(255,255,255,0.08)"}}>
      <Eye style={{width:10,height:10,color:"rgba(255,255,255,0.4)"}}/>
      <span style={{fontSize:9.5,fontWeight:600,color:"rgba(255,255,255,0.55)",fontFamily:"monospace"}}>
        {Math.max(0, count).toLocaleString()} {t("otube.views")}
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
  const views24h = video.views24h ?? 0;
  const vel = video.viewsCount > 0 ? Math.round((views24h / video.viewsCount) * 1000) / 10 : 0;
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
          ? <img loading="lazy" decoding="async" src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"
              style={{transform:"scale(1.04)"}}/>
          : video.videoUrl
          ? <video src={video.videoUrl} autoPlay muted playsInline loop
              className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
          : (video as any).audioTrack
          ? <div className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{background:`linear-gradient(175deg,#1a004028,#000010)`}}>
              <Music2 style={{width:28,height:28,color:"rgba(168,85,247,0.5)"}}/>
            </div>
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
              <span style={{fontSize:7.5,fontWeight:800,color:col,fontFamily:"monospace"}}>{Math.round(vel)}%</span>
            </div>
          </div>
        </div>

        {/* Color accent bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-[1px]"
          style={{background:`linear-gradient(90deg,transparent,${col}88,transparent)`}}/>
        {/* Duration — bare text, no badge */}
        {video.duration && video.duration > 0 && (
          <span className="absolute bottom-[44px] right-3"
            style={{fontSize:7.5,fontWeight:700,color:"rgba(255,255,255,0.55)",fontFamily:"monospace",
              textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>
            {Math.floor(video.duration/60)}:{String(video.duration%60).padStart(2,"0")}
          </span>
        )}
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
          ? <img loading="lazy" decoding="async" src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"
              style={{transition:"transform 0.4s"}}/>
          : video.videoUrl
          ? <video src={video.videoUrl} autoPlay muted playsInline loop
              className="w-full h-full object-cover"
              style={{pointerEvents:"none"}}/>
          : (video as any).audioTrack
          ? <div className="w-full h-full flex items-center justify-center"
              style={{background:`linear-gradient(135deg,#1a004028,#000)`}}>
              <Music2 style={{width:wide?32:20,height:wide?32:20,color:"rgba(168,85,247,0.45)"}}/>
            </div>
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

        {/* Duration — real data only */}
        {video.duration && video.duration > 0 && (
          <span className="absolute bottom-9 right-2"
            style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.7)",fontFamily:"monospace",
              textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>
            {Math.floor(video.duration/60)}:{String(video.duration%60).padStart(2,"0")}
          </span>
        )}

        {/* Signal Score — single chip only */}
        <div className="absolute top-2.5 right-2.5">
          {(()=>{
            const views24h = video.views24h ?? 0;
            const score = Math.min(99, Math.round(
              Math.log10(Math.max(2, video.viewsCount)) * 14 +
              (video.likesCount / Math.max(1, video.viewsCount)) * 120 +
              Math.min(30, (views24h / Math.max(1, video.viewsCount)) * 60)
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
  const [count, setCount] = useState<number|null>(null);
  useEffect(()=>{
    let cancelled = false;
    const poll = () => {
      fetch(`${API_BASE}/go/stats`).then(r=>r.json()).then(d=>{
        if(!cancelled) setCount(d.uniqueUsers ?? d.connections ?? 0);
      }).catch(()=>{});
    };
    poll();
    const t = setInterval(poll, 5000);
    return ()=>{ cancelled = true; clearInterval(t); };
  },[]);
  if (count === null) return null;
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
  const qc = useQueryClient();
  const { data: streak } = useGetStreak();
  const touchMut = useTouchStreak();
  const touchedRef = useRef(false);
  useEffect(()=>{
    if(touchedRef.current)return;
    touchedRef.current = true;
    touchMut.mutate(undefined, { onSuccess: ()=>qc.invalidateQueries({ queryKey: ["/api/gamification/streak"] }) });
  },[]);
  const [visible, setVisible] = useState(true);
  useEffect(()=>{
    const hideT = setTimeout(()=>setVisible(false), 3500);
    return ()=>clearTimeout(hideT);
  },[]);
  const xp = streak?.xp ?? 0;
  const currentStreak = streak?.currentStreak ?? 0;
  const dots = Array.from({length:7},(_,i)=>i<Math.min(currentStreak,7));
  if (!visible || !streak || currentStreak===0) return null;
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
          {currentStreak} kunlik streak
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
function ContinueRow({ items, onPlay }: { items:ContinueWatchingItem[]; onPlay:(v:Reel)=>void }) {
  const { t } = useTranslation();
  if (!items.length) return null;
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
        {items.map(({reel:v,positionSec,durationSec,pct},i)=>{
          const durStr = fmtTime(durationSec);
          const watchedStr = fmtTime(positionSec);
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
                  ? <img loading="lazy" decoding="async" src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                  : v.videoUrl
                  ? <video src={v.videoUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
                  : (v as any).audioTrack
                  ? <div className="w-full h-full flex items-center justify-center"
                      style={{background:`linear-gradient(135deg,#1a004028,#000)`}}>
                      <Music2 style={{width:16,height:16,color:"rgba(168,85,247,0.5)"}}/>
                    </div>
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
const COMMON_TAGS = ["olcha","viral","nexus","trending","signal","broadcast","exclusive","top"];

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
  const aiSuggest = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/ai/video-suggest`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file?.name || title }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.title) setTitle(data.title);
        if (Array.isArray(data.tags) && data.tags.length) setTagList(data.tags);
        if (data.caption) setCaption(data.caption);
      }
    } catch { /* AI suggestion failed, leave fields as-is */ }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async () => {
    if (!file||!title.trim()||!user) return;
    setPhase("uploading"); setProgress(0); setErrMsg("");
    try {
      const req: UploadUrlRequest = {name:file.name,size:file.size,contentType:file.type};
      const {uploadURL,objectPath} = await uploadUrlMut.mutateAsync({data:req});
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => { if(e.lengthComputable) setProgress(Math.round(e.loaded/e.total*88)); };
      let xhrObjectPath = objectPath;
      await new Promise<void>((res,rej)=>{
        xhr.open("PUT",uploadURL); xhr.withCredentials=true; xhr.setRequestHeader("Content-Type",file.type);
        xhr.onload=()=>{ if(xhr.status<300){ try{ const b=JSON.parse(xhr.responseText); if(b?.objectPath) xhrObjectPath=b.objectPath; }catch{} res(); } else rej(new Error("Upload failed")); };
        xhr.onerror=()=>rej(new Error("Network error")); xhr.send(file);
      });
      const videoUrl = xhrObjectPath.startsWith("http") ? xhrObjectPath : `${API_BASE}/api/storage${xhrObjectPath}`;
      setProgress(95); setPhase("creating");
      createMut.mutate({data:{
        authorId:user.id, videoUrl,
        caption:caption||title, tags:tagList, duration:0,
        // thumbSrc is a local blob URL — only pass thumbnailUrl if it's a real remote URL
        thumbnailUrl: (thumbSrc && !thumbSrc.startsWith("blob:")) ? thumbSrc : undefined,
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
                    ? <img loading="lazy" decoding="async" src={thumbSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
                {COMMON_TAGS.filter(t=>!tagList.includes(t)).slice(0,5).map(t=>(
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
  const G = "#00ff88";
  /* ── 50+ state vars ── */
  const [section,      setSection]      = useState<"setup"|"rules"|"prizes"|"media"|"community"|"advanced">("setup");
  const [name,         setName]         = useState("");
  const [desc,         setDesc]         = useState("");
  const [category,     setCategory]     = useState("dance");
  const [tags,         setTags]         = useState<string[]>([]);
  const [tagInput,     setTagInput]      = useState("");
  const [coverEmoji,   setCoverEmoji]    = useState("🏆");
  const [coverBg,      setCoverBg]       = useState("#001a0a");
  const [days,         setDays]         = useState(7);
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [rules,        setRules]        = useState(["","",""]);
  const [minLen,       setMinLen]       = useState(15);
  const [maxLen,       setMaxLen]       = useState(60);
  const [maxEntries,   setMaxEntries]   = useState(3);
  const [ageMin,       setAgeMin]       = useState(13);
  const [followersMin, setFollowersMin] = useState(0);
  const [teamAllowed,  setTeamAllowed]  = useState(false);
  const [reactionReq,  setReactionReq]  = useState(false);
  const [commentReq,   setCommentReq]   = useState(false);
  const [duetAllowed,  setDuetAllowed]  = useState(true);
  const [hashtagReq,   setHashtagReq]   = useState(true);
  const [judgeType,    setJudgeType]    = useState<"vote"|"ai"|"views">("vote");
  const [prize1,       setPrize1]       = useState("");
  const [prize2,       setPrize2]       = useState("");
  const [prize3,       setPrize3]       = useState("");
  const [prizePool,    setPrizePool]    = useState("0");
  const [badge1,       setBadge1]       = useState("🥇");
  const [badge2,       setBadge2]       = useState("🥈");
  const [badge3,       setBadge3]       = useState("🥉");
  const [certEnabled,  setCertEnabled]  = useState(true);
  const [leaderboard,  setLeaderboard]  = useState(true);
  const [themeMusic,   setThemeMusic]   = useState("");
  const [demoUrl,      setDemoUrl]      = useState("");
  const [shareTemplate,setShareTemplate]= useState("");
  const [discordLink,  setDiscordLink]  = useState("");
  const [votingOpen,   setVotingOpen]   = useState(true);
  const [publicResult, setPublicResult] = useState(true);
  const [geoRestrict,  setGeoRestrict]  = useState(false);
  const [geoCountry,   setGeoCountry]   = useState("uz");
  const [sponsorName,  setSponsorName]  = useState("");
  const [winnerDelay,  setWinnerDelay]  = useState(3);
  const [autoExtend,   setAutoExtend]   = useState(false);
  const [notifyAll,    setNotifyAll]    = useState(true);
  const [notifyWinner, setNotifyWinner] = useState(true);
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [accessCode,   setAccessCode]   = useState("");
  const [privateChallenge, setPrivateChallenge] = useState(false);
  const qc = useQueryClient();
  const createChallengeMut = useCreateChallenge({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/challenges"] }); },
    },
  });
  const createdChallenge = createChallengeMut.data ?? null;
  const done = !!createdChallenge;

  const DAYS_OPT = [3,7,14,30,60,90];
  const CATS = [{v:"dance",e:"💃",l:"Raqs"},{v:"music",e:"🎵",l:"Musiqa"},{v:"comedy",e:"😂",l:"Kulgili"},{v:"sport",e:"⚽",l:"Sport"},{v:"food",e:"🍜",l:"Taom"},{v:"art",e:"🎨",l:"San'at"},{v:"gaming",e:"🎮",l:"Gaming"},{v:"beauty",e:"💄",l:"Go'zallik"},{v:"education",e:"📚",l:"Ta'lim"},{v:"travel",e:"✈️",l:"Sayohat"},{v:"fitness",e:"💪",l:"Fitnes"},{v:"diy",e:"🛠",l:"DIY"}];
  const updateRule = (i:number, v:string) => setRules(r=>{const n=[...r];n[i]=v;return n;});
  const addTag = () => { if(tagInput.trim()){setTags(p=>[...p,tagInput.trim()]);setTagInput(""); } };

  const SECTIONS = [
    {v:"setup",     e:"⚙️", l:"Sozlama"},
    {v:"rules",     e:"📋", l:"Qoidalar"},
    {v:"prizes",    e:"🏆", l:"Mukofot"},
    {v:"media",     e:"🎬", l:"Media"},
    {v:"community", e:"👥", l:"Jamiyat"},
    {v:"advanced",  e:"🔧", l:"Ilg'or"},
  ] as const;

  return (
    <ModalSheet onClose={onClose} title={t("otube.ch_modal_title")} accent={G}>
      {/* Section nav */}
      <div style={{overflowX:"auto",borderBottom:`1px solid rgba(0,255,136,0.12)`,scrollbarWidth:"none"}}>
        <div className="flex px-2" style={{gap:2}}>
          {SECTIONS.map(({v,e,l})=>(
            <button key={v} onClick={()=>setSection(v)}
              style={{flexShrink:0,padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:1.5,
                borderBottom:`2px solid ${section===v?G:"transparent"}`,
                background:section===v?"rgba(0,255,136,0.05)":"transparent",transition:"all 0.15s"}}>
              <span style={{fontSize:13}}>{e}</span>
              <span style={{fontSize:7.5,fontWeight:700,letterSpacing:"0.04em",color:section===v?G:"rgba(255,255,255,0.28)"}}>{l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-4" style={{overflowY:"auto",scrollbarWidth:"none"}}>

        {/* ── SETUP ── */}
        {section==="setup" && <>
          {/* Name */}
          <div style={{marginTop:16}}>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_name_label")}</span>
            <div style={{marginTop:4,display:"flex",alignItems:"center",
              background:"rgba(255,255,255,0.05)",border:"1px solid rgba(0,255,136,0.2)",borderRadius:10}}>
              <span style={{padding:"10px 10px",color:G,fontSize:16,fontWeight:900}}>#</span>
              <input value={name} onChange={e=>setName(e.target.value.replace(/\s+/g,""))}
                placeholder="MyChallengeGilos" maxLength={40}
                style={{flex:1,padding:"10px 8px 10px 0",background:"transparent",color:"white",fontSize:13,outline:"none",border:"none"}}/>
              <span style={{padding:"10px 10px",fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700}}>{name.length}/40</span>
            </div>
          </div>
          {/* Description */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_desc_label")}</span>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={300}
              placeholder={t("otube.ch_desc_ph")}
              style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,
                background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                color:"white",fontSize:12,outline:"none",resize:"none"}}/>
          </div>
          {/* Category */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>📂 KATEGORIYA</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATS.map(({v,e,l})=>(
                <button key={v} onClick={()=>setCategory(v)}
                  style={{padding:"7px 10px",borderRadius:10,fontSize:10,fontWeight:700,
                    background:category===v?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                    color:category===v?G:"rgba(255,255,255,0.4)",
                    border:`1px solid ${category===v?"rgba(0,255,136,0.4)":"rgba(255,255,255,0.07)"}`,
                    display:"flex",alignItems:"center",gap:4}}>
                  <span>{e}</span>{l}
                </button>
              ))}
            </div>
          </div>
          {/* Tags */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🏷 TEGLAR</span>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="teg qo'shing…"
                style={{flex:1,padding:"8px 10px",borderRadius:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:11,outline:"none"}}/>
              <button onClick={addTag} style={{padding:"8px 12px",borderRadius:9,background:"rgba(0,255,136,0.12)",color:G,fontSize:18,fontWeight:900}}>+</button>
            </div>
            {tags.length>0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag,i)=>(
                  <span key={i} style={{padding:"3px 10px",borderRadius:99,fontSize:10,fontWeight:700,
                    background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.25)",color:G,
                    display:"flex",alignItems:"center",gap:4}}>
                    #{tag}
                    <button onClick={()=>setTags(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,color:"rgba(0,255,136,0.5)"}}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Duration */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_dur_label")}</span>
            <div className="flex gap-2 mt-2 flex-wrap">
              {DAYS_OPT.map(d=>(
                <button key={d} onClick={()=>setDays(d)}
                  style={{flex:"1 1 50px",padding:"9px 4px",borderRadius:10,fontSize:11,fontWeight:700,
                    background:days===d?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${days===d?"rgba(0,255,136,0.5)":"rgba(255,255,255,0.08)"}`,
                    color:days===d?G:"rgba(255,255,255,0.4)"}}>
                  {d}k
                </button>
              ))}
            </div>
          </div>
          {/* Custom dates */}
          <div className="flex gap-3">
            <div style={{flex:1}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:700,letterSpacing:"0.08em"}}>📅 BOSHLANISH</span>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{width:"100%",marginTop:4,padding:"9px 10px",borderRadius:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:11,outline:"none"}}/>
            </div>
            <div style={{flex:1}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:700,letterSpacing:"0.08em"}}>📅 TUGASH</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{width:"100%",marginTop:4,padding:"9px 10px",borderRadius:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:11,outline:"none"}}/>
            </div>
          </div>
          {/* Cover */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🖼 MUQOVA</span>
            <div style={{marginTop:6,aspectRatio:"16/6",borderRadius:12,position:"relative",overflow:"hidden",
              background:`linear-gradient(135deg,${coverBg},rgba(0,255,136,0.15))`,border:"1px solid rgba(0,255,136,0.15)"}}>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                <span style={{fontSize:36}}>{coverEmoji}</span>
                <span style={{fontSize:14,fontWeight:900,color:G,textShadow:`0 0 20px ${G}66`}}>#{name||"Challenge"}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {["🏆","🔥","⚡","💪","🎵","💃","🎯","🌊","🚀","✨","🤩","👑"].map(e=>(
                <button key={e} onClick={()=>setCoverEmoji(e)} style={{fontSize:20,borderRadius:8,padding:"4px",background:coverEmoji===e?"rgba(0,255,136,0.15)":"transparent",border:`1px solid ${coverEmoji===e?"rgba(0,255,136,0.3)":"transparent"}`}}>{e}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              {["#001a0a","#0a0022","#1a0800","#001a22","#1a001a","#0a1a00"].map(c=>(
                <button key={c} onClick={()=>setCoverBg(c)} style={{width:28,height:28,borderRadius:7,background:c,border:`2px solid ${coverBg===c?G:"rgba(255,255,255,0.1)"}`,cursor:"pointer"}}/>
              ))}
            </div>
          </div>
        </>}

        {/* ── RULES ── */}
        {section==="rules" && <>
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.ch_rules_label")}</span>
              <button onClick={()=>setRules(p=>[...p,""])} style={{fontSize:10,color:G,fontWeight:700}}>+ Qo'shish</button>
            </div>
            <div className="flex flex-col gap-2">
              {rules.map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,fontWeight:900,color:G,width:18,textAlign:"center"}}>{i+1}.</span>
                  <input value={r} onChange={e=>updateRule(i,e.target.value)} placeholder={`${t("otube.ch_rule_ph")} ${i+1}…`}
                    style={{flex:1,padding:"9px 10px",borderRadius:9,
                      background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none"}}/>
                  {rules.length>1 && <button onClick={()=>setRules(p=>p.filter((_,j)=>j!==i))} style={{color:"#ff2d55",fontSize:18}}>×</button>}
                </div>
              ))}
            </div>
          </div>
          {/* Video length */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>⏱ VIDEO DAVOMIYLIGI (soniya)</span>
            <div className="flex gap-3 mt-2">
              <div style={{flex:1}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",marginBottom:4}}>MINIMAL</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{minLen}s</span>
                </div>
                <input type="range" min={5} max={maxLen-5} value={minLen} onChange={e=>setMinLen(+e.target.value)} style={{width:"100%",accentColor:G}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",marginBottom:4}}>MAKSIMAL</div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{maxLen}s</span>
                </div>
                <input type="range" min={minLen+5} max={600} value={maxLen} onChange={e=>setMaxLen(+e.target.value)} style={{width:"100%",accentColor:G}}/>
              </div>
            </div>
          </div>
          {/* Entry limit */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>📹 MAX ISHTIROKCHI VIDEOLARI</span>
              <span style={{fontSize:12,color:G,fontWeight:800}}>{maxEntries} ta</span>
            </div>
            <input type="range" min={1} max={20} value={maxEntries} onChange={e=>setMaxEntries(+e.target.value)} style={{width:"100%",accentColor:G}}/>
          </div>
          {/* Age restriction */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🔞 YOSH CHEGARASI</span>
              <span style={{fontSize:12,color:G,fontWeight:800}}>{ageMin}+</span>
            </div>
            <div className="flex gap-2">
              {[13,16,18,21].map(a=>(
                <button key={a} onClick={()=>setAgeMin(a)}
                  style={{flex:1,padding:"9px",borderRadius:9,fontSize:11,fontWeight:700,
                    background:ageMin===a?"rgba(0,255,136,0.12)":"rgba(255,255,255,0.04)",
                    color:ageMin===a?G:"rgba(255,255,255,0.4)",
                    border:`1px solid ${ageMin===a?"rgba(0,255,136,0.35)":"rgba(255,255,255,0.07)"}`}}>
                  {a}+
                </button>
              ))}
            </div>
          </div>
          {/* Min followers */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>👥 MIN OBUNACHILAR</span>
              <span style={{fontSize:12,color:G,fontWeight:800}}>{followersMin===0?"Cheksiz":followersMin>=1000?`${followersMin/1000}K+`:followersMin+"+"}
              </span>
            </div>
            <input type="range" min={0} max={10000} step={100} value={followersMin} onChange={e=>setFollowersMin(+e.target.value)} style={{width:"100%",accentColor:G}}/>
          </div>
          {/* Toggles */}
          <div className="flex flex-col gap-2">
            {[
              {v:teamAllowed,s:setTeamAllowed,l:"👥 Jamoaviy ishtirok ruxsat etiladi"},
              {v:reactionReq,s:setReactionReq,l:"❤️ Reaktsiya talab qilinadi"},
              {v:commentReq,s:setCommentReq,l:"💬 Izoh talab qilinadi"},
              {v:duetAllowed,s:setDuetAllowed,l:"🎤 Duet qilishga ruxsat"},
              {v:hashtagReq,s:setHashtagReq,l:"# Hashtag qo'yish majburiy"},
            ].map(({v,s,l})=>(
              <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{l}</span>
                <button onClick={()=>s((p:boolean)=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:v?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start"}}>
                  <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                </button>
              </div>
            ))}
          </div>
          {/* Judge type */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>⚖️ HUKAMLAR TIZIMI</span>
            <div className="flex gap-2 mt-2">
              {([["vote","🗳 Ovoz","Ommaviy ovoz"],["ai","🤖 AI","AI baholaydi"],["views","👁 Ko'rish","Ko'p ko'rilgan g'olib"]] as const).map(([v,e,l])=>(
                <button key={v} onClick={()=>setJudgeType(v)}
                  style={{flex:1,padding:"10px 4px",borderRadius:10,fontSize:9,fontWeight:700,
                    background:judgeType===v?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                    color:judgeType===v?G:"rgba(255,255,255,0.4)",
                    border:`1px solid ${judgeType===v?"rgba(0,255,136,0.4)":"rgba(255,255,255,0.07)"}`,
                    display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:14}}>{e.split(" ")[0]}</span>{l}
                </button>
              ))}
            </div>
          </div>
        </>}

        {/* ── PRIZES ── */}
        {section==="prizes" && <>
          <div style={{marginTop:16,padding:"12px",borderRadius:12,background:"linear-gradient(135deg,rgba(0,255,136,0.07),rgba(255,196,0,0.05))",border:"1px solid rgba(0,255,136,0.2)"}}>
            <div style={{fontSize:11,fontWeight:700,color:G,marginBottom:2}}>🏆 Mukofot Jamgʻarmasi</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:26,fontWeight:900,color:G}}>{(+prizePool).toLocaleString()}</span>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>UZS</span>
            </div>
          </div>
          {/* Prize pool */}
          <div>
            <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>💰 UMUMIY JAMGʻARMA (UZS)</span>
            <input value={prizePool} onChange={e=>setPrizePool(e.target.value.replace(/\D/g,""))} placeholder="0"
              style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(0,255,136,0.06)",border:"1px solid rgba(0,255,136,0.2)",color:"white",fontSize:13,fontWeight:700,outline:"none"}}/>
            <div className="flex gap-2 mt-2">
              {["10000","50000","100000","500000","1000000"].map(p=>(
                <button key={p} onClick={()=>setPrizePool(p)} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:9,fontWeight:700,background:"rgba(0,255,136,0.07)",color:G,border:"1px solid rgba(0,255,136,0.2)"}}>
                  {+p>=1000000?"1M":+p>=1000?`${+p/1000}K`:p}
                </button>
              ))}
            </div>
          </div>
          {/* 1st–3rd place prizes */}
          {[{n:1,b:badge1,sB:setBadge1,p:prize1,sP:setPrize1,col:"#ffd700",title:"1-O'RIN"},{n:2,b:badge2,sB:setBadge2,p:prize2,sP:setPrize2,col:"#c0c0c0",title:"2-O'RIN"},{n:3,b:badge3,sB:setBadge3,p:prize3,sP:setPrize3,col:"#cd7f32",title:"3-O'RIN"}].map(({n,b,sB,p,sP,col,title})=>(
            <div key={n} style={{padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.07)`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:24}}>{b}</span>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:col,letterSpacing:"0.08em"}}>{title}</div>
                  <div className="flex gap-1 mt-1">
                    {["🥇","🏅","👑","⭐","💎","🎖","🎗"].map(e=>(
                      <button key={e} onClick={()=>sB(e)} style={{fontSize:14,borderRadius:6,padding:"2px",background:b===e?"rgba(255,255,255,0.1)":"transparent"}}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <input value={p} onChange={e=>sP(e.target.value)} placeholder={`${title} mukofoti…`}
                style={{width:"100%",padding:"9px 11px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${col}22`,color:"white",fontSize:11,outline:"none"}}/>
            </div>
          ))}
          {/* Certificate */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:10,background:"rgba(0,255,136,0.05)",border:"1px solid rgba(0,255,136,0.15)"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:G}}>📜 Sertifikat</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Ishtirokchilarga raqamli sertifikat</div>
            </div>
            <button onClick={()=>setCertEnabled(p=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:certEnabled?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:certEnabled?"flex-end":"flex-start"}}>
              <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
            </button>
          </div>
        </>}

        {/* ── MEDIA ── */}
        {section==="media" && <>
          <div style={{marginTop:16}} className="flex flex-col gap-4">
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🎵 MAVZU MUSIQASI</span>
              <input value={themeMusic} onChange={e=>setThemeMusic(e.target.value)} placeholder="Musiqa nomi yoki URL…"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(0,255,136,0.15)",color:"white",fontSize:12,outline:"none"}}/>
              <div className="flex gap-2 mt-2">
                {[{e:"🌊",l:"Aurora"},{e:"⚡",l:"Neon"},{e:"🔥",l:"Epic"},{e:"🎵",l:"Chill"},{e:"🎤",l:"Trap"},{e:"🥁",l:"Beat"}].map(({e,l})=>(
                  <button key={l} onClick={()=>setThemeMusic(l)}
                    style={{flex:1,padding:"8px 4px",borderRadius:9,fontSize:9,fontWeight:700,
                      background:themeMusic===l?"rgba(0,255,136,0.12)":"rgba(255,255,255,0.04)",
                      color:themeMusic===l?G:"rgba(255,255,255,0.4)",
                      border:`1px solid ${themeMusic===l?"rgba(0,255,136,0.3)":"rgba(255,255,255,0.07)"}`,
                      display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:16}}>{e}</span>{l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🎬 DEMO VIDEO URL</span>
              <input value={demoUrl} onChange={e=>setDemoUrl(e.target.value)} placeholder="OlchaAI yoki YouTube havolasi…"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none"}}/>
            </div>
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>📢 ULASHISH SHABLONI</span>
              <textarea value={shareTemplate} onChange={e=>setShareTemplate(e.target.value)} rows={2} maxLength={200}
                placeholder="Men #{name} challengeda! @OlchaAI orqali qo'shiling…"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none",resize:"none"}}/>
            </div>
          </div>
        </>}

        {/* ── COMMUNITY ── */}
        {section==="community" && <>
          <div style={{marginTop:16}} className="flex flex-col gap-4">
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>💬 DISCORD HAVOLASI</span>
              <input value={discordLink} onChange={e=>setDiscordLink(e.target.value)} placeholder="discord.gg/mychallenge"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none"}}/>
            </div>
            {/* Leaderboard */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:10,background:"rgba(0,255,136,0.05)",border:"1px solid rgba(0,255,136,0.15)"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:G}}>🏅 Liderlar Taxtasi</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Real vaqt reyting ko'rsatiladi</div>
              </div>
              <button onClick={()=>setLeaderboard(p=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:leaderboard?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:leaderboard?"flex-end":"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
              </button>
            </div>
            {/* Voting open */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>🗳 Ochiq Ovozlash</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Har kim ovoz bera oladi</div>
              </div>
              <button onClick={()=>setVotingOpen(p=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:votingOpen?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:votingOpen?"flex-end":"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
              </button>
            </div>
            {/* Public result */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>👁 Natijalar Ochiq</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Hamma natijalarni ko'ra oladi</div>
              </div>
              <button onClick={()=>setPublicResult(p=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:publicResult?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:publicResult?"flex-end":"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
              </button>
            </div>
            {/* Estimated stats */}
            <div style={{padding:"14px",borderRadius:12,background:"rgba(0,255,136,0.04)",border:"1px solid rgba(0,255,136,0.12)"}}>
              <div style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>📊 PROGNOZ</div>
              <div className="flex gap-4">
                {[{l:"Ishtirokchi",v:"1.2K–5K",e:"👥"},{l:"Ko'rishlar",v:"50K+",e:"👁"},{l:"Viral Ball",v:"87%",e:"🚀"}].map(({l,v,e})=>(
                  <div key={l} style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:18}}>{e}</div>
                    <div style={{fontSize:12,fontWeight:800,color:G}}>{v}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ── ADVANCED ── */}
        {section==="advanced" && <>
          <div style={{marginTop:16}} className="flex flex-col gap-4">
            {/* Sponsor */}
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🤝 HOMIY NOMI</span>
              <input value={sponsorName} onChange={e=>setSponsorName(e.target.value)} placeholder="Kompaniya yoki brendat nomi…"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none"}}/>
            </div>
            {/* Geo restriction */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>🌍 Geo Cheklov</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Faqat tanlangan davlatlar</div>
                </div>
                <button onClick={()=>setGeoRestrict(p=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:geoRestrict?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:geoRestrict?"flex-end":"flex-start"}}>
                  <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                </button>
              </div>
              {geoRestrict && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["uz","ru","kz","kg","tj","tr","az"].map(c=>(
                    <button key={c} onClick={()=>setGeoCountry(c)}
                      style={{padding:"6px 14px",borderRadius:8,fontSize:10,fontWeight:700,
                        background:geoCountry===c?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                        color:geoCountry===c?G:"rgba(255,255,255,0.4)",
                        border:`1px solid ${geoCountry===c?"rgba(0,255,136,0.4)":"rgba(255,255,255,0.07)"}`}}>
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Winner announcement delay */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>⏳ G'OLIBNI E'LON QILISH KECHIKISHI</span>
                <span style={{fontSize:12,color:G,fontWeight:800}}>{winnerDelay} kun</span>
              </div>
              <input type="range" min={0} max={14} value={winnerDelay} onChange={e=>setWinnerDelay(+e.target.value)} style={{width:"100%",accentColor:G}}/>
            </div>
            {/* Access code */}
            <div>
              <span style={{fontSize:10,color:G,fontWeight:700,letterSpacing:"0.1em"}}>🔐 KIRISH KODI (ixtiyoriy)</span>
              <input value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="Maxfiy kod (bo'sh = hammaga ochiq)"
                style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:12,outline:"none"}}/>
            </div>
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {[
                {v:privateChallenge,s:setPrivateChallenge,l:"🔒 Maxfiy Challenge (faqat taklif bilan)"},
                {v:autoExtend,s:setAutoExtend,l:"⏰ Avtomatik muddat uzaytirish"},
                {v:boostEnabled,s:setBoostEnabled,l:"🚀 OlchaAI Boost — kengaytirilgan ko'rish"},
                {v:notifyAll,s:setNotifyAll,l:"🔔 Barcha ishtirokchilarga xabar"},
                {v:notifyWinner,s:setNotifyWinner,l:"🏆 G'olibga maxsus bildirishnoma"},
              ].map(({v,s,l})=>(
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{l}</span>
                  <button onClick={()=>s((p:boolean)=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:v?"rgba(0,255,136,0.6)":"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start"}}>
                    <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ── Done banner ── */}
        {done && createdChallenge && (
          <div style={{padding:"14px",borderRadius:12,background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.35)",display:"flex",alignItems:"center",gap:10}}>
            <Trophy style={{width:20,height:20,color:G}}/>
            <div>
              <div style={{fontSize:13,color:G,fontWeight:800}}>#{createdChallenge.hashtag} yaratildi!</div>
              <div style={{fontSize:10,color:"rgba(0,255,136,0.6)"}}>{createdChallenge.days} kunlik · {CATS.find(c=>c.v===createdChallenge.category)?.l} · {createdChallenge.judgeType==="vote"?"Ommaviy ovoz":createdChallenge.judgeType==="ai"?"AI baholaydi":"Ko'rishlar bo'yicha"}</div>
            </div>
          </div>
        )}

        {createChallengeMut.isError && (
          <div style={{padding:"10px 12px",borderRadius:10,background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.3)",color:"#ff2d55",fontSize:11}}>
            Xatolik yuz berdi, qayta urinib ko'ring.
          </div>
        )}

        {/* CTA */}
        <motion.button whileTap={{scale:0.96}}
          onClick={()=>{
            if(!name.trim()||createChallengeMut.isPending||done)return;
            createChallengeMut.mutate({data:{
              name: name.trim(),
              hashtag: name.trim(),
              category,
              description: desc || undefined,
              days,
              prizePool: Number(prizePool)||0,
              judgeType,
              settings: {
                rules: rules.filter(r=>r.trim()),
                minLen, maxLen, maxEntries, ageMin, followersMin,
                teamAllowed, reactionReq, commentReq, duetAllowed, hashtagReq,
                prizes: { 1: { badge: badge1, amount: prize1 }, 2: { badge: badge2, amount: prize2 }, 3: { badge: badge3, amount: prize3 } },
                certEnabled, leaderboard, themeMusic, demoUrl, shareTemplate, discordLink,
                votingOpen, publicResult, geoRestrict, geoCountry, sponsorName, winnerDelay,
                autoExtend, notifyAll, notifyWinner, boostEnabled, accessCode, privateChallenge,
                startDate, endDate, coverEmoji, coverBg, tags,
              },
            }});
          }}
          disabled={!name.trim()||createChallengeMut.isPending||done}
          style={{padding:"14px",borderRadius:14,letterSpacing:"0.04em",fontSize:13,fontWeight:900,
            background:!name.trim()?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#00ff88,#00cc44)",
            color:!name.trim()?"rgba(255,255,255,0.25)":"#000",
            boxShadow:name.trim()?`0 4px 20px rgba(0,255,136,0.4)`:"none"}}>
          {createChallengeMut.isPending?"⏳ Yaratilmoqda...":done?"✅ "+t("otube.ch_done"):"🚀 "+t("otube.ch_start")}
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
  const [activeTab, setActiveTab] = useState<"trim"|"filters"|"text"|"stickers"|"music"|"speed"|"grading"|"transitions"|"audio"|"subtitle"|"thumbnail"|"export"|"ar"|"chapters"|"collab">("trim");
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
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [temperature, setTemperature] = useState(0);
  const [vignette, setVignette]     = useState(0);
  const [drafts, setDrafts]         = useState(0);
  const [audioOn, setAudioOn]       = useState(false);

  /* ══ STUDIO MEGA (50+) ══ */
  const [sharpness,    setSharpness]    = useState(0);
  const [highlights,   setHighlights]   = useState(0);
  const [shadows,      setShadows]      = useState(0);
  const [blacks,       setBlacks]       = useState(0);
  const [whites,       setWhites]       = useState(0);
  const [hueShift,     setHueShift]     = useState(0);
  const [noiseReduce,  setNoiseReduce]  = useState(0);
  const [dehaze,       setDehaze]       = useState(0);
  const [reverseClip,  setReverseClip]  = useState(false);
  const [freezeFrame,  setFreezeFrame]  = useState(false);
  const [stabilize,    setStabilize]    = useState(false);
  const [autoColor,    setAutoColor]    = useState(false);
  const [splitScreen,  setSplitScreen]  = useState<"off"|"v"|"h">("off");
  const [blurBg,       setBlurBg]       = useState(false);
  const [portrait,     setPortrait]     = useState(false);
  const [boomerang,    setBoomerang]    = useState(false);
  const [textPos,      setTextPos]      = useState<"top"|"center"|"bottom">("bottom");
  const [textAnim,     setTextAnim]     = useState("none");
  const [textOutline,  setTextOutline]  = useState(false);
  const [textShadow,   setTextShadow]   = useState(false);
  const [caption2,     setCaption2]     = useState("");
  const [caption3,     setCaption3]     = useState("");
  const [voiceChanger, setVoiceChanger] = useState("original");
  const [voiceVol,     setVoiceVol]     = useState(100);
  const [musicVol,     setMusicVol]     = useState(80);
  const [echoPct,      setEchoPct]      = useState(0);
  const [reverbPct,    setReverbPct]    = useState(0);
  const [pitchShift,   setPitchShift]   = useState(0);
  const [fadeIn,       setFadeIn]       = useState(0);
  const [fadeOut,      setFadeOut]      = useState(0);
  const [beatSync,     setBeatSync]     = useState(false);
  const [noiseGate,    setNoiseGate]    = useState(false);
  const [subtitleLang, setSubtitleLang] = useState("uz");
  const [subtitleStyle,setSubtitleStyle]= useState("classic");
  const [subtitleLines,setSubtitleLines]= useState<string[]>(["Assalomu alaykum!", "Bu mening videom"]);
  const [thumbCaption, setThumbCaption] = useState("");
  const [thumbBg,      setThumbBg]      = useState("#000022");
  const [thumbEmoji,   setThumbEmoji]   = useState("🔥");
  const [thumbStyle,   setThumbStyle]   = useState("gradient");
  const [outFormat,    setOutFormat]    = useState("mp4");
  const [outBitrate,   setOutBitrate]   = useState("8");
  const [outFps,       setOutFps]       = useState("60");
  const [arFilter,     setArFilter]     = useState("none");
  const [lut,          setLut]          = useState("none");
  const [chaptersS,    setChaptersS]    = useState<{ts:string;label:string}[]>([]);
  const [chapTs,       setChapTs]       = useState("");
  const [chapLabel,    setChapLabel]    = useState("");
  const [collabEmail,  setCollabEmail]  = useState("");
  const [collaborators,setCollaborators]= useState<string[]>([]);
  const [pinComment,   setPinComment]   = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [toneMap,      setToneMap]      = useState("sdr");
  const [cropMode,     setCropMode]     = useState("16:9");
  const [watermark,    setWatermark]    = useState(false);
  const [watermarkPos, setWatermarkPos] = useState("br");
  const [colorLimiter, setColorLimiter] = useState(false);
  const [thumbImageSrc, setThumbImageSrc] = useState<string>("");
  const [thumbVideoSrc, setThumbVideoSrc] = useState<string>("");
  const [thumbMediaType, setThumbMediaType] = useState<"none"|"image"|"video">("none");
  const [thumbTextSize, setThumbTextSize] = useState(16);
  const [thumbTextColor, setThumbTextColor] = useState("#ffffff");
  const [thumbTextPos, setThumbTextPos] = useState<"top"|"center"|"bottom">("center");
  const [thumbFilter, setThumbFilter] = useState("none");
  const [transPreview, setTransPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const thumbImgRef = useRef<HTMLInputElement>(null);
  const thumbVidRef = useRef<HTMLInputElement>(null);

  const uploadUrlMut = useRequestUploadUrl();
  const createMut    = useCreateReel({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({queryKey:["/api/reels"]}); setPublished(true); setPublishing(false); },
      onError:   () => setPublishing(false),
    }
  });

  /* Real AI color-correction — applied when Avto Rang Korreksiya is toggled on */
  const [colorAiNote, setColorAiNote] = useState("");
  const colorAiMut = useOtubeAiColorCorrection({
    mutation: {
      onSuccess: (res) => {
        setBrightness(Math.round(res.filters.brightness*100));
        setContrast(Math.round(res.filters.contrast*100));
        setSaturation(Math.round(res.filters.saturation*100));
        setTemperature(Math.round(res.filters.temperature));
        setColorAiNote(res.note);
      },
    },
  });
  const applyAutoColor = useCallback(()=>{
    setAutoColor(p=>{
      const next=!p;
      if (next) colorAiMut.mutate({ data: { caption } });
      else setColorAiNote("");
      return next;
    });
  },[caption]);

  /* Real collab invites — persisted via /api/reels/collaborators (owner-scoped) */
  const [collabError, setCollabError] = useState("");
  const { data: collabList=[] } = useListReelCollaborators();
  const inviteCollabMut = useInviteReelCollaborator({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({queryKey:["/api/reels/collaborators"]}); setCollabEmail(""); setCollabError(""); },
      onError:   () => setCollabError("Foydalanuvchi topilmadi yoki allaqachon taklif qilingan"),
    },
  });
  const removeCollabMut = useRemoveReelCollaborator({
    mutation: { onSuccess: () => qc.invalidateQueries({queryKey:["/api/reels/collaborators"]}) },
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
    { id:"hiphop",   name:"OlchaAI Hip-Hop",    emoji:"🎧", bpm:92  },
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

  const handlePublish = async () => {
    if (!file||!user) return;
    setPublishing(true);
    try {
      const req: UploadUrlRequest = {name:file.name,size:file.size,contentType:file.type};
      const {uploadURL,objectPath} = await uploadUrlMut.mutateAsync({data:req});
      const res = await fetch(uploadURL,{method:"PUT",headers:{"Content-Type":file.type},credentials:"include",body:file});
      if (!res.ok) throw new Error("Upload failed");
      let studioObjectPath = objectPath;
      try { const b=await res.json(); if(b?.objectPath) studioObjectPath=b.objectPath; } catch {}
      const studioVideoUrl = studioObjectPath.startsWith("http") ? studioObjectPath : `${API_BASE}/api/storage${studioObjectPath}`;
      createMut.mutate({data:{
        authorId:user.id,
        videoUrl:studioVideoUrl,
        caption:caption||"OTube Studio · OlchaAI",
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
    { id:"audio",       Icon:Mic2,               label:"Audio"                    },
    { id:"subtitle",    Icon:AlignCenter,        label:"Subtitle"                 },
    { id:"thumbnail",   Icon:ImagePlus,          label:"Thumb"                    },
    { id:"export",      Icon:Upload,             label:"Export"                   },
    { id:"ar",          Icon:Wand2,              label:"AR"                       },
    { id:"chapters",    Icon:ListVideo,          label:"Chapters"                 },
    { id:"collab",      Icon:Users,              label:"Kollab"                   },
  ] as const;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[10000] flex flex-col" style={{background:"#04000f"}}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pb-3"
        style={{borderBottom:"1px solid rgba(168,85,247,0.18)",background:"rgba(4,0,15,0.95)",
          paddingTop:"calc(env(safe-area-inset-top, 0px) + 12px)"}}>
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
          <>
            <video ref={videoRef} src={videoSrc} autoPlay loop muted={!audioOn} playsInline
              style={{width:"100%",height:"100%",objectFit:"cover",filter:appliedCss}}/>
            {/* Audio toggle — top-right of preview, does NOT overlap waveform */}
            <button onClick={()=>setAudioOn(a=>!a)}
              style={{position:"absolute",top:8,right:8,width:32,height:32,borderRadius:"50%",
                background:audioOn?"rgba(0,229,255,0.3)":"rgba(0,0,0,0.55)",
                backdropFilter:"blur(8px)",border:`1px solid ${audioOn?"rgba(0,229,255,0.6)":"rgba(255,255,255,0.15)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                boxShadow:audioOn?"0 0 10px rgba(0,229,255,0.5)":"none"}}>
              {audioOn
                ? <Volume2 style={{width:14,height:14,color:"#00e5ff"}}/>
                : <VolumeX style={{width:14,height:14,color:"rgba(255,255,255,0.5)"}}/>}
            </button>
          </>
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
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
      <input ref={thumbImgRef} type="file" accept="image/*" className="hidden"
        onChange={e=>{const f=e.target.files?.[0];if(f){setThumbImageSrc(URL.createObjectURL(f));setThumbMediaType("image");}}}/>
      <input ref={thumbVidRef} type="file" accept="video/*" className="hidden"
        onChange={e=>{const f=e.target.files?.[0];if(f){setThumbVideoSrc(URL.createObjectURL(f));setThumbMediaType("video");}}}/>

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

            {/* ── VIDEO O'LCHAMLARI ── */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>VIDEO O'LCHAMLARI</span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{cropMode}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {([
                  {ratio:"9:16",  label:"Vertikal",   sub:"TikTok · Reels",  w:27,h:48,platform:"📱"},
                  {ratio:"16:9",  label:"Gorizontal",  sub:"YouTube · OTube", w:48,h:27,platform:"🖥️"},
                  {ratio:"1:1",   label:"Kvadrat",     sub:"Instagram",       w:38,h:38,platform:"□"},
                  {ratio:"4:5",   label:"Portrait",    sub:"Instagram Feed",  w:34,h:42,platform:"📷"},
                  {ratio:"4:3",   label:"Klassik",     sub:"TV Format",       w:44,h:33,platform:"📺"},
                  {ratio:"21:9",  label:"CinemaScope", sub:"Kino",            w:48,h:20,platform:"🎬"},
                ] as const).map(({ratio,label,sub,w,h,platform})=>{
                  const active = cropMode===ratio;
                  return (
                    <button key={ratio} onClick={()=>setCropMode(ratio)}
                      style={{
                        display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                        padding:"10px 6px",borderRadius:12,
                        background:active?"rgba(168,85,247,0.18)":"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${active?T.violet:"rgba(255,255,255,0.07)"}`,
                        boxShadow:active?`0 0 14px ${T.violet}55`:"none",
                        transition:"all 0.18s",cursor:"pointer",
                      }}>
                      {/* Aspect ratio visual */}
                      <div style={{
                        width:w/2+4, height:h/2+4,
                        borderRadius:3,
                        border:`2px solid ${active?T.violet:"rgba(255,255,255,0.2)"}`,
                        background:active?"rgba(168,85,247,0.25)":"rgba(255,255,255,0.06)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:8, color:active?T.violet:"rgba(255,255,255,0.3)",
                        transition:"all 0.18s",
                        flexShrink:0,
                      }}>{platform}</div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:9.5,fontWeight:800,color:active?"white":"rgba(255,255,255,0.55)",lineHeight:1.2}}>{ratio}</div>
                        <div style={{fontSize:7.5,color:active?T.violet:"rgba(255,255,255,0.28)",fontWeight:600,lineHeight:1.3}}>{label}</div>
                        <div style={{fontSize:6.5,color:"rgba(255,255,255,0.2)",marginTop:1}}>{sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Screen size presets */}
              <div style={{marginTop:10,padding:"9px 12px",borderRadius:10,
                background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{fontSize:8.5,color:"rgba(255,255,255,0.35)",marginBottom:7,fontWeight:600}}>EKRAN O'LCHAMIGA MOSLASH</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {([
                    {l:"iPhone",   r:"9:16",  px:"1080×1920"},
                    {l:"Android",  r:"9:16",  px:"1080×1920"},
                    {l:"iPad",     r:"4:3",   px:"2048×1536"},
                    {l:"Desktop",  r:"16:9",  px:"1920×1080"},
                    {l:"4K TV",    r:"16:9",  px:"3840×2160"},
                    {l:"Story",    r:"9:16",  px:"1080×1920"},
                  ] as const).map(({l,r,px})=>(
                    <button key={l+r+px} onClick={()=>setCropMode(r)}
                      style={{padding:"5px 9px",borderRadius:7,fontSize:8.5,fontWeight:700,
                        background:cropMode===r?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.05)",
                        border:`1px solid ${cropMode===r?T.violet:"rgba(255,255,255,0.08)"}`,
                        color:cropMode===r?T.violet:"rgba(255,255,255,0.4)",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                        transition:"all 0.15s"}}>
                      <span>{l}</span>
                      <span style={{fontSize:6.5,opacity:0.7,fontFamily:"monospace"}}>{px}</span>
                    </button>
                  ))}
                </div>
              </div>
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
              <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setTemperature(0);setVignette(0);setSharpness(0);setHighlights(0);setShadows(0);setBlacks(0);setWhites(0);setHueShift(0);setNoiseReduce(0);setDehaze(0);}}
                style={{fontSize:10,color:T.violet,fontWeight:700}}>Reset All</button>
            </div>
            {/* Section: Basic */}
            <div style={{fontSize:8,color:T.violet,fontWeight:800,letterSpacing:"0.12em"}}>⚡ ASOSIY</div>
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
            {/* Section: Advanced */}
            <div style={{fontSize:8,color:T.aurora,fontWeight:800,letterSpacing:"0.12em",marginTop:4}}>🎬 KENGAYTIRILGAN</div>
            {[
              {label:"Sharpness",   value:sharpness,  set:setSharpness,  min:-50, max:100, unit:"",  col:T.aurora },
              {label:"Highlights",  value:highlights, set:setHighlights, min:-100,max:100, unit:"",  col:T.gold   },
              {label:"Shadows",     value:shadows,    set:setShadows,    min:-100,max:100, unit:"",  col:"#8899aa"},
              {label:"Whites",      value:whites,     set:setWhites,     min:-100,max:100, unit:"",  col:"#eeeeff"},
              {label:"Blacks",      value:blacks,     set:setBlacks,     min:-100,max:100, unit:"",  col:"#446688"},
              {label:"Hue Shift",   value:hueShift,   set:setHueShift,   min:-180,max:180, unit:"°", col:T.orange  },
              {label:"Dehaze",      value:dehaze,     set:setDehaze,     min:0,   max:100, unit:"",  col:T.cyan   },
              {label:"Noise Red.",  value:noiseReduce,set:setNoiseReduce,min:0,   max:100, unit:"",  col:T.violet },
            ].map(({label,value,set,min,max,unit,col})=>(
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span style={{fontSize:9,color:col,fontWeight:700,letterSpacing:"0.08em"}}>{label.toUpperCase()}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>
                    {value>0&&unit!=="%"?"+":""}{value}{unit}
                  </span>
                </div>
                <input type="range" min={min} max={max} value={value}
                  onChange={e=>set(Number(e.target.value))}
                  style={{width:"100%",accentColor:col}}/>
              </div>
            ))}
            {/* Auto-color toggle — real AI suggestion via /api/otube/ai/color-correction */}
            <div style={{display:"flex",flexDirection:"column",gap:6,padding:"10px 12px",borderRadius:10,background:"rgba(0,255,238,0.05)",border:"1px solid rgba(0,255,238,0.15)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>
                  🤖 Avto Rang Korreksiya (AI){colorAiMut.isPending?" · yuklanmoqda…":""}
                </span>
                <button onClick={applyAutoColor} disabled={colorAiMut.isPending}
                  style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:autoColor?T.aurora:"rgba(255,255,255,0.12)",justifyContent:autoColor?"flex-end":"flex-start",opacity:colorAiMut.isPending?0.6:1}}>
                  <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                </button>
              </div>
              {autoColor && colorAiNote && (
                <span style={{fontSize:9.5,color:T.aurora,lineHeight:1.4}}>✨ {colorAiNote}</span>
              )}
            </div>
            {/* Preview swatch */}
            <div style={{height:40,borderRadius:12,overflow:"hidden",
              background:"linear-gradient(135deg,#ff3500,#7700ff,#00ffee)",
              filter:gradingCss}}/>
          </div>
        )}

        {/* ── TEXT ── */}
        {activeTab==="text" && (
          <div className="flex flex-col gap-4">
            {/* Layer 1 */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>📝 MATN 1</span>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{caption.length}/80</span>
              </div>
              <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={80}
                placeholder="Video ustiga matn..."
                style={{width:"100%",padding:"10px 12px",borderRadius:10,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                  color:textColor,fontSize:13,fontStyle:textFont==="italic"?"italic":"normal",
                  fontWeight:textFont==="italic"?400:900,outline:"none"}}/>
            </div>
            {/* Layer 2 */}
            <div>
              <span style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>📝 MATN 2 (Taglavha)</span>
              <input value={caption2} onChange={e=>setCaption2(e.target.value)} maxLength={60}
                placeholder="Ikkinchi qator…"
                style={{width:"100%",marginTop:4,padding:"9px 12px",borderRadius:10,
                  background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",
                  color:"white",fontSize:11,outline:"none"}}/>
            </div>
            {/* Layer 3 */}
            <div>
              <span style={{fontSize:9,color:T.orange,fontWeight:700,letterSpacing:"0.1em"}}>📝 MATN 3 (Tepa)</span>
              <input value={caption3} onChange={e=>setCaption3(e.target.value)} maxLength={40}
                placeholder="Yuqori satr matni…"
                style={{width:"100%",marginTop:4,padding:"9px 12px",borderRadius:10,
                  background:"rgba(255,107,0,0.05)",border:"1px solid rgba(255,107,0,0.15)",
                  color:"white",fontSize:11,outline:"none"}}/>
            </div>
            {/* Position */}
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>📍 POZITSIYA</span>
              <div className="flex gap-2 mt-1.5">
                {([["top","Yuqori"],["center","Markaz"],["bottom","Pastki"]] as const).map(([v,l])=>(
                  <button key={v} onClick={()=>setTextPos(v)}
                    style={{flex:1,padding:"8px",borderRadius:9,fontSize:10,fontWeight:700,
                      background:textPos===v?"rgba(168,85,247,0.18)":"rgba(255,255,255,0.04)",
                      color:textPos===v?T.violet:"rgba(255,255,255,0.4)",
                      border:`1px solid ${textPos===v?"rgba(168,85,247,0.4)":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Color */}
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>🎨 RANG</span>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {["#ffffff","#00ffee","#ff3500","#7700ff","#ffc400","#ff2d55","#00ff88","#ff6b00","#00e5ff","#a855f7"].map(c=>(
                  <button key={c} onClick={()=>setTextColor(c)}
                    style={{width:26,height:26,borderRadius:"50%",background:c,
                      border:`3px solid ${textColor===c?"white":"transparent"}`,
                      boxShadow:textColor===c?"0 0 0 1px rgba(255,255,255,0.4)":"none",transition:"all 0.15s"}}/>
                ))}
                <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}
                  style={{width:26,height:26,borderRadius:"50%",border:"none",cursor:"pointer",padding:0,background:"transparent"}}/>
              </div>
            </div>
            {/* Style */}
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>✍️ STIL</span>
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
            {/* Animation */}
            <div>
              <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>🎬 ANIMATSIYA</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[{v:"none",l:"Yo'q"},{v:"typewriter",l:"Yozuv"},{v:"zoom",l:"Zoom"},{v:"slide",l:"Slide"},{v:"fade",l:"Fade"},{v:"bounce",l:"Sakrash"},{v:"wave",l:"To'lqin"},{v:"glitch",l:"Glitch"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setTextAnim(v)}
                    style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,
                      background:textAnim===v?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.04)",
                      color:textAnim===v?T.violet:"rgba(255,255,255,0.4)",
                      border:`1px solid ${textAnim===v?T.violet+"55":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Size */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>{t("otube.studio_text_size")}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{textSize}px</span>
              </div>
              <input type="range" min={10} max={48} value={textSize}
                onChange={e=>setTextSize(Number(e.target.value))}
                style={{width:"100%",accentColor:T.violet}}/>
            </div>
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {[{v:textBg,s:setTextBg,l:t("otube.studio_text_bg")},{v:textOutline,s:setTextOutline,l:"Chegara (Outline)"},{v:textShadow,s:setTextShadow,l:"Soya (Drop Shadow)"}].map(({v,s,l})=>(
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{l}</span>
                  <motion.button whileTap={{scale:0.9}} onClick={()=>s((b:boolean)=>!b)}
                    style={{width:40,height:22,borderRadius:99,position:"relative",
                      background:v?T.violet:"rgba(255,255,255,0.1)",transition:"all 0.2s"}}>
                    <motion.div animate={{x:v?18:2}}
                      style={{position:"absolute",top:2,width:18,height:18,borderRadius:"50%",background:"white"}}/>
                  </motion.button>
                </div>
              ))}
            </div>
            {/* Preview */}
            {caption && (
              <div style={{padding:"14px",borderRadius:12,background:"rgba(0,0,0,0.6)",
                textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",position:"relative",minHeight:80}}>
                {caption3 && <div style={{position:"absolute",top:8,left:0,right:0,textAlign:"center"}}><span style={{fontSize:10,color:T.orange,fontWeight:700}}>{caption3}</span></div>}
                <span style={{
                  fontSize:textSize,fontWeight:textFont==="italic"?400:900,
                  fontStyle:textFont==="italic"?"italic":"normal",
                  color:textColor,
                  textShadow:textShadow?"0 2px 12px rgba(0,0,0,0.95)":"0 1px 4px rgba(0,0,0,0.8)",
                  WebkitTextStroke:textOutline?`0.5px ${textColor==="white"?"#666":textColor}`:undefined,
                  padding:"4px 10px",borderRadius:6,
                  background:textBg?"rgba(0,0,0,0.45)":"transparent"}}>
                  {caption}
                </span>
                {caption2 && <div style={{marginTop:4}}><span style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{caption2}</span></div>}
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
            {/* Live preview strip */}
            <div style={{borderRadius:12,overflow:"hidden",height:70,position:"relative",
              background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.18)"}}>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                justifyContent:"center",gap:0}}>
                {/* Before clip */}
                <motion.div
                  animate={transPreview?{x:[0,-10,0],opacity:[1,0,0]}:{}}
                  transition={{duration:0.6,ease:"easeInOut"}}
                  style={{flex:1,height:"100%",background:`linear-gradient(135deg,${T.violet}44,${T.nova}44)`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:22}}>🎬</span>
                </motion.div>
                {/* Transition indicator */}
                <motion.div
                  animate={transPreview?{scale:[1,1.4,1],opacity:[0.6,1,0.6]}:{}}
                  transition={{duration:0.6,repeat:transPreview?Infinity:0}}
                  style={{width:32,height:32,borderRadius:"50%",
                    background:"rgba(168,85,247,0.7)",display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0,zIndex:2,
                    boxShadow:`0 0 16px ${T.violet}88`}}>
                  <span style={{fontSize:14}}>{TRANSITIONS.find(tr=>tr.id===transition)?.emoji}</span>
                </motion.div>
                {/* After clip */}
                <motion.div
                  animate={transPreview?{x:[10,0,0],opacity:[0,1,1]}:{}}
                  transition={{duration:0.6,ease:"easeInOut"}}
                  style={{flex:1,height:"100%",background:`linear-gradient(135deg,${T.cyan}33,${T.aurora}33)`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:22}}>✨</span>
                </motion.div>
              </div>
              {/* Preview button */}
              <motion.button whileTap={{scale:0.9}}
                onClick={()=>{setTransPreview(true);setTimeout(()=>setTransPreview(false),2000);}}
                style={{position:"absolute",top:6,right:8,padding:"3px 10px",borderRadius:99,
                  fontSize:8,fontWeight:800,background:T.violet,color:"white",letterSpacing:"0.06em"}}>
                ▶ PREVIEW
              </motion.button>
              <div style={{position:"absolute",bottom:6,left:10,fontSize:8,color:"rgba(255,255,255,0.35)"}}>
                {TRANSITIONS.find(tr=>tr.id===transition)?.name} o'tish effekti
              </div>
            </div>

            <p style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>
              {t("otube.studio_transition_hint")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TRANSITIONS.map(tr=>(
                <motion.button key={tr.id} whileTap={{scale:0.92}}
                  onClick={()=>{setTransition(tr.id);setTransPreview(true);setTimeout(()=>setTransPreview(false),1600);}}
                  style={{padding:"10px 6px",borderRadius:12,display:"flex",flexDirection:"column",
                    alignItems:"center",gap:4,
                    background:transition===tr.id?"rgba(168,85,247,0.18)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${transition===tr.id?"rgba(168,85,247,0.5)":"rgba(255,255,255,0.07)"}`,
                    boxShadow:transition===tr.id?`0 0 12px ${T.violet}33`:"none",
                    transition:"all 0.15s"}}>
                  <span style={{fontSize:20}}>{tr.emoji}</span>
                  <span style={{fontSize:9,fontWeight:700,
                    color:transition===tr.id?T.violet:"rgba(255,255,255,0.4)"}}>{tr.name}</span>
                </motion.button>
              ))}
            </div>
            <div style={{padding:"10px 12px",borderRadius:10,
              background:"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.15)",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                {t("otube.studio_transition_selected")} <span style={{color:T.violet,fontWeight:700}}>
                  {TRANSITIONS.find(tr=>tr.id===transition)?.emoji} {TRANSITIONS.find(tr=>tr.id===transition)?.name}
                </span>
              </span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>Davomiyligi</span>
                <select style={{padding:"3px 6px",borderRadius:6,background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",color:T.violet,fontSize:9,fontWeight:700,outline:"none",appearance:"none"}}>
                  {["0.3s","0.5s","0.8s","1.0s","1.5s"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
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

        {/* ── AUDIO STUDIO ── */}
        {activeTab==="audio" && (
          <div className="flex flex-col gap-4">
            {/* Voice changer */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎙 OVOZ REJIMI</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"original",e:"🎙",l:"Asl"},{v:"robot",e:"🤖",l:"Robot"},{v:"chipmunk",e:"🐿",l:"Chipmunk"},{v:"bass",e:"🎸",l:"Bass"},{v:"echo",e:"🌊",l:"Echo"},{v:"alien",e:"👾",l:"Alien"},{v:"cave",e:"🏔",l:"G'or"},{v:"helium",e:"🎈",l:"Helium"}].map(({v,e,l})=>(
                  <button key={v} onClick={()=>setVoiceChanger(v)}
                    style={{padding:"8px 10px",borderRadius:10,fontSize:10,fontWeight:700,
                      background:voiceChanger===v?T.gCyan:"rgba(255,255,255,0.05)",
                      color:voiceChanger===v?"#000":T.txtSub,
                      border:`1px solid ${voiceChanger===v?T.cyan:"rgba(255,255,255,0.08)"}`,
                      display:"flex",alignItems:"center",gap:4}}>
                    <span>{e}</span>{l}
                  </button>
                ))}
              </div>
            </div>
            {/* Volume controls */}
            <div className="flex flex-col gap-3">
              {[{l:"🎙 Ovoz balandligi",v:voiceVol,s:setVoiceVol,c:T.cyan},{l:"🎵 Musiqa balandligi",v:musicVol,s:setMusicVol,c:T.violet}].map(({l,v,s,c})=>(
                <div key={l}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700}}>{l}</span>
                    <span style={{fontSize:10,color:c,fontWeight:700}}>{v}%</span>
                  </div>
                  <input type="range" min={0} max={200} value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:c}}/>
                </div>
              ))}
            </div>
            {/* Effects */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎚 EFFEKTLAR</div>
              <div className="flex flex-col gap-3">
                {[{l:"🌊 Echo",v:echoPct,s:setEchoPct},{l:"🔔 Reverb",v:reverbPct,s:setReverbPct},{l:"🎵 Pitch Shift",v:pitchShift,s:setPitchShift,min:-12,max:12},{l:"🎬 Fade In",v:fadeIn,s:setFadeIn,max:5},{l:"🎬 Fade Out",v:fadeOut,s:setFadeOut,max:5}].map(({l,v,s,min=-0,max=100})=>(
                  <div key={l}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700}}>{l}</span>
                      <span style={{fontSize:10,color:T.violet,fontWeight:700}}>{v}</span>
                    </div>
                    <input type="range" min={min} max={max} value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:T.violet}}/>
                  </div>
                ))}
              </div>
            </div>
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              {[{v:beatSync,s:setBeatSync,l:"🥁 Beat Sync — musiqaga mos kesish"},{v:noiseGate,s:setNoiseGate,l:"🔇 Noise Gate — fon shovqinini o'chirish"}].map(({v,s,l})=>(
                <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{l}</span>
                  <button onClick={()=>s((p:boolean)=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:v?T.cyan:"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start"}}>
                    <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                  </button>
                </div>
              ))}
            </div>
            {/* Equalizer */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎛 EKVALAYZR</div>
              <div style={{display:"flex",gap:8,alignItems:"flex-end",height:60}}>
                {[60,120,500,1000,4000,8000,16000].map((freq,i)=>(
                  <div key={freq} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{flex:1,width:"100%",background:"rgba(255,255,255,0.04)",borderRadius:2,position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:`${40+Math.sin(i*0.9)*30}%`,background:`linear-gradient(180deg,${T.cyan},${T.violet}55)`,borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:6,color:"rgba(255,255,255,0.3)",fontWeight:700}}>{freq>=1000?`${freq/1000}k`:freq}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SUBTITLE / CAPTIONS ── */}
        {activeTab==="subtitle" && (
          <div className="flex flex-col gap-4">
            <div>
              <div style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🌐 SUBTITRL TILI</div>
              <div className="flex flex-wrap gap-2">
                {["uz","en","ru","de","fr","zh","ar","tr","ko","ja"].map(l=>(
                  <button key={l} onClick={()=>setSubtitleLang(l)}
                    style={{padding:"6px 12px",borderRadius:8,fontSize:10,fontWeight:800,
                      background:subtitleLang===l?T.gViolet:"rgba(255,255,255,0.05)",
                      color:subtitleLang===l?"white":T.txtSub,
                      border:`1px solid ${subtitleLang===l?T.violet:"rgba(255,255,255,0.08)"}`}}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎨 SUBTITRL USLUBI</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"classic",l:"Klassik"},{v:"neon",l:"Neon"},{v:"shadow",l:"Soya"},{v:"outline",l:"Chegara"},{v:"bubble",l:"Pufakcha"},{v:"karaoke",l:"Karaoke"},{v:"minimal",l:"Minimal"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setSubtitleStyle(v)}
                    style={{padding:"7px 11px",borderRadius:9,fontSize:10,fontWeight:700,
                      background:subtitleStyle===v?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.04)",
                      color:subtitleStyle===v?T.violet:T.txtSub,
                      border:`1px solid ${subtitleStyle===v?T.violet+"66":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:9,color:T.violet,fontWeight:700,letterSpacing:"0.1em"}}>📝 SUBTITR SATRLARI</span>
                <button onClick={()=>setSubtitleLines(p=>[...p,""])} style={{fontSize:10,color:T.violet,fontWeight:700}}>+ Qo'shish</button>
              </div>
              <div className="flex flex-col gap-2">
                {subtitleLines.map((line,i)=>(
                  <div key={i} style={{display:"flex",gap:6}}>
                    <span style={{fontSize:9,fontWeight:700,color:T.violet,width:16,marginTop:10}}>{i+1}</span>
                    <input value={line} onChange={e=>{const n=[...subtitleLines];n[i]=e.target.value;setSubtitleLines(n);}}
                      placeholder={`${i+1}-satr matni…`}
                      style={{flex:1,padding:"8px 10px",borderRadius:8,background:"rgba(168,85,247,0.07)",
                        border:"1px solid rgba(168,85,247,0.2)",color:"white",fontSize:11,outline:"none"}}/>
                    <button onClick={()=>setSubtitleLines(p=>p.filter((_,j)=>j!==i))} style={{color:"#ff2d55",fontSize:16,marginTop:4}}>×</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{borderRadius:10,background:"rgba(0,0,0,0.6)",padding:"24px 12px",textAlign:"center",position:"relative",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center"}}>
                <span style={{
                  fontSize:13,fontWeight:subtitleStyle==="neon"?900:700,
                  color:subtitleStyle==="neon"?T.cyan:subtitleStyle==="karaoke"?"#ffc400":"white",
                  textShadow:subtitleStyle==="neon"?`0 0 12px ${T.cyan}`:subtitleStyle==="shadow"?"0 2px 8px rgba(0,0,0,0.9)":"none",
                  padding:"4px 14px",borderRadius:6,
                  background:subtitleStyle==="bubble"?"rgba(0,0,0,0.7)":subtitleStyle==="outline"?"transparent":"rgba(0,0,0,0.45)",
                  WebkitTextStroke:subtitleStyle==="outline"?"0.5px white":"none",
                }}>
                  {subtitleLines[0]||"Subtitrl ko'rinishi"}
                </span>
              </div>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",display:"block"}}>Preview</span>
            </div>
          </div>
        )}

        {/* ── THUMBNAIL CREATOR ── */}
        {activeTab==="thumbnail" && (
          <div className="flex flex-col gap-4">

            {/* ── UPLOAD MEDIA ── */}
            <div>
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>📸 MUQOVA MEDIA</div>
              <div className="flex gap-2">
                {/* Upload image */}
                <motion.button whileTap={{scale:0.95}} onClick={()=>thumbImgRef.current?.click()}
                  style={{flex:1,padding:"14px 8px",borderRadius:12,display:"flex",flexDirection:"column",
                    alignItems:"center",gap:6,
                    background:thumbMediaType==="image"?"rgba(255,196,0,0.12)":"rgba(255,255,255,0.04)",
                    border:`1.5px dashed ${thumbMediaType==="image"?T.gold:"rgba(255,255,255,0.12)"}`,
                    cursor:"pointer"}}>
                  <span style={{fontSize:24}}>🖼</span>
                  <span style={{fontSize:9,fontWeight:700,color:thumbMediaType==="image"?T.gold:"rgba(255,255,255,0.4)"}}>Rasm yuklash</span>
                  <span style={{fontSize:7,color:"rgba(255,255,255,0.25)"}}>JPG, PNG, WEBP</span>
                </motion.button>
                {/* Upload video frame */}
                <motion.button whileTap={{scale:0.95}} onClick={()=>thumbVidRef.current?.click()}
                  style={{flex:1,padding:"14px 8px",borderRadius:12,display:"flex",flexDirection:"column",
                    alignItems:"center",gap:6,
                    background:thumbMediaType==="video"?"rgba(0,229,255,0.1)":"rgba(255,255,255,0.04)",
                    border:`1.5px dashed ${thumbMediaType==="video"?T.cyan:"rgba(255,255,255,0.12)"}`,
                    cursor:"pointer"}}>
                  <span style={{fontSize:24}}>🎬</span>
                  <span style={{fontSize:9,fontWeight:700,color:thumbMediaType==="video"?T.cyan:"rgba(255,255,255,0.4)"}}>Video muqova</span>
                  <span style={{fontSize:7,color:"rgba(255,255,255,0.25)"}}>MP4, MOV, AVI</span>
                </motion.button>
                {/* Capture from current video */}
                {videoSrc && (
                  <motion.button whileTap={{scale:0.95}} onClick={()=>{
                    const v=videoRef.current;
                    if(!v)return;
                    const c=document.createElement("canvas");
                    c.width=v.videoWidth||640;c.height=v.videoHeight||360;
                    c.getContext("2d")?.drawImage(v,0,0);
                    setThumbImageSrc(c.toDataURL("image/jpeg",0.92));setThumbMediaType("image");
                  }}
                    style={{flex:1,padding:"14px 8px",borderRadius:12,display:"flex",flexDirection:"column",
                      alignItems:"center",gap:6,
                      background:"rgba(168,85,247,0.07)",
                      border:"1.5px dashed rgba(168,85,247,0.3)",cursor:"pointer"}}>
                    <span style={{fontSize:24}}>📷</span>
                    <span style={{fontSize:9,fontWeight:700,color:T.violet}}>Kadr olish</span>
                    <span style={{fontSize:7,color:"rgba(255,255,255,0.25)"}}>Hozirgi frame</span>
                  </motion.button>
                )}
                {/* Clear */}
                {thumbMediaType!=="none" && (
                  <motion.button whileTap={{scale:0.95}} onClick={()=>{setThumbMediaType("none");setThumbImageSrc("");setThumbVideoSrc("");}}
                    style={{width:44,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:4,background:"rgba(255,53,0,0.08)",
                      border:"1.5px dashed rgba(255,53,0,0.3)",cursor:"pointer"}}>
                    <span style={{fontSize:16}}>🗑</span>
                    <span style={{fontSize:7,color:"rgba(255,53,0,0.7)"}}>O'ch</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div style={{aspectRatio:"16/9",borderRadius:14,overflow:"hidden",position:"relative",
              background:thumbMediaType==="image"&&thumbImageSrc
                ? `url(${thumbImageSrc}) center/cover`
                : thumbStyle==="gradient"?`linear-gradient(135deg,${thumbBg},${T.violet}66)`
                : thumbStyle==="neon"?`radial-gradient(ellipse at 30% 40%,${T.cyan}44,${thumbBg})`
                : thumbStyle==="cinematic"?`linear-gradient(180deg,${thumbBg} 0%,rgba(0,0,0,0.9) 100%)`
                : thumbStyle==="bold"?`linear-gradient(135deg,${T.orange},${T.violet})`
                : thumbBg,
              border:"2px solid rgba(255,196,0,0.2)",boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>

              {/* Video preview for video thumbnail */}
              {thumbMediaType==="video" && thumbVideoSrc && (
                <video src={thumbVideoSrc} autoPlay loop muted playsInline
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
              )}

              {/* Overlays */}
              {thumbStyle==="neon" && <div style={{position:"absolute",inset:0,boxShadow:`inset 0 0 50px ${T.cyan}44`}}/>}
              {thumbStyle==="cinematic" && <div style={{position:"absolute",top:0,left:0,right:0,height:"12%",background:"rgba(0,0,0,0.85)"}}/> }
              {thumbStyle==="cinematic" && <div style={{position:"absolute",bottom:0,left:0,right:0,height:"12%",background:"rgba(0,0,0,0.85)"}}/> }

              {/* Emoji */}
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                alignItems:"center",
                justifyContent:thumbTextPos==="top"?"flex-start":thumbTextPos==="bottom"?"flex-end":"center",
                padding:thumbTextPos==="top"?"16px 0 0":"0 0 16px",gap:6,pointerEvents:"none"}}>
                <span style={{fontSize:36,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.8))"}}>{thumbEmoji}</span>
                {thumbCaption && (
                  <span style={{fontSize:thumbTextSize,fontWeight:900,color:thumbTextColor,
                    textShadow:"0 2px 16px rgba(0,0,0,0.95)",textAlign:"center",
                    lineHeight:1.2,letterSpacing:"0.01em",
                    background:"rgba(0,0,0,0.35)",borderRadius:8,padding:"4px 12px",
                    backdropFilter:"blur(4px)"}}>
                    {thumbCaption}
                  </span>
                )}
              </div>

              {/* PRO badge */}
              <div style={{position:"absolute",top:8,right:8,padding:"2px 7px",borderRadius:6,
                background:"linear-gradient(90deg,#ff6b00,#ffc400)",fontSize:8,fontWeight:900,color:"#000"}}>
                PRO
              </div>
            </div>

            {/* ── STYLE PRESETS ── */}
            <div>
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎨 USLUB</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"gradient",l:"Gradient"},{v:"solid",l:"Qattiq"},{v:"neon",l:"Neon"},{v:"cinematic",l:"Kino"},{v:"minimal",l:"Minimal"},{v:"bold",l:"Bold"},{v:"blur",l:"Loyqa"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setThumbStyle(v)}
                    style={{padding:"7px 12px",borderRadius:9,fontSize:10,fontWeight:700,
                      background:thumbStyle===v?"rgba(255,196,0,0.15)":"rgba(255,255,255,0.04)",
                      color:thumbStyle===v?T.gold:T.txtSub,
                      border:`1px solid ${thumbStyle===v?T.gold+"55":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* ── TEXT ── */}
            <div>
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:6}}>📝 MUQOVA MATNI</div>
              <input value={thumbCaption} onChange={e=>setThumbCaption(e.target.value)} maxLength={60}
                placeholder="Ajoyib sarlavha yozing…"
                style={{width:"100%",padding:"10px 12px",borderRadius:10,background:"rgba(255,196,0,0.07)",
                  border:"1px solid rgba(255,196,0,0.25)",color:"white",fontSize:12,outline:"none"}}/>
              {/* Text size & color & position */}
              <div className="flex gap-2 mt-2" style={{alignItems:"center"}}>
                <span style={{fontSize:8,color:"rgba(255,255,255,0.35)",minWidth:30}}>Hajm</span>
                <input type="range" min={10} max={28} value={thumbTextSize} onChange={e=>setThumbTextSize(+e.target.value)}
                  style={{flex:1,accentColor:T.gold}}/>
                <span style={{fontSize:9,color:T.gold,fontWeight:700,minWidth:24}}>{thumbTextSize}px</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap" style={{alignItems:"center"}}>
                <span style={{fontSize:8,color:"rgba(255,255,255,0.35)",minWidth:30}}>Rang</span>
                {["#ffffff","#ffc400","#ff3500","#00e5ff","#00ff77","#ff2d55","#a855f7"].map(c=>(
                  <button key={c} onClick={()=>setThumbTextColor(c)}
                    style={{width:22,height:22,borderRadius:"50%",background:c,flexShrink:0,
                      border:`2px solid ${thumbTextColor===c?"white":"transparent"}`}}/>
                ))}
                <input type="color" value={thumbTextColor} onChange={e=>setThumbTextColor(e.target.value)}
                  style={{width:22,height:22,borderRadius:"50%",border:"none",padding:0,background:"transparent",cursor:"pointer"}}/>
              </div>
              <div className="flex gap-2 mt-2">
                {([["top","⬆️ Yuqori"],["center","⬛ Markaz"],["bottom","⬇️ Pastki"]] as const).map(([v,l])=>(
                  <button key={v} onClick={()=>setThumbTextPos(v)}
                    style={{flex:1,padding:"6px 4px",borderRadius:8,fontSize:9,fontWeight:700,
                      background:thumbTextPos===v?"rgba(255,196,0,0.15)":"rgba(255,255,255,0.04)",
                      color:thumbTextPos===v?T.gold:T.txtSub,
                      border:`1px solid ${thumbTextPos===v?T.gold+"44":"rgba(255,255,255,0.06)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* ── BACKGROUND COLOR ── */}
            {thumbMediaType==="none" && (
              <div>
                <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:6}}>🎨 FON RANGI</div>
                <div className="flex gap-2 flex-wrap">
                  {["#000022","#0a0018","#ff3500","#7700ff","#00e5ff","#ff6b00","#00ff77","#111","#220033","#002233","#001a0d","#1a0000"].map(c=>(
                    <button key={c} onClick={()=>setThumbBg(c)}
                      style={{width:30,height:30,borderRadius:8,background:c,flexShrink:0,
                        border:`2px solid ${thumbBg===c?T.gold:"rgba(255,255,255,0.12)"}`,cursor:"pointer"}}/>
                  ))}
                  <input type="color" value={thumbBg} onChange={e=>setThumbBg(e.target.value)}
                    style={{width:30,height:30,borderRadius:8,cursor:"pointer",border:"none",padding:0,background:"transparent"}}/>
                </div>
              </div>
            )}

            {/* ── EMOJI PICKER (60+) ── */}
            <div>
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>✨ EMOJI TANLASH</div>
              {[
                {label:"Trend",list:["🔥","⚡","💥","🚀","💫","✨","🌟","⭐","🎯","💯"]},
                {label:"Mukofot",list:["🏆","👑","🥇","🥈","🥉","🎖","🏅","💎","💰","🎁"]},
                {label:"Media",list:["🎬","🎵","🎸","🎹","🎤","🎧","📡","📸","🎥","🎞"]},
                {label:"Sport",list:["⚽","🏀","🎾","🏈","🤺","🥊","🏄","🤸","⛷","🏆"]},
                {label:"Tabiyt",list:["🌊","🌈","🌸","🌺","🍀","🌙","☀️","❄️","🌪","🦋"]},
                {label:"Hayvon",list:["🦁","🐉","🦅","🐺","🐯","🦊","🦄","🐬","🦈","🦉"]},
                {label:"His",list:["❤️","🤩","😎","🥳","🤯","😍","🥰","😤","🤑","😈"]},
                {label:"Texno",list:["🤖","👾","🕹","💻","📱","🛸","🔮","⚙️","🔬","🧬"]},
              ].map(({label,list})=>(
                <div key={label} style={{marginBottom:8}}>
                  <div style={{fontSize:7,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:"0.1em"}}>{label.toUpperCase()}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {list.map(e=>(
                      <motion.button key={e} whileTap={{scale:0.85}} onClick={()=>setThumbEmoji(e)}
                        style={{fontSize:22,width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",
                          justifyContent:"center",
                          background:thumbEmoji===e?"rgba(255,196,0,0.2)":"rgba(255,255,255,0.04)",
                          border:`1.5px solid ${thumbEmoji===e?T.gold:"rgba(255,255,255,0.06)"}`,
                          boxShadow:thumbEmoji===e?`0 0 10px ${T.gold}44`:"none",
                          transition:"all 0.15s"}}>
                        {e}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EXPORT SETTINGS ── */}
        {activeTab==="export" && (
          <div className="flex flex-col gap-4">
            <div style={{padding:"12px",borderRadius:12,background:"linear-gradient(135deg,rgba(0,229,255,0.06),rgba(119,0,255,0.06))",border:"1px solid rgba(0,229,255,0.12)"}}>
              <div style={{fontSize:11,fontWeight:700,color:T.cyan,marginBottom:4}}>📦 Eksport Sozlamalari</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Video formati, sifati va maxsus parametrlarni sozlang</div>
            </div>
            {/* Format */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>📹 FORMAT</div>
              <div className="flex gap-2">
                {["mp4","mov","avi","webm","mkv"].map(f=>(
                  <button key={f} onClick={()=>setOutFormat(f)}
                    style={{flex:1,padding:"10px 4px",borderRadius:10,fontSize:11,fontWeight:800,
                      background:outFormat===f?T.gCyan:"rgba(255,255,255,0.04)",
                      color:outFormat===f?"#000":T.txtSub,
                      border:`1px solid ${outFormat===f?T.cyan:"rgba(255,255,255,0.08)"}`}}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {/* Resolution */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>📺 O'LCHAM</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"720p",l:"720p HD"},{v:"1080p",l:"1080p FHD"},{v:"4K",l:"4K UHD"},{v:"8K",l:"8K Ultra"},{v:"480p",l:"480p SD"},{v:"360p",l:"360p"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setExportQ(v==="8K"||v==="480p"||v==="360p"?"720p":v as "720p"|"1080p"|"4K")}
                    style={{padding:"8px 14px",borderRadius:9,fontSize:10,fontWeight:700,
                      background:exportQ===v?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
                      color:exportQ===v?T.cyan:T.txtSub,
                      border:`1px solid ${exportQ===v?T.cyan+"55":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* FPS */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎞 FPS (Kadr/Soniya)</div>
              <div className="flex gap-2">
                {["24","30","60","120","240"].map(f=>(
                  <button key={f} onClick={()=>setOutFps(f)}
                    style={{flex:1,padding:"10px 4px",borderRadius:10,fontSize:11,fontWeight:800,
                      background:outFps===f?T.gViolet:"rgba(255,255,255,0.04)",
                      color:outFps===f?"white":T.txtSub,
                      border:`1px solid ${outFps===f?T.violet:"rgba(255,255,255,0.08)"}`}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {/* Bitrate */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em"}}>⚡ BITREYT ({outBitrate} Mbps)</span>
                <span style={{fontSize:10,color:T.violet,fontWeight:700}}>{+outBitrate < 6?"Tejamkor":+outBitrate<12?"Optimal":"Ultra"}</span>
              </div>
              <input type="range" min={1} max={50} value={+outBitrate} onChange={e=>setOutBitrate(e.target.value)} style={{width:"100%",accentColor:T.cyan}}/>
            </div>
            {/* Special options */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>⚙️ MAXSUS PARAMETRLAR</div>
              <div className="flex flex-col gap-2">
                {[{v:stabilize,s:setStabilize,l:"📷 Video Stabilizator"},{v:autoColor,s:setAutoColor,l:"🎨 Avto Rang Korreksiya"},{v:colorLimiter,s:setColorLimiter,l:"🎯 Broadcast Color Limiter"},{v:watermark,s:setWatermark,l:"💧 OlchaAI Suv Belgisi"}].map(({v,s,l})=>(
                  <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{l}</span>
                    <button onClick={()=>s((p:boolean)=>!p)} style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:v?T.cyan:"rgba(255,255,255,0.12)",justifyContent:v?"flex-end":"flex-start"}}>
                      <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                    </button>
                  </div>
                ))}
                {watermark && (
                  <div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:6}}>Suv belgisi pozitsiyasi</div>
                    <div className="flex gap-2">
                      {[{v:"tl",l:"⬆️L"},{v:"tr",l:"⬆️R"},{v:"bl",l:"⬇️L"},{v:"br",l:"⬇️R"},{v:"center",l:"⏺"}].map(({v,l})=>(
                        <button key={v} onClick={()=>setWatermarkPos(v)}
                          style={{flex:1,padding:"8px",borderRadius:8,fontSize:10,fontWeight:700,
                            background:watermarkPos===v?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
                            color:watermarkPos===v?T.cyan:T.txtSub,border:`1px solid ${watermarkPos===v?T.cyan+"55":"rgba(255,255,255,0.07)"}`}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Tone mapping */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🌈 TON XARITASI</div>
              <div className="flex gap-2">
                {["sdr","hdr","hdr10","hlg","pq"].map(t=>(
                  <button key={t} onClick={()=>setToneMap(t)}
                    style={{flex:1,padding:"9px 4px",borderRadius:9,fontSize:9,fontWeight:800,textTransform:"uppercase",
                      background:toneMap===t?T.gAurora:"rgba(255,255,255,0.04)",
                      color:toneMap===t?"#000":T.txtSub,border:`1px solid ${toneMap===t?T.aurora:"rgba(255,255,255,0.07)"}`}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AR FILTERS ── */}
        {activeTab==="ar" && (
          <div className="flex flex-col gap-4">
            <div>
              <div style={{fontSize:9,color:T.aurora,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎭 AR YUZ FILTRLARI</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"none",e:"❌",l:"Off"},{v:"glow",e:"✨",l:"Glow"},{v:"blur",e:"🌫",l:"Blur Bg"},{v:"glasses",e:"🕶",l:"Ko'zoynak"},{v:"crown",e:"👑",l:"Toj"},{v:"cat",e:"🐱",l:"Mushuk"},{v:"dog",e:"🐶",l:"It"},{v:"heart",e:"💕",l:"Yurak"},{v:"fire",e:"🔥",l:"Olov"},{v:"holo",e:"🔮",l:"Holo"},{v:"matrix",e:"💊",l:"Matrix"},{v:"cyber",e:"🤖",l:"Cyber"}].map(({v,e,l})=>(
                  <button key={v} onClick={()=>setArFilter(v)}
                    style={{padding:"8px 10px",borderRadius:10,fontSize:10,fontWeight:700,
                      background:arFilter===v?"rgba(0,255,238,0.15)":"rgba(255,255,255,0.04)",
                      color:arFilter===v?T.aurora:T.txtSub,
                      border:`1px solid ${arFilter===v?T.aurora+"55":"rgba(255,255,255,0.07)"}`,
                      display:"flex",alignItems:"center",gap:4}}>
                    <span>{e}</span>{l}
                  </button>
                ))}
              </div>
            </div>
            {/* LUT presets */}
            <div>
              <div style={{fontSize:9,color:T.aurora,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎨 LUT PRESETLARI</div>
              <div className="flex flex-wrap gap-2">
                {[{v:"none",l:"Asl"},{v:"cinema",l:"Kino"},{v:"teal",l:"Teal & Orange"},{v:"moody",l:"Moody"},{v:"faded",l:"Faded"},{v:"warm",l:"Issiq"},{v:"arctic",l:"Arktik"},{v:"sahara",l:"Sahro"},{v:"neon",l:"Neon Tokyo"},{v:"vintage",l:"Vintage"},{v:"matte",l:"Matte"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setLut(v)}
                    style={{padding:"7px 12px",borderRadius:9,fontSize:10,fontWeight:700,
                      background:lut===v?"rgba(0,255,238,0.12)":"rgba(255,255,255,0.04)",
                      color:lut===v?T.aurora:T.txtSub,
                      border:`1px solid ${lut===v?T.aurora+"44":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Video effects */}
            <div>
              <div style={{fontSize:9,color:T.aurora,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🎬 VIDEO EFFEKTLAR</div>
              <div className="flex flex-wrap gap-2">
                {[{v:reverseClip,s:setReverseClip,l:"⏪ Teskari"},{v:boomerang,s:setBoomerang,l:"🔄 Boomerang"},{v:freezeFrame,s:setFreezeFrame,l:"⏸ Muzlatish"},{v:blurBg,s:setBlurBg,l:"🌫 Fon Loyqa"},{v:portrait,s:setPortrait,l:"🖼 Portrait Mode"},{v:stabilize,s:setStabilize,l:"📷 Stabilize"}].map(({v,s,l})=>(
                  <button key={l} onClick={()=>s((p:boolean)=>!p)}
                    style={{padding:"8px 12px",borderRadius:10,fontSize:10,fontWeight:700,
                      background:v?"rgba(0,255,238,0.15)":"rgba(255,255,255,0.04)",
                      color:v?T.aurora:T.txtSub,
                      border:`1px solid ${v?T.aurora+"55":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Crop mode */}
            <div>
              <div style={{fontSize:9,color:T.aurora,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>✂️ KESISH NISBATI</div>
              <div className="flex gap-2 flex-wrap">
                {["16:9","9:16","1:1","4:3","3:4","21:9","4:5"].map(r=>(
                  <button key={r} onClick={()=>setCropMode(r)}
                    style={{padding:"8px 12px",borderRadius:9,fontSize:10,fontWeight:800,
                      background:cropMode===r?T.gAurora:"rgba(255,255,255,0.04)",
                      color:cropMode===r?"#000":T.txtSub,border:`1px solid ${cropMode===r?T.aurora:"rgba(255,255,255,0.07)"}`}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* Split screen */}
            <div>
              <div style={{fontSize:9,color:T.aurora,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>📺 SPLIT SCREEN</div>
              <div className="flex gap-2">
                {[{v:"off" as const,l:"❌ Off"},{v:"v" as const,l:"↕️ Vertikal"},{v:"h" as const,l:"↔️ Gorizontal"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setSplitScreen(v)}
                    style={{flex:1,padding:"10px",borderRadius:10,fontSize:10,fontWeight:700,
                      background:splitScreen===v?"rgba(0,255,238,0.12)":"rgba(255,255,255,0.04)",
                      color:splitScreen===v?T.aurora:T.txtSub,border:`1px solid ${splitScreen===v?T.aurora+"44":"rgba(255,255,255,0.07)"}`}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAPTERS ── */}
        {activeTab==="chapters" && (
          <div className="flex flex-col gap-4">
            <div style={{padding:"10px 12px",borderRadius:12,background:"rgba(255,196,0,0.06)",border:"1px solid rgba(255,196,0,0.2)"}}>
              <div style={{fontSize:11,fontWeight:700,color:T.gold,marginBottom:2}}>📑 Bo'limlar</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Videoni bo'limlarga bo'ling — tomoshabinlar kerakli joyga sakrashsin</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={chapTs} onChange={e=>setChapTs(e.target.value)} placeholder="0:00"
                style={{width:52,padding:"9px 8px",borderRadius:9,background:"rgba(255,255,255,0.05)",
                  border:"1px solid rgba(255,255,255,0.1)",color:"white",fontSize:11,outline:"none",textAlign:"center"}}/>
              <input value={chapLabel} onChange={e=>setChapLabel(e.target.value)} placeholder="Bo'lim nomi…"
                style={{flex:1,padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.05)",
                  border:"1px solid rgba(255,255,255,0.1)",color:"white",fontSize:11,outline:"none"}}/>
              <button onClick={()=>{if(chapTs&&chapLabel){setChaptersS(p=>[...p,{ts:chapTs,label:chapLabel}]);setChapTs("");setChapLabel("");}}}
                style={{padding:"9px 14px",borderRadius:9,background:T.gViolet,color:"white",fontSize:13,fontWeight:900}}>+</button>
            </div>
            <div className="flex flex-col gap-2">
              {chaptersS.length===0 && (
                <div style={{padding:"20px",textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:11}}>
                  Hali bo'lim qo'shilmagan
                </div>
              )}
              {chaptersS.map((ch,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,
                  background:"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.15)"}}>
                  <span style={{fontSize:10,fontWeight:800,color:T.violet,fontFamily:"monospace",minWidth:36}}>{ch.ts}</span>
                  <span style={{flex:1,fontSize:12,color:"rgba(255,255,255,0.75)"}}>{ch.label}</span>
                  <button onClick={()=>setChaptersS(p=>p.filter((_,j)=>j!==i))} style={{color:"#ff2d55",fontSize:16}}>×</button>
                </div>
              ))}
            </div>
            {/* Timeline visual */}
            {chaptersS.length>0 && (
              <div style={{position:"relative",height:24,background:"rgba(255,255,255,0.04)",borderRadius:6,overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,${T.violet}55,${T.nova}22)`,borderRadius:6}}/>
                {chaptersS.map((ch,i)=>(
                  <div key={i} style={{position:"absolute",top:0,bottom:0,left:`${i/(chaptersS.length)*100}%`,width:2,background:T.gold}}/>
                ))}
              </div>
            )}
            {/* Pin comment + First comment */}
            <div className="flex flex-col gap-2 mt-2">
              <div style={{fontSize:9,color:T.gold,fontWeight:700,letterSpacing:"0.1em",marginBottom:4}}>📌 IZOHLAR</div>
              <input value={pinComment} onChange={e=>setPinComment(e.target.value)} placeholder="📌 Pinlangan izoh (video havolasi, resurslar…)"
                style={{width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,196,0,0.06)",
                  border:"1px solid rgba(255,196,0,0.2)",color:"white",fontSize:11,outline:"none"}}/>
              <input value={firstComment} onChange={e=>setFirstComment(e.target.value)} placeholder="💬 Birinchi izoh (video chiqishi bilan avtomatik)"
                style={{width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",
                  border:"1px solid rgba(255,255,255,0.08)",color:"white",fontSize:11,outline:"none"}}/>
            </div>
          </div>
        )}

        {/* ── COLLAB EDITOR ── */}
        {activeTab==="collab" && (
          <div className="flex flex-col gap-4">
            <div style={{padding:"12px",borderRadius:12,background:"linear-gradient(135deg,rgba(0,229,255,0.07),rgba(168,85,247,0.05))",border:"1px solid rgba(0,229,255,0.15)"}}>
              <div style={{fontSize:11,fontWeight:700,color:T.cyan,marginBottom:2}}>👥 Birgalikda Tahrirlash</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Do'stlaringizni studioga taklif qiling — real vaqtda birga tahrirlang</div>
            </div>
            {/* Invite */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>✉️ TAKLIF YUBORISH</div>
              <div style={{display:"flex",gap:8}}>
                <input value={collabEmail} onChange={e=>setCollabEmail(e.target.value)} placeholder="@foydalanuvchi"
                  onKeyDown={e=>{if(e.key==="Enter"&&collabEmail.trim())inviteCollabMut.mutate({data:{inviteeHandle:collabEmail.trim()}});}}
                  style={{flex:1,padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(0,229,255,0.2)",color:"white",fontSize:11,outline:"none"}}/>
                <button disabled={!collabEmail.trim()||inviteCollabMut.isPending}
                  onClick={()=>{if(collabEmail.trim())inviteCollabMut.mutate({data:{inviteeHandle:collabEmail.trim()}});}}
                  style={{padding:"10px 16px",borderRadius:10,background:T.gCyan,color:"#000",fontSize:12,fontWeight:900,opacity:(!collabEmail.trim()||inviteCollabMut.isPending)?0.5:1}}>
                  {inviteCollabMut.isPending?"…":"Taklif"}
                </button>
              </div>
              {collabError && <div style={{marginTop:6,fontSize:10,color:"#ff5577"}}>{collabError}</div>}
            </div>
            {/* Active collaborators */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>👤 HAMMUHARRILAR</div>
              {collabList.length===0 ? (
                <div style={{padding:"20px",textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:11}}>Hali hammuharrir yo'q</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {collabList.map((c)=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"rgba(0,229,255,0.06)",border:"1px solid rgba(0,229,255,0.15)"}}>
                      <div style={{width:32,height:32,borderRadius:99,background:`linear-gradient(135deg,${T.cyan},${T.violet})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"white"}}>{(c.invitee?.displayName??c.inviteeHandle)[0]?.toUpperCase()}</div>
                      <span style={{flex:1,fontSize:11,color:"rgba(255,255,255,0.7)"}}>{c.invitee?.displayName??`@${c.inviteeHandle}`}</span>
                      <span style={{fontSize:9,padding:"2px 8px",borderRadius:99,background:c.status==="accepted"?"rgba(0,255,136,0.12)":"rgba(255,196,0,0.12)",color:c.status==="accepted"?"#00ff88":"#ffc400",fontWeight:700}}>
                        {c.status==="accepted"?"Qabul qilingan":c.status==="declined"?"Rad etilgan":"Kutilmoqda"}
                      </span>
                      <button onClick={()=>removeCollabMut.mutate({id:c.id})} disabled={removeCollabMut.isPending} style={{color:"#ff2d55",fontSize:16}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Permissions */}
            <div>
              <div style={{fontSize:9,color:T.cyan,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>🔒 RUXSATLAR</div>
              <div className="flex flex-col gap-2">
                {[{l:"✏️ Tahrirlash ruxsati"},{l:"👁️ Ko'rish (faqat)"},{l:"💬 Izoh qoldirish"},{l:"📤 Export qilish"},{l:"🗑 O'chirish"},{l:"⚙️ Sozlamalarni o'zgartirish"}].map(({l},i)=>(
                  <div key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{l}</span>
                    <button style={{width:34,height:20,borderRadius:99,padding:"0 2px",display:"flex",alignItems:"center",background:i<3?T.cyan:"rgba(255,255,255,0.12)",justifyContent:i<3?"flex-end":"flex-start"}}>
                      <div style={{width:16,height:16,borderRadius:99,background:"white"}}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Version history — real implementation */}
            <VersionHistoryPanel reelId={null} currentCaption={caption} />
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
/* Floating FAB — circular, swipe-to-edge collapsible     */
/* ─────────────────────────────────────────────────────── */
const ORB     = 36;  /* Unified orb size — matches 36×36 bottom chrome */
const FAB_BOT = "calc(env(safe-area-inset-bottom, 0px) + 14px)";

function FloatingFAB() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [open,  setOpen]  = useState(false);
  const [modal, setModal] = useState<"upload"|"short"|"challenge"|"cipcat"|null>(null);
  const [goingLive, setGoingLive] = useState(false);
  const { edged, dock } = useDockedState("right");
  const startLive = useStartLive();

  const handleGoLive = async () => {
    if (!user || goingLive) return;
    setGoingLive(true);
    try {
      const title = `${user.displayName || user.username} jonli efiri`;
      const stream = await startLive.mutateAsync({ data: { title } });
      navigate(`/live/${stream.id}`);
    } catch {
      /* start-live failed, stay put */
    } finally {
      setGoingLive(false);
    }
  };

  const openModal = (id: "upload"|"live"|"short"|"challenge"|"cipcat") => {
    setOpen(false);
    if (id === "live") { void handleGoLive(); return; }
    setTimeout(() => setModal(id), 150);
  };

  const items = [
    { Icon: Upload,    label: t("otube.fab_upload"),    col: T.cyan,    id: "upload"    as const },
    { Icon: Radio,     label: t("otube.fab_live"),      col: "#ff2d55", id: "live"      as const },
    { Icon: Zap,       label: t("otube.fab_short"),     col: T.orange,  id: "short"     as const },
    { Icon: Swords,    label: t("otube.fab_challenge"), col: "#00ff88", id: "challenge" as const },
    { Icon: Film,      label: t("otube.fab_studio"),    col: T.gold,    id: "cipcat"    as const },
  ];

  const onFabDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 36) { dock(); setOpen(false); }
  };

  /* When docked, the shared DockEdgeTab in Layout renders the glass strip */
  if (edged) return (
    <AnimatePresence>
      {modal==="upload"    && <UploadModal     onClose={()=>setModal(null)}/>}
      {modal==="short"     && <ShortModal      onClose={()=>setModal(null)}/>}
      {modal==="challenge" && <ChallengeModal  onClose={()=>setModal(null)}/>}
      {modal==="cipcat"    && <CipCatModal     onClose={()=>setModal(null)}/>}
    </AnimatePresence>
  );

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        style={{ right: 16, bottom: FAB_BOT, position:"fixed", zIndex:50 }}
        onDragEnd={onFabDragEnd as never}
        className="flex flex-col items-end gap-3 pointer-events-none"
      >
        {/* Expanded pill items */}
        <AnimatePresence>
          {open && items.map((item, i) => (
            <motion.button key={i}
              initial={{opacity:0,x:20,scale:0.8}} animate={{opacity:1,x:0,scale:1}}
              exit={{opacity:0,x:20,scale:0.8}}
              transition={{delay:i*0.04,type:"spring",damping:22,stiffness:300}}
              onClick={()=>openModal(item.id)}
              className="flex items-center gap-2 pointer-events-auto"
              style={{padding:"7px 14px 7px 10px",borderRadius:99,
                background:"rgba(4,1,16,0.9)",backdropFilter:"blur(24px)",
                boxShadow:`0 0 0 1px ${item.col}44, 0 6px 20px rgba(0,0,0,0.55)`}}>
              <div style={{width:26,height:26,borderRadius:"50%",
                background:`${item.col}22`,display:"flex",alignItems:"center",
                justifyContent:"center",boxShadow:`0 0 0 1px ${item.col}55`}}>
                <item.Icon style={{width:11,height:11,color:item.col}}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.88)"}}>
                {item.label}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* ── Main orb trigger (same size & glow as FloatingAvatar) ── */}
        <motion.button
          className="pointer-events-auto"
          whileTap={{scale:0.88}}
          onClick={()=>setOpen(o=>!o)}
          style={{
            position:"relative", width:ORB, height:ORB, borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}
        >
          {/* Pulsing glow rings */}
          {[0,1,2].map(i=>(
            <motion.div key={i}
              style={{
                position:"absolute", inset:-(i*6+4), borderRadius:"50%", pointerEvents:"none",
                border:`${1.2-i*0.25}px solid rgba(180,50,245,${0.42-i*0.1})`,
                boxShadow:`0 0 ${8+i*8}px rgba(155,30,220,${0.28-i*0.07})`,
              }}
              animate={{scale:[1,1.05+i*0.025,1],opacity:[0.5-i*0.1,0.88-i*0.16,0.5-i*0.1]}}
              transition={{duration:2.3+i*0.6,repeat:Infinity,ease:"easeInOut",delay:i*0.45+0.5}}
            />
          ))}
          {/* Glass body */}
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            background:open
              ?"rgba(255,255,255,0.07)"
              :"radial-gradient(circle at 38% 32%, rgba(180,50,245,0.22) 0%, rgba(80,20,160,0.12) 100%)",
            border:`1.5px solid ${open?"rgba(255,255,255,0.15)":"rgba(180,50,245,0.55)"}`,
            boxShadow:open?"none":"inset 0 2px 12px rgba(0,0,0,0.5), 0 0 20px rgba(155,30,220,0.4)",
            backdropFilter:"blur(18px)",
          }}/>
          {/* Glass shine */}
          <div style={{
            position:"absolute", top:6, left:7,
            width:"36%", height:"32%",
            borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
            background:"radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.5) 0%, transparent 70%)",
            pointerEvents:"none", zIndex:10,
          }}/>
          {/* Icon */}
          <span style={{
            fontSize:open?18:14, fontWeight:900, letterSpacing:"0.08em",
            color:open?"rgba(255,255,255,0.45)":"rgba(220,120,255,0.92)",
            lineHeight:1, position:"relative", zIndex:5,
          }}>
            {open?"×":"···"}
          </span>
        </motion.button>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modal==="upload"    && <UploadModal     onClose={()=>setModal(null)}/>}
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
                ? <img loading="lazy" decoding="async" src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                : v.videoUrl
                ? <video src={v.videoUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
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
        ? <img loading="lazy" decoding="async" src={video.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
        : video.videoUrl
        ? <video src={video.videoUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
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
/* COVERFLOW CAROUSEL — 3D card stack, center protrudes    */
/* ─────────────────────────────────────────────────────── */
function CoverflowRow({ videos, onPlay }: { videos: Reel[]; onPlay:(v:Reel)=>void }) {
  const [active, setActive] = useState(Math.min(2, Math.floor(videos.length / 2)));
  const dragStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!videos.length) return null;

  const prev = () => setActive(a => Math.max(0, a - 1));
  const next = () => setActive(a => Math.min(videos.length - 1, a + 1));

  /* distance-based 3D values */
  const cardStyle = (idx: number) => {
    const dist = idx - active;
    const abs  = Math.abs(dist);
    if (abs > 2) return null;
    const rotateY   = dist * -30;
    const tX        = dist * 115;
    const tZ        = abs === 0 ? 52 : abs === 1 ? -14 : -44;
    const scale     = abs === 0 ? 1.0 : abs === 1 ? 0.84 : 0.68;
    const opacity   = abs === 0 ? 1   : abs === 1 ? 0.82 : 0.52;
    const zIndex    = 20 - abs;
    const brightness= abs === 0 ? 1   : abs === 1 ? 0.80 : 0.55;
    return { rotateY, tX, tZ, scale, opacity, zIndex, brightness };
  };

  const ACCENT = [T.cyan, T.orange, T.violet, "#00ff88", "#ff2d55", T.gold];

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4 -mx-3 px-3">
        <motion.div
          animate={{opacity:[1,0.4,1],scale:[1,1.15,1]}}
          transition={{duration:1.6,repeat:Infinity}}
          style={{width:8,height:8,borderRadius:2,flexShrink:0,
            background:T.aurora,boxShadow:`0 0 10px ${T.aurora}`}}/>
        <span style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",
          letterSpacing:"0.22em",fontFamily:"monospace"}}>COVERFLOW · 3D</span>
        <div style={{flex:1,height:1,
          background:`linear-gradient(90deg,${T.aurora}55,transparent)`}}/>
        <span style={{fontSize:8,color:"rgba(255,255,255,0.22)",fontFamily:"monospace"}}>
          {active + 1}/{videos.length}
        </span>
      </div>

      {/* 3D stage */}
      <div className="relative" style={{height:220,perspective:1100,perspectiveOrigin:"50% 50%"}}>
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{transformStyle:"preserve-3d"}}
          onPointerDown={e=>{dragStartX.current=e.clientX;}}
          onPointerUp={e=>{
            const dx=dragStartX.current-e.clientX;
            if(Math.abs(dx)>38){dx>0?next():prev();}
          }}
        >
          {videos.map((v,idx)=>{
            const s=cardStyle(idx);
            if(!s) return null;
            const {rotateY,tX,tZ,scale,opacity,zIndex,brightness}=s;
            const isCenter=idx===active;
            const accent=ACCENT[idx%ACCENT.length];
            return (
              <motion.div
                key={v.id}
                animate={{
                  rotateY,
                  x:tX,
                  z:tZ,
                  scale,
                  opacity,
                  filter:`brightness(${brightness})`,
                }}
                transition={{type:"spring",damping:28,stiffness:280,mass:0.9}}
                style={{
                  position:"absolute",
                  left:"50%",top:0,
                  marginLeft:-88,
                  width:176,
                  height:210,
                  zIndex,
                  borderRadius:18,
                  overflow:"hidden",
                  cursor:isCenter?"pointer":"pointer",
                  boxShadow: isCenter
                    ? `0 12px 48px rgba(0,0,0,0.85), 0 0 0 1px ${accent}44, 0 0 40px ${accent}28`
                    : `0 6px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)`,
                }}
                onClick={()=>isCenter?onPlay(v):setActive(idx)}
                whileTap={isCenter?{scale:scale*0.96}:undefined}
              >
                {/* Thumbnail / video */}
                {v.thumbnailUrl
                  ? <img loading="lazy" decoding="async" src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                  : v.videoUrl
                  ? <video src={v.videoUrl} autoPlay muted playsInline loop
                      className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
                  : <div className="w-full h-full"
                      style={{background:`linear-gradient(135deg,${accent}28,#050010)`}}/>}

                {/* Gradient overlay */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.18) 55%,transparent 100%)"}}/>

                {/* Center card: play ring glow */}
                {isCenter && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{opacity:[0.4,0.7,0.4]}}
                    transition={{duration:2.2,repeat:Infinity}}
                    style={{borderRadius:18,
                      boxShadow:`inset 0 0 0 1.5px ${accent}`,
                      background:"transparent"}}/>
                )}

                {/* Center card: play button */}
                {isCenter && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                      animate={{scale:[1,1.08,1],opacity:[0.85,1,0.85]}}
                      transition={{duration:1.8,repeat:Infinity}}
                      style={{
                        width:46,height:46,borderRadius:"50%",
                        background:`radial-gradient(circle,${accent}44 0%,rgba(0,0,0,0.55) 100%)`,
                        backdropFilter:"blur(12px)",
                        border:`1.5px solid ${accent}88`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        boxShadow:`0 0 24px ${accent}44`,
                      }}>
                      <Play style={{width:18,height:18,color:"white",fill:"white",marginLeft:2}}/>
                    </motion.div>
                  </div>
                )}


                {/* Bottom info */}
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <p style={{fontSize:isCenter?11:9,fontWeight:700,color:"white",
                    lineHeight:1.3,letterSpacing:"0.01em"}}
                    className="line-clamp-2">{v.caption||"Video"}</p>
                  {isCenter && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Eye style={{width:9,height:9,color:T.txtSub}}/>
                        <span style={{fontSize:8,color:T.txtSub,fontFamily:"monospace"}}>
                          {v.viewsCount??0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart style={{width:9,height:9,color:"#ff4d6d"}}/>
                        <span style={{fontSize:8,color:T.txtSub,fontFamily:"monospace"}}>
                          {v.likesCount??0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 inset-x-0 h-[2px] pointer-events-none"
                  style={{background:isCenter?accent:"transparent",opacity:0.7}}/>
              </motion.div>
            );
          })}
        </div>

        {/* ← Prev arrow */}
        <motion.button
          whileTap={{scale:0.82}}
          onClick={prev}
          disabled={active===0}
          className="absolute left-1 top-1/2 -translate-y-1/2 disabled:opacity-20"
          style={{
            zIndex:40,width:32,height:32,borderRadius:"50%",
            background:"rgba(0,0,8,0.75)",backdropFilter:"blur(16px)",
            border:"1px solid rgba(255,255,255,0.12)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 2px 12px rgba(0,0,0,0.6)",
          }}>
          <ChevronLeft style={{width:15,height:15,color:"rgba(255,255,255,0.7)"}}/>
        </motion.button>

        {/* → Next arrow */}
        <motion.button
          whileTap={{scale:0.82}}
          onClick={next}
          disabled={active===videos.length-1}
          className="absolute right-1 top-1/2 -translate-y-1/2 disabled:opacity-20"
          style={{
            zIndex:40,width:32,height:32,borderRadius:"50%",
            background:"rgba(0,0,8,0.75)",backdropFilter:"blur(16px)",
            border:"1px solid rgba(255,255,255,0.12)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 2px 12px rgba(0,0,0,0.6)",
          }}>
          <ChevronRight style={{width:15,height:15,color:"rgba(255,255,255,0.7)"}}/>
        </motion.button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {videos.slice(0,Math.min(videos.length,10)).map((_,i)=>(
          <motion.button
            key={i}
            onClick={()=>setActive(i)}
            animate={{
              width: i===active ? 18 : 6,
              opacity: i===active ? 1 : 0.28,
              background: i===active ? T.aurora : "rgba(255,255,255,0.4)",
            }}
            transition={{type:"spring",damping:22,stiffness:400}}
            style={{height:4,borderRadius:99,flexShrink:0}}
          />
        ))}
      </div>
    </section>
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

/* ─────────────────────────────────────────────────────── */
/* NotifPanel — slide-in notifications drawer              */
/* ─────────────────────────────────────────────────────── */
function NotifPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useListNotifications();

  useEffect(() => {
    markAllNotificationsRead().then(() => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
    }).catch(() => {});
  }, [qc]);

  const typeIcon = (type: string) => {
    if (type === "like")    return "❤️";
    if (type === "comment") return "💬";
    if (type === "follow")  return "👤";
    if (type === "gift")    return "🎁";
    if (type === "system")  return "📢";
    return "🔔";
  };

  const timeAgoN = (d: string | Date) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60)  return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}k`;
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type:"spring", damping:28, stiffness:300 }}
        onClick={e => e.stopPropagation()}
        style={{
          position:"absolute", top:0, right:0, bottom:0,
          width: Math.min(340, window.innerWidth - 40),
          background:"linear-gradient(180deg,#0d0020 0%,#060014 100%)",
          borderLeft:"1px solid rgba(255,255,255,0.08)",
          display:"flex", flexDirection:"column",
          boxShadow:"-12px 0 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header — safe area for iOS notch/Dynamic Island */}
        <div style={{
          paddingTop:"calc(env(safe-area-inset-top, 44px) + 12px)",
          paddingLeft:16, paddingRight:16, paddingBottom:12,
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Bell style={{ width:16, height:16, color:T.cyan }}/>
            <span style={{ fontSize:13, fontWeight:800, color:"white", letterSpacing:"0.04em" }}>
              Bildirishnomalar
            </span>
          </div>
          <motion.button whileTap={{ scale:0.8 }} onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.06)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X style={{ width:14, height:14, color:"rgba(255,255,255,0.5)" }}/>
          </motion.button>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"none", padding:"8px 0" }}>
          {isLoading ? (
            <div style={{ padding:32, textAlign:"center" }}>
              <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}
                style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${T.cyan}`, borderTopColor:"transparent", margin:"0 auto" }}/>
            </div>
          ) : notifs.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <Bell style={{ width:32, height:32, color:"rgba(255,255,255,0.15)", margin:"0 auto 10px" }}/>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Hozircha bildirishnoma yo'q</p>
            </div>
          ) : (
            notifs.map((n: Notification) => (
              <motion.div key={n.id}
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                style={{
                  padding:"10px 16px", display:"flex", alignItems:"flex-start", gap:10,
                  borderBottom:"1px solid rgba(255,255,255,0.04)",
                  background: n.isRead ? "transparent" : "rgba(0,229,255,0.04)",
                }}>
                {/* Avatar or emoji */}
                <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                  background:"rgba(255,255,255,0.07)", overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  {n.actorAvatar
                    ? <img loading="lazy" decoding="async" src={n.actorAvatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span>{typeIcon(n.type)}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  {n.actorName && (
                    <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.75)" }}>
                      {n.actorName}{" "}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{n.message}</span>
                  <p style={{ fontSize:9.5, color:"rgba(255,255,255,0.25)", marginTop:3 }}>
                    {timeAgoN(n.createdAt)}
                  </p>
                </div>
                {!n.isRead && (
                  <div style={{ width:7, height:7, borderRadius:"50%", background:T.cyan,
                    boxShadow:`0 0 8px ${T.cyan}`, flexShrink:0, marginTop:6 }}/>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Cyan accent */}
        <div style={{ height:2, background:`linear-gradient(90deg,${T.cyan},${T.violet})` }}/>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────── */
/* MiniPlayer moved to global PipContext — no local component needed */

export default function OTubePage() {
  const { t } = useTranslation();
  const [,navigate]    = useLocation();
  const [signal, setSignal] = useState<SignalId>("all");
  const [query,setQuery]    = useState("");
  const [showSearch,setShowSearch] = useState(false);
  const [selectedIdx,setSelectedIdx] = useState<number|null>(null);
  const [showNotifPanel,setShowNotifPanel] = useState(false);
  const { openPip, setExpandHandler } = usePip();
  const [showSettings,setShowSettings] = useState(false);
  const [settings,setSettings]   = useState<PlayerSettings>(DEF_S);
  const [monetize,setMonetize]   = useState<MonetizationSettings>(DEF_M);
  const [notifDot,setNotifDot]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeSig  = SIGNALS.find(s=>s.id===signal)!;
  const tab        = activeSig.tab;

  const { data:raw=[], isLoading } = useListReels({ limit: 50 });
  /* Real trending — ordered by 24h view velocity on the server */
  const { data:trendingRaw=[] } = useListReels(
    { sort: "trending" as const, limit: 50 },
    { query: { enabled: signal === "fire", queryKey: getListReelsQueryKey({ sort: "trending" as const, limit: 50 }) } },
  );
  /* Real shorts — filtered by type=short on the server */
  const { data:shortsRaw=[] } = useListReels(
    { type: "short" as const, limit: 50 },
    { query: { enabled: tab === "shorts", queryKey: getListReelsQueryKey({ type: "short" as const, limit: 50 }) } },
  );
  const { data:notifList=[] } = useListNotifications();
  useEffect(()=>{ setNotifDot(notifList.some((n:Notification)=>!n.isRead)); },[notifList]);
  const { data:continueWatching=[] } = useGetContinueWatching();

  // ?v= param: shared link → auto-open that video once reels load
  useEffect(()=>{
    if (isLoading || raw.length === 0) return;
    const vId = new URLSearchParams(window.location.search).get("v");
    if (!vId) return;
    const idx = raw.findIndex(r => String(r.id) === vId);
    if (idx >= 0) { setSelectedIdx(idx); window.history.replaceState(null,"","/otube"); }
  },[isLoading, raw]);

  const reels = useMemo(()=>{
    const base = signal === "fire" ? trendingRaw : raw;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(r=>r.caption.toLowerCase().includes(q)||r.author.displayName.toLowerCase().includes(q));
  },[raw, trendingRaw, signal, query]);

  /* derived: the currently playing video + helper to open by object */
  const selected = selectedIdx !== null ? (reels[selectedIdx] ?? null) : null;
  const openVideo = useCallback((v: Reel) => {
    const idx = reels.findIndex(r => r.id === v.id);
    setSelectedIdx(idx >= 0 ? idx : 0);
  }, [reels]);

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
  const shorts   = shortsRaw.length > 0 ? shortsRaw : reels.slice(0,6);
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
        <div className="sticky z-40"
          style={{top:"env(safe-area-inset-top, 0px)",background:"rgba(0,0,8,0.82)",backdropFilter:"blur(32px)",
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
                  <motion.button whileTap={{scale:0.82}} onClick={()=>{setShowNotifPanel(true);setNotifDot(false);}}
                    className="relative"
                    style={{width:34,height:34,borderRadius:10,
                      background: showNotifPanel?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.05)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow: showNotifPanel?`0 0 0 1px ${T.cyan}55`:"none"}}>
                    <Bell style={{width:14,height:14,color: showNotifPanel?T.cyan:"rgba(255,255,255,0.55)"}}/>
                    {notifDot && !showNotifPanel && <motion.div
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
                  <HeroCard video={featured} onPlay={()=>featured&&openVideo(featured)}/>
                </div>
              )}

              {/* ── COVERFLOW 3D — center card protrudes forward ── */}
              {!query && reels.length > 2 && (
                <CoverflowRow videos={reels.slice(0, 10)} onPlay={v=>openVideo(v)}/>
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
                  <BroadcastMatrix reels={reels} onPlay={v=>openVideo(v)}/>
                </section>
              )}

              {!query && (
                <>
                  {/* Continue Watching */}
                  <ContinueRow items={continueWatching} onPlay={v=>openVideo(v)}/>

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
                        {trending.map((v,i)=><TrendRow key={v.id} video={v} onPlay={()=>openVideo(v)} idx={i}/>)}
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
                      <BroadcastMatrix reels={grid} onPlay={v=>openVideo(v)}/>
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
                {shorts.map(v=><ShortsCard key={v.id} video={v} onPlay={()=>openVideo(v)}/>)}
              </div>
              <div className="h-4"/>
              <BroadcastMatrix reels={raw} onPlay={v=>openVideo(v)}/>
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
                  whileTap={{scale:0.97}} onClick={()=>openVideo(v)}
                  className="flex gap-3 cursor-pointer mb-2.5"
                  style={{padding:"10px 12px",borderRadius:14,
                    background:"rgba(255,255,255,0.04)",
                    boxShadow:"0 0 0 1px rgba(255,255,255,0.06)"}}>
                  <div style={{width:80,aspectRatio:"16/9",flexShrink:0,borderRadius:8,
                    position:"relative",overflow:"hidden"}}>
                    {v.thumbnailUrl
                      ? <img loading="lazy" decoding="async" src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                      : v.videoUrl
                      ? <video src={v.videoUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" style={{pointerEvents:"none"}}/>
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

      {createPortal(
        <AnimatePresence>
          {selected && (
            <NexusPlayer key={selected.id}
              video={selected} onClose={()=>{ setSelectedIdx(null); setExpandHandler(null); }} settings={settings}
              hasNext={selectedIdx !== null && selectedIdx < reels.length - 1}
              hasPrev={selectedIdx !== null && selectedIdx > 0}
              onNext={()=>setSelectedIdx(i => i !== null ? Math.min(reels.length-1, i+1) : null)}
              onPrev={()=>setSelectedIdx(i => i !== null ? Math.max(0, i-1) : null)}
              onPip={(time)=>{
                const vid = selected;
                openPip(vid, time);
                setExpandHandler(()=>()=>{ openVideo(vid); });
                setSelectedIdx(null);
              }}/>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {showNotifPanel && (
          <NotifPanel key="notif-panel" onClose={()=>setShowNotifPanel(false)}/>
        )}
      </AnimatePresence>

      <SettingsDrawer open={showSettings} onClose={()=>setShowSettings(false)}
        settings={settings} onSettings={setSettings}
        monetize={monetize} onMonetize={setMonetize}/>

      {/* Floating action button — only when player closed and NOT in full-screen shorts view */}
      {!selected && tab !== "shorts" && <FloatingFAB/>}
    </>
  );
}
