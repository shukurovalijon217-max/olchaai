import {
  useState, useRef, useEffect, useCallback, ElementType,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, Plus, MessageCircle, Ghost, Flame, Clock, X,
  ChevronLeft, Mic, Camera, Smile, Paperclip, Phone, Video,
  MoreVertical, Reply, Forward, Copy, Trash2, Star, Pin, Check,
  CheckCheck, ChevronDown, Image as ImageIcon, File, Sticker,
  MapPin, BarChart3, AtSign, Hash, Bold, Italic,
  StopCircle, Volume2, Play, Pause, Radio, Users, Lock,
  MicOff, CameraOff, RotateCcw, Bell, Palette, Download,
  Laugh, Clock3, AlignLeft, Zap, Heart, ThumbsUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListConversations,
  useGetConversationMessages,
  useSendMessage,
  useCreateConversation,
  getGetConversationMessagesQueryKey,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── Types ──────────────────────────────────────────────────── */
type MsgType = "text" | "image" | "voice" | "video_note" | "file" | "sticker" | "poll";

interface Reaction { emoji: string; count: number; mine: boolean }
interface ReplyRef { id: string; content: string; sender: string }

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
}

/* ── Emoji sets ─────────────────────────────────────────────── */
const EMOJI_CATS: Record<string, string[]> = {
  "😊": ["😊","😂","🥹","😅","😆","🤣","😁","😄","😃","😀","🙂","😏","😉","🥰","😍","🤩","😘","😗","😚","😙","🥲","😇","🤗","🤭","🫢","🫡","🤫","🤔","🤐","😐","😑","😶","😶‍🌫️","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖"],
  "👍": ["👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","🤙","👋","🤚","🖐","✋","🖖","👌","🤌","🤏","🫰","🫵","🫱","🫲","🫳","🫴","👈","👉","👆","☝️","👇","🙌","🙏","🫶","👏","🤝","💅","🤳","💪"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☯️","🕉️","🔯","✡️","🛐","⛎","♈","♉","♊"],
  "🎉": ["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","🏅","🎖","🎯","🎱","🎮","🕹","🎲","🎭","🎨","🖼","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁"],
  "🌟": ["🌟","⭐","💫","✨","🔥","💥","🌈","☀️","🌤","⛅","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","🌬","💨","🌀","🌊","🌙","🌛","🌜","🌝","🌞","🪐","⚡","🌺"],
  "🍕": ["🍕","🍔","🌮","🌯","🥗","🍱","🍜","🍝","🍛","🍣","🍤","🦐","🦞","🦀","🦑","🥟","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🧁","🎂","🍰","🍮","🍭","🍬","🍫"],
};
const ALL_EMOJIS = Object.values(EMOJI_CATS).flat();
const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","🔥","🎉","💯"];

/* ── Helpers ────────────────────────────────────────────────── */
function formatTs(ts: Date): string {
  const now = new Date();
  const diff = now.getTime() - ts.getTime();
  if (diff < 60000) return "hozir";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} daq`;
  return ts.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });
}
function formatDur(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function dayLabel(d: Date) {
  const now = new Date(), diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Bugun";
  if (diff === 1) return "Kecha";
  return d.toLocaleDateString("uz", { day: "numeric", month: "long" });
}
function uid() { return Math.random().toString(36).slice(2); }

/* ── Upload ─────────────────────────────────────────────────── */
async function uploadBlob(blob: Blob, name: string, mime: string): Promise<string> {
  const r = await fetch(`${API}/api/storage/uploads/request-url`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, size: blob.size, contentType: mime }),
  });
  if (!r.ok) throw new Error("Upload URL xatosi");
  const { uploadURL, objectPath } = await r.json();
  await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": mime } });
  return `${API}/api/storage/objects/${objectPath}`;
}

/* ── Emoji picker ───────────────────────────────────────────── */
function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [cat, setCat] = useState("😊");
  const emojis = EMOJI_CATS[cat] || ALL_EMOJIS.slice(0, 60);
  return (
    <div className="w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex border-b border-border px-2 pt-2 gap-1">
        {Object.keys(EMOJI_CATS).map(k => (
          <button key={k} onClick={() => setCat(k)}
            className={`flex-1 py-1.5 rounded-lg text-base transition-colors ${cat === k ? "bg-primary/15" : "hover:bg-muted"}`}>
            {k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {emojis.map(e => (
          <button key={e} onClick={() => onPick(e)}
            className="w-8 h-8 text-lg flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Attachment menu ────────────────────────────────────────── */
function AttachMenu({
  onPhoto, onFile, onLocation, onPoll, onSticker, onClose,
}: { onPhoto: () => void; onFile: () => void; onLocation: () => void; onPoll: () => void; onSticker: () => void; onClose: () => void }) {
  const items: { icon: ElementType; label: string; color: string; action: () => void }[] = [
    { icon: ImageIcon,  label: "Rasm",        color: "bg-blue-500/15 text-blue-400",    action: onPhoto },
    { icon: File,       label: "Fayl",        color: "bg-orange-500/15 text-orange-400", action: onFile },
    { icon: Sticker,    label: "Stiker",      color: "bg-yellow-500/15 text-yellow-400", action: onSticker },
    { icon: MapPin,     label: "Joylashuv",   color: "bg-green-500/15 text-green-400",  action: onLocation },
    { icon: BarChart3,  label: "So'rovnoma",  color: "bg-purple-500/15 text-purple-400", action: onPoll },
    { icon: AtSign,     label: "Mention",     color: "bg-cyan-500/15 text-cyan-400",    action: onClose },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 p-3 bg-card border border-border rounded-2xl shadow-2xl w-52">
      {items.map(it => (
        <button key={it.label} onClick={() => { it.action(); onClose(); }}
          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${it.color} hover:opacity-80 transition-opacity`}>
          <it.icon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Round video recorder ───────────────────────────────────── */
