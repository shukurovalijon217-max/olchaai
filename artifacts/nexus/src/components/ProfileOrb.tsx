/**
 * ProfileOrb — 9D animated floating orb + kitob-varaq 3D sahifalar.
 * Har bir elementda:
 *   ← chapga surish  → qizil bg chiqadi → qo'yib yuborilsa uchib ketadi (o'chirish)
 *   → o'ngga surish  → binafsha bg chiqadi → qo'yib yuborilsa saqlash/arxiv
 */
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useAnimation, animate,
} from "framer-motion";
import {
  Phone, Video, MessageSquare, MessageCircle, FileText,
  PhoneIncoming, PhoneMissed, PhoneOutgoing,
  X, ChevronLeft, ChevronRight, Send, Camera, Mic, MicOff, CameraOff,
  Heart, MoreHorizontal, Smile, ImageIcon, Trash2, Archive, Bookmark,
  CheckCheck, Loader2, Plus, BookOpen, RefreshCw, Check,
} from "lucide-react";
import {
  useState, useRef, useCallback, useEffect, useMemo, useId,
} from "react";
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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES & CONFIG
══════════════════════════════════════════════════════════════ */
type PageId = "call" | "video" | "sms" | "comment" | "post";

interface OrbUser {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}
interface ProfileOrbProps {
  targetUser: OrbUser;
  targetUserId: number;
  isOwner?: boolean;
}

const PAGES: { id: PageId; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: "call",    label: "Qo'ng'iroq",  icon: Phone,         color: "#22c55e", bg: "linear-gradient(135deg,#22c55e,#16a34a)" },
  { id: "video",   label: "Video",       icon: Video,         color: "#3b82f6", bg: "linear-gradient(135deg,#3b82f6,#2563eb)" },
  { id: "sms",     label: "SMS",         icon: MessageSquare, color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "comment", label: "Kommentariy", icon: MessageCircle, color: "#a855f7", bg: "linear-gradient(135deg,#a855f7,#7c3aed)" },
  { id: "post",    label: "Post",        icon: FileText,      color: "#ec4899", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
];
const PAGE_IDX: Record<PageId, number> = { call: 0, video: 1, sms: 2, comment: 3, post: 4 };

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "105%" : "-105%", rotateY: dir > 0 ? 38 : -38, scale: 0.92, opacity: 0.3 }),
  center: { x: 0, rotateY: 0, scale: 1, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-105%" : "105%", rotateY: dir > 0 ? -38 : 38, scale: 0.92, opacity: 0.3 }),
};
const pageTransition = { type: "spring" as const, stiffness: 360, damping: 38, mass: 0.9 };

/* ══════════════════════════════════════════════════════════════
   SWIPEABLE ROW — universal chapga/o'ngga surish
   • x < -THRESHOLD → qizil → uchib ketadi (o'chirish)
   • x > +THRESHOLD → binafsha → o'ngga uchadi (arxiv)
══════════════════════════════════════════════════════════════ */
const SWIPE_DELETE  = 82;
const SWIPE_ARCHIVE = 82;

interface SwipeRowProps {
  id: string | number;
  children: React.ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
  deleteLabel?: string;
  archiveLabel?: string;
}

