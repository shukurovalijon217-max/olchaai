import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Mic, MicOff, Users, Send, Heart, X,
  Radio, Loader2, PhoneOff, Eye, Gift
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useGetLive, useEndLive, useSendLiveGift } from "@workspace/api-client-react";
import { useLocation } from "wouter";

const API = (import.meta.env.VITE_API_BASE_URL || "https://olchaai-api.onrender.com");
const STUN_FALLBACK: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

let _iceCache: RTCIceServer[] | null = null;
async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (_iceCache) return _iceCache;
  try {
    const r = await fetch("/api/ice-config", { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json() as { iceServers: RTCIceServer[] };
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        _iceCache = data.iceServers;
        return _iceCache;
      }
    }
  } catch { /* fallback */ }
  return STUN_FALLBACK;
}

function buildWsUrl(userId: number) {
  const base = import.meta.env.VITE_WS_URL;
  if (base) return `${base}?userId=${userId}`;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/go/ws?userId=${userId}`;
}

const GIFT_CATALOG = [
  { type: "rose",    emoji: "🌹", label: "Atirgul",  value: 500   },
  { type: "star",    emoji: "⭐", label: "Yulduz",   value: 1000  },
  { type: "fire",    emoji: "🔥", label: "Alanga",   value: 2500  },
  { type: "crown",   emoji: "👑", label: "Toj",      value: 10000 },
  { type: "diamond", emoji: "💎", label: "Olmos",    value: 25000 },
  { type: "rocket",  emoji: "🚀", label: "Raketa",   value: 50000 },
];

interface Comment { id: number; fromId: number; fromName: string; text: string; }
interface Reaction { id: number; emoji: string; x: number; }
interface GiftAnimation { id: number; emoji: string; senderName: string; label: string; x: number; }

interface LivePageProps { liveId: number; }

export default function LivePage({ liveId }: LivePageProps) {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const { data: stream, isLoading } = useGetLive(liveId);
  const endLiveMutation = useEndLive();
  const sendGiftMutation = useSendLiveGift();
  const [, navigate] = useLocation();
  const [balance, setBalance] = useState(0);

  const isHost = me?.id === stream?.hostId;
  const roomId = String(liveId);

  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const icQueueRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>(STUN_FALLBACK);
  useEffect(() => { fetchIceServers().then(s => { iceServersRef.current = s; }).catch(() => {}); }, []);

  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewers, setViewers] = useState(stream?.viewerCount ?? 0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimation[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [liveEnded, setLiveEnded] = useState(stream?.status === "ended");
  const [liveStarted, setLiveStarted] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [sendingGift, setSendingGift] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchBalance = async () => {
    try {
      const r = await fetch(`${API}/wallet`);
      if (r.ok) { const d = await r.json(); setBalance(d.wallet?.balance ?? 0); }
    } catch {}
  };

  useEffect(() => { if (me && !isHost) fetchBalance(); }, [me?.id, isHost]);

  const addComment = (c: Comment) => {
    setComments(prev => [...prev.slice(-99), c]);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  const addReaction = (emoji: string) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, emoji, x: 20 + Math.random() * 60 }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2500);
  };
  const addGiftAnimation = (emoji: string, senderName: string, label: string) => {
    const id = Date.now() + Math.random();
    setGiftAnimations(prev => [...prev, { id, emoji, senderName, label, x: 15 + Math.random() * 50 }]);
    setTimeout(() => setGiftAnimations(prev => prev.filter(g => g.id !== id)), 3500);
  };

  const createPeer = useCallback((peerId: number): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peersRef.current.set(peerId, pc);
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type: "live_ice", toId: peerId, roomId, payload: candidate.toJSON() }));
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) peersRef.current.delete(peerId);
    };
    return pc;
  }, [roomId]);

  const drainIceQueue = useCallback(async (pc: RTCPeerConnection, peerId: number) => {
    const q = icQueueRef.current.get(peerId) ?? [];
    for (const c of q) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
    icQueueRef.current.delete(peerId);
  }, []);

  const handleMessage = useCallback(async (data: string) => {
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case "live_started": setLiveStarted(true); break;
      case "live_ended": setLiveEnded(true); break;
      case "live_viewer_joined":
        setViewers(msg.viewers ?? 0);
        if (isHost && localStreamRef.current) {
          const viewerId: number = msg.viewerId;
          const pc = createPeer(viewerId);
          localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
          const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
          await pc.setLocalDescription(offer);
          wsRef.current?.send(JSON.stringify({ type: "live_offer", toId: viewerId, roomId, payload: { sdp: offer.sdp, type: offer.type } }));
        }
        break;
      case "live_viewer_left": setViewers(msg.viewers ?? 0); break;
      case "live_joined": break;
      case "live_offer":
        if (!isHost) {
          const hostId: number = msg.fromId;
          const pc = createPeer(hostId);
          pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          await drainIceQueue(pc, hostId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current?.send(JSON.stringify({ type: "live_answer", toId: hostId, roomId, payload: { sdp: answer.sdp, type: answer.type } }));
        }
        break;
      case "live_answer":
        if (isHost) {
          const viewerId: number = msg.fromId;
          const pc = peersRef.current.get(viewerId);
          if (pc && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            await drainIceQueue(pc, viewerId);
          }
        }
        break;
      case "live_ice": {
        const peerId: number = msg.fromId;
        const pc = peersRef.current.get(peerId);
        const candidate = msg.payload as RTCIceCandidateInit;
        if (pc && pc.remoteDescription) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
        else { const q = icQueueRef.current.get(peerId) ?? []; icQueueRef.current.set(peerId, [...q, candidate]); }
        break;
      }
      case "live_comment":
        addComment({ id: msg.ts, fromId: msg.fromId, fromName: msg.payload?.username ?? `User ${msg.fromId}`, text: msg.payload?.text ?? "" });
        break;
      case "live_react":
        addReaction(msg.payload?.emoji ?? "❤️");
        break;
      case "live_gift_animation": {
        const p = msg.payload ?? {};
        const catalog = GIFT_CATALOG.find(g => g.type === p.giftType);
        addGiftAnimation(catalog?.emoji ?? p.giftEmoji ?? "🎁", p.senderName ?? "Kimdir", catalog?.label ?? p.giftType ?? "Sovg'a");
        addComment({
          id: msg.ts ?? Date.now(),
          fromId: p.senderId ?? 0,
          fromName: p.senderName ?? "Kimdir",
          text: `${catalog?.emoji ?? "🎁"} ${catalog?.label ?? "Sovg'a"} ${t("live_page.gift_sent")}`,
        });
        break;
      }
    }
  }, [isHost, roomId, createPeer, drainIceQueue, t]);

  useEffect(() => {
    if (!me || !stream) return;
    if (stream.status === "ended") { setLiveEnded(true); return; }
    const ws = new WebSocket(buildWsUrl(me.id));
    wsRef.current = ws;
    ws.onopen = () => {
      setWsReady(true);
      if (isHost) ws.send(JSON.stringify({ type: "live_start", payload: { roomId, title: stream.title } }));
      else ws.send(JSON.stringify({ type: "live_join", roomId }));
    };
    ws.onmessage = (e) => handleMessage(e.data);
    ws.onclose = () => setWsReady(false);
    return () => {
      if (!isHost && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "live_leave", roomId }));
      ws.close();
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [me?.id, stream?.id, isHost]);

  useEffect(() => {
    if (!isHost || !stream || stream.status === "ended") return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
      localStreamRef.current = s;
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
    }).catch(() => {});
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [isHost, stream?.id]);

  const toggleCam = () => { localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !camOn; }); setCamOn(v => !v); };
  const toggleMic = () => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; }); setMicOn(v => !v); };

  const sendComment = () => {
    if (!commentInput.trim() || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = commentInput.trim();
    wsRef.current.send(JSON.stringify({ type: "live_comment", roomId, payload: { text, username: me?.displayName ?? me?.username } }));
    addComment({ id: Date.now(), fromId: me?.id ?? 0, fromName: me?.displayName ?? "Siz", text });
    setCommentInput("");
  };

  const sendReaction = (emoji: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "live_react", roomId, payload: { emoji } }));
    addReaction(emoji);
  };

  const handleSendGift = async (giftType: string) => {
    setGiftError(null);
    setSendingGift(giftType);
    try {
      await sendGiftMutation.mutateAsync({ id: liveId, data: { giftType } });
      await fetchBalance();
      const catalog = GIFT_CATALOG.find(g => g.type === giftType);
      if (catalog) addGiftAnimation(catalog.emoji, me?.displayName ?? "Siz", catalog.label);
      setShowGiftPanel(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t("live_page.gift_error");
      setGiftError(msg);
    } finally {
      setSendingGift(null);
    }
  };

  const handleEndLive = async () => {
    wsRef.current?.send(JSON.stringify({ type: "live_end", roomId }));
    await endLiveMutation.mutateAsync({ id: liveId });
    navigate("/");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!stream) return <div className="flex items-center justify-center h-screen text-muted-foreground">{t("live_page.not_found")}</div>;

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden max-w-2xl mx-auto">

      {/* Video area */}
      <div className="relative flex-1 bg-black">
        {isHost
          ? <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          : <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" /> {t("live_page.live_badge")}
            </div>
            <div className="flex items-center gap-1 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              <Eye className="w-3 h-3" /> {viewers}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <p className="text-white text-xs font-semibold truncate max-w-[150px]">{stream.title}</p>
            </div>
            <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Host info (viewer) */}
        {!isHost && stream.host && (
          <div className="absolute top-14 left-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/40 overflow-hidden border border-white/20">
              {stream.host.avatarUrl
                ? <img loading="lazy" decoding="async" src={stream.host.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{stream.host?.displayName?.[0]}</div>
              }
            </div>
            <p className="text-white text-sm font-semibold">{stream.host.displayName}</p>
          </div>
        )}

        {/* Viewer balance chip */}
        {!isHost && (
          <div className="absolute top-14 right-4 bg-black/60 rounded-xl px-3 py-1.5 flex items-center gap-1">
            <span className="text-yellow-400 text-xs">💰</span>
            <span className="text-white text-xs font-semibold">{(balance / 100).toLocaleString("uz-UZ")} so'm</span>
          </div>
        )}

        {/* Reactions floating up */}
        <div className="absolute right-4 bottom-52 w-12 pointer-events-none">
          <AnimatePresence>
            {reactions.map(r => (
              <motion.div key={r.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -150, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, ease: "easeOut" }}
                style={{ left: `${r.x}%` }}
                className="absolute text-3xl"
              >{r.emoji}</motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Gift animations */}
        <div className="absolute left-4 bottom-52 right-16 pointer-events-none">
          <AnimatePresence>
            {giftAnimations.map(g => (
              <motion.div key={g.id}
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: -80, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, y: -120 }}
                transition={{ duration: 3, ease: "easeOut" }}
                style={{ left: `${g.x}%` }}
                className="absolute flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg"
              >
                <span className="text-xl">{g.emoji}</span>
                <div>
                  <p className="text-white text-xs font-bold leading-none">{g.senderName}</p>
                  <p className="text-yellow-100 text-[10px] leading-none">{g.label} {t("live_page.gift_sent")}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Gift picker panel */}
        <AnimatePresence>
          {showGiftPanel && !isHost && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", damping: 20 }}
              className="absolute bottom-36 left-4 right-4 bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-bold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-yellow-400" /> {t("live_page.send_gift")}
                </h3>
                <button onClick={() => { setShowGiftPanel(false); setGiftError(null); }} className="text-white/60 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {giftError && (
                <p className="text-red-400 text-xs mb-3 text-center bg-red-500/10 rounded-lg py-2">{giftError}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {GIFT_CATALOG.map(g => {
                  const canAfford = balance >= g.value;
                  const isSending = sendingGift === g.type;
                  return (
                    <motion.button key={g.type}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => canAfford && !isSending && handleSendGift(g.type)}
                      disabled={!canAfford || !!sendingGift}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        canAfford
                          ? "border-white/20 bg-white/5 hover:bg-white/15 hover:border-yellow-400/50"
                          : "border-white/5 bg-white/3 opacity-40"
                      }`}
                    >
                      {isSending ? <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" /> : <span className="text-2xl">{g.emoji}</span>}
                      <span className="text-white text-xs font-semibold">{g.label}</span>
                      <span className="text-yellow-400 text-[10px] font-medium">{(g.value / 100).toLocaleString()} so'm</span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-white/40 text-xs text-center mt-3">
                {t("live_page.wallet")} <span className="text-yellow-400 font-semibold">{(balance / 100).toLocaleString()} so'm</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ended overlay */}
        {liveEnded && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            <Radio className="w-12 h-12 text-muted-foreground" />
            <p className="text-white text-xl font-bold">{t("live_page.live_ended")}</p>
            <button onClick={() => navigate("/")} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold">{t("live_page.back")}</button>
          </div>
        )}
      </div>

      {/* Comments section */}
      <div className="bg-black/90 px-4 pt-2 pb-1 max-h-36 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-1 pb-1">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 items-start">
              <span className="text-primary text-xs font-bold whitespace-nowrap">{c.fromName}</span>
              <span className="text-white/80 text-xs">{c.text}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 px-4 py-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
          <input
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendComment(); }}
            placeholder={t("live_page.comment_ph")}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none"
          />
          <button onClick={sendComment} className="text-primary"><Send className="w-4 h-4" /></button>
        </div>

        {!isHost && (
          <>
            <div className="flex gap-1">
              {["❤️", "🔥", "👏"].map(e => (
                <button key={e} onClick={() => sendReaction(e)}
                  className="w-8 h-8 flex items-center justify-center text-base rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all">
                  {e}
                </button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowGiftPanel(v => !v); setGiftError(null); }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showGiftPanel ? "bg-yellow-400 text-black" : "bg-white/10 text-yellow-400"}`}
            >
              <Gift className="w-5 h-5" />
            </motion.button>
          </>
        )}

        {isHost && (
          <div className="flex items-center gap-2">
            <button onClick={toggleCam}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${camOn ? "bg-white/20 text-white" : "bg-destructive/80 text-white"}`}>
              {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={toggleMic}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${micOn ? "bg-white/20 text-white" : "bg-destructive/80 text-white"}`}>
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={handleEndLive} className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center text-white">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
