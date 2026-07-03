import {
  useState, useRef, useEffect, useCallback, ElementType,
} from "react";
import { playMessageSound, getFeaturePref } from "@/lib/sounds";
import DrawingCanvas from "@/components/DrawingCanvas";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Send, Search, Plus, MessageCircle, Ghost, Clock, X,
  ChevronLeft, Mic, Camera, Smile, Phone, Video,
  MoreVertical, Reply, Forward, Copy, Trash2, Star, Pin, Check,
  CheckCheck, ChevronDown, Image as ImageIcon, File, 
  MapPin, BarChart3, AtSign, Hash, Bold, Italic,
  StopCircle, Play, Pause, Users, Lock,
  Bell, Palette,
  Clock3, AlignLeft, Heart, ThumbsUp, Pencil,
  Archive, UserPlus, Share2, Flag, Download,
  CheckSquare, Square, Layers, Link, Globe,
  BellOff, BellRing, Zap, PenLine,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListConversations,
  useGetConversationMessages,
  useSendMessage,
  useCreateConversation,
  useListUsers,
  getGetConversationMessagesQueryKey,
  getListConversationsQueryKey,
  type Conversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { useRealtime } from "@/context/RealtimeContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Types ──────────────────────────────────────────────────── */
type MsgType = "text" | "image" | "voice" | "video_note" | "file" | "sticker" | "poll" | "drawing";

interface Reaction { emoji: string; count: number; mine: boolean }
interface ReplyRef { id: string; content: string; sender: string }
interface PollOption { id: number; text: string; votes: number; voted: boolean }

interface LocalMsg {
  id: string;
  senderId: number;
  type: MsgType;
  content?: string;
  mediaUrl?: string;
  duration?: number;
  fileName?: string;
  reactions: Reaction[];
  replyTo?: ReplyRef;
  starred: boolean;
  pinned: boolean;
  deleted: boolean;
  edited: boolean;
  forwarded: boolean;
  status: "sending" | "sent" | "delivered" | "read";
  ts: Date;
  isEphemeral?: boolean;
  emoji?: string;
  pollOptions?: PollOption[];
  pollTitle?: string;
}

