import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRealtime } from "@/context/RealtimeContext";
import { playCallRingtone, getFeaturePref } from "@/lib/sounds";
import CallUI, { type CallPhase } from "@/components/CallUI";
import { toast } from "@/hooks/use-toast";

const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // TURN relay fallback — without this, calls fail to connect across most
  // mobile-carrier/symmetric NATs since direct P2P (STUN-only) can't traverse them.
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

const RING_TIMEOUT_MS = 45000;

interface CallPeer {
  id: number;
  name: string;
  avatar?: string;
}

interface CallState {
  phase: CallPhase;
  type: "voice" | "video";
  peer: CallPeer;
}

interface CallContextValue {
  startCall: (peer: CallPeer, type: "voice" | "video") => void;
  hasActiveCall: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { send, subscribe } = useRealtime();

  const [state, setState] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const icQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const stateRef = useRef<CallState | null>(null);
  stateRef.current = state;
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
  }, []);

  const stopRingtone = useCallback(() => {
    stopRingtoneRef.current?.();
    stopRingtoneRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();
    clearRingTimeout();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    icQueueRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOn(true);
    setState(null);
  }, [stopRingtone, clearRingTimeout]);

  const sendCallMsg = useCallback((type: string, toId: number, payload?: unknown) => {
    send({ type, toId, payload: payload ?? {} });
  }, [send]);

  const ensurePeer = useCallback((toId: number) => {
    const pc = new RTCPeerConnection({ iceServers: STUN });
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      sendCallMsg("call_ice", toId, candidate.toJSON());
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setState(prev => prev ? { ...prev, phase: "connected" } : prev);
      }
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (stateRef.current) cleanup();
      }
    };
    pcRef.current = pc;
    return pc;
  }, [sendCallMsg, cleanup]);

  const drainIce = useCallback(async (pc: RTCPeerConnection) => {
    const q = icQueueRef.current;
    icQueueRef.current = [];
    for (const c of q) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
  }, []);

  const getMedia = useCallback(async (type: "voice" | "video") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { facingMode: "user" } : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback((peer: CallPeer, type: "voice" | "video") => {
    if (!user?.id || stateRef.current) return;
    setState({ phase: "ringing_out", type, peer });
    // For video calls: open camera immediately so the caller sees themselves while waiting.
    // Fire-and-forget — if the user denies the camera we continue without a preview.
    if (type === "video") {
      getMedia("video").catch(() => {});
    }
    sendCallMsg("call_invite", peer.id, {
      type,
      fromName: user.displayName ?? user.username,
      fromAvatar: user.avatarUrl ?? undefined,
    });
    if (getFeaturePref("sound_notif", true)) stopRingtoneRef.current = playCallRingtone();
    clearRingTimeout();
    ringTimeoutRef.current = setTimeout(() => {
      if (stateRef.current?.phase === "ringing_out") {
        sendCallMsg("call_hangup", peer.id, { reason: "no_answer" });
        cleanup();
        toast({ title: "Javob berilmadi", description: `${peer.name} qo'ng'iroqqa javob bermadi.` });
      }
    }, RING_TIMEOUT_MS);
  }, [user, getMedia, sendCallMsg, clearRingTimeout, cleanup]);

  const acceptCall = useCallback(async () => {
    const s = stateRef.current;
    if (!s || !user?.id) return;
    stopRingtone();
    setState({ ...s, phase: "connecting" });
    try {
      await getMedia(s.type);
      sendCallMsg("call_accept", s.peer.id, {});
    } catch {
      sendCallMsg("call_decline", s.peer.id, { reason: "media_error" });
      cleanup();
    }
  }, [user, getMedia, sendCallMsg, stopRingtone, cleanup]);

  const declineCall = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    sendCallMsg("call_decline", s.peer.id, {});
    cleanup();
  }, [sendCallMsg, cleanup]);

  const endCall = useCallback(() => {
    const s = stateRef.current;
    if (s) sendCallMsg("call_hangup", s.peer.id, {});
    cleanup();
  }, [sendCallMsg, cleanup]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOn(prev => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
      return next;
    });
  }, []);

  useEffect(() => {
    const unsubs = [
      subscribe("call_invite", async (msg) => {
        if (stateRef.current) {
          sendCallMsg("call_decline", msg.fromId, { reason: "busy" });
          return;
        }
        const p = msg.payload ?? {};
        setState({
          phase: "ringing_in",
          type: p.type === "video" ? "video" : "voice",
          peer: { id: msg.fromId, name: p.fromName ?? "Foydalanuvchi", avatar: p.fromAvatar },
        });
        if (getFeaturePref("sound_notif", true)) stopRingtoneRef.current = playCallRingtone();
      }),

      subscribe("call_accept", async (msg) => {
        const s = stateRef.current;
        if (!s || s.peer.id !== msg.fromId || s.phase !== "ringing_out") return;
        stopRingtone();
        clearRingTimeout();
        setState({ ...s, phase: "connecting" });
        try {
          // Reuse the stream already opened in startCall (for video); open now for voice.
          const stream = localStreamRef.current ?? await getMedia(s.type);
          if (!localStreamRef.current) { localStreamRef.current = stream; setLocalStream(stream); }
          const pc = ensurePeer(s.peer.id);
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendCallMsg("call_offer", s.peer.id, { sdp: offer.sdp, type: offer.type });
        } catch {
          sendCallMsg("call_hangup", s.peer.id, {});
          cleanup();
        }
      }),

      subscribe("call_offer", async (msg) => {
        const s = stateRef.current;
        if (!s || s.peer.id !== msg.fromId) return;
        try {
          const pc = ensurePeer(s.peer.id);
          localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          await drainIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendCallMsg("call_answer", s.peer.id, { sdp: answer.sdp, type: answer.type });
        } catch {
          sendCallMsg("call_hangup", s.peer.id, {});
          cleanup();
        }
      }),

      subscribe("call_answer", async (msg) => {
        const s = stateRef.current;
        const pc = pcRef.current;
        if (!s || !pc || s.peer.id !== msg.fromId) return;
        if (pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        await drainIce(pc);
      }),

      subscribe("call_ice", async (msg) => {
        const s = stateRef.current;
        const pc = pcRef.current;
        if (!s || s.peer.id !== msg.fromId) return;
        const candidate = msg.payload as RTCIceCandidateInit;
        if (pc?.remoteDescription) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
        else icQueueRef.current.push(candidate);
      }),

      subscribe("call_decline", (msg) => {
        const s = stateRef.current;
        if (!s || s.peer.id !== msg.fromId) return;
        cleanup();
      }),

      subscribe("call_hangup", (msg) => {
        const s = stateRef.current;
        if (!s || s.peer.id !== msg.fromId) return;
        cleanup();
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [subscribe, sendCallMsg, ensurePeer, drainIce, getMedia, cleanup, stopRingtone, clearRingTimeout]);

  return (
    <CallContext.Provider value={{ startCall, hasActiveCall: !!state }}>
      {children}
      <AnimatePresence>
        {state && (
          <CallUI
            type={state.type}
            name={state.peer.name}
            avatar={state.peer.avatar}
            phase={state.phase}
            localStream={localStream}
            remoteStream={remoteStream}
            muted={muted}
            onToggleMute={toggleMute}
            cameraOn={cameraOn}
            onToggleCamera={toggleCamera}
            onEnd={endCall}
            onAccept={state.phase === "ringing_in" ? acceptCall : undefined}
            onDecline={state.phase === "ringing_in" ? declineCall : undefined}
          />
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
