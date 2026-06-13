/**
 * ProfileOrb — 9D animated floating orb for profile pages.
 * Tap once  → radial menu with 5 functions bursts out.
 * Tap icon  → full animated panel opens.
 * Back      → icon flies back into orb with animation.
 * Draggable anywhere on screen.
 */
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useAnimation,
} from "framer-motion";
import {
  Phone, Video, MessageSquare, MessageCircle, FileText,
  PhoneIncoming, PhoneMissed, PhoneOutgoing,
  X, ChevronLeft, Send, Camera, Mic, MicOff, CameraOff,
  Heart, MoreHorizontal, Image as ImageIcon, Smile,
  CheckCheck, Clock, Check,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

/* ── Types ───────────────────────────────────────────────────── */
type PanelId = "call" | "video" | "sms" | "comment" | "post";

interface OrbUser {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

interface ProfileOrbProps {
  targetUser: OrbUser;
  isOwner?: boolean;
}

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK_CALLS = [
  { id: 1, name: "Jasur Toshmatov", time: "Bugun, 14:32", dur: "3:21", type: "incoming" as const, avatar: null },
  { id: 2, name: "Nilufar Yusupova", time: "Bugun, 11:05", dur: null,   type: "missed" as const,   avatar: null },
  { id: 3, name: "Bobur Raximov",    time: "Kecha, 22:17", dur: "1:45", type: "outgoing" as const, avatar: null },
  { id: 4, name: "Malika Karimova",  time: "Kecha, 19:00", dur: null,   type: "missed" as const,   avatar: null },
  { id: 5, name: "Sanjar Usmonov",   time: "Dushanba",     dur: "8:02", type: "incoming" as const, avatar: null },
];

const MOCK_THREADS = [
  { id: 1, name: "Jasur Toshmatov",  last: "Keling gaplashamiz!", time: "14:32", unread: 3,  avatar: null },
  { id: 2, name: "Nilufar Yusupova", last: "Okay, ko'rishganda!",  time: "11:05", unread: 0,  avatar: null },
  { id: 3, name: "Bobur Raximov",    last: "Ha, men ham shunday", time: "Kecha",  unread: 1,  avatar: null },
  { id: 4, name: "OlCha Guruh",      last: "Yangi post chiqdi 🔥",time: "Psh",    unread: 12, avatar: null },
];

const MOCK_MESSAGES = [
  { id: 1, me: false, text: "Salom! Qalaysiz?",              time: "14:28" },
  { id: 2, me: true,  text: "Yaxshi, o'zingiz?",             time: "14:29" },
  { id: 3, me: false, text: "Yaxshi. Bugun uchrashsak bo'ladimi?", time: "14:30" },
  { id: 4, me: true,  text: "Ha, albatta! Soat 6 da?",       time: "14:31" },
  { id: 5, me: false, text: "Keling gaplashamiz!",            time: "14:32" },
];

const MOCK_COMMENTS = [
  { id: 1, user: "jasur_t",   text: "Juda zo'r post! 🔥",         time: "2 daqiqa" },
  { id: 2, user: "nilufar_y", text: "Menga ham shu fikr kelgan edi", time: "5 daqiqa" },
  { id: 3, user: "bobur_r",   text: "Keep going! 💪",               time: "8 daqiqa" },
  { id: 4, user: "malika_k",  text: "Super!",                        time: "12 daqiqa" },
  { id: 5, user: "sanjar_u",  text: "Ajoyib, davom eting ❤️",       time: "20 daqiqa" },
];

const MOCK_POSTS = [
  { id: 1, text: "Bugun juda yaxshi kun bo'ldi! Hammaga omad tilayman 🌟", likes: 142, comments: 23, time: "2 soat" },
  { id: 2, text: "Yangi loyiha ustida ishlamoqdaman. Tez orada yangiliklar! 🚀", likes: 89, comments: 11, time: "1 kun" },
  { id: 3, text: "OlCha eng zo'r platforma! ❤️‍🔥", likes: 234, comments: 47, time: "3 kun" },
];

/* ── Radial menu config ──────────────────────────────────────── */
const MENU_ITEMS: {
  id: PanelId; label: string; icon: React.ElementType;
  color: string; glow: string; angle: number;
}[] = [
  { id: "call",    label: "Qo'ng'iroq",       icon: Phone,         color: "#22c55e", glow: "#16a34a", angle: -90 },
  { id: "video",   label: "Video",             icon: Video,         color: "#3b82f6", glow: "#2563eb", angle: -18 },
  { id: "sms",     label: "SMS",               icon: MessageSquare, color: "#f59e0b", glow: "#d97706", angle:  54 },
  { id: "comment", label: "Kommentariy",       icon: MessageCircle, color: "#a855f7", glow: "#7c3aed", angle: 126 },
  { id: "post",    label: "Post",              icon: FileText,      color: "#ec4899", glow: "#be185d", angle: 198 },
];

const ORB_R = 92;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

/* ── Storage ─────────────────────────────────────────────────── */
const ORB_POS_KEY = "olcha_porb_xy";
function loadPos() {
  try {
    const s = localStorage.getItem(ORB_POS_KEY);
    if (s) {
      const p = JSON.parse(s) as { x: number; y: number };
      if (typeof p.x === "number" && typeof p.y === "number" &&
          Math.abs(p.x) < window.innerWidth - 40 && Math.abs(p.y) < window.innerHeight - 40)
        return p;
    }
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

/* ══════════════════════════════════════════════════════════════
   SUB-PANELS
══════════════════════════════════════════════════════════════ */

/* ── Call Panel ──────────────────────────────────────────────── */
function CallPanel({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<number | null>(null);

  const callIcon = (type: "incoming" | "missed" | "outgoing") =>
    type === "incoming" ? <PhoneIncoming className="w-4 h-4 text-emerald-400" />
    : type === "missed"   ? <PhoneMissed   className="w-4 h-4 text-red-400" />
    : <PhoneOutgoing className="w-4 h-4 text-blue-400" />;

  const callColor = (type: "incoming" | "missed" | "outgoing") =>
    type === "incoming" ? "border-emerald-500/30 bg-emerald-500/8"
    : type === "missed"   ? "border-red-500/30 bg-red-500/8"
    : "border-blue-500/30 bg-blue-500/8";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted/50 transition">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 0 16px #22c55e66" }}>
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Qo'ng'iroqlar</p>
            <p className="text-xs text-muted-foreground">Kiruvchi · Chiquvchi · O'tkazib yuborilgan</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {MOCK_CALLS.map((c, i) => (
          <motion.div key={c.id}
            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 420, damping: 32 }}
            onClick={() => setActive(active === c.id ? null : c.id)}
            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${callColor(c.type)}`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {callIcon(c.type)}
                <span className="text-xs text-muted-foreground">{c.time}</span>
                {c.dur && <span className="text-xs text-muted-foreground">· {c.dur}</span>}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }}
              onClick={e => { e.stopPropagation(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 0 14px #22c55e55" }}
            >
              <Phone className="w-4 h-4 text-white" />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Video Panel ─────────────────────────────────────────────── */
function VideoPanel({ user, onBack }: { user: OrbUser; onBack: () => void }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [calling, setCalling] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted/50 transition">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 0 16px #3b82f666" }}>
            <Video className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-foreground">Video qo'ng'iroq</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {/* Remote "video" */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-xs aspect-[3/4] rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(99,102,241,0.2)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: "0 0 30px rgba(124,58,237,0.6)" }}
            >
              {user.displayName.charAt(0)}
            </motion.div>
            <p className="text-white font-semibold">{user.displayName}</p>
            <AnimatePresence mode="wait">
              {calling ? (
                <motion.p key="calling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-emerald-400 text-sm">Ulanmoqda...</motion.p>
              ) : (
                <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-muted-foreground text-sm">Video qo'ng'iroq boshlang</motion.p>
              )}
            </AnimatePresence>
          </div>
          {/* Pulse rings when calling */}
          {calling && [0, 1, 2].map(i => (
            <motion.div key={i} className="absolute inset-0 rounded-3xl"
              style={{ border: "2px solid rgba(99,102,241,0.4)" }}
              animate={{ scale: [1, 1.08 + i * 0.04], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }} />
          ))}
          {/* Self camera thumbnail */}
          <motion.div
            drag dragMomentum={false} dragElastic={0}
            className="absolute bottom-3 right-3 w-16 h-24 rounded-xl overflow-hidden cursor-grab"
            style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1.5px solid rgba(255,255,255,0.15)" }}
          >
            {cam ? (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-xs">Kamera</div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <CameraOff className="w-5 h-5 text-white/40" />
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }}
            onClick={() => setMic(!mic)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{ background: mic ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.2)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: mic ? "none" : "0 0 16px rgba(239,68,68,0.4)" }}
          >
            {mic ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-red-400" />}
          </motion.button>

          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}
            onClick={() => setCalling(!calling)}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: calling ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: calling ? "0 0 24px rgba(239,68,68,0.6)" : "0 0 24px rgba(34,197,94,0.6)" }}
          >
            <Video className="w-6 h-6 text-white" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }}
            onClick={() => setCam(!cam)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{ background: cam ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.2)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: cam ? "none" : "0 0 16px rgba(239,68,68,0.4)" }}
          >
            {cam ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-red-400" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── SMS Panel ───────────────────────────────────────────────── */
function SmsPanel({ onBack }: { onBack: () => void }) {
  const [openThread, setOpenThread] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const thread = MOCK_THREADS.find(t => t.id === openThread);

  if (openThread && thread) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={() => setOpenThread(null)} className="p-1.5 rounded-full hover:bg-muted/50">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>{thread.name.charAt(0)}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{thread.name}</p>
          <motion.p className="text-xs text-emerald-400"
            animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            Online
          </motion.p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {MOCK_MESSAGES.map((m, i) => (
          <motion.div key={m.id}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 30 }}
            className={`flex ${m.me ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm ${
              m.me
                ? "rounded-br-sm text-white"
                : "rounded-bl-sm text-foreground bg-muted/50 border border-border/50"
            }`}
              style={m.me ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 2px 12px rgba(124,58,237,0.35)" } : {}}
            >
              {m.text}
              <div className={`flex items-center gap-1 mt-1 ${m.me ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] opacity-60">{m.time}</span>
                {m.me && <CheckCheck className="w-3 h-3 text-blue-300 opacity-70" />}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2 p-1 pl-4 rounded-2xl border border-border/60 bg-muted/20">
          <input value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Xabar yozing..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="p-1.5"><Smile className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-1.5"><ImageIcon className="w-4 h-4 text-muted-foreground" /></button>
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={() => setMsg("")}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: msg ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.06)" }}
          >
            <Send className={`w-4 h-4 ${msg ? "text-white" : "text-muted-foreground"}`} />
          </motion.button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted/50 transition">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 0 16px #f59e0b66" }}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-foreground">SMS · Xabarlar</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {MOCK_THREADS.map((t, i) => (
          <motion.button key={t.id} onClick={() => setOpenThread(t.id)}
            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 420, damping: 32 }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/40 transition-colors text-left"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>{t.name.charAt(0)}</div>
              {t.unread > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 0 10px rgba(239,68,68,0.7)" }}
                >
                  {t.unread > 9 ? "9+" : t.unread}
                </motion.div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-sm truncate ${t.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>{t.name}</p>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">{t.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{t.last}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Comment Panel ───────────────────────────────────────────── */
function CommentPanel({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(MOCK_COMMENTS);

  const send = () => {
    if (!text.trim()) return;
    setComments(c => [...c, { id: Date.now(), user: "men", text: text.trim(), time: "Hozir" }]);
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted/50 transition">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 0 16px #a855f766" }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-foreground">Kommentariylar</p>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">{comments.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence initial={false}>
          {comments.map((c, i) => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ delay: i < 5 ? i * 0.06 : 0, type: "spring", stiffness: 400, damping: 28 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `hsl(${(c.id * 47) % 360}, 70%, 50%)` }}>
                {c.user.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="inline-block px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-muted/40 border border-border/40">
                  <p className="text-xs font-semibold text-primary mb-0.5">@{c.user}</p>
                  <p className="text-sm text-foreground">{c.text}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[11px] text-muted-foreground">{c.time}</span>
                  <motion.button whileTap={{ scale: 0.8 }} className="text-[11px] text-muted-foreground hover:text-pink-400 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Yoqtirish
                  </motion.button>
                  <button className="text-[11px] text-muted-foreground hover:text-primary">Javob</button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="p-3 border-t border-border/40">
        <div className="flex items-center gap-2 p-1 pl-4 rounded-2xl border border-border/60 bg-muted/20">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Kommentariy yozing..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <motion.button whileTap={{ scale: 0.85 }} onClick={send}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: text ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "rgba(255,255,255,0.06)" }}
          >
            <Send className={`w-4 h-4 ${text ? "text-white" : "text-muted-foreground"}`} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Post Panel ──────────────────────────────────────────────── */
function PostPanel({ user, onBack }: { user: OrbUser; onBack: () => void }) {
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  if (compose) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={() => setCompose(false)} className="p-1.5 rounded-full hover:bg-muted/50">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <p className="text-sm font-semibold text-foreground flex-1">Yangi post</p>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => { if (draft.trim()) setCompose(false); }}
          className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
          style={{ background: draft ? "linear-gradient(135deg,#ec4899,#be185d)" : "rgba(255,255,255,0.08)" }}
        >
          Yuborish
        </motion.button>
      </div>
      <div className="p-4 flex gap-3 flex-1">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>{user.displayName.charAt(0)}</div>
        <textarea value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={`${user.displayName}, nima o'ylayapsiz?`}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none h-32"
          autoFocus
        />
      </div>
      <div className="p-3 border-t border-border/40 flex gap-3">
        <button className="p-2 rounded-xl hover:bg-muted/50"><ImageIcon className="w-5 h-5 text-muted-foreground" /></button>
        <button className="p-2 rounded-xl hover:bg-muted/50"><Smile className="w-5 h-5 text-muted-foreground" /></button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted/50 transition">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", boxShadow: "0 0 16px #ec489966" }}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-foreground">Postlar</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCompose(true)}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1"
          style={{ background: "linear-gradient(135deg,#ec4899,#be185d)", boxShadow: "0 0 16px rgba(236,72,153,0.4)" }}
        >
          + Post
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {MOCK_POSTS.map((p, i) => (
          <motion.div key={p.id}
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.09, type: "spring", stiffness: 380, damping: 28 }}
            className="p-4 rounded-2xl border border-border/50 bg-card/50"
            style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>{user.displayName.charAt(0)}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                <p className="text-[11px] text-muted-foreground">{p.time} oldin</p>
              </div>
              <button className="ml-auto p-1"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">{p.text}</p>
            <div className="flex items-center gap-4 pt-2 border-t border-border/30">
              <motion.button whileTap={{ scale: 0.8 }}
                onClick={() => setLiked(l => ({ ...l, [p.id]: !l[p.id] }))}
                className="flex items-center gap-1.5 text-xs"
              >
                <Heart className={`w-4 h-4 transition-colors ${liked[p.id] ? "text-pink-500 fill-pink-500" : "text-muted-foreground"}`} />
                <span className={liked[p.id] ? "text-pink-400" : "text-muted-foreground"}>{p.likes + (liked[p.id] ? 1 : 0)}</span>
              </motion.button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="w-4 h-4" /> {p.comments}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN ORB
══════════════════════════════════════════════════════════════ */
const ORB_SIZE = 58;
const SPARK_COUNT = 6;
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => ({
  id: i, angle: (i / SPARK_COUNT) * 2 * Math.PI, delay: i * 0.35,
  warm: i % 2 === 0,
}));

export default function ProfileOrb({ targetUser, isOwner }: ProfileOrbProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [returningItem, setReturningItem] = useState<PanelId | null>(null);

  /* Drag */
  const pos = loadPos();
  const dragX = useMotionValue(pos.x);
  const dragY = useMotionValue(pos.y);
  const didDrag = useRef(false);
  const onDrag = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (Math.abs(info.offset.x) > 6 || Math.abs(info.offset.y) > 6) didDrag.current = true;
  };
  const onDragEnd = () => {
    try { localStorage.setItem(ORB_POS_KEY, JSON.stringify({ x: dragX.get(), y: dragY.get() })); } catch {}
  };

  /* 3-D tilt */
  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-40, 40], [16, -16]), { stiffness: 340, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-40, 40], [-16, 16]), { stiffness: 340, damping: 22 });
  const onHover = (e: React.MouseEvent) => {
    const r = tiltRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };

  /* Pulse animation */
  const controls = useAnimation();
  useEffect(() => {
    if (!menuOpen) {
      controls.start({ scale: [1, 1.06, 1], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } });
    } else {
      controls.stop();
      controls.set({ scale: 1 });
    }
  }, [menuOpen, controls]);

  const handleOrbClick = useCallback(() => {
    if (didDrag.current) { didDrag.current = false; return; }
    setMenuOpen(m => !m);
  }, []);

  const handleItemClick = (id: PanelId) => {
    setMenuOpen(false);
    setActivePanel(id);
  };

  const handleBack = (id: PanelId) => {
    setReturningItem(id);
    setActivePanel(null);
    setTimeout(() => setReturningItem(null), 700);
  };

  const initials = targetUser.displayName
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* ── Floating Orb ─────────────────────────────────────────── */}
      <motion.div
        drag dragMomentum={false} dragElastic={0}
        style={{ x: dragX, y: dragY, position: "fixed", right: 20, bottom: 260, zIndex: 9000, touchAction: "none", userSelect: "none" }}
        onDrag={onDrag as never} onDragEnd={onDragEnd}
      >
        {/* Menu items orbiting outward */}
        <AnimatePresence>
          {menuOpen && MENU_ITEMS.map((item, idx) => {
            const { x: tx, y: ty } = polarToXY(item.angle, ORB_R);
            const isReturning = returningItem === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={isReturning
                  ? { x: 0, y: 0, scale: 0, opacity: 0 }
                  : { x: tx, y: ty, scale: 1, opacity: 1 }
                }
                exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 28, delay: menuOpen ? idx * 0.06 : 0 }}
                onClick={() => handleItemClick(item.id)}
                style={{
                  position: "absolute",
                  top: ORB_SIZE / 2 - 20,
                  left: ORB_SIZE / 2 - 20,
                  width: 40, height: 40,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", zIndex: 2,
                  background: `radial-gradient(circle at 38% 30%, ${item.color}ee, ${item.glow}dd)`,
                  boxShadow: `0 0 18px ${item.color}88, 0 0 8px ${item.color}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  border: "1.5px solid rgba(255,255,255,0.18)",
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.88 }}
              >
                {/* Icon pulse when hovered */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: idx * 0.2 }}
                  style={{ position: "absolute", inset: -4, borderRadius: "50%", background: `${item.color}22`, pointerEvents: "none" }}
                />
                <item.icon style={{ width: 18, height: 18, color: "#fff", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }} />
                {/* Label */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.06 + 0.18 }}
                  style={{
                    position: "absolute",
                    bottom: -20, left: "50%", transform: "translateX(-50%)",
                    fontSize: 9, fontWeight: 700, color: item.color,
                    textShadow: `0 0 8px ${item.color}`,
                    whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                >
                  {item.label}
                </motion.span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* The orb itself */}
        <motion.div
          ref={tiltRef}
          animate={controls}
          onClick={handleOrbClick}
          onMouseMove={onHover}
          onMouseLeave={() => { mx.set(0); my.set(0); }}
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", width: ORB_SIZE, height: ORB_SIZE, cursor: "pointer", position: "relative" }}
        >
          {/* Glow rings × 3 */}
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              style={{
                position: "absolute", inset: -(i * 8 + 6), borderRadius: "50%",
                border: `${1.5 - i * 0.3}px solid rgba(236,72,153,${0.45 - i * 0.1})`,
                boxShadow: `0 0 ${14 + i * 10}px rgba(236,72,153,${0.3 - i * 0.07})`,
                pointerEvents: "none",
              }}
              animate={{ scale: [1, 1.05 + i * 0.03, 1], opacity: [0.5 - i * 0.1, 0.85 - i * 0.15, 0.5 - i * 0.1] }}
              transition={{ duration: 2.5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
            />
          ))}

          {/* Conic shimmer (CW) */}
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent, rgba(236,72,153,0.7) 20%, rgba(255,255,255,0.2) 32%, transparent 48%, rgba(167,139,250,0.55) 68%, rgba(255,255,255,0.18) 82%, transparent)", pointerEvents: "none" }}
          />
          {/* Conic shimmer (CCW) */}
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "conic-gradient(from 120deg, transparent, rgba(139,92,246,0.28) 18%, transparent 36%)", pointerEvents: "none" }}
          />

          {/* Avatar */}
          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(236,72,153,0.42)", boxShadow: "inset 0 2px 14px rgba(0,0,0,0.6), 0 0 22px rgba(236,72,153,0.45)" }}>
            {targetUser.avatarUrl ? (
              <img src={targetUser.avatarUrl} alt={targetUser.displayName} draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#7c3aed 0%,#ec4899 55%,#be185d 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ORB_SIZE * 0.27, fontWeight: 800, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}>
                {initials}
              </div>
            )}
          </div>

          {/* Glass shine */}
          <div style={{ position: "absolute", top: 5, left: 7, width: "42%", height: "38%", borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.65) 0%, transparent 70%)", pointerEvents: "none", zIndex: 10 }} />

          {/* Close / open indicator */}
          <AnimatePresence mode="wait">
            {menuOpen ? (
              <motion.div key="close" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "2px solid rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12 }}>
                <X style={{ width: 8, height: 8, color: "#fff" }} />
              </motion.div>
            ) : (
              <motion.div key="pulse" initial={{ scale: 0 }} animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2.5px solid rgba(0,0,0,0.65)", boxShadow: "0 0 12px rgba(34,197,94,0.85)", zIndex: 12 }}
              />
            )}
          </AnimatePresence>

          {/* Orbiting sparks */}
          {SPARKS.map(sp => (
            <motion.div key={sp.id}
              style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: sp.warm ? "#fff8c0" : "#ffffff", boxShadow: sp.warm ? "0 0 7px 4px rgba(255,200,80,0.95)" : "0 0 7px 4px rgba(236,72,153,0.95)", left: "50%", top: "50%", marginLeft: -2.5, marginTop: -2.5, pointerEvents: "none", zIndex: 13 }}
              animate={{ x: [Math.cos(sp.angle) * ORB_SIZE * 0.58, Math.cos(sp.angle + Math.PI) * ORB_SIZE * 0.58, Math.cos(sp.angle) * ORB_SIZE * 0.58], y: [Math.sin(sp.angle) * ORB_SIZE * 0.58, Math.sin(sp.angle + Math.PI) * ORB_SIZE * 0.58, Math.sin(sp.angle) * ORB_SIZE * 0.58], opacity: [0, 1, 0.5, 1, 0], scale: [0, 1.7, 0.7, 1.5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: sp.delay, ease: "easeInOut" }}
            />
          ))}

          {/* Purple ambient aura */}
          <motion.div
            animate={{ opacity: [0.1, 0.35, 0.1], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ position: "absolute", inset: -24, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.28) 0%, transparent 65%)", pointerEvents: "none", zIndex: -1 }}
          />
        </motion.div>

        {/* Tap hint when closed */}
        {!menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 0.9, 0], y: [4, 0, -4] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
            style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, fontWeight: 700, color: "#ec4899", textShadow: "0 0 10px #ec4899", pointerEvents: "none" }}
          >
            {isOwner ? "Mening profilim" : targetUser.username}
          </motion.div>
        )}
      </motion.div>

      {/* ── Panels (bottom sheets) ────────────────────────────────── */}
      <AnimatePresence>
        {activePanel && (
          <div className="fixed inset-0 z-[9500] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/65 backdrop-blur-[4px]"
              onClick={() => handleBack(activePanel)}
            />
            {/* Sheet */}
            <motion.div
              key={activePanel}
              initial={{ y: "100%", scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 44 }}
              className="relative w-full max-w-md h-[78vh] rounded-t-[32px] overflow-hidden flex flex-col z-10"
              style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}
            >
              {/* Top drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <motion.div
                  animate={{ width: [32, 50, 32] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="h-[3.5px] rounded-full"
                  style={{ background: MENU_ITEMS.find(m => m.id === activePanel)?.color ?? "#fff", opacity: 0.4 }}
                />
              </div>
              {/* Panel glow strip */}
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${MENU_ITEMS.find(m => m.id === activePanel)?.color ?? "#7c3aed"}55, transparent)` }} />

              {/* Panel content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {activePanel === "call"    && <CallPanel    onBack={() => handleBack("call")} />}
                {activePanel === "video"   && <VideoPanel   user={targetUser} onBack={() => handleBack("video")} />}
                {activePanel === "sms"     && <SmsPanel     onBack={() => handleBack("sms")} />}
                {activePanel === "comment" && <CommentPanel onBack={() => handleBack("comment")} />}
                {activePanel === "post"    && <PostPanel    user={targetUser} onBack={() => handleBack("post")} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
