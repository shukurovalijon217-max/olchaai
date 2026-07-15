import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import {
  Users, Link2, Copy, Check, Send, Pause, X,
  MessageCircle, Tv2, ArrowLeft, Wifi, WifiOff,
  PlayCircle, PauseCircle, Loader2, Crown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL ?? "");
const WS_URL = import.meta.env.VITE_WS_URL
  ?? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/go/ws`;

const T = {
  bg: "#0d0d14",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  violet: "#7c3aed",
  violetLight: "rgba(124,58,237,0.15)",
  green: "#10b981",
  red: "#ef4444",
  text: "rgba(255,255,255,0.9)",
  sub: "rgba(255,255,255,0.45)",
  muted: "rgba(255,255,255,0.08)",
};

interface Member {
  id: number; username: string; displayName: string;
  avatarUrl?: string | null; isVerified?: boolean;
}
interface ContentInfo {
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  title?: string | null;
}
interface Room {
  id: number; hostId: number; contentType: string; contentId: number;
  status: string; inviteCode: string; memberCount: number;
  members: Member[]; content?: ContentInfo | null;
}
interface ChatMsg { fromId: number; text: string; ts: number; displayName?: string; }

function Avatar({ m, size = 28 }: { m: Member; size?: number }) {
  return m.avatarUrl ? (
    <img src={m.avatarUrl} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.border}` }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "white",
    }}>
      {(m.displayName || m.username)[0].toUpperCase()}
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHost = room?.hostId === user?.id;

  const connect = (roomCode: string) => {
    if (!user?.id) return;
    const ws = new WebSocket(`${WS_URL}?userId=${user.id}`);
    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "coview_join", roomId: roomCode }));
    };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "coview_chat") {
          setMessages(prev => [...prev, { fromId: msg.fromId, text: msg.payload?.text ?? "", ts: msg.ts, displayName: msg.payload?.displayName }]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
        if (msg.type === "coview_sync") {
          const time = msg.payload?.time ?? 0;
          const playing = msg.payload?.playing ?? false;
          setSyncTime(time);
          setIsPlaying(playing);
          if (videoRef.current) {
            if (Math.abs(videoRef.current.currentTime - time) > 1.5) videoRef.current.currentTime = time;
            if (playing) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
          }
        }
      } catch { /* ignore */ }
    };
    wsRef.current = ws;
  };

  const fetchRoom = async (roomCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/coview/rooms/${roomCode}`, { credentials: "include" });
      if (!res.ok) { setError("Xona topilmadi"); return; }
      const data = await res.json();
      setRoom(data);
      connect(roomCode);
    } catch { setError("Ulanishda xatolik"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (code && code !== "new") fetchRoom(code);
    else { setLoading(false); setShowJoin(true); }
    return () => wsRef.current?.close();
  }, [code]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/api/coview/rooms/${joinCode.trim()}/join`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (res.ok) setLocation(`/coview/${joinCode.trim().toUpperCase()}`);
      else { const d = await res.json(); setError(d.error ?? "Xona topilmadi"); }
    } catch { setError("Ulanishda xatolik"); }
    finally { setJoining(false); }
  };

  const sendMsg = () => {
    if (!msgInput.trim()) return;
    const text = msgInput.trim();
    setMsgInput("");
    setMessages(prev => [...prev, { fromId: user?.id ?? 0, text, ts: Date.now(), displayName: user?.displayName ?? user?.username }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: "coview_chat", roomId: code,
        payload: { text, displayName: user?.displayName ?? user?.username },
      }));
    }
  };

  const sendSync = (playing: boolean) => {
    if (!isHost) return;
    const currentTime = videoRef.current?.currentTime ?? syncTime;
    setIsPlaying(playing);
    if (videoRef.current) {
      if (playing) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "coview_sync", roomId: code, payload: { playing, time: currentTime } }));
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${location.origin}/coview/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${T.violet}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (showJoin && !code) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, padding: "0 16px" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: "100%", maxWidth: 360, borderRadius: 24, padding: 24, border: `1px solid ${T.border}`, background: T.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: T.violetLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tv2 style={{ width: 22, height: 22, color: "#a78bfa" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 16 }}>Xonaga kirish</div>
            <div style={{ fontSize: 12, color: T.sub }}>Kod orqali qo'shiling</div>
          </div>
        </div>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#f87171", marginBottom: 12 }}>{error}</div>}
        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="Masalan: 9C39DD87" maxLength={8}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: T.muted, border: `1px solid ${T.border}`, color: T.text, fontSize: 15, fontFamily: "monospace", letterSpacing: "0.1em", outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
        <button onClick={handleJoin} disabled={!joinCode.trim() || joining}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, background: T.violet, color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (!joinCode.trim() || joining) ? 0.5 : 1 }}>
          {joining ? <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }} /> : <Tv2 style={{ width: 16, height: 16 }} />}
          Xonaga kirish
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </div>
  );

  if (error || !room) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: T.bg }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X style={{ width: 24, height: 24, color: "#f87171" }} />
      </div>
      <p style={{ color: T.sub, fontSize: 14 }}>{error ?? "Xona topilmadi"}</p>
      <button onClick={() => setLocation("/")} style={{ display: "flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Orqaga
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", padding: "12px 12px 80px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => setLocation("/")}
          style={{ width: 34, height: 34, borderRadius: 10, background: T.muted, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft style={{ width: 16, height: 16, color: T.sub }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tv2 style={{ width: 16, height: 16, color: "#a78bfa" }} />
            <span style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>Birga Ko'rish</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: wsConnected ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", borderRadius: 20, padding: "2px 8px" }}>
              {wsConnected
                ? <Wifi style={{ width: 10, height: 10, color: T.green }} />
                : <WifiOff style={{ width: 10, height: 10, color: T.red }} />}
              <span style={{ fontSize: 10, color: wsConnected ? T.green : T.red, fontWeight: 600 }}>
                {wsConnected ? "Jonli" : "Uzilgan"}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{room.memberCount} tomoshabin</div>
        </div>
        <button onClick={copyLink}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, background: copied ? "rgba(16,185,129,0.12)" : T.muted, border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : T.border}`, color: copied ? T.green : T.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
          {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
          {copied ? "Nusxalandi!" : "Havola"}
        </button>
      </div>

      {/* ── Invite code ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "10px 14px", borderRadius: 14, background: T.violetLight, border: `1px solid rgba(124,58,237,0.2)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 style={{ width: 14, height: 14, color: "#a78bfa" }} />
          <span style={{ fontSize: 12, color: T.sub }}>Xona kodi</span>
          <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#c4b5fd", fontSize: 14, letterSpacing: "0.12em" }}>{room.inviteCode}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {room.members.slice(0, 4).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}>
              <Avatar m={m} size={26} />
            </div>
          ))}
          {room.memberCount > 4 && (
            <div style={{ marginLeft: -8, width: 26, height: 26, borderRadius: "50%", background: T.muted, border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: T.sub, fontWeight: 700 }}>
              +{room.memberCount - 4}
            </div>
          )}
        </div>
      </div>

      {/* ── Video ── */}
      <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 10, background: "#000" }}>
        <div style={{ position: "relative" }}>
          {room.content?.videoUrl ? (
            <video
              ref={videoRef}
              src={room.content.videoUrl}
              poster={room.content.thumbnailUrl ?? undefined}
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }}
              playsInline controls={false}
              onTimeUpdate={() => { if (videoRef.current) setSyncTime(Math.floor(videoRef.current.currentTime)); }}
            />
          ) : (
            <div style={{ aspectRatio: "16/9", background: "linear-gradient(135deg,#1a0a2e,#0d1117)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}
                style={{ width: 60, height: 60, borderRadius: 18, background: T.violetLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Tv2 style={{ width: 28, height: 28, color: "#a78bfa" }} />
              </motion.div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600 }}>
                {room.content?.caption ?? room.content?.title ?? "Video yuklanmoqda..."}
              </p>
            </div>
          )}

          {/* Top badge */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{room.memberCount} jonli</span>
          </div>

          {/* Time */}
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.7)" }}>
            {fmtTime(syncTime)}
          </div>
        </div>

        {/* Controls */}
        {isHost ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Crown style={{ width: 13, height: 13, color: "#fbbf24" }} />
              <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>Host</span>
            </div>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => sendSync(!isPlaying)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s",
                background: isPlaying ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                color: isPlaying ? "#f87171" : T.green,
              }}>
              {isPlaying ? <PauseCircle style={{ width: 16, height: 16 }} /> : <PlayCircle style={{ width: 16, height: 16 }} />}
              {isPlaying ? "Hammani to'xtat" : "Hammaga o'ynат"}
            </motion.button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderTop: `1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
            {isPlaying
              ? <PlayCircle style={{ width: 13, height: 13, color: T.green }} />
              : <Pause style={{ width: 13, height: 13, color: T.sub }} />}
            <span style={{ fontSize: 11, color: T.sub }}>{isPlaying ? "Sinxron ijro etilmoqda" : "Host to'xtatdi"}</span>
          </div>
        )}
      </div>

      {/* ── Chat ── */}
      <div style={{ flex: 1, borderRadius: 18, border: `1px solid ${T.border}`, background: T.card, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
          <MessageCircle style={{ width: 14, height: 14, color: T.sub }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>Chat</span>
          {!wsConnected && (
            <span style={{ fontSize: 10, color: T.red, background: "rgba(239,68,68,0.1)", borderRadius: 6, padding: "1px 6px" }}>Ulanmagan</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 200 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: T.sub, fontSize: 12, paddingTop: 24 }}>Hali xabar yo'q</div>
          )}
          {messages.map((m, i) => {
            const isMe = m.fromId === user?.id;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: isMe ? T.violet : T.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", flexShrink: 0 }}>
                  {(m.displayName ?? "?")[0].toUpperCase()}
                </div>
                <div style={{ maxWidth: "72%", padding: "7px 11px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? T.violet : T.muted, fontSize: 13, color: isMe ? "white" : T.text, lineHeight: 1.4 }}>
                  {!isMe && <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", marginBottom: 2 }}>{m.displayName}</div>}
                  {m.text}
                </div>
              </motion.div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${T.border}` }}>
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMsg()}
            placeholder="Xabar yozing..."
            style={{ flex: 1, padding: "9px 14px", borderRadius: 12, background: T.muted, border: `1px solid ${T.border}`, color: T.text, fontSize: 13, outline: "none" }} />
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendMsg}
            style={{ width: 38, height: 38, borderRadius: 12, background: T.violet, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send style={{ width: 15, height: 15, color: "white" }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
