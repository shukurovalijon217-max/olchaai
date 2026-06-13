/**
 * ProfileOrb — orb'dan kengayuvchi radial + floating panel UX.
 *
 * Ishlash tartibi:
 *   1. Orb → bosish → radial menyu (5 ta ikonka atrofga uchadi)
 *   2. SMS ni bosish → suhbatlar radial doirachalarga aylanib atrofga uchadi
 *   3. Suhbat doirachasini bosish → floating chat paneli orb'dan kengayib chiqadi
 *   4. "Orqaga" → panel orb'ga qaytib qisqaradi, keyin yana radial suhbatlar
 *   5. Yopish / X → barchasi orb ichiga qaytadi
 *
 *   Call / Comment / Post: to'g'ridan-to'g'ri orb'dan kengayib chiqqan floating panel.
 *   Video: to'g'ridan-to'g'ri floating panel.
 */
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useAnimation, animate,
} from "framer-motion";
import {
  Phone, Video, MessageSquare, MessageCircle, FileText,
  PhoneIncoming, PhoneMissed, PhoneOutgoing,
  X, ChevronLeft, Send, Camera, Mic, MicOff, CameraOff,
  Heart, MoreHorizontal, Smile, ImageIcon, Trash2, Archive, Bookmark,
  CheckCheck, Loader2, Plus, BookOpen, RefreshCw,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  useListConversations,
  useGetConversationMessages,
  useSendMessage,
  useCreateConversation,
  getGetConversationMessagesQueryKey,
  useListPosts,
  useLikePost,
  useCreatePost,
  useListPostComments,
  useCreatePostComment,
  type Conversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
interface OrbUser { displayName: string; username: string; avatarUrl?: string | null }
interface ProfileOrbProps { targetUser: OrbUser; targetUserId: number; isOwner?: boolean }

type OrbMode =
  | "idle"
  | "menu"
  | "sms-convs"                                   // radial suhbatlar
  | { panel: "sms-thread"; convId: number; convName: string }
  | { panel: "call" }
  | { panel: "video" }
  | { panel: "comment"; postId?: number }
  | { panel: "post"; composing?: boolean };

const PAGES = [
  { id: "call"    as const, label: "Qo'ng'iroq",  icon: Phone,         color: "#22c55e", bg: "linear-gradient(135deg,#22c55e,#16a34a)" },
  { id: "video"   as const, label: "Video",        icon: Video,         color: "#3b82f6", bg: "linear-gradient(135deg,#3b82f6,#2563eb)" },
  { id: "sms"     as const, label: "SMS",          icon: MessageSquare, color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "comment" as const, label: "Kommentariy",  icon: MessageCircle, color: "#a855f7", bg: "linear-gradient(135deg,#a855f7,#7c3aed)" },
  { id: "post"    as const, label: "Post",         icon: FileText,      color: "#ec4899", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
] as const;

/* ══════════════════════════════════════════════════════════════
   SWIPEABLE ROW  (chapga = o'chirish, o'ngga = arxiv)
══════════════════════════════════════════════════════════════ */
const SWP = 78;
function SwipeableRow({ id, children, onDelete, onArchive, archiveLabel = "Arxiv" }:
  { id: string|number; children: React.ReactNode; onDelete?:()=>void; onArchive?:()=>void; archiveLabel?: string }) {
  const x = useMotionValue(0);
  const [gone, setGone] = useState<null|"del"|"arc">(null);

  const delBg  = useTransform(x, [-SWP*2.2, -SWP, 0], ["rgba(239,68,68,.97)","rgba(239,68,68,.72)","rgba(239,68,68,0)"]);
  const arcBg  = useTransform(x, [0, SWP, SWP*2.2],    ["rgba(124,58,237,0)","rgba(124,58,237,.72)","rgba(124,58,237,.97)"]);
  const delSc  = useTransform(x, [-SWP*1.5, -SWP, 0],  [1.18, 1, 0.55]);
  const arcSc  = useTransform(x, [0, SWP, SWP*1.5],    [0.55, 1, 1.18]);

  const end = (_: unknown, info: { velocity:{x:number}; offset:{x:number} }) => {
    const { offset: { x: ox }, velocity: { x: vx } } = info;
    if (ox < -SWP || vx < -550) {
      animate(x, -520, { type:"spring", stiffness:340, damping:32 });
      setGone("del"); setTimeout(()=>onDelete?.(), 300);
    } else if (ox > SWP || vx > 550) {
      animate(x, 520, { type:"spring", stiffness:340, damping:32 });
      setGone("arc"); setTimeout(()=>onArchive?.(), 300);
    } else {
      animate(x, 0, { type:"spring", stiffness:620, damping:44 });
    }
  };

  return (
    <div key={id} style={{ position:"relative", overflow:"hidden", borderRadius:16 }}>
      <motion.div style={{ backgroundColor:delBg }} className="absolute inset-0 flex items-center justify-end pr-4 rounded-2xl pointer-events-none z-0">
        <motion.div style={{ scale:delSc }} className="flex flex-col items-center gap-0.5">
          <Trash2 className="w-4 h-4 text-white"/><span className="text-[9px] font-bold text-white/90">O'chirish</span>
        </motion.div>
      </motion.div>
      <motion.div style={{ backgroundColor:arcBg }} className="absolute inset-0 flex items-center justify-start pl-4 rounded-2xl pointer-events-none z-0">
        <motion.div style={{ scale:arcSc }} className="flex flex-col items-center gap-0.5">
          <Archive className="w-4 h-4 text-white"/><span className="text-[9px] font-bold text-white/90">{archiveLabel}</span>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {gone === null && (
          <motion.div drag="x" dragMomentum={false} dragElastic={0.07}
            style={{ x, position:"relative", zIndex:1 }} onDragEnd={end}
            exit={{ opacity:0, scale:0.9, transition:{ duration:0.18 } }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {gone !== null && (
        <motion.div initial={{ height:"auto" }} animate={{ height:0 }} transition={{ duration:0.28, delay:0.12 }}
          className="overflow-hidden" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FLOATING PANEL  (orb'dan kengayib chiqadi, originating from ORB)
   originX=1, originY=1 → pastki-o'ng burchakdan (= orb pozitsiyasi)
══════════════════════════════════════════════════════════════ */
const PANEL_W = 308;

function FloatingPanel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <motion.div
      initial={{ scale:0.04, opacity:0 }}
      animate={{ scale:1, opacity:1 }}
      exit={{ scale:0.04, opacity:0 }}
      transition={{ type:"spring", stiffness:380, damping:34, mass:0.9 }}
      style={{
        position:"absolute", bottom:72, right:0,
        width:PANEL_W, maxHeight:"min(64vh,440px)",
        display:"flex", flexDirection:"column",
        borderRadius:24,
        background:"hsl(var(--card))",
        border:"1px solid rgba(255,255,255,0.07)",
        boxShadow:`0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), 0 0 60px ${color}22`,
        overflow:"hidden",
        originX:1, originY:1,
        zIndex:200,
      }}>
      {/* Colour stripe at top */}
      <div style={{ height:2.5, background:`linear-gradient(90deg,transparent,${color}99 35%,${color}cc 50%,${color}99 65%,transparent)`, flexShrink:0 }} />
      {children}
    </motion.div>
  );
}

/* ── Panel header ─────────────────────────────────────────── */
function PanelHeader({ title, color, bg, Icon, onBack, onClose }:
  { title:string; color:string; bg:string; Icon:React.ElementType; onBack?:()=>void; onClose:()=>void }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/8 flex-shrink-0">
      {onBack && (
        <motion.button whileTap={{ scale:0.85 }} onClick={onBack}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
          <ChevronLeft className="w-4 h-4 text-muted-foreground"/>
        </motion.button>
      )}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background:bg, boxShadow:`0 0 12px ${color}55` }}>
        <Icon style={{ width:14, height:14, color:"#fff" }}/>
      </div>
      <p className="text-sm font-bold text-foreground flex-1 truncate">{title}</p>
      <motion.button whileTap={{ scale:0.85 }} onClick={onClose}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
        <X className="w-4 h-4 text-muted-foreground"/>
      </motion.button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SMS RADIAL CONVERSATIONS  (suhbatlar doirachalar bo'lib atrofga uchadi)
══════════════════════════════════════════════════════════════ */
function SmsRadialConvs({
  convs, meId, onSelect, onNewConv, isCreating, onClose,
}: {
  convs: Conversation[];
  meId: number;
  onSelect: (convId: number, name: string) => void;
  onNewConv: () => void;
  isCreating: boolean;
  onClose: () => void;
}) {
  const items = convs.slice(0, 6);
  const count = items.length;
  const R = 100;
  // Arc: from -60° to -240° (upper-left semicircle)
  const startAngle = -Math.PI * 0.35;
  const endAngle   = -Math.PI * 1.35;

  const getOther = (conv: (typeof convs)[0]) =>
    conv.participants?.find(p => p.id !== meId) ?? conv.participants?.[0];

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 z-[8998]" onClick={onClose} />

      {/* Radial conversation items */}
      <AnimatePresence>
        {items.map((conv, i) => {
          const t = count <= 1 ? 0.5 : i / (count - 1);
          const angle = startAngle + t * (endAngle - startAngle);
          const tx = Math.cos(angle) * R;
          const ty = Math.sin(angle) * R;
          const other = getOther(conv);
          const initials = (other?.displayName ?? "?").charAt(0).toUpperCase();
          const hue = (conv.id * 57 + 120) % 360;

          return (
            <motion.button key={conv.id}
              initial={{ x:0, y:0, scale:0, opacity:0 }}
              animate={{ x:[0,tx], y:[0,ty], scale:[0,1.22,1], opacity:1 }}
              exit={{ x:0, y:0, scale:0, opacity:0, transition:{ type:"spring", stiffness:900, damping:20, delay: i * 0.015 } }}
              transition={{ type:"spring", stiffness:820, damping:16, delay: i * 0.025 }}
              onClick={e => { e.stopPropagation(); onSelect(conv.id, other?.displayName ?? "Chat"); }}
              whileHover={{ scale:1.22 }} whileTap={{ scale:0.82 }}
              style={{
                position:"absolute",
                top:28 - 22, left:28 - 22,   // centre on orb
                width:44, height:44,
                borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, fontWeight:800, color:"#fff",
                background:`conic-gradient(from 0deg, hsl(${hue},70%,48%), hsl(${(hue+80)%360},70%,52%))`,
                boxShadow:`0 0 18px hsla(${hue},70%,50%,0.55), 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)`,
                border:"2px solid rgba(255,255,255,0.18)",
                cursor:"pointer", zIndex:9001,
              }}>
              {initials}
              {/* Pulse ring */}
              <motion.div animate={{ scale:[1,1.7,1], opacity:[0.5,0,0.5] }}
                transition={{ duration:1.4, repeat:Infinity, delay: i * 0.22 }}
                style={{ position:"absolute", inset:-6, borderRadius:"50%", background:`hsla(${hue},70%,50%,0.22)`, pointerEvents:"none" }} />
              {/* Float drift after appear */}
              <motion.div
                animate={{ y:[0, -5*(i%2===0?1:-1), 4*(i%3===0?-1:1), 0], x:[0, 3*(i%2===0?-1:1), -4*(i%3===0?1:-1), 0] }}
                transition={{ duration: 2.2 + i*0.3, repeat:Infinity, ease:"easeInOut", delay: i*0.18 + 0.4 }}
                style={{ position:"absolute", inset:0, borderRadius:"50%", pointerEvents:"none" }} />
              {/* Name label */}
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.06 + 0.15 }}
                style={{ position:"absolute", bottom:-18, left:"50%", transform:"translateX(-50%)", fontSize:9, fontWeight:700, color:`hsl(${hue},70%,62%)`, textShadow:`0 0 8px hsla(${hue},70%,50%,0.8)`, whiteSpace:"nowrap", pointerEvents:"none" }}>
                {(other?.displayName ?? "?").split(" ")[0]}
              </motion.span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* "New conversation" button — top-left */}
      <motion.button
        initial={{ x:0, y:0, scale:0, opacity:0 }}
        animate={{ x:-38, y:-108, scale:1, opacity:1 }}
        exit={{ x:0, y:0, scale:0, opacity:0, transition:{ duration:0.15 } }}
        transition={{ type:"spring", stiffness:460, damping:30, delay: items.length * 0.06 + 0.04 }}
        onClick={e => { e.stopPropagation(); onNewConv(); }}
        whileHover={{ scale:1.15 }} whileTap={{ scale:0.85 }}
        disabled={isCreating}
        style={{ position:"absolute", top:28-18, left:28-18, width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f59e0b,#d97706)", boxShadow:"0 0 16px rgba(245,158,11,0.55)", border:"2px solid rgba(255,255,255,0.2)", cursor:"pointer", zIndex:9001 }}>
        {isCreating ? <Loader2 className="w-4 h-4 text-white animate-spin"/> : <Plus className="w-4 h-4 text-white"/>}
        <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
          style={{ position:"absolute", bottom:-16, left:"50%", transform:"translateX(-50%)", fontSize:9, fontWeight:700, color:"#f59e0b", textShadow:"0 0 8px rgba(245,158,11,0.8)", whiteSpace:"nowrap", pointerEvents:"none" }}>
          Yangi
        </motion.span>
      </motion.button>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SMS THREAD PANEL
══════════════════════════════════════════════════════════════ */
function SmsPanelContent({ convId, meId, convName, onBack, onClose }:
  { convId:number; meId:number; convName:string; onBack:()=>void; onClose:()=>void }) {
  const qc = useQueryClient();
  const { data:messages=[], isLoading } = useGetConversationMessages(convId, {
    query:{ enabled:true, queryKey:getGetConversationMessagesQueryKey(convId), refetchInterval:4000 },
  });
  const send = useSendMessage();
  const [text, setText] = useState("");
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    send.mutate({ id:convId, data:{ senderId:meId, content:text } }, {
      onSuccess:()=>{ qc.invalidateQueries({ queryKey:getGetConversationMessagesQueryKey(convId) }); setText(""); },
    });
  };

  const visible = messages.filter(m => !deleted.has(m.id));

  return (
    <>
      <PanelHeader title={convName} color="#f59e0b" bg="linear-gradient(135deg,#f59e0b,#d97706)"
        Icon={MessageSquare} onBack={onBack} onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ minHeight:0 }}>
        {isLoading
          ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin"/></div>
          : visible.length === 0
          ? <div className="text-center py-6 text-muted-foreground text-xs"><MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-20"/>Xabarlar yo'q</div>
          : visible.map((m, i) => {
              const isMe = m.senderId === meId;
              return (
                <motion.div key={m.id}
                  initial={{ opacity:0, y:8, scale:0.93 }} animate={{ opacity:1, y:0, scale:1 }}
                  transition={{ delay:Math.min(i*0.03,0.2), type:"spring", stiffness:440, damping:32 }}>
                  <SwipeableRow id={m.id}
                    onDelete={()=>setDeleted(p=>new Set([...p,m.id]))}
                    onArchive={()=>setDeleted(p=>new Set([...p,m.id]))}
                    archiveLabel="Saqlash">
                    <div className={`flex ${isMe?"justify-end":"justify-start"} py-0.5`}>
                      <div className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe ? "rounded-br-sm text-white" : "rounded-bl-sm text-foreground bg-white/8 border border-white/10"
                      }`} style={isMe?{ background:"linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow:"0 2px 12px rgba(124,58,237,0.35)" }:{}}>
                        {m.content}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMe?"justify-end":""}`}>
                          <span className="text-[10px] opacity-45">
                            {new Date(m.createdAt).toLocaleTimeString("uz-UZ",{ hour:"2-digit", minute:"2-digit" })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-300 opacity-55"/>}
                        </div>
                      </div>
                    </div>
                  </SwipeableRow>
                </motion.div>
              );
            })
        }
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div className="px-2.5 py-2 border-t border-white/8 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-2xl border border-white/10 bg-white/5">
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),handleSend())}
            placeholder="Xabar…" maxLength={1000}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"/>
          <button className="opacity-55 hover:opacity-90"><Smile className="w-4 h-4 text-foreground"/></button>
          <motion.button whileTap={{ scale:0.85 }} onClick={handleSend}
            disabled={!text.trim()||send.isPending}
            className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background:text.trim()?"linear-gradient(135deg,#7c3aed,#a855f7)":"rgba(255,255,255,0.06)" }}>
            {send.isPending ? <Loader2 className="w-3 h-3 text-white animate-spin"/> : <Send className="w-3 h-3 text-white"/>}
          </motion.button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   CALL PANEL
══════════════════════════════════════════════════════════════ */
const INIT_CALLS = [
  { id:1, name:"Jasur T.",   time:"14:32", dur:"3:21", type:"incoming" as const },
  { id:2, name:"Nilufar Y.", time:"11:05", dur:null,   type:"missed"   as const },
  { id:3, name:"Bobur R.",   time:"22:17", dur:"1:45", type:"outgoing" as const },
  { id:4, name:"Malika K.",  time:"19:00", dur:null,   type:"missed"   as const },
  { id:5, name:"Sanjar U.",  time:"Kecha", dur:"8:02", type:"incoming" as const },
];
function CallPanelContent({ onClose }:{ onClose:()=>void }) {
  const [calls, setCalls] = useState(INIT_CALLS);
  const [calling, setCalling] = useState<number|null>(null);
  const typeIcon = (t:"incoming"|"missed"|"outgoing") =>
    t==="incoming"?<PhoneIncoming className="w-3 h-3 text-emerald-400"/>
    :t==="missed"?<PhoneMissed className="w-3 h-3 text-red-400"/>
    :<PhoneOutgoing className="w-3 h-3 text-blue-400"/>;
  return (
    <>
      <PanelHeader title="Qo'ng'iroqlar" color="#22c55e" bg="linear-gradient(135deg,#22c55e,#16a34a)"
        Icon={Phone} onClose={onClose}/>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ minHeight:0 }}>
        {calls.length===0
          ? <div className="text-center py-6 text-muted-foreground text-xs"><Phone className="w-6 h-6 mx-auto mb-1 opacity-20"/>Yo'q</div>
          : calls.map((c,i)=>(
            <motion.div key={c.id} initial={{ x:-24, opacity:0 }} animate={{ x:0, opacity:1 }}
              transition={{ delay:i*0.06, type:"spring", stiffness:420, damping:30 }}>
              <SwipeableRow id={c.id}
                onDelete={()=>setCalls(p=>p.filter(x=>x.id!==c.id))}
                onArchive={()=>setCalls(p=>p.filter(x=>x.id!==c.id))}
                archiveLabel="Saqlash">
                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
                  c.type==="incoming"?"border-emerald-500/20 bg-emerald-500/5"
                  :c.type==="missed"?"border-red-500/20 bg-red-500/5"
                  :"border-blue-500/20 bg-blue-500/5"}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background:"linear-gradient(135deg,#7c3aed,#db2777)", boxShadow:"0 0 12px rgba(124,58,237,0.35)" }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {typeIcon(c.type)}
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                      {c.dur&&<span className="text-xs text-muted-foreground">· {c.dur}</span>}
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {calling===c.id
                      ? <motion.button key="end" initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                          onClick={e=>{e.stopPropagation();setCalling(null);}}
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)", boxShadow:"0 0 16px rgba(239,68,68,0.65)" }}>
                          <X className="w-4 h-4 text-white"/>
                        </motion.button>
                      : <motion.button key="call" initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                          onClick={e=>{e.stopPropagation();setCalling(c.id);}} whileTap={{ scale:0.88 }}
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", boxShadow:"0 0 14px rgba(34,197,94,0.5)" }}>
                          <Phone className="w-4 h-4 text-white"/>
                        </motion.button>
                    }
                  </AnimatePresence>
                </div>
              </SwipeableRow>
            </motion.div>
          ))
        }
        {calling!==null && calls.find(c=>c.id===calling) && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/7 text-center">
            <motion.div className="inline-flex w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center mx-auto mb-1"
              animate={{ scale:[1,1.22,1] }} transition={{ duration:1.2, repeat:Infinity }}>
              <Phone className="w-4 h-4 text-emerald-400"/>
            </motion.div>
            <p className="text-xs font-bold text-emerald-400">{calls.find(c=>c.id===calling)?.name} ga qo'ng'iroq…</p>
          </motion.div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   VIDEO PANEL
══════════════════════════════════════════════════════════════ */
function VideoPanelContent({ targetUser, onClose }:{ targetUser:OrbUser; onClose:()=>void }) {
  const [micOn,  setMic ] = useState(true);
  const [camOn,  setCam ] = useState(true);
  const [connected,setConnected]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{
    if(!connected){setElapsed(0);return;}
    const id=setInterval(()=>setElapsed(s=>s+1),1000);
    return()=>clearInterval(id);
  },[connected]);
  const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  return (
    <>
      <PanelHeader title="Video Qo'ng'iroq" color="#3b82f6" bg="linear-gradient(135deg,#3b82f6,#2563eb)"
        Icon={Video} onClose={onClose}/>
      <div className="flex-1 flex flex-col p-3 gap-3">
        <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
          className="relative flex-1 rounded-2xl overflow-hidden"
          style={{ background:"linear-gradient(135deg,#0f172a,#1e1b4b)", border:"1px solid rgba(99,102,241,0.22)", minHeight:160 }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <motion.div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
              animate={{ scale:connected?[1,1.05,1]:1 }} transition={{ duration:2.2, repeat:Infinity }}
              style={{ background:"linear-gradient(135deg,#7c3aed,#db2777)", boxShadow:"0 0 28px rgba(124,58,237,0.5)" }}>
              {targetUser.displayName.charAt(0)}
            </motion.div>
            <p className="text-white font-semibold text-sm">{targetUser.displayName}</p>
            {connected
              ? <p className="text-emerald-400 text-xs font-mono">{fmt(elapsed)}</p>
              : <motion.p animate={{ opacity:[1,0.4,1] }} transition={{ duration:1.4, repeat:Infinity }}
                  className="text-blue-300 text-xs">Ulanmoqda…</motion.p>
            }
          </div>
          {!connected&&[0,1].map(i=>(
            <motion.div key={i} className="absolute inset-0 rounded-2xl"
              style={{ border:"1.5px solid rgba(99,102,241,0.25)" }}
              animate={{ scale:[1,1.06+i*0.04], opacity:[0.5,0] }}
              transition={{ duration:1.6, repeat:Infinity, delay:i*0.5 }}/>
          ))}
          <motion.div drag dragMomentum={false}
            className="absolute bottom-2 right-2 w-14 h-20 rounded-xl overflow-hidden"
            style={{ background:"linear-gradient(135deg,#1e293b,#0f172a)", border:"1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-full h-full flex items-center justify-center">
              {camOn ? <span className="text-white/30 text-xs">Kamera</span> : <CameraOff className="w-4 h-4 text-white/25"/>}
            </div>
          </motion.div>
        </motion.div>
        <div className="flex items-center justify-center gap-4 pb-1">
          {[
            { active:micOn, onClick:()=>setMic(v=>!v), On:Mic,    Off:MicOff    },
            { active:camOn, onClick:()=>setCam(v=>!v), On:Camera,  Off:CameraOff },
          ].map(({ active, onClick, On, Off },i)=>(
            <motion.button key={i} whileTap={{ scale:0.84 }} onClick={onClick}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background:active?"rgba(255,255,255,0.09)":"rgba(239,68,68,0.18)", border:"1px solid rgba(255,255,255,0.07)" }}>
              {active?<On className="w-4 h-4 text-white"/>:<Off className="w-4 h-4 text-red-400"/>}
            </motion.button>
          ))}
          <motion.button whileTap={{ scale:0.88 }} onClick={()=>setConnected(c=>!c)}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:connected?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#22c55e,#16a34a)", boxShadow:connected?"0 0 24px rgba(239,68,68,0.6)":"0 0 24px rgba(34,197,94,0.6)" }}>
            {connected?<X className="w-5 h-5 text-white"/>:<Video className="w-5 h-5 text-white"/>}
          </motion.button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMMENT PANEL
══════════════════════════════════════════════════════════════ */
function CommentPanelContent({ targetUserId, postId, onSelectPost, onClose }:
  { targetUserId:number; postId?:number; onSelectPost:(id:number)=>void; onClose:()=>void }) {
  const { user:me } = useAuth();
  const qc = useQueryClient();
  const { data:posts=[], isLoading:loadPosts } = useListPosts({ userId:targetUserId });
  const { data:comments=[], isLoading:loadComs, refetch } = useListPostComments(postId!, { query:{ enabled:!!postId, queryKey:["listPostComments", postId] } });
  const addComment = useCreatePostComment();
  const [text, setText] = useState("");
  const [deleted, setDeleted] = useState<Set<number>>(new Set());

  const handleSend = () => {
    if (!text.trim()||!postId||!me) return;
    addComment.mutate({ id:postId, data:{ authorId:me.id, content:text } }, {
      onSuccess:()=>{ qc.invalidateQueries({ queryKey:["listPostComments",postId] }); setText(""); refetch(); },
    });
  };

  const selectedPost = posts.find(p=>p.id===postId);

  return (
    <>
      <PanelHeader
        title={selectedPost?`Post #${selectedPost.id} · Kommentariy`:"Kommentariy"}
        color="#a855f7" bg="linear-gradient(135deg,#a855f7,#7c3aed)"
        Icon={MessageCircle}
        onClose={onClose}/>

      <AnimatePresence mode="wait">
        {postId ? (
          <motion.div key={`c-${postId}`}
            initial={{ x:"100%", rotateY:28, opacity:0.4 }} animate={{ x:0, rotateY:0, opacity:1 }}
            exit={{ x:"-100%", rotateY:-28, opacity:0.4 }}
            transition={{ type:"spring", stiffness:380, damping:36 }}
            style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2" style={{ minHeight:0 }}>
              {loadComs
                ? <div className="flex justify-center py-5"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin"/></div>
                : comments.filter(c=>!deleted.has(c.id)).map((c,i)=>(
                  <motion.div key={c.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay:i*0.04, type:"spring", stiffness:420, damping:30 }}>
                    <SwipeableRow id={c.id}
                      onDelete={()=>setDeleted(p=>new Set([...p,c.id]))}
                      onArchive={()=>setDeleted(p=>new Set([...p,c.id]))}
                      archiveLabel="Saqlash">
                      <div className="flex gap-2 py-0.5">
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ background:`hsl(${(c.id*53)%360},65%,48%)` }}>
                          {(c.author?.displayName??"?").charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="inline-block px-3 py-2 rounded-2xl rounded-tl-sm bg-white/8 border border-white/10">
                            <p className="text-[10px] font-semibold text-violet-400 mb-0.5">
                              {c.author?.id===me?.id?"Siz":`@${c.author?.username??"?"}`}
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      </div>
                    </SwipeableRow>
                  </motion.div>
                ))
              }
            </div>
            <div className="px-2.5 py-2 border-t border-white/8 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl border border-white/10 bg-white/5">
                <input value={text} onChange={e=>setText(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),handleSend())}
                  placeholder="Kommentariy…" maxLength={500}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"/>
                <motion.button whileTap={{ scale:0.85 }} onClick={handleSend}
                  disabled={!text.trim()||addComment.isPending}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ background:text.trim()?"linear-gradient(135deg,#a855f7,#7c3aed)":"rgba(255,255,255,0.06)" }}>
                  {addComment.isPending?<Loader2 className="w-3 h-3 text-white animate-spin"/>:<Send className="w-3 h-3 text-white"/>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="post-sel"
            initial={{ x:"-100%", rotateY:-28, opacity:0.4 }} animate={{ x:0, rotateY:0, opacity:1 }}
            exit={{ x:"100%", rotateY:28, opacity:0.4 }}
            transition={{ type:"spring", stiffness:380, damping:36 }}
            className="flex-1 overflow-y-auto p-2.5 space-y-1.5" style={{ minHeight:0 }}>
            {loadPosts
              ? <div className="flex justify-center py-5"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin"/></div>
              : posts.length===0
              ? <div className="text-center py-6 text-muted-foreground text-xs"><FileText className="w-6 h-6 mx-auto mb-1 opacity-20"/>Hali post yo'q</div>
              : posts.map((p,i)=>(
                <motion.button key={p.id} onClick={()=>onSelectPost(p.id)}
                  initial={{ y:14, opacity:0 }} animate={{ y:0, opacity:1 }}
                  transition={{ delay:i*0.05, type:"spring", stiffness:420, damping:30 }}
                  className="w-full text-left p-3 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 transition-all">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-1.5">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{p.likesCount??0}</span>
                    <span className="flex items-center gap-1 text-violet-400"><MessageCircle className="w-3 h-3"/>{p.commentsCount??0}</span>
                  </div>
                </motion.button>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   POST PANEL
══════════════════════════════════════════════════════════════ */
function PostPanelContent({ targetUser, targetUserId, onClose }:
  { targetUser:OrbUser; targetUserId:number; onClose:()=>void }) {
  const { user:me } = useAuth();
  const qc = useQueryClient();
  const { data:posts=[], isLoading, refetch } = useListPosts({ userId:targetUserId });
  const likePost = useLikePost();
  const createPost = useCreatePost();
  const [liked, setLiked] = useState<Record<number,boolean>>({});
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [archived, setArchived] = useState<Set<number>>(new Set());
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const handlePost = () => {
    if (!draft.trim()||!me) return;
    createPost.mutate({ data:{ authorId:me.id, content:draft, type:"text" } }, {
      onSuccess:()=>{ qc.invalidateQueries(); setDraft(""); setComposing(false); refetch(); },
    });
  };

  const visible = posts.filter(p=>!deleted.has(p.id)&&!archived.has(p.id));

  return (
    <>
      <PanelHeader title={composing?"Yangi post":"Postlar"} color="#ec4899"
        bg="linear-gradient(135deg,#ec4899,#be185d)" Icon={FileText}
        onBack={composing?()=>setComposing(false):undefined} onClose={onClose}/>

      <AnimatePresence mode="wait">
        {composing ? (
          <motion.div key="compose"
            initial={{ x:"100%", rotateY:28, opacity:0.4 }} animate={{ x:0, rotateY:0, opacity:1 }}
            exit={{ x:"-100%", rotateY:-28, opacity:0.4 }}
            transition={{ type:"spring", stiffness:380, damping:36 }}
            className="flex-1 flex flex-col overflow-hidden" style={{ minHeight:0 }}>
            <div className="flex-1 p-3 flex gap-2.5">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                style={{ background:"linear-gradient(135deg,#7c3aed,#db2777)" }}>{targetUser.displayName.charAt(0)}</div>
              <textarea value={draft} onChange={e=>setDraft(e.target.value)} autoFocus
                placeholder="Nima o'ylayapsiz?" rows={4}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"/>
            </div>
            <div className="p-2.5 border-t border-white/8 flex items-center gap-2 flex-shrink-0">
              <button className="p-2 rounded-xl hover:bg-white/8"><ImageIcon className="w-4 h-4 text-muted-foreground"/></button>
              <div className="flex-1"/>
              <motion.button whileTap={{ scale:0.9 }} onClick={handlePost}
                disabled={!draft.trim()||createPost.isPending}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-40"
                style={{ background:"linear-gradient(135deg,#ec4899,#be185d)" }}>
                {createPost.isPending?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:"Yuborish"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="feed"
            initial={{ x:"-100%", rotateY:-28, opacity:0.4 }} animate={{ x:0, rotateY:0, opacity:1 }}
            exit={{ x:"100%", rotateY:28, opacity:0.4 }}
            transition={{ type:"spring", stiffness:380, damping:36 }}
            style={{ flex:1, minHeight:0, overflow:"hidden" }}>
            <div className="h-full overflow-y-auto p-2.5 space-y-2">
              <motion.button whileTap={{ scale:0.95 }} onClick={()=>setComposing(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-pink-500/25 bg-pink-500/6 hover:bg-pink-500/10 transition-colors text-left mb-1">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background:"linear-gradient(135deg,#7c3aed,#db2777)" }}>{targetUser.displayName.charAt(0)}</div>
                <span className="text-sm text-muted-foreground flex-1">Nima o'ylayapsiz?</span>
                <Plus className="w-4 h-4 text-pink-400"/>
              </motion.button>
              {isLoading
                ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin"/></div>
                : visible.length===0
                ? <div className="text-center py-4 text-muted-foreground text-xs"><FileText className="w-6 h-6 mx-auto mb-1 opacity-20"/>Postlar yo'q</div>
                : visible.map((p,i)=>(
                  <motion.div key={p.id} initial={{ y:16, opacity:0 }} animate={{ y:0, opacity:1 }}
                    transition={{ delay:Math.min(i*0.07,0.35), type:"spring", stiffness:380, damping:28 }}>
                    <SwipeableRow id={p.id}
                      onDelete={()=>setDeleted(v=>new Set([...v,p.id]))}
                      onArchive={()=>setArchived(v=>new Set([...v,p.id]))}
                      archiveLabel="Arxiv">
                      <div className="p-3 rounded-2xl border border-white/8 bg-white/4">
                        <p className="text-sm text-foreground leading-relaxed mb-2">{p.content}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <motion.button whileTap={{ scale:0.75 }} onClick={()=>{
                            setLiked(l=>({ ...l,[p.id]:!l[p.id] }));
                            likePost.mutate({ id:p.id });
                          }} className="flex items-center gap-1">
                            <Heart className={`w-3.5 h-3.5 transition-colors ${liked[p.id]?"text-pink-500 fill-pink-500":"text-muted-foreground"}`}/>
                            <span className={liked[p.id]?"text-pink-400":"text-muted-foreground"}>
                              {(p.likesCount??0)+(liked[p.id]?1:0)}
                            </span>
                          </motion.button>
                          <button className="flex items-center gap-1 text-muted-foreground">
                            <MessageCircle className="w-3.5 h-3.5"/>{p.commentsCount??0}
                          </button>
                          <motion.button whileTap={{ scale:0.9 }} onClick={()=>refetch()}
                            className="ml-auto text-muted-foreground/40 hover:text-muted-foreground">
                            <RefreshCw className="w-3 h-3"/>
                          </motion.button>
                        </div>
                      </div>
                    </SwipeableRow>
                  </motion.div>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   ORB CONFIG
══════════════════════════════════════════════════════════════ */
const ORB = 56;
const SPARKS = Array.from({ length:6 }, (_,i) => ({
  id:i, angle:(i/6)*2*Math.PI, delay:i*0.35, warm:i%2===0,
}));
const ORB_KEY = "olcha_porb_xy";
function loadPos() {
  try {
    const s = localStorage.getItem(ORB_KEY);
    if (s) { const p = JSON.parse(s) as {x:number;y:number}; if (typeof p.x==="number"&&typeof p.y==="number") return p; }
  } catch {} return { x:0, y:0 };
}

/* ══════════════════════════════════════════════════════════════
   MAIN: ProfileOrb
══════════════════════════════════════════════════════════════ */
export default function ProfileOrb({ targetUser, targetUserId, isOwner }: ProfileOrbProps) {
  const { user:me } = useAuth();
  const meId = me?.id ?? 0;
  const qc = useQueryClient();

  const [mode, setMode] = useState<OrbMode>("idle");
  const [commentPostId, setCommentPostId] = useState<number|undefined>();

  // SMS data loaded at top level so radial convs can show
  const { data:convs=[], isLoading:loadConvs } = useListConversations();
  const createConv = useCreateConversation();

  const saved = useMemo(loadPos, []);
  const dragX = useMotionValue(saved.x);
  const dragY = useMotionValue(saved.y);
  const didDrag = useRef(false);

  const onDrag = (_:unknown, info:{ offset:{x:number;y:number} }) => {
    if (Math.abs(info.offset.x)>6||Math.abs(info.offset.y)>6) didDrag.current=true;
  };
  const onDragEnd = () => {
    try { localStorage.setItem(ORB_KEY, JSON.stringify({ x:dragX.get(), y:dragY.get() })); } catch {}
  };

  // 3D tilt
  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my,[-40,40],[16,-16]),{ stiffness:320, damping:22 });
  const rotY = useSpring(useTransform(mx,[-40,40],[-16,16]),{ stiffness:320, damping:22 });

  // Breathe
  const pulse = useAnimation();
  useEffect(()=>{
    if (mode==="idle") {
      pulse.start({ scale:[1,1.058,1], transition:{ duration:2.4, repeat:Infinity, ease:"easeInOut" } });
    } else { pulse.stop(); pulse.set({ scale:1 }); }
  },[mode,pulse]);

  const isMenu = mode==="menu";
  const isSmsConvs = mode==="sms-convs";
  const isPanel = typeof mode==="object";
  const activeColor = isPanel
    ? mode.panel==="sms-thread"?"#f59e0b"
      :mode.panel==="call"?"#22c55e"
      :mode.panel==="video"?"#3b82f6"
      :mode.panel==="comment"?"#a855f7"
      :"#ec4899"
    : "#ec4899";

  const closeAll = () => { setMode("idle"); setCommentPostId(undefined); };
  const openMenu = () => setMode("menu");

  const handleOrbClick = useCallback(()=>{
    if (didDrag.current) { didDrag.current=false; return; }
    if (isPanel) { closeAll(); return; }
    if (isSmsConvs) { closeAll(); return; }
    if (isMenu) { closeAll(); return; }
    openMenu();
  },[mode]);

  const handleMenuItemClick = (id:typeof PAGES[number]["id"]) => {
    if (id==="sms") {
      setMode("sms-convs");
    } else if (id==="call") {
      setMode({ panel:"call" });
    } else if (id==="video") {
      setMode({ panel:"video" });
    } else if (id==="comment") {
      setMode({ panel:"comment" });
    } else if (id==="post") {
      setMode({ panel:"post" });
    }
  };

  const handleNewConv = () => {
    createConv.mutate({ data:{ participantIds:[meId, targetUserId] } }, {
      onSuccess:(c)=>{ qc.invalidateQueries({ queryKey:["listConversations"] }); setMode({ panel:"sms-thread", convId:c.id, convName:"Yangi suhbat" }); },
    });
  };

  const initials = targetUser.displayName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const menuOpen = isMenu || isSmsConvs;

  return (
    <motion.div
      drag dragMomentum={false} dragElastic={0}
      style={{ x:dragX, y:dragY, position:"fixed", right:20, bottom:260, zIndex:9000, touchAction:"none", userSelect:"none", width:ORB, height:ORB }}
      onDrag={onDrag as never} onDragEnd={onDragEnd}>

      {/* ── Floating Panel (all non-SMS pages) ─────────────────── */}
      <AnimatePresence>
        {isPanel && (
          <FloatingPanel key={typeof mode==="object" ? mode.panel : "panel"} color={activeColor}>
            {typeof mode==="object" && (
              <>
                {mode.panel==="sms-thread" && (
                  <SmsPanelContent convId={mode.convId} meId={meId} convName={mode.convName}
                    onBack={()=>setMode("sms-convs")} onClose={closeAll}/>
                )}
                {mode.panel==="call" && <CallPanelContent onClose={closeAll}/>}
                {mode.panel==="video" && <VideoPanelContent targetUser={targetUser} onClose={closeAll}/>}
                {mode.panel==="comment" && (
                  <CommentPanelContent targetUserId={targetUserId} postId={commentPostId}
                    onSelectPost={(id)=>setCommentPostId(id)} onClose={closeAll}/>
                )}
                {mode.panel==="post" && (
                  <PostPanelContent targetUser={targetUser} targetUserId={targetUserId} onClose={closeAll}/>
                )}
              </>
            )}
          </FloatingPanel>
        )}
      </AnimatePresence>

      {/* ── Radial action menu ─────────────────────────────────── */}
      <AnimatePresence>
        {isMenu && PAGES.map((item,idx)=>{
          const rad = ((idx/PAGES.length)*2*Math.PI) - Math.PI/2;
          const tx = Math.cos(rad)*92;
          const ty = Math.sin(rad)*92;
          const Icon = item.icon;
          return (
            <motion.button key={item.id}
              initial={{ x:0, y:0, scale:0, opacity:0 }}
              animate={{ x:[0,tx], y:[0,ty], scale:[0,1.28,1], opacity:1 }}
              exit={{ x:0, y:0, scale:0, opacity:0, transition:{ type:"spring", stiffness:900, damping:20, delay:idx*0.01 } }}
              transition={{ type:"spring", stiffness:860, damping:16, delay:idx*0.02 }}
              onClick={()=>handleMenuItemClick(item.id)}
              whileHover={{ scale:1.22 }} whileTap={{ scale:0.86 }}
              style={{ position:"absolute", top:ORB/2-20, left:ORB/2-20, width:40, height:40, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:item.bg, boxShadow:`0 0 22px ${item.color}99, 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.28)`, border:"1.5px solid rgba(255,255,255,0.2)", cursor:"pointer", zIndex:10 }}>
              <motion.div
                animate={{ y:[0, -4*(idx%2===0?1:-1), 3*(idx%3===0?-1:1), 0], x:[0, 3*(idx%2===0?-1:1), -3*(idx%3===0?1:-1), 0] }}
                transition={{ duration:1.8+idx*0.25, repeat:Infinity, ease:"easeInOut", delay:idx*0.15+0.35 }}
                style={{ position:"absolute", inset:0, borderRadius:"50%", pointerEvents:"none" }}/>
              <motion.div animate={{ scale:[1,1.65,1], opacity:[0.45,0,0.45] }} transition={{ duration:1.3, repeat:Infinity, delay:idx*0.18 }}
                style={{ position:"absolute", inset:-5, borderRadius:"50%", background:`${item.color}22`, pointerEvents:"none" }}/>
              <Icon style={{ width:17, height:17, color:"#fff", filter:"drop-shadow(0 0 5px rgba(255,255,255,0.6))" }}/>
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:idx*0.02+0.12 }}
                style={{ position:"absolute", bottom:-18, left:"50%", transform:"translateX(-50%)", fontSize:9, fontWeight:700, color:item.color, textShadow:`0 0 8px ${item.color}`, whiteSpace:"nowrap", pointerEvents:"none" }}>
                {item.label}
              </motion.span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* ── SMS radial conversations ────────────────────────────── */}
      <AnimatePresence>
        {isSmsConvs && !loadConvs && (
          <SmsRadialConvs
            convs={convs}
            meId={meId}
            onSelect={(id,name)=>setMode({ panel:"sms-thread", convId:id, convName:name })}
            onNewConv={handleNewConv}
            isCreating={createConv.isPending}
            onClose={closeAll}
          />
        )}
      </AnimatePresence>

      {/* ── Main orb ───────────────────────────────────────────── */}
      {/* Continuous floating drift wrapper — tepaga, pastga, chapga, o'ngga */}
      <motion.div
        animate={{
          x: [0,  7, -5,  9, -7,  4, -9,  5, 0],
          y: [0, -9,  6,-11,  4,-13,  7, -8, 0],
        }}
        transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut", repeatType:"mirror" }}
        style={{ position:"absolute", top:0, left:0, width:ORB, height:ORB }}>
      <motion.div ref={tiltRef} animate={pulse}
        onClick={handleOrbClick}
        onMouseMove={e=>{
          const r=tiltRef.current?.getBoundingClientRect();
          if(r){mx.set(e.clientX-r.left-r.width/2);my.set(e.clientY-r.top-r.height/2);}
        }}
        onMouseLeave={()=>{mx.set(0);my.set(0);}}
        style={{ rotateX:rotX, rotateY:rotY, transformStyle:"preserve-3d", width:ORB, height:ORB, cursor:"pointer", position:"absolute", top:0, left:0 }}>

        {/* Glow rings */}
        {[0,1,2].map(i=>(
          <motion.div key={i}
            style={{ position:"absolute", inset:-(i*9+6), borderRadius:"50%", border:`${1.5-i*0.3}px solid rgba(236,72,153,${0.44-i*0.1})`, boxShadow:`0 0 ${14+i*11}px rgba(236,72,153,${0.27-i*0.07})`, pointerEvents:"none" }}
            animate={{ scale:[1,1.05+i*0.03,1], opacity:[0.48-i*0.1,0.82-i*0.15,0.48-i*0.1] }}
            transition={{ duration:2.6+i*0.7, repeat:Infinity, ease:"easeInOut", delay:i*0.5 }}/>
        ))}

        {/* Conic shimmer */}
        <motion.div animate={{ rotate:360 }} transition={{ duration:2.8, repeat:Infinity, ease:"linear" }}
          style={{ position:"absolute", inset:-3, borderRadius:"50%", background:"conic-gradient(from 0deg, transparent, rgba(236,72,153,0.68) 20%, rgba(255,255,255,0.2) 32%, transparent 48%, rgba(167,139,250,0.52) 68%, rgba(255,255,255,0.17) 82%, transparent)", pointerEvents:"none" }}/>

        {/* Avatar */}
        <div style={{ position:"absolute", inset:3, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(236,72,153,0.4)", boxShadow:"inset 0 2px 14px rgba(0,0,0,0.55), 0 0 22px rgba(236,72,153,0.42)" }}>
          {targetUser.avatarUrl
            ? <img src={targetUser.avatarUrl} alt={targetUser.displayName} draggable={false} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#7c3aed 0%,#ec4899 55%,#be185d 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:ORB*0.26, fontWeight:800, color:"#fff", textShadow:"0 1px 8px rgba(0,0,0,0.5)" }}>{initials}</div>
          }
        </div>

        {/* Shine */}
        <div style={{ position:"absolute", top:5, left:7, width:"42%", height:"38%", borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%", background:"radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.62) 0%, transparent 70%)", pointerEvents:"none", zIndex:10 }}/>

        {/* Status dot / X */}
        <AnimatePresence mode="wait">
          {menuOpen||isPanel
            ? <motion.div key="x" initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                style={{ position:"absolute", bottom:2, right:2, width:14, height:14, borderRadius:"50%", background:"rgba(239,68,68,0.88)", border:"2px solid rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:12 }}>
                <X style={{ width:8, height:8, color:"#fff" }}/>
              </motion.div>
            : <motion.div key="dot" initial={{ scale:0 }}
                animate={{ scale:[1,1.35,1], opacity:[1,0.55,1] }} transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut" }}
                style={{ position:"absolute", bottom:2, right:2, width:14, height:14, borderRadius:"50%", background:"#22c55e", border:"2.5px solid rgba(0,0,0,0.62)", boxShadow:"0 0 12px rgba(34,197,94,0.82)", zIndex:12 }}/>
          }
        </AnimatePresence>

        {/* Sparks */}
        {SPARKS.map(sp=>(
          <motion.div key={sp.id}
            style={{ position:"absolute", width:5, height:5, borderRadius:"50%", background:sp.warm?"#fff8c0":"#fff", boxShadow:sp.warm?"0 0 7px 4px rgba(255,200,80,0.92)":"0 0 7px 4px rgba(236,72,153,0.92)", left:"50%", top:"50%", marginLeft:-2.5, marginTop:-2.5, pointerEvents:"none", zIndex:13 }}
            animate={{ x:[Math.cos(sp.angle)*ORB*0.6,Math.cos(sp.angle+Math.PI)*ORB*0.6,Math.cos(sp.angle)*ORB*0.6], y:[Math.sin(sp.angle)*ORB*0.6,Math.sin(sp.angle+Math.PI)*ORB*0.6,Math.sin(sp.angle)*ORB*0.6], opacity:[0,1,0.5,1,0], scale:[0,1.7,0.7,1.5,0] }}
            transition={{ duration:3.2, repeat:Infinity, delay:sp.delay, ease:"easeInOut" }}/>
        ))}

        {/* Username label */}
        {!menuOpen && !isPanel && (
          <motion.div animate={{ opacity:[0,0.9,0], y:[4,0,-4] }} transition={{ duration:2.5, repeat:Infinity, repeatDelay:5 }}
            style={{ position:"absolute", top:-24, left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap", fontSize:10, fontWeight:700, color:"#ec4899", textShadow:"0 0 10px #ec4899", pointerEvents:"none" }}>
            {isOwner?"Meniki":`@${targetUser.username}`}
          </motion.div>
        )}

        {/* Book hint badge */}
        {!menuOpen && !isPanel && (
          <motion.div animate={{ scale:[1,1.3,1], opacity:[0.5,0.9,0.5] }} transition={{ duration:3, repeat:Infinity, delay:2 }}
            style={{ position:"absolute", top:-4, right:-4, width:18, height:18, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#a855f7)", border:"2px solid rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:14, pointerEvents:"none" }}>
            <BookOpen style={{ width:9, height:9, color:"#fff" }}/>
          </motion.div>
        )}
      </motion.div>
      </motion.div>{/* /float wrapper */}
    </motion.div>
  );
}
