import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Volume2, Headphones, Video, VideoOff,
  PhoneOff, Phone, Minimize2, Maximize2,
} from "lucide-react";

function formatDur(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export type CallPhase = "ringing_out" | "ringing_in" | "connecting" | "connected" | "ended";

export interface CallUIProps {
  type: "voice" | "video";
  name: string;
  avatar?: string;
  phase: CallPhase;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  onToggleMute: () => void;
  cameraOn: boolean;
  onToggleCamera: () => void;
  onEnd: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function CallUI({
  type, name, avatar, phase, localStream, remoteStream,
  muted, onToggleMute, cameraOn, onToggleCamera,
  onEnd, onAccept, onDecline,
}: CallUIProps) {
  const [speaker, setSpeaker] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const localVidRef = useRef<HTMLVideoElement>(null);
  const remoteVidRef = useRef<HTMLVideoElement>(null);
  const pipVidRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const isVideo = type === "video";
  const isIncoming = phase === "ringing_in";
  const isConnected = phase === "connected";

  useEffect(() => {
    if (localVidRef.current) localVidRef.current.srcObject = localStream;
    if (pipVidRef.current) pipVidRef.current.srcObject = localStream;
  }, [localStream, minimized]);

  useEffect(() => {
    if (remoteVidRef.current) remoteVidRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!isConnected) { setElapsed(0); return; }
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [isConnected]);

  const statusText = () => {
    if (phase === "ringing_in") return isVideo ? "📹 Kiruvchi video qo'ng'iroq..." : "📞 Kiruvchi qo'ng'iroq...";
    if (phase === "ringing_out") return isVideo ? "📹 Video qo'ng'iroq..." : "📞 Qo'ng'iroq qilinmoqda...";
    if (phase === "connecting") return "Ulanmoqda...";
    return formatDur(elapsed);
  };

  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0.5, opacity: 0, x: 80, y: 80 }}
        animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        onClick={() => setMinimized(false)}
        className="fixed bottom-28 right-4 z-50 cursor-pointer select-none"
        style={{ width: 140, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6),0 0 0 1.5px rgba(255,255,255,0.12)" }}>
        <div className="relative" style={{ height: 180, background: "#111" }}>
          {isVideo && cameraOn && localStream
            ? <video ref={pipVidRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            : avatar
              ? <img loading="lazy" decoding="async" src={avatar} alt="" className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                  <span className="text-white text-4xl font-bold">{name[0]?.toUpperCase()}</span>
                </div>}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%)" }} />
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
            <Maximize2 className="w-3 h-3 text-white" />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-white text-[11px] font-semibold leading-tight truncate px-2">{name}</p>
            <p className="text-white/60 text-[10px]">{statusText()}</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEnd(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2"
          style={{ background: "rgba(239,68,68,0.9)" }}>
          <PhoneOff className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-[11px] font-semibold">Tugatish</span>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: isVideo && cameraOn && isConnected ? "#000" : "linear-gradient(180deg,#0f172a 0%,#020617 100%)" }}>

      <audio ref={remoteAudioRef} autoPlay />

      {isVideo && isConnected && (
        <video ref={remoteVidRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      {isVideo && (
        <video
          ref={localVidRef}
          autoPlay muted playsInline
          className="absolute object-cover transition-all duration-500"
          style={{
            opacity: cameraOn ? 1 : 0, transform: "scaleX(-1)",
            ...(isConnected
              ? { bottom: 120, right: 16, width: 96, height: 128, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 5 }
              : { inset: 0, width: "100%", height: "100%" }),
          }}
        />
      )}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: isVideo ? "linear-gradient(180deg,rgba(0,0,0,0.55) 0%,transparent 28%,transparent 55%,rgba(0,0,0,0.75) 100%)" : "transparent" }} />

      {!isVideo && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle,rgba(139,92,246,0.4),transparent 70%)" }} />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle,rgba(59,130,246,0.3),transparent 70%)" }} />
        </div>
      )}

      {!isIncoming && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setMinimized(true)}
          className="absolute top-12 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)" }}>
          <Minimize2 className="w-4 h-4 text-white" />
        </motion.button>
      )}

      <div className="relative z-10 flex flex-col items-center justify-between h-full"
        style={{ paddingTop: "env(safe-area-inset-top,48px)", paddingBottom: 40 }}>

        <div className="flex flex-col items-center gap-5 pt-4">
          <motion.div
            animate={{ opacity: isVideo && cameraOn && isConnected ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden shadow-2xl"
              style={{ boxShadow: !isConnected ? "0 0 0 4px rgba(139,92,246,0.3),0 0 40px rgba(139,92,246,0.2)" : "0 8px 32px rgba(0,0,0,0.4)" }}>
              {avatar
                ? <img loading="lazy" decoding="async" src={avatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary to-violet-700 flex items-center justify-center text-4xl font-bold text-white">
                    {name[0]?.toUpperCase()}
                  </div>}
            </div>
            {!isConnected && (
              <>
                <motion.div animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-primary/60" />
                <motion.div animate={{ scale: [1, 1.8], opacity: [0.3, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                  className="absolute inset-0 rounded-full border border-primary/40" />
                <motion.div animate={{ scale: [1, 2.1], opacity: [0.2, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.8 }}
                  className="absolute inset-0 rounded-full border border-primary/20" />
              </>
            )}
          </motion.div>

          <div className="text-center">
            <p className="text-white text-2xl font-bold tracking-tight drop-shadow-lg">{name}</p>
            <motion.p
              animate={!isConnected ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
              transition={{ duration: 1.5, repeat: !isConnected ? Infinity : 0 }}
              className="text-white/60 text-sm mt-1.5">
              {statusText()}
            </motion.p>
          </div>

          {isVideo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", color: "rgba(255,255,255,0.7)" }}>
              <Video className="w-3 h-3" />
              Video qo'ng'iroq
            </div>
          )}
        </div>

        {isIncoming ? (
          <div className="flex items-center justify-center gap-10 w-full px-8">
            <div className="flex flex-col items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={onDecline}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 8px 32px rgba(239,68,68,0.45)" }}>
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-white/60 text-xs">Rad etish</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={onAccept}
                animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1, repeat: Infinity }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 32px rgba(34,197,94,0.45)" }}>
                <Phone className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-white/60 text-xs">Javob berish</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-7 w-full px-8">
            <div className="grid grid-cols-3 gap-5 w-full max-w-[280px]">
              <div className="flex flex-col items-center gap-2">
                <motion.button whileTap={{ scale: 0.88 }} onClick={onToggleMute}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: muted ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: muted ? "0 4px 20px rgba(255,255,255,0.25)" : "none",
                  }}>
                  {muted ? <MicOff className="w-6 h-6 text-gray-900" /> : <Mic className="w-6 h-6 text-white" />}
                </motion.button>
                <span className="text-white/55 text-[11px]">{muted ? "Ovoz yoq" : "Ovoz o'ch"}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSpeaker(v => !v)}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: !speaker ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: !speaker ? "0 4px 20px rgba(255,255,255,0.25)" : "none",
                  }}>
                  {speaker ? <Volume2 className="w-6 h-6 text-white" /> : <Headphones className="w-6 h-6 text-gray-900" />}
                </motion.button>
                <span className="text-white/55 text-[11px]">{speaker ? "Dinamik" : "Quloqchin"}</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button whileTap={{ scale: 0.88 }}
                  onClick={isVideo ? onToggleCamera : undefined}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isVideo && !cameraOn ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: isVideo && !cameraOn ? "0 4px 20px rgba(255,255,255,0.25)" : "none",
                    opacity: isVideo ? 1 : 0.35,
                    cursor: isVideo ? "pointer" : "default",
                  }}>
                  {isVideo && !cameraOn ? <VideoOff className="w-6 h-6 text-gray-900" /> : <Video className="w-6 h-6 text-white" />}
                </motion.button>
                <span className="text-white/55 text-[11px]">{isVideo ? (cameraOn ? "Kamera" : "Kamera yoq") : "Kamera"}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onEnd}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 0 0 4px rgba(239,68,68,0.2),0 8px 32px rgba(239,68,68,0.45)" }}>
              <PhoneOff className="w-7 h-7 text-white" />
            </motion.button>
            <span className="text-white/30 text-xs tracking-wide">Qo'ng'iroqni tugatish</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
