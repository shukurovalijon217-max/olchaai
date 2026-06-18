import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import {
  Users, Link2, Copy, Check, Send, Play, Pause, X,
  MessageCircle, Tv2, ArrowLeft, UserCircle2, Wifi,
  PlayCircle, PauseCircle, Volume2, Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");
const WS_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/go/ws`;

interface Member {
  id: number; username: string; displayName: string;
  avatarUrl?: string | null; isVerified?: boolean;
}
interface Room {
  id: number; hostId: number; contentType: string; contentId: number;
  status: string; inviteCode: string; memberCount: number;
  members: Member[];
}
interface ChatMsg { fromId: number; text: string; ts: number; displayName?: string; }

function Avatar({ m }: { m: Member }) {
  return m.avatarUrl ? (
    <img src={m.avatarUrl} className="w-7 h-7 rounded-full object-cover border border-border/40" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white">{(m.displayName || m.username)[0].toUpperCase()}</span>
    </div>
  );
}

export default function CoViewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const code = params.code?.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncTime, setSyncTime] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isHost = room?.hostId === user?.id;

  const connect = (roomCode: string) => {
    if (!user?.id) return;
    const ws = new WebSocket(`${WS_URL}?userId=${user.id}`);
    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "coview_join", roomId: roomCode }));
    };
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "coview_chat") {
          setMessages(prev => [...prev, { fromId: msg.fromId, text: msg.payload?.text ?? "", ts: msg.ts, displayName: msg.payload?.displayName }]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        if (msg.type === "coview_sync") {
          setSyncTime(msg.payload?.time ?? 0);
          setIsPlaying(msg.payload?.playing ?? false);
        }
      } catch { /* ignore */ }
    };
    wsRef.current = ws;
  };

  const fetchRoom = async (roomCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/coview/rooms/${roomCode}`, { credentials: "include" });
      if (!res.ok) { setError(t("coview.not_found")); return; }
      const data = await res.json();
      setRoom(data);
      connect(roomCode);
    } catch { setError(t("coview.error")); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (code && code !== "new") {
      fetchRoom(code);
    } else {
      setLoading(false);
      setShowJoin(true);
    }
    return () => {
      wsRef.current?.close();
    };
  }, [code]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/api/coview/rooms/${joinCode.trim()}/join`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (res.ok) {
        setLocation(`/coview/${joinCode.trim().toUpperCase()}`);
      } else {
        const data = await res.json();
        setError(data.error ?? t("coview.not_found"));
      }
    } catch { setError(t("coview.error")); }
    finally { setJoining(false); }
  };

  const sendMsg = () => {
    if (!msgInput.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({
      type: "coview_chat",
      roomId: code,
      payload: { text: msgInput.trim(), displayName: user?.displayName ?? user?.username },
    }));
    setMessages(prev => [...prev, { fromId: user?.id ?? 0, text: msgInput.trim(), ts: Date.now(), displayName: user?.displayName ?? user?.username }]);
    setMsgInput("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendSync = (playing: boolean, time?: number) => {
    if (!isHost || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({
      type: "coview_sync", roomId: code,
      payload: { playing, time: time ?? syncTime },
    }));
    setIsPlaying(playing);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${location.origin}/coview/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (showJoin && !code) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl p-6 border border-border/40 bg-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <Tv2 className="w-5 h-5 text-violet-400" />
          </div>
          <h2 className="text-lg font-bold">{t("coview.join_title")}</h2>
        </div>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder={t("coview.code_ph")} maxLength={8}
          className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border/50 text-sm font-mono uppercase outline-none focus:ring-2 ring-violet-500/50 mb-3" />
        <button onClick={handleJoin} disabled={!joinCode.trim() || joining}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
          {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv2 className="w-4 h-4" />}
          {t("coview.join")}
        </button>
      </motion.div>
    </div>
  );

  if (error || !room) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{error ?? t("coview.not_found")}</p>
      <button onClick={() => setLocation("/")} className="text-sm text-violet-400 hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> {t("common.back")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-20 max-w-2xl mx-auto px-3 pt-3">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-4">
        <button onClick={() => setLocation("/")} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Tv2 className="w-5 h-5 text-violet-400" />
          <h1 className="text-base font-bold">{t("coview.title")}</h1>
          <div className={`w-2 h-2 rounded-full ml-1 ${wsConnected ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
        <button onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-xs font-medium hover:bg-muted/80 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t("common.copied") : t("coview.copy_link")}
        </button>
      </motion.div>

      {/* Invite code badge */}
      <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/25">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-muted-foreground">{t("coview.invite_code")}</span>
          <span className="font-mono font-black text-violet-400 text-sm tracking-widest">{room.inviteCode}</span>
        </div>
        <div className="flex -space-x-2">
          {room.members.slice(0, 5).map(m => <Avatar key={m.id} m={m} />)}
          {room.memberCount > 5 && (
            <div className="w-7 h-7 rounded-full bg-muted border border-border/40 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">+{room.memberCount - 5}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden mb-4">
        <div className="aspect-video bg-gradient-to-br from-violet-950 to-slate-900 flex flex-col items-center justify-center relative">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-3">
            <Tv2 className="w-8 h-8 text-violet-400" />
          </motion.div>
          <p className="text-white/60 text-sm font-medium mb-1">{t("coview.content_label")}</p>
          <p className="text-white/40 text-xs font-mono">{room.contentType} #{room.contentId}</p>

          {/* Sync indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1">
            <Wifi className={`w-3 h-3 ${wsConnected ? "text-emerald-400" : "text-red-400"}`} />
            <span className="text-[10px] text-white/70">{room.memberCount} {t("coview.viewers")}</span>
          </div>

          {/* Time display */}
          <div className="absolute bottom-3 left-3 text-white/50 text-xs font-mono">
            {Math.floor(syncTime / 60)}:{String(syncTime % 60).padStart(2, "0")}
          </div>
        </div>

        {/* Playback controls (host only) */}
        {isHost && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30 bg-muted/20">
            <span className="text-xs text-violet-400 font-semibold mr-1">{t("coview.host_controls")}</span>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => sendSync(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isPlaying ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              }`}>
              {isPlaying ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              {isPlaying ? t("coview.pause_all") : t("coview.play_all")}
            </motion.button>
          </div>
        )}
        {!isHost && (
          <div className="px-4 py-2 border-t border-border/30 bg-muted/10 text-xs text-muted-foreground flex items-center gap-1.5">
            {isPlaying ? <Volume2 className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
            {isPlaying ? t("coview.synced_playing") : t("coview.synced_paused")}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 rounded-2xl border border-border/40 bg-card overflow-hidden flex flex-col min-h-0" style={{ minHeight: 220 }}>
        <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">{t("coview.chat")}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-48">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-6">{t("coview.chat_empty")}</p>
          )}
          {messages.map((m, i) => {
            const isMe = m.fromId === user?.id;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${isMe ? "bg-violet-500" : "bg-muted"}`}>
                  {(m.displayName ?? "?")[0].toUpperCase()}
                </div>
                <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-xs ${
                  isMe ? "bg-violet-600 text-white" : "bg-muted text-foreground"
                }`}>
                  {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.displayName}</p>}
                  {m.text}
                </div>
              </motion.div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="px-3 py-2.5 border-t border-border/30 flex gap-2">
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMsg()}
            placeholder={t("coview.msg_ph")}
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-violet-500/50" />
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendMsg}
            className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition">
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