/* ── Emoji sets ─────────────────────────────────────────────── */
const EMOJI_CATS: Record<string, string[]> = {
  "😊": ["😊","😂","🥹","😅","😆","🤣","😁","😄","😃","😀","🙂","😉","🥰","😍","🤩","😘","😗","😚","😙","🥲","😇","🤗","🤭","🫢","🫡","🤫","🤔","🤐","😐","😑","😶","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","🥸","🤡","👻","💀","☠️","👽","👾","🤖","🎃","😈","👿","🤠","🥳","🤑","🤒","🤕"],
  "👍": ["👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","🤙","👋","🤚","🖐","✋","🖖","👌","🤌","🤏","🫰","🫵","🫱","🫲","🫳","🫴","👈","👉","👆","☝️","👇","🙌","🙏","🫶","👏","🤝","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄","🫦"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","❤️‍🔥","❤️‍🩹","🩷","🩵","🩶","🫀"],
  "🎉": ["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","🏅","🎖","🎯","🎱","🎮","🕹","🎲","🎭","🎨","🖼","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁","🎸","🎺","🎻","🪗","🎷","🪘","🎙","🎚","🎛","📻","📺","📷","📸","📹","🎥","📽","🎞"],
  "🌟": ["🌟","⭐","💫","✨","🔥","💥","🌈","☀️","🌤","⛅","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","🌬","💨","🌀","🌊","🌙","🌛","🌜","🌝","🌞","🪐","⚡","🌺","🌸","🌼","🌻","🌹","🌷","🍀","🌿","🌱","🌲","🌴","🌵","🎋","🎍","🍁","🍂","🍃","🪴","🌾"],
  "🍕": ["🍕","🍔","🌮","🌯","🥗","🍱","🍜","🍝","🍛","🍣","🍤","🦐","🦞","🦀","🦑","🥟","🍙","🍚","🍘","🍥","🥮","🍡","🧁","🎂","🍰","🍭","🍬","🍫","🍩","🍪","🍦","🧃","🥤","🍺","🍻","🥂","🍷","🥃","☕","🫖","🧋","🍵","🥛","🍼","🫗"],
  "🐶": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦀","🐡","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃"],
  "⚽": ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","🥅","⛳","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🪃","🏋️","🤼","🤺","🏇","⛷","🏂","🪂","🏊","🚴","🧗","🤾","🏌️","🏄","🚣","🧘","🏆","🥇","🎖","🏅","🥈","🥉"],
};
const ALL_EMOJIS = Object.values(EMOJI_CATS).flat();
const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","🔥","🎉","💯"];

/* ── Helpers ────────────────────────────────────────────────── */
function formatTs(ts: Date): string {
  return ts.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}
function formatDur(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function dayLabel(d: Date) {
  const now = new Date(), diff = Math.floor((now.getTime()-d.getTime())/86400000);
  if (diff === 0) return "Bugun";
  if (diff === 1) return "Kecha";
  return d.toLocaleDateString("uz-UZ", { day:"numeric", month:"long" });
}
function uid() { return Math.random().toString(36).slice(2); }
async function uploadBlob(blob: Blob, name: string, mime: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, name);
  fd.append("path", `chat/${name}`);
  fd.append("contentType", mime);
  const r = await fetch(`${API}/api/storage/objects`, { method: "POST", body: fd });
  const j = await r.json();
  return `${API}/api/storage${j.objectPath}`;
}

/* ── EmojiPicker (bottom-sheet modal) ──────────────────────── */
function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState("😊");
  const [search, setSearch] = useState("");
  const stickers = ["🎉","🔥","💯","❤️","😂","🚀","✨","👑","💎","🌈","🦄","🎸","🫶","💪","🌙","⭐","🍕","🏆","🎯","🎭"];
  const cats = Object.keys(EMOJI_CATS);

  const filteredEmojis = search.trim()
    ? ALL_EMOJIS.filter(e => e.includes(search.trim())).slice(0, 56)
    : (cat === "sticker" ? stickers : (EMOJI_CATS[cat] || []));

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:30,stiffness:320}}
        className="w-full bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col"
        style={{maxHeight:"55vh"}}
        onClick={e=>e.stopPropagation()}>

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-border"/>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input
              className="w-full pl-8 pr-3 py-2 bg-muted rounded-xl text-sm focus:outline-none text-foreground"
              placeholder="Emoji qidirish..."
              value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto flex-shrink-0" style={{scrollbarWidth:"none"}}>
            {cats.map(k=>(
              <button key={k} onClick={()=>setCat(k)}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors ${cat===k?"bg-primary/20 border border-primary/40":"hover:bg-muted"}`}>
                {k}
              </button>
            ))}
            <button onClick={()=>setCat("sticker")}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors ${cat==="sticker"?"bg-primary/20 border border-primary/40":"hover:bg-muted"}`}>
              🎭
            </button>
          </div>
        )}

        {/* Emoji grid */}
        <div className="overflow-y-auto flex-1 px-2 pb-4">
          <div className="grid grid-cols-8 gap-0.5">
            {filteredEmojis.map((e,i)=>(
              <button key={`${e}-${i}`} onClick={()=>onPick(e)}
                className="w-full aspect-square flex items-center justify-center text-2xl rounded-xl hover:bg-muted active:scale-90 transition-all leading-none">
                {e}
              </button>
            ))}
          </div>
          {filteredEmojis.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Topilmadi</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── AttachMenu ─────────────────────────────────────────────── */
function AttachMenu({
  onPhoto, onFile, onLocation, onPoll, onSticker, onContact, onGif, onClose,
}: {
  onPhoto:()=>void; onFile:()=>void; onLocation:()=>void;
  onPoll:()=>void; onSticker:()=>void; onContact:()=>void; onGif:()=>void; onClose:()=>void;
}) {
  const items = [
    { icon: ImageIcon, label:"Rasm",       color:"bg-blue-500/15 text-blue-400",     action:onPhoto },
    { icon: File,      label:"Fayl",       color:"bg-green-500/15 text-green-400",   action:onFile },
    { icon: MapPin,    label:"Joylashuv", color:"bg-red-500/15 text-red-400",       action:onLocation },
    { icon: BarChart3, label:"So'rovnoma",color:"bg-purple-500/15 text-purple-400", action:onPoll },
    { icon: Heart,     label:"Stiker",    color:"bg-pink-500/15 text-pink-400",     action:onSticker },
    { icon: Users,     label:"Kontakt",   color:"bg-amber-500/15 text-amber-400",   action:onContact },
    { icon: Globe,     label:"GIF",       color:"bg-cyan-500/15 text-cyan-400",     action:onGif },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl shadow-2xl p-3 grid grid-cols-4 gap-2 w-60">
      {items.map(it=>(
        <button key={it.label} onClick={()=>{it.action();onClose();}}
          className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${it.color}`}>
            <it.icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── GIF Picker ─────────────────────────────────────────────── */
interface TenorGif { id: string; title: string; preview: string; original: string; originalRaw?: string }
const GIF_CATS = ["funny","cute","wow","sad","love","dance","win","cat","dog","anime"];

function GifPickerModal({ onPick, onClose }: { onPick:(url:string)=>void; onClose:()=>void }) {
  const [q, setQ] = useState("funny");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const search = async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/gifs/search?q=${encodeURIComponent(query)}&limit=21`);
      const d = await r.json();
      setGifs(d.results || []);
    } catch { setGifs([]); }
    setLoading(false);
  };
  useEffect(()=>{ search("funny"); },[]);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} transition={{type:"spring",damping:30,stiffness:320}}
        className="w-full bg-card border-t border-border rounded-t-3xl shadow-2xl" style={{maxHeight:"70vh",display:"flex",flexDirection:"column"}}>
        <div className="p-3 border-b border-border flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input className="w-full pl-8 pr-3 py-2 bg-muted rounded-xl text-sm focus:outline-none text-foreground"
              placeholder="GIF qidirish..." value={q}
              onChange={e=>setQ(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") search(q); }}/>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-border/40" style={{scrollbarWidth:"none"}}>
          {GIF_CATS.map(cat=>(
            <button key={cat} onClick={()=>{ setQ(cat); search(cat); }}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${q===cat?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:text-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-2 flex-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[...Array(9)].map((_,i)=>(
                <div key={i} className="bg-muted rounded-xl animate-pulse" style={{aspectRatio:"1.4"}}/>
              ))}
            </div>
          ) : gifs.length===0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">GIF topilmadi</div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {gifs.map(gif=>(
                <button key={gif.id} onClick={()=>onPick(gif.original)}
                  className="overflow-hidden rounded-xl hover:scale-[1.04] transition-transform active:scale-95">
                  <img src={gif.preview} alt={gif.title}
                    className="w-full object-cover" style={{aspectRatio:"1.4"}} loading="lazy"/>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-center text-[9px] text-muted-foreground py-1 flex-shrink-0">Powered by Tenor</p>
      </motion.div>
    </motion.div>
  );
}

/* ── Contact Picker ─────────────────────────────────────────── */
interface PickableUser { id: number; displayName: string; username: string; avatarUrl?: string | null; bio?: string | null }

function ContactPickerModal({ users, onPick, onClose }: {
  users: PickableUser[];
  onPick:(u:PickableUser)=>void;
  onClose:()=>void;
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter(u=>
    (u.displayName||"").toLowerCase().includes(q.toLowerCase()) ||
    (u.username||"").toLowerCase().includes(q.toLowerCase())
  );
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} transition={{type:"spring",damping:30,stiffness:320}}
        className="w-full bg-card border-t border-border rounded-t-3xl shadow-2xl" style={{maxHeight:"70vh",display:"flex",flexDirection:"column"}}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="font-bold text-foreground">Kontakt ulashish</span>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="px-3 py-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input className="w-full pl-8 pr-3 py-2 bg-muted rounded-xl text-sm focus:outline-none text-foreground"
              placeholder="Foydalanuvchi qidirish..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.length===0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Foydalanuvchi topilmadi</div>
          ) : filtered.map(user=>(
            <button key={user.id} onClick={()=>{ onPick(user); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden flex items-center justify-center text-primary font-bold text-sm">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/> : (user.displayName?.[0]||"?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
              <UserPlus className="w-4 h-4 text-primary flex-shrink-0"/>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Round Video Recorder ───────────────────────────────────── */
function RoundVideoRecorder({ onSend, onClose }: { onSend:(b:Blob,dur:number)=>void; onClose:()=>void }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder|null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const MAX = 60;

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
      if (vidRef.current) { vidRef.current.srcObject = s; vidRef.current.play(); }
    }).catch(()=>{});
    return () => {
      if (vidRef.current?.srcObject) {
        (vidRef.current.srcObject as MediaStream).getTracks().forEach(t=>t.stop());
      }
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startRec = () => {
    const stream = vidRef.current?.srcObject as MediaStream|null;
    if (!stream) return;
    chunks.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
    mr.start(100);
    recRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timer.current = setInterval(()=>setElapsed(p=>{if(p+1>=MAX){stopRec();return p;}return p+1;}),1000);
  };

  const stopRec = () => {
    if (!recRef.current) return;
    recRef.current.stop();
    recRef.current.onstop = ()=>{
      const blob = new Blob(chunks.current,{type:"video/webm"});
      onSend(blob, elapsed);
    };
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
  };

  const progress = (elapsed / MAX) * 100;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
      <div className="relative w-52 h-52">
        <svg className="absolute inset-0 -rotate-90" width="208" height="208" viewBox="0 0 208 208">
          <circle cx="104" cy="104" r="100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
          {recording&&<circle cx="104" cy="104" r="100" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
            strokeDasharray={`${2*Math.PI*100}`} strokeDashoffset={`${2*Math.PI*100*(1-progress/100)}`}
            className="transition-all duration-1000"/>}
        </svg>
        <video ref={vidRef} muted playsInline className="w-48 h-48 object-cover rounded-full absolute inset-2" />
        {recording && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-mono px-2 py-0.5 rounded-full">
            {formatDur(elapsed)}
          </div>
        )}
      </div>
      <div className="flex gap-6 items-center">
        <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20">
          <X className="w-5 h-5"/>
        </button>
        {recording ? (
          <button onClick={stopRec} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white">
            <StopCircle className="w-8 h-8"/>
          </button>
        ) : (
          <button onClick={startRec} className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Video className="w-8 h-8"/>
          </button>
        )}
        <div className="w-12 h-12"/>
      </div>
      <p className="text-white/60 text-sm">{recording ? "Yozishni to'xtatish uchun bosing" : "Bosib yozishni boshlang"}</p>
    </motion.div>
  );
}

/* ── Voice waveform ─────────────────────────────────────────── */
function VoiceWaveform({ duration, isMe, audioUrl }: { duration: number; isMe: boolean; audioUrl?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const bars = Array.from({ length: 28 }, (_, i) => {
    const heights = [0.3,0.5,0.7,0.9,0.6,0.4,0.8,1,0.7,0.5,0.3,0.6,0.9,0.8,0.4,0.7,1,0.6,0.3,0.5,0.8,0.9,0.4,0.7,0.5,0.3,0.6,0.8];
    return heights[i % heights.length];
  });

  const togglePlay = () => {
    if (!audioUrl) { setPlaying(v=>!v); return; }
    if (!audioRef.current) { audioRef.current = new Audio(audioUrl); }
    const a = audioRef.current;
    if (playing) { a.pause(); setPlaying(false); }
    else {
      a.play().catch(()=>{});
      setPlaying(true);
      a.ontimeupdate = () => {
        setProgress(a.duration ? a.currentTime/a.duration*100 : 0);
        setElapsed(Math.floor(a.currentTime));
      };
      a.onended = () => { setPlaying(false); setProgress(0); setElapsed(0); };
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe?"bg-white/20":"bg-primary/20"}`}>
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex items-end gap-0.5 flex-1">
        {bars.map((h, i) => (
          <div key={i} className={`w-1 rounded-full transition-all ${
            playing && i/bars.length < progress/100
              ? (isMe?"bg-white":"bg-primary")
              : (isMe?"bg-white/40":"bg-primary/30")
          }`} style={{ height: `${h * 24}px` }} />
        ))}
      </div>
      <span className="text-[10px] opacity-60 flex-shrink-0">{formatDur(playing ? elapsed : duration)}</span>
    </div>
  );
}

/* ── VideoNoteBubble ────────────────────────────────────────── */
function VideoNoteBubble({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer border-2 border-primary/30"
      onClick={() => {
        if (!vidRef.current) return;
        if (playing) vidRef.current.pause();
        else vidRef.current.play().catch(()=>{});
        setPlaying(v=>!v);
      }}>
      <video ref={vidRef} src={url} loop playsInline className="w-full h-full object-cover" />
      {!playing && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Play className="w-8 h-8 text-white"/>
        </div>
      )}
    </div>
  );
}

/* ── PollBubble ─────────────────────────────────────────────── */
function PollBubble({ msg, isMe, onUpdate }: { msg: LocalMsg; isMe: boolean; onUpdate:(id:string,patch:Partial<LocalMsg>)=>void }) {
  const total = (msg.pollOptions||[]).reduce((a,o)=>a+o.votes,0);
  const vote = (optId: number) => {
    if (!msg.pollOptions) return;
    const already = msg.pollOptions.find(o=>o.voted);
    if (already) return;
    const updated = msg.pollOptions.map(o => o.id===optId ? {...o, votes:o.votes+1, voted:true} : o);
    onUpdate(msg.id, { pollOptions: updated });
  };
  return (
    <div className="px-4 py-3 min-w-[200px]">
      <p className="font-semibold text-sm mb-3">{msg.pollTitle || "📊 So'rovnoma"}</p>
      <div className="space-y-2">
        {(msg.pollOptions||[]).map(opt => {
          const pct = total ? Math.round(opt.votes/total*100) : 0;
          return (
            <button key={opt.id} onClick={()=>vote(opt.id)}
              className={`w-full text-left rounded-xl overflow-hidden relative border transition-colors ${opt.voted?(isMe?"border-white/40":"border-primary"):"border-transparent hover:border-white/20"}`}>
              <div className={`absolute inset-y-0 left-0 transition-all duration-500 ${isMe?"bg-white/15":"bg-primary/15"}`}
                style={{width:`${pct}%`}}/>
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="text-sm">{opt.text}</span>
                <span className="text-xs opacity-60">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] opacity-50 mt-2">{total} ta ovoz</p>
    </div>
  );
}

/* ── Context menu ───────────────────────────────────────────── */
function ContextMenu({
  msg, isMe, onReply, onCopy, onStar, onPin, onDelete, onForward, onEdit, onSelect, onClose,
}: {
  msg: LocalMsg; isMe: boolean;
  onReply:()=>void; onCopy:()=>void; onStar:()=>void;
  onPin:()=>void; onDelete:()=>void; onForward:()=>void; onEdit:()=>void; onSelect:()=>void; onClose:()=>void;
}) {
  const items = [
    { icon: Reply,       label: "Javob berish",                                            action: onReply,   danger: false },
    { icon: Forward,     label: "Yo'naltirish",                                            action: onForward, danger: false },
    { icon: Copy,        label: "Nusxa olish",                                             action: onCopy,    danger: false },
    ...(isMe && msg.type==="text" ? [{ icon: Pencil, label: "Tahrirlash", action: onEdit, danger: false }] : []),
    { icon: Star,        label: msg.starred ? "Yulduzdan olish" : "Yulduzga qo'shish",    action: onStar,    danger: false },
    { icon: Pin,         label: msg.pinned  ? "Mahkamni olib tashlash" : "Mahkamlash",    action: onPin,     danger: false },
    { icon: CheckSquare, label: "Tanlash",                                                 action: onSelect,  danger: false },
    { icon: Trash2,      label: "O'chirish",                                               action: onDelete,  danger: true  },
  ];
  return (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
      className={`absolute z-50 bottom-full mb-1 ${isMe?"right-0":"left-0"} bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[190px]`}>
      {items.map((it,i)=>(
        <button key={i} onClick={()=>{it.action();onClose();}}
          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${it.danger?"text-destructive":"text-foreground"}`}>
          <it.icon className="w-4 h-4 flex-shrink-0 opacity-70"/>
          {it.label}
        </button>
      ))}
    </motion.div>
  );
}

/* ── MsgBubble ──────────────────────────────────────────────── */
function MsgBubble({
  msg, isMe, onReply, onUpdate, onDelete, onForward, onSelect, selected,
}: {
  msg: LocalMsg; isMe: boolean; selected: boolean;
  onReply:(m:LocalMsg)=>void;
  onUpdate:(id:string,patch:Partial<LocalMsg>)=>void;
  onDelete:(id:string)=>void;
  onForward:(id:string)=>void;
  onSelect:(id:string)=>void;
}) {
  const [showCtx, setShowCtx] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content || "");
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, 40], [0, 1]);

  const handleReaction = (emoji: string) => {
    const existing = msg.reactions.find(r=>r.emoji===emoji);
    const updated = existing
      ? msg.reactions.map(r=>r.emoji===emoji?{...r,count:r.mine?r.count-1:r.count+1,mine:!r.mine}:r).filter(r=>r.count>0)
      : [...msg.reactions,{emoji,count:1,mine:true}];
    onUpdate(msg.id,{reactions:updated});
    setShowReactions(false);
  };

  const saveEdit = () => {
    if (editText.trim()) onUpdate(msg.id,{content:editText.trim(),edited:true});
    setEditing(false);
  };

  const isNoBubble = msg.type==="video_note"||msg.type==="sticker";
  const bubbleCls = `max-w-xs relative ${isNoBubble?"":isMe
    ?"text-white rounded-[20px] rounded-br-[4px] shadow-xl shadow-primary/20"
    :"text-foreground rounded-[20px] rounded-bl-[4px] shadow-lg shadow-black/30"}`;

  return (
    <motion.div
      initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
      className={`flex flex-col ${isMe?"items-end":"items-start"} group relative`}
      style={{paddingLeft: isMe?0:8, paddingRight: isMe?8:0}}
    >
      {/* Selection overlay */}
      {selected && <div className={`absolute inset-0 rounded-2xl ${isMe?"bg-primary/10":"bg-primary/10"} z-0 border border-primary/30`}/>}

      {/* Swipe-to-reply hint */}
      {!isMe && (
        <motion.div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 flex items-center"
          style={{opacity: replyOpacity}}>
          <Reply className="w-4 h-4 text-primary"/>
        </motion.div>
      )}

      {/* Reply indicator */}
      {msg.replyTo&&(
        <div className="mb-1 px-3 py-1.5 rounded-xl border-l-2 border-primary bg-muted/50 text-xs max-w-xs">
          <p className="font-semibold text-primary text-[10px]">{msg.replyTo.sender}</p>
          <p className="text-muted-foreground truncate">{msg.replyTo.content}</p>
        </div>
      )}

      {/* Forwarded label */}
      {msg.forwarded&&(
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
          <Forward className="w-3 h-3"/>Yo'naltirilgan
        </div>
      )}

      {/* Bubble */}
      <div className="relative z-10">
        <motion.div
          drag={!isMe?"x":false}
          dragConstraints={{left:0,right:60}}
          dragElastic={{left:0,right:0.5}}
          style={!isMe
            ? {x, background:"linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.09)"}
            : (!isNoBubble ? {background:"linear-gradient(145deg,#8b5cf6 0%,#7c3aed 45%,#5b21b6 100%)", boxShadow:"0 4px 24px rgba(124,58,237,0.4)"} : undefined)}
          onDragEnd={(_, info) => {
            if (!isMe && info.offset.x > 35) onReply(msg);
            x.set(0);
          }}
          onDoubleClick={()=>setShowReactions(true)}
          onContextMenu={e=>{e.preventDefault();setShowCtx(true);}}
          onClick={()=>{if(selected)onSelect(msg.id);}}
          className={`${bubbleCls} cursor-pointer select-none`}
        >
          {/* Edit mode */}
          {editing ? (
            <div className="px-3 py-2 min-w-[160px]">
              <textarea autoFocus value={editText} onChange={e=>setEditText(e.target.value)}
                className="w-full bg-transparent text-sm text-primary-foreground resize-none focus:outline-none min-h-[40px]"
                rows={2}/>
              <div className="flex gap-2 mt-1.5">
                <button onClick={()=>setEditing(false)} className="text-[10px] opacity-60 hover:opacity-100">Bekor</button>
                <button onClick={saveEdit} className="text-[10px] font-semibold">Saqlash</button>
              </div>
            </div>
          ) : (
            <>
              {msg.type==="text"&&(
                <div className="px-4 py-2.5">
                  {msg.isEphemeral&&<span className="text-violet-300 mr-1">👻</span>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
              {msg.type==="image"&&msg.mediaUrl&&(
                <div className="overflow-hidden rounded-2xl">
                  <img src={msg.mediaUrl} alt="" className="max-w-[220px] max-h-[220px] object-cover"/>
                  {msg.content&&<p className="px-3 py-2 text-sm">{msg.content}</p>}
                </div>
              )}
              {msg.type==="drawing"&&msg.mediaUrl&&(
                <div className="overflow-hidden rounded-2xl relative group/draw">
                  <img src={msg.mediaUrl} alt="Chizma" className="max-w-[240px] max-h-[200px] object-contain bg-[#1a1a2e]"/>
                  <div className="absolute top-1.5 left-2 flex items-center gap-1 opacity-60">
                    <PenLine className="w-3 h-3 text-white"/>
                    <span className="text-[9px] text-white font-medium">Chizma</span>
                  </div>
                </div>
              )}
              {msg.type==="voice"&&(
                <div className="px-3 py-2.5">
                  <VoiceWaveform duration={msg.duration||5} isMe={isMe} audioUrl={msg.mediaUrl}/>
                </div>
              )}
              {msg.type==="video_note"&&msg.mediaUrl&&(
                <div className="flex flex-col items-center gap-1">
                  <VideoNoteBubble url={msg.mediaUrl}/>
                  <div className="flex items-center gap-1">
                    {msg.starred&&<Star className="w-2.5 h-2.5 text-yellow-400 fill-current"/>}
                    <span className="text-[10px] text-muted-foreground">{formatTs(msg.ts)}</span>
                    {isMe&&(msg.status==="read"
                      ?<CheckCheck className="w-3 h-3 text-cyan-300"/>
                      :<CheckCheck className="w-3 h-3 text-muted-foreground/50"/>)}
                  </div>
                </div>
              )}
              {msg.type==="file"&&(
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe?"bg-white/20":"bg-primary/15"}`}>
                    <File className="w-5 h-5"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate max-w-[120px]">{msg.fileName||"Fayl"}</p>
                    <p className="text-[10px] opacity-60">Fayl</p>
                  </div>
                  {msg.mediaUrl&&(
                    <a href={msg.mediaUrl} download className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                      <Download className="w-3.5 h-3.5"/>
                    </a>
                  )}
                </div>
              )}
              {msg.type==="sticker"&&(
                <div className="flex flex-col items-center">
                  <span className="text-6xl leading-none select-none">{msg.emoji}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatTs(msg.ts)}</span>
                    {isMe&&(msg.status==="read"
                      ?<CheckCheck className="w-3 h-3 text-cyan-300"/>
                      :<CheckCheck className="w-3 h-3 text-muted-foreground/50"/>)}
                  </div>
                </div>
              )}
              {msg.type==="poll"&&(
                <PollBubble msg={msg} isMe={isMe} onUpdate={onUpdate}/>
              )}
            </>
          )}

          {/* Timestamp row */}
          {!isNoBubble&&msg.type!=="poll"&&(
            <div className={`flex items-center gap-1 px-3 pb-2 justify-end ${msg.type==="image"?"absolute bottom-1 right-1 bg-black/40 rounded-lg px-1.5":""}`}>
              {msg.starred&&<Star className="w-2.5 h-2.5 opacity-60 fill-current"/>}
              {msg.edited&&<span className="text-[9px] opacity-50">tahrirlangan</span>}
              <span className={`text-[10px] ${msg.type==="image"?"text-white/80":isMe?"text-primary-foreground/60":"text-muted-foreground"}`}>
                {formatTs(msg.ts)}
              </span>
              {isMe&&(
                msg.status==="read"?<CheckCheck className="w-3 h-3 text-cyan-300 flex-shrink-0"/>
                :msg.status==="delivered"?<CheckCheck className="w-3 h-3 opacity-60 flex-shrink-0"/>
                :<Check className="w-3 h-3 opacity-60 flex-shrink-0"/>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick react btn */}
        <button onClick={()=>setShowReactions(v=>!v)}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isMe?"-left-8":"-right-8"} w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm`}>
          😊
        </button>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions&&(
            <motion.div initial={{opacity:0,scale:0.9,y:4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9}}
              className={`absolute bottom-full mb-1 ${isMe?"right-0":"left-0"} z-40 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-xl`}>
              {QUICK_REACTIONS.map(e=>(
                <button key={e} onClick={()=>handleReaction(e)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-full transition-colors">{e}</button>
              ))}
              <button onClick={()=>setShowReactions(false)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3"/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context menu */}
        <AnimatePresence>
          {showCtx&&(
            <ContextMenu
              msg={msg} isMe={isMe}
              onReply={()=>onReply(msg)}
              onCopy={()=>navigator.clipboard.writeText(msg.content||"")}
              onStar={()=>onUpdate(msg.id,{starred:!msg.starred})}
              onPin={()=>onUpdate(msg.id,{pinned:!msg.pinned})}
              onDelete={()=>onDelete(msg.id)}
              onForward={()=>onForward(msg.id)}
              onEdit={()=>{setEditing(true);setEditText(msg.content||"");}}
              onSelect={()=>onSelect(msg.id)}
              onClose={()=>setShowCtx(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Reactions display */}
      {msg.reactions.length>0&&(
        <div className={`flex gap-1 mt-1 flex-wrap ${isMe?"justify-end":"justify-start"}`}>
          {msg.reactions.map(r=>(
            <button key={r.emoji} onClick={()=>handleReaction(r.emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${r.mine?"bg-primary/15 border-primary/30":"bg-muted border-border"}`}>
              {r.emoji} <span className="text-[10px]">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── ForwardModal ───────────────────────────────────────────── */
function ForwardModal({
  convs, me, onForward, onClose,
}: {
  convs: Conversation[]; me: number;
  onForward:(convId:number)=>void; onClose:()=>void;
}) {
  const [q, setQ] = useState("");
  const list = convs.filter(c => {
    const other = c.participants?.find(p=>p.id!==me);
    return !q || other?.displayName?.toLowerCase().includes(q.toLowerCase());
  });
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28}}
        className="w-full bg-card rounded-t-3xl border-t border-border p-5 max-h-[70vh] flex flex-col"
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">Yo'naltirish</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground"/></button>
        </div>
        <input value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Qidirish..."
          className="w-full px-3 py-2 rounded-xl bg-muted text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-primary"/>
        <div className="overflow-y-auto space-y-1">
          {list.map(c=>{
            const other = c.participants?.find(p=>p.id!==me);
            return (
              <button key={c.id} onClick={()=>onForward(c.id)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted text-left transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {other?.avatarUrl ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover"/> : <span className="font-bold text-primary">{other?.displayName?.[0]||"?"}</span>}
                </div>
                <span className="text-sm text-foreground">{other?.displayName||"Unknown"}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── PollCreator ────────────────────────────────────────────── */
function PollCreator({ onSend, onClose }: { onSend:(title:string,opts:PollOption[])=>void; onClose:()=>void }) {
  const [title, setTitle] = useState("");
  const [opts, setOpts] = useState(["",""]);
  const addOpt = () => setOpts(p=>[...p,""]);
  const setOpt = (i:number,v:string) => setOpts(p=>p.map((o,j)=>j===i?v:o));
  const removeOpt = (i:number) => setOpts(p=>p.filter((_,j)=>j!==i));
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28}}
        className="w-full bg-card rounded-t-3xl border-t border-border p-5 flex flex-col"
        onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">So'rovnoma yaratish</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground"/></button>
        </div>
        <input value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Savol yozing..."
          className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-primary"/>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {opts.map((o,i)=>(
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e=>setOpt(i,e.target.value)}
                placeholder={`Variant ${i+1}`}
                className="flex-1 px-3 py-2 rounded-xl bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
              {opts.length>2&&<button onClick={()=>removeOpt(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4"/></button>}
            </div>
          ))}
        </div>
        <button onClick={addOpt} className="text-sm text-primary flex items-center gap-1 mb-4"><Plus className="w-4 h-4"/>Variant qo'shish</button>
        <button
          disabled={!title.trim()||opts.filter(o=>o.trim()).length<2}
          onClick={()=>onSend(title.trim(),opts.filter(o=>o.trim()).map((text,id)=>({id,text,votes:0,voted:false})))}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40">
          Yuborish
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ME_ID = user?.id || 1;

  const qc = useQueryClient();
  const { data: convs = [], isLoading } = useListConversations();
  const createConv = useCreateConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [showList, setShowList] = useState(true);
  const [search, setSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [tab, setTab] = useState<"all"|"unread"|"groups">("all");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [mutedConvs, setMutedConvs] = useState<Set<number>>(new Set());
  const [blockedConvs, setBlockedConvs] = useState<Set<number>>(new Set());
  const [pinnedConvIds, setPinnedConvIds] = useState<Set<number>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{id:string;isMe:boolean}|null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [profileTab, setProfileTab] = useState<"info"|"media"|"files">("info");
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showStarredPanel, setShowStarredPanel] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [chatBgId, setChatBgId] = useState(()=>localStorage.getItem("olcha_chat_bg")||"glass");
  const [showFmtBar, setShowFmtBar] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const { startCall } = useCall();
  const { subscribe, send: sendRealtime } = useRealtime();
  const [forwardMsgId, setForwardMsgId] = useState<string|null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [convCtxMenu, setConvCtxMenu] = useState<number|null>(null);
  const [convCtxPos, setConvCtxPos] = useState({x:0,y:0});
  const [notifPrefs, setNotifPrefs] = useState<Record<number,"all"|"mentions"|"none">>({});
  const [showNewConv, setShowNewConv] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showDraw, setShowDraw] = useState(false);

  const { data: allUsers = [] } = useListUsers({});

  // Chat state
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<LocalMsg|null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showRoundVid, setShowRoundVid] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [localMsgs, setLocalMsgs] = useState<LocalMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [pinnedMsg, setPinnedMsg] = useState<LocalMsg|null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Voice
  const [voiceRec, setVoiceRec] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const voiceRecRef = useRef<MediaRecorder|null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  const voiceTimer = useRef<ReturnType<typeof setInterval>|null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = convs.find(c=>c.id===activeId);
  const convId = activeConv?.id??null;
  const { data: apiMsgs=[] } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) },
  });
  const sendApi = useSendMessage();

  const lastApiTs = apiMsgs[apiMsgs.length-1]?.createdAt
    ? new Date(apiMsgs[apiMsgs.length-1].createdAt as string) : new Date(0);
  const allMsgs: LocalMsg[] = [
    ...apiMsgs.map(m=>({
      id:String(m.id), senderId:m.senderId, type:"text" as MsgType, content:m.content,
      reactions:[], starred:false, pinned:false, deleted:false, edited:false, forwarded:false,
      status:"read" as const, ts:new Date(m.createdAt||Date.now()),
    })),
    ...localMsgs.filter(lm=>{
      // Non-text messages (video_note, voice, sticker, image, file, poll) ALWAYS kept
      if(lm.type!=="text") return true;
      // Text messages: keep if newer than last API message (avoids showing sent before confirm)
      // OR if no matching API message exists (simple dedup by content+sender within 30s)
      const hasMatch = apiMsgs.some(am=>
        am.senderId===lm.senderId &&
        am.content===lm.content &&
        Math.abs(new Date(am.createdAt as string).getTime()-lm.ts.getTime())<30000
      );
      return !hasMatch && lm.ts>lastApiTs;
    }),
  ].sort((a,b)=>a.ts.getTime()-b.ts.getTime());

  const displayMsgs = allMsgs
    .filter(m=>!hiddenMsgIds.has(m.id))
    .filter(m=>!msgSearch||m.content?.toLowerCase().includes(msgSearch.toLowerCase()));

  const filteredConvs = [...convs]
    .sort((a,b)=>{
      const aPin = pinnedConvIds.has(a.id)?1:0;
      const bPin = pinnedConvIds.has(b.id)?1:0;
      return bPin-aPin;
    })
    .filter(c=>{
      const other = c.participants?.find(p=>p.id!==ME_ID);
      const matchSearch = !search||other?.displayName?.toLowerCase().includes(search.toLowerCase());
      if(tab==="unread") return matchSearch&&(c.unreadCount||0)>0;
      return matchSearch;
    });

  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); },[allMsgs.length,activeId]);

  const handleScroll = (e:React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setShowScrollBtn(el.scrollHeight-el.scrollTop-el.clientHeight>200);
  };

  // My typing indicator — sends real dm_typing events to the other participant
  useEffect(()=>{
    if(!activeConv) return;
    const other = getOther(activeConv);
    if(typingTimer.current) clearTimeout(typingTimer.current);
    if(text.length>0) {
      if(!typing && other?.id) sendRealtime({ type:"dm_typing", toId:other.id, roomId:String(activeConv.id), payload:{conversationId:activeConv.id, isTyping:true} });
      setTyping(true);
      typingTimer.current = setTimeout(()=>{
        setTyping(false);
        if(other?.id) sendRealtime({ type:"dm_typing", toId:other.id, roomId:String(activeConv.id), payload:{conversationId:activeConv.id, isTyping:false} });
      },2000);
    } else if(typing) {
      setTyping(false);
      if(other?.id) sendRealtime({ type:"dm_typing", toId:other.id, roomId:String(activeConv.id), payload:{conversationId:activeConv.id, isTyping:false} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[text]);

  // Real partner typing indicator via Go realtime relay
  useEffect(()=>{
    return subscribe("dm_typing", (msg)=>{
      const p = msg.payload ?? {};
      if(p.conversationId!==activeId) return;
      setPartnerTyping(!!p.isTyping);
    });
  },[subscribe,activeId]);

  // Real-time incoming DM messages — refresh conversation list + open thread
  useEffect(()=>{
    return subscribe("dm_message", (msg)=>{
      const p = msg.payload ?? {};
      const convIdFromMsg = p.conversationId;
      if(convIdFromMsg) qc.invalidateQueries({queryKey:getGetConversationMessagesQueryKey(convIdFromMsg)});
      qc.invalidateQueries({queryKey:getListConversationsQueryKey()});
      if(getFeaturePref("sound_notif",true) && convIdFromMsg!==activeId) playMessageSound();
    });
  },[subscribe,qc,activeId]);

  // 🔔 Sound: play message ping when new messages from others arrive
  const lastMsgCountRef = useRef(0);
  useEffect(()=>{
    const incoming = allMsgs.filter(m=>m.senderId!==ME_ID);
    if(incoming.length > lastMsgCountRef.current && lastMsgCountRef.current > 0) {
      if(getFeaturePref("sound_notif",true)) playMessageSound();
    }
    lastMsgCountRef.current = incoming.length;
  },[allMsgs.length]);

  const addMsg = (patch:Partial<LocalMsg>) => {
    const msg:LocalMsg = {
      id:uid(), senderId:ME_ID, type:"text", reactions:[],
      starred:false, pinned:false, deleted:false, edited:false, forwarded:false,
      status:"sending", ts:new Date(), isEphemeral:ephemeral, ...patch,
    };
    setLocalMsgs(prev=>[...prev,msg]);
    if(msg.pinned) setPinnedMsg(msg);
    setTimeout(()=>updateMsg(msg.id,{status:"delivered"}),800);
    setTimeout(()=>updateMsg(msg.id,{status:"read"}),2000);
    return msg;
  };

  const updateMsg = (id:string,patch:Partial<LocalMsg>) => {
    setLocalMsgs(prev=>prev.map(m=>m.id===id?{...m,...patch}:m));
  };

  const handleSend = () => {
    if(!text.trim()||!convId) return;
    const replySender = replyTo?.senderId===ME_ID?"Siz":(activeConv?getOther(activeConv)?.displayName:undefined)||"U";
    const content = replyTo?`↩ ${replySender}: ${replyTo.content?.slice(0,50)}\n\n${text.trim()}`:text.trim();
    addMsg({ type:"text", content, replyTo:replyTo?{id:replyTo.id,content:replyTo.content||"",sender:replyTo.senderId===ME_ID?"Siz":"U"}:undefined });
    sendApi.mutate({ id:convId, data:{senderId:ME_ID,content} },{
      onSuccess:()=>qc.invalidateQueries({queryKey:getGetConversationMessagesQueryKey(convId)}),
    });
    setText(""); setReplyTo(null);
  };

  const handleImage = (file:File) => {
    const url = URL.createObjectURL(file);
    addMsg({type:"image",mediaUrl:url,content:""});
    uploadBlob(file,file.name,file.type).catch(()=>{});
  };
  const handleFile = (file:File) => {
    addMsg({type:"file",fileName:file.name});
    uploadBlob(file,file.name,file.type).then(url=>updateMsg("last",{mediaUrl:url})).catch(()=>{});
  };
  const handleVideoNote = (blob:Blob,dur:number) => {
    const tempUrl = URL.createObjectURL(blob);
    const msg = addMsg({type:"video_note",mediaUrl:tempUrl,duration:dur});
    setShowRoundVid(false);
    uploadBlob(blob,`video_${Date.now()}.webm`,"video/webm")
      .then(serverUrl=>{ updateMsg(msg.id,{mediaUrl:serverUrl}); URL.revokeObjectURL(tempUrl); })
      .catch(()=>{});
  };
  const startVoice = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({audio:true});
      voiceChunks.current=[];
      const mr = new MediaRecorder(s,{mimeType:"audio/webm"});
      mr.ondataavailable=e=>{ if(e.data.size) voiceChunks.current.push(e.data); };
      mr.start(100);
      voiceRecRef.current=mr;
      setVoiceRec(true);
      setVoiceElapsed(0);
      voiceTimer.current=setInterval(()=>setVoiceElapsed(p=>p+1),1000);
    } catch{}
  };
  const stopVoice = () => {
    if(!voiceRecRef.current) return;
    voiceRecRef.current.stop();
    voiceRecRef.current.onstop=()=>{
      const blob = new Blob(voiceChunks.current,{type:"audio/webm"});
      const tempUrl = URL.createObjectURL(blob);
      const dur = voiceElapsed;
      const m = addMsg({type:"voice",mediaUrl:tempUrl,duration:dur});
      uploadBlob(blob,`voice_${Date.now()}.webm`,"audio/webm")
        .then(serverUrl=>{ updateMsg(m.id,{mediaUrl:serverUrl}); URL.revokeObjectURL(tempUrl); })
        .catch(()=>{});
    };
    if(voiceTimer.current) clearInterval(voiceTimer.current);
    setVoiceRec(false);
    setVoiceElapsed(0);
  };
  const cancelVoice = () => {
    voiceRecRef.current?.stop();
    if(voiceTimer.current) clearInterval(voiceTimer.current);
    setVoiceRec(false);
    setVoiceElapsed(0);
  };
  const handleDrawingSend = (blob: Blob, dataUrl: string) => {
    setShowDraw(false);
    const msg = addMsg({ type: "drawing", mediaUrl: dataUrl });
    uploadBlob(blob, `drawing_${Date.now()}.png`, "image/png")
      .then(url => updateMsg(msg.id, { mediaUrl: url }))
      .catch(() => {});
  };

  const handleSticker = (emoji:string) => {
    addMsg({type:"sticker",emoji});
    setShowEmoji(false);
  };
  const insertFmt = (before:string,after:string) => {
    const ta = textareaRef.current;
    if(!ta) { setText(prev=>`${prev}${before}${after}`); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = text.slice(start,end);
    const newText = text.slice(0,start)+before+(sel||"")+after+text.slice(end);
    setText(newText);
    setTimeout(()=>{ ta.focus(); ta.setSelectionRange(start+before.length,start+before.length+(sel||"").length); },0);
  };

  const getOther = (conv: typeof convs[0]) =>
    conv.participants?.find(p=>p.id!==ME_ID)||conv.participants?.[0];

  const toggleSelect = (id:string) => {
    setSelectedMsgs(prev=>{
      const s=new Set(prev);
      s.has(id)?s.delete(id):s.add(id);
      return s;
    });
  };

  const openConvCtx = (e:React.MouseEvent, id:number) => {
    e.preventDefault();
    setConvCtxMenu(id);
    setConvCtxPos({x:e.clientX,y:e.clientY});
  };

  const mediaInChat = displayMsgs.filter(m=>m.type==="image"&&m.mediaUrl);
  const filesInChat = displayMsgs.filter(m=>m.type==="file");

  // Chat area themes
  const BG_THEMES: Record<string,{style:React.CSSProperties;label:string;emoji:string}> = {
    white_glass: { emoji:"🪟", label:"Oq shisha",  style:{ background:"rgba(255,255,255,0.18)", backdropFilter:"blur(28px) saturate(180%)", backgroundColor:"rgba(235,240,255,0.55)", backgroundImage:"radial-gradient(ellipse at top,rgba(200,210,255,0.4) 0%,transparent 70%)" } },
    glass:       { emoji:"🫧", label:"Qora shisha", style:{ background:"rgba(10,8,25,0.55)",   backdropFilter:"blur(24px) saturate(160%)", backgroundImage:"radial-gradient(ellipse at top,rgba(100,60,200,0.15) 0%,transparent 70%)" } },
    dark:        { emoji:"🌑", label:"Qora",        style:{ background:"linear-gradient(160deg,#08080f 0%,#12101e 50%,#0a0a0f 100%)" } },
    midnight:    { emoji:"🌌", label:"Yarim tun",   style:{ background:"linear-gradient(170deg,#000510 0%,#020818 40%,#050b22 70%,#000810 100%)", backgroundImage:"radial-gradient(ellipse at 20% 20%,rgba(59,130,246,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,0.08) 0%,transparent 60%)" } },
    galaxy:      { emoji:"🌠", label:"Galaktika",   style:{ background:"linear-gradient(135deg,#02000a 0%,#0d0520 35%,#15083a 65%,#020010 100%)", backgroundImage:"radial-gradient(ellipse at 30% 40%,rgba(139,92,246,0.25) 0%,transparent 55%),radial-gradient(ellipse at 75% 60%,rgba(59,130,246,0.15) 0%,transparent 50%)" } },
    purple:      { emoji:"💜", label:"Binafsha",    style:{ background:"linear-gradient(145deg,#1a0030 0%,#2d1060 40%,#1a0840 70%,#0d0525 100%)", backgroundImage:"radial-gradient(ellipse at 60% 30%,rgba(167,139,250,0.2) 0%,transparent 60%)" } },
    violet:      { emoji:"🔮", label:"Violet",      style:{ background:"linear-gradient(135deg,#0f0020 0%,#250050 30%,#180038 60%,#0a001a 100%)", backgroundImage:"radial-gradient(circle at 50% 0%,rgba(192,132,252,0.3) 0%,transparent 50%),radial-gradient(circle at 80% 100%,rgba(99,102,241,0.2) 0%,transparent 50%)" } },
    aurora:      { emoji:"🌌", label:"Aurora",      style:{ background:"linear-gradient(160deg,#050d12 0%,#0a1a2e 25%,#0e1040 50%,#151a0a 75%,#0a1008 100%)", backgroundImage:"radial-gradient(ellipse at 20% 30%,rgba(34,211,238,0.18) 0%,transparent 50%),radial-gradient(ellipse at 80% 60%,rgba(139,92,246,0.15) 0%,transparent 50%),radial-gradient(ellipse at 50% 90%,rgba(52,211,153,0.12) 0%,transparent 50%)" } },
    ocean:       { emoji:"🌊", label:"Okean",       style:{ background:"linear-gradient(170deg,#000d1a 0%,#001a35 30%,#00253d 60%,#001520 100%)", backgroundImage:"radial-gradient(ellipse at 30% 50%,rgba(6,182,212,0.2) 0%,transparent 60%),radial-gradient(ellipse at 70% 20%,rgba(59,130,246,0.12) 0%,transparent 50%)" } },
    blue:        { emoji:"💙", label:"Ko'k",        style:{ background:"linear-gradient(145deg,#010c1f 0%,#021533 40%,#051a40 70%,#010a1a 100%)", backgroundImage:"radial-gradient(ellipse at 50% 60%,rgba(59,130,246,0.2) 0%,transparent 55%)" } },
    teal:        { emoji:"🩵", label:"To'q yashil", style:{ background:"linear-gradient(145deg,#001415 0%,#002a2c 40%,#003030 70%,#001010 100%)", backgroundImage:"radial-gradient(ellipse at 40% 40%,rgba(20,184,166,0.25) 0%,transparent 60%)" } },
    emerald:     { emoji:"💚", label:"Zumrad",      style:{ background:"linear-gradient(145deg,#001208 0%,#002818 40%,#003020 70%,#000f05 100%)", backgroundImage:"radial-gradient(ellipse at 35% 50%,rgba(52,211,153,0.2) 0%,transparent 60%)" } },
    forest:      { emoji:"🌲", label:"O'rmon",      style:{ background:"linear-gradient(160deg,#030d05 0%,#081a08 30%,#0d2510 60%,#051005 100%)", backgroundImage:"radial-gradient(ellipse at 60% 40%,rgba(74,222,128,0.12) 0%,transparent 55%),radial-gradient(ellipse at 20% 80%,rgba(21,128,61,0.15) 0%,transparent 50%)" } },
    sunset:      { emoji:"🌅", label:"Quyosh botishi",style:{ background:"linear-gradient(160deg,#150800 0%,#2d1200 25%,#3d1000 50%,#250828 75%,#150010 100%)", backgroundImage:"radial-gradient(ellipse at 60% 20%,rgba(251,146,60,0.25) 0%,transparent 55%),radial-gradient(ellipse at 30% 70%,rgba(192,38,211,0.2) 0%,transparent 55%)" } },
    fire:        { emoji:"🔥", label:"Olov",        style:{ background:"linear-gradient(160deg,#1a0500 0%,#300a00 30%,#3d0f00 55%,#200500 80%,#100200 100%)", backgroundImage:"radial-gradient(ellipse at 50% 30%,rgba(249,115,22,0.3) 0%,transparent 55%),radial-gradient(ellipse at 30% 70%,rgba(239,68,68,0.2) 0%,transparent 50%)" } },
    rose:        { emoji:"🌹", label:"Qizil atirgul",style:{ background:"linear-gradient(145deg,#180010 0%,#2d0020 40%,#350828 70%,#180010 100%)", backgroundImage:"radial-gradient(ellipse at 50% 40%,rgba(244,63,94,0.2) 0%,transparent 60%)" } },
    cherry:      { emoji:"🌸", label:"Gilos",       style:{ background:"linear-gradient(145deg,#1a0018 0%,#2d0030 40%,#1e0838 70%,#0d0018 100%)", backgroundImage:"radial-gradient(ellipse at 40% 30%,rgba(236,72,153,0.22) 0%,transparent 55%),radial-gradient(ellipse at 70% 70%,rgba(139,92,246,0.18) 0%,transparent 55%)" } },
    pastel:      { emoji:"🎀", label:"Pastel",      style:{ background:"linear-gradient(145deg,#16101e 0%,#1e1428 40%,#181028 70%,#100c1e 100%)", backgroundImage:"radial-gradient(ellipse at 30% 30%,rgba(244,114,182,0.2) 0%,transparent 55%),radial-gradient(ellipse at 70% 70%,rgba(167,139,250,0.2) 0%,transparent 55%),radial-gradient(ellipse at 60% 20%,rgba(125,211,252,0.12) 0%,transparent 45%)" } },
    neon:        { emoji:"⚡", label:"Neon",        style:{ background:"linear-gradient(145deg,#050015 0%,#0a001f 40%,#080025 70%,#030010 100%)", backgroundImage:"radial-gradient(ellipse at 25% 35%,rgba(0,255,200,0.15) 0%,transparent 50%),radial-gradient(ellipse at 75% 65%,rgba(255,0,200,0.15) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(100,50,255,0.1) 0%,transparent 60%)" } },
    sand:        { emoji:"🏜️", label:"Cho'l",       style:{ background:"linear-gradient(160deg,#120d05 0%,#1e1508 30%,#261a0a 60%,#150e05 100%)", backgroundImage:"radial-gradient(ellipse at 50% 30%,rgba(217,119,6,0.2) 0%,transparent 55%),radial-gradient(ellipse at 20% 70%,rgba(180,83,9,0.12) 0%,transparent 50%)" } },
    gray:        { emoji:"🩶", label:"Kulrang",     style:{ background:"linear-gradient(145deg,#0d0d0d 0%,#181818 40%,#1a1a1a 70%,#0d0d0d 100%)" } },
    dots:        { emoji:"🔵", label:"Nuqtalar",    style:{ background:"radial-gradient(circle,rgba(139,92,246,0.12) 1.5px,transparent 1.5px)", backgroundSize:"22px 22px", backgroundColor:"#09070f", backgroundImage:"radial-gradient(ellipse at 50% 50%,rgba(109,40,217,0.08) 0%,transparent 70%)" } },
    hex:         { emoji:"⬡",  label:"Olti burchak",style:{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(139,92,246,0.06) 27px,rgba(139,92,246,0.06) 28px),repeating-linear-gradient(60deg,transparent,transparent 27px,rgba(139,92,246,0.06) 27px,rgba(139,92,246,0.06) 28px),repeating-linear-gradient(120deg,transparent,transparent 27px,rgba(139,92,246,0.06) 27px,rgba(139,92,246,0.06) 28px)", backgroundColor:"#08060e" } },
    grid:        { emoji:"▦",  label:"To'r",        style:{ backgroundImage:"linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px)", backgroundSize:"32px 32px", backgroundColor:"#07060d" } },
    carbon:      { emoji:"⬛", label:"Carbon",      style:{ backgroundImage:"repeating-linear-gradient(45deg,#111111 0,#111111 1px,#0a0a0a 0,#0a0a0a 50%)", backgroundSize:"6px 6px" } },
    linen:       { emoji:"📜", label:"Keten",       style:{ backgroundImage:"repeating-linear-gradient(0deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 4px),repeating-linear-gradient(90deg,rgba(255,255,255,0.01) 0px,rgba(255,255,255,0.01) 1px,transparent 1px,transparent 6px)", backgroundColor:"#0e0b07", background:"linear-gradient(145deg,#0e0b07,#14100a)" } },
  };

  return (
    <div className="flex overflow-hidden" style={{height:"100dvh"}}
      onClick={()=>{ if(convCtxMenu!==null) setConvCtxMenu(null); }}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <div className={`${showList?"flex":"hidden"} md:flex w-full md:w-72 flex-shrink-0 border-r border-border bg-sidebar flex-col`}>
        <div className="px-4 border-b border-border flex-shrink-0"
          style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 12px)",paddingBottom:12}}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">{t("msg.title")}</h2>
            <div className="flex items-center gap-1">
              {selectedMsgs.size>0&&(
                <button onClick={()=>setSelectedMsgs(new Set())}
                  className="text-xs text-primary px-2 py-1 rounded-lg bg-primary/10">
                  {selectedMsgs.size} ta tanlandi
                </button>
              )}
              <button onClick={()=>setShowNewConv(true)} title="Yangi suhbat"
                className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
                <UserPlus className="w-4 h-4"/>
              </button>
              <button onClick={()=>{ window.location.href="/groups"; }} title="Guruhlar"
                className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
                <Users className="w-4 h-4"/>
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t("msg.search_ph")}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-transparent focus:border-primary/40 transition-colors"/>
          </div>
          <div className="flex gap-1 mt-2.5">
            {(["all","unread","groups"] as const).map(tb=>(
              <button key={tb} onClick={()=>setTab(tb)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${tab===tb?"bg-primary/15 text-primary":"text-muted-foreground hover:text-foreground"}`}>
                {tb==="all"?"Hammasi":tb==="unread"?"O'qilmagan":"Guruhlar"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoading ? [...Array(5)].map((_,i)=>(
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-11 h-11 rounded-full bg-muted flex-shrink-0"/>
              <div className="flex-1 space-y-2"><div className="h-3 bg-muted rounded w-2/3"/><div className="h-2.5 bg-muted rounded w-1/2"/></div>
            </div>
          )) : filteredConvs.length===0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("msg.no_convs")}</div>
          ) : filteredConvs.map(conv=>{
            const other = getOther(conv);
            const isActive = conv.id===activeId;
            const isMuted = mutedConvs.has(conv.id);
            const isPinned = pinnedConvIds.has(conv.id);
            const notif = notifPrefs[conv.id]||"all";
            return (
              <motion.div key={conv.id} whileHover={{x:2}}
                onClick={()=>{ setActiveId(conv.id); setShowList(false); setSelectedMsgs(new Set()); }}
                onContextMenu={e=>openConvCtx(e,conv.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isActive?"bg-primary/10 border border-primary/20":"hover:bg-muted"}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                    {other?.avatarUrl ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover"/> : <span className="text-base font-bold text-primary">{other?.displayName?.[0]||"?"}</span>}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-sidebar"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isPinned&&<Pin className="w-2.5 h-2.5 text-primary flex-shrink-0"/>}
                      <p className="text-sm font-semibold text-foreground truncate">{other?.displayName||"Unknown"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">hozir</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMuted&&<BellOff className="w-3 h-3 text-muted-foreground flex-shrink-0"/>}
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage||t("msg.start_conv")}</p>
                  </div>
                </div>
                {(conv.unreadCount||0)>0&&!isMuted&&(
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
                {isMuted&&<BellOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Conversation context menu */}
      <AnimatePresence>
        {convCtxMenu!==null&&(
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
            className="fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
            style={{top:convCtxPos.y,left:Math.min(convCtxPos.x,window.innerWidth-200)}}
            onClick={e=>e.stopPropagation()}>
            {[
              { icon: Pin,     label: pinnedConvIds.has(convCtxMenu)?"Pinni olish":"Pinlash",
                action:()=>{ setPinnedConvIds(p=>{const s=new Set(p);s.has(convCtxMenu)?s.delete(convCtxMenu):s.add(convCtxMenu);return s;}); }},
              { icon: mutedConvs.has(convCtxMenu)?BellRing:BellOff, label:mutedConvs.has(convCtxMenu)?"Ovozni yoqish":"Ovozni o'chirish",
                action:()=>{ setMutedConvs(p=>{const s=new Set(p);s.has(convCtxMenu)?s.delete(convCtxMenu):s.add(convCtxMenu);return s;}); }},
              { icon: Archive, label:"Arxivlash", action:()=>{} },
              { icon: Trash2,  label:"O'chirish",  action:()=>{ setShowClearConfirm(true); setActiveId(convCtxMenu); }, danger:true },
            ].map((item,i)=>(
              <button key={i} onClick={()=>{item.action();setConvCtxMenu(null);}}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${(item as {danger?:boolean}).danger?"text-destructive":"text-foreground"}`}>
                <item.icon className="w-4 h-4 flex-shrink-0 opacity-70"/>
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ CHAT AREA ════════════════════════════════════════════ */}
      {activeConv ? (
        <div className={`${!showList?"flex":"hidden"} md:flex flex-1 flex-col min-w-0 relative`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 border-b border-border flex-shrink-0"
            style={{paddingTop:"calc(env(safe-area-inset-top,0px) + 12px)",paddingBottom:12}}>
            <button onClick={()=>setShowList(true)}
              className="md:hidden w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <button className="relative flex-shrink-0" onClick={()=>setShowProfilePanel(true)}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                {getOther(activeConv)?.avatarUrl
                  ?<img src={getOther(activeConv)!.avatarUrl!} alt="" className="w-full h-full object-cover"/>
                  :<span className="text-sm font-bold text-primary">{getOther(activeConv)?.displayName?.[0]}</span>}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background"/>
            </button>
            <button className="flex-1 min-w-0 text-left" onClick={()=>setShowProfilePanel(true)}>
              <p className="font-semibold text-foreground text-sm truncate">{getOther(activeConv)?.displayName}</p>
              <AnimatePresence mode="wait">
                <motion.p key={partnerTyping?"pt":typing?"t":"o"} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-xs">
                  {partnerTyping
                    ?<span className="text-primary flex items-center gap-1"><span className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>yozmoqda...</span>
                    :typing
                    ?<span className="text-muted-foreground text-[11px]">Siz yozmoqdasiz...</span>
                    :<span className="text-emerald-400">Online</span>}
                </motion.p>
              </AnimatePresence>
            </button>
            <div className="flex items-center gap-1 flex-shrink-0">
              {showMsgSearch
                ?<input autoFocus value={msgSearch} onChange={e=>setMsgSearch(e.target.value)}
                    onBlur={()=>{ setShowMsgSearch(false); setMsgSearch(""); }}
                    placeholder="Xabarda qidirish..."
                    className="w-32 px-2 py-1 rounded-lg bg-muted text-xs text-foreground focus:outline-none border border-primary/30"/>
                :<button onClick={()=>setShowMsgSearch(true)}
                    className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Search className="w-4 h-4"/>
                  </button>}
              <button
                onClick={()=>{ const o=getOther(activeConv); if(o?.id) startCall({id:o.id,name:o.displayName||"?",avatar:o.avatarUrl||undefined},"voice"); }}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4"/>
              </button>
              <button
                onClick={()=>{ const o=getOther(activeConv); if(o?.id) startCall({id:o.id,name:o.displayName||"?",avatar:o.avatarUrl||undefined},"video"); }}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Video className="w-4 h-4"/>
              </button>
              <button onClick={()=>setEphemeral(v=>!v)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${ephemeral?"bg-violet-500/20 text-violet-400":"hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Ghost className={`w-4 h-4 ${ephemeral?"animate-pulse":""}`}/>
              </button>
              <div className="relative">
                <button onClick={()=>setShowChatMenu(v=>!v)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${showChatMenu?"bg-muted text-foreground":"hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                  <MoreVertical className="w-4 h-4"/>
                </button>
                <AnimatePresence>
                  {showChatMenu&&(
                    <motion.div initial={{opacity:0,scale:0.92,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:-4}}
                      className="absolute top-full right-0 mt-1 z-50 w-56 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                      {[
                        { icon:Users,   label:"Profilni ko'rish",     action:()=>{ setShowProfilePanel(true); setShowChatMenu(false); } },
                        { icon:Search,  label:"Xabarda qidirish",      action:()=>{ setShowMsgSearch(true); setShowChatMenu(false); } },
                        { icon:Palette, label:"Fon tanlash",           action:()=>{ setShowBgPicker(true); setShowChatMenu(false); } },
                        { icon:Pin,     label:"Mahkamlangan xabarlar", action:()=>{ setShowPinnedPanel(true); setShowChatMenu(false); } },
                        { icon:Star,    label:"Yulduzli xabarlar",     action:()=>{ setShowStarredPanel(true); setShowChatMenu(false); } },
                        { icon:Bell,    label:convId&&mutedConvs.has(convId)?"Ovozni yoqish":"Ovozni o'chirish",
                          action:()=>{ if(!convId) return; setMutedConvs(p=>{const s=new Set(p);s.has(convId)?s.delete(convId):s.add(convId);return s;}); setShowChatMenu(false); } },
                        { icon:Share2,  label:"Kontaktni ulashish",    action:()=>{ addMsg({type:"text",content:`👤 ${getOther(activeConv)?.displayName||"Kontakt"}ning kartochkasi`}); setShowChatMenu(false); } },
                        { icon:Zap,     label:"Turbo rejim",           action:()=>{ setShowChatMenu(false); } },
                        { icon:Flag,    label:"Shikoyat",              action:()=>{ setShowChatMenu(false); }, danger:true },
                        { icon:Trash2,  label:"Tarixni tozalash",      action:()=>{ setShowClearConfirm(true); setShowChatMenu(false); }, danger:true },
                        { icon:Lock,    label:convId&&blockedConvs.has(convId)?"Blokdan chiqarish":"Bloklash",
                          action:()=>{ if(!convId) return; setBlockedConvs(p=>{const s=new Set(p);s.has(convId)?s.delete(convId):s.add(convId);return s;}); setShowChatMenu(false); }, danger:true },
                      ].map((item,i)=>(
                        <button key={i} onClick={item.action}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${(item as {danger?:boolean}).danger?"text-destructive":"text-foreground"}`}>
                          <item.icon className="w-4 h-4 flex-shrink-0 opacity-70"/>
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Selection mode bar */}
          <AnimatePresence>
            {selectedMsgs.size>0&&(
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/10 flex-shrink-0">
                <button onClick={()=>setSelectedMsgs(new Set())} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
                <span className="text-sm text-foreground flex-1">{selectedMsgs.size} ta tanlandi</span>
                <button onClick={()=>{ setForwardMsgId([...selectedMsgs][0]); setSelectedMsgs(new Set()); }} className="text-primary text-sm"><Forward className="w-4 h-4"/></button>
                <button onClick={()=>{ selectedMsgs.forEach(id=>setHiddenMsgIds(p=>new Set([...p,id]))); setLocalMsgs(p=>p.filter(m=>!selectedMsgs.has(m.id))); setSelectedMsgs(new Set()); }} className="text-destructive text-sm"><Trash2 className="w-4 h-4"/></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear confirm */}
          <AnimatePresence>
            {showClearConfirm&&(
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
                <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
                  className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm">
                  <h3 className="font-bold text-foreground mb-1">Tarixni tozalash</h3>
                  <p className="text-sm text-muted-foreground mb-4">Barcha xabarlar o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
                  <div className="flex gap-2">
                    <button onClick={()=>setShowClearConfirm(false)} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">Bekor qilish</button>
                    <button onClick={()=>{ setLocalMsgs([]); setShowClearConfirm(false); }} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">O'chirish</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete msg confirm */}
          <AnimatePresence>
            {deleteTarget&&(
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6"
                onClick={()=>setDeleteTarget(null)}>
                <motion.div initial={{scale:0.9,y:12}} animate={{scale:1,y:0}} exit={{scale:0.9,y:12}}
                  className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm"
                  onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-destructive"/>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Xabarni o'chirish</h3>
                      <p className="text-xs text-muted-foreground">Kim uchun o'chirishni tanlang</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {deleteTarget.isMe&&(
                      <button onClick={()=>{ setHiddenMsgIds(p=>new Set([...p,deleteTarget.id])); setLocalMsgs(p=>p.filter(m=>m.id!==deleteTarget.id)); setDeleteTarget(null); }}
                        className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90">
                        Hamma uchun o'chirish
                      </button>
                    )}
                    <button onClick={()=>{ setHiddenMsgIds(p=>new Set([...p,deleteTarget.id])); setLocalMsgs(p=>p.filter(m=>m.id!==deleteTarget.id)); setDeleteTarget(null); }}
                      className="w-full py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-muted">
                      Faqat men uchun o'chirish
                    </button>
                    <button onClick={()=>setDeleteTarget(null)} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Bekor qilish</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Background picker ────────────── */}
          <AnimatePresence>
            {showBgPicker&&(
              <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:28,stiffness:300}}
                className="absolute inset-0 z-40 bg-background flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                  <button onClick={()=>setShowBgPicker(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                  <span className="font-semibold">Suhbat foni</span>
                  <span className="ml-auto text-xs text-muted-foreground">{Object.keys(BG_THEMES).length} ta fon</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(BG_THEMES).map(([id,theme])=>{
                      const isActive = chatBgId===id;
                      return (
                        <button key={id}
                          onClick={()=>{ setChatBgId(id); localStorage.setItem("olcha_chat_bg",id); setShowBgPicker(false); }}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all ${isActive?"border-primary":"border-transparent hover:border-border/60"}`}
                          style={{height:110}}>
                          {/* Background preview */}
                          <div className="absolute inset-0" style={theme.style}/>
                          {/* Mini chat bubbles preview */}
                          <div className="absolute inset-0 flex flex-col justify-center px-2 gap-1.5">
                            <div className="self-end">
                              <div className="bg-primary text-[8px] text-primary-foreground px-2 py-1 rounded-xl rounded-br-sm max-w-[70px]">Salom!</div>
                            </div>
                            <div className="self-start">
                              <div className={`text-[8px] px-2 py-1 rounded-xl rounded-bl-sm max-w-[70px] ${id==="white_glass"?"bg-black/10 text-gray-800":"bg-white/10 text-white"}`}>Yaxshi!</div>
                            </div>
                          </div>
                          {/* Label */}
                          <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 flex items-center gap-1"
                            style={{background:id==="white_glass"?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}>
                            <span className="text-sm leading-none">{theme.emoji}</span>
                            <span className={`text-[11px] font-semibold truncate ${id==="white_glass"?"text-gray-800":"text-white"}`}>{theme.label}</span>
                            {isActive&&<div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-2.5 h-2.5 text-primary-foreground"/></div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Profile panel ─────────────────── */}
          <AnimatePresence>
            {showProfilePanel&&(()=>{
              const other = activeConv?.participants?.find(p=>p.id!==ME_ID);
              const notif = convId?notifPrefs[convId]||"all":"all";
              return (
                <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:28,stiffness:300}}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  {/* Profile header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={()=>setShowProfilePanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-semibold text-foreground">Profil</span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Avatar + info */}
                    <div className="px-6 py-8 flex flex-col items-center gap-3 bg-gradient-to-b from-primary/5 to-transparent">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-3xl font-bold text-primary-foreground overflow-hidden ring-4 ring-primary/20">
                          {other?.avatarUrl ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover"/> : other?.displayName?.[0]?.toUpperCase()||"?"}
                        </div>
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background"/>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-xl text-foreground">{other?.displayName||"Foydalanuvchi"}</p>
                        <p className="text-sm text-primary">@{other?.username||"username"}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>Onlayn
                        </p>
                      </div>

                      {/* Action row */}
                      <div className="flex gap-4 mt-2">
                        {[
                          { icon:MessageCircle, label:"Xabar",   color:"bg-primary/15 text-primary",
                            action:()=>setShowProfilePanel(false) },
                          { icon:Phone,         label:"Qo'ng'iroq", color:"bg-green-500/15 text-green-400",
                            action:()=>{ setShowProfilePanel(false); if(other?.id) startCall({id:other.id,name:other.displayName||"?",avatar:other.avatarUrl||undefined},"voice"); } },
                          { icon:Video,         label:"Video",   color:"bg-blue-500/15 text-blue-400",
                            action:()=>{ setShowProfilePanel(false); if(other?.id) startCall({id:other.id,name:other.displayName||"?",avatar:other.avatarUrl||undefined},"video"); } },
                          { icon:Share2,        label:"Ulashish", color:"bg-purple-500/15 text-purple-400",
                            action:()=>{ navigator.share?.({title:other?.displayName||"",text:`OlCha: @${other?.username}`}).catch(()=>{}); } },
                        ].map((btn,i)=>(
                          <button key={i} onClick={btn.action} className="flex flex-col items-center gap-1.5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${btn.color}`}>
                              <btn.icon className="w-5 h-5"/>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-border mx-4 mb-4">
                      {(["info","media","files"] as const).map(tb=>(
                        <button key={tb} onClick={()=>setProfileTab(tb)}
                          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${profileTab===tb?"border-b-2 border-primary text-primary":"text-muted-foreground"}`}>
                          {tb==="info"?"Ma'lumot":tb==="media"?"Media":"Fayllar"}
                        </button>
                      ))}
                    </div>

                    {/* Info tab */}
                    {profileTab==="info"&&(
                      <div className="px-4 space-y-3 pb-6">
                        <div className="space-y-2">
                          {[
                            {label:"Xabarlar",  value:String(displayMsgs.length)},
                            {label:"Media fayllar", value:String(mediaInChat.length)},
                            {label:"Ovozli xabarlar", value:String(displayMsgs.filter(m=>m.type==="voice").length)},
                            {label:"Yulduzli xabarlar", value:String(displayMsgs.filter(m=>m.starred).length)},
                          ].map(row=>(
                            <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-xl">
                              <span className="text-sm text-muted-foreground">{row.label}</span>
                              <span className="text-sm font-semibold text-foreground">{row.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Notification pref */}
                        <div className="bg-muted/40 rounded-xl overflow-hidden">
                          <p className="text-xs text-muted-foreground px-4 pt-3 pb-1 font-medium">Bildirishnomalar</p>
                          {(["all","mentions","none"] as const).map(lvl=>(
                            <button key={lvl} onClick={()=>convId&&setNotifPrefs(p=>({...p,[convId]:lvl}))}
                              className={`flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors ${notif===lvl?"text-primary":"text-foreground"}`}>
                              <span>{lvl==="all"?"Barcha bildirishnomalar":lvl==="mentions"?"Faqat mention":("Hech biri")}</span>
                              {notif===lvl&&<Check className="w-4 h-4"/>}
                            </button>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button onClick={()=>{ setShowProfilePanel(false); setShowMsgSearch(true); }}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                            <Search className="w-4 h-4 opacity-60"/>Xabarda qidirish
                          </button>
                          <button onClick={()=>{ setShowProfilePanel(false); setShowPinnedPanel(true); }}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                            <Pin className="w-4 h-4 opacity-60"/>Mahkamlangan xabarlar
                          </button>
                          <button onClick={()=>{ setShowProfilePanel(false); setShowStarredPanel(true); }}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                            <Star className="w-4 h-4 opacity-60"/>Yulduzli xabarlar
                          </button>
                          <button onClick={()=>{ if(!convId) return; setMutedConvs(p=>{const s=new Set(p);s.has(convId)?s.delete(convId):s.add(convId);return s;}); }}
                            className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                            <Bell className="w-4 h-4 opacity-60"/>
                            {convId&&mutedConvs.has(convId)?"Ovozni yoqish":"Ovozni o'chirish"}
                          </button>
                          <button onClick={()=>{ if(!convId) return; setBlockedConvs(p=>{const s=new Set(p);s.has(convId)?s.delete(convId):s.add(convId);return s;}); }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors">
                            <Lock className="w-4 h-4 opacity-70"/>
                            {convId&&blockedConvs.has(convId)?"Blokdan chiqarish":"Bloklash"}
                          </button>
                          <button onClick={()=>{ setShowClearConfirm(true); setShowProfilePanel(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4 opacity-70"/>Suhbatni tozalash
                          </button>
                          <button
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors">
                            <Flag className="w-4 h-4 opacity-70"/>Shikoyat berish
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Media tab */}
                    {profileTab==="media"&&(
                      <div className="px-4 pb-6">
                        {mediaInChat.length===0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-20"/>
                            <p className="text-sm">Media fayllar yo'q</p>
                            <p className="text-xs opacity-60 mt-1">Rasm yoki video yuboring</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1">
                            {mediaInChat.map(m=>(
                              <div key={m.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
                                <img src={m.mediaUrl} alt="" className="w-full h-full object-cover"/>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Files tab */}
                    {profileTab==="files"&&(
                      <div className="px-4 pb-6 space-y-2">
                        {filesInChat.length===0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <File className="w-12 h-12 mb-2 opacity-20"/>
                            <p className="text-sm">Fayllar yo'q</p>
                          </div>
                        ) : filesInChat.map(m=>(
                          <div key={m.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                              <File className="w-5 h-5 text-primary"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.fileName||"Fayl"}</p>
                              <p className="text-[10px] text-muted-foreground">{formatTs(m.ts)}</p>
                            </div>
                            {m.mediaUrl&&<a href={m.mediaUrl} download className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"><Download className="w-3.5 h-3.5"/></a>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Pinned panel ──────────────────── */}
          <AnimatePresence>
            {showPinnedPanel&&(()=>{
              const pinned = displayMsgs.filter(m=>m.pinned);
              return (
                <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:28,stiffness:300}}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={()=>setShowPinnedPanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-semibold text-foreground">Mahkamlangan xabarlar</span>
                    <span className="ml-auto text-xs text-muted-foreground">{pinned.length} ta</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {pinned.length===0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Pin className="w-10 h-10 mb-2 opacity-20"/>
                        <p className="text-sm">Mahkamlangan xabarlar yo'q</p>
                        <p className="text-xs opacity-60 mt-1">Xabarni uzoq bosib mahkamlang</p>
                      </div>
                    ) : pinned.map(m=>(
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                        <Pin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2">{m.content||"📎 Media"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTs(m.ts)}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={()=>{ setPinnedMsg(m); setShowPinnedPanel(false); }} className="text-xs text-primary hover:underline">Ko'rish</button>
                          <button onClick={()=>updateMsg(m.id,{pinned:false})} className="text-xs text-muted-foreground hover:text-destructive ml-2">Olib tashlash</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Starred panel ─────────────────── */}
          <AnimatePresence>
            {showStarredPanel&&(()=>{
              const starred = displayMsgs.filter(m=>m.starred);
              return (
                <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:28,stiffness:300}}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={()=>setShowStarredPanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button>
                    <span className="font-semibold text-foreground">Yulduzli xabarlar</span>
                    <span className="ml-auto text-xs text-muted-foreground">{starred.length} ta</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {starred.length===0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Star className="w-10 h-10 mb-2 opacity-20"/>
                        <p className="text-sm">Yulduzli xabarlar yo'q</p>
                        <p className="text-xs opacity-60 mt-1">Xabarni uzoq bosib yulduzga qo'shing</p>
                      </div>
                    ) : starred.map(m=>(
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mt-0.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          {m.type==="image"&&m.mediaUrl&&<img src={m.mediaUrl} alt="" className="w-16 h-16 rounded-xl object-cover mb-1"/>}
                          <p className="text-sm text-foreground line-clamp-2">{m.content||"📎 Media"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTs(m.ts)}</p>
                        </div>
                        <button onClick={()=>updateMsg(m.id,{starred:false})} className="text-xs text-destructive hover:underline flex-shrink-0">Olib tashlash</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Pinned msg bar */}
          <AnimatePresence>
            {pinnedMsg&&(
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10 flex-shrink-0 cursor-pointer"
                onClick={()=>setPinnedMsg(null)}>
                <Pin className="w-3 h-3 text-primary flex-shrink-0"/>
                <p className="flex-1 text-xs text-foreground truncate">{pinnedMsg.content||"📎 Media"}</p>
                <button onClick={()=>setPinnedMsg(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3"/></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ghost banner */}
          <AnimatePresence>
            {ephemeral&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/8 border-b border-violet-500/20 flex-shrink-0">
                <Ghost className="w-3.5 h-3.5 text-violet-400 animate-pulse flex-shrink-0"/>
                <p className="text-xs text-violet-400 font-medium">{t("msg.ghost_banner")}</p>
                <button onClick={()=>setEphemeral(false)} className="ml-auto text-violet-400/60 hover:text-violet-400"><X className="w-3 h-3"/></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages area */}
          <div ref={listRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
            style={BG_THEMES[chatBgId]?.style??BG_THEMES.glass.style}>
            {displayMsgs.map((msg,i)=>{
              const isMe = msg.senderId===ME_ID;
              const prevMsg = displayMsgs[i-1];
              const showDate = !prevMsg||!isSameDay(msg.ts,prevMsg.ts);
              return (
                <div key={msg.id}>
                  {showDate&&(
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{dayLabel(msg.ts)}</span>
                    </div>
                  )}
                  <MsgBubble
                    msg={msg} isMe={isMe}
                    selected={selectedMsgs.has(msg.id)}
                    onReply={m=>setReplyTo(m)}
                    onDelete={(id)=>setDeleteTarget({id,isMe})}
                    onUpdate={(id,patch)=>setLocalMsgs(prev=>prev.map(m=>m.id===id?{...m,...patch}:m))}
                    onForward={(id)=>setForwardMsgId(id)}
                    onSelect={(id)=>toggleSelect(id)}
                  />
                </div>
              );
            })}
            {displayMsgs.length===0&&(
              <div className="text-center text-muted-foreground py-12">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                <p className="text-sm">{t("msg.say_hello")}</p>
                <p className="text-xs mt-1 opacity-60">👋 Salom yuboring!</p>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Jump to bottom */}
          <AnimatePresence>
            {showScrollBtn&&(
              <motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
                onClick={()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"})}
                className="absolute bottom-24 right-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-primary hover:bg-muted z-10">
                <ChevronDown className="w-5 h-5"/>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Voice recording overlay */}
          <AnimatePresence>
            {voiceRec&&(
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 bg-background/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <Mic className="w-10 h-10 text-red-400 animate-pulse"/>
                </div>
                <p className="text-2xl font-mono font-bold text-foreground">{formatDur(voiceElapsed)}</p>
                <p className="text-sm text-muted-foreground">Ovozli xabar yozilmoqda...</p>
                <div className="flex gap-4">
                  <button onClick={cancelVoice} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-sm"><X className="w-4 h-4"/>Bekor</button>
                  <button onClick={stopVoice} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold"><Send className="w-4 h-4"/>Yuborish</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply bar */}
          <AnimatePresence>
            {replyTo&&(
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-t border-primary/20 flex-shrink-0">
                <Reply className="w-4 h-4 text-primary flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-primary font-semibold">{replyTo.senderId===ME_ID?"Siz":getOther(activeConv)?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.content||"📎 Media"}</p>
                </div>
                <button onClick={()=>setReplyTo(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className={`px-3 flex-shrink-0 border-t transition-colors relative ${ephemeral?"border-violet-500/30 bg-violet-500/5":"border-border"}`}
            style={{paddingTop:10,paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 10px)"}}>

            {/* Emoji picker — rendered as portal-style modal via AnimatePresence */}
            <AnimatePresence>
              {showEmoji&&(
                <EmojiPicker
                  onPick={e=>{
                    if(["😊","😂","❤️","👍","🔥","🎉","😭","🤣"].includes(e)) handleSticker(e);
                    else setText(prev=>prev+e);
                    setShowEmoji(false);
                  }}
                  onClose={()=>setShowEmoji(false)}
                />
              )}
            </AnimatePresence>

            {/* Attach menu */}
            <AnimatePresence>
              {showAttach&&(
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                  className="absolute bottom-full mb-2 left-3 z-30">
                  <AttachMenu
                    onPhoto={()=>imgInputRef.current?.click()}
                    onFile={()=>fileInputRef.current?.click()}
                    onLocation={()=>{
                      if(navigator.geolocation){
                        navigator.geolocation.getCurrentPosition(
                          pos=>addMsg({type:"text",content:`📍 Joylashuv: ${pos.coords.latitude.toFixed(5)}° N, ${pos.coords.longitude.toFixed(5)}° E`}),
                          ()=>addMsg({type:"text",content:"📍 Joylashuv: Toshkent, O'zbekiston (41.29950° N, 69.24010° E)"})
                        );
                      } else {
                        addMsg({type:"text",content:"📍 Joylashuv: Toshkent, O'zbekiston (41.29950° N, 69.24010° E)"});
                      }
                    }}
                    onPoll={()=>{ setShowAttach(false); setShowPollCreator(true); }}
                    onSticker={()=>{ setShowAttach(false); setShowEmoji(true); }}
                    onContact={()=>{ setShowAttach(false); setShowContactPicker(true); }}
                    onGif={()=>{ setShowAttach(false); setShowGifPicker(true); }}
                    onClose={()=>setShowAttach(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formatting bar */}
            <AnimatePresence>
              {showFmtBar&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                  className="flex items-center gap-1 px-1 pb-1 overflow-x-auto">
                  {[
                    { icon:Bold,      label:"Qalin",   before:"**", after:"**" },
                    { icon:Italic,    label:"Kursiv",  before:"_",  after:"_" },
                    { icon:AlignLeft, label:"Blok",    before:"> ", after:"" },
                    { icon:Hash,      label:"Kod",     before:"`",  after:"`" },
                    { icon:AtSign,    label:"Mention", before:"@",  after:"" },
                    { icon:Link,      label:"Havola",  before:"[",  after:"](url)" },
                  ].map(fmt=>(
                    <button key={fmt.label}
                      onClick={()=>insertFmt(fmt.before,fmt.after)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title={fmt.label}>
                      <fmt.icon className="w-3.5 h-3.5"/>
                    </button>
                  ))}
                  <div className="w-px h-5 bg-border mx-1 flex-shrink-0"/>
                  {["❤️","😂","🔥","👍","🎉","💯"].map(e=>(
                    <button key={e} onClick={()=>setText(prev=>prev+e)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-base transition-colors">{e}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule bar */}
            <AnimatePresence>
              {scheduleMode&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                  className="flex items-center gap-2 px-1 pb-1">
                  <Clock3 className="w-3.5 h-3.5 text-primary flex-shrink-0"/>
                  <span className="text-xs text-muted-foreground">Yuborish vaqti:</span>
                  <input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
                    className="flex-1 text-xs bg-muted rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"/>
                  <button onClick={()=>setScheduleMode(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <button onClick={()=>{ setShowAttach(v=>!v); setShowEmoji(false); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 mb-0.5 ${showAttach?"bg-primary/15 text-primary":"bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Plus className="w-4 h-4"/>
              </button>

              <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden transition-colors ${ephemeral?"border-violet-500/40 bg-violet-500/5":"border-border bg-card"}`}>
                <textarea ref={textareaRef} value={text} onChange={e=>setText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} }}
                  placeholder={ephemeral?t("msg.ghost_ph"):scheduleMode?"Rejalashtirilgan xabar...":t("msg.msg_ph")}
                  rows={1}
                  className="flex-1 px-4 pt-2.5 pb-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none resize-none max-h-28"
                  style={{fieldSizing:"content"} as React.CSSProperties}/>
                <div className="flex items-center px-2 pb-1.5 gap-0.5 overflow-x-auto">
                  <button onClick={()=>{ setShowEmoji(v=>!v); setShowAttach(false); }}
                    title="Emoji"
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${showEmoji?"text-primary bg-primary/10":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Smile className="w-4 h-4"/>
                  </button>
                  <button onClick={()=>setShowFmtBar(v=>!v)}
                    title="Formatlash"
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${showFmtBar?"text-primary bg-primary/10":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Bold className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>setScheduleMode(v=>!v)}
                    title="Vaqt belgilash"
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${scheduleMode?"text-amber-500 bg-amber-500/10":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Clock3 className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>setEphemeral(v=>!v)}
                    title="Ko'rinmas xabar"
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${ephemeral?"text-violet-400 bg-violet-500/10":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Ghost className="w-3.5 h-3.5"/>
                  </button>
                  <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0"/>
                  {["❤️","😂","🔥","👍","🎉","🥰"].map(em=>(
                    <button key={em} onClick={()=>setText(p=>p+em)}
                      className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-sm hover:bg-muted transition-colors">{em}</button>
                  ))}
                  <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0"/>
                  <button onClick={()=>addMsg({type:"text",content:"📍 Joylashuv: Toshkent, O'zbekiston"})}
                    title="Joylashuv"
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <MapPin className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>{ setText(p=>p+"@"); textareaRef.current?.focus(); }}
                    title="Mention"
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <AtSign className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>{ setShowDraw(true); setShowEmoji(false); setShowAttach(false); }}
                    title="Kanvasda chiz"
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${showDraw?"text-primary bg-primary/10":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <PenLine className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {text.trim() ? (
                <motion.button whileTap={{scale:0.9}} onClick={handleSend}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 ${scheduleMode?"bg-amber-600 text-white":ephemeral?"bg-violet-600 text-white":"bg-primary text-primary-foreground"}`}>
                  {scheduleMode?<Clock3 className="w-4 h-4"/>:ephemeral?<Ghost className="w-4 h-4"/>:<Send className="w-4 h-4"/>}
                </motion.button>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                  <motion.button whileTap={{scale:0.9}} onClick={()=>setShowRoundVid(true)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                    <Camera className="w-4 h-4"/>
                  </motion.button>
                  <motion.button
                    onPointerDown={startVoice} onPointerUp={stopVoice} onPointerLeave={cancelVoice}
                    whileTap={{scale:0.9}}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${voiceRec?"bg-red-500 text-white":"bg-primary text-primary-foreground"}`}>
                    <Mic className="w-4 h-4"/>
                  </motion.button>
                </div>
              )}
            </div>

            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handleImage(f); e.target.value=""; }}/>
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }}/>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageCircle className="w-12 h-12 opacity-20"/>
          <p className="text-sm">{t("msg.select_conv")}</p>
        </div>
      )}

      {/* ── Drawing canvas ───────────────────────────────────────── */}
      <AnimatePresence>
        {showDraw&&(
          <DrawingCanvas onSend={handleDrawingSend} onClose={()=>setShowDraw(false)}/>
        )}
      </AnimatePresence>

      {/* ── Round video recorder ─────────────────────────────────── */}
      <AnimatePresence>
        {showRoundVid&&(
          <RoundVideoRecorder onSend={handleVideoNote} onClose={()=>setShowRoundVid(false)}/>
        )}
      </AnimatePresence>

      {/* ── New conversation modal ────────────────────────────── */}
      <AnimatePresence>
        {showNewConv&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
            onClick={()=>setShowNewConv(false)}>
            <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{type:"spring",damping:28,stiffness:300}}
              className="bg-card border border-border rounded-t-3xl md:rounded-3xl w-full md:max-w-sm max-h-[70vh] flex flex-col shadow-2xl"
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
                <span className="font-bold text-foreground text-base">Yangi suhbat</span>
                <button onClick={()=>setShowNewConv(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center"><X className="w-4 h-4"/></button>
              </div>
              <div className="px-4 py-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
                  <input placeholder="Kontakt qidirish..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-transparent focus:border-primary/40 transition-colors"/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Suhbatlar</p>
                {convs.slice(0,8).map(conv=>{
                  const o = getOther(conv);
                  return (
                    <button key={conv.id}
                      onClick={()=>{ setActiveId(conv.id); setShowList(false); setShowNewConv(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-colors text-left">
                      <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {o?.avatarUrl ? <img src={o.avatarUrl} alt="" className="w-full h-full object-cover"/> : <span className="font-bold text-primary text-sm">{o?.displayName?.[0]||"?"}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{o?.displayName||"Unknown"}</p>
                        <p className="text-xs text-muted-foreground">@{o?.username||"user"}</p>
                      </div>
                    </button>
                  );
                })}
                <div className="pt-2 border-t border-border mt-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-emerald-400"/>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Guruh yaratish</p>
                      <p className="text-xs text-muted-foreground">Ko'p a'zoli suhbat</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forward modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {forwardMsgId&&(
          <ForwardModal convs={convs} me={ME_ID}
            onForward={(targetId)=>{
              const msg = displayMsgs.find(m=>m.id===forwardMsgId);
              if(msg) {
                const id = uid();
                setLocalMsgs(prev=>[...prev,{...msg,id,forwarded:true,ts:new Date(),status:"sending"}]);
                setTimeout(()=>setLocalMsgs(p=>p.map(m=>m.id===id?{...m,status:"read"}:m)),2000);
              }
              setForwardMsgId(null);
            }}
            onClose={()=>setForwardMsgId(null)}/>
        )}
      </AnimatePresence>

      {/* ── Poll creator ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showPollCreator&&(
          <PollCreator
            onSend={(title,opts)=>{
              addMsg({type:"poll",pollTitle:title,pollOptions:opts,content:title});
              setShowPollCreator(false);
            }}
            onClose={()=>setShowPollCreator(false)}/>
        )}
      </AnimatePresence>

      {/* ── GIF picker ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showGifPicker&&(
          <GifPickerModal
            onPick={(url)=>{ addMsg({type:"image",mediaUrl:url,content:""}); setShowGifPicker(false); }}
            onClose={()=>setShowGifPicker(false)}/>
        )}
      </AnimatePresence>

      {/* ── Contact picker ───────────────────────────────────────── */}
      <AnimatePresence>
        {showContactPicker&&(
          <ContactPickerModal
            users={allUsers}
            onPick={(u)=>{ addMsg({type:"text",content:`👤 *${u.displayName}*\n@${u.username}${u.bio?"\n"+u.bio:""}`}); }}
            onClose={()=>setShowContactPicker(false)}/>
        )}
      </AnimatePresence>
    </div>
  );
}
