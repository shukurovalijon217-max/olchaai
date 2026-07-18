import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Copy, Check, Send, Users, Link2,
  PlayCircle, PauseCircle, Loader2, Crown,
  Wifi, WifiOff, Tv2, X, Hand, Volume2, VolumeX,
  Maximize2, Minimize2, SkipForward,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = (import.meta.env.VITE_API_BASE_URL || "https://olchaai-api.onrender.com");
const WS_URL = import.meta.env.VITE_WS_URL
  ?? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/go/ws`;

/* ── Design tokens ── */
const C = {
  bg:        "#07070f",
  surface:   "rgba(255,255,255,0.04)",
  surfaceHi: "rgba(255,255,255,0.07)",
  border:    "rgba(255,255,255,0.08)",
  violet:    "#8b5cf6",
  violetDim: "rgba(139,92,246,0.15)",
  green:     "#22d3ee",
  greenDim:  "rgba(34,211,238,0.12)",
  gold:      "#f59e0b",
  text:      "rgba(255,255,255,0.92)",
  sub:       "rgba(255,255,255,0.45)",
  muted:     "rgba(255,255,255,0.07)",
};

const REACTIONS = ["❤️", "😂", "🔥", "👏", "😮", "🎉"];

interface Member { id: number; username: string; displayName: string; avatarUrl?: string | null; }
interface ContentInfo { videoUrl?: string | null; thumbnailUrl?: string | null; caption?: string | null; title?: string | null; }
interface Room { id: number; hostId: number; contentType: string; contentId: number; status: string; inviteCode: string; memberCount: number; members: Member[]; content?: ContentInfo | null; }
interface ChatMsg { fromId: number; text: string; ts: number; displayName?: string; isReaction?: boolean; }
interface FloatingReaction { id: number; emoji: string; x: number; }

function Avatar({ m, size = 28, ring }: { m: Member; size?: number; ring?: string }) {
  return m.avatarUrl ? (
    <img loading="lazy" decoding="async" src={m.avatarUrl}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover",
        border: ring ? `2px solid ${ring}` : `1.5px solid ${C.border}`, flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: size * 0.38,
      fontWeight: 700, color: "white", border: ring ? `2px solid ${ring}` : "none" }}>
      {(m.displayName || m.username)[0].toUpperCase()}
    </div>
  );
}

export default function CoViewPage() {
  const { user } = useAuth();
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const code = params.code?.toUpperCase();

  const [room, setRoom]             = useState<Room | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [msgInput, setMsgInput]     = useState("");
  const [copied, setCopied]         = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [syncTime, setSyncTime]     = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [joinCode, setJoinCode]     = useState("");
  const [joining, setJoining]       = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [theater, setTheater]       = useState(false);
  const [muted, setMuted]           = useState(false);
  const [floatingRx, setFloatingRx] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Set<number>>(new Set());
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [syncIndicator, setSyncIndicator] = useState(false);

  const wsRef       = useRef<WebSocket | null>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const rxCounter   = useRef(0);
  const isHost      = room?.hostId === user?.id;

  /* ── WebSocket ── */
  const connect = useCallback((roomCode: string) => {
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
          setMessages(prev => [...prev, { fromId: msg.fromId, text: msg.payload?.text ?? "", ts: msg.ts, displayName: msg.payload?.displayName, isReaction: msg.payload?.isReaction }]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          if (msg.payload?.isReaction) spawnReaction(msg.payload?.text);
        }
        if (msg.type === "coview_sync") {
          /* Only apply sync from host */
          const time    = msg.payload?.time ?? 0;
          const playing = msg.payload?.playing ?? false;
          setSyncTime(time);
          setIsPlaying(playing);
          setSyncIndicator(true);
          setTimeout(() => setSyncIndicator(false), 1500);
          if (videoRef.current) {
            if (Math.abs(videoRef.current.currentTime - time) > 1.5) videoRef.current.currentTime = time;
            playing ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
          }
        }
        if (msg.type === "coview_hand") {
          setRaisedHands(prev => {
            const n = new Set(prev);
            msg.payload?.raised ? n.add(msg.fromId) : n.delete(msg.fromId);
            return n;
          });
        }
      } catch { /* ignore */ }
    };
    wsRef.current = ws;
  }, [user?.id]);

  const fetchRoom = async (roomCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/coview/rooms/${roomCode}`, { credentials: "include" });
      if (!res.ok) { setError("Xona topilmadi"); return; }
      setRoom(await res.json());
      connect(roomCode);
    } catch { setError("Ulanishda xatolik"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (code && code !== "new") fetchRoom(code);
    else setLoading(false);
    return () => wsRef.current?.close();
  }, [code]);

  /* ── Floating reaction ── */
  const spawnReaction = (emoji: string) => {
    const id = ++rxCounter.current;
    const x  = 10 + Math.random() * 80;
    setFloatingRx(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingRx(prev => prev.filter(r => r.id !== id)), 2200);
  };

  /* ── Host sync control ── */
  const sendSync = (playing: boolean) => {
    if (!isHost) return;
    const currentTime = videoRef.current?.currentTime ?? syncTime;
    setIsPlaying(playing);
    playing ? videoRef.current?.play().catch(() => {}) : videoRef.current?.pause();
    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
      type: "coview_sync", roomId: code, payload: { playing, time: currentTime },
    }));
  };

  const skipForward = () => {
    if (!isHost || !videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || 0);
    sendSync(isPlaying);
  };

  /* ── Chat & reactions ── */
  const sendMsg = () => {
    if (!msgInput.trim()) return;
    const text = msgInput.trim();
    setMsgInput("");
    setMessages(prev => [...prev, { fromId: user?.id ?? 0, text, ts: Date.now(), displayName: user?.displayName ?? user?.username }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
      type: "coview_chat", roomId: code,
      payload: { text, displayName: user?.displayName ?? user?.username },
    }));
  };

  const sendReaction = (emoji: string) => {
    spawnReaction(emoji);
    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
      type: "coview_chat", roomId: code,
      payload: { text: emoji, displayName: user?.displayName ?? user?.username, isReaction: true },
    }));
  };

  const toggleHand = () => {
    const raised = !myHandRaised;
    setMyHandRaised(raised);
    if (user?.id) {
      setRaisedHands(prev => { const n = new Set(prev); raised ? n.add(user.id) : n.delete(user.id); return n; });
    }
    wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({
      type: "coview_hand", roomId: code, payload: { raised },
    }));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${location.origin}/coview/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ── Render: Loading ── */
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.violet}`, borderTopColor: "transparent" }} />
    </div>
  );

  /* ── Render: Join screen ── */
  if (!code || code === "NEW") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "0 20px" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 380, borderRadius: 28, padding: "28px 24px",
          border: `1px solid ${C.border}`, background: "linear-gradient(160deg,rgba(139,92,246,0.06),rgba(59,130,246,0.04))",
          backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: C.violetDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tv2 style={{ width: 24, height: 24, color: C.violet }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: C.text, fontSize: 18 }}>Birga tomosha</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Xona kodini kiriting</div>
          </div>
        </div>
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
            {error}
          </motion.div>
        )}
        <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && joinCode.trim().length >= 6 && (() => {
            setJoining(true);
            fetch(`${API}/api/coview/rooms/${joinCode.trim()}/join`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
              .then(r => r.ok ? setLocation(`/coview/${joinCode.trim().toUpperCase()}`) : r.json().then(d => setError(d.error ?? "Xona topilmadi")))
              .catch(() => setError("Xatolik"))
              .finally(() => setJoining(false));
          })()}
          placeholder="Masalan: 9C39DD87" maxLength={8}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: C.muted, border: `1.5px solid ${C.border}`,
            color: C.text, fontSize: 16, fontFamily: "monospace", letterSpacing: "0.18em", outline: "none", marginBottom: 16,
            boxSizing: "border-box", textAlign: "center" }} />
        <motion.button whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (!joinCode.trim()) return;
            setJoining(true);
            fetch(`${API}/api/coview/rooms/${joinCode.trim()}/join`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
              .then(r => r.ok ? setLocation(`/coview/${joinCode.trim().toUpperCase()}`) : r.json().then(d => setError(d.error ?? "Xona topilmadi")))
              .catch(() => setError("Xatolik"))
              .finally(() => setJoining(false));
          }}
          disabled={!joinCode.trim() || joining}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14,
            background: `linear-gradient(135deg,${C.violet},#3b82f6)`, color: "white",
            fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: (!joinCode.trim() || joining) ? 0.5 : 1, transition: "opacity 0.2s" }}>
          {joining ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent" }} />
            : <Tv2 style={{ width: 16, height: 16 }} />}
          Xonaga kirish
        </motion.button>
        <button onClick={() => setLocation("/")}
          style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 12, background: "none", border: `1px solid ${C.border}`, color: C.sub, fontSize: 13, cursor: "pointer" }}>
          Orqaga
        </button>
      </motion.div>
    </div>
  );

  /* ── Render: Error ── */
  if (error || !room) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: C.bg }}>
      <div style={{ width: 60, height: 60, borderRadius: 20, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X style={{ width: 26, height: 26, color: "#f87171" }} />
      </div>
      <p style={{ color: C.sub, fontSize: 14 }}>{error ?? "Xona topilmadi"}</p>
      <button onClick={() => setLocation("/")} style={{ display: "flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Orqaga
      </button>
    </div>
  );

  /* ── Main room ── */
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      maxWidth: theater ? "100%" : 520, margin: "0 auto", padding: theater ? 0 : "0 0 80px" }}>

      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-120px) scale(1.4);opacity:0} }
        @keyframes handBounce { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-15deg)} 75%{transform:rotate(15deg)} }
        .cv-input:focus{border-color:rgba(139,92,246,0.5)!important;box-shadow:0 0 0 3px rgba(139,92,246,0.12)!important}
        .cv-msg-scroll::-webkit-scrollbar{width:3px} .cv-msg-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
      `}</style>

      {/* ════ HEADER ════ */}
      {!theater && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 8px" }}>
          <button onClick={() => setLocation("/")}
            style={{ width: 36, height: 36, borderRadius: 12, background: C.muted, border: `1px solid ${C.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ArrowLeft style={{ width: 16, height: 16, color: C.sub }} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tv2 style={{ width: 14, height: 14, color: C.violet, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, color: C.text, fontSize: 15, letterSpacing: "-0.01em" }}>Birga Ko'rish</span>
              {/* Connection dot */}
              <div style={{ display: "flex", alignItems: "center", gap: 4,
                background: wsConnected ? "rgba(34,211,238,0.1)" : "rgba(239,68,68,0.1)",
                borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>
                {wsConnected
                  ? <Wifi style={{ width: 9, height: 9, color: C.green }} />
                  : <WifiOff style={{ width: 9, height: 9, color: "#f87171" }} />}
                <span style={{ fontSize: 10, color: wsConnected ? C.green : "#f87171", fontWeight: 700 }}>
                  {wsConnected ? "Jonli" : "Uzildi"}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
              {room.memberCount} tomoshabin
              {raisedHands.size > 0 && <span style={{ marginLeft: 8, color: C.gold }}>✋ {raisedHands.size}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <button onClick={() => setShowMembers(!showMembers)}
            style={{ width: 34, height: 34, borderRadius: 11, background: showMembers ? C.violetDim : C.muted,
              border: `1px solid ${showMembers ? C.violet : C.border}`, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users style={{ width: 14, height: 14, color: showMembers ? C.violet : C.sub }} />
          </button>
          <button onClick={copyLink}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 11,
              background: copied ? "rgba(34,211,238,0.08)" : C.muted, border: `1px solid ${copied ? "rgba(34,211,238,0.3)" : C.border}`,
              color: copied ? C.green : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.25s", whiteSpace: "nowrap" }}>
            {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
            {copied ? "Nusxa!" : "Havola"}
          </button>
        </div>
      )}

      {/* ════ INVITE CODE BAR ════ */}
      {!theater && (
        <div style={{ margin: "6px 16px 10px", padding: "10px 14px", borderRadius: 16,
          background: "linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.07))",
          border: `1px solid rgba(139,92,246,0.18)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 style={{ width: 13, height: 13, color: "#a78bfa", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.sub }}>Kod:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#c4b5fd", fontSize: 15, letterSpacing: "0.15em" }}>
              {room.inviteCode}
            </span>
          </div>
          {/* Stacked avatars */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {room.members.slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i, position: "relative" }}>
                <Avatar m={m} size={24} ring={m.id === room.hostId ? C.gold : undefined} />
              </div>
            ))}
            {room.memberCount > 5 && (
              <div style={{ marginLeft: -8, width: 24, height: 24, borderRadius: "50%", background: C.muted, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.sub, fontWeight: 700, zIndex: 0 }}>
                +{room.memberCount - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ MEMBERS PANEL ════ */}
      <AnimatePresence>
        {showMembers && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ margin: "0 16px 10px", overflow: "hidden" }}>
            <div style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tomoshabinlar ({room.memberCount})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {room.members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar m={m} size={30} ring={m.id === room.hostId ? C.gold : undefined} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {m.displayName || m.username}
                        {m.id === room.hostId && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(245,158,11,0.12)", borderRadius: 20, padding: "1px 7px", fontSize: 10, color: C.gold }}>
                            <Crown style={{ width: 9, height: 9 }} /> Host
                          </span>
                        )}
                        {raisedHands.has(m.id) && <span style={{ fontSize: 14 }}>✋</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ VIDEO PLAYER ════ */}
      <div style={{ position: "relative", margin: theater ? 0 : "0 16px", borderRadius: theater ? 0 : 20, overflow: "hidden",
        border: theater ? "none" : `1px solid ${C.border}`, background: "#000", boxShadow: theater ? "none" : "0 12px 40px rgba(0,0,0,0.5)" }}>

        {/* Floating reactions layer */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, overflow: "hidden" }}>
          <AnimatePresence>
            {floatingRx.map(r => (
              <motion.div key={r.id}
                initial={{ y: "90%", opacity: 1, scale: 1 }}
                animate={{ y: "-20%", opacity: 0, scale: 1.5 }}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{ position: "absolute", left: `${r.x}%`, bottom: 0, fontSize: 26, userSelect: "none" }}>
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Video or placeholder */}
        {room.content?.videoUrl ? (
          <video ref={videoRef} src={room.content.videoUrl}
            poster={room.content.thumbnailUrl ?? undefined}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }}
            playsInline controls={false} muted={muted}
            onTimeUpdate={() => { if (videoRef.current) setSyncTime(Math.floor(videoRef.current.currentTime)); }} />
        ) : (
          <div style={{ aspectRatio: "16/9", background: "linear-gradient(160deg,#12001f,#000823)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}>
              <Tv2 style={{ width: 40, height: 40, color: "rgba(139,92,246,0.6)" }} />
            </motion.div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600 }}>
              {room.content?.caption ?? room.content?.title ?? "Kontent yuklanmoqda…"}
            </p>
          </div>
        )}

        {/* Top overlay: live badge + theater toggle */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "4px 10px" }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>{room.memberCount} jonli</span>
          </div>
          <button onClick={() => setTheater(!theater)} style={{ pointerEvents: "all", width: 30, height: 30, borderRadius: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: `1px solid rgba(255,255,255,0.1)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {theater ? <Minimize2 style={{ width: 12, height: 12, color: "white" }} /> : <Maximize2 style={{ width: 12, height: 12, color: "white" }} />}
          </button>
        </div>

        {/* Bottom overlay: time + sync indicator */}
        <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "3px 9px", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.75)" }}>
            {fmtTime(syncTime)}
          </div>
          <AnimatePresence>
            {syncIndicator && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ background: "rgba(139,92,246,0.75)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "white", fontWeight: 700 }}>
                Sinxron ✓
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setMuted(!muted)}
            style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {muted ? <VolumeX style={{ width: 12, height: 12, color: "rgba(255,255,255,0.7)" }} /> : <Volume2 style={{ width: 12, height: 12, color: "rgba(255,255,255,0.7)" }} />}
          </button>
        </div>
      </div>

      {/* ════ HOST CONTROLS (faqat host ko'radi) ════ */}
      {isHost && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ margin: "10px 16px 0", padding: "12px 16px", borderRadius: 18,
            background: "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(139,92,246,0.06))",
            border: `1px solid rgba(245,158,11,0.2)`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Crown style={{ width: 14, height: 14, color: C.gold }} />
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 800 }}>Host nazorati</span>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {/* Skip +10s */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={skipForward}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 12,
                border: `1px solid ${C.border}`, background: C.muted, color: C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <SkipForward style={{ width: 13, height: 13 }} /> +10s
            </motion.button>
            {/* Play / Pause */}
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => sendSync(!isPlaying)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 12,
                border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, transition: "all 0.2s",
                background: isPlaying
                  ? "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.1))"
                  : "linear-gradient(135deg,rgba(34,211,238,0.2),rgba(139,92,246,0.15))",
                color: isPlaying ? "#f87171" : C.green,
                boxShadow: `0 0 16px ${isPlaying ? "rgba(239,68,68,0.2)" : "rgba(34,211,238,0.2)"}` }}>
              {isPlaying
                ? <><PauseCircle style={{ width: 16, height: 16 }} /> To'xtat</>
                : <><PlayCircle style={{ width: 16, height: 16 }} /> O'ynат</>}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ════ VIEWER STATUS (host bo'lmasa ko'rsatiladi) ════ */}
      {!isHost && (
        <div style={{ margin: "10px 16px 0", padding: "10px 14px", borderRadius: 14,
          background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isPlaying ? C.green : C.sub,
              boxShadow: isPlaying ? `0 0 8px ${C.green}` : "none", transition: "all 0.3s" }} />
            <span style={{ fontSize: 12, color: isPlaying ? C.text : C.sub }}>
              {isPlaying ? "Host o'ynаtyapti" : "Host to'xtatdi"}
            </span>
          </div>
          {/* Raise hand */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={toggleHand}
            animate={myHandRaised ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            transition={{ duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20,
              background: myHandRaised ? "rgba(245,158,11,0.15)" : C.muted,
              border: `1px solid ${myHandRaised ? "rgba(245,158,11,0.35)" : C.border}`,
              color: myHandRaised ? C.gold : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
            <Hand style={{ width: 12, height: 12 }} />
            {myHandRaised ? "Tushirish" : "Qo'l ko'tarish"}
          </motion.button>
        </div>
      )}

      {/* ════ EMOJI REACTIONS ════ */}
      {!theater && (
        <div style={{ margin: "10px 16px 0", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {REACTIONS.map(emoji => (
            <motion.button key={emoji} whileTap={{ scale: 0.8, rotate: 10 }}
              onClick={() => sendReaction(emoji)}
              style={{ width: 40, height: 40, borderRadius: 14, background: C.muted, border: `1px solid ${C.border}`,
                fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {emoji}
            </motion.button>
          ))}
        </div>
      )}

      {/* ════ CHAT ════ */}
      {!theater && (
        <div style={{ margin: "10px 16px 0", borderRadius: 20, border: `1px solid ${C.border}`,
          background: C.surface, display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 200 }}>

          {/* Chat header */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: "0.04em" }}>CHAT</span>
            {!wsConnected && (
              <span style={{ fontSize: 10, color: "#f87171", background: "rgba(239,68,68,0.1)", borderRadius: 6, padding: "2px 7px" }}>
                Uzilgan
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="cv-msg-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 6, maxHeight: 220 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: C.sub, fontSize: 12, paddingTop: 28 }}>
                Hali xabar yo'q 💬
              </div>
            )}
            {messages.filter(m => !m.isReaction).map((m, i) => {
              const isMe = m.fromId === user?.id;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: isMe ? C.violet : C.muted,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", flexShrink: 0 }}>
                    {(m.displayName ?? "?")[0].toUpperCase()}
                  </div>
                  <div style={{ maxWidth: "74%", padding: "7px 11px",
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : C.surfaceHi,
                    fontSize: 13, color: C.text, lineHeight: 1.45 }}>
                    {!isMe && <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", marginBottom: 3 }}>{m.displayName}</div>}
                    {m.text}
                  </div>
                </motion.div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
            <input className="cv-input" value={msgInput} onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMsg()}
              placeholder="Xabar yozing…"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 14, background: C.muted,
                border: `1.5px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", transition: "all 0.2s" }} />
            <motion.button whileTap={{ scale: 0.85 }} onClick={sendMsg}
              style={{ width: 40, height: 40, borderRadius: 13, background: `linear-gradient(135deg,${C.violet},#6d28d9)`,
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send style={{ width: 15, height: 15, color: "white" }} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Theater mode chat mini overlay */}
      {theater && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ position: "fixed", right: 12, bottom: 80, width: 260, maxHeight: 340, borderRadius: 20,
            background: "rgba(7,7,15,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 50 }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>CHAT</span>
            <button onClick={() => setTheater(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <Minimize2 style={{ width: 12, height: 12, color: C.sub }} />
            </button>
          </div>
          <div className="cv-msg-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
            {messages.filter(m => !m.isReaction).slice(-20).map((m, i) => (
              <div key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                <span style={{ color: "#a78bfa", fontWeight: 700 }}>{m.displayName}: </span>{m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: `1px solid ${C.border}` }}>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMsg()}
              placeholder="Yozing…"
              style={{ flex: 1, padding: "7px 10px", borderRadius: 10, background: C.muted, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }} />
            <button onClick={sendMsg} style={{ width: 30, height: 30, borderRadius: 9, background: C.violet, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send style={{ width: 12, height: 12, color: "white" }} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