function RoundVideoRecorder({
  onSend, onClose,
}: { onSend: (blob: Blob, dur: number) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [facingUser, setFacingUser] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_SECS = 60;

  const startStream = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingUser ? "user" : "environment", width: 400, height: 400 },
        audio: true,
      });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setStreaming(true);
    } catch {
      setError("Kamera ruxsati kerak. Brauzer sozlamalaridan ruxsat bering.");
    }
  }, [facingUser]);

  useEffect(() => { startStream(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);

  const flipCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setFacingUser(f => !f);
    setTimeout(startStream, 200);
  };

  const startRec = () => {
    if (!streamRef.current || recording) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.start(100);
    recorderRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= MAX_SECS - 1) { stopRec(); return prev; }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRec = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onSend(blob, elapsed);
    };
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, [elapsed, onSend]);

  const progress = (elapsed / MAX_SECS) * 283; // 2πr where r=45

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 px-6">
      <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white">
        <X className="w-6 h-6" />
      </button>

      <p className="text-white/60 text-sm">{recording ? `${formatDur(elapsed)} / ${formatDur(MAX_SECS)}` : "Yozish uchun tugmani bosing"}</p>

      {/* Circular video preview */}
      <div className="relative w-64 h-64">
        {/* Progress ring */}
        {recording && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(120,87,255,0.3)" strokeWidth="4" />
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(120,87,255)" strokeWidth="4"
              strokeDasharray={`${(elapsed / MAX_SECS) * 301} 301`}
              strokeLinecap="round" className="transition-all" />
          </svg>
        )}
        <div className="absolute inset-2 rounded-full overflow-hidden bg-neutral-900">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <CameraOff className="w-12 h-12 text-white/30" />
              <p className="text-white/50 text-xs text-center px-4">{error}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover" style={{ transform: facingUser ? "scaleX(-1)" : "none" }} />
          )}
        </div>
        {recording && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500 rounded-full px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-bold">REC</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button onClick={flipCamera} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <RotateCcw className="w-5 h-5" />
        </button>
        <motion.button
          onPointerDown={startRec}
          onPointerUp={stopRec}
          whileTap={{ scale: 0.9 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            recording ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]" : "bg-primary shadow-[0_0_30px_rgba(120,87,255,0.4)]"
          }`}>
          {recording
            ? <StopCircle className="w-10 h-10 text-white" />
            : <Camera className="w-8 h-8 text-white" />}
        </motion.button>
        <div className="w-12 h-12" />
      </div>
      <p className="text-white/40 text-xs">{recording ? "Qo'yib yuboring — yuboriladi" : "Bosib turing — yozib oladi"}</p>
    </motion.div>
  );
}

/* ── Voice waveform (fake bars) ────────────────────────────── */
function VoiceWaveform({ duration, isMe }: { duration: number; isMe: boolean }) {
  const bars = Array.from({ length: 24 }, (_, i) => Math.max(20, Math.abs(Math.sin(i * 0.8 + 1.2) * 80)));
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = () => {
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      const step = 100 / (duration * 10);
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { setPlaying(false); if (timerRef.current) clearInterval(timerRef.current); return 0; }
          return p + step;
        });
      }, 100);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-primary/20"}`}>
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex items-center gap-0.5 flex-1">
        {bars.map((h, i) => (
          <div key={i} className={`flex-1 rounded-full transition-all ${
            (i / 24) * 100 < progress ? (isMe ? "bg-white/70" : "bg-primary") : (isMe ? "bg-white/30" : "bg-muted-foreground/30")
          }`} style={{ height: `${h * 0.3}px` }} />
        ))}
      </div>
      <span className={`text-[10px] font-mono ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
        {formatDur(Math.round(duration * (1 - progress / 100)))}
      </span>
    </div>
  );
}

/* ── Round video bubble ─────────────────────────────────────── */
function VideoNoteBubble({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  return (
    <div className="relative w-36 h-36 cursor-pointer" onClick={toggle}>
      <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
        <video ref={ref} src={url} loop playsInline className="w-full h-full object-cover" />
      </div>
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Context menu ───────────────────────────────────────────── */
function ContextMenu({
  msg, isMe, onReply, onCopy, onStar, onPin, onDelete, onForward, onClose,
}: {
  msg: LocalMsg; isMe: boolean;
  onReply: () => void; onCopy: () => void; onStar: () => void;
  onPin: () => void; onDelete: () => void; onForward: () => void; onClose: () => void;
}) {
  const items = [
    { icon: Reply,   label: "Javob berish",                                          action: onReply,   danger: false },
    { icon: Forward, label: "Yo'naltirish",                                           action: onForward, danger: false },
    { icon: Copy,    label: "Nusxa olish",                                            action: onCopy,    danger: false },
    { icon: Star,    label: msg.starred ? "Yulduzdan olish" : "Yulduzga qo'shish",   action: onStar,    danger: false },
    { icon: Pin,     label: msg.pinned  ? "Mahkamni olib tashlash" : "Mahkamlash",   action: onPin,     danger: false },
    { icon: Trash2,  label: "O'chirish",                                              action: onDelete,  danger: true  },
  ];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className={`absolute z-50 bottom-full mb-1 ${isMe ? "right-0" : "left-0"} bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[190px]`}>
      {items.map((it, i) => (
        <button key={i} onClick={() => { it.action(); onClose(); }}
          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${it.danger ? "text-destructive" : "text-foreground"}`}>
          <it.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
          {it.label}
        </button>
      ))}
    </motion.div>
  );
}

