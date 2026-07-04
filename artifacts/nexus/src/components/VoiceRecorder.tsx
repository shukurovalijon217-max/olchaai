import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Send, Trash2, Loader2, Play, Pause, MicOff } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTranslation } from "react-i18next";

interface VoiceRecorderProps {
  onVoiceComment: (audioUrl: string, durationMs: number, waveformData?: string) => void;
  isSubmitting?: boolean;
}

const MAX_MS = 10_000;
const BAR_COUNT = 20;

export default function VoiceRecorder({ onVoiceComment, isSubmitting }: VoiceRecorderProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(3));
  const [frozenBars, setFrozenBars] = useState<number[]>(Array(BAR_COUNT).fill(3));
  const [isPlaying, setIsPlaying] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveHistRef = useRef<number[][]>([]);

  const { uploadFile, isUploading } = useMediaUpload({
    onSuccess: (r) => {
      if (blobRef.current) {
        const waveformData = JSON.stringify(frozenBars);
        onVoiceComment(r.serveUrl, elapsed, waveformData);
        reset();
      }
    },
  });

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    blobRef.current = null;
    waveHistRef.current = [];
    setPhase("idle");
    setElapsed(0);
    setIsPlaying(false);
    setBars(Array(BAR_COUNT).fill(3));
    setFrozenBars(Array(BAR_COUNT).fill(3));
    setPermDenied(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const actx = new AudioCtxClass();
      const src = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      waveHistRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        actx.close();
        cancelAnimationFrame(rafRef.current);
        const blob = new Blob(chunksRef.current, { type: mime });
        blobRef.current = blob;
        blobUrlRef.current = URL.createObjectURL(blob);
        const avg = computeAvgWave(waveHistRef.current);
        setFrozenBars(avg);
        setElapsed(Date.now() - startRef.current);
        setPhase("review");
      };

      mr.start(80);
      mrRef.current = mr;
      startRef.current = Date.now();
      setPhase("recording");

      timerRef.current = setInterval(() => {
        const ms = Date.now() - startRef.current;
        setElapsed(ms);
        if (ms >= MAX_MS) stopRecording();
      }, 50);

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(dataArr);
        const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
          const idx = Math.floor((i / BAR_COUNT) * dataArr.length);
          return Math.max(3, Math.round((dataArr[idx] / 255) * 38));
        });
        waveHistRef.current.push(newBars);
        setBars(newBars);
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermDenied(true);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mrRef.current?.state === "recording") mrRef.current.stop();
  }, []);

  const togglePlay = useCallback(() => {
    if (!blobUrlRef.current) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrlRef.current);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSend = useCallback(() => {
    if (!blobRef.current || isUploading || isSubmitting) return;
    const ext = blobRef.current.type.includes("ogg") ? "ogg" : "webm";
    uploadFile(new File([blobRef.current], `voice-${Date.now()}.${ext}`, { type: blobRef.current.type }));
  }, [uploadFile, isUploading, isSubmitting]);

  const progress = Math.min(elapsed / MAX_MS, 1);
  const elapsedSec = (elapsed / 1000).toFixed(1);

  if (permDenied) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
        <MicOff className="w-3.5 h-3.5 shrink-0" />
        {t("voice.mic_denied")}
        <button onClick={reset} className="ml-auto text-muted-foreground hover:text-foreground text-[10px] underline">{t("voice.close")}</button>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.button key="mic" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }} whileTap={{ scale: 0.88 }}
            onClick={startRecording}
            className="w-9 h-9 rounded-xl bg-violet-500/12 text-violet-400 flex items-center justify-center hover:bg-violet-500/22 transition-colors shrink-0"
            title={t("voice.record_title")}>
            <Mic className="w-4 h-4" />
          </motion.button>
        )}

        {phase === "recording" && (
          <motion.div key="rec" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "100%" }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/25 relative overflow-hidden">
            {/* Progress track */}
            <motion.div className="absolute bottom-0 left-0 h-0.5 bg-violet-500/40 rounded-full"
              style={{ width: `${progress * 100}%` }} />
            {/* Animated dot */}
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            {/* Waveform bars */}
            <div className="flex items-center gap-[2px] flex-1 overflow-hidden h-8">
              {bars.map((h, i) => (
                <motion.div key={i} className="w-[2px] rounded-full bg-violet-400 shrink-0"
                  animate={{ height: h }} transition={{ duration: 0.06, ease: "linear" }} />
              ))}
            </div>
            <span className="text-[11px] text-violet-400 font-mono tabular-nums shrink-0">{elapsedSec}s</span>
            <motion.button whileTap={{ scale: 0.85 }} onClick={stopRecording}
              className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-md shadow-red-500/30">
              <Square className="w-3 h-3 text-white fill-white" />
            </motion.button>
          </motion.div>
        )}

        {phase === "review" && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 flex-1 min-w-0">
            {/* Play/pause */}
            <motion.button whileTap={{ scale: 0.88 }} onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center hover:bg-violet-500/25 transition-colors shrink-0">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </motion.button>
            {/* Static waveform from recording */}
            <div className="flex items-center gap-[2px] flex-1 overflow-hidden h-8">
              {frozenBars.map((h, i) => (
                <div key={i} className={`w-[2px] rounded-full shrink-0 transition-colors ${isPlaying ? "bg-violet-400" : "bg-violet-400/50"}`}
                  style={{ height: Math.max(3, h) }} />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{elapsedSec}s</span>
            {/* Delete */}
            <motion.button whileTap={{ scale: 0.85 }} onClick={reset}
              className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
            {/* Send */}
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleSend}
              disabled={isUploading || isSubmitting}
              className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white disabled:opacity-45 hover:bg-violet-500 transition-colors shrink-0 shadow-md shadow-violet-600/30">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function computeAvgWave(history: number[][]): number[] {
  if (history.length === 0) return Array(BAR_COUNT).fill(4);
  const result = Array(BAR_COUNT).fill(0);
  const step = Math.max(1, Math.floor(history.length / 30));
  let count = 0;
  for (let i = 0; i < history.length; i += step) {
    const frame = history[i];
    if (frame) {
      for (let j = 0; j < BAR_COUNT; j++) result[j] += frame[j] ?? 3;
      count++;
    }
  }
  return count > 0 ? result.map(v => Math.max(3, Math.round(v / count))) : Array(BAR_COUNT).fill(4);
}