function SwipeableRow({ id, children, onDelete, onArchive, deleteLabel = "O'chirish", archiveLabel = "Arxiv" }: SwipeRowProps) {
  const x = useMotionValue(0);
  const [gone, setGone] = useState<null | "del" | "arc">(null);
  const [toasted, setToasted] = useState<null | "del" | "arc">(null);

  const delBg   = useTransform(x, [-SWIPE_DELETE * 2.2, -SWIPE_DELETE, 0], ["rgba(239,68,68,0.98)", "rgba(239,68,68,0.75)", "rgba(239,68,68,0)"]);
  const arcBg   = useTransform(x, [0, SWIPE_ARCHIVE, SWIPE_ARCHIVE * 2.2], ["rgba(124,58,237,0)", "rgba(124,58,237,0.75)", "rgba(124,58,237,0.98)"]);
  const delScale = useTransform(x, [-SWIPE_DELETE * 1.6, -SWIPE_DELETE, -20, 0], [1.18, 1, 0.7, 0.5]);
  const arcScale = useTransform(x, [0, 20, SWIPE_ARCHIVE, SWIPE_ARCHIVE * 1.6], [0.5, 0.7, 1, 1.18]);
  const delOp   = useTransform(x, [-SWIPE_DELETE * 2, -SWIPE_DELETE * 0.35, 0], [1, 0.8, 0]);
  const arcOp   = useTransform(x, [0, SWIPE_ARCHIVE * 0.35, SWIPE_ARCHIVE * 2], [0, 0.8, 1]);

  const handleDragEnd = (_: unknown, info: { velocity: { x: number }; offset: { x: number } }) => {
    const ox = info.offset.x;
    const vx = info.velocity.x;
    if (ox < -SWIPE_DELETE || vx < -600) {
      animate(x, -520, { type: "spring", stiffness: 340, damping: 32 });
      setGone("del");
      setToasted("del");
      setTimeout(() => onDelete?.(), 320);
      setTimeout(() => setToasted(null), 1800);
    } else if (ox > SWIPE_ARCHIVE || vx > 600) {
      animate(x, 520, { type: "spring", stiffness: 340, damping: 32 });
      setGone("arc");
      setToasted("arc");
      setTimeout(() => onArchive?.(), 320);
      setTimeout(() => setToasted(null), 1800);
    } else {
      animate(x, 0, { type: "spring", stiffness: 600, damping: 42 });
    }
  };

  return (
    <div key={id} style={{ position: "relative", overflow: "hidden", borderRadius: 18 }}>
      {/* Delete bg — left side */}
      <motion.div style={{ backgroundColor: delBg }}
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-[18px] pointer-events-none z-0">
        <motion.div style={{ scale: delScale, opacity: delOp }} className="flex flex-col items-center gap-0.5">
          <Trash2 className="w-5 h-5 text-white" />
          <span className="text-[9px] font-bold text-white/90">{deleteLabel}</span>
        </motion.div>
      </motion.div>
      {/* Archive bg — right side */}
      <motion.div style={{ backgroundColor: arcBg }}
        className="absolute inset-0 flex items-center justify-start pl-5 rounded-[18px] pointer-events-none z-0">
        <motion.div style={{ scale: arcScale, opacity: arcOp }} className="flex flex-col items-center gap-0.5">
          <Archive className="w-5 h-5 text-white" />
          <span className="text-[9px] font-bold text-white/90">{archiveLabel}</span>
        </motion.div>
      </motion.div>
      {/* Draggable content */}
      <AnimatePresence>
        {gone === null && (
          <motion.div
            drag="x" dragMomentum={false} dragElastic={0.08}
            style={{ x, position: "relative", zIndex: 1, cursor: "grab" }}
            whileDrag={{ cursor: "grabbing" }}
            onDragEnd={handleDragEnd}
            exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.22 } }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Gone placeholder */}
      {gone !== null && (
        <motion.div
          initial={{ height: "auto", opacity: 1 }}
          animate={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="overflow-hidden flex items-center justify-center"
        >
          <motion.div initial={{ scale: 1 }} animate={{ scale: 0 }} className="flex items-center gap-2 py-3">
            {gone === "del"
              ? <><Trash2 className="w-4 h-4 text-red-400" /><span className="text-xs text-red-400">O'chirildi</span></>
              : <><Archive className="w-4 h-4 text-violet-400" /><span className="text-xs text-violet-400">Arxivlandi</span></>
            }
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Hint bar (surish yo'riqnomasi) ─────────────────────────── */
function SwipeHintBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex items-center justify-between px-4 py-1.5 mx-3 mb-1 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-1.5">
        <motion.div animate={{ x: [-4, 0, -4] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronLeft className="w-3 h-3 text-red-400" />
        </motion.div>
        <span className="text-[10px] text-red-400 font-semibold">O'chirish</span>
      </div>
      <span className="text-[10px] text-muted-foreground/40">sur</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-violet-400 font-semibold">Arxiv</span>
        <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronRight className="w-3 h-3 text-violet-400" />
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Page header ─────────────────────────────────────────────── */
function PageHeader({ pageId, onClose }: { pageId: PageId; onClose: () => void }) {
  const pg = PAGES.find(p => p.id === pageId)!;
  const Icon = pg.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: pg.bg, boxShadow: `0 0 16px ${pg.color}55` }}>
        <Icon style={{ width: 16, height: 16, color: "#fff" }} />
      </div>
      <p className="text-sm font-bold text-foreground flex-1">{pg.label}</p>
      <button onClick={onClose}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 0 — CALL
══════════════════════════════════════════════════════════════ */
const INIT_CALLS = [
  { id: 1, name: "Jasur T.",   time: "14:32", dur: "3:21", type: "incoming" as const },
  { id: 2, name: "Nilufar Y.", time: "11:05", dur: null,   type: "missed"   as const },
  { id: 3, name: "Bobur R.",   time: "22:17", dur: "1:45", type: "outgoing" as const },
  { id: 4, name: "Malika K.",  time: "19:00", dur: null,   type: "missed"   as const },
  { id: 5, name: "Sanjar U.",  time: "Kecha", dur: "8:02", type: "incoming" as const },
];

function CallPage({ onClose }: { onClose: () => void }) {
  const [calls, setCalls] = useState(INIT_CALLS);
  const [archived, setArchived] = useState<Set<number>>(new Set());
  const [calling, setCalling] = useState<number | null>(null);

  const typeIcon = (t: "incoming" | "missed" | "outgoing") =>
    t === "incoming" ? <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
    : t === "missed" ? <PhoneMissed   className="w-3.5 h-3.5 text-red-400" />
    : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400" />;

  const stripe = (t: "incoming" | "missed" | "outgoing") =>
    t === "incoming" ? "border-emerald-500/25 bg-emerald-500/6"
    : t === "missed" ? "border-red-500/25 bg-red-500/6"
    : "border-blue-500/25 bg-blue-500/6";

  const visibleCalls = calls.filter(c => !archived.has(c.id));

  return (
    <div className="flex flex-col h-full">
      <PageHeader pageId="call" onClose={onClose} />
      {visibleCalls.length > 0 && <SwipeHintBar />}
      {archived.size > 0 && (
        <div className="px-4 py-1.5 flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-400">{archived.size} ta arxivlandi</span>
          <button onClick={() => setArchived(new Set())} className="ml-auto text-xs text-muted-foreground/60 hover:text-foreground">
            ko'rish
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleCalls.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Qo'ng'iroqlar yo'q
          </div>
        ) : (
          visibleCalls.map((c, i) => (
            <motion.div key={c.id}
              initial={{ x: -32, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 400, damping: 30 }}>
              <SwipeableRow id={c.id}
                onDelete={() => setCalls(prev => prev.filter(x => x.id !== c.id))}
                onArchive={() => setArchived(prev => new Set([...prev, c.id]))}
                archiveLabel="Saqlash"
              >
                <div className={`flex items-center gap-3 p-3.5 rounded-[18px] border ${stripe(c.type)}`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: "0 0 14px rgba(124,58,237,0.4)" }}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {typeIcon(c.type)}
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                      {c.dur && <span className="text-xs text-muted-foreground">· {c.dur}</span>}
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {calling === c.id ? (
                      <motion.button key="end" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={e => { e.stopPropagation(); setCalling(null); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 0 18px rgba(239,68,68,0.7)" }}>
                        <X className="w-4 h-4 text-white" />
                      </motion.button>
                    ) : (
                      <motion.button key="call" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={e => { e.stopPropagation(); setCalling(c.id); }}
                        whileTap={{ scale: 0.88 }}
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 0 16px rgba(34,197,94,0.5)" }}>
                        <Phone className="w-4 h-4 text-white" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </SwipeableRow>
            </motion.div>
          ))
        )}
        {calling !== null && calls.find(c => c.id === calling) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 text-center space-y-1">
            <motion.div className="inline-flex w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mx-auto mb-2"
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
              <Phone className="w-5 h-5 text-emerald-400" />
            </motion.div>
            <p className="text-sm font-bold text-emerald-400">
              {calls.find(c => c.id === calling)?.name} ga qo'ng'iroq…
            </p>
            <p className="text-xs text-muted-foreground">Ulanmoqda</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 1 — VIDEO
══════════════════════════════════════════════════════════════ */
function VideoPage({ targetUser, onClose }: { targetUser: OrbUser; onClose: () => void }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!connected) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full">
      <PageHeader pageId="video" onClose={onClose} />
      <div className="flex-1 flex flex-col items-center justify-between p-4 gap-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative w-full flex-1 rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.25)", minHeight: 220, boxShadow: "0 0 40px rgba(99,102,241,0.18)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <motion.div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              animate={{ scale: connected ? [1, 1.04, 1] : 1 }} transition={{ duration: 2.2, repeat: Infinity }}
              style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: "0 0 32px rgba(124,58,237,0.55)" }}>
              {targetUser.displayName.charAt(0)}
            </motion.div>
            <p className="text-white font-semibold text-base">{targetUser.displayName}</p>
            {connected
              ? <p className="text-emerald-400 text-sm font-mono">{fmt(elapsed)}</p>
              : <motion.p animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                  className="text-blue-300 text-sm">Ulanmoqda…</motion.p>
            }
          </div>
          {!connected && [0, 1, 2].map(i => (
            <motion.div key={i} className="absolute inset-0 rounded-3xl"
              style={{ border: "2px solid rgba(99,102,241,0.3)" }}
              animate={{ scale: [1, 1.06 + i * 0.04], opacity: [0.5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.45 }} />
          ))}
          <motion.div drag dragMomentum={false} dragElastic={0}
            className="absolute bottom-3 right-3 w-16 h-24 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1.5px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
            {cam
              ? <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">Kamera</div>
              : <div className="w-full h-full flex items-center justify-center bg-neutral-900"><CameraOff className="w-5 h-5 text-white/30" /></div>
            }
          </motion.div>
        </motion.div>
        <div className="flex items-center gap-5 pb-2">
          {[
            { active: mic, onClick: () => setMic(!mic), IconOn: Mic, IconOff: MicOff },
            { active: cam, onClick: () => setCam(!cam), IconOn: Camera, IconOff: CameraOff },
          ].map(({ active, onClick, IconOn, IconOff }, i) => (
            <motion.button key={i} whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }} onClick={onClick}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{ background: active ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.2)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: active ? "none" : "0 0 14px rgba(239,68,68,0.35)" }}>
              {active ? <IconOn className="w-5 h-5 text-white" /> : <IconOff className="w-5 h-5 text-red-400" />}
            </motion.button>
          ))}
          <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}
            onClick={() => setConnected(!connected)}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: connected ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: connected ? "0 0 28px rgba(239,68,68,0.65)" : "0 0 28px rgba(34,197,94,0.65)" }}>
            {connected ? <X className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 2 — SMS  (haqiqiy API)
══════════════════════════════════════════════════════════════ */
function SmsThread({ convId, meId }: { convId: number; meId: number }) {
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useGetConversationMessages(convId, {
    query: { enabled: true, queryKey: getGetConversationMessagesQueryKey(convId), refetchInterval: 4000 },
  });
  const send = useSendMessage();
  const [text, setText] = useState("");
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [archived, setArchived] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    send.mutate({ id: convId, data: { senderId: meId, content: text } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(convId) });
        setText("");
      },
    });
  };

  const visible = messages.filter(m => !deleted.has(m.id) && !archived.has(m.id));

  return (
    <>
      {visible.length > 0 && <SwipeHintBar />}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-25" />
            Xabarlar yo'q. Birinchi bo'lib yozing!
          </div>
        ) : (
          visible.map((m, i) => {
            const isMe = m.senderId === meId;
            return (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), type: "spring", stiffness: 420, damping: 32 }}>
                <SwipeableRow id={m.id}
                  onDelete={() => setDeleted(prev => new Set([...prev, m.id]))}
                  onArchive={() => setArchived(prev => new Set([...prev, m.id]))}
                  archiveLabel="Saqlash"
                >
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} py-0.5`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe ? "rounded-br-sm text-white" : "rounded-bl-sm text-foreground bg-white/8 border border-white/10"
                    }`}
                      style={isMe ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 2px 14px rgba(124,58,237,0.38)" } : {}}>
                      {m.content}
                      <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : ""}`}>
                        <span className="text-[10px] opacity-50">
                          {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-blue-300 opacity-60" />}
                      </div>
                    </div>
                  </div>
                </SwipeableRow>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-1 rounded-2xl border border-white/12 bg-white/5">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Xabar yozing…" maxLength={1000}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2"
          />
          <button className="p-1.5 opacity-60 hover:opacity-100"><Smile className="w-4 h-4 text-foreground" /></button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background: text.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)" }}>
            {send.isPending ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
          </motion.button>
        </div>
      </div>
    </>
  );
}

function SmsPage({ targetUserId, onClose }: { targetUserId: number; onClose: () => void }) {
  const { user: me } = useAuth();
  const meId = me?.id ?? 0;
  const qc = useQueryClient();
  const { data: convs = [], isLoading } = useListConversations();
  const createConv = useCreateConversation();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [deletedConvs, setDeletedConvs] = useState<Set<number>>(new Set());
  const [archivedConvs, setArchivedConvs] = useState<Set<number>>(new Set());

  const getOther = (conv: typeof convs[0]) =>
    conv.participants?.find(p => p.id !== meId) ?? conv.participants?.[0];

  const handleStartConv = () => {
    createConv.mutate({ data: { participantIds: [meId, targetUserId] } }, {
      onSuccess: (newConv) => {
        qc.invalidateQueries({ queryKey: ["listConversations"] });
        setActiveConvId(newConv.id);
      },
    });
  };

  const activeConv = convs.find(c => c.id === activeConvId);
  const visibleConvs = convs.filter(c => !deletedConvs.has(c.id) && !archivedConvs.has(c.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0">
        {activeConvId && (
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setActiveConvId(null)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 0 16px #f59e0b44" }}>
          <MessageSquare style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
        <p className="text-sm font-bold text-foreground flex-1">
          {activeConv ? (getOther(activeConv)?.displayName ?? "Chat") : "SMS · Xabarlar"}
        </p>
        {activeConv && (
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        )}
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeConvId ? (
          <motion.div key="thread"
            initial={{ x: "100%", rotateY: 30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "-100%", rotateY: -30, opacity: 0.4 }} transition={pageTransition}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <SmsThread convId={activeConvId} meId={meId} />
          </motion.div>
        ) : (
          <motion.div key="list"
            initial={{ x: "-100%", rotateY: -30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "100%", rotateY: 30, opacity: 0.4 }} transition={pageTransition}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
              ) : visibleConvs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-3 px-4">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-20" />
                  <p className="text-sm">Hali hech qanday suhbat yo'q</p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleStartConv} disabled={createConv.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 0 18px rgba(245,158,11,0.4)" }}>
                    {createConv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Suhbat boshlash
                  </motion.button>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  <SwipeHintBar />
                  {archivedConvs.size > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <Archive className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs text-violet-400">{archivedConvs.size} ta arxivlangan suhbat</span>
                      <button onClick={() => setArchivedConvs(new Set())} className="ml-auto text-xs text-muted-foreground/60 hover:text-foreground">tiklash</button>
                    </div>
                  )}
                  {visibleConvs.map((conv, i) => {
                    const other = getOther(conv);
                    return (
                      <motion.div key={conv.id}
                        initial={{ x: -28, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 420, damping: 32 }}>
                        <SwipeableRow id={conv.id}
                          onDelete={() => setDeletedConvs(prev => new Set([...prev, conv.id]))}
                          onArchive={() => setArchivedConvs(prev => new Set([...prev, conv.id]))}
                          archiveLabel="Arxiv"
                        >
                          <button onClick={() => setActiveConvId(conv.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-[18px] hover:bg-white/6 transition-colors text-left">
                            <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                              {(other?.displayName ?? "?").charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{other?.displayName ?? "Foydalanuvchi"}</p>
                              <p className="text-xs text-muted-foreground truncate">{conv.lastMessage ?? "Xabar yo'q"}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                          </button>
                        </SwipeableRow>
                      </motion.div>
                    );
                  })}
                  <div className="px-2 pt-2">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={handleStartConv} disabled={createConv.isPending}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-amber-500/40 text-amber-400 text-sm font-medium justify-center hover:bg-amber-500/8 transition-colors">
                      {createConv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Yangi suhbat boshlash
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 3 — COMMENT  (haqiqiy API)
══════════════════════════════════════════════════════════════ */
function CommentThread({ postId, meId }: { postId: number; meId: number }) {
  const qc = useQueryClient();
  const { data: comments = [], isLoading, refetch } = useListPostComments(postId);
  const addComment = useCreatePostComment();
  const [text, setText] = useState("");
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const handleSend = () => {
    if (!text.trim()) return;
    addComment.mutate({ id: postId, data: { authorId: meId, content: text } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["listPostComments", postId] }); setText(""); refetch(); },
    });
  };

  const visible = comments.filter(c => !deleted.has(c.id));

  return (
    <>
      {visible.length > 0 && <SwipeHintBar />}
      {saved.size > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1">
          <Bookmark className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-400">{saved.size} ta saqlandi</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
        : visible.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Hali kommentariy yo'q. Birinchi bo'ling!
          </div>
        ) : visible.map((c, i) => (
          <motion.div key={c.id}
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(i * 0.05, 0.3), type: "spring", stiffness: 400, damping: 28 }}>
            <SwipeableRow id={c.id}
              onDelete={() => setDeleted(prev => new Set([...prev, c.id]))}
              onArchive={() => setSaved(prev => new Set([...prev, c.id]))}
              archiveLabel="Saqlash"
            >
              <div className="flex gap-2.5 py-0.5">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `hsl(${(c.id * 53) % 360},65%,48%)` }}>
                  {(c.author?.displayName ?? "?").charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="inline-block px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/8 border border-white/10">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-violet-400">
                        {c.author?.id === meId ? "Siz" : `@${c.author?.username ?? "?"}`}
                      </p>
                      {saved.has(c.id) && <Bookmark className="w-3 h-3 text-violet-400 fill-violet-400" />}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(c.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
              </div>
            </SwipeableRow>
          </motion.div>
        ))}
      </div>
      <div className="p-3 border-t border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-1 rounded-2xl border border-white/12 bg-white/5">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Kommentariy yozing…" maxLength={500}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2"
          />
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend}
            disabled={!text.trim() || addComment.isPending}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background: text.trim() ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "rgba(255,255,255,0.06)" }}>
            {addComment.isPending ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
          </motion.button>
        </div>
      </div>
    </>
  );
}

function CommentPage({ targetUserId, onClose }: { targetUserId: number; onClose: () => void }) {
  const { user: me } = useAuth();
  const { data: posts = [], isLoading } = useListPosts({ userId: targetUserId });
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const selectedPost = posts.find(p => p.id === selectedPostId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0">
        {selectedPostId && (
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSelectedPostId(null)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 16px #a855f744" }}>
          <MessageCircle style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
        <p className="text-sm font-bold text-foreground flex-1">
          {selectedPost ? `Post #${selectedPost.id} · Kommentariylar` : "Kommentariy — post tanlang"}
        </p>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <AnimatePresence mode="wait">
        {selectedPostId && me ? (
          <motion.div key={`thread-${selectedPostId}`}
            initial={{ x: "100%", rotateY: 30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "-100%", rotateY: -30, opacity: 0.4 }} transition={pageTransition}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <CommentThread postId={selectedPostId} meId={me.id} />
          </motion.div>
        ) : (
          <motion.div key="post-list"
            initial={{ x: "-100%", rotateY: -30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "100%", rotateY: 30, opacity: 0.4 }} transition={pageTransition}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div className="h-full overflow-y-auto p-3 space-y-2">
              {isLoading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
              : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" /> Hali post yo'q
                </div>
              ) : posts.map((p, i) => (
                <motion.button key={p.id} onClick={() => setSelectedPostId(p.id)}
                  initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 30 }}
                  className="w-full text-left p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 transition-all">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2 mb-2">{p.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likesCount ?? 0}</span>
                    <span className="flex items-center gap-1 text-violet-400"><MessageCircle className="w-3 h-3" />{p.commentsCount ?? 0} kommentariy</span>
                    <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString("uz-UZ")}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 4 — POST  (haqiqiy API)
══════════════════════════════════════════════════════════════ */
function PostPage({ targetUser, targetUserId, onClose }: { targetUser: OrbUser; targetUserId: number; onClose: () => void }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { data: posts = [], isLoading, refetch } = useListPosts({ userId: targetUserId });
  const likePost  = useLikePost();
  const createPost = useCreatePost();
  const [liked,    setLiked]    = useState<Record<number, boolean>>({});
  const [deleted,  setDeleted]  = useState<Set<number>>(new Set());
  const [archived, setArchived] = useState<Set<number>>(new Set());
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const handleLike = (postId: number) => {
    setLiked(l => ({ ...l, [postId]: !l[postId] }));
    likePost.mutate({ id: postId });
  };
  const handlePost = () => {
    if (!draft.trim() || !me) return;
    createPost.mutate({ data: { authorId: me.id, content: draft, type: "text" } }, {
      onSuccess: () => { qc.invalidateQueries(); setDraft(""); setComposing(false); refetch(); },
    });
  };

  const visible = posts.filter(p => !deleted.has(p.id) && !archived.has(p.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0">
        {composing && (
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setComposing(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", boxShadow: "0 0 16px #ec489944" }}>
          <FileText style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
        <p className="text-sm font-bold text-foreground flex-1">{composing ? "Yangi post" : "Postlar"}</p>
        {archived.size > 0 && !composing && (
          <div className="flex items-center gap-1 mr-2">
            <Archive className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-violet-400">{archived.size}</span>
          </div>
        )}
        {!composing && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setComposing(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1"
            style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", boxShadow: "0 0 14px rgba(236,72,153,0.4)" }}>
            <Plus className="w-3.5 h-3.5" /> Post
          </motion.button>
        )}
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {composing ? (
          <motion.div key="compose"
            initial={{ x: "100%", rotateY: 30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "-100%", rotateY: -30, opacity: 0.4 }} transition={pageTransition}
            className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 flex gap-3">
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>{targetUser.displayName.charAt(0)}</div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                placeholder={`${targetUser.displayName}, nima o'ylayapsiz?`}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                style={{ minHeight: 120 }} />
            </div>
            <div className="p-3 border-t border-white/8 flex items-center gap-2 flex-shrink-0">
              <button className="p-2 rounded-xl hover:bg-white/8"><ImageIcon className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-2 rounded-xl hover:bg-white/8"><Smile className="w-4 h-4 text-muted-foreground" /></button>
              <div className="flex-1" />
              <motion.button whileTap={{ scale: 0.9 }} onClick={handlePost}
                disabled={!draft.trim() || createPost.isPending}
                className="px-5 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#ec4899,#be185d)" }}>
                {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yuborish"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="feed"
            initial={{ x: "-100%", rotateY: -30, opacity: 0.4 }} animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: "100%", rotateY: 30, opacity: 0.4 }} transition={pageTransition}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div className="h-full overflow-y-auto">
              {visible.length > 0 && <SwipeHintBar />}
              <div className="px-3 pb-3 space-y-3">
                {isLoading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
                : visible.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground space-y-2">
                    <FileText className="w-8 h-8 mx-auto opacity-20" />
                    <p className="text-sm">Hali post yo'q</p>
                  </div>
                ) : visible.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.08, 0.4), type: "spring", stiffness: 380, damping: 28 }}>
                    <SwipeableRow id={p.id}
                      onDelete={() => setDeleted(prev => new Set([...prev, p.id]))}
                      onArchive={() => setArchived(prev => new Set([...prev, p.id]))}
                      archiveLabel="Arxiv"
                    >
                      <div className="p-4 rounded-[18px] border border-white/8 bg-white/4"
                        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
                            {targetUser.avatarUrl
                              ? <img src={targetUser.avatarUrl} className="w-full h-full object-cover" alt="" />
                              : targetUser.displayName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">{targetUser.displayName}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("uz-UZ")}</p>
                          </div>
                          <button><MoreHorizontal className="w-4 h-4 text-muted-foreground/50" /></button>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-3">{p.content}</p>
                        <div className="flex items-center gap-4 pt-2.5 border-t border-white/8">
                          <motion.button whileTap={{ scale: 0.78 }} onClick={() => handleLike(p.id)}
                            className="flex items-center gap-1.5 text-xs">
                            <Heart className={`w-4 h-4 transition-colors ${liked[p.id] ? "text-pink-500 fill-pink-500" : "text-muted-foreground"}`} />
                            <span className={liked[p.id] ? "text-pink-400" : "text-muted-foreground"}>
                              {(p.likesCount ?? 0) + (liked[p.id] ? 1 : 0)}
                            </span>
                          </motion.button>
                          <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MessageCircle className="w-4 h-4" />{p.commentsCount ?? 0}
                          </button>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => refetch()}
                            className="ml-auto text-muted-foreground/50 hover:text-muted-foreground">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </div>
                    </SwipeableRow>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BOOK MODAL
══════════════════════════════════════════════════════════════ */
function BookModal({
  initialPage, targetUser, targetUserId, onClose,
}: { initialPage: PageId; targetUser: OrbUser; targetUserId: number; onClose: () => void }) {
  const [pageIdx, setPageIdx] = useState(PAGE_IDX[initialPage]);
  const [direction, setDirection] = useState(0);
  const panRef = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((idx: number, dir: 1 | -1) => {
    if (idx < 0 || idx > 4) return;
    setDirection(dir);
    setPageIdx(idx);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => { panRef.current = { x: e.clientX, y: e.clientY }; };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    panRef.current = null;
    if (Math.abs(dx) > Math.abs(dy) * 1.4 && Math.abs(dx) > 60) {
      dx < 0 ? goTo(pageIdx + 1, 1) : goTo(pageIdx - 1, -1);
    }
  };

  const pg = PAGES[pageIdx];

  return (
    <div className="fixed inset-0 z-[9500] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
        className="absolute inset-0 bg-black/72 backdrop-blur-[6px]" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.12, rotateX: 55, y: 240, opacity: 0 }}
        animate={{ scale: 1, rotateX: 0, y: 0, opacity: 1 }}
        exit={{ scale: 0.12, rotateX: 55, y: 240, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 38, mass: 1.1 }}
        style={{ perspective: "1400px", width: "min(96vw, 440px)", height: "min(86vh, 680px)", position: "relative", zIndex: 10 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div style={{ position: "absolute", inset: -2, borderRadius: 34, background: `radial-gradient(ellipse at 50% 110%, ${pg.color}44, transparent 65%)`, filter: "blur(18px)", pointerEvents: "none", zIndex: -1 }} />
        <div style={{ width: "100%", height: "100%", borderRadius: 32, background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 -4px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, transparent 0%, ${pg.color}66 30%, ${pg.color}99 50%, ${pg.color}66 70%, transparent 100%)`, flexShrink: 0 }} />
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", perspective: "1200px" }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={pageIdx} custom={direction}
                variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={pageTransition}
                style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {pageIdx === 0 && <CallPage    onClose={onClose} />}
                {pageIdx === 1 && <VideoPage   targetUser={targetUser} onClose={onClose} />}
                {pageIdx === 2 && <SmsPage     targetUserId={targetUserId} onClose={onClose} />}
                {pageIdx === 3 && <CommentPage targetUserId={targetUserId} onClose={onClose} />}
                {pageIdx === 4 && <PostPage    targetUser={targetUser} targetUserId={targetUserId} onClose={onClose} />}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Nav footer */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => goTo(pageIdx - 1, -1)}
              disabled={pageIdx === 0} style={{ opacity: pageIdx === 0 ? 0.2 : 1, transition: "opacity 0.2s" }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </motion.button>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              {PAGES.map((p, i) => {
                const active = i === pageIdx;
                const Icon = p.icon;
                return (
                  <motion.button key={p.id} onClick={() => goTo(i, i > pageIdx ? 1 : -1)}
                    animate={{ scale: active ? 1 : 0.85, opacity: active ? 1 : 0.45 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    title={p.label}
                    style={{ width: active ? 34 : 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: active ? p.bg : "rgba(255,255,255,0.07)", boxShadow: active ? `0 0 14px ${p.color}66` : "none", transition: "width 0.3s ease", border: "none", cursor: "pointer", padding: 0 }}>
                    <Icon style={{ width: 12, height: 12, color: active ? "#fff" : p.color }} />
                  </motion.button>
                );
              })}
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => goTo(pageIdx + 1, 1)}
              disabled={pageIdx === 4} style={{ opacity: pageIdx === 4 ? 0.2 : 1, transition: "opacity 0.2s" }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -8] }}
          transition={{ delay: 1.2, duration: 2.5, times: [0, 0.15, 0.75, 1] }}
          style={{ position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", pointerEvents: "none" }}>
          ← surish bilan sahifa almashtiring →
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FLOATING ORB + RADIAL MENU
══════════════════════════════════════════════════════════════ */
const ORB_SIZE = 56;
const MENU_R   = 86;
const SPARKS   = Array.from({ length: 6 }, (_, i) => ({ id: i, angle: (i / 6) * 2 * Math.PI, delay: i * 0.35, warm: i % 2 === 0 }));
const ORB_POS_KEY = "olcha_porb_xy";

function loadPos() {
  try {
    const s = localStorage.getItem(ORB_POS_KEY);
    if (s) {
      const p = JSON.parse(s) as { x: number; y: number };
      if (typeof p.x === "number" && typeof p.y === "number" && Math.abs(p.x) < window.innerWidth - 40 && Math.abs(p.y) < window.innerHeight - 40)
        return p;
    }
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

export default function ProfileOrb({ targetUser, targetUserId, isOwner }: ProfileOrbProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPage, setOpenPage] = useState<PageId | null>(null);
  const saved = useMemo(loadPos, []);
  const dragX = useMotionValue(saved.x);
  const dragY = useMotionValue(saved.y);
  const didDrag = useRef(false);
  const onDrag = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (Math.abs(info.offset.x) > 6 || Math.abs(info.offset.y) > 6) didDrag.current = true;
  };
  const onDragEnd = () => {
    try { localStorage.setItem(ORB_POS_KEY, JSON.stringify({ x: dragX.get(), y: dragY.get() })); } catch {}
  };

  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-40, 40], [16, -16]), { stiffness: 320, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-40, 40], [-16, 16]), { stiffness: 320, damping: 22 });
  const onHover = (e: React.MouseEvent) => {
    const r = tiltRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };

  const pulseCtrl = useAnimation();
  useEffect(() => {
    if (!menuOpen && !openPage) {
      pulseCtrl.start({ scale: [1, 1.055, 1], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } });
    } else {
      pulseCtrl.stop(); pulseCtrl.set({ scale: 1 });
    }
  }, [menuOpen, openPage, pulseCtrl]);

  const handleOrbClick = useCallback(() => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (openPage) return;
    setMenuOpen(m => !m);
  }, [openPage]);

  const handleItemClick = (id: PageId) => { setMenuOpen(false); setOpenPage(id); };
  const initials = targetUser.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <motion.div
        drag dragMomentum={false} dragElastic={0}
        style={{ x: dragX, y: dragY, position: "fixed", right: 20, bottom: 260, zIndex: 9000, touchAction: "none", userSelect: "none" }}
        onDrag={onDrag as never} onDragEnd={onDragEnd}>
        <AnimatePresence>
          {menuOpen && PAGES.map((item, idx) => {
            const rad = ((idx / PAGES.length) * 2 * Math.PI) - Math.PI / 2;
            const tx = Math.cos(rad) * MENU_R;
            const ty = Math.sin(rad) * MENU_R;
            const Icon = item.icon;
            return (
              <motion.button key={item.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x: tx, y: ty, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0, opacity: 0, transition: { duration: 0.2, delay: idx * 0.03 } }}
                transition={{ type: "spring", stiffness: 480, damping: 30, delay: idx * 0.055 }}
                onClick={() => handleItemClick(item.id)}
                whileHover={{ scale: 1.22 }} whileTap={{ scale: 0.88 }}
                style={{ position: "absolute", top: ORB_SIZE / 2 - 20, left: ORB_SIZE / 2 - 20, width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2, background: item.bg, boxShadow: `0 0 20px ${item.color}88, 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.28)`, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                  style={{ position: "absolute", inset: -4, borderRadius: "50%", background: `${item.color}22`, pointerEvents: "none" }} />
                <Icon style={{ width: 17, height: 17, color: "#fff", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.55))" }} />
                <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.055 + 0.15 }}
                  style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 700, color: item.color, textShadow: `0 0 8px ${item.color}`, whiteSpace: "nowrap", pointerEvents: "none" }}>
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        <motion.div ref={tiltRef} animate={pulseCtrl}
          onClick={handleOrbClick}
          onMouseMove={onHover}
          onMouseLeave={() => { mx.set(0); my.set(0); }}
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", width: ORB_SIZE, height: ORB_SIZE, cursor: "pointer", position: "relative" }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              style={{ position: "absolute", inset: -(i * 9 + 6), borderRadius: "50%", border: `${1.5 - i * 0.3}px solid rgba(236,72,153,${0.45 - i * 0.1})`, boxShadow: `0 0 ${14 + i * 11}px rgba(236,72,153,${0.28 - i * 0.07})`, pointerEvents: "none" }}
              animate={{ scale: [1, 1.05 + i * 0.03, 1], opacity: [0.5 - i * 0.1, 0.85 - i * 0.15, 0.5 - i * 0.1] }}
              transition={{ duration: 2.6 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }} />
          ))}
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent, rgba(236,72,153,0.7) 20%, rgba(255,255,255,0.22) 32%, transparent 48%, rgba(167,139,250,0.55) 68%, rgba(255,255,255,0.18) 82%, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(236,72,153,0.42)", boxShadow: "inset 0 2px 14px rgba(0,0,0,0.6), 0 0 24px rgba(236,72,153,0.45)" }}>
            {targetUser.avatarUrl
              ? <img src={targetUser.avatarUrl} alt={targetUser.displayName} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#7c3aed 0%,#ec4899 55%,#be185d 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ORB_SIZE * 0.26, fontWeight: 800, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}>{initials}</div>
            }
          </div>
          <div style={{ position: "absolute", top: 5, left: 7, width: "42%", height: "38%", borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.65) 0%, transparent 70%)", pointerEvents: "none", zIndex: 10 }} />
          <AnimatePresence mode="wait">
            {menuOpen
              ? <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "2px solid rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12 }}><X style={{ width: 8, height: 8, color: "#fff" }} /></motion.div>
              : <motion.div key="dot" initial={{ scale: 0 }} animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2.5px solid rgba(0,0,0,0.65)", boxShadow: "0 0 12px rgba(34,197,94,0.85)", zIndex: 12 }} />
            }
          </AnimatePresence>
          {SPARKS.map(sp => (
            <motion.div key={sp.id}
              style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: sp.warm ? "#fff8c0" : "#fff", boxShadow: sp.warm ? "0 0 7px 4px rgba(255,200,80,0.95)" : "0 0 7px 4px rgba(236,72,153,0.95)", left: "50%", top: "50%", marginLeft: -2.5, marginTop: -2.5, pointerEvents: "none", zIndex: 13 }}
              animate={{ x: [Math.cos(sp.angle) * ORB_SIZE * 0.6, Math.cos(sp.angle + Math.PI) * ORB_SIZE * 0.6, Math.cos(sp.angle) * ORB_SIZE * 0.6], y: [Math.sin(sp.angle) * ORB_SIZE * 0.6, Math.sin(sp.angle + Math.PI) * ORB_SIZE * 0.6, Math.sin(sp.angle) * ORB_SIZE * 0.6], opacity: [0, 1, 0.5, 1, 0], scale: [0, 1.7, 0.7, 1.5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: sp.delay, ease: "easeInOut" }} />
          ))}
          {!menuOpen && (
            <motion.div animate={{ opacity: [0, 0.9, 0], y: [4, 0, -4] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
              style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, fontWeight: 700, color: "#ec4899", textShadow: "0 0 10px #ec4899", pointerEvents: "none" }}>
              {isOwner ? "Meniki" : `@${targetUser.username}`}
            </motion.div>
          )}
          {!menuOpen && !openPage && (
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: 2 }}
              style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "2px solid rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 14, pointerEvents: "none" }}>
              <BookOpen style={{ width: 9, height: 9, color: "#fff" }} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {openPage && (
          <BookModal key={openPage} initialPage={openPage} targetUser={targetUser} targetUserId={targetUserId} onClose={() => setOpenPage(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