/* ── Message bubble ─────────────────────────────────────────── */
function MsgBubble({
  msg, isMe, onReply, onUpdate, onDelete,
}: {
  msg: LocalMsg; isMe: boolean;
  onReply: (m: LocalMsg) => void;
  onUpdate: (id: string, patch: Partial<LocalMsg>) => void;
  onDelete: (id: string) => void;
}) {
  const [showCtx, setShowCtx] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const handleReaction = (emoji: string) => {
    const existing = msg.reactions.find(r => r.emoji === emoji);
    const updated = existing
      ? msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.mine ? r.count - 1 : r.count + 1, mine: !r.mine } : r).filter(r => r.count > 0)
      : [...msg.reactions, { emoji, count: 1, mine: true }];
    onUpdate(msg.id, { reactions: updated });
    setShowReactions(false);
  };

  const isNoBubble = msg.type === "video_note" || msg.type === "sticker";
  const bubbleCls = `max-w-xs relative ${isNoBubble ? "bg-transparent" : isMe
    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
    : "bg-card border border-border text-foreground rounded-2xl rounded-bl-sm"}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative`}
    >
      {/* Reply indicator */}
      {msg.replyTo && (
        <div className="mb-1 px-3 py-1.5 rounded-xl border-l-2 border-primary bg-muted/50 text-xs max-w-xs">
          <p className="font-semibold text-primary text-[10px]">{msg.replyTo.sender}</p>
          <p className="text-muted-foreground truncate">{msg.replyTo.content}</p>
        </div>
      )}

      {/* Forwarded label */}
      {msg.forwarded && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
          <Forward className="w-3 h-3" />Yo'naltirilgan
        </div>
      )}

      {/* Bubble */}
      <div className="relative">
        <motion.div
          onDoubleClick={() => setShowReactions(true)}
          onContextMenu={e => { e.preventDefault(); setShowCtx(true); }}
          className={`${bubbleCls} cursor-pointer select-none`}
        >
          {/* Content by type */}
          {msg.type === "text" && (
            <div className="px-4 py-2.5">
              {msg.isEphemeral && <span className="text-violet-300 mr-1">👻</span>}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          )}
          {msg.type === "image" && msg.mediaUrl && (
            <div className="overflow-hidden rounded-2xl">
              <img src={msg.mediaUrl} alt="" className="max-w-[220px] max-h-[220px] object-cover" />
              {msg.content && <p className="px-3 py-2 text-sm">{msg.content}</p>}
            </div>
          )}
          {msg.type === "voice" && (
            <div className="px-3 py-2.5">
              <VoiceWaveform duration={msg.duration || 5} isMe={isMe} />
            </div>
          )}
          {/* Round video — no bubble bg, just circle */}
          {msg.type === "video_note" && msg.mediaUrl && (
            <div className="flex flex-col items-center gap-1">
              <VideoNoteBubble url={msg.mediaUrl} />
              <div className="flex items-center gap-1">
                {msg.starred && <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />}
                <span className="text-[10px] text-muted-foreground">{formatTs(msg.ts)}</span>
                {isMe && (msg.status === "read"
                  ? <CheckCheck className="w-3 h-3 text-cyan-300" />
                  : <CheckCheck className="w-3 h-3 text-muted-foreground/50" />)}
              </div>
            </div>
          )}
          {msg.type === "file" && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? "bg-white/20" : "bg-primary/15"}`}>
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate max-w-[120px]">{msg.fileName || "Fayl"}</p>
                <p className="text-[10px] opacity-60">Fayl</p>
              </div>
            </div>
          )}
          {/* Sticker — no bubble bg */}
          {msg.type === "sticker" && (
            <div className="flex flex-col items-center">
              <span className="text-6xl leading-none select-none">{msg.emoji}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{formatTs(msg.ts)}</span>
                {isMe && (msg.status === "read"
                  ? <CheckCheck className="w-3 h-3 text-cyan-300" />
                  : <CheckCheck className="w-3 h-3 text-muted-foreground/50" />)}
              </div>
            </div>
          )}

          {/* Timestamp + status — only for bubble types */}
          {!isNoBubble && (
          <div className={`flex items-center gap-1 px-3 pb-2 justify-end ${msg.type === "image" ? "absolute bottom-1 right-1 bg-black/40 rounded-lg px-1.5" : ""}`}>
            {msg.starred && <Star className="w-2.5 h-2.5 opacity-60 fill-current" />}
            {msg.edited && <span className="text-[9px] opacity-50">tahrirlangan</span>}
            <span className={`text-[10px] ${msg.type === "image" ? "text-white/80" : isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {formatTs(msg.ts)}
            </span>
            {isMe && (
              msg.status === "read" ? <CheckCheck className="w-3 h-3 text-cyan-300 flex-shrink-0" />
              : msg.status === "delivered" ? <CheckCheck className="w-3 h-3 opacity-60 flex-shrink-0" />
              : <Check className="w-3 h-3 opacity-60 flex-shrink-0" />
            )}
          </div>
          )}
        </motion.div>

        {/* Quick react button (show on hover) */}
        <button
          onClick={() => setShowReactions(v => !v)}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? "-left-8" : "-right-8"} w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm`}>
          😊
        </button>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute bottom-full mb-1 ${isMe ? "right-0" : "left-0"} z-40 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-xl`}>
              {QUICK_REACTIONS.map(e => (
                <button key={e} onClick={() => handleReaction(e)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-full transition-colors">{e}</button>
              ))}
              <button onClick={() => setShowReactions(false)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context menu */}
        <AnimatePresence>
          {showCtx && (
            <ContextMenu
              msg={msg} isMe={isMe}
              onReply={() => onReply(msg)}
              onCopy={() => { navigator.clipboard.writeText(msg.content || ""); }}
              onStar={() => onUpdate(msg.id, { starred: !msg.starred })}
              onPin={() => onUpdate(msg.id, { pinned: !msg.pinned })}
              onDelete={() => onDelete(msg.id)}
              onForward={() => onUpdate(msg.id, { forwarded: true })}
              onClose={() => setShowCtx(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Reactions display */}
      {msg.reactions.length > 0 && (
        <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
          {msg.reactions.map(r => (
            <button key={r.emoji} onClick={() => handleReaction(r.emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                r.mine ? "bg-primary/15 border-primary/30" : "bg-muted border-border"
              }`}>
              {r.emoji} <span className="text-[10px]">{r.count}</span>
            </button>
          ))}
        </div>
      )}
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
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showList, setShowList] = useState(true);
  const [search, setSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [mutedConvs, setMutedConvs] = useState<Set<number>>(new Set());
  const [blockedConvs, setBlockedConvs] = useState<Set<number>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isMe: boolean } | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showStarredPanel, setShowStarredPanel] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [chatBgId, setChatBgId] = useState(() => localStorage.getItem("olcha_chat_bg") || "glass");
  const [showFmtBar, setShowFmtBar] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");

  // Chat state
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<LocalMsg | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showRoundVid, setShowRoundVid] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const [localMsgs, setLocalMsgs] = useState<LocalMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [pinnedMsg, setPinnedMsg] = useState<LocalMsg | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Voice recording
  const [voiceRec, setVoiceRec] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const voiceRecRef = useRef<MediaRecorder | null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // API
  const activeConv = convs.find(c => c.id === activeId);
  const convId = activeConv?.id ?? null;
  const { data: apiMsgs = [] } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) },
  });
  const sendApi = useSendMessage();

  // Merge API msgs + local
  const allMsgs: LocalMsg[] = [
    ...apiMsgs.map(m => ({
      id: String(m.id),
      senderId: m.senderId,
      type: "text" as MsgType,
      content: m.content,
      reactions: [],
      starred: false, pinned: false, deleted: false, edited: false, forwarded: false,
      status: "read" as const,
      ts: new Date(m.createdAt || Date.now()),
    })),
    ...localMsgs.filter(lm => lm.ts > (apiMsgs[apiMsgs.length - 1]?.createdAt ? new Date(apiMsgs[apiMsgs.length - 1].createdAt as string) : new Date(0))),
  ].sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const displayMsgs = allMsgs
    .filter(m => !hiddenMsgIds.has(m.id))
    .filter(m => !msgSearch || m.content?.toLowerCase().includes(msgSearch.toLowerCase()));

  // Filtered conversations
  const filteredConvs = convs.filter(c => {
    const other = c.participants?.find(p => p.id !== ME_ID);
    const matchSearch = !search || other?.displayName?.toLowerCase().includes(search.toLowerCase());
    if (tab === "unread") return matchSearch && (c.unreadCount || 0) > 0;
    return matchSearch;
  });

  // Scroll management
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMsgs.length, activeId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(fromBottom > 200);
  };

  // Typing simulation
  useEffect(() => {
    if (!activeConv) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (text.length > 0) {
      setTyping(true);
      typingTimer.current = setTimeout(() => setTyping(false), 2000);
    } else {
      setTyping(false);
    }
  }, [text]);

  // Helper to add local message
  const addMsg = (patch: Partial<LocalMsg>) => {
    const msg: LocalMsg = {
      id: uid(), senderId: ME_ID, type: "text", reactions: [],
      starred: false, pinned: false, deleted: false, edited: false, forwarded: false,
      status: "sending", ts: new Date(), isEphemeral: ephemeral,
      ...patch,
    };
    setLocalMsgs(prev => [...prev, msg]);
    if (msg.pinned) setPinnedMsg(msg);
    setTimeout(() => updateMsg(msg.id, { status: "delivered" }), 800);
    setTimeout(() => updateMsg(msg.id, { status: "read" }), 2000);
    return msg;
  };

  const updateMsg = (id: string, patch: Partial<LocalMsg>) => {
    setLocalMsgs(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  // Send text
  const handleSend = () => {
    if (!text.trim() || !convId) return;
    const replySender = replyTo?.senderId === ME_ID ? "Siz" : (activeConv ? getOther(activeConv)?.displayName : undefined) || "U";
    const content = replyTo ? `↩ ${replySender}: ${replyTo.content?.slice(0, 50)}\n\n${text.trim()}` : text.trim();
    addMsg({ type: "text", content, replyTo: replyTo ? { id: replyTo.id, content: replyTo.content || "", sender: replyTo.senderId === ME_ID ? "Siz" : "U" } : undefined });
    sendApi.mutate({ id: convId, data: { senderId: ME_ID, content } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(convId) }),
    });
    setText(""); setReplyTo(null);
  };

  // Image pick
  const handleImage = (file: File) => {
    const url = URL.createObjectURL(file);
    addMsg({ type: "image", mediaUrl: url, content: "" });
    // Upload in background
    uploadBlob(file, file.name, file.type).catch(() => {});
  };

  // File pick
  const handleFile = (file: File) => {
    addMsg({ type: "file", fileName: file.name });
    uploadBlob(file, file.name, file.type).catch(() => {});
  };

  // Round video send
  const handleVideoNote = (blob: Blob, dur: number) => {
    const url = URL.createObjectURL(blob);
    addMsg({ type: "video_note", mediaUrl: url, duration: dur });
    setShowRoundVid(false);
    uploadBlob(blob, "video-note.webm", "video/webm").catch(() => {});
  };

  // Voice record start
  const startVoice = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunks.current = [];
      const mr = new MediaRecorder(s, { mimeType: "audio/webm" });
      mr.ondataavailable = e => { if (e.data.size) voiceChunks.current.push(e.data); };
      mr.start(100);
      voiceRecRef.current = mr;
      setVoiceRec(true);
      setVoiceElapsed(0);
      voiceTimer.current = setInterval(() => setVoiceElapsed(p => p + 1), 1000);
    } catch { /* no mic */ }
  };

  const stopVoice = () => {
    if (!voiceRecRef.current) return;
    voiceRecRef.current.stop();
    voiceRecRef.current.onstop = () => {
      const blob = new Blob(voiceChunks.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      addMsg({ type: "voice", mediaUrl: url, duration: voiceElapsed });
      uploadBlob(blob, "voice.webm", "audio/webm").catch(() => {});
    };
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setVoiceRec(false);
    setVoiceElapsed(0);
  };

  const cancelVoice = () => {
    voiceRecRef.current?.stop();
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    setVoiceRec(false);
    setVoiceElapsed(0);
  };

  // Sticker send
  const handleSticker = (emoji: string) => {
    addMsg({ type: "sticker", emoji });
    setShowEmoji(false);
  };

  const getOther = (conv: typeof convs[0]) =>
    conv.participants?.find(p => p.id !== ME_ID) || conv.participants?.[0];

  return (
    <div className="flex overflow-hidden" style={{ height: "100dvh" }}>
      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <div className={`${showList ? "flex" : "hidden"} md:flex w-full md:w-72 flex-shrink-0 border-r border-border bg-sidebar flex-col`}>
        {/* Header */}
        <div className="px-4 border-b border-border flex-shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">{t("msg.title")}</h2>
            <button className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("msg.search_ph")}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-transparent focus:border-primary/40 transition-colors" />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-2.5">
            {(["all","unread","groups"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${tab === tb ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {tb === "all" ? "Hammasi" : tb === "unread" ? "O'qilmagan" : "Guruhlar"}
              </button>
            ))}
          </div>
        </div>

        {/* Conv list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoading ? [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-11 h-11 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3 bg-muted rounded w-2/3" /><div className="h-2.5 bg-muted rounded w-1/2" /></div>
            </div>
          )) : filteredConvs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("msg.no_convs")}</div>
          ) : filteredConvs.map(conv => {
            const other = getOther(conv);
            const isActive = conv.id === activeId;
            const isMuted = false; // future feature
            return (
              <motion.div key={conv.id} whileHover={{ x: 2 }} onClick={() => { setActiveId(conv.id); setShowList(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                    {other?.avatarUrl
                      ? <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base font-bold text-primary">{other?.displayName?.[0] || "?"}</span>}
                  </div>
                  {/* Online dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-sidebar" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{other?.displayName || "Unknown"}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">hozir</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMuted && <MicOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || t("msg.start_conv")}</p>
                  </div>
                </div>
                {(conv.unreadCount || 0) > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ══ CHAT AREA ════════════════════════════════════════════ */}
      {activeConv ? (
        <div className={`${!showList ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 relative`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 border-b border-border flex-shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}>
            <button onClick={() => setShowList(true)}
              className="md:hidden w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-shrink-0 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                {getOther(activeConv)?.avatarUrl
                  ? <img src={getOther(activeConv)!.avatarUrl!} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-primary">{getOther(activeConv)?.displayName?.[0]}</span>}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer">
              <p className="font-semibold text-foreground text-sm truncate">{getOther(activeConv)?.displayName}</p>
              <AnimatePresence mode="wait">
                <motion.p key={typing ? "typing" : "online"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs">
                  {typing
                    ? <span className="text-primary flex items-center gap-1"><span className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>yozmoqda...</span>
                    : <span className="text-emerald-400">Online</span>}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {showMsgSearch
                ? <input autoFocus value={msgSearch} onChange={e => setMsgSearch(e.target.value)}
                    onBlur={() => { setShowMsgSearch(false); setMsgSearch(""); }}
                    placeholder="Xabarda qidirish..."
                    className="w-32 px-2 py-1 rounded-lg bg-muted text-xs text-foreground focus:outline-none border border-primary/30" />
                : <button onClick={() => setShowMsgSearch(true)}
                    className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Search className="w-4 h-4" />
                  </button>}
              <button onClick={() => {}}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button onClick={() => setShowRoundVid(true)}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button onClick={() => setEphemeral(v => !v)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${ephemeral ? "bg-violet-500/20 text-violet-400" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Ghost className={`w-4 h-4 ${ephemeral ? "animate-pulse" : ""}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowChatMenu(v => !v)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${showChatMenu ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showChatMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      className="absolute top-full right-0 mt-1 z-50 w-52 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                      {[
                        { icon: Users,    label: "Profilni ko'rish",      action: () => { setShowProfilePanel(true); setShowChatMenu(false); } },
                        { icon: Search,   label: "Xabarda qidirish",       action: () => { setShowMsgSearch(true); setShowChatMenu(false); } },
                        { icon: Palette,  label: "Fon tanlash",             action: () => { setShowBgPicker(true); setShowChatMenu(false); } },
                        { icon: Pin,      label: "Mahkamlangan xabarlar",  action: () => { setShowPinnedPanel(true); setShowChatMenu(false); } },
                        { icon: Star,     label: "Yulduzli xabarlar",      action: () => { setShowStarredPanel(true); setShowChatMenu(false); } },
                        { icon: Bell,     label: convId && mutedConvs.has(convId) ? "Ovozni yoqish" : "Ovozni o'chirish",
                          action: () => {
                            if (!convId) return;
                            setMutedConvs(prev => { const s = new Set(prev); s.has(convId) ? s.delete(convId) : s.add(convId); return s; });
                            setShowChatMenu(false);
                          }
                        },
                        { icon: Trash2,   label: "Tarixni tozalash",       action: () => { setShowClearConfirm(true); setShowChatMenu(false); }, danger: true },
                        { icon: Lock,     label: convId && blockedConvs.has(convId) ? "Blokdan chiqarish" : "Bloklash",
                          action: () => {
                            if (!convId) return;
                            setBlockedConvs(prev => { const s = new Set(prev); s.has(convId) ? s.delete(convId) : s.add(convId); return s; });
                            setShowChatMenu(false);
                          }, danger: true
                        },
                      ].map((item, i) => (
                        <button key={i} onClick={item.action}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${item.danger ? "text-destructive" : "text-foreground"}`}>
                          <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Clear history confirm */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                  className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm">
                  <h3 className="font-bold text-foreground mb-1">Tarixni tozalash</h3>
                  <p className="text-sm text-muted-foreground mb-4">Barcha xabarlar o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">
                      Bekor qilish
                    </button>
                    <button onClick={() => { setLocalMsgs([]); setShowClearConfirm(false); }}
                      className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">
                      O'chirish
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete message confirm */}
          <AnimatePresence>
            {deleteTarget && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6"
                onClick={() => setDeleteTarget(null)}>
                <motion.div initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 12 }}
                  className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Xabarni o'chirish</h3>
                      <p className="text-xs text-muted-foreground">Kim uchun o'chirishni tanlang</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {deleteTarget.isMe && (
                      <button
                        onClick={() => {
                          setHiddenMsgIds(prev => new Set([...prev, deleteTarget.id]));
                          setLocalMsgs(prev => prev.filter(m => m.id !== deleteTarget.id));
                          setDeleteTarget(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                        Hamma uchun o'chirish
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setHiddenMsgIds(prev => new Set([...prev, deleteTarget.id]));
                        setLocalMsgs(prev => prev.filter(m => m.id !== deleteTarget.id));
                        setDeleteTarget(null);
                      }}
                      className="w-full py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-muted transition-colors">
                      Faqat men uchun o'chirish
                    </button>
                    <button onClick={() => setDeleteTarget(null)}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Bekor qilish
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Background picker panel ─────────────── */}
          <AnimatePresence>
            {showBgPicker && (
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute inset-0 z-40 bg-background flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                  <button onClick={() => setShowBgPicker(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-foreground">Fon tanlash</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-xs text-muted-foreground mb-3 px-1">Suhbat foni</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "glass",   label: "🪟 Shisha",     style: { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" } },
                      { id: "dark",    label: "⚫ Qora",        style: { background: "linear-gradient(135deg,#0d0d0d,#1a1a2e)" } },
                      { id: "purple",  label: "💜 Binafsha",   style: { background: "linear-gradient(135deg,#1e0533,#0d1b4b)" } },
                      { id: "blue",    label: "🔵 Ko'k",        style: { background: "linear-gradient(135deg,#020818,#0c2340)" } },
                      { id: "sunset",  label: "🌅 Quyosh",     style: { background: "linear-gradient(135deg,#1a0a00,#2d0b2e)" } },
                      { id: "emerald", label: "💚 Yashil",      style: { background: "linear-gradient(135deg,#001a12,#002a1a)" } },
                      { id: "rose",    label: "🌸 Atirgul",    style: { background: "linear-gradient(135deg,#1a001a,#2a0010)" } },
                      { id: "aurora",  label: "🌌 Aurora",     style: { background: "linear-gradient(135deg,#0d1117,#1a0533,#0d2b4b,#001a12)" } },
                      { id: "dots",    label: "⚬ Nuqtalar",   style: { background: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "20px 20px", backgroundColor: "#0f0c1c" } },
                      { id: "grid",    label: "▦ To'r",         style: { backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "28px 28px", backgroundColor: "#0a0a1a" } },
                      { id: "carbon",  label: "🔳 Carbon",     style: { backgroundImage: "repeating-linear-gradient(45deg,#1a1a1a 0,#1a1a1a 1px,#0d0d0d 0,#0d0d0d 50%)", backgroundSize: "6px 6px" } },
                    ].map(th => (
                      <button key={th.id} onClick={() => { setChatBgId(th.id); localStorage.setItem("olcha_chat_bg", th.id); }}
                        className={`relative h-24 rounded-2xl overflow-hidden transition-all ${chatBgId === th.id ? "ring-2 ring-primary scale-[1.02]" : "hover:scale-[1.01] opacity-80 hover:opacity-100"}`}
                        style={th.style}>
                        <div className="absolute inset-0 flex items-end p-2">
                          <span className="text-xs text-white/80 font-medium bg-black/40 rounded-lg px-2 py-0.5">{th.label}</span>
                        </div>
                        {chatBgId === th.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                        {/* Sample bubbles preview */}
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-xl rounded-bl-sm bg-card/60 text-[8px] text-white/70">Salom!</div>
                        <div className="absolute top-2 right-8 px-2 py-1 rounded-xl rounded-br-sm bg-primary/60 text-[8px] text-white/70">Yaxshi!</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Profile panel ───────────────────────── */}
          <AnimatePresence>
            {showProfilePanel && (() => {
              const other = activeConv?.participants?.find(p => p.id !== ME_ID);
              return (
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={() => setShowProfilePanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-foreground">Profil</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-3xl font-bold text-primary-foreground">
                        {other?.displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg text-foreground">{other?.displayName || "Foydalanuvchi"}</p>
                        <p className="text-sm text-primary">@{other?.username || "username"}</p>
                        <p className="text-xs text-muted-foreground mt-1">🟢 Onlayn</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Xabarlar", value: String(displayMsgs.length) },
                        { label: "Media fayllar", value: String(displayMsgs.filter(m => m.type === "image" || m.type === "video_note").length) },
                        { label: "Ovozli xabarlar", value: String(displayMsgs.filter(m => m.type === "voice").length) },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-xl">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <span className="text-sm font-semibold text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <button onClick={() => { setMutedConvs(prev => { const s = new Set(prev); convId && (s.has(convId) ? s.delete(convId) : s.add(convId)); return s; }); }}
                        className="flex items-center gap-3 w-full px-4 py-3 bg-muted/40 rounded-xl text-sm text-foreground hover:bg-muted transition-colors">
                        <Bell className="w-4 h-4 opacity-60" />
                        {convId && mutedConvs.has(convId) ? "Ovozni yoqish" : "Ovozni o'chirish"}
                      </button>
                      <button onClick={() => { setBlockedConvs(prev => { const s = new Set(prev); convId && (s.has(convId) ? s.delete(convId) : s.add(convId)); return s; }); }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors">
                        <Lock className="w-4 h-4 opacity-70" />
                        {convId && blockedConvs.has(convId) ? "Blokdan chiqarish" : "Bloklash"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Pinned messages panel ────────────── */}
          <AnimatePresence>
            {showPinnedPanel && (() => {
              const pinned = displayMsgs.filter(m => m.pinned);
              return (
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={() => setShowPinnedPanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-foreground">Mahkamlangan xabarlar</span>
                    <span className="ml-auto text-xs text-muted-foreground">{pinned.length} ta</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {pinned.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Pin className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Mahkamlangan xabarlar yo'q</p>
                      </div>
                    ) : pinned.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                        <Pin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2">{m.content || "📎 Media"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTs(m.ts)}</p>
                        </div>
                        <button onClick={() => { setPinnedMsg(m); setShowPinnedPanel(false); }}
                          className="text-xs text-primary hover:underline flex-shrink-0">Ko'rish</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Starred messages panel ───────────── */}
          <AnimatePresence>
            {showStarredPanel && (() => {
              const starred = displayMsgs.filter(m => m.starred);
              return (
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="absolute inset-0 z-40 bg-background flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                    <button onClick={() => setShowStarredPanel(false)} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-semibold text-foreground">Yulduzli xabarlar</span>
                    <span className="ml-auto text-xs text-muted-foreground">{starred.length} ta</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {starred.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Star className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">Yulduzli xabarlar yo'q</p>
                      </div>
                    ) : starred.map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2">{m.content || "📎 Media"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTs(m.ts)}</p>
                        </div>
                        <button onClick={() => setLocalMsgs(prev => prev.map(x => x.id === m.id ? { ...x, starred: false } : x))}
                          className="text-xs text-destructive hover:underline flex-shrink-0">Olib tashlash</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Pinned message */}
          <AnimatePresence>
            {pinnedMsg && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10 flex-shrink-0">
                <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                <p className="flex-1 text-xs text-foreground truncate">{pinnedMsg.content || "📎 Media"}</p>
                <button onClick={() => setPinnedMsg(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ghost banner */}
          <AnimatePresence>
            {ephemeral && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/8 border-b border-violet-500/20 flex-shrink-0">
                <Ghost className="w-3.5 h-3.5 text-violet-400 animate-pulse flex-shrink-0" />
                <p className="text-xs text-violet-400 font-medium">{t("msg.ghost_banner")}</p>
                <button onClick={() => setEphemeral(false)} className="ml-auto text-violet-400/60 hover:text-violet-400">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages area with glass/bg effect */}
          <div ref={listRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
            style={(() => {
              const themes: Record<string, React.CSSProperties> = {
                glass:    { background: "rgba(var(--background-rgb,15,12,28),0.45)", backdropFilter: "blur(20px)" },
                dark:     { background: "linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%)" },
                purple:   { background: "linear-gradient(135deg,#1e0533 0%,#0d1b4b 100%)" },
                blue:     { background: "linear-gradient(135deg,#020818 0%,#0c2340 100%)" },
                sunset:   { background: "linear-gradient(135deg,#1a0a00 0%,#2d0b2e 100%)" },
                emerald:  { background: "linear-gradient(135deg,#001a12 0%,#002a1a 100%)" },
                rose:     { background: "linear-gradient(135deg,#1a001a 0%,#2a0010 100%)" },
                dots:     { background: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px", backgroundColor: "#0f0c1c" },
                grid:     { backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", backgroundColor: "#0a0a1a" },
                aurora:   { background: "linear-gradient(135deg,#0d1117 0%,#1a0533 30%,#0d2b4b 60%,#001a12 100%)" },
                carbon:   { backgroundImage: "repeating-linear-gradient(45deg,#1a1a1a 0,#1a1a1a 1px,#0d0d0d 0,#0d0d0d 50%)", backgroundSize: "6px 6px" },
              };
              return themes[chatBgId] ?? themes.glass;
            })()}>
            {displayMsgs.map((msg, i) => {
              const isMe = msg.senderId === ME_ID;
              const prevMsg = displayMsgs[i - 1];
              const showDate = !prevMsg || !isSameDay(msg.ts, prevMsg.ts);
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {dayLabel(msg.ts)}
                      </span>
                    </div>
                  )}
                  <MsgBubble msg={msg} isMe={isMe}
                    onReply={m => setReplyTo(m)}
                    onDelete={(id) => setDeleteTarget({ id, isMe })}
                    onUpdate={(id, patch) => setLocalMsgs(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))} />
                </div>
              );
            })}
            {displayMsgs.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{t("msg.say_hello")}</p>
                <p className="text-xs mt-1 opacity-60">👋 Salom yuboring!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Jump to bottom */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="absolute bottom-24 right-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-primary hover:bg-muted transition-colors z-10">
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Voice recording overlay */}
          <AnimatePresence>
            {voiceRec && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <Mic className="w-10 h-10 text-red-400 animate-pulse" />
                </div>
                <p className="text-2xl font-mono font-bold text-foreground">{formatDur(voiceElapsed)}</p>
                <p className="text-sm text-muted-foreground">Ovozli xabar yozilmoqda...</p>
                <div className="flex gap-4">
                  <button onClick={cancelVoice}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-sm">
                    <X className="w-4 h-4" /> Bekor
                  </button>
                  <button onClick={stopVoice}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                    <Send className="w-4 h-4" /> Yuborish
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply bar */}
          <AnimatePresence>
            {replyTo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-t border-primary/20 flex-shrink-0">
                <Reply className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-primary font-semibold">{replyTo.senderId === ME_ID ? "Siz" : getOther(activeConv)?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.content || "📎 Media"}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className={`px-3 flex-shrink-0 border-t transition-colors ${ephemeral ? "border-violet-500/30 bg-violet-500/5" : "border-border"}`}
            style={{ paddingTop: 10, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}>

            {/* Emoji picker popup */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-2 left-3 z-30">
                  <EmojiPicker onPick={e => {
                    if (["😊","😂","❤️","👍","🔥","🎉","😭","🤣"].includes(e)) handleSticker(e);
                    else setText(prev => prev + e);
                    setShowEmoji(false);
                  }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attach menu popup */}
            <AnimatePresence>
              {showAttach && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-2 left-3 z-30">
                  <AttachMenu
                    onPhoto={() => imgInputRef.current?.click()}
                    onFile={() => fileInputRef.current?.click()}
                    onLocation={() => addMsg({ type: "text", content: "📍 Joylashuv yuborildi: Toshkent, O'zbekiston" })}
                    onPoll={() => addMsg({ type: "text", content: "📊 So'rovnoma yaratildi" })}
                    onSticker={() => { const stickers = ["🎉","🔥","💯","❤️","😂","🚀"]; addMsg({ type: "sticker", emoji: stickers[Math.floor(Math.random()*stickers.length)] }); }}
                    onClose={() => setShowAttach(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formatting toolbar */}
            <AnimatePresence>
              {showFmtBar && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1 px-1 pb-1 overflow-x-auto">
                  {[
                    { icon: Bold,      label: "Qalin",    wrap: ["**","**"] },
                    { icon: Italic,    label: "Kursiv",   wrap: ["_","_"] },
                    { icon: AlignLeft, label: "Blok",     wrap: ["> ",""] },
                    { icon: Hash,      label: "Kod",      wrap: ["`","`"] },
                    { icon: AtSign,    label: "Mention",  wrap: ["@",""] },
                  ].map(fmt => (
                    <button key={fmt.label}
                      onClick={() => setText(prev => `${prev}${fmt.wrap[0]}${fmt.wrap[1]}`)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title={fmt.label}>
                      <fmt.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
                  {["❤️","😂","🔥","👍","🎉","💯"].map(e => (
                    <button key={e} onClick={() => setText(prev => prev + e)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-base transition-colors">
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule mode bar */}
            <AnimatePresence>
              {scheduleMode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-1 pb-1">
                  <Clock3 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Yuborish vaqti:</span>
                  <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="flex-1 text-xs bg-muted rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => setScheduleMode(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              {/* Attach button */}
              <button onClick={() => { setShowAttach(v => !v); setShowEmoji(false); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 mb-0.5 ${showAttach ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Plus className="w-4 h-4" />
              </button>

              {/* Text input */}
              <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden transition-colors ${ephemeral ? "border-violet-500/40 bg-violet-500/5" : "border-border bg-card"}`}>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={ephemeral ? t("msg.ghost_ph") : scheduleMode ? "Rejalashtirilgan xabar..." : t("msg.msg_ph")}
                  rows={1}
                  className="flex-1 px-4 pt-2.5 pb-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none resize-none max-h-28"
                  style={{ fieldSizing: "content" } as React.CSSProperties} />
                <div className="flex items-center px-2 pb-1.5 gap-1">
                  <button onClick={() => { setShowEmoji(v => !v); setShowAttach(false); }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showEmoji ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Smile className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowFmtBar(v => !v)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showFmtBar ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    title="Formatlash">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setScheduleMode(v => !v)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${scheduleMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    title="Rejalash">
                    <Clock3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right button: Send | Mic | Camera */}
              {text.trim() ? (
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 ${scheduleMode ? "bg-amber-600 text-white" : ephemeral ? "bg-violet-600 text-white" : "bg-primary text-primary-foreground"}`}>
                  {scheduleMode ? <Clock3 className="w-4 h-4" /> : ephemeral ? <Ghost className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </motion.button>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowRoundVid(true)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                    <Camera className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onPointerDown={startVoice}
                    onPointerUp={stopVoice}
                    onPointerLeave={cancelVoice}
                    whileTap={{ scale: 0.9 }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${voiceRec ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"}`}>
                    <Mic className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>

            {/* Hidden file inputs */}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }} />
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">{t("msg.select_conv")}</p>
        </div>
      )}

      {/* ── Round video recorder overlay ────────────────────────── */}
      <AnimatePresence>
        {showRoundVid && (
          <RoundVideoRecorder onSend={handleVideoNote} onClose={() => setShowRoundVid(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
